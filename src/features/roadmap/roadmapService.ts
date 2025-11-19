import type { Roadmap, RoadmapResponse } from '@/types/roadmap'
import type { ChatSession, Message, QAPair } from '@/types'
import { db } from '@/lib/db'

const formatSessionMetadata = (session: ChatSession): string[] => {
  const createdAt = session.createdAt instanceof Date
    ? session.createdAt
    : new Date(session.createdAt)

  return [
    `Title: ${session.title}`,
    `Source: ${session.source}`,
    `Date: ${createdAt.toISOString()}`,
    `Tags: ${(session.tags && session.tags.length > 0) ? session.tags.join(', ') : 'None'}`,
    '',
    '=== Conversation ===',
    '',
  ]
}

const buildContentFromMessages = (session: ChatSession, messages: Message[]): string => {
  return [
    ...formatSessionMetadata(session),
    ...messages.map((msg) => `[${msg.role.toUpperCase()}]: ${msg.content}`),
  ].join('\n')
}

const buildContentFromQAPairs = (session: ChatSession, qaPairs: QAPair[]): string => {
  const conversationLines = qaPairs.flatMap((pair, idx) => {
    const pairNumber = idx + 1
    return [
      `[USER][QA #${pairNumber}]: ${pair.question}`,
      `[ASSISTANT][QA #${pairNumber}]: ${pair.answer}`,
    ]
  })

  return [
    ...formatSessionMetadata(session),
    'Note: Conversation reconstructed from imported QA pairs.',
    '',
    ...conversationLines,
  ].join('\n')
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

/**
 * Convert IndexedDB sessions to text format for roadmap generation
 */
export async function prepareSessionsAsFiles(sessionIds: string[]): Promise<Array<{ name: string; content: string }>> {
  const files: Array<{ name: string; content: string }> = []

  console.log('📦 Preparing sessions for roadmap:', sessionIds.length, 'sessions selected')

  for (const sessionId of sessionIds) {
    const session = await db.sessions.get(sessionId)
    if (!session) {
      console.warn(`⚠️  Session ${sessionId} not found in database`)
      continue
    }

    console.log(`📄 Processing session: "${session.title}" (${sessionId})`)

    const messages = await db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('order')

    console.log(`   Messages found: ${messages.length}`)

    let content: string | null = null

    if (messages.length > 0) {
      content = buildContentFromMessages(session, messages)
    } else {
      console.warn(`⚠️  No raw messages found for session: ${session.title}. Falling back to QA pairs.`)

      const qaPairs = await db.qaPairs
        .where('sessionId')
        .equals(sessionId)
        .sortBy('createdAt')

      console.log(`   QA pairs found: ${qaPairs.length}`)

      if (qaPairs.length === 0) {
        console.warn(`⚠️  No QA pairs available for session: ${session.title}. Skipping.`)
        continue
      }

      content = buildContentFromQAPairs(session, qaPairs)
    }

    files.push({
      name: `${session.title.slice(0, 50)}.txt`,
      content,
    })

    console.log(`   ✓ File prepared: ${files[files.length - 1].name} (${content.length} chars)`)
  }

  console.log(`✅ Total files prepared: ${files.length}`)
  return files
}

/**
 * Generate roadmap from selected sessions
 */
export async function generateRoadmap(
  sessionIds: string[],
  query: string
): Promise<Roadmap> {
  // Prepare files from sessions
  const files = await prepareSessionsAsFiles(sessionIds)

  if (files.length === 0) {
    throw new Error('No valid sessions to process')
  }

  // Create FormData
  const formData = new FormData()
  formData.append('query', query)

  files.forEach(file => {
    const blob = new Blob([file.content], { type: 'text/plain' })
    formData.append('files', blob, file.name)
  })

  // Call backend API
  const response = await fetch(`${BACKEND_URL}/api/generate-roadmap`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to generate roadmap' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  const data: RoadmapResponse = await response.json()

  if (!data.success || !data.roadmap) {
    throw new Error(data.error || 'Failed to generate roadmap')
  }

  return data.roadmap
}
