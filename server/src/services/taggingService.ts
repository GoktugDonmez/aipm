
import { ChatSession, TagCandidate, TagGenerationResult } from '../types/tagging.js'
import { createChatCompletion } from '../lib/llm.js'

export class TaggingService {
    /**
     * Generates tags for a given session using OpenAI.
     */
    async generateTags(session: ChatSession, documents: string[]): Promise<TagGenerationResult> {
        const excerpt = this.buildConversationExcerpt(session, documents)

        // Fallback if excerpt is empty (though should be handled by caller)
        if (!excerpt) {
            return {
                sessionId: session.id,
                rawTags: [],
                normalizedTags: []
            }
        }

        const schema = {
            type: 'json_schema',
            json_schema: {
                name: 'conversation_tags',
                schema: {
                    type: 'object',
                    properties: {
                        summary: {
                            type: 'string',
                            description: 'One-sentence summary of the conversation',
                        },
                        tags: {
                            type: 'array',
                            minItems: 2,
                            maxItems: 6,
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    rationale: { type: 'string' },
                                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                                },
                                required: ['name'],
                            },
                        },
                    },
                    required: ['tags'],
                },
            },
        }

        const messages = [
            {
                role: 'system' as const,
                content:
                    'You are an AI librarian who summarizes conversations and emits concise topical tags. Tags must be 1-3 words each.',
            },
            {
                role: 'user' as const,
                content: [
                    `Conversation title: ${session.title}`,
                    `Source: ${session.source}`,
                    `Message count in excerpt: ${documents.length}`,
                    'Conversation excerpt:\n"""',
                    excerpt,
                    '"""',
                    'Output JSON with a summary string and an array of tags. Each tag needs name, short rationale, confidence 0-1.',
                ].join('\n'),
            },
        ]

        try {
            const completion = await createChatCompletion(messages, {
                responseFormat: schema,
                maxTokens: 600,
                temperature: 0.2,
            })

            const payload = this.parseJSON(completion?.choices?.[0]?.message?.content) || {}
            const tags = Array.isArray(payload.tags) ? (payload.tags as any[]) : []

            const rawTags: TagCandidate[] = tags
                .map((tag: any) => {
                    const name = this.formatTagLabel(tag?.name || tag?.label || '')
                    if (!name) return undefined
                    return {
                        name,
                        rationale: tag?.rationale || tag?.reason || undefined,
                        confidence: typeof tag?.confidence === 'number' ? tag.confidence : 0.7,
                    } as TagCandidate
                })
                .filter((tag: TagCandidate | undefined): tag is TagCandidate => Boolean(tag?.name))

            const normalizedTags = this.dedupeNormalizedTags(rawTags.map((tag) => tag.name))

            return {
                sessionId: session.id,
                rawTags,
                normalizedTags,
                summary: typeof payload.summary === 'string' ? payload.summary : undefined,
            }
        } catch (error) {
            console.error('TaggingService error:', error)
            throw error
        }
    }

    private buildConversationExcerpt(session: ChatSession, documents: string[]): string {
        const combined = [session.title, ...documents]
            .filter(Boolean)
            .join('\n\n')
            .trim()

        if (combined.length === 0) {
            return ''
        }

        const MAX_EXCERPT_CHARS = 4000
        return combined.length > MAX_EXCERPT_CHARS
            ? combined.slice(0, MAX_EXCERPT_CHARS)
            : combined
    }

    private parseJSON(content?: string | null): any {
        if (!content) return undefined
        try {
            return JSON.parse(content)
        } catch (error) {
            console.warn('Failed to parse JSON content from LLM:', error)
            return undefined
        }
    }

    private formatTagLabel(token: string): string {
        const cleaned = token.trim()
        if (cleaned.length === 0) return ''
        if (cleaned.length <= 3) {
            return cleaned.toUpperCase()
        }
        return cleaned
            .split(/\s+/)
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ')
    }

    private dedupeNormalizedTags(tags: string[]): string[] {
        const seen = new Set<string>()
        const output: string[] = []

        tags.forEach((tag) => {
            const key = tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
            if (!key || seen.has(key)) {
                return
            }
            seen.add(key)
            output.push(this.formatTagLabel(tag))
        })

        return output.slice(0, 6)
    }
}
