import { useState } from 'react'
import { Card, Button, Flex, Text, Progress, Link } from '@radix-ui/themes'
import { Upload, Soup, Wrench, Puzzle, ExternalLink } from 'lucide-react'
import { ChatGPTImportAdapter, importFile, parseFileForQAPairs, ExtractedQAPair } from './importService'
import QASelectionModal from './QASelectionModal'
import cookingMocks from '@/mocks/chatgpt-cooking-conversations.json'
import carRepairMocks from '@/mocks/chatgpt-car-repair-conversations.json'

interface ImportUploadProps {
  onImportComplete?: () => void
}

export default function ImportUpload({ onImportComplete }: ImportUploadProps) {
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showQASelection, setShowQASelection] = useState(false)
  const [extractedQAPairs, setExtractedQAPairs] = useState<ExtractedQAPair[]>([])
  const [pendingMockFilename, setPendingMockFilename] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Allow selecting the same file twice in a row
    e.target.value = ''

    setImporting(true)
    setProgress(0)
    setError(null)

    try {
      const adapter = new ChatGPTImportAdapter()

      // First, parse the file to extract QA pairs
      setProgress(20)
      const qaPairs = await parseFileForQAPairs(file, adapter)

      if (qaPairs.length > 0) {
        // Show QA selection modal
        setExtractedQAPairs(qaPairs)
        setShowQASelection(true)
        setImporting(false)
        setProgress(0)
      } else {
        // No QA pairs found, proceed with regular import
        await importFile(file, adapter, (p) => setProgress(20 + (p * 0.8)))
        onImportComplete?.()
        setImporting(false)
        setProgress(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setImporting(false)
      setProgress(0)
    }
  }

  const importFromDataset = async (conversations: any[], mockFilename: string) => {
    setImporting(true)
    setError(null)
    setProgress(0)
    setPendingMockFilename(mockFilename)

    try {
      const adapter = new ChatGPTImportAdapter()
      const file = new File([JSON.stringify(conversations)], mockFilename, {
        type: 'application/json',
      })

      const qaPairs = await parseFileForQAPairs(file, adapter)

      if (qaPairs.length === 0) {
        setError('No question/answer pairs found in mock dataset')
        setShowQASelection(false)
        return
      }

      setExtractedQAPairs(qaPairs)
      setShowQASelection(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
      setProgress(0)
      setPendingMockFilename(null)
    }
  }

  const handleLoadCookingMocks = () => {
    if (importing) return
    void importFromDataset(cookingMocks, 'mock-cooking.json')
  }

  const handleLoadCarMocks = () => {
    if (importing) return
    void importFromDataset(carRepairMocks, 'mock-car-repair.json')
  }

  const handleQAImportComplete = () => {
    setShowQASelection(false)
    setExtractedQAPairs([])
    setImporting(false)
    setProgress(0)
    setPendingMockFilename(null)
    onImportComplete?.()
  }

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <Upload size={24} />
          <Text size="5" weight="bold">
            Import Conversations
          </Text>
        </Flex>

        <Text color="gray">
          Import your ChatGPT conversations to build your knowledge base.
          Export your chats from ChatGPT and upload the JSON file.
        </Text>

        {error && (
          <Text color="red" size="2">
            {error}
          </Text>
        )}

        {importing && (
          <Flex direction="column" gap="2">
            <Progress value={progress} />
            <Text size="2" color="gray">
              Importing... {progress}%
            </Text>
          </Flex>
        )}

        <Card variant="surface" style={{ padding: '16px' }}>
          <Flex gap="3" align="center">
            <Flex
              align="center"
              justify="center"
              style={{
                minWidth: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-9)',
                color: 'white'
              }}
            >
              <Puzzle size={24} />
            </Flex>
            <Flex direction="column" gap="1">
              <Text weight="bold" size="2">Get the Memoria Chrome Extension</Text>
              <Text size="2" color="gray">
                Import chats directly from ChatGPT or Gemini on browser. Download the zip file, extract it, and load it as an "Unpacked Extension" in Chrome.
              </Text>
              <Link href="/memoria-extension.zip" download="memoria-extension.zip">
                <Button size="1" variant="ghost" style={{ padding: 0, justifyContent: 'flex-start', marginTop: '4px' }}>
                  Download Extension <ExternalLink size={12} style={{ marginLeft: '2px' }} />
                </Button>
              </Link>
            </Flex>
          </Flex>
        </Card>

        <label htmlFor="file-upload">
          <Button disabled={importing} style={{ cursor: 'pointer', width: '100%' }} size="3" variant="surface">
            <Upload size={18} />
            {importing ? 'Importing JSON...' : 'Upload ChatGPT JSON Export'}
          </Button>
        </label>

        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          disabled={importing}
          style={{ display: 'none' }}
          id="file-upload"
        />

        <Flex gap="2" direction="column">
          <Text size="2" weight="medium">No data? Try sample conversations:</Text>
          <Flex gap="2" wrap="wrap">
            <Button
              variant="outline"
              size="2"
              onClick={handleLoadCookingMocks}
              disabled={importing}
            >
              <Soup size={16} />
              Try "Cooking Questions"
            </Button>
            <Button
              variant="outline"
              size="2"
              onClick={handleLoadCarMocks}
              disabled={importing}
            >
              <Wrench size={16} />
              Try "Car Repair"
            </Button>
          </Flex>
        </Flex>

        {pendingMockFilename && (
          <Text size="1" color="gray">
            Loading {pendingMockFilename}...
          </Text>
        )}
      </Flex>

      {/* QA Selection Modal */}
      {showQASelection && (
        <QASelectionModal
          open={showQASelection}
          onClose={() => {
            setShowQASelection(false)
            setExtractedQAPairs([])
          }}
          qaPairs={extractedQAPairs}
          onImportComplete={handleQAImportComplete}
        />
      )}
    </Card>
  )
}
