import { useState, useEffect } from 'react'
import { Card, Button, Flex, Text, Badge } from '@radix-ui/themes'
import { Download } from 'lucide-react'
import { normalizeQAPair, saveQAPairs } from '@/features/qa/qaService'
import { QAPair } from '@/types'

interface ExtensionData {
  qaPairs: Array<{
    question: string
    answer: string
    questionId: string
    answerId: string
  }>
  title: string
  url: string
  timestamp: number
}

export default function ExtensionDataReceiver({ onImportComplete }: { onImportComplete?: () => void }) {
  const [extensionData, setExtensionData] = useState<ExtensionData | null>(null)
  const [importing, setImporting] = useState(false)

  // Poll for extension data in localStorage (extension writes here)
  useEffect(() => {
    const checkForExtensionData = () => {
      try {
        const data = localStorage.getItem('memoriaExtensionData')
        if (data) {
          const parsed = JSON.parse(data)
          setExtensionData(parsed)
        }
      } catch (error) {
        console.error('Error reading extension data:', error)
      }
    }

    // Check immediately
    checkForExtensionData()

    // Poll every 2 seconds
    const interval = setInterval(checkForExtensionData, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleImport = async () => {
    if (!extensionData) return

    setImporting(true)
    try {
      // Generate a session ID for this extension import
      const sessionId = `conv-extension-${crypto.randomUUID()}`
      
      const qaPairsToSave: QAPair[] = extensionData.qaPairs.map((pair) =>
        normalizeQAPair({
          question: pair.question,
          answer: pair.answer,
          source: 'extension',
          sessionId: sessionId,
          originalMessageIds: {
            questionId: pair.questionId,
            answerId: pair.answerId,
          },
        })
      )

      await saveQAPairs(qaPairsToSave)
      
      // Clear the extension data
      localStorage.removeItem('memoriaExtensionData')
      setExtensionData(null)
      onImportComplete?.()
    } catch (error) {
      console.error('Failed to import extension data:', error)
      alert('Failed to import interactions from extension. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const handleDismiss = () => {
    localStorage.removeItem('memoriaExtensionData')
    setExtensionData(null)
  }

  // Also listen for paste events (extension can copy JSON to clipboard)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle if user is focused on a text input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      try {
        const text = e.clipboardData?.getData('text')
        if (text && text.startsWith('{') && text.includes('qaPairs')) {
          const data = JSON.parse(text) as ExtensionData
          if (data.qaPairs && Array.isArray(data.qaPairs)) {
            setExtensionData(data)
            e.preventDefault()
          }
        }
      } catch (error) {
        // Not extension data, ignore
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  if (!extensionData) {
    return null
  }

  return (
    <Card style={{ background: 'var(--violet-2)', borderColor: 'var(--violet-6)' }}>
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2" justify="between">
          <Flex align="center" gap="2">
            <Download size={20} />
            <Text size="4" weight="bold">
              Extension Data Received
            </Text>
            <Badge color="violet" size="2">
              {extensionData.qaPairs.length} interactions
            </Badge>
          </Flex>
        </Flex>

        <Text size="2" color="gray">
          Conversation: {extensionData.title}
        </Text>

        <Flex gap="2">
          <Button onClick={handleImport} disabled={importing}>
            <Download size={16} />
            {importing ? 'Importing...' : 'Import Interactions'}
          </Button>
          <Button variant="soft" onClick={handleDismiss}>
            Dismiss
          </Button>
        </Flex>
      </Flex>
    </Card>
  )
}

