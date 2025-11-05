import { useState } from 'react'
import { Heading, Text, Card, Flex, Button, AlertDialog, Callout } from '@radix-ui/themes'
import { Database, Trash2 } from 'lucide-react'
import { db } from '@/lib/db'

export default function Settings() {
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearSuccess, setClearSuccess] = useState(false)

  const handleClearAllData = async () => {
    setClearing(true)
    try {
      await db.clearAll()
      setClearSuccess(true)
      setShowClearDialog(false)
      // Reload page after a short delay to refresh the UI
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Failed to clear database:', error)
      alert('Failed to clear database. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div>
      <Heading size="8" mb="2">
        Settings
      </Heading>
      <Text size="3" color="gray" mb="6">
        Configure your Memoria experience
      </Text>

      <Flex gap="4" direction="column">
        {/* Data Management */}
        <Card>
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Database size={24} />
              <Heading size="5">Data Management</Heading>
            </Flex>

            <Text size="2" color="gray">
              Manage your stored data and conversations.
            </Text>

            {clearSuccess && (
              <Callout.Root color="green" size="1">
                <Callout.Text>
                  All data has been cleared successfully. The page will reload in a moment.
                </Callout.Text>
              </Callout.Root>
            )}

            <AlertDialog.Root open={showClearDialog} onOpenChange={setShowClearDialog}>
              <AlertDialog.Trigger>
                <Button variant="soft" color="red">
                  <Trash2 size={16} />
                  Clear All Data
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>Clear All Data</AlertDialog.Title>
                <AlertDialog.Description>
                  <Flex direction="column" gap="2" mt="2">
                    <Text>
                      Are you sure you want to delete all data? This will permanently remove:
                    </Text>
                    <Text as="ul" style={{ marginLeft: '1.5rem' }}>
                      <li>All conversations</li>
                      <li>All interactions</li>
                      <li>All tags</li>
                      <li>All embeddings</li>
                    </Text>
                    <Text weight="bold" color="red">
                      This action cannot be undone!
                    </Text>
                  </Flex>
                </AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="soft">Cancel</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={handleClearAllData} disabled={clearing}>
                      {clearing ? 'Clearing...' : 'Clear All Data'}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>
        </Card>
      </Flex>
    </div>
  )
}
