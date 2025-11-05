import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { GraphNode, GraphEdge } from '@/types'

interface NetworkGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width?: number
  height?: number
}

export default function NetworkGraph({ nodes, edges, width = 800, height = 600 }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

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
      .force('link', d3.forceLink(edges).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size + 5))

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
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)

    node.append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color || '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    node.append('text')
      .text((d) => d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label)
      .attr('font-size', '10px')
      .attr('dx', 12)
      .attr('dy', 4)
      .attr('fill', '#e5e7eb')

    node.append('title')
      .text((d) => d.label)

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
  }, [nodes, edges, width, height])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ border: '1px solid var(--gray-6)', borderRadius: '8px', background: 'var(--gray-2)' }}
    />
  )
}
