// Visualization data preparation utilities

import { GraphNode, GraphEdge, ChatSession, Tag } from '@/types'

export interface VisualizationData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  meta: {
    totalSessions: number
    hiddenSessions: number
  }
}

export interface GraphGenerationOptions {
  selectedTags?: string[]
  includeSharedTagEdges?: boolean
  minSharedTags?: number
  maxSessions?: number
}

export async function generateGraphData(
  sessions: ChatSession[],
  tags: Tag[],
  options: GraphGenerationOptions = {},
): Promise<VisualizationData> {
  const {
    selectedTags = [],
    includeSharedTagEdges = true,
    minSharedTags = 2,
    maxSessions = 60,
  } = options

  const selectedTagSet = new Set(selectedTags.map(tag => tag.toLowerCase()))

  const uniqueSessions = Array.from(
    sessions.reduce((acc, session) => {
      const existing = acc.get(session.id)
      if (!existing || existing.updatedAt.getTime() < session.updatedAt.getTime()) {
        acc.set(session.id, session)
      }
      return acc
    }, new Map<string, ChatSession>()).values(),
  )

  const scoredSessions = uniqueSessions.map(session => {
    const normalizedTags = (session.tags || []).map(tag => tag.toLowerCase())
    const matchingTagCount = normalizedTags.filter(tag => selectedTagSet.has(tag)).length
    const score = matchingTagCount > 0 ? matchingTagCount * 12 + session.messageCount : session.messageCount

    return {
      session,
      matchingTagCount,
      score,
    }
  })

  const prioritizedSessions = selectedTagSet.size > 0
    ? scoredSessions
        .filter(entry => entry.matchingTagCount > 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.session)
    : scoredSessions
        .sort((a, b) => b.session.updatedAt.getTime() - a.session.updatedAt.getTime())
        .map(entry => entry.session)

  const limitedSessions = prioritizedSessions.slice(0, maxSessions)
  const hiddenSessions = Math.max(0, prioritizedSessions.length - limitedSessions.length)

  const activeSessions = limitedSessions.filter(session => {
    if (selectedTagSet.size === 0) return true
    return (session.tags || []).some(tag => selectedTagSet.has(tag.toLowerCase()))
  })

  const sessionNodes: GraphNode[] = activeSessions.map(session => ({
    id: session.id,
    label: session.title,
    type: 'session',
    size: Math.max(16, Math.log(session.messageCount + 1) * 10 + 14),
    color: sourceColor(session.source),
  }))

  const tagUsage = new Map<string, { count: number; label: string }>()
  const untaggedSessions: string[] = []

  activeSessions.forEach(session => {
    if (!session.tags || session.tags.length === 0) {
      untaggedSessions.push(session.id)
      return
    }

    session.tags.forEach(tagName => {
      const normalized = tagName.toLowerCase()
      if (!tagUsage.has(normalized)) {
        tagUsage.set(normalized, { count: 0, label: tagName })
      }
      tagUsage.get(normalized)!.count += 1
    })
  })

  const tagMap = new Map<string, Tag>()
  tags.forEach(tag => tagMap.set(tag.name.toLowerCase(), tag))

  const sortedTags = Array.from(tagUsage.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 50) // Limit tag node count for readability

  const tagNodes: GraphNode[] = sortedTags.map(([normalized, usage]) => {
    const tagRecord = tagMap.get(normalized)
    const label = tagRecord?.name ?? usage.label
    const baseCount = tagRecord?.sessionCount ?? usage.count
    const color = tagRecord?.color ?? '#f97316'

    return {
      id: `tag-${normalized}`,
      label,
      type: 'tag',
      size: baseCount * 10 + 20,
      color,
    }
  })

  if (untaggedSessions.length > 0) {
    tagNodes.push({
      id: 'tag-untagged',
      label: 'Untagged',
      type: 'tag',
      size: 20,
      color: '#6b7280',
    })
  }

  const sessionTagEdges: GraphEdge[] = []

  activeSessions.forEach(session => {
    const sessionTagSet = new Set((session.tags || []).map(tag => tag.toLowerCase()))

    sortedTags.forEach(([normalized]) => {
      if (sessionTagSet.has(normalized)) {
        sessionTagEdges.push({
          source: session.id,
          target: `tag-${normalized}`,
          weight: 1,
        })
      }
    })

    if (sessionTagSet.size === 0) {
      sessionTagEdges.push({
        source: session.id,
        target: 'tag-untagged',
        weight: 0.5,
      })
    }
  })

  const sharedTagEdges: GraphEdge[] = []

  if (includeSharedTagEdges) {
    for (let i = 0; i < activeSessions.length; i++) {
      for (let j = i + 1; j < activeSessions.length; j++) {
        const tagsA = new Set((activeSessions[i].tags || []).map(tag => tag.toLowerCase()))
        const tagsB = new Set((activeSessions[j].tags || []).map(tag => tag.toLowerCase()))

        const common = Array.from(tagsA).filter(tag => tagsB.has(tag))
        const sharedCount = common.length

        if (sharedCount >= Math.max(1, minSharedTags)) {
          sharedTagEdges.push({
            source: activeSessions[i].id,
            target: activeSessions[j].id,
            weight: sharedCount,
          })
        }
      }
    }
  }

  const nodes = [...sessionNodes, ...tagNodes]
  const edges = [...sessionTagEdges, ...sharedTagEdges]

  return {
    nodes,
    edges,
    meta: {
      totalSessions: prioritizedSessions.length,
      hiddenSessions,
    },
  }
}

function sourceColor(source: ChatSession['source']): string {
  switch (source) {
    case 'chatgpt':
      return '#0ea5e9'
    case 'claude':
      return '#a855f7'
    case 'gemini':
      return '#22d3ee'
    case 'manual':
      return '#10b981'
    case 'extension':
      return '#f97316'
    default:
      return '#3b82f6'
  }
}

export interface TimelineEntry {
  id: string
  date: Date
  title: string
  type: 'session' | 'message'
  metadata: Record<string, unknown>
}

export async function generateTimelineData(
  sessions: ChatSession[],
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
