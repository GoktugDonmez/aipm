import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { GraphNode, GraphEdge } from '@/types'

export type LayoutStrategy = 'balanced' | 'tagOrbit' | 'splitByType'

interface NetworkGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width?: number
  height?: number
  layout?: LayoutStrategy
  onNodeClick?: (node: GraphNode) => void
}

export default function NetworkGraph({
  nodes,
  edges,
  width = 800,
  height = 600,
  layout = 'balanced',
  onNodeClick,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    if (nodes.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--gray-9)')
        .attr('font-size', 14)
        .text('No graph data available for the selected filters')
      return
    }

    const g = svg.append('g')

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create force simulation
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(edges).id((d: any) => d.id).distance((d: any) => 90 + d.weight * 10))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size + 8))

    if (layout === 'tagOrbit') {
      simulation.force(
        'radial',
        d3
          .forceRadial<GraphNode>((d) => (d.type === 'tag' ? Math.min(width, height) / 3.5 : Math.min(width, height) / 1.8), width / 2, height / 2)
          .strength(0.12),
      )
      simulation.force('x', null as unknown as d3.Force<d3.SimulationNodeDatum, undefined>)
      simulation.force('y', null as unknown as d3.Force<d3.SimulationNodeDatum, undefined>)
    } else if (layout === 'splitByType') {
      simulation.force(
        'x',
        d3
          .forceX<GraphNode>((d) => (d.type === 'tag' ? width * 0.3 : width * 0.68))
          .strength(0.1),
      )
      simulation.force('y', d3.forceY(height / 2).strength(0.05))
      simulation.force('radial', null as unknown as d3.Force<d3.SimulationNodeDatum, undefined>)
    } else {
      simulation.force('radial', null as unknown as d3.Force<d3.SimulationNodeDatum, undefined>)
      simulation.force('x', null as unknown as d3.Force<d3.SimulationNodeDatum, undefined>)
      simulation.force('y', null as unknown as d3.Force<d3.SimulationNodeDatum, undefined>)
    }

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', (d) => 0.2 + (d.weight * 0.3))
      .attr('stroke-width', (d) => 1 + Math.sqrt(d.weight))

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', (d) => (d.type === 'session' && onNodeClick ? 'pointer' : 'grab'))
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)

    node
      .append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color || '#3b82f6')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5)
      .attr('fill-opacity', (d) => (d.type === 'tag' ? 0.9 : 1))

    node
      .append('text')
      .text((d) => (d.label.length > 28 ? `${d.label.substring(0, 28)}…` : d.label))
      .attr('font-size', '11px')
      .attr('dx', 0)
      .attr('dy', (d) => d.size + 12)
      .attr('fill', 'var(--gray-12)')
      .attr('text-anchor', 'middle')

    node
      .append('title')
      .text((d) => d.label)

    if (onNodeClick) {
      node.on('click', (_, datum) => {
        if (datum.type === 'session') {
          onNodeClick?.(datum)
        }
      })
    }

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [nodes, edges, width, height, layout, onNodeClick])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{
        border: '1px solid var(--gray-6)',
        borderRadius: '12px',
        background: 'radial-gradient(circle at top, var(--gray-1), var(--gray-3))',
        boxShadow: '0 15px 35px rgba(15, 23, 42, 0.15)',
      }}
    />
  )
}
