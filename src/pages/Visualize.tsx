import { useState, useEffect, useMemo } from 'react'
import { Heading, Text, Card, Tabs, Flex, Button, Select, Switch } from '@radix-ui/themes'
import { useSessions } from '@/lib/hooks'
import {
  generateGraphData,
  generateTimelineData,
  GraphGenerationOptions,
  VisualizationData,
} from '@/features/visualization/visualizationService'
import NetworkGraph, { LayoutStrategy } from '@/features/visualization/NetworkGraph'
import TimelineView from '@/features/visualization/TimelineView'
import { GraphNode } from '@/types'
import { TimelineEntry } from '@/features/visualization/visualizationService'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import ConversationModal from '@/components/ConversationModal'
import { ChatSession } from '@/types'

const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'manual', label: 'Manual' },
  { value: 'extension', label: 'Extension' },
  { value: 'other', label: 'Other' },
  { value: 'import', label: 'Imported' },
]

type Timeframe = 'all' | '7d' | '30d' | '90d'

export default function Visualize() {
  const { sessions } = useSessions()
  const tags = useLiveQuery(() => db.tags.toArray())
  const [graphData, setGraphData] = useState<VisualizationData>({
    nodes: [],
    edges: [],
    meta: {
      totalSessions: 0,
      hiddenSessions: 0,
    },
  })
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [timeframe, setTimeframe] = useState<Timeframe>('all')
  const [includeSharedEdges, setIncludeSharedEdges] = useState(true)
  const [minSharedTags, setMinSharedTags] = useState(2)
  const [layoutStrategy, setLayoutStrategy] = useState<LayoutStrategy>('balanced')
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)

  const tagStats = useMemo(() => {
    const counts = new Map<string, number>()
    sessions.forEach(session => {
      (session.tags || []).forEach(tag => {
        counts.set(tag, (counts.get(tag) || 0) + 1)
      })
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
  }, [sessions])

  const filteredSessions = useMemo(() => {
    const bySource = sessions.filter(session => {
      if (selectedSources.size === 0) return true
      return selectedSources.has(session.source)
    })

    const byTags = bySource.filter(session => {
      if (selectedTags.length === 0) return true
      const sessionTags = session.tags || []
      return selectedTags.some(tag => sessionTags.includes(tag))
    })

    if (timeframe === 'all') {
      return byTags
    }

    const now = Date.now()
    const timeframeMap: Record<Exclude<Timeframe, 'all'>, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }
    const days = timeframeMap[timeframe]
    const cutoff = now - days * 24 * 60 * 60 * 1000

    return byTags.filter(session => session.updatedAt.getTime() >= cutoff)
  }, [sessions, selectedSources, selectedTags, timeframe])

  const graphOptions: GraphGenerationOptions = useMemo(
    () => ({
      selectedTags,
      includeSharedTagEdges: includeSharedEdges,
      minSharedTags,
    }),
    [selectedTags, includeSharedEdges, minSharedTags],
  )

  const sessionMap = useMemo(() => new Map(sessions.map(session => [session.id, session])), [sessions])

  // Create stable dependency keys to prevent infinite loops
  const filteredSessionIds = useMemo(() => 
    filteredSessions.map(s => s.id).sort().join(','), 
    [filteredSessions]
  )
  const selectedTagsKey = useMemo(() => 
    [...selectedTags].sort().join(','), 
    [selectedTags]
  )
  const tagsKey = useMemo(() => 
    (tags || []).map(t => t.id).sort().join(','), 
    [tags]
  )

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    ))
  }

  const toggleSource = (source: string) => {
    setSelectedSources(prev => {
      const next = new Set(prev)
      if (next.has(source)) {
        next.delete(source)
      } else {
        next.add(source)
      }
      return next
    })
  }

  useEffect(() => {
    if (filteredSessions.length === 0) {
      setGraphData({
        nodes: [],
        edges: [],
        meta: { totalSessions: 0, hiddenSessions: 0 },
      })
      setTimelineData([])
      return
    }

    const loadData = async () => {
      const graph = await generateGraphData(filteredSessions, tags || [], graphOptions)
      const timeline = await generateTimelineData(filteredSessions)
      setGraphData(graph)
      setTimelineData(timeline)
    }

    loadData()
  }, [filteredSessionIds, tagsKey, selectedTagsKey, includeSharedEdges, minSharedTags])

  const handleNodeClick = (node: GraphNode) => {
    if (node.type !== 'session') return
    const session = sessionMap.get(node.id)
    if (session) {
      setSelectedSession(session)
    }
  }

  if (sessions.length === 0) {
    return (
      <div>
        <Heading size="8" mb="2">
          Visualize
        </Heading>
        <Text size="3" color="gray" mb="6">
          Explore your knowledge graph and timeline
        </Text>
        <Card>
          <Text color="gray" align="center">
            No data to visualize yet. Import some conversations to get started!
          </Text>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <Heading size="8" mb="2">
        Visualize
      </Heading>
      <Text size="3" color="gray" mb="6">
        Explore your knowledge graph and timeline
      </Text>

      <Card mb="4">
        <Flex direction="column" gap="3">
          <Text size="3" weight="bold">
            Filters
          </Text>

          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              Tags
            </Text>
            <Flex gap="2" wrap="wrap">
              {tagStats.length === 0 && (
                <Text size="2" color="gray">No tags available yet.</Text>
              )}
              {tagStats.map(([tag, count]) => {
                const isActive = selectedTags.includes(tag)
                return (
                  <Button
                    key={tag}
                    variant={isActive ? 'solid' : 'soft'}
                    size="1"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag} ({count})
                  </Button>
                )
              })}
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="1" onClick={() => setSelectedTags([])}>
                  Clear Tags
                </Button>
              )}
            </Flex>
          </Flex>

          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              Sources
            </Text>
            <Flex gap="2" wrap="wrap">
              {SOURCE_OPTIONS.map(option => {
                const isActive = selectedSources.has(option.value)
                return (
                  <Button
                    key={option.value}
                    variant={isActive ? 'solid' : 'soft'}
                    size="1"
                    onClick={() => toggleSource(option.value)}
                  >
                    {option.label}
                  </Button>
                )
              })}
              {selectedSources.size > 0 && (
                <Button variant="ghost" size="1" onClick={() => setSelectedSources(new Set())}>
                  Clear Sources
                </Button>
              )}
            </Flex>
          </Flex>

          <Flex gap="4" wrap="wrap" align="center">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Time Range
              </Text>
              <Select.Root value={timeframe} onValueChange={value => setTimeframe(value as Timeframe)}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="all">All Time</Select.Item>
                  <Select.Item value="7d">Last 7 days</Select.Item>
                  <Select.Item value="30d">Last 30 days</Select.Item>
                  <Select.Item value="90d">Last 90 days</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Shared Tag Edges
              </Text>
              <Flex align="center" gap="2">
                <Switch checked={includeSharedEdges} onCheckedChange={checked => setIncludeSharedEdges(Boolean(checked))} />
                <Text size="2" color="gray">
                  Connect sessions sharing tags
                </Text>
              </Flex>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Min Shared Tags
              </Text>
              <Select.Root
                value={String(minSharedTags)}
                onValueChange={value => setMinSharedTags(Number(value))}
                disabled={!includeSharedEdges}
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="1">1</Select.Item>
                  <Select.Item value="2">2</Select.Item>
                  <Select.Item value="3">3</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Layout Strategy
              </Text>
              <Select.Root value={layoutStrategy} onValueChange={value => setLayoutStrategy(value as LayoutStrategy)}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="balanced">Balanced Force</Select.Item>
                  <Select.Item value="tagOrbit">Tag Orbit</Select.Item>
                  <Select.Item value="splitByType">Split by Type</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      <Tabs.Root defaultValue="graph">
        <Tabs.List>
          <Tabs.Trigger value="graph">Knowledge Graph</Tabs.Trigger>
          <Tabs.Trigger value="timeline">Timeline</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="graph">
          <Card mt="4">
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center">
                <Text size="3" weight="bold">
                  Knowledge Graph
                </Text>
                <Text size="2" color="gray">
                  {graphData.nodes.length} nodes · {graphData.edges.length} connections
                </Text>
              </Flex>

              <Text size="2" color="gray">
                Drag nodes to explore connections. Scroll to zoom. Green circles are conversations, orange are shared concepts.
              </Text>

              {graphData.meta.hiddenSessions > 0 && (
                <Text size="2" color="gray">
                  Showing the most relevant {graphData.meta.totalSessions - graphData.meta.hiddenSessions} of {graphData.meta.totalSessions} sessions for the selected filters.
                </Text>
              )}

              <NetworkGraph
                nodes={graphData.nodes}
                edges={graphData.edges}
                width={Math.min(window.innerWidth - 300, 1200)}
                height={600}
                layout={layoutStrategy}
                onNodeClick={handleNodeClick}
              />
            </Flex>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="timeline">
          <Card mt="4">
            <Flex direction="column" gap="3">
              <Text size="3" weight="bold">
                Conversation Timeline
              </Text>
              <Text size="2" color="gray" mb="2">
                Chronological view of all your conversations
              </Text>
              <TimelineView entries={timelineData} />
            </Flex>
          </Card>
        </Tabs.Content>
      </Tabs.Root>

      {selectedSession && (
        <ConversationModal
          session={selectedSession}
          open={!!selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  )
}

