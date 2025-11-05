import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { QAPair } from '@/types'

export interface QAConversation {
  id: string
  title: string
  source: 'import' | 'manual' | 'extension'
  qaPairCount: number
  createdAt: Date
  updatedAt: Date
  firstQuestion: string
}

export function useStats() {
  const sessions = useLiveQuery(() => db.sessions.toArray())
  const messages = useLiveQuery(() => db.messages.toArray())
  const tags = useLiveQuery(() => db.tags.toArray())
  const qaPairs = useLiveQuery(() => db.qaPairs.toArray())

  // Count conversations: regular sessions + QA conversations (grouped by sessionId)
  const qaConversations = qaPairs ? new Set(qaPairs.map(qa => qa.sessionId)).size : 0
  const totalConversations = (sessions?.length || 0) + qaConversations

  // Count messages: regular messages + QA pairs (each QA pair = 1 question + 1 answer = 2 messages)
  const qaMessages = (qaPairs?.length || 0) * 2
  const totalMessages = (messages?.length || 0) + qaMessages

  return {
    conversationCount: totalConversations,
    messageCount: totalMessages,
    tagCount: tags?.length || 0,
    isLoading: sessions === undefined,
  }
}

export function useSessions() {
  const sessions = useLiveQuery(() => 
    db.sessions.orderBy('updatedAt').reverse().toArray()
  )
  
  return {
    sessions: sessions || [],
    isLoading: sessions === undefined,
  }
}

export function useMessages(sessionId: string) {
  const messages = useLiveQuery(
    () => db.messages.where('sessionId').equals(sessionId).sortBy('order'),
    [sessionId]
  )
  
  return {
    messages: messages || [],
    isLoading: messages === undefined,
  }
}

export function useQAPairs() {
  const qaPairs = useLiveQuery(() => 
    db.qaPairs.orderBy('createdAt').reverse().toArray()
  )
  
  return {
    qaPairs: qaPairs || [],
    isLoading: qaPairs === undefined,
  }
}

export function useQAPairsBySession(sessionId: string) {
  const qaPairs = useLiveQuery(
    async () => {
      const pairs = await db.qaPairs.where('sessionId').equals(sessionId).toArray()
      return pairs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    },
    [sessionId]
  )
  
  return {
    qaPairs: qaPairs || [],
    isLoading: qaPairs === undefined,
  }
}

export function useQAPairsBySource(source: 'import' | 'manual' | 'extension') {
  const qaPairs = useLiveQuery(
    () => db.qaPairs.where('source').equals(source).toArray(),
    [source]
  )
  
  return {
    qaPairs: qaPairs || [],
    isLoading: qaPairs === undefined,
  }
}

/**
 * Get conversations from QA pairs grouped by sessionId
 */
export function useQAConversations() {
  const qaPairs = useLiveQuery(() => db.qaPairs.toArray())
  
  const conversations: QAConversation[] = []
  
  if (qaPairs) {
    // Group QA pairs by sessionId
    const grouped = qaPairs.reduce((acc, pair) => {
      const sessionId = pair.sessionId || 'unassigned'
      if (!acc[sessionId]) {
        acc[sessionId] = []
      }
      acc[sessionId].push(pair)
      return acc
    }, {} as Record<string, QAPair[]>)
    
    // Convert to conversation objects
    Object.entries(grouped).forEach(([sessionId, pairs]) => {
      const sortedPairs = [...pairs].sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      )
      
      conversations.push({
        id: sessionId,
        title: pairs[0]?.source === 'manual' 
          ? sortedPairs[0]?.question.substring(0, 50) + (sortedPairs[0]?.question.length > 50 ? '...' : '')
          : `Conversation ${sessionId.substring(0, 8)}`,
        source: pairs[0]?.source || 'manual',
        qaPairCount: pairs.length,
        createdAt: sortedPairs[0]?.createdAt || new Date(),
        updatedAt: sortedPairs[sortedPairs.length - 1]?.createdAt || new Date(),
        firstQuestion: sortedPairs[0]?.question || '',
      })
    })
    
    // Sort by updatedAt descending
    conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }
  
  return {
    conversations: conversations || [],
    isLoading: qaPairs === undefined,
  }
}
