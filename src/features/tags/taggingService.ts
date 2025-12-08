import { ChatSession, Tag } from '@/types'
import { db } from '@/lib/db'
import { TagCandidate, TagGenerationResult } from './taggingContracts'

export interface TaggingAdapter {
  generateTags(session: ChatSession, documents: string[]): Promise<TagGenerationResult>
}

// Backend URL from environment or default to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export class AITaggingAdapter implements TaggingAdapter {
  private readonly fallback = new KeywordTaggingAdapter()

  async generateTags(session: ChatSession, documents: string[]): Promise<TagGenerationResult> {
    // We no longer check isLLMAvailable() locally because the key is on the backend.

    try {
      console.log(`🏷️  Requesting tags from backend for session: ${session.title}`)

      const response = await fetch(`${BACKEND_URL}/api/generate-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: {
            id: session.id,
            title: session.title,
            source: session.source,
            createdAt: session.createdAt,
          },
          documents,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Backend tagging failed with status ${response.status}`)
      }

      const result: TagGenerationResult = await response.json()
      return result

    } catch (error) {
      console.error('Backend tagging failed, falling back to keyword tagging:', error)
      return this.fallback.generateTags(session, documents)
    }
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
  const cleaned = token.trim()
  if (cleaned.length === 0) return ''
  if (cleaned.length <= 3) {
    return cleaned.toUpperCase()
  }
  return cleaned
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function normalizeTagKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

// Helper functions removed as they are now handled by backend
// - buildConversationExcerpt
// - dedupeNormalizedTags

const TAG_FILLER_TOKENS = new Set<string>([
  'tips', 'tip', 'guide', 'guides', 'guideline', 'guidelines', 'basics', 'overview', 'introduction',
  'intro', 'process', 'processes', 'structure', 'structures', 'strategy', 'strategies', 'concepts',
  'concept', 'information', 'insight', 'insights', 'ideas', 'idea', 'general', 'fundamentals',
])

const TOKEN_SYNONYMS = new Map<string, string>([
  ['cv', 'resume'],
  ['cvs', 'resume'],
  ['resume', 'resume'],
  ['resumes', 'resume'],
  ['curriculum', 'resume'],
  ['vitae', 'resume'],
  ['internships', 'internship'],
  ['interviewing', 'interview'],
  ['interviews', 'interview'],
])

const SPECIAL_SHORT_TOKENS = new Set<string>(['cv'])

function normalizeMeaningfulTokens(tag: string): string[] {
  const cleaned = tag
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => TOKEN_SYNONYMS.get(token) || token)
    .map(stemToken)
    .filter((token) => token.length > 0 && !TAG_FILLER_TOKENS.has(token))

  if (cleaned.length > 0) {
    return Array.from(new Set(cleaned))
  }

  return [tag.toLowerCase()]
}

function stemToken(token: string): string {
  let base = token
  if (base.endsWith('ies') && base.length > 4) {
    base = base.slice(0, -3) + 'y'
  } else if (base.endsWith('ing') && base.length > 5) {
    base = base.slice(0, -3)
  } else if (base.endsWith('ed') && base.length > 4) {
    base = base.slice(0, -2)
  } else if (base.endsWith('es') && base.length > 4) {
    base = base.slice(0, -2)
  } else if (base.endsWith('s') && base.length > 3) {
    base = base.slice(0, -1)
  }
  return base
}

function applyCanonicalMapping(tags: string[] | undefined, canonicalMap: Map<string, string>): string[] {
  const values = Array.isArray(tags) ? tags : []
  const seen = new Set<string>()
  const normalized: string[] = []

  values.forEach((tag) => {
    const fallback = formatTagLabel(tag)
    const canonical = canonicalMap.get(normalizeTagKey(tag)) || fallback
    const key = normalizeTagKey(canonical)
    if (!key || seen.has(key)) {
      return
    }
    seen.add(key)
    normalized.push(canonical)
  })

  return normalized
}

export class KeywordTaggingAdapter implements TaggingAdapter {
  async generateTags(session: ChatSession, documents: string[]): Promise<TagGenerationResult> {
    const corpus = [session.title, ...documents].filter(Boolean)
    const tokenized = corpus
      .map(tokenize)
      .filter((tokens) => tokens.length > 0)

    if (tokenized.length === 0) {
      return {
        sessionId: session.id,
        rawTags: [],
        normalizedTags: [],
      }
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
      if (uniqueTokens.length >= 5) {
        break
      }
    }

    const rawTags: TagCandidate[] = uniqueTokens.map((token) => ({
      name: formatTagLabel(token),
      confidence: 0.4,
      rationale: 'Keyword importance',
    }))

    const normalizedTags = rawTags.map((tag) => tag.name)

    return {
      sessionId: session.id,
      rawTags,
      normalizedTags,
    }
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
  const adapter = new AITaggingAdapter()
  const sessions = sessionIds && sessionIds.length > 0
    ? (await db.sessions.bulkGet(sessionIds)).filter((session): session is ChatSession => Boolean(session))
    : await db.sessions.toArray()

  if (sessions.length === 0) {
    return
  }

  const nextSessionTags: TagGenerationResult[] = []

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

    const generated = await adapter.generateTags(session, documents)
    nextSessionTags.push(generated)
  }

