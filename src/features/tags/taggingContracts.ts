import { ChatSession } from '@/types'

/**
 * Candidate tag emitted by the LLM before consolidation.
 */
export interface TagCandidate {
  name: string
  rationale?: string
  confidence: number
}

/**
 * Result structure returned by any AI adapter when tagging a conversation.
 */
export interface TagGenerationResult {
  sessionId: string
  rawTags: TagCandidate[]
  normalizedTags: string[]
  summary?: string
}

/**
 * Minimal payload shared with the LLM so it can understand the conversation context
 * without needing to process the entire message history.
 */
export interface ConversationTagPayload {
  session: Pick<ChatSession, 'id' | 'title' | 'source'>
  documentCount: number
  excerpt: string
}

/**
 * Representation of the global tag pool distilled from every conversation.
 * Each canonical tag may contain several alias strings originating from LLM output.
 */
export interface CanonicalTagGroup {
  canonical: string
  aliases: string[]
  summary?: string
}

/**
 * Statistics about how frequently a tag shows up across the workspace.
 */
export interface TagPoolItem {
  tag: string
  count: number
}
