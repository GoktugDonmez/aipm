// Placeholder for import service adapters

import { ChatSession, Message, ImportJob } from '@/types'
import { extractQAPairsFromMessages } from '@/features/qa/qaService'

export interface ImportAdapter {
  parse(file: File): Promise<{ sessions: ChatSession[]; messages: Message[] }>
  validate(file: File): Promise<boolean>
}

export interface ExtractedQAPair {
  question: string
  answer: string
  questionId: string
  answerId: string
  sessionId: string
  sessionTitle: string
}

interface ChatGPTExport {
  id: string
  title: string
  create_time: number
  update_time: number
  mapping: Record<string, {
    id: string
    message?: {
      id: string
      author: { role: 'user' | 'assistant' | 'system' }
      content: { content_type: string; parts: string[] }
      create_time: number
    }
  }>
}

export class ChatGPTImportAdapter implements ImportAdapter {
  async validate(file: File): Promise<boolean> {
    if (file.type !== 'application/json') return false
    
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      return Array.isArray(data) && data.length > 0
    } catch {
      return false
    }
  }

  async parse(file: File): Promise<{ sessions: ChatSession[]; messages: Message[] }> {
    const text = await file.text()
    const conversations: ChatGPTExport[] = JSON.parse(text)
    
    const sessions: ChatSession[] = []
    const messages: Message[] = []
    
    for (const conv of conversations) {
      // Extract messages from mapping
      const convMessages = Object.values(conv.mapping)
        .filter(item => item.message)
        .sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0))
      
      sessions.push({
        id: conv.id,
        title: conv.title,
        source: 'chatgpt',
        createdAt: new Date(conv.create_time * 1000),
        updatedAt: new Date(conv.update_time * 1000),
        messageCount: convMessages.length,
        tags: [],
      })
      
      convMessages.forEach((item, index) => {
        if (!item.message) return
        
        messages.push({
          id: item.message.id,
          sessionId: conv.id,
          role: item.message.author.role,
          content: item.message.content.parts.join('\n'),
          timestamp: new Date(item.message.create_time * 1000),
          order: index,
        })
      })
    }
    
    return { sessions, messages }
  }
}

/**
 * Extract QA pairs from imported conversations
 */
export async function extractQAPairsFromImport(
  sessions: ChatSession[],
  messages: Message[]
): Promise<ExtractedQAPair[]> {
  const extractedPairs: ExtractedQAPair[] = []
  
  for (const session of sessions) {
    const sessionMessages = messages.filter(m => m.sessionId === session.id)
    const pairs = extractQAPairsFromMessages(sessionMessages)
    
    pairs.forEach(pair => {
      extractedPairs.push({
        ...pair,
        sessionId: session.id,
        sessionTitle: session.title,
      })
    })
  }
  
  return extractedPairs
}

export async function importFile(
  file: File,
  adapter: ImportAdapter,
  onProgress?: (progress: number) => void
): Promise<ImportJob> {
  const isValid = await adapter.validate(file)
  
  if (!isValid) {
    throw new Error('Invalid file format')
  }

  onProgress?.(10)

  const { sessions, messages } = await adapter.parse(file)
  
  onProgress?.(50)

  // Save to IndexedDB via Dexie
  const { db } = await import('@/lib/db')
  
  await db.transaction('rw', db.sessions, db.messages, async () => {
    await db.sessions.bulkPut(sessions)
    await db.messages.bulkPut(messages)
  })
  
  onProgress?.(90)
  
  // TODO: Generate embeddings in background
  // TODO: Auto-tag sessions
  
  onProgress?.(100)
  
  return {
    id: crypto.randomUUID(),
    filename: file.name,
    status: 'completed',
    progress: 100,
    createdAt: new Date(),
    completedAt: new Date(),
  }
}

/**
 * Parse file and extract QA pairs without importing
 * Used for QA selection modal
 */
export async function parseFileForQAPairs(
  file: File,
  adapter: ImportAdapter
): Promise<ExtractedQAPair[]> {
  const isValid = await adapter.validate(file)
  
  if (!isValid) {
    throw new Error('Invalid file format')
  }

  const { sessions, messages } = await adapter.parse(file)
  return extractQAPairsFromImport(sessions, messages)
}
