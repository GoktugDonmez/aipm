import { useState, useEffect } from 'react'
import { Heading, Text, Card, Flex, Button, TextField, Checkbox, Spinner, Callout } from '@radix-ui/themes'
import { Search, Sparkles, AlertCircle } from 'lucide-react'
import { useSessions } from '@/lib/hooks'
import { generateRoadmap } from '@/features/roadmap/roadmapService'
import type { Roadmap } from '@/types/roadmap'
import RoadmapTree from '@/features/visualization/RoadmapTree'

export default function RoadmapPage() {
  const { sessions } = useSessions()
  const [query, setQuery] = useState('')
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)

  // Auto-select all sessions on mount or when sessions change
  useEffect(() => {
    if (sessions.length > 0 && selectedSessionIds.size === 0) {
      setSelectedSessionIds(new Set(sessions.map(s => s.id)))
    }
  }, [sessions])

  const handleSessionToggle = (sessionId: string) => {
    const newSelected = new Set(selectedSessionIds)
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId)
    } else {
      newSelected.add(sessionId)
    }
    setSelectedSessionIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedSessionIds.size === sessions.length) {
      setSelectedSessionIds(new Set())
    } else {
      setSelectedSessionIds(new Set(sessions.map(s => s.id)))
    }
  }

  const handleGenerateRoadmap = async () => {
    if (!query.trim()) {
      setError('Please enter a query')
      return
    }

    if (selectedSessionIds.size === 0) {
      setError('Please select at least one conversation')
      return
    }

    setLoading(true)
    setError(null)
    setRoadmap(null)

    try {
      const result = await generateRoadmap(Array.from(selectedSessionIds), query)
      setRoadmap(result)
    } catch (err: any) {
      setError(err.message || 'Failed to generate roadmap')
      console.error('Roadmap generation error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (roadmap) {
    return (
      <div style={{ height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          padding: '0.75rem 1.5rem', 
          borderBottom: '1px solid var(--gray-6)',
          backgroundColor: 'var(--gray-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <Flex direction="column" gap="1">
            <Heading size="4">{roadmap.main_topic}</Heading>
            <Text color="gray" size="2">
              {roadmap.nodes.length} nodes • {roadmap.edges.length} connections
            </Text>
          </Flex>
          <Button variant="soft" onClick={() => setRoadmap(null)}>
            <Sparkles size={16} />
            New Search
          </Button>
        </div>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <RoadmapTree roadmap={roadmap} />
        </div>
      </div>
    )
  }

  return (
    <Flex 
      direction="column" 
      align="center" 
      justify="center" 
      style={{ 
        minHeight: 'calc(100vh - 100px)', 
        padding: '2rem',
        maxWidth: '1000px',
        margin: '0 auto'
      }}
    >
      <Flex direction="column" align="center" gap="6" style={{ width: '100%' }}>
        <Flex direction="column" align="center" gap="2">
          <Flex align="center" gap="3">
            <Sparkles size={48} color="var(--accent-9)" />
            <Heading size="8" style={{ background: 'linear-gradient(to right, var(--accent-9), var(--accent-11))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Roadmap Explorer
            </Heading>
          </Flex>
          <Text size="4" color="gray" align="center" style={{ maxWidth: 600 }}>
            Transform your conversations into a structured learning path.
            Ask a question to explore your knowledge base.
          </Text>
        </Flex>

        <Card size="4" style={{ width: '100%', padding: '2rem', backgroundColor: 'var(--gray-3)' }}>
          <Flex direction="column" gap="4">
            <TextField.Root
              placeholder="What do you want to explore? (e.g., 'Machine Learning Basics', 'Cooking Tips')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              size="3"
              disabled={loading}
              style={{ height: '50px', fontSize: '1.1rem' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading && query.trim() && selectedSessionIds.size > 0) {
                  handleGenerateRoadmap()
                }
              }}
            >
              <TextField.Slot>
                <Search size={20} />
              </TextField.Slot>
            </TextField.Root>

            <Flex justify="between" align="center">
              <Button 
                variant="ghost" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ cursor: 'pointer' }}
              >
                <Text weight="medium" color="gray">
                  {showAdvanced ? 'Hide' : 'Show'} Sources ({selectedSessionIds.size} selected)
                </Text>
              </Button>

              <Button 
                size="3" 
                onClick={handleGenerateRoadmap}
                disabled={loading || !query.trim() || selectedSessionIds.size === 0}
                style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
              >
                {loading ? (
                  <>
                    <Spinner />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Roadmap
                    <Sparkles size={16} />
                  </>
                )}
              </Button>
            </Flex>

            {showAdvanced && (
              <div style={{ 
                marginTop: '1rem',
                maxHeight: '250px', 
                overflowY: 'auto', 
                border: '1px solid var(--gray-6)', 
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: 'var(--gray-1)'
              }}>
                <Flex justify="between" align="center" mb="3">
                  <Text size="2" weight="bold" color="gray">Select Conversations</Text>
                  <Button variant="soft" size="1" onClick={handleSelectAll}>
                    {selectedSessionIds.size === sessions.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </Flex>

                {sessions.length === 0 ? (
                  <Text color="gray" size="2">No conversations available. Import some first.</Text>
                ) : (
                  <Flex direction="column" gap="2">
                    {sessions.map(session => (
                      <label 
                        key={session.id}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.8rem',
                          padding: '0.6rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: selectedSessionIds.has(session.id) ? 'var(--accent-3)' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <Checkbox
                          checked={selectedSessionIds.has(session.id)}
                          onCheckedChange={() => handleSessionToggle(session.id)}
                        />
                        <Flex direction="column" gap="1" style={{ flex: 1 }}>
                          <Text size="2" weight="medium">{session.title}</Text>
                          <Text size="1" color="gray">
                            {session.source} • {session.messageCount} msgs • {session.tags.slice(0, 3).join(', ')}
                          </Text>
                        </Flex>
                      </label>
                    ))}
                  </Flex>
                )}
              </div>
            )}
          </Flex>
        </Card>

        {error && (
          <Callout.Root color="red" style={{ width: '100%' }}>
            <Callout.Icon>
              <AlertCircle size={16} />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}
      </Flex>
    </Flex>
  )
}
