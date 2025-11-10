import { ChatSession, Tag } from '@/types'
import { db } from '@/lib/db'

export interface TaggingAdapter {
  generateTags(session: ChatSession, documents: string[]): Promise<string[]>
}

export class AITaggingAdapter implements TaggingAdapter {
  async generateTags(_session: ChatSession, _documents: string[]): Promise<string[]> {
    // Placeholder for future LLM-powered tagging implementation.
    return []
  }
}

const STOP_WORDS = new Set<string>([
  'about', 'after', 'again', 'against', 'among', 'being', 'between', 'both', 'cannot', 'could',
  'doing', 'first', 'found', 'from', 'have', 'into', 'other', 'over', 'than', 'that', 'their',
  'these', 'they', 'this', 'those', 'through', 'under', 'until', 'very', 'were', 'what', 'when',
  'where', 'which', 'while', 'with', 'would', 'your', 'about', 'because', 'before', 'below',
  'does', 'each', 'just', 'more', 'most', 'much', 'only', 'ours', 'same', 'some', 'such', 'then',
  'them', 'themselves', 'there', 'therefore', 'these', 'thing', 'used', 'using', 'want', 'well',
  'wherever', 'within', 'without', 'work', 'yours', 'yourself', 'ourselves', 'herself', 'himself',
  'myself', 'itself', 'ours', 'hers', 'his', 'its', 'ourselves', 'theirs', 'once', 'also',
  'however', 'though', 'should', 'into', 'cannot', 'three', 'five', 'from', 'have', 'will', 'just',
  'each', 'being', 'like', 'even', 'make', 'made', 'help', 'know'
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => {
      if (token.length < 3) return false
      if (STOP_WORDS.has(token)) return false
      if (/^\d+$/.test(token)) return false
      return true
    })
}

function formatTagLabel(token: string): string {
  if (token.length <= 3) {
    return token.toUpperCase()
  }
  return token.charAt(0).toUpperCase() + token.slice(1)
}

export class KeywordTaggingAdapter implements TaggingAdapter {
  async generateTags(session: ChatSession, documents: string[]): Promise<string[]> {
    const corpus = [session.title, ...documents].filter(Boolean)
    const tokenized = corpus
      .map(tokenize)
      .filter((tokens) => tokens.length > 0)

    if (tokenized.length === 0) {
      return []
    }

    const termFrequency = new Map<string, number>()
    const documentFrequency = new Map<string, number>()
    const totalTokens = tokenized.reduce((acc, tokens) => acc + tokens.length, 0)

    tokenized.forEach((tokens) => {
      const seen = new Set<string>()
      tokens.forEach((token) => {
        termFrequency.set(token, (termFrequency.get(token) || 0) + 1)
        if (!seen.has(token)) {
          documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1)
          seen.add(token)
        }
      })
    })

    const scoredTokens = Array.from(termFrequency.entries()).map(([token, frequency]) => {
      const docFreq = documentFrequency.get(token) || 1
      const idf = Math.log((tokenized.length + 1) / (docFreq + 1)) + 1
      const normalizedTf = frequency / totalTokens
      let score = normalizedTf * idf

      if (session.title.toLowerCase().includes(token)) {
        score += 0.1
      }

      return { token, score }
    })

    scoredTokens.sort((a, b) => b.score - a.score)

    const uniqueTokens: string[] = []
    for (const item of scoredTokens) {
      if (!uniqueTokens.includes(item.token)) {
        uniqueTokens.push(item.token)
      }
      if (uniqueTokens.length >= 3) {
        break
      }
    }

    return uniqueTokens.map(formatTagLabel)
  }
}

export async function mergeTags(existingTags: Tag[], newTagNames: string[]): Promise<Tag[]> {
  const existingNames = new Set(existingTags.map((tag) => tag.name.toLowerCase()))
  const merged = [...existingTags]

  newTagNames.forEach((tagName) => {
    const normalized = tagName.toLowerCase()
    if (!existingNames.has(normalized)) {
      merged.push({
        id: `tag-${normalized.replace(/[^a-z0-9]+/g, '-')}`,
        name: tagName,
        sessionCount: 1,
        auto: true,
      })
      existingNames.add(normalized)
    }
  })

  return merged
}

export async function autoTagSessions(sessionIds?: string[]): Promise<void> {
  const adapter = new KeywordTaggingAdapter()
  const sessions = sessionIds && sessionIds.length > 0
    ? (await db.sessions.bulkGet(sessionIds)).filter((session): session is ChatSession => Boolean(session))
    : await db.sessions.toArray()

  if (sessions.length === 0) {
    return
  }

  const nextSessionTags: Array<{ sessionId: string; tags: string[] }> = []

  for (const session of sessions) {
    const messages = await db.messages.where('sessionId').equals(session.id).toArray()
    const qaPairs = await db.qaPairs.where('sessionId').equals(session.id).toArray()

    const documents: string[] = []
    if (messages.length > 0) {
      documents.push(...messages.map((message) => message.content))
    }
    if (qaPairs.length > 0) {
      qaPairs.forEach((pair) => {
        documents.push(pair.question, pair.answer)
      })
    }

    const generatedTags = await adapter.generateTags(session, documents)
    nextSessionTags.push({
      sessionId: session.id,
      tags: generatedTags,
    })
  }

  await db.transaction('rw', db.sessions, db.tags, async () => {
    for (const entry of nextSessionTags) {
      await db.sessions.update(entry.sessionId, { tags: entry.tags })
    }

    const allSessions = await db.sessions.toArray()
    const tagAccumulator = new Map<string, { name: string; sessionIds: Set<string> }>()

    allSessions.forEach((session) => {
      session.tags?.forEach((tagName) => {
        const normalized = tagName.toLowerCase()
        if (!tagAccumulator.has(normalized)) {
          tagAccumulator.set(normalized, { name: tagName, sessionIds: new Set<string>() })
        }
        tagAccumulator.get(normalized)!.sessionIds.add(session.id)
      })
    })

    await db.tags.clear()

    if (tagAccumulator.size > 0) {
      const tagRecords: Tag[] = Array.from(tagAccumulator.values()).map(({ name, sessionIds }) => ({
        id: `tag-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name,
        sessionCount: sessionIds.size,
        auto: true,
      }))

      await db.tags.bulkPut(tagRecords)
    }
  })
}
