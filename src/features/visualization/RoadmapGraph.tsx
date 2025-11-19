import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Flex, Text, Card, Badge, Button } from '@radix-ui/themes'
import { ChevronUp } from 'lucide-react'
import type { Roadmap, RoadmapNode, RoadmapEdge } from '@/types/roadmap'

interface RoadmapGraphProps {
  roadmap: Roadmap
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string
  data: RoadmapNode
  x?: number
  y?: number
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node
  target: string | D3Node
  data: RoadmapEdge
}

export default function RoadmapGraph({ roadmap }: RoadmapGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    if (!svgRef.current) return

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove()

    const width = dimensions.width
    const height = dimensions.height

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    // Create container for zoom
    const g = svg.append('g')

    // Prepare data
    const nodes: D3Node[] = roadmap.nodes.map(node => ({
      id: node.id,
      data: node,
    }))

    const links: D3Link[] = roadmap.edges.map(edge => ({
      source: edge.from,
      target: edge.to,
      data: edge,
    }))

    // Node colors by type
    const colorMap: Record<string, string> = {
      Topic: '#8b5cf6',
      Subtopic: '#3b82f6',
      Action: '#10b981',
      Resource: '#f59e0b',
    }

    // Create force simulation
    const simulation = d3
      .forceSimulation<D3Node>(nodes)
      .force(
        'link',
        d3
          .forceLink<D3Node, D3Link>(links)
          .id(d => d.id)
          .distance(150)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60))

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Draw edges
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#6b7280')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')

    // Add arrowhead marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#6b7280')

    // Draw nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<any, D3Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }) as any
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedNode(d.data)
      })

    // Node circles
    node
      .append('circle')
      .attr('r', d => {
        const baseSize = 20
        if (d.data.type === 'Topic') return baseSize * 1.5
        if (d.data.type === 'Subtopic') return baseSize * 1.2
        return baseSize
      })
      .attr('fill', d => colorMap[d.data.type] || '#6b7280')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    // Node labels
    node
      .append('text')
      .text(d => d.data.title)
      .attr('dy', d => {
        const baseSize = 20
        if (d.data.type === 'Topic') return baseSize * 1.5 + 15
        if (d.data.type === 'Subtopic') return baseSize * 1.2 + 15
        return baseSize + 15
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x || 0)
        .attr('y1', d => (d.source as D3Node).y || 0)
        .attr('x2', d => (d.target as D3Node).x || 0)
        .attr('y2', d => (d.target as D3Node).y || 0)

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [roadmap, dimensions])

  // Update dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(600, window.innerHeight - 400),
        })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <Flex direction="column" gap="3">
      {/* Legend */}
      <Flex gap="3" wrap="wrap">
        <Badge color="purple">Topic</Badge>
        <Badge color="blue">Subtopic</Badge>
        <Badge color="green">Action</Badge>
        <Badge color="orange">Resource</Badge>
      </Flex>

      {/* Graph */}
      <div style={{ 
        width: '100%', 
        border: '1px solid var(--gray-6)', 
        borderRadius: '8px',
        backgroundColor: 'var(--gray-2)',
        overflow: 'hidden'
      }}>
        <svg ref={svgRef} style={{ display: 'block' }} />
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <Card>
          <Flex direction="column" gap="3">
            <Flex justify="between" align="start">
              <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                  <Badge color={
                    selectedNode.type === 'Topic' ? 'purple' :
                    selectedNode.type === 'Subtopic' ? 'blue' :
                    selectedNode.type === 'Action' ? 'green' : 'orange'
                  }>
                    {selectedNode.type}
                  </Badge>
                  <Text weight="bold" size="4">{selectedNode.title}</Text>
                </Flex>
                <Text color="gray">{selectedNode.summary}</Text>
              </Flex>
              <Button variant="ghost" size="1" onClick={() => setSelectedNode(null)}>
                <ChevronUp size={16} />
              </Button>
            </Flex>

            {selectedNode.refs && selectedNode.refs.length > 0 && (
              <Flex direction="column" gap="2">
                <Text weight="bold" size="2">References:</Text>
                {selectedNode.refs.map((ref, i) => (
                  <Card key={i} variant="surface" size="1">
                    {ref.file && (
                      <Flex direction="column" gap="1">
                        <Text size="2" weight="medium">📄 {ref.file}</Text>
                        {ref.anchor && (
                          <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>
                            "{ref.anchor}"
                          </Text>
                        )}
                      </Flex>
                    )}
                    {ref.chat_id && (
                      <Text size="2">💬 Chat: {ref.chat_id} / Message: {ref.message_id}</Text>
                    )}
                  </Card>
                ))}
              </Flex>
            )}
          </Flex>
        </Card>
      )}

      <Text size="1" color="gray" align="center">
        💡 Drag nodes to rearrange • Click nodes to see details • Scroll to zoom
      </Text>
    </Flex>
  )
}
