import { QAPair, Message } from '@/types'
import { db } from '@/lib/db'

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
 */
export async function saveQAPairs(qaPairs: QAPair[]): Promise<void> {
  await db.qaPairs.bulkPut(qaPairs)
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
 */
export async function deleteConversation(sessionId: string): Promise<void> {
  await db.qaPairs.where('sessionId').equals(sessionId).delete()
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

