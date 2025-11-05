import { useState } from 'react'
import { Dialog, Flex, Text, Button, TextArea, Card, ScrollArea, Badge } from '@radix-ui/themes'
import { MessageSquare, X, Plus, Trash2, Save, HelpCircle } from 'lucide-react'
import { normalizeQAPair, saveQAPairs } from '@/features/qa/qaService'
import { QAPair } from '@/types'

interface ManualQAInputProps {
  open: boolean
  onClose: () => void
  onSave?: () => void
  defaultSessionId?: string
}

interface QAPairInput {
  question: string
  answer: string
  id: string
}

export default function ManualQAInput({
  open,
  onClose,
  onSave,
  defaultSessionId,
}: ManualQAInputProps) {
  const [qaPairs, setQAPairs] = useState<QAPairInput[]>([
    { id: crypto.randomUUID(), question: '', answer: '' }
  ])
  const [saving, setSaving] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const addNewQAPair = () => {
    setQAPairs([...qaPairs, { id: crypto.randomUUID(), question: '', answer: '' }])
    setCurrentIndex(qaPairs.length)
  }

  const removeQAPair = (index: number) => {
    if (qaPairs.length === 1) {
      // Keep at least one pair
      setQAPairs([{ id: crypto.randomUUID(), question: '', answer: '' }])
      setCurrentIndex(0)
    } else {
      const newPairs = qaPairs.filter((_, i) => i !== index)
      setQAPairs(newPairs)
      if (currentIndex >= newPairs.length) {
        setCurrentIndex(newPairs.length - 1)
      }
    }
  }

  const updateQAPair = (index: number, field: 'question' | 'answer', value: string) => {
    const newPairs = [...qaPairs]
    newPairs[index] = { ...newPairs[index], [field]: value }
    setQAPairs(newPairs)
  }

  const handleSave = async () => {
    // Filter out empty pairs
    const validPairs = qaPairs.filter(pair => pair.question.trim() && pair.answer.trim())
    
    if (validPairs.length === 0) {
      alert('Please add at least one question and answer pair.')
      return
    }

    setSaving(true)
    try {
      // Generate a conversation ID for all pairs saved together
      const conversationId = defaultSessionId || `conv-manual-${crypto.randomUUID()}`
      
      // Create pairs with incremental timestamps to maintain order (oldest first)
      const baseTime = Date.now()
      const qaPairsToSave: QAPair[] = validPairs.map((pair, index) => {
        const qaPair = normalizeQAPair({
          question: pair.question.trim(),
          answer: pair.answer.trim(),
          source: 'manual',
          sessionId: conversationId,
        })
        // Set incremental timestamps to maintain creation order
        qaPair.createdAt = new Date(baseTime + index)
        qaPair.updatedAt = new Date(baseTime + index)
        return qaPair
      })

      await saveQAPairs(qaPairsToSave)
      // Small delay to ensure database write is committed
      await new Promise(resolve => setTimeout(resolve, 100))
      setQAPairs([{ id: crypto.randomUUID(), question: '', answer: '' }])
      setCurrentIndex(0)
      onSave?.()
      onClose()
    } catch (error) {
      console.error('Failed to save QA pairs:', error)
      alert('Failed to save QA pairs. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setQAPairs([{ id: crypto.randomUUID(), question: '', answer: '' }])
    setCurrentIndex(0)
    onClose()
  }

  const validPairsCount = qaPairs.filter(p => p.question.trim() && p.answer.trim()).length

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content style={{ maxWidth: '900px', maxHeight: '90vh' }}>
        <Flex direction="column" gap="4" style={{ height: '85vh' }}>
          {/* Header */}
          <Flex justify="between" align="start" gap="3">
            <Flex direction="column" gap="2" style={{ flex: 1 }}>
              <Dialog.Title size="6">
                Add QA Pairs Manually
              </Dialog.Title>
              <Text size="2" color="gray">
                Build a conversation by adding multiple question-answer pairs. Each question should be followed by its answer.
              </Text>
            </Flex>
            <Dialog.Close>
              <Button variant="ghost" color="gray">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </Flex>

          {/* Stats */}
          <Flex gap="2" align="center">
            <Badge variant="soft">
              {qaPairs.length} pair{qaPairs.length !== 1 ? 's' : ''}
            </Badge>
            {validPairsCount > 0 && (
              <Badge color="green" variant="soft">
                {validPairsCount} ready to save
              </Badge>
            )}
          </Flex>

          {/* Main Content */}
          <Flex gap="4" style={{ flex: 1, minHeight: 0 }}>
            {/* Sidebar - List of pairs */}
            <Card style={{ width: '250px', flexShrink: 0 }}>
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                  Conversation Flow
                </Text>
                <ScrollArea style={{ maxHeight: '500px' }}>
                  <Flex direction="column" gap="1">
                    {qaPairs.map((pair, index) => {
                      const isValid = pair.question.trim() && pair.answer.trim()
                      const isCurrent = index === currentIndex
                      
                      return (
                        <Card
                          key={pair.id}
                          variant="surface"
                          style={{
                            cursor: 'pointer',
                            background: isCurrent ? 'var(--accent-3)' : undefined,
                            border: isCurrent ? '2px solid var(--accent-6)' : undefined,
                          }}
                          onClick={() => setCurrentIndex(index)}
                        >
                          <Flex align="center" gap="2" justify="between">
                            <Flex align="center" gap="2" style={{ flex: 1, minWidth: 0 }}>
                              <HelpCircle size={14} color={isValid ? 'var(--green-9)' : 'var(--gray-9)'} />
                              <Text size="1" style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {pair.question.trim() || `Q${index + 1}`}
                              </Text>
                            </Flex>
                            {qaPairs.length > 1 && (
                              <Button
                                variant="ghost"
                                size="1"
                                color="red"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeQAPair(index)
                                }}
                              >
                                <Trash2 size={12} />
                              </Button>
                            )}
                          </Flex>
                        </Card>
                      )
                    })}
                  </Flex>
                </ScrollArea>
                <Button variant="soft" size="2" onClick={addNewQAPair} style={{ width: '100%' }}>
                  <Plus size={14} />
                  Add QA Pair
                </Button>
              </Flex>
            </Card>

            {/* Main Form */}
            <ScrollArea style={{ flex: 1 }}>
              <Flex direction="column" gap="3" pr="4">
                {qaPairs.map((pair, index) => {
                  if (index !== currentIndex) return null
                  
                  return (
                    <Flex key={pair.id} direction="column" gap="3">
                      <Flex align="center" gap="2">
                        <Badge variant="soft">
                          Pair {index + 1} of {qaPairs.length}
                        </Badge>
                      </Flex>

                      {/* Question */}
                      <Card>
                        <Flex direction="column" gap="2">
                          <Flex align="center" gap="2">
                            <MessageSquare size={16} color="var(--accent-11)" />
                            <Text size="2" weight="bold" style={{ color: 'var(--accent-11)' }}>
                              Question {index + 1}
                            </Text>
                          </Flex>
                          <TextArea
                            placeholder="Enter your question..."
                            value={pair.question}
                            onChange={(e) => updateQAPair(index, 'question', e.target.value)}
                            rows={4}
                            style={{ resize: 'vertical' }}
                            autoFocus
                          />
                        </Flex>
                      </Card>

                      {/* Answer */}
                      <Card>
                        <Flex direction="column" gap="2">
                          <Flex align="center" gap="2">
                            <MessageSquare size={16} color="var(--gray-11)" />
                            <Text size="2" weight="bold">
                              Answer {index + 1}
                            </Text>
                          </Flex>
                          <TextArea
                            placeholder="Enter the answer..."
                            value={pair.answer}
                            onChange={(e) => updateQAPair(index, 'answer', e.target.value)}
                            rows={6}
                            style={{ resize: 'vertical' }}
                          />
                        </Flex>
                      </Card>

                      {/* Navigation */}
                      <Flex gap="2" justify="between">
                        <Button
                          variant="soft"
                          disabled={index === 0}
                          onClick={() => setCurrentIndex(index - 1)}
                        >
                          ← Previous
                        </Button>
                        <Button
                          variant="soft"
                          disabled={index === qaPairs.length - 1}
                          onClick={() => setCurrentIndex(index + 1)}
                        >
                          Next →
                        </Button>
                      </Flex>
                    </Flex>
                  )
                })}
              </Flex>
            </ScrollArea>
          </Flex>

          {/* Footer */}
          <Flex gap="2" justify="end" pt="2" style={{ borderTop: '1px solid var(--gray-6)' }}>
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button
              onClick={handleSave}
              disabled={validPairsCount === 0 || saving}
            >
              <Save size={16} />
              {saving ? 'Saving...' : `Save ${validPairsCount} QA Pair${validPairsCount !== 1 ? 's' : ''}`}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
