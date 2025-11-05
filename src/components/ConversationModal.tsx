import { Dialog, Flex, Text, Badge, ScrollArea, Card, Button } from '@radix-ui/themes'
import { MessageSquare, User, Bot, X } from 'lucide-react'
import { ChatSession } from '@/types'
import { useMessages } from '@/lib/hooks'

interface ConversationModalProps {
  session: ChatSession
  open: boolean
  onClose: () => void
}

export default function ConversationModal({ session, open, onClose }: ConversationModalProps) {
  const { messages } = useMessages(session.id)

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '800px', maxHeight: '90vh' }}>
        <Flex direction="column" gap="3" style={{ height: '80vh' }}>
          {/* Header */}
          <Flex justify="between" align="start" gap="3">
            <Flex direction="column" gap="2" style={{ flex: 1 }}>
              <Dialog.Title size="6">{session.title}</Dialog.Title>
              <Flex gap="2" wrap="wrap">
                <Badge color="blue">{session.source}</Badge>
                <Badge variant="soft">{session.messageCount} interactions</Badge>
                <Badge variant="outline">
                  {session.updatedAt.toLocaleDateString()}
                </Badge>
              </Flex>
            </Flex>
            <Dialog.Close>
              <Button variant="ghost" color="gray">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </Flex>

          {/* Messages */}
          <ScrollArea style={{ flex: 1 }}>
            <Flex direction="column" gap="3" pr="4">
              {messages.map((message) => (
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
              ))}

              {/* Placeholder for AI Analysis */}
              <Card
                style={{
                  background: 'var(--violet-3)',
                  borderLeft: '3px solid var(--violet-9)',
                  marginTop: '1rem',
                }}
              >
                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2">
                    <MessageSquare size={16} />
                    <Text size="2" weight="bold">
                      AI Analysis (Coming Soon)
                    </Text>
                  </Flex>
                  <Text size="2" color="gray">
                    • Summary of conversation
                    <br />
                    • Key topics discussed
                    <br />
                    • Suggested related conversations
                    <br />
                    • Auto-generated tags
                    <br />
                    <br />
                    <em>This will be powered by API integration</em>
                  </Text>
                </Flex>
              </Card>
            </Flex>
          </ScrollArea>

        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
