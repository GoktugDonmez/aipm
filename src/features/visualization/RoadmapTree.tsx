import { useMemo, useState, useRef } from 'react'
import { Roadmap, RoadmapNode } from '@/types/roadmap'
import { Card, Text, Badge, Button, Flex, IconButton, Tooltip } from '@radix-ui/themes'
import { X, ChevronRight, FileText, MessageSquare, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react'
import './RoadmapTree.css'

interface RoadmapTreeProps {
  roadmap: Roadmap
}

interface NodePosition {
  x: number
  y: number
}

interface Layout {
  positions: Record<string, NodePosition>
  width: number
  height: number
}

const LEVEL_WIDTH = 350
const NODE_WIDTH = 280
const NODE_HEIGHT_SLOT = 180 // Vertical space per node
const MIN_HEIGHT = 600

export default function RoadmapTree({ roadmap }: RoadmapTreeProps) {
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate layout
  const layout = useMemo<Layout>(() => {
    const positions: Record<string, NodePosition> = {}
    const levels: Record<number, string[]> = {}
    const visited = new Set<string>()

    // Find root nodes (nodes with no incoming edges)
    const targetNodes = new Set(roadmap.edges.map(e => e.to))
    const rootNodes = roadmap.nodes.filter(n => !targetNodes.has(n.id))
    
    // If no clear roots (cycles?), pick the first one
    const startNodes = rootNodes.length > 0 ? rootNodes : [roadmap.nodes[0]]

    // BFS to assign levels
    const queue = startNodes.map(n => ({ id: n.id, level: 0 }))
    
    // Keep track of max level for width calculation
    let maxLevel = 0

    while (queue.length > 0) {
      const { id, level } = queue.shift()!
      
      if (visited.has(id)) continue
      visited.add(id)
      
      if (!levels[level]) levels[level] = []
      levels[level].push(id)
      maxLevel = Math.max(maxLevel, level)

      // Add children to queue
      const children = roadmap.edges
        .filter(e => e.from === id)
        .map(e => ({ id: e.to, level: level + 1 }))
      queue.push(...children)
    }

    // Handle disconnected nodes (islands)
    const unvisited = roadmap.nodes.filter(n => !visited.has(n.id))
    unvisited.forEach(n => {
        // Place them at level 0 or after max level? 
        // Let's place them at level 0 for now, or maybe a separate "island" level
        if (!levels[0]) levels[0] = []
        levels[0].push(n.id)
    })

    // Calculate canvas dimensions
    const maxNodesInLevel = Math.max(...Object.values(levels).map(l => l.length))
    const height = Math.max(MIN_HEIGHT, maxNodesInLevel * NODE_HEIGHT_SLOT + 100)
    const width = (maxLevel + 1) * LEVEL_WIDTH + 100

    // Assign positions
    Object.keys(levels).forEach(levelKey => {
      const level = parseInt(levelKey)
      const nodesInLevel = levels[level]
      const totalInLevel = nodesInLevel.length
      
      nodesInLevel.forEach((nodeId, index) => {
        const x = (level * LEVEL_WIDTH) + 50
        // Distribute vertically centered
        const availableHeight = height
        const y = ((index + 1) * availableHeight / (totalInLevel + 1)) - 50 // -50 to center roughly
        
        positions[nodeId] = { x, y }
      })
    })

    return { positions, width, height }
  }, [roadmap])

  // Helper to get node by ID
  const getNode = (id: string) => roadmap.nodes.find(n => n.id === id)

  // Helper to get related edges for details panel
  const getRelatedEdges = (nodeId: string) => {
    const incoming = roadmap.edges.filter(e => e.to === nodeId)
    const outgoing = roadmap.edges.filter(e => e.from === nodeId)
    return { incoming, outgoing }
  }

  return (
    <div className={`roadmap-container ${isFullScreen ? 'fullscreen' : ''}`} ref={containerRef}>
      <div className="roadmap-scroll-area">
        <div style={{ 
          width: layout.width, 
          height: layout.height, 
          position: 'relative',
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          transition: 'transform 0.2s ease'
        }}>
          
          {/* SVG Layer for Edges */}
          <svg 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="var(--gray-8)" />
              </marker>
            </defs>
            {roadmap.edges.map((edge, i) => {
              const start = layout.positions[edge.from]
              const end = layout.positions[edge.to]
              
              if (!start || !end) return null

              // Calculate curve
              const startX = start.x + NODE_WIDTH
              const startY = start.y + 40 // Approximate center of node height (padding + title)
              const endX = end.x
              const endY = end.y + 40

              const midX = (startX + endX) / 2
              const midY = (startY + endY) / 2

              // Quadratic Bezier
              const d = `M ${startX} ${startY} Q ${midX} ${startY}, ${midX} ${midY} T ${endX} ${endY}`
              
              // Calculate label position (midpoint of curve approx)
              const labelX = midX
              const labelY = midY - 5

              return (
                <g key={`${edge.from}-${edge.to}-${i}`}>
                  <path
                    d={d}
                    className={`roadmap-edge ${edge.relation}`}
                    markerEnd="url(#arrowhead)"
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    className="roadmap-edge-label"
                    textAnchor="middle"
                  >
                    {edge.relation}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* HTML Layer for Nodes */}
          {roadmap.nodes.map(node => {
            const pos = layout.positions[node.id]
            if (!pos) return null

            return (
              <div
                key={node.id}
                className={`roadmap-node ${node.type} ${selectedNode?.id === node.id ? 'selected' : ''}`}
                style={{ left: pos.x, top: pos.y }}
                onClick={() => setSelectedNode(node)}
              >
                <div className="roadmap-node-type">{node.type}</div>
                <div className="roadmap-node-title">{node.title}</div>
                <div className="roadmap-node-summary">{node.summary}</div>
                {node.refs && node.refs.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '0.85em', borderTop: '1px solid var(--gray-6)', paddingTop: '5px', color: 'var(--gray-11)' }}>
                    📚 {node.refs.length} reference{node.refs.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="roadmap-controls">
        <Tooltip content="Zoom Out">
          <IconButton variant="soft" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
            <ZoomOut size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Zoom In">
          <IconButton variant="soft" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
            <ZoomIn size={18} />
          </IconButton>
        </Tooltip>
        <div style={{ width: 1, background: 'var(--gray-6)', margin: '0 5px' }} />
        <Tooltip content={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
          <IconButton variant="soft" onClick={() => setIsFullScreen(!isFullScreen)}>
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </IconButton>
        </Tooltip>
      </div>

      {/* Legend */}
      <div className="roadmap-legend">
        <div className="roadmap-legend-title">Node Types</div>
        <div className="roadmap-legend-item">
          <div className="roadmap-legend-color" style={{ background: '#8b5cf6' }}></div>
          <span>Topic</span>
        </div>
        <div className="roadmap-legend-item">
          <div className="roadmap-legend-color" style={{ background: '#ec4899' }}></div>
          <span>Subtopic</span>
        </div>
        <div className="roadmap-legend-item">
          <div className="roadmap-legend-color" style={{ background: '#06b6d4' }}></div>
          <span>Action</span>
        </div>
        <div className="roadmap-legend-item">
          <div className="roadmap-legend-color" style={{ background: '#10b981' }}></div>
          <span>Resource</span>
        </div>
      </div>

      {/* Details Panel */}
      <div className={`roadmap-details-panel ${selectedNode ? 'open' : ''}`}>
        {selectedNode && (
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
              <Badge size="2" color={
                selectedNode.type === 'Topic' ? 'violet' :
                selectedNode.type === 'Subtopic' ? 'pink' :
                selectedNode.type === 'Action' ? 'cyan' : 'teal'
              }>
                {selectedNode.type}
              </Badge>
              <Button variant="ghost" color="gray" onClick={() => setSelectedNode(null)}>
                <X size={20} />
              </Button>
            </Flex>

            <Text size="5" weight="bold" style={{ color: 'var(--gray-12)' }}>
              {selectedNode.title}
            </Text>

            <Card style={{ backgroundColor: 'var(--gray-3)' }}>
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold" color="gray">Summary</Text>
                <Text size="2" style={{ lineHeight: 1.6, color: 'var(--gray-11)' }}>{selectedNode.summary}</Text>
              </Flex>
            </Card>

            {/* References */}
            {selectedNode.refs && selectedNode.refs.length > 0 && (
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold" color="gray">📚 References</Text>
                {selectedNode.refs.map((ref, i) => (
                  <Card key={i} size="1" style={{ backgroundColor: 'var(--gray-3)' }}>
                    <Flex gap="2" align="start">
                      {ref.file ? <FileText size={16} /> : <MessageSquare size={16} />}
                      <Flex direction="column">
                        {ref.file && (
                          <>
                            <Text size="2" weight="medium">{ref.file}</Text>
                            {ref.anchor && <Text size="1" color="gray">"{ref.anchor}"</Text>}
                          </>
                        )}
                        {ref.chat_id && (
                          <Text size="2">Chat: {ref.chat_id} (Msg: {ref.message_id})</Text>
                        )}
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            )}

            {/* Connections */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold" color="gray">🔗 Connections</Text>
              
              {getRelatedEdges(selectedNode.id).incoming.length > 0 && (
                <Flex direction="column" gap="1">
                  <Text size="1" weight="bold">Incoming</Text>
                  {getRelatedEdges(selectedNode.id).incoming.map((e, i) => {
                    const fromNode = getNode(e.from)
                    return (
                      <Flex key={i} align="center" gap="2" style={{ paddingLeft: '10px' }}>
                        <ChevronRight size={14} />
                        <Text size="2">{fromNode?.title}</Text>
                        <Badge size="1" variant="outline">{e.relation}</Badge>
                      </Flex>
                    )
                  })}
                </Flex>
              )}

              {getRelatedEdges(selectedNode.id).outgoing.length > 0 && (
                <Flex direction="column" gap="1">
                  <Text size="1" weight="bold" style={{ marginTop: '10px' }}>Outgoing</Text>
                  {getRelatedEdges(selectedNode.id).outgoing.map((e, i) => {
                    const toNode = getNode(e.to)
                    return (
                      <Flex key={i} align="center" gap="2" style={{ paddingLeft: '10px' }}>
                        <ChevronRight size={14} />
                        <Text size="2">{toNode?.title}</Text>
                        <Badge size="1" variant="outline">{e.relation}</Badge>
                      </Flex>
                    )
                  })}
                </Flex>
              )}
            </Flex>

          </Flex>
        )}
      </div>
    </div>
  )
}
