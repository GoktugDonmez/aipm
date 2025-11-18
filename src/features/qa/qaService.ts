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
  conversationIndex?: number | null // Order in conversation
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
    conversationIndex: input.conversationIndex,
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
 * Filters out duplicates before saving (both in batch and against existing data)
 */
export async function saveQAPairs(qaPairs: QAPair[]): Promise<void> {
  // First, filter duplicates within the batch
  const uniquePairs: QAPair[] = []
  const seenPairs = new Set<string>()
  
  for (const pair of qaPairs) {
    // Create a unique key for duplicate detection
    // Priority: originalMessageIds > conversationIndex+content > content only
    let pairKey: string
    if (pair.originalMessageIds?.questionId && pair.originalMessageIds?.answerId) {
      // Use original message IDs for duplicate detection (most reliable)
      pairKey = `${pair.sessionId}:${pair.originalMessageIds.questionId}:${pair.originalMessageIds.answerId}`
    } else if (pair.conversationIndex != null) {
      // Use conversationIndex + content hash for better duplicate detection
      const questionHash = pair.question.trim().toLowerCase().substring(0, 100)
      const answerHash = pair.answer.trim().toLowerCase().substring(0, 100)
      pairKey = `${pair.sessionId}:${pair.conversationIndex}:${questionHash}:${answerHash}`
    } else {
      // Fallback: use question+answer hash for duplicate detection
      const questionHash = pair.question.trim().toLowerCase()
      const answerHash = pair.answer.trim().toLowerCase()
      pairKey = `${pair.sessionId}:${questionHash}:${answerHash}`
    }
    
    if (!seenPairs.has(pairKey)) {
      seenPairs.add(pairKey)
      uniquePairs.push(pair)
    } else {
      console.log('Skipping duplicate QA pair in batch:', pairKey.substring(0, 80))
    }
  }
  
  if (uniquePairs.length === 0) {
    console.log('All QA pairs were duplicates, nothing to save')
    return
  }
  
  // Now check against existing data in database
  const finalUniquePairs: QAPair[] = []
  const existingPairs = await db.qaPairs.toArray()
  const existingKeys = new Set<string>()
  
  // Build set of existing pair keys
  for (const existing of existingPairs) {
    let existingKey: string
    if (existing.originalMessageIds?.questionId && existing.originalMessageIds?.answerId) {
      // Use original message IDs for duplicate detection (most reliable)
      existingKey = `${existing.sessionId}:${existing.originalMessageIds.questionId}:${existing.originalMessageIds.answerId}`
    } else if (existing.conversationIndex != null) {
      // Use conversationIndex + content hash
      const questionHash = existing.question.trim().toLowerCase().substring(0, 100)
      const answerHash = existing.answer.trim().toLowerCase().substring(0, 100)
      existingKey = `${existing.sessionId}:${existing.conversationIndex}:${questionHash}:${answerHash}`
    } else {
      // Fallback: use question+answer hash for duplicate detection
      const questionHash = existing.question.trim().toLowerCase()
      const answerHash = existing.answer.trim().toLowerCase()
      existingKey = `${existing.sessionId}:${questionHash}:${answerHash}`
    }
    existingKeys.add(existingKey)
  }
  
  // Filter out pairs that already exist in database
  for (const pair of uniquePairs) {
    let pairKey: string
    if (pair.originalMessageIds?.questionId && pair.originalMessageIds?.answerId) {
      pairKey = `${pair.sessionId}:${pair.originalMessageIds.questionId}:${pair.originalMessageIds.answerId}`
    } else if (pair.conversationIndex != null) {
      const questionHash = pair.question.trim().toLowerCase().substring(0, 100)
      const answerHash = pair.answer.trim().toLowerCase().substring(0, 100)
      pairKey = `${pair.sessionId}:${pair.conversationIndex}:${questionHash}:${answerHash}`
    } else {
      const questionHash = pair.question.trim().toLowerCase()
      const answerHash = pair.answer.trim().toLowerCase()
      pairKey = `${pair.sessionId}:${questionHash}:${answerHash}`
    }
    
    if (!existingKeys.has(pairKey)) {
      finalUniquePairs.push(pair)
    } else {
      console.log('Skipping duplicate QA pair (already in database):', {
        pairKey: pairKey.substring(0, 80),
        question: pair.question.substring(0, 50),
        sessionId: pair.sessionId,
        conversationIndex: pair.conversationIndex
      })
    }
  }
  
  if (finalUniquePairs.length === 0) {
    console.log('All QA pairs already exist in database, nothing to save')
    return
  }
  
  console.log(`Saving ${finalUniquePairs.length} unique QA pairs (filtered ${qaPairs.length - finalUniquePairs.length} duplicates)`)
  
  // Use individual put operations to ensure we can check for duplicates properly
  // bulkPut would overwrite, so we check each one individually
  for (const pair of finalUniquePairs) {
    // Double-check: verify this pair doesn't already exist
    let pairKey: string
    if (pair.originalMessageIds?.questionId && pair.originalMessageIds?.answerId) {
      pairKey = `${pair.sessionId}:${pair.originalMessageIds.questionId}:${pair.originalMessageIds.answerId}`
    } else if (pair.conversationIndex != null) {
      const questionHash = pair.question.trim().toLowerCase().substring(0, 100)
      const answerHash = pair.answer.trim().toLowerCase().substring(0, 100)
      pairKey = `${pair.sessionId}:${pair.conversationIndex}:${questionHash}:${answerHash}`
    } else {
      const questionHash = pair.question.trim().toLowerCase()
      const answerHash = pair.answer.trim().toLowerCase()
      pairKey = `${pair.sessionId}:${questionHash}:${answerHash}`
    }
    
    // Check if a pair with this key already exists
    const existingWithSameKey = existingPairs.find(existing => {
      let existingKey: string
      if (existing.originalMessageIds?.questionId && existing.originalMessageIds?.answerId) {
        existingKey = `${existing.sessionId}:${existing.originalMessageIds.questionId}:${existing.originalMessageIds.answerId}`
      } else if (existing.conversationIndex != null) {
        const questionHash = existing.question.trim().toLowerCase().substring(0, 100)
        const answerHash = existing.answer.trim().toLowerCase().substring(0, 100)
        existingKey = `${existing.sessionId}:${existing.conversationIndex}:${questionHash}:${answerHash}`
      } else {
        const questionHash = existing.question.trim().toLowerCase()
        const answerHash = existing.answer.trim().toLowerCase()
        existingKey = `${existing.sessionId}:${questionHash}:${answerHash}`
      }
      return existingKey === pairKey
    })
    
    if (!existingWithSameKey) {
      await db.qaPairs.put(pair)
      console.log('Saved QA pair:', pairKey.substring(0, 50))
    } else {
      console.log('Duplicate detected during save, skipping:', pairKey.substring(0, 50))
    }
  }
  
  // Group pairs by sessionId and create/update ChatSession records
  const sessionMap = new Map<string, { pairs: QAPair[]; source: 'import' | 'manual' | 'extension' }>()
  
  for (const pair of finalUniquePairs) {
    if (!sessionMap.has(pair.sessionId)) {
      sessionMap.set(pair.sessionId, { pairs: [], source: pair.source })
    }
    sessionMap.get(pair.sessionId)!.pairs.push(pair)
  }
  
  // Create/update sessions
  for (const [sessionId, data] of sessionMap.entries()) {
    const pairs = data.pairs
    const lastPair = pairs[pairs.length - 1]
    
    // Get all QA pairs for this session to find the first one (conversationIndex 0)
    const allSessionPairs = await db.qaPairs.where('sessionId').equals(sessionId).toArray()
    
    // Find the first interaction (conversationIndex 0) for the title
    const firstInteraction = allSessionPairs.find(p => p.conversationIndex === 0) || 
                            allSessionPairs.sort((a, b) => {
                              // Sort by conversationIndex if available, otherwise by createdAt
                              if (a.conversationIndex != null && b.conversationIndex != null) {
                                return a.conversationIndex - b.conversationIndex
                              }
                              if (a.conversationIndex != null) return -1
                              if (b.conversationIndex != null) return 1
                              return a.createdAt.getTime() - b.createdAt.getTime()
                            })[0]
    
    // Check if session already exists
    const existingSession = await db.sessions.get(sessionId)
    
    if (existingSession) {
      // Update existing session: recalculate messageCount and update updatedAt
      const newMessageCount = allSessionPairs.length * 2
      const newTitle = firstInteraction 
        ? (firstInteraction.question.length > 50 
            ? firstInteraction.question.substring(0, 50) + '...'
            : firstInteraction.question)
        : existingSession.title
      
      console.log(`Updating existing session ${sessionId}: ${allSessionPairs.length} QA pairs (total: ${newMessageCount} messages)`)
      await db.sessions.update(sessionId, {
        title: newTitle, // Always update title to first interaction
        updatedAt: lastPair.updatedAt,
        messageCount: newMessageCount,
      })
    } else {
      // Create new session
      // Use first interaction's question as title
      const title = firstInteraction 
        ? (firstInteraction.question.length > 50 
            ? firstInteraction.question.substring(0, 50) + '...'
            : firstInteraction.question)
        : (pairs[0].question.length > 50 
            ? pairs[0].question.substring(0, 50) + '...'
            : pairs[0].question)
      
      console.log(`Creating new session ${sessionId} with ${pairs.length} QA pairs`)
      
      const session: ChatSession = {
        id: sessionId,
        title,
        source: data.source as 'chatgpt' | 'claude' | 'gemini' | 'other' | 'import' | 'manual' | 'extension',
        createdAt: firstInteraction?.createdAt || pairs[0].createdAt,
        updatedAt: lastPair.updatedAt,
        messageCount: allSessionPairs.length * 2, // Each QA pair = 1 question + 1 answer
        tags: [],
      }
      
      await db.sessions.put(session)
    }
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

