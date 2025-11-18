import { useEffect, useRef, useCallback } from 'react'
import { normalizeQAPair, saveQAPairs } from '@/features/qa/qaService'
import { QAPair } from '@/types'

interface ExtensionData {
  qaPairs: Array<{
    question: string
    answer: string
    questionId: string
    answerId: string
    conversationIndex?: number | null // Order in conversation
  }>
  title: string
  url: string
  chatgptSessionId?: string | null // ChatGPT conversation ID from URL
  timestamp: number
}

export default function ExtensionDataReceiver({ onImportComplete }: { onImportComplete?: () => void }) {
  const processedTimestamps = useRef<Set<number>>(new Set())
  const importingRef = useRef(false)

  // Automatically import extension data when detected
  const importExtensionData = useCallback(async (data: ExtensionData) => {
    // Skip if already processing this data
    if (processedTimestamps.current.has(data.timestamp) || importingRef.current) {
      return
    }

    importingRef.current = true
    processedTimestamps.current.add(data.timestamp)

    try {
      // Generate a session ID based on ChatGPT session ID if available
      // This ensures all interactions from the same ChatGPT conversation are grouped together
      const sessionId = data.chatgptSessionId 
        ? `conv-extension-${data.chatgptSessionId}`
        : `conv-extension-${crypto.randomUUID()}`
      
      console.log('Importing extension data:', {
        chatgptSessionId: data.chatgptSessionId,
        generatedSessionId: sessionId,
        qaPairsCount: data.qaPairs.length
      })
      
      const qaPairsToSave: QAPair[] = data.qaPairs.map((pair) =>
        normalizeQAPair({
          question: pair.question,
          answer: pair.answer,
          source: 'extension',
          sessionId: sessionId,
          originalMessageIds: {
            questionId: pair.questionId,
            answerId: pair.answerId,
          },
          conversationIndex: pair.conversationIndex,
        })
      )

      await saveQAPairs(qaPairsToSave)
      
      console.log(`Saved ${qaPairsToSave.length} interaction(s) to session: ${sessionId}`)
      
      // Clear the extension data from localStorage
      localStorage.removeItem('memoriaExtensionData')
      
      console.log(`Automatically imported ${qaPairsToSave.length} interaction(s) from extension`)
      onImportComplete?.()
    } catch (error) {
      console.error('Failed to import extension data:', error)
      // Remove from processed set so it can be retried
      processedTimestamps.current.delete(data.timestamp)
    } finally {
      importingRef.current = false
    }
  }, [onImportComplete])

  // Poll for extension data in localStorage (bridge script writes here)
  useEffect(() => {
    const checkForExtensionData = () => {
      try {
        const dataStr = localStorage.getItem('memoriaExtensionData')
        if (dataStr) {
          const data = JSON.parse(dataStr) as ExtensionData
          
          // Validate data structure
          if (data && data.qaPairs && Array.isArray(data.qaPairs) && data.qaPairs.length > 0) {
            // Import automatically
            importExtensionData(data)
          }
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
  }, [importExtensionData])

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
          if (data.qaPairs && Array.isArray(data.qaPairs) && data.qaPairs.length > 0) {
            importExtensionData(data)
            e.preventDefault()
          }
        }
      } catch (error) {
        // Not extension data, ignore
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [importExtensionData])

  // This component doesn't render anything - it works silently in the background
  return null
}

