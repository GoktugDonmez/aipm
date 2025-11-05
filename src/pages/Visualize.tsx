import { useState, useEffect } from 'react'
import { Heading, Text, Card, Tabs, Flex } from '@radix-ui/themes'
import { useSessions } from '@/lib/hooks'
import { generateGraphData, generateTimelineData } from '@/features/visualization/visualizationService'
import NetworkGraph from '@/features/visualization/NetworkGraph'
import TimelineView from '@/features/visualization/TimelineView'
import { GraphNode, GraphEdge } from '@/types'
import { TimelineEntry } from '@/features/visualization/visualizationService'

export default function Visualize() {
  const { sessions } = useSessions()
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  })
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([])

  useEffect(() => {
    if (sessions.length === 0) return

    const loadData = async () => {
      const graph = await generateGraphData(sessions, [])
      const timeline = await generateTimelineData(sessions)
      setGraphData(graph)
      setTimelineData(timeline)
    }

    loadData()
  }, [sessions])

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

              <NetworkGraph
                nodes={graphData.nodes}
                edges={graphData.edges}
                width={Math.min(window.innerWidth - 300, 1200)}
                height={600}
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
    </div>
  )
}
