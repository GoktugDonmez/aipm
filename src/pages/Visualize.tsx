import { useState, useEffect, useMemo } from 'react'
import { Text, Card, Tabs, Flex, Button, Select, Switch, Badge, IconButton, Tooltip } from '@radix-ui/themes'
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
import {
  Search,
  Tag,
  Database,
  Calendar,
  Sparkles,
  Info,
  RefreshCw,
  Filter,
  X
} from 'lucide-react'
import '../features/visualization/Visualize.css'

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

  // UI State
  const [showHelp, setShowHelp] = useState(false)
  const [tagSearchQuery, setTagSearchQuery] = useState('')

  // Data State
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

  // Tag Statistics
  const tagStats = useMemo(() => {
    const counts = new Map<string, number>()
    sessions.forEach(session => {
      (session.tags || []).forEach(tag => {
        counts.set(tag, (counts.get(tag) || 0) + 1)
      })
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
  }, [sessions])

  // Filtered Tags for Search
  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return tagStats
    const query = tagSearchQuery.toLowerCase()
    return tagStats.filter(([tag]) => tag.toLowerCase().includes(query))
  }, [tagStats, tagSearchQuery])

  // Filtered Sessions
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

  // Toggle Functions
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
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

  const resetFilters = () => {
    setSelectedTags([])
    setSelectedSources(new Set())
    setTimeframe('all')
    setTagSearchQuery('')
  }

  const hasActiveFilters = selectedTags.length > 0 || selectedSources.size > 0 || timeframe !== 'all'

  // Load Data
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

  // Empty State
  if (sessions.length === 0) {
    return (
      <div className="viz-empty-state">
        <div className="viz-empty-icon">
          <Database size={40} color="var(--accent-9)" />
        </div>
        <Text size="5" weight="bold">No Data Yet</Text>
        <Text size="3" color="gray" style={{ maxWidth: 400 }}>
          Import some conversations to start visualizing your knowledge graph and timeline.
        </Text>
        <Button size="3">
          <Database size={16} />
          Go to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="visualize-page">
      {/* Collapsible Sidebar */}
      <aside className="filter-sidebar">
        <div className="filter-sidebar-header">
          <Flex justify="between" align="center" mb="2">
            <Flex align="center" gap="2">
              <Filter size={20} color="var(--accent-9)" />
              <Text size="4" weight="bold">Filters</Text>
            </Flex>
          </Flex>
          {hasActiveFilters && (
            <Button variant="soft" size="1" onClick={resetFilters} style={{ width: '100%' }}>
              <RefreshCw size={14} />
              Reset All Filters
            </Button>
          )}
        </div>

        <div className="filter-sidebar-content">
          {/* Tags Filter */}
          <div className="filter-group">
            <div className="filter-group-header">
              <Tag size={16} className="filter-group-icon" />
              <span>Tags</span>
              {selectedTags.length > 0 && (
                <Badge size="1" color="blue">{selectedTags.length}</Badge>
              )}
            </div>

            <div className="filter-search">
              <input
                type="text"
                placeholder="Search tags..."
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-chips">
              {filteredTags.length === 0 && (
                <Text size="2" color="gray">No tags found</Text>
              )}
              {filteredTags.slice(0, 20).map(([tag, count]) => (
                <div
                  key={tag}
                  className={`filter-chip ${selectedTags.includes(tag) ? 'active' : 'inactive'}`}
                  onClick={() => toggleTag(tag)}
                >
                  <span>{tag}</span>
                  <span className="filter-chip-count">{count}</span>
                </div>
              ))}
            </div>

            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="1"
                onClick={() => setSelectedTags([])}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                Clear Tags
              </Button>
            )}
          </div>

          {/* Sources Filter */}
          <div className="filter-group">
            <div className="filter-group-header">
              <Database size={16} className="filter-group-icon" />
              <span>Sources</span>
              {selectedSources.size > 0 && (
                <Badge size="1" color="blue">{selectedSources.size}</Badge>
              )}
            </div>

            <div className="filter-chips">
              {SOURCE_OPTIONS.map(option => (
                <div
                  key={option.value}
                  className={`filter-chip ${selectedSources.has(option.value) ? 'active' : 'inactive'}`}
                  onClick={() => toggleSource(option.value)}
                >
                  <span>{option.label}</span>
                </div>
              ))}
            </div>

            {selectedSources.size > 0 && (
              <Button
                variant="ghost"
                size="1"
                onClick={() => setSelectedSources(new Set())}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                Clear Sources
              </Button>
            )}
          </div>

          {/* Time Range */}
          <div className="filter-group">
            <div className="filter-group-header">
              <Calendar size={16} className="filter-group-icon" />
              <span>Time Range</span>
            </div>
            <Select.Root value={timeframe} onValueChange={value => setTimeframe(value as Timeframe)}>
              <Select.Trigger style={{ width: '100%' }} />
              <Select.Content>
                <Select.Item value="all">All Time</Select.Item>
                <Select.Item value="7d">Last 7 days</Select.Item>
                <Select.Item value="30d">Last 30 days</Select.Item>
                <Select.Item value="90d">Last 90 days</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>

          {/* Graph Options */}
          <div className="filter-group">
            <div className="filter-group-header">
              <Sparkles size={16} className="filter-group-icon" />
              <span>Graph Options</span>
            </div>

            <Flex direction="column" gap="3">
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">Shared Tag Connections</Text>
                <Flex align="center" gap="2">
                  <Switch
                    checked={includeSharedEdges}
                    onCheckedChange={checked => setIncludeSharedEdges(Boolean(checked))}
                  />
                  <Text size="2" color="gray">
                    Connect similar conversations
                  </Text>
                </Flex>
              </Flex>

              {includeSharedEdges && (
                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium">Min Shared Tags</Text>
                  <Select.Root
                    value={String(minSharedTags)}
                    onValueChange={value => setMinSharedTags(Number(value))}
                  >
                    <Select.Trigger style={{ width: '100%' }} />
                    <Select.Content>
                      <Select.Item value="1">1 tag</Select.Item>
                      <Select.Item value="2">2 tags</Select.Item>
                      <Select.Item value="3">3 tags</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
              )}

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">Layout Strategy</Text>
                <Select.Root value={layoutStrategy} onValueChange={value => setLayoutStrategy(value as LayoutStrategy)}>
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="balanced">Balanced Force</Select.Item>
                    <Select.Item value="tagOrbit">Tag Orbit</Select.Item>
                    <Select.Item value="splitByType">Split by Type</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="visualization-content">
        {/* Header */}
        <header className="viz-header">
          <div className="viz-stats">
            <div className="viz-stat-item">
              <div className="viz-stat-value">{filteredSessions.length}</div>
              <div className="viz-stat-label">Conversations</div>
            </div>
            <div className="viz-stat-item">
              <div className="viz-stat-value">{graphData.nodes.length}</div>
              <div className="viz-stat-label">Nodes</div>
            </div>
            <div className="viz-stat-item">
              <div className="viz-stat-value">{graphData.edges.length}</div>
              <div className="viz-stat-label">Connections</div>
            </div>
          </div>

          <div className="viz-actions">
            <Tooltip content="Show help">
              <IconButton
                variant="soft"
                onClick={() => setShowHelp(!showHelp)}
              >
                <Info size={18} />
              </IconButton>
            </Tooltip>
          </div>
        </header>

        {/* Canvas */}
        <div className="viz-canvas">
          {showHelp && (
            <div className="viz-help-tooltip">
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center">
                  <Text size="2" weight="bold">💡 Quick Guide</Text>
                  <IconButton variant="ghost" size="1" onClick={() => setShowHelp(false)}>
                    <X size={14} />
                  </IconButton>
                </Flex>
                <Text size="1">• <strong>Drag</strong> nodes to explore connections</Text>
                <Text size="1">• <strong>Scroll</strong> to zoom in/out</Text>
                <Text size="1">• <strong>Click</strong> a node to view details</Text>
                <Text size="1">• Green circles = conversations</Text>
                <Text size="1">• Orange circles = shared concepts</Text>
              </Flex>
            </div>
          )}

          <Tabs.Root defaultValue="graph">
            <Flex direction="column" style={{ height: '100%', padding: '1rem' }}>
              <Tabs.List style={{ marginBottom: '1rem' }}>
                <Tabs.Trigger value="graph">
                  <Sparkles size={16} />
                  Knowledge Graph
                </Tabs.Trigger>
                <Tabs.Trigger value="timeline">
                  <Calendar size={16} />
                  Timeline
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="graph" style={{ flex: 1 }}>
                {filteredSessions.length === 0 ? (
                  <div className="viz-empty-state">
                    <div className="viz-empty-icon">
                      <Search size={40} color="var(--accent-9)" />
                    </div>
                    <Text size="4" weight="bold">No Matching Conversations</Text>
                    <Text size="2" color="gray">
                      Try adjusting your filters to see more data.
                    </Text>
                    <Button variant="soft" onClick={resetFilters}>
                      <RefreshCw size={16} />
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <NetworkGraph
                    nodes={graphData.nodes}
                    edges={graphData.edges}
                    width={window.innerWidth - 400}
                    height={window.innerHeight - 250}
                    layout={layoutStrategy}
                    onNodeClick={handleNodeClick}
                  />
                )}
              </Tabs.Content>

              <Tabs.Content value="timeline" style={{ flex: 1, overflow: 'auto' }}>
                <Card>
                  <Flex direction="column" gap="2">
                    <Text size="3" weight="bold">Conversation Timeline</Text>
                    <Text size="2" color="gray" mb="2">
                      Chronological view of all your conversations
                    </Text>
                    {timelineData.length === 0 ? (
                      <Text size="2" color="gray" align="center" style={{ padding: '2rem' }}>
                        No timeline data available
                      </Text>
                    ) : (
                      <TimelineView entries={timelineData} />
                    )}
                  </Flex>
                </Card>
              </Tabs.Content>
            </Flex>
          </Tabs.Root>
        </div>
      </main>

      {/* Conversation Modal */}
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
