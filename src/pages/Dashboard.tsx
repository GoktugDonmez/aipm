import { Text, Card, Flex, Button, Grid } from '@radix-ui/themes'
import { Database, Plus } from 'lucide-react'
// import ImportUpload from '@/features/import/ImportUpload' // Hidden - ChatGPT doesn't provide file exports
import ManualQAInput from '@/features/import/ManualQAInput'
import ExtensionDataReceiver from '@/features/import/ExtensionDataReceiver'
import { useStats, useSessions, useQAConversations } from '@/lib/hooks'
import { useState } from 'react'
import ConversationModal from '@/components/ConversationModal'
import QAConversationModal from '@/components/QAConversationModal'
import { ChatSession } from '@/types'

export default function Dashboard() {
  const { conversationCount, messageCount, tagCount } = useStats()
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
      <Flex gap="6" direction="column">
        {/* Extension Data Receiver */}
        <ExtensionDataReceiver onImportComplete={handleImportComplete} />

        {/* Stats */}
        <Grid columns="3" gap="4">
          <Card variant="surface">
            <Flex direction="column" gap="1">
              <Text weight="bold" size="7">
                {conversationCount}
              </Text>
              <Text size="2" color="gray">
                Conversations
              </Text>
            </Flex>
          </Card>
          <Card variant="surface">
            <Flex direction="column" gap="1">
              <Text weight="bold" size="7">
                {messageCount}
              </Text>
              <Text size="2" color="gray">
                Interactions
              </Text>
            </Flex>
          </Card>
          <Card variant="surface">
            <Flex direction="column" gap="1">
              <Text weight="bold" size="7">
                {tagCount}
              </Text>
              <Text size="2" color="gray">
                Tags
              </Text>
            </Flex>
          </Card>
        </Grid>

        {/* Conversations List */}
        {conversationCount === 0 ? (
          <Card variant="surface">
            <Flex direction="column" align="center" gap="3" py="6">
              <Database size={32} color="var(--gray-9)" />
              <Text size="3" color="gray" align="center">
                No conversations yet
              </Text>
            </Flex>
          </Card>
        ) : (
          (sessions.length > 0 || qaConversations.length > 0) && (
            <Flex direction="column" gap="3">
              <Text size="4" weight="medium">
                Conversations
              </Text>
              
              <Card variant="surface">
                <Flex direction="column" gap="0">
                  {/* Regular sessions */}
                  {sessions.slice(0, 5).map((session, idx) => (
                    <Flex key={session.id} direction="column">
                      {idx > 0 && (
                        <div style={{ 
                          height: '1px', 
                          background: 'var(--gray-6)', 
                          margin: '0.5rem 0' 
                        }} />
                      )}
                      <Card 
                        variant="ghost"
                        style={{ 
                          cursor: 'pointer', 
                          transition: 'all 0.2s',
                          padding: '0.75rem'
                        }}
                        onClick={() => setSelectedSession(session)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--accent-2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = ''
                        }}
                      >
                        <Flex direction="column" gap="1">
                          <Text weight="medium" size="3">
                            {session.title}
                          </Text>
                          <Text size="2" color="gray">
                            {session.messageCount} interactions · {session.updatedAt.toLocaleDateString()}
                          </Text>
                        </Flex>
                      </Card>
                    </Flex>
                  ))}
                  
                  {/* QA conversations */}
                  {qaConversations.slice(0, 5).map((conv, idx) => {
                    const isFirstQA = idx === 0 && sessions.length === 0
                    return (
                      <Flex key={conv.id} direction="column">
                        {!isFirstQA && (
                          <div style={{ 
                            height: '1px', 
                            background: 'var(--gray-6)', 
                            margin: '0.5rem 0' 
                          }} />
                        )}
                        <Card 
                          variant="ghost"
                          style={{ 
                            cursor: 'pointer', 
                            transition: 'all 0.2s',
                            padding: '0.75rem'
                          }}
                          onClick={() => setSelectedQAConversation({ id: conv.id, title: conv.title })}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent-2)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = ''
                          }}
                        >
                          <Flex direction="column" gap="1">
                            <Text weight="medium" size="3" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {conv.title}
                            </Text>
                            <Text size="2" color="gray">
                              {conv.source === 'manual' ? 'Manual' : conv.source} · {conv.qaPairCount} {conv.qaPairCount === 1 ? 'interaction' : 'interactions'} · {conv.updatedAt.toLocaleDateString()}
                            </Text>
                          </Flex>
                        </Card>
                      </Flex>
                    )
                  })}
                </Flex>
              </Card>
            </Flex>
          )
        )}
      </Flex>

      {/* Floating Add Button */}
      <Button
        onClick={() => setShowManualQA(true)}
        size="4"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          padding: 0,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
        }}
      >
        <Plus size={24} />
      </Button>

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
