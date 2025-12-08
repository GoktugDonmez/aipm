
export interface ChatSession {
    id: string
    title: string
    source: string // Simplified from union type for backend flexibility
    createdAt: Date | string
    updatedAt: Date | string
    messageCount: number
    tags: string[]
}

export interface TagCandidate {
    name: string
    rationale?: string
    confidence: number
}

export interface TagGenerationResult {
    sessionId: string
    rawTags: TagCandidate[]
    normalizedTags: string[]
    summary?: string
}
