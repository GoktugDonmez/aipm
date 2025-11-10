import { QAPair, Message, ChatSession } from '@/types'
import { db } from '@/lib/db'
import { autoTagSessions } from '@/features/tags/taggingService'

export interface QAPairInput {
  question: string
  answer: string
  source: 'import' | 'manual' | 'extension'
  sessionId?: string
  originalMessageIds?: {
    questionId: string
    answerId: string
  }
  tags?: string[]
}

/**
 * Normalize and create a QAPair from input data
 */
export function normalizeQAPair(input: QAPairInput): QAPair {
  const now = new Date()
  
  return {
    id: crypto.randomUUID(),
    sessionId: input.sessionId || '',
    question: input.question.trim(),
    answer: input.answer.trim(),
    source: input.source,
    createdAt: now,
    updatedAt: now,
    tags: input.tags || [],
    originalMessageIds: input.originalMessageIds,
  }
}

/**
 * Extract QA pairs from a sequence of messages
 * Pairs consecutive user messages with their following assistant messages
 */
export function extractQAPairsFromMessages(
  messages: Message[]
): Array<{ question: string; answer: string; questionId: string; answerId: string }> {
  const pairs: Array<{ question: string; answer: string; questionId: string; answerId: string }> = []
  
  // Sort messages by order to ensure correct sequence
  const sortedMessages = [...messages].sort((a, b) => a.order - b.order)
  
  for (let i = 0; i < sortedMessages.length - 1; i++) {
    const currentMessage = sortedMessages[i]
    const nextMessage = sortedMessages[i + 1]
    
    // Check if current is user message and next is assistant message
    if (currentMessage.role === 'user' && nextMessage.role === 'assistant') {
      pairs.push({
        question: currentMessage.content,
        answer: nextMessage.content,
        questionId: currentMessage.id,
        answerId: nextMessage.id,
      })
    }
  }
  
  return pairs
}

/**
 * Save a QA pair to the database
 */
export async function saveQAPair(qaPair: QAPair): Promise<void> {
  await db.qaPairs.put(qaPair)
}

/**
 * Save multiple QA pairs to the database
 * Also creates/updates the corresponding ChatSession record
 */
export async function saveQAPairs(qaPairs: QAPair[]): Promise<void> {
  await db.qaPairs.bulkPut(qaPairs)
  
  // Group pairs by sessionId and create/update ChatSession records
  const sessionMap = new Map<string, { pairs: QAPair[]; source: 'import' | 'manual' | 'extension' }>()
  
  for (const pair of qaPairs) {
    if (!sessionMap.has(pair.sessionId)) {
      sessionMap.set(pair.sessionId, { pairs: [], source: pair.source })
    }
    sessionMap.get(pair.sessionId)!.pairs.push(pair)
  }
  
  // Create/update sessions
  for (const [sessionId, data] of sessionMap.entries()) {
    const pairs = data.pairs
    const firstPair = pairs[0]
    const lastPair = pairs[pairs.length - 1]
    
    // Use first question as title (or generate a default)
    const title = firstPair.question.length > 50 
      ? firstPair.question.substring(0, 50) + '...'
      : firstPair.question
    
    const session: ChatSession = {
      id: sessionId,
      title,
      source: data.source as 'chatgpt' | 'claude' | 'gemini' | 'other' | 'import' | 'manual' | 'extension',
      createdAt: firstPair.createdAt,
      updatedAt: lastPair.updatedAt,
      messageCount: pairs.length * 2, // Each QA pair = 1 question + 1 answer
      tags: [],
    }
    
    await db.sessions.put(session)
  }

  // Refresh automatic tags for affected sessions
  const sessionIds = Array.from(sessionMap.keys()).filter((id) => id)
  if (sessionIds.length > 0) {
    await autoTagSessions(sessionIds)
  }
}

/**
 * Get all QA pairs
 */
export async function getAllQAPairs(): Promise<QAPair[]> {
  return db.qaPairs.orderBy('createdAt').reverse().toArray()
}

/**
 * Get QA pairs by session ID
 */
export async function getQAPairsBySession(sessionId: string): Promise<QAPair[]> {
  return db.qaPairs.where('sessionId').equals(sessionId).toArray()
}

/**
 * Get QA pairs by source
 */
export async function getQAPairsBySource(source: 'import' | 'manual' | 'extension'): Promise<QAPair[]> {
  return db.qaPairs.where('source').equals(source).toArray()
}

/**
 * Delete a QA pair
 */
export async function deleteQAPair(id: string): Promise<void> {
  await db.qaPairs.delete(id)
}

/**
 * Delete all QA pairs in a conversation (by sessionId)
 * Also deletes the corresponding ChatSession record
 */
export async function deleteConversation(sessionId: string): Promise<void> {
  await db.transaction('rw', db.qaPairs, db.sessions, async () => {
    await db.qaPairs.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

/**
 * Update a QA pair
 */
export async function updateQAPair(id: string, updates: Partial<QAPair>): Promise<void> {
  const existing = await db.qaPairs.get(id)
  if (!existing) {
    throw new Error(`QA pair with id ${id} not found`)
  }
  
  await db.qaPairs.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
}

