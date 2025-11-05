// Placeholder for visualization data preparation

import { GraphNode, GraphEdge, ChatSession, Tag } from '@/types'

export interface VisualizationData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export async function generateGraphData(
  sessions: ChatSession[],
  _tags: Tag[]
): Promise<VisualizationData> {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  
  // Extract keywords from session titles as pseudo-tags
  const keywordMap = new Map<string, Set<string>>()
  const sessionKeywords = new Map<string, string[]>()
  
  sessions.forEach(session => {
    // Extract keywords (more lenient: words > 3 chars)
    const words = session.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !['about', 'using', 'guide', 'with', 'from', 'this', 'that', 'your', 'best'].includes(word)
      )
    
    // Take more keywords for better connectivity
    const keywords = words.slice(0, 5)
    sessionKeywords.set(session.id, keywords)
    
    keywords.forEach(keyword => {
      if (!keywordMap.has(keyword)) {
        keywordMap.set(keyword, new Set())
      }
      keywordMap.get(keyword)!.add(session.id)
    })
  })
  
  // Create session nodes
  sessions.forEach(session => {
    nodes.push({
      id: session.id,
      label: session.title,
      type: 'session',
      size: Math.log(session.messageCount + 1) * 10 + 15,
      color: session.source === 'chatgpt' ? '#10b981' : '#3b82f6',
    })
  })
  
  // Create keyword nodes and edges (for keywords shared by 2+ sessions)
  keywordMap.forEach((sessionIds, keyword) => {
    if (sessionIds.size >= 2) {
      const nodeId = `keyword-${keyword}`
      nodes.push({
        id: nodeId,
        label: keyword,
        type: 'concept',
        size: sessionIds.size * 10 + 20,
        color: '#f59e0b',
      })
      
      // Connect all sessions that share this keyword to the concept node
      sessionIds.forEach(sessionId => {
        edges.push({
          source: sessionId,
          target: nodeId,
          weight: 1,
        })
      })
    }
  })
  
  // Also create direct session-to-session edges for very similar topics
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const keywords1 = sessionKeywords.get(sessions[i].id) || []
      const keywords2 = sessionKeywords.get(sessions[j].id) || []
      
      // Count common keywords
      const commonKeywords = keywords1.filter(k => keywords2.includes(k))
      
      // If they share 2+ keywords, connect them directly
      if (commonKeywords.length >= 2) {
        edges.push({
          source: sessions[i].id,
          target: sessions[j].id,
          weight: commonKeywords.length,
        })
      }
    }
  }
  
  // If we still have isolated nodes, create a central "hub" node
  if (edges.length === 0 && nodes.length > 1) {
    const hubId = 'hub-center'
    nodes.push({
      id: hubId,
      label: 'AI Conversations',
      type: 'concept',
      size: 30,
      color: '#8b5cf6',
    })
    
    sessions.forEach(session => {
      edges.push({
        source: session.id,
        target: hubId,
        weight: 0.5,
      })
    })
  }
  
  return { nodes, edges }
}

export interface TimelineEntry {
  id: string
  date: Date
  title: string
  type: 'session' | 'message'
  metadata: Record<string, unknown>
}

export async function generateTimelineData(
  sessions: ChatSession[]
): Promise<TimelineEntry[]> {
  const entries: TimelineEntry[] = sessions.map(session => ({
    id: session.id,
    date: session.createdAt,
    title: session.title,
    type: 'session' as const,
    metadata: {
      messageCount: session.messageCount,
      source: session.source,
      tags: session.tags,
    },
  }))
  
  return entries.sort((a, b) => b.date.getTime() - a.date.getTime())
}
