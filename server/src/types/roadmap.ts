// TypeScript types matching roadmap.schema.json

export interface RoadmapNode {
  id: string
  type: 'Topic' | 'Subtopic' | 'Action' | 'Resource'
  title: string
  summary: string
  refs: RoadmapReference[]
}

export interface RoadmapReference {
  file?: string
  anchor?: string
  chat_id?: string
  message_id?: string
}

export interface RoadmapEdge {
  from: string
  to: string
  relation: 'explains' | 'leads_to' | 'depends_on' | 'precedes'
}

export interface RoadmapConstraints {
  max_nodes: number
  max_depth: number
  max_children_per_node: number
}

export interface Roadmap {
  artifact_type: 'Roadmap'
  main_topic: string
  nodes: RoadmapNode[]
  edges: RoadmapEdge[]
  constraints: RoadmapConstraints
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
