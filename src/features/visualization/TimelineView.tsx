import { Card, Flex, Text, Badge } from '@radix-ui/themes'
import { TimelineEntry } from '@/features/visualization/visualizationService'
import { MessageSquare } from 'lucide-react'

interface TimelineViewProps {
  entries: TimelineEntry[]
}

export default function TimelineView({ entries }: TimelineViewProps) {
  const groupedByMonth = entries.reduce((acc, entry) => {
    const month = entry.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!acc[month]) acc[month] = []
    acc[month].push(entry)
    return acc
  }, {} as Record<string, TimelineEntry[]>)

  return (
    <Flex direction="column" gap="4">
      {Object.entries(groupedByMonth).map(([month, monthEntries]) => (
        <div key={month}>
          <Text size="3" weight="bold" mb="2" style={{ color: 'var(--accent-11)' }}>
            {month}
          </Text>
          <Flex direction="column" gap="2" style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--gray-6)' }}>
            {monthEntries.map((entry) => (
              <Card key={entry.id} variant="surface" style={{ marginLeft: '1rem' }}>
                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2" justify="between">
                    <Flex align="center" gap="2">
                      <MessageSquare size={16} />
                      <Text weight="bold" size="2">
                        {entry.title}
                      </Text>
                    </Flex>
                    <Badge color="blue">
                      {entry.metadata.source as string}
                    </Badge>
                  </Flex>

                  <Flex gap="2" align="center">
                    <Text size="1" color="gray">
                      {entry.date.toLocaleDateString()} · {String(entry.metadata.messageCount)} messages
                    </Text>
                  </Flex>

                  {Array.isArray(entry.metadata.tags) && entry.metadata.tags.length > 0 && (
                    <Flex gap="1" wrap="wrap">
                      {entry.metadata.tags.map((tag) => (
                        <Badge key={String(tag)} variant="soft" size="1">
                          {String(tag)}
                        </Badge>
                      ))}
                    </Flex>
                  )}
                </Flex>
              </Card>
            ))}
          </Flex>
        </div>
      ))}
    </Flex>
  )
}
