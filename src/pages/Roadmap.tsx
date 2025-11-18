import { useState, useEffect } from 'react'
import { Heading, Text, Card, Flex, Button, TextField, Checkbox, Spinner, Callout } from '@radix-ui/themes'
import { Search, Sparkles, AlertCircle } from 'lucide-react'
import { useSessions } from '@/lib/hooks'
import { generateRoadmap } from '@/features/roadmap/roadmapService'
import type { Roadmap } from '@/types/roadmap'
import RoadmapGraph from '@/features/visualization/RoadmapGraph'

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

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            <Sparkles size={28} />
            <Heading size="6">AI Roadmap Explorer</Heading>
          </Flex>
          <Text color="gray">
            Ask a question and select conversations to generate an AI-powered knowledge roadmap
          </Text>
        </Flex>

        {/* Query Input */}
        <Card>
          <Flex direction="column" gap="3">
            <Text weight="bold">What do you want to explore?</Text>
            <TextField.Root
              placeholder="e.g., show me my gym notes, explain Python data analysis, summarize ML deployment..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              size="3"
              disabled={loading}
            >
              <TextField.Slot>
                <Search size={16} />
              </TextField.Slot>
            </TextField.Root>
          </Flex>
        </Card>

        {/* Advanced Options - Collapsible Session Selection */}
        <Card>
          <Flex direction="column" gap="3">
            <Button 
              variant="ghost" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ cursor: 'pointer', width: '100%', justifyContent: 'flex-start' }}
            >
              <Text weight="bold">
                {showAdvanced ? '▼' : '▶'} Advanced: Select Conversations ({selectedSessionIds.size}/{sessions.length})
              </Text>
            </Button>
            
            {showAdvanced && (
              <Flex direction="column" gap="3">
                <Flex justify="end">
                  <Button variant="soft" size="1" onClick={handleSelectAll}>
                    {selectedSessionIds.size === sessions.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </Flex>

                <div style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--gray-6)', 
                  borderRadius: '6px',
                  padding: '0.5rem' 
                }}>
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
                            gap: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: selectedSessionIds.has(session.id) ? 'var(--accent-3)' : 'transparent'
                          }}
                        >
                          <Checkbox
                            checked={selectedSessionIds.has(session.id)}
                            onCheckedChange={() => handleSessionToggle(session.id)}
                          />
                          <Flex direction="column" gap="1" style={{ flex: 1 }}>
                            <Text size="2" weight="medium">{session.title}</Text>
                            <Text size="1" color="gray">
                              {session.source} • {session.messageCount} messages • {session.tags.slice(0, 3).join(', ')}
                            </Text>
                          </Flex>
                        </label>
                      ))}
                    </Flex>
                  )}
                </div>
              </Flex>
            )}
          </Flex>
        </Card>

        {/* Generate Button */}
        <Button 
          size="3" 
          onClick={handleGenerateRoadmap}
          disabled={loading || !query.trim() || selectedSessionIds.size === 0}
        >
          {loading ? (
            <>
              <Spinner />
              Generating Roadmap...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Roadmap
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <Callout.Root color="red">
            <Callout.Icon>
              <AlertCircle size={16} />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        {/* Roadmap Visualization */}
        {roadmap && (
          <Card>
            <Flex direction="column" gap="3">
              <Flex direction="column" gap="1">
                <Heading size="4">{roadmap.main_topic}</Heading>
                <Text color="gray" size="2">
                  {roadmap.nodes.length} nodes • {roadmap.edges.length} connections
                </Text>
              </Flex>
              <RoadmapGraph roadmap={roadmap} />
            </Flex>
          </Card>
        )}
      </Flex>
    </div>
  )
}
