import { Dialog, Flex, Text, Badge, ScrollArea, Card, Button, AlertDialog } from '@radix-ui/themes'
import { User, Bot, X, Trash2 } from 'lucide-react'
import { ChatSession } from '@/types'
import { useMessages, useQAPairsBySession } from '@/lib/hooks'
import { useState } from 'react'
import { deleteConversation } from '@/features/qa/qaService'

interface ConversationModalProps {
  session: ChatSession
  open: boolean
  onClose: () => void
  onDelete?: () => void
}

export default function ConversationModal({ session, open, onClose, onDelete }: ConversationModalProps) {
  const { messages } = useMessages(session.id)
  const { qaPairs } = useQAPairsBySession(session.id)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Check if this is a QA conversation (has QA pairs and no regular messages)
  const isQAConversation = qaPairs.length > 0 && messages.length === 0
  
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteConversation(session.id)
      onDelete?.()
      onClose()
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      alert('Failed to delete conversation. Please try again.')
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '800px', maxHeight: '90vh' }}>
        <Flex direction="column" gap="3" style={{ height: '80vh' }}>
          {/* Header */}
          <Flex justify="between" align="start" gap="3">
            <Flex direction="column" gap="2" style={{ flex: 1 }}>
              <Dialog.Title size="6">{session.title}</Dialog.Title>
              <Flex gap="2" wrap="wrap" align="center">
                <Badge color="blue">{session.source}</Badge>
                <Badge variant="soft">{session.messageCount} interactions</Badge>
                <Badge variant="outline">
                  {session.updatedAt.toLocaleDateString()}
                </Badge>
                <Flex gap="1" align="center" style={{ marginLeft: 'auto' }}>
                  <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>
                    Tags (coming soon)
                  </Text>
                </Flex>
              </Flex>
            </Flex>
            <Dialog.Close>
              <Button variant="ghost" color="gray">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </Flex>

          {/* Messages or QA Pairs */}
          <ScrollArea style={{ flex: 1 }}>
            <Flex direction="column" gap="3" pr="4" style={{ paddingLeft: 0 }}>
              {isQAConversation ? (
                // Display QA pairs as a conversation thread - left-aligned, no padding
                qaPairs.map((pair, index) => (
                  <Flex key={pair.id} direction="column" gap="2">
                    {/* Question */}
                    <Card
                      style={{
                        background: 'var(--accent-3)',
                        borderLeft: '3px solid var(--accent-9)',
                        padding: '0.75rem',
                      }}
                    >
                      <Flex direction="column" gap="2">
                        <Flex align="center" gap="2">
                          <User size={16} />
                          <Text size="2" weight="bold" style={{ color: 'var(--accent-11)' }}>
                            Question {index + 1}
                          </Text>
                          <Text size="1" color="gray">
                            {pair.createdAt.toLocaleTimeString()}
                          </Text>
                        </Flex>
                        <Text size="2" style={{ whiteSpace: 'pre-wrap' }}>
                          {pair.question}
                        </Text>
                      </Flex>
                    </Card>

                    {/* Answer */}
                    <Card
                      style={{
                        background: 'var(--gray-3)',
                        borderLeft: '3px solid var(--gray-9)',
                        marginLeft: '1rem',
                        padding: '0.75rem',
                      }}
                    >
                      <Flex direction="column" gap="2">
                        <Flex align="center" gap="2">
                          <Bot size={16} />
                          <Text size="2" weight="bold">
                            Answer {index + 1}
                          </Text>
                        </Flex>
                        <Text size="2" style={{ whiteSpace: 'pre-wrap' }}>
                          {pair.answer}
                        </Text>
                      </Flex>
                    </Card>
                  </Flex>
                ))
              ) : (
                // Display regular messages
                messages.map((message) => (
                <Card
                  key={message.id}
                  style={{
                    background:
                      message.role === 'user'
                        ? 'var(--accent-3)'
                        : 'var(--gray-3)',
                    borderLeft:
                      message.role === 'user'
                        ? '3px solid var(--accent-9)'
                        : '3px solid var(--gray-9)',
                  }}
                >
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      {message.role === 'user' ? (
                        <User size={16} />
                      ) : (
                        <Bot size={16} />
                      )}
                      <Text size="2" weight="bold">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </Text>
                      <Text size="1" color="gray">
                        {message.timestamp.toLocaleTimeString()}
                      </Text>
                    </Flex>
                    <Text size="2" style={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Text>
                  </Flex>
                </Card>
              ))
              )}
            </Flex>
          </ScrollArea>

          {/* Footer Actions */}
          {isQAConversation && (
            <Flex gap="2" justify="between" pt="3" style={{ borderTop: '1px solid var(--gray-6)' }}>
              <AlertDialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialog.Trigger>
                  <Button variant="ghost" color="red" disabled={deleting}>
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Title>Delete Conversation</AlertDialog.Title>
                  <AlertDialog.Description>
                    Are you sure you want to delete this conversation? This will permanently delete all {qaPairs.length} interaction{qaPairs.length !== 1 ? 's' : ''} in this conversation. This action cannot be undone.
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft">Cancel</Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button variant="solid" color="red" onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Delete'}
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
