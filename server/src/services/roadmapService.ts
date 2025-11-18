import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import type { Roadmap, ValidationResult } from '../types/roadmap.js'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'

// Configuration for roadmap constraints
const ROADMAP_CONFIG = {
  max_nodes: 15,
  max_depth: 3,
  max_children_per_node: 5,
}

// System prompt for structured roadmap generation
const SYSTEM_PROMPT = `You are a synthesis assistant that builds a ROADMAP from evidence retrieved from the provided files.

Return VALID JSON ONLY. Do NOT include any explanatory text, markdown formatting, or code blocks. Output must start with { and end with }.

SCHEMA (strict shape to follow):
{
  "artifact_type": "Roadmap",
  "main_topic": "string (max 120 chars)",
  "nodes": [
    {
      "id": "unique-string-id (max 80 chars)",
      "type": "Topic|Subtopic|Action|Resource",
      "title": "string (max 64 chars, ≤8 words)",
      "summary": "string (max 160 chars, ≤25 words)",
      "refs": [
        { "file": "source-filename", "anchor": "relevant quote (≤20 words)" }
      ]
    }
  ],
  "edges": [
    { "from": "node-id", "to": "node-id", "relation": "explains|leads_to|depends_on|precedes" }
  ],
  "constraints": {
    "max_nodes": ${ROADMAP_CONFIG.max_nodes},
    "max_depth": ${ROADMAP_CONFIG.max_depth},
    "max_children_per_node": ${ROADMAP_CONFIG.max_children_per_node}
  }
}

RULES (must follow):
- One main topic per roadmap that best answers the query.
- Size limits: total nodes ≤ ${ROADMAP_CONFIG.max_nodes}, tree depth ≤ ${ROADMAP_CONFIG.max_depth}, each non-leaf ≤ ${ROADMAP_CONFIG.max_children_per_node} children.
- Titles ≤ 8 words; summaries ≤ 25 words.
- Ground every node with at least one ref that maps to retrieved evidence. For file evidence, use { "file": "<source-filename>", "anchor": "<short quote ≤20 words>" }.
- Topic/Subtopic nodes can have empty refs array [] if they are organizational.
- Use only these relations: "explains", "leads_to", "depends_on", "precedes".
- Do not invent facts. If evidence is weak or off-topic, omit it.
- Output MUST be pure JSON starting with { and ending with }.
- CRITICAL: Do NOT wrap in markdown code blocks (no \`\`\`json or \`\`\`). Return raw JSON only.

STYLE: concise, actionable, grounded.

OUTPUT: Return only the Roadmap JSON.`

export class RoadmapService {
  private genai: GoogleGenerativeAI
  private fileManager: GoogleAIFileManager
  private model: GenerativeModel

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required')
    }
    this.genai = new GoogleGenerativeAI(apiKey)
    this.fileManager = new GoogleAIFileManager(apiKey)
    // Using Gemini 2.5 Pro which supports file uploads
    this.model = this.genai.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    })
  }

  /**
   * Upload files to Gemini and generate roadmap
   */
  async generateRoadmap(
    files: Array<{ name: string; content: Buffer | string }>,
    query: string
  ): Promise<Roadmap> {
    console.log('📤 Processing files...')

    // For simplicity, concatenate all files into context
    // In production, you'd upload files properly using File API
    const allContent = files.map((file) => {
      const content = Buffer.isBuffer(file.content) 
        ? file.content.toString('utf-8') 
        : file.content
      return `=== FILE: ${file.name} ===\n${content}\n`
    }).join('\n\n')

    console.log('🤖 Querying Gemini...')

    // Construct the full prompt with inline content
    const fullPrompt = `${SYSTEM_PROMPT}

USER QUERY: ${query}

AVAILABLE FILES AND CONTENT:
${allContent}

Analyze the content above and build a roadmap that synthesizes relevant information to answer the user's query.
Return ONLY valid JSON matching the schema.`

    // Generate content
    const result = await this.model.generateContent(fullPrompt)
    const response = result.response
    const text = response.text()

    console.log('📊 Parsing roadmap response...')

    // Parse JSON from response
    const roadmap = this.extractJSON(text)

    // Validate the roadmap
    const validation = this.validateRoadmap(roadmap)
    if (!validation.valid) {
      console.error('❌ Roadmap validation failed:', validation.errors)
      throw new Error(`Invalid roadmap structure: ${validation.errors.join(', ')}`)
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Roadmap warnings:', validation.warnings)
    }

    console.log('✅ Roadmap generated successfully')
    console.log(`   - Main topic: ${roadmap.main_topic}`)
    console.log(`   - Nodes: ${roadmap.nodes.length}`)
    console.log(`   - Edges: ${roadmap.edges.length}`)

    return roadmap
  }

  /**
   * Extract JSON from text that might contain markdown or prose
   */
  private extractJSON(text: string): Roadmap {
    // Try direct JSON parse first
    try {
      return JSON.parse(text)
    } catch {
      // Fallback: extract from code block or braces
    }

    // Try to find JSON in markdown code block
    const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonBlockMatch) {
      try {
        return JSON.parse(jsonBlockMatch[1])
      } catch {
        // Continue to next method
      }
    }

    // Try to find JSON by braces
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1))
      } catch {
        // Continue to error
      }
    }

    throw new Error('Could not extract valid JSON from response')
  }

  /**
   * Validate roadmap structure against schema
   */
  private validateRoadmap(roadmap: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required top-level fields
    const requiredFields = ['artifact_type', 'main_topic', 'nodes', 'edges', 'constraints']
    for (const field of requiredFields) {
      if (!(field in roadmap)) {
        errors.push(`Missing required field: '${field}'`)
      }
    }

    // Check artifact_type
    if (roadmap.artifact_type !== 'Roadmap') {
      errors.push("artifact_type must be 'Roadmap'")
    }

    // Validate nodes
    if (Array.isArray(roadmap.nodes)) {
      roadmap.nodes.forEach((node: any, i: number) => {
        const nodeRequired = ['id', 'type', 'title', 'summary', 'refs']
        for (const field of nodeRequired) {
          if (!(field in node)) {
            errors.push(`Node ${i}: Missing field '${field}'`)
          }
        }

        // Check node type
        const validTypes = ['Topic', 'Subtopic', 'Action', 'Resource']
        if (node.type && !validTypes.includes(node.type)) {
          warnings.push(`Node ${i}: Invalid type '${node.type}'`)
        }

        // Check refs structure
        if (Array.isArray(node.refs)) {
          node.refs.forEach((ref: any, j: number) => {
            const hasFile = 'file' in ref && 'anchor' in ref
            const hasChat = 'chat_id' in ref && 'message_id' in ref
            if (!hasFile && !hasChat) {
              warnings.push(`Node ${i}, ref ${j}: Must have either (file+anchor) or (chat_id+message_id)`)
            }
          })
        }
      })
    }

    // Validate edges
    if (Array.isArray(roadmap.edges)) {
      const validRelations = ['explains', 'leads_to', 'depends_on', 'precedes']
      roadmap.edges.forEach((edge: any, i: number) => {
        if (!('from' in edge) || !('to' in edge) || !('relation' in edge)) {
          errors.push(`Edge ${i}: Missing required fields (from, to, relation)`)
        } else if (!validRelations.includes(edge.relation)) {
          warnings.push(`Edge ${i}: Invalid relation '${edge.relation}'`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
