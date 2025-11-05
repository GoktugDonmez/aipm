import { useState, useEffect } from 'react'
import {
  Heading,
  Text,
  TextField,
  Button,
  Card,
  Flex,
  Badge,
  Select,
} from '@radix-ui/themes'
import { Search as SearchIcon, Filter, MessageSquare } from 'lucide-react'
import { KeywordSearchAdapter, SearchFilters } from '@/features/search/searchService'
import { SearchResult } from '@/types'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import ConversationModal from '@/components/ConversationModal'
import { ChatSession } from '@/types'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)

  const sessions = useLiveQuery(() => db.sessions.orderBy('updatedAt').reverse().toArray())
  const messages = useLiveQuery(() => db.messages.toArray())
  const sessionMap = new Map(sessions?.map(s => [s.id, s]))

  // Load all conversations by default
  useEffect(() => {
    if (!query && sessions && messages) {
      // Create default "results" from all sessions
      const defaultResults: SearchResult[] = sessions.slice(0, 50).map(session => {
        const sessionMessages = messages.filter(m => m.sessionId === session.id)
        const preview = sessionMessages
          .slice(0, 2)
          .map(m => m.content.substring(0, 100))
          .join(' ... ')
        
        return {
          id: session.id,
          sessionId: session.id,
          messageId: sessionMessages[0]?.id || session.id,
          snippet: preview || session.title,
          score: 0,
          highlights: [],
        }
      })
      setResults(defaultResults)
    }
  }, [query, sessions, messages])

  const handleSearch = async () => {
    if (!query.trim()) return

    setSearching(true)
    try {
      const adapter = new KeywordSearchAdapter()
      const filters: SearchFilters = {}

      if (sourceFilter !== 'all') {
        filters.sources = [sourceFilter]
      }

      const searchResults = await adapter.search(query, filters)
      setResults(searchResults)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights.length) return text

    let highlighted = text
    highlights.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi')
      highlighted = highlighted.replace(regex, '<mark>$1</mark>')
    })

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />
  }

  return (
    <div>
      <Heading size="8" mb="2">
        Search
      </Heading>
      <Text size="3" color="gray" mb="6">
        Search your AI conversation history
      </Text>

      <Card mb="4">
        <Flex direction="column" gap="3">
          <Flex gap="2" align="end">
            <div style={{ flex: 1 }}>
              <Text size="2" weight="bold" mb="1" as="label">
                Search Query
              </Text>
              <TextField.Root
                placeholder="Search conversations..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                size="3"
              >
                <TextField.Slot>
                  <SearchIcon size={16} />
                </TextField.Slot>
              </TextField.Root>
            </div>
            <Button onClick={handleSearch} disabled={searching || !query.trim()} size="3">
              <SearchIcon size={16} />
              {searching ? 'Searching...' : 'Search'}
            </Button>
            <Button
              variant="soft"
              onClick={() => setShowFilters(!showFilters)}
              size="3"
            >
              <Filter size={16} />
              Filters
            </Button>
          </Flex>

          {showFilters && (
            <Flex gap="3" wrap="wrap">
              <div style={{ minWidth: '200px' }}>
                <Text size="2" weight="bold" mb="1" as="label">
                  Source
                </Text>
                <Select.Root value={sourceFilter} onValueChange={setSourceFilter}>
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="all">All Sources</Select.Item>
                    <Select.Item value="chatgpt">ChatGPT</Select.Item>
                    <Select.Item value="claude">Claude</Select.Item>
                    <Select.Item value="gemini">Gemini</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>
          )}
        </Flex>
      </Card>

      {results.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="2" color="gray">
            {query ? `Found ${results.length} results` : `Showing all conversations (${results.length})`}
          </Text>

          {results.map((result) => {
            const session = sessionMap.get(result.sessionId)
            return (
              <Card 
                key={result.id} 
                variant="surface"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => session && setSelectedSession(session)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = ''
                }}
              >
                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2" justify="between">
                    <Flex align="center" gap="2">
                      <MessageSquare size={16} />
                      <Text weight="bold" size="3">
                        {session?.title || 'Unknown Session'}
                      </Text>
                    </Flex>
                    <Flex gap="2">
                      <Badge color="blue">{session?.source || 'unknown'}</Badge>
                      {query && <Badge variant="soft">Score: {result.score}</Badge>}
                    </Flex>
                  </Flex>

                  <Text size="2" color="gray">
                    {query ? highlightText(result.snippet, result.highlights) : result.snippet}
                  </Text>

                  <Text size="1" color="gray">
                    {session?.updatedAt.toLocaleDateString()} · {session?.messageCount} interactions
                  </Text>
                </Flex>
              </Card>
            )
          })}
        </Flex>
      )}

      {!searching && results.length === 0 && query && (
        <Card variant="surface">
          <Text color="gray" align="center">
            No results found for "{query}"
          </Text>
        </Card>
      )}

      {!searching && results.length === 0 && !query && (
        <Card variant="surface">
          <Text color="gray" align="center">
            No conversations yet. Import some conversations to get started!
          </Text>
        </Card>
      )}

      {/* Conversation Modal */}
      {selectedSession && (
        <ConversationModal
          session={selectedSession}
          open={!!selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  )
}
