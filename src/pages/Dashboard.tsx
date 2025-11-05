import { Heading, Text, Card, Flex, Button, Grid, Callout } from '@radix-ui/themes'
import { Database, FileText, MessageSquare, Sparkles, AlertCircle } from 'lucide-react'
import ImportUpload from '@/features/import/ImportUpload'
import { useStats, useSessions } from '@/lib/hooks'
import { useState } from 'react'
import ConversationModal from '@/components/ConversationModal'
import { ChatSession } from '@/types'

export default function Dashboard() {
  const { sessionCount, messageCount, tagCount } = useStats()
  const { sessions } = useSessions()
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadingMock, setLoadingMock] = useState(false)
  const [mockError, setMockError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)

  const handleImportComplete = () => {
    setRefreshKey(prev => prev + 1)
  }

  const loadMockData = async () => {
    setLoadingMock(true)
    setMockError(null)
    
    try {
      const response = await fetch('/src/mocks/chatgpt-conversations.json')
      if (!response.ok) throw new Error('Failed to load mock data')
      
      const mockData = await response.text()
      const blob = new Blob([mockData], { type: 'application/json' })
      const file = new File([blob], 'mock-conversations.json', { type: 'application/json' })
      
      const { ChatGPTImportAdapter, importFile } = await import('@/features/import/importService')
      const adapter = new ChatGPTImportAdapter()
      await importFile(file, adapter)
      handleImportComplete()
    } catch (error) {
      setMockError(error instanceof Error ? error.message : 'Failed to load mock data')
    } finally {
      setLoadingMock(false)
    }
  }

  return (
    <div key={refreshKey}>
      <Heading size="8" mb="2">
        Dashboard
      </Heading>
      <Text size="3" color="gray" mb="6">
        Welcome to Memoria - Your AI conversation memory
      </Text>

      <Flex gap="4" direction="column">
        {/* Demo Data Card - Always Visible */}
        <Card style={{ background: 'var(--accent-2)', borderColor: 'var(--accent-6)' }}>
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2" justify="between">
              <Flex align="center" gap="2">
                <Sparkles size={20} color="var(--accent-11)" />
                <Text size="3" weight="bold">
                  Demo Mode
                </Text>
              </Flex>
              <Button 
                variant="soft" 
                onClick={loadMockData} 
                disabled={loadingMock}
                color="blue"
              >
                <Sparkles size={16} />
                {loadingMock ? 'Loading...' : 'Load Sample Conversations'}
              </Button>
            </Flex>
            
            <Text size="2" color="gray">
              Load 5 sample ChatGPT conversations (Python, React, ML, Databases, TypeScript) 
              to explore search and visualization features.
            </Text>

            {mockError && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <AlertCircle size={16} />
                </Callout.Icon>
                <Callout.Text>{mockError}</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>

        <ImportUpload onImportComplete={handleImportComplete} />

        <Card>
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Database size={24} />
              <Heading size="5">Your Corpus</Heading>
            </Flex>
            
            {sessionCount === 0 ? (
              <Flex direction="column" gap="3">
                <Text color="gray">
                  No conversations imported yet. Use the demo data above or import your own ChatGPT export.
                </Text>
              </Flex>
            ) : (
              <>
                <Grid columns="3" gap="4">
                  <Flex direction="column" gap="1">
                    <Text weight="bold" size="6">
                      {sessionCount}
                    </Text>
                    <Text size="2" color="gray">
                      Conversations
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="1">
                    <Text weight="bold" size="6">
                      {messageCount}
                    </Text>
                    <Text size="2" color="gray">
                      Messages
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="1">
                    <Text weight="bold" size="6">
                      {tagCount}
                    </Text>
                    <Text size="2" color="gray">
                      Tags
                    </Text>
                  </Flex>
                </Grid>

                <Flex direction="column" gap="2" mt="3">
                  <Text size="3" weight="bold">
                    Recent Conversations
                  </Text>
                  {sessions.slice(0, 5).map((session) => (
                    <Card 
                      key={session.id} 
                      variant="surface"
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => setSelectedSession(session)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent-3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = ''
                      }}
                    >
                      <Flex align="center" gap="2">
                        <MessageSquare size={16} />
                        <Flex direction="column" gap="1" style={{ flex: 1 }}>
                          <Text weight="bold" size="2">
                            {session.title}
                          </Text>
                          <Text size="1" color="gray">
                            {session.messageCount} messages · {session.updatedAt.toLocaleDateString()}
                          </Text>
                        </Flex>
                        <FileText size={14} color="gray" />
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              </>
            )}
          </Flex>
        </Card>
      </Flex>

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
