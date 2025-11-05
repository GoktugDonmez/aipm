import { useState, useEffect } from 'react'
import { Dialog, Flex, Text, Button, Card, Checkbox, ScrollArea, Badge } from '@radix-ui/themes'
import { MessageSquare, X } from 'lucide-react'
import { ExtractedQAPair } from './importService'
import { normalizeQAPair, saveQAPairs } from '@/features/qa/qaService'
import { QAPair } from '@/types'

interface QASelectionModalProps {
  open: boolean
  onClose: () => void
  qaPairs: ExtractedQAPair[]
  onImportComplete?: () => void
}

export default function QASelectionModal({
  open,
  onClose,
  qaPairs,
  onImportComplete,
}: QASelectionModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set())

  // Select all by default
  useEffect(() => {
    if (qaPairs.length > 0 && selectedIndices.size === 0) {
      setSelectedIndices(new Set(qaPairs.map((_, i) => i)))
    }
  }, [qaPairs])

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices)
    if (newSelection.has(index)) {
      newSelection.delete(index)
    } else {
      newSelection.add(index)
    }
    setSelectedIndices(newSelection)
  }

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedIndices)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedIndices(newExpanded)
  }

  const selectAll = () => {
    setSelectedIndices(new Set(qaPairs.map((_, i) => i)))
  }

  const deselectAll = () => {
    setSelectedIndices(new Set())
  }

  const handleImport = async () => {
    if (selectedIndices.size === 0) return

    setImporting(true)
    try {
      const qaPairsToSave: QAPair[] = Array.from(selectedIndices).map((index) => {
        const pair = qaPairs[index]
        return normalizeQAPair({
          question: pair.question,
          answer: pair.answer,
          source: 'import',
          sessionId: pair.sessionId,
          originalMessageIds: {
            questionId: pair.questionId,
            answerId: pair.answerId,
          },
        })
      })

      await saveQAPairs(qaPairsToSave)
      onImportComplete?.()
      onClose()
    } catch (error) {
      console.error('Failed to import QA pairs:', error)
      alert('Failed to import QA pairs. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  // Group by session
  const groupedPairs = qaPairs.reduce((acc, pair, index) => {
    if (!acc[pair.sessionId]) {
      acc[pair.sessionId] = {
        title: pair.sessionTitle,
        pairs: [],
      }
    }
    acc[pair.sessionId].pairs.push({ ...pair, index })
    return acc
  }, {} as Record<string, { title: string; pairs: Array<ExtractedQAPair & { index: number }> }>)

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '900px', maxHeight: '90vh' }}>
        <Flex direction="column" gap="4" style={{ height: '85vh' }}>
          {/* Header */}
          <Flex justify="between" align="start" gap="3">
            <Flex direction="column" gap="2" style={{ flex: 1 }}>
              <Dialog.Title size="6">
                Select QA Pairs to Import
              </Dialog.Title>
              <Text size="2" color="gray">
                Found {qaPairs.length} question-answer pairs. Select which ones to add to your knowledge base.
              </Text>
            </Flex>
            <Dialog.Close>
              <Button variant="ghost" color="gray">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </Flex>

          {/* Selection Controls */}
          <Flex gap="2" align="center" justify="between">
            <Flex gap="2">
              <Button variant="soft" size="2" onClick={selectAll}>
                Select All ({qaPairs.length})
              </Button>
              <Button variant="soft" size="2" onClick={deselectAll}>
                Deselect All
              </Button>
            </Flex>
            <Text size="2" color="gray">
              {selectedIndices.size} of {qaPairs.length} selected
            </Text>
          </Flex>

          {/* QA Pairs List */}
          <ScrollArea style={{ flex: 1 }}>
            <Flex direction="column" gap="3" pr="4">
              {Object.entries(groupedPairs).map(([sessionId, group]) => (
                <Card key={sessionId} variant="surface">
                  <Flex direction="column" gap="3">
                    <Flex align="center" gap="2">
                      <MessageSquare size={16} />
                      <Text weight="bold" size="3">
                        {group.title}
                      </Text>
                      <Badge variant="soft" size="1">
                        {group.pairs.length} pairs
                      </Badge>
                    </Flex>

                    <Flex direction="column" gap="2">
                      {group.pairs.map(({ index, question, answer }) => {
                        const isSelected = selectedIndices.has(index)
                        const isExpanded = expandedIndices.has(index)

                        return (
                          <Card
                            key={index}
                            style={{
                              background: isSelected ? 'var(--accent-2)' : 'var(--gray-2)',
                              border: `2px solid ${isSelected ? 'var(--accent-6)' : 'var(--gray-6)'}`,
                              cursor: 'pointer',
                            }}
                            onClick={() => toggleSelection(index)}
                          >
                            <Flex direction="column" gap="2">
                              <Flex align="start" gap="3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelection(index)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Flex direction="column" gap="2" style={{ flex: 1 }}>
                                  <Text
                                    size="2"
                                    weight="bold"
                                    style={{
                                      color: 'var(--accent-11)',
                                      display: '-webkit-box',
                                      WebkitLineClamp: isExpanded ? undefined : 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    Q: {question}
                                  </Text>
                                  <Text
                                    size="2"
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: isExpanded ? undefined : 3,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    A: {answer}
                                  </Text>
                                </Flex>
                                <Button
                                  variant="ghost"
                                  size="1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpand(index)
                                  }}
                                >
                                  {isExpanded ? 'Collapse' : 'Expand'}
                                </Button>
                              </Flex>
                            </Flex>
                          </Card>
                        )
                      })}
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </ScrollArea>

          {/* Footer */}
          <Flex gap="2" justify="end" pt="2" style={{ borderTop: '1px solid var(--gray-6)' }}>
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleImport} disabled={selectedIndices.size === 0 || importing}>
              {importing ? 'Importing...' : `Import ${selectedIndices.size} QA Pair${selectedIndices.size !== 1 ? 's' : ''}`}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}

