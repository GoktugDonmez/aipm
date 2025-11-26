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
    let qaPairs = await db.qaPairs.toArray()
    
    // Apply date filters
    if (filters?.dateFrom) {
      messages = messages.filter(m => m.timestamp >= filters.dateFrom!)
      qaPairs = qaPairs.filter(p => p.createdAt >= filters.dateFrom!)
    }
    if (filters?.dateTo) {
      messages = messages.filter(m => m.timestamp <= filters.dateTo!)
      qaPairs = qaPairs.filter(p => p.createdAt <= filters.dateTo!)
    }
    
    // Apply source filter
    if (filters?.sources && filters.sources.length > 0) {
      const sessions = await db.sessions
        .where('source')
        .anyOf(filters.sources)
        .toArray()
      const sessionIds = new Set(sessions.map(s => s.id))
      messages = messages.filter(m => sessionIds.has(m.sessionId))
      qaPairs = qaPairs.filter(p => sessionIds.has(p.sessionId))
    }
    
    // Apply tag filter
    if (filters?.tags && filters.tags.length > 0) {
      const sessions = await db.sessions
        .filter(s => s.tags.some(tag => filters.tags!.includes(tag)))
        .toArray()
      const sessionIds = new Set(sessions.map(s => s.id))
      messages = messages.filter(m => sessionIds.has(m.sessionId))
      qaPairs = qaPairs.filter(p => sessionIds.has(p.sessionId))
    }
    
    // Score messages
    const scoredMessages = messages
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

    // Score QA Pairs
    const scoredQA = qaPairs
      .map(pair => {
        const qContent = pair.question.toLowerCase()
        const aContent = pair.answer.toLowerCase()
        let score = 0
        let matchedContent = ''
        
        // Check question
        for (const keyword of keywords) {
          const matches = (qContent.match(new RegExp(keyword, 'g')) || []).length
          score += matches * 15 // Higher weight for question matches
        }
        if (qContent.includes(lowerQuery)) score += 60

        // Check answer
        for (const keyword of keywords) {
          const matches = (aContent.match(new RegExp(keyword, 'g')) || []).length
          score += matches * 10
        }
        if (aContent.includes(lowerQuery)) score += 40

        if (score === 0) return null

        // Determine snippet source (prefer question if matched)
        if (qContent.includes(keywords[0])) {
          matchedContent = pair.question
        } else {
          matchedContent = pair.answer
        }

        const snippetStart = Math.max(0, matchedContent.toLowerCase().indexOf(keywords[0]) - 50)
        const snippet = matchedContent.substring(snippetStart, snippetStart + 200) + '...'

        return {
          id: pair.id,
          sessionId: pair.sessionId,
          messageId: pair.id,
          snippet,
          score,
          highlights: keywords,
        }
      })
      .filter((r): r is SearchResult => r !== null)

    // Combine and sort
    return [...scoredMessages, ...scoredQA]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
  }

  async index(_messages: Message[]): Promise<void> {
    // No-op for basic keyword search
  }
}
