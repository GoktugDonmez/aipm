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
  platform?: string // 'chatgpt', 'gemini', 'claude'
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
      // Generate a stable session ID
      // Priority: 
      // 1. Explicit Session ID (e.g. from ChatGPT URL)
      // 2. Stable hash of the URL pathname (for Gemini/Claude where ID is in URL)
      // 3. Random UUID (fallback)
      
      let baseId = data.chatgptSessionId;
      
      if (!baseId && data.url) {
        try {
          const urlObj = new URL(data.url);
          // Use pathname as the stable identifier base
          // This ensures multiple saves from the same URL map to the same session
          // We strip the leading slash and replace non-alphanumeric chars
          const pathId = urlObj.pathname.replace(/[^a-zA-Z0-9]/g, '');
          if (pathId.length > 5) { // Ensure we have enough entropy/content
             baseId = pathId;
          }
        } catch (e) {
          console.warn('Failed to parse URL for session ID generation', e);
        }
      }

      const sessionId = baseId 
        ? `conv-extension-${baseId}`
        : `conv-extension-${crypto.randomUUID()}`
      
      // Determine source based on platform
      let source: 'extension' | 'chatgpt' | 'claude' | 'gemini' = 'extension';
      if (data.platform) {
        const p = data.platform.toLowerCase();
        if (p === 'chatgpt') source = 'chatgpt';
        else if (p === 'claude') source = 'claude';
        else if (p === 'gemini') source = 'gemini';
      }

      console.log('Importing extension data:', {
        chatgptSessionId: data.chatgptSessionId,
        generatedSessionId: sessionId,
        qaPairsCount: data.qaPairs.length,
        platform: data.platform,
        source
      })
      
      const qaPairsToSave: QAPair[] = data.qaPairs.map((pair) =>
        normalizeQAPair({
          question: pair.question,
          answer: pair.answer,
          source: source,
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

