// Domain models for Memoria

export interface ChatSession {
  id: string
  title: string
  source: 'chatgpt' | 'claude' | 'gemini' | 'other'
  createdAt: Date
  updatedAt: Date
  messageCount: number
  tags: string[]
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  order: number
}

export interface Tag {
  id: string
  name: string
  color?: string
  sessionCount: number
  auto: boolean // AI-generated vs user-created
}

export interface SearchResult {
  id: string
  sessionId: string
  messageId: string
  snippet: string
  score: number
  highlights: string[]
}

export interface EmbeddingMeta {
  id: string
  messageId: string
  vector: number[]
  model: string
  createdAt: Date
}

export interface GraphNode {
  id: string
  label: string
  type: 'session' | 'tag' | 'concept'
  size: number
  color?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
}

export interface ImportJob {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface QAPair {
  id: string
  sessionId: string // Reference to original ChatGPT session (if applicable)
  question: string // User's question
  answer: string // Assistant's answer
  source: 'import' | 'manual' | 'extension'
  createdAt: Date
  updatedAt: Date
  
  // Metadata for future clustering/embedding
  embeddingId?: string // Reference to embedding when generated
  clusterId?: string // Reference to cluster when assigned
  tags: string[]
  
  // Context from original conversation
  originalMessageIds?: {
    questionId: string
    answerId: string
  }
}