  if (nextSessionTags.length === 0) {
    return
  }

  await db.transaction('rw', db.sessions, async () => {
    for (const entry of nextSessionTags) {
      await db.sessions.update(entry.sessionId, { tags: entry.normalizedTags })
    }
  })

  const allSessions = await db.sessions.toArray()
  const allTagNames = allSessions.flatMap((session) => session.tags || [])
  const refiner = new TagPoolRefiner()
  const canonicalMap = await refiner.buildCanonicalMap(allTagNames)

  const canonicalUpdates: Array<{ sessionId: string; tags: string[] }> = []

  allSessions.forEach((session) => {
    const originalTags = session.tags || []
    const normalized = applyCanonicalMapping(originalTags, canonicalMap)

    if (!arraysEqual(originalTags, normalized)) {
      canonicalUpdates.push({ sessionId: session.id, tags: normalized })
      session.tags = normalized
    }
  })

  await db.transaction('rw', db.sessions, db.tags, async () => {
    for (const update of canonicalUpdates) {
      await db.sessions.update(update.sessionId, { tags: update.tags })
    }

    const tagAccumulator = new Map<string, { name: string; sessionIds: Set<string> }>()

    allSessions.forEach((session) => {
      session.tags?.forEach((tagName) => {
        const normalizedKey = normalizeTagKey(tagName)
        if (!tagAccumulator.has(normalizedKey)) {
          tagAccumulator.set(normalizedKey, { name: formatTagLabel(tagName), sessionIds: new Set<string>() })
        }
        tagAccumulator.get(normalizedKey)!.sessionIds.add(session.id)
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

class TagPoolRefiner {
  async buildCanonicalMap(tagNames: string[]): Promise<Map<string, string>> {
    const unique = Array.from(new Set(tagNames.map((tag) => formatTagLabel(tag)).filter(Boolean)))

    if (unique.length === 0) {
      return new Map()
    }

    // We have disabled client-side LLM clustering to secure API keys
    // Returning fallback map directly
    return this.mergeCanonicalLabels(this.buildFallbackMap(unique))
  }

  private buildFallbackMap(tags: string[]): Map<string, string> {
    const map = new Map<string, string>()
    tags.forEach((tag) => {
      map.set(normalizeTagKey(tag), formatTagLabel(tag))
    })
    return map
  }

  // aliasesToCanonicalMap removed as unused (LLM clustering disabled)

  private mergeCanonicalLabels(map: Map<string, string>): Map<string, string> {
    if (map.size <= 1) {
      return map
    }

    const labels = Array.from(new Set(map.values()))
    if (labels.length <= 1) {
      return map
    }

    const tokensList = labels.map((label) => ({
      label,
      tokens: normalizeMeaningfulTokens(label),
    }))

    const uf = new UnionFind(labels.length)

    for (let i = 0; i < tokensList.length; i++) {
      for (let j = i + 1; j < tokensList.length; j++) {
        if (shouldMergeTokenSets(tokensList[i].tokens, tokensList[j].tokens)) {
          uf.union(i, j)
        }
      }
    }

    const replacement = new Map<string, string>()
    const grouped = new Map<number, string[]>()

    tokensList.forEach((entry, index) => {
      const root = uf.find(index)
      if (!grouped.has(root)) {
        grouped.set(root, [])
      }
      grouped.get(root)!.push(entry.label)
    })

    grouped.forEach((groupLabels) => {
      groupLabels.sort((a, b) => a.length - b.length || a.localeCompare(b))
      const canonical = groupLabels[0]
      groupLabels.forEach((label) => replacement.set(label, canonical))
    })

    const merged = new Map<string, string>()
    map.forEach((label, key) => {
      merged.set(key, replacement.get(label) || label)
    })

    return merged
  }


}



function arraysEqual(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) {
    return false
  }
  return a.every((value, index) => normalizeTagKey(value) === normalizeTagKey(b[index]))
}

function shouldMergeTokenSets(tokensA: string[], tokensB: string[]): boolean {
  if (tokensA.length === 0 || tokensB.length === 0) {
    return false
  }

  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  const intersection: string[] = []

  setA.forEach((token) => {
    if (setB.has(token)) {
      intersection.push(token)
    }
  })

  if (intersection.length === 0) {
    return false
  }

  const hasAnchor = intersection.some((token) => token.length >= 3 || SPECIAL_SHORT_TOKENS.has(token))
  if (!hasAnchor) {
    return false
  }

  const coverage = intersection.length / Math.min(setA.size, setB.size)
  return coverage >= 0.5
}

class UnionFind {
  private parent: number[]
  private rank: number[]

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index)
    this.rank = Array(size).fill(0)
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x])
    }
    return this.parent[x]
  }

  union(a: number, b: number): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA === rootB) {
      return
    }

    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA
    } else {
      this.parent[rootB] = rootA
      this.rank[rootA] += 1
    }
  }
}
