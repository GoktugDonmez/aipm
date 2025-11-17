/// <reference types="node" />
import 'dotenv/config'
import { AITaggingAdapter } from '../src/features/tags/taggingService'
import { isLLMAvailable, getDefaultModel } from '../src/lib/llm'
import { ChatSession } from '../src/types'
import { readFile } from 'fs/promises'

interface CliArgs {
  text?: string
  file?: string
  title?: string
  source?: ChatSession['source']
}

async function main() {
  const args = parseArgs()
  const documents = await loadDocuments(args)

  if (documents.length === 0) {
    console.error('Provide --text "your chat" or --file path/to/file.txt')
    process.exit(1)
  }

  const adapter = new AITaggingAdapter()
  const session: ChatSession = {
    id: `test-${Date.now()}`,
    title: args.title || 'LLM Tagging Smoke Test',
    source: args.source || 'manual',
    createdAt: new Date(),
    updatedAt: new Date(),
    messageCount: documents.reduce((acc, doc) => acc + doc.split(/\n+/).length, 0),
    tags: [],
  }

  console.log('Running GPT tagging using model session:')
  console.log(` • Title: ${session.title}`)
  console.log(` • Source: ${session.source}`)
  console.log(` • Documents: ${documents.length}`)
  console.log(` • LLM configured: ${isLLMAvailable() ? 'yes' : 'no (fallback to keywords)'}`)
  console.log(` • Target model: ${getDefaultModel()}`)

  try {
    const result = await adapter.generateTags(session, documents)
    console.log('\nSummary:')
    console.log(result.summary || '(no summary)')

    console.log('\nNormalized tags:')
    result.normalizedTags.forEach((tag, index) => {
      console.log(` ${index + 1}. ${tag}`)
    })

    console.log('\nRaw tags:')
    result.rawTags.forEach((tag, index) => {
      console.log(` ${index + 1}. ${tag.name} (confidence=${tag.confidence?.toFixed(2) ?? 'n/a'}) - ${tag.rationale || ''}`)
    })
  } catch (error) {
    console.error('\nLLM tagging test failed:')
    console.error(error)
    process.exit(1)
  }
}

function parseArgs(): CliArgs {
  const args: CliArgs = {}
  const tokens = process.argv.slice(2)

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const value = tokens[i + 1] && !tokens[i + 1].startsWith('--') ? tokens[++i] : undefined

    if (key === 'text') {
      args.text = value
    } else if (key === 'file') {
      args.file = value
    } else if (key === 'title') {
      args.title = value
    } else if (key === 'source' && isValidSource(value)) {
      args.source = value
    }
  }

  return args
}

function isValidSource(value?: string): value is ChatSession['source'] {
  return (
    value === 'chatgpt' ||
    value === 'claude' ||
    value === 'gemini' ||
    value === 'other' ||
    value === 'import' ||
    value === 'manual' ||
    value === 'extension'
  )
}

async function loadDocuments(args: CliArgs): Promise<string[]> {
  if (args.text) {
    return [args.text]
  }

  if (args.file) {
    const content = await readFile(args.file, 'utf-8')
    return [content]
  }

  const fallbackSample = `User: I'm training for a marathon and need a weekly plan.
Assistant: Let's mix long runs, interval days, strength, and recovery nutrition.
User: Add guidance on carbs and hydration.
Assistant: Focus on complex carbs, electrolytes, and sleep.`

  return [fallbackSample]
}

main()