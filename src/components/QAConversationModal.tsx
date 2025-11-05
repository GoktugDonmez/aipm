import { useState } from 'react'
import { Dialog, Flex, Text, Badge, ScrollArea, Card, Button, AlertDialog } from '@radix-ui/themes'
import { MessageSquare, User, Bot, X, Trash2 } from 'lucide-react'
import { QAPair } from '@/types'
import { useQAPairsBySession } from '@/lib/hooks'
import { deleteConversation } from '@/features/qa/qaService'

interface QAConversationModalProps {
  conversationId: string
  conversationTitle: string
  open: boolean
  onClose: () => void
  onDelete?: () => void
}

export default function QAConversationModal({
  conversationId,
  conversationTitle,
  open,
  onClose,
  onDelete,
}: QAConversationModalProps) {
  const { qaPairs } = useQAPairsBySession(conversationId)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteConversation(conversationId)
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
              <Dialog.Title size="6">{conversationTitle}</Dialog.Title>
              <Flex gap="2" wrap="wrap">
                <Badge color="blue">{qaPairs[0]?.source || 'manual'}</Badge>
                <Badge variant="soft">{qaPairs.length} QA pairs</Badge>
                <Badge variant="outline">
                  {qaPairs[0]?.createdAt.toLocaleDateString()}
                </Badge>
              </Flex>
            </Flex>
            <Dialog.Close>
              <Button variant="ghost" color="gray">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </Flex>

          {/* QA Pairs Thread */}
          <ScrollArea style={{ flex: 1 }}>
            <Flex direction="column" gap="3" pr="4">
              {qaPairs.map((pair, index) => (
                <Flex key={pair.id} direction="column" gap="2">
                  {/* Question */}
                  <Card
                    style={{
                      background: 'var(--accent-3)',
                      borderLeft: '3px solid var(--accent-9)',
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
              ))}
            </Flex>
          </ScrollArea>

          {/* Footer Actions */}
          <Flex gap="2" justify="between" pt="2" style={{ borderTop: '1px solid var(--gray-6)' }}>
            <AlertDialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialog.Trigger>
                <Button variant="soft" color="red" disabled={deleting}>
                  <Trash2 size={16} />
                  Delete Conversation
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>Delete Conversation</AlertDialog.Title>
                <AlertDialog.Description>
                  Are you sure you want to delete this conversation? This will permanently delete all {qaPairs.length} QA pair{qaPairs.length !== 1 ? 's' : ''} in this conversation. This action cannot be undone.
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

            <Dialog.Close>
              <Button>Close</Button>
            </Dialog.Close>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

