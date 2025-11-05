import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

export function useStats() {
  const sessions = useLiveQuery(() => db.sessions.toArray())
  const messages = useLiveQuery(() => db.messages.toArray())
  const tags = useLiveQuery(() => db.tags.toArray())

  return {
    sessionCount: sessions?.length || 0,
    messageCount: messages?.length || 0,
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
