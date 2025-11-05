import { Heading, Text, Card, Flex, Button, Grid, Badge } from '@radix-ui/themes'
import { Database, FileText, MessageSquare, Plus } from 'lucide-react'
import ImportUpload from '@/features/import/ImportUpload'
import ManualQAInput from '@/features/import/ManualQAInput'
import ExtensionDataReceiver from '@/features/import/ExtensionDataReceiver'
import { useStats, useSessions, useQAConversations } from '@/lib/hooks'
import { useState } from 'react'
import ConversationModal from '@/components/ConversationModal'
import QAConversationModal from '@/components/QAConversationModal'
import { ChatSession } from '@/types'

export default function Dashboard() {
  const { sessionCount, messageCount, tagCount, qaPairCount } = useStats()
  const { sessions } = useSessions()
  const { conversations: qaConversations } = useQAConversations()
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [selectedQAConversation, setSelectedQAConversation] = useState<{ id: string; title: string } | null>(null)
  const [showManualQA, setShowManualQA] = useState(false)

  const handleImportComplete = () => {
    setRefreshKey(prev => prev + 1)
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
        <ImportUpload onImportComplete={handleImportComplete} />

        {/* Extension Data Receiver */}
        <ExtensionDataReceiver onImportComplete={handleImportComplete} />

        {/* Manual QA Input Card */}
        <Card>
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2" justify="between">
              <Flex align="center" gap="2">
                <Plus size={24} />
                <Text size="5" weight="bold">
                  Add QA Pair Manually
                </Text>
              </Flex>
              <Button onClick={() => setShowManualQA(true)}>
                <Plus size={16} />
                Add QA Pair
              </Button>
            </Flex>
            <Text color="gray" size="2">
              Manually enter a question and answer pair to add to your knowledge base.
            </Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Database size={24} />
              <Heading size="5">Your Corpus</Heading>
            </Flex>
            
            {sessionCount === 0 && qaPairCount === 0 ? (
              <Flex direction="column" gap="3">
                <Text color="gray">
                  No data imported yet. Import your ChatGPT export, add QA pairs manually, or use the Chrome extension to add data.
                </Text>
              </Flex>
            ) : (
              <>
                <Grid columns="4" gap="4">
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
                      {qaPairCount}
                    </Text>
                    <Text size="2" color="gray">
                      QA Pairs
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

                {/* All Conversations (Sessions + QA Conversations) */}
                {(sessions.length > 0 || qaConversations.length > 0) && (
                  <Flex direction="column" gap="2" mt="3">
                    <Text size="3" weight="bold">
                      Recent Conversations
                    </Text>
                    
                    {/* Display regular sessions */}
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
                    
                    {/* Display QA conversations */}
                    {qaConversations.slice(0, 5).map((conv) => (
                      <Card 
                        key={conv.id} 
                        variant="surface"
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => setSelectedQAConversation({ id: conv.id, title: conv.title })}
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
                            <Text weight="bold" size="2" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {conv.title}
                            </Text>
                            <Flex align="center" gap="2" wrap="wrap">
                              <Badge variant="soft" size="1">
                                {conv.source}
                              </Badge>
                              <Text size="1" color="gray">
                                {conv.qaPairCount} QA pairs · {conv.updatedAt.toLocaleDateString()}
                              </Text>
                            </Flex>
                          </Flex>
                          <FileText size={14} color="gray" />
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                )}
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

      {/* QA Conversation Modal */}
      {selectedQAConversation && (
        <QAConversationModal
          conversationId={selectedQAConversation.id}
          conversationTitle={selectedQAConversation.title}
          open={!!selectedQAConversation}
          onClose={() => setSelectedQAConversation(null)}
          onDelete={() => {
            setSelectedQAConversation(null)
            handleImportComplete()
          }}
        />
      )}

      {/* Manual QA Input Modal */}
      <ManualQAInput
        open={showManualQA}
        onClose={() => setShowManualQA(false)}
        onSave={handleImportComplete}
      />
    </div>
  )
}
