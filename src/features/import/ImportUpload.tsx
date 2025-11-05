import { useState } from 'react'
import { Card, Button, Flex, Text, Progress } from '@radix-ui/themes'
import { Upload } from 'lucide-react'
import { ChatGPTImportAdapter, importFile } from './importService'

interface ImportUploadProps {
  onImportComplete?: () => void
}

export default function ImportUpload({ onImportComplete }: ImportUploadProps) {
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setProgress(0)
    setError(null)

    try {
      const adapter = new ChatGPTImportAdapter()
      await importFile(file, adapter, setProgress)
      
      onImportComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      setProgress(0)
    }
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

        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          disabled={importing}
          style={{ display: 'none' }}
          id="file-upload"
        />
        
        <label htmlFor="file-upload">
          <Button disabled={importing} style={{ cursor: 'pointer' }} asChild>
            <span>
              <Upload size={16} />
              {importing ? 'Importing...' : 'Choose File'}
            </span>
          </Button>
        </label>

        <Text size="1" color="gray">
          Tip: You can also load mock data for testing
        </Text>
      </Flex>
    </Card>
  )
}
