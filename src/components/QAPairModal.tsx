import { Dialog, Flex, Text, Badge, ScrollArea, Card, Button } from '@radix-ui/themes'
import { HelpCircle, User, Bot, X } from 'lucide-react'
import { QAPair } from '@/types'

interface QAPairModalProps {
  qaPair: QAPair
  open: boolean
  onClose: () => void
}

export default function QAPairModal({ qaPair, open, onClose }: QAPairModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '800px', maxHeight: '90vh' }}>
        <Flex direction="column" gap="3" style={{ height: '80vh' }}>
          {/* Header */}
          <Flex justify="between" align="start" gap="3">
            <Flex direction="column" gap="2" style={{ flex: 1 }}>
              <Dialog.Title size="6">QA Pair</Dialog.Title>
              <Flex gap="2" wrap="wrap">
                <Badge color="blue">{qaPair.source}</Badge>
                <Badge variant="soft">
                  {qaPair.createdAt.toLocaleDateString()}
                </Badge>
                {qaPair.tags.length > 0 && (
                  <Flex gap="1">
                    {qaPair.tags.map((tag) => (
                      <Badge key={tag} variant="outline" size="1">
                        {tag}
                      </Badge>
                    ))}
                  </Flex>
                )}
              </Flex>
            </Flex>
            <Dialog.Close>
              <Button variant="ghost" color="gray">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </Flex>

          {/* Question and Answer */}
          <ScrollArea style={{ flex: 1 }}>
            <Flex direction="column" gap="3" pr="4">
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
                    <Text size="2" weight="bold">
                      Question
                    </Text>
                  </Flex>
                  <Text size="2" style={{ whiteSpace: 'pre-wrap' }}>
                    {qaPair.question}
                  </Text>
                </Flex>
              </Card>

              {/* Answer */}
              <Card
                style={{
                  background: 'var(--gray-3)',
                  borderLeft: '3px solid var(--gray-9)',
                }}
              >
                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2">
                    <Bot size={16} />
                    <Text size="2" weight="bold">
                      Answer
                    </Text>
                  </Flex>
                  <Text size="2" style={{ whiteSpace: 'pre-wrap' }}>
                    {qaPair.answer}
                  </Text>
                </Flex>
              </Card>
            </Flex>
          </ScrollArea>

          {/* Footer Actions */}
          <Flex gap="2" justify="end" pt="2" style={{ borderTop: '1px solid var(--gray-6)' }}>
            <Dialog.Close>
              <Button>Close</Button>
            </Dialog.Close>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

