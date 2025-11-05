// Placeholder for search service adapters

import { SearchResult, Message } from '@/types'

export interface SearchAdapter {
  search(query: string, filters?: SearchFilters): Promise<SearchResult[]>
  index(messages: Message[]): Promise<void>
}

export interface SearchFilters {
  dateFrom?: Date
  dateTo?: Date
  sources?: string[]
  tags?: string[]
}

export class HybridSearchAdapter implements SearchAdapter {
  async search(_query: string, _filters?: SearchFilters): Promise<SearchResult[]> {
    // TODO: Implement hybrid search (BM25 + semantic embeddings)
    // TODO: Apply filters
    // TODO: Rank and return results
    
    return []
  }

  async index(_messages: Message[]): Promise<void> {
    // TODO: Generate embeddings for messages
    // TODO: Build BM25 index
    // TODO: Store in IndexedDB
  }
}

export class KeywordSearchAdapter implements SearchAdapter {
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const { db } = await import('@/lib/db')
    
    const lowerQuery = query.toLowerCase()
    const keywords = lowerQuery.split(/\s+/).filter(k => k.length > 2)
    
    if (keywords.length === 0) return []
    
    let messages = await db.messages.toArray()
    
    // Apply date filters
    if (filters?.dateFrom) {
      messages = messages.filter(m => m.timestamp >= filters.dateFrom!)
    }
    if (filters?.dateTo) {
      messages = messages.filter(m => m.timestamp <= filters.dateTo!)
    }
    
    // Apply source filter
    if (filters?.sources && filters.sources.length > 0) {
      const sessions = await db.sessions
        .where('source')
        .anyOf(filters.sources)
        .toArray()
      const sessionIds = new Set(sessions.map(s => s.id))
      messages = messages.filter(m => sessionIds.has(m.sessionId))
    }
    
    // Apply tag filter
    if (filters?.tags && filters.tags.length > 0) {
      const sessions = await db.sessions
        .filter(s => s.tags.some(tag => filters.tags!.includes(tag)))
        .toArray()
      const sessionIds = new Set(sessions.map(s => s.id))
      messages = messages.filter(m => sessionIds.has(m.sessionId))
    }
    
    // Score messages
    const scored = messages
      .map(msg => {
        const content = msg.content.toLowerCase()
        let score = 0
        
        // Count keyword matches
        for (const keyword of keywords) {
          const matches = (content.match(new RegExp(keyword, 'g')) || []).length
          score += matches * 10
        }
        
        // Boost exact phrase matches
        if (content.includes(lowerQuery)) {
          score += 50
        }
        
        if (score === 0) return null
        
        // Create snippet
        const snippetStart = Math.max(0, content.indexOf(keywords[0]) - 50)
        const snippet = msg.content.substring(snippetStart, snippetStart + 200) + '...'
        
        return {
          id: msg.id,
          sessionId: msg.sessionId,
          messageId: msg.id,
          snippet,
          score,
          highlights: keywords,
        }
      })
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
    
    return scored
  }

  async index(_messages: Message[]): Promise<void> {
    // No-op for basic keyword search
  }
}
