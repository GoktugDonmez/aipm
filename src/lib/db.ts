import Dexie, { Table } from 'dexie'
import { ChatSession, Message, Tag, EmbeddingMeta, QAPair } from '@/types'

export class MemoriaDB extends Dexie {
  sessions!: Table<ChatSession>
  messages!: Table<Message>
  tags!: Table<Tag>
  embeddings!: Table<EmbeddingMeta>
  qaPairs!: Table<QAPair>

  constructor() {
    super('memoriaDB')
    this.version(1).stores({
      sessions: 'id, source, createdAt, updatedAt, *tags',
      messages: 'id, sessionId, timestamp, role',
      tags: 'id, name, auto',
      embeddings: 'id, messageId, model',
    })
    this.version(2).stores({
      sessions: 'id, source, createdAt, updatedAt, *tags',
      messages: 'id, sessionId, timestamp, role',
      tags: 'id, name, auto',
      embeddings: 'id, messageId, model',
      qaPairs: 'id, sessionId, createdAt, source, *tags',
    })
  }

  /**
   * Clear all data from the database
   */
  async clearAll(): Promise<void> {
    await this.transaction('rw', this.sessions, this.messages, this.tags, this.embeddings, this.qaPairs, async () => {
      await this.sessions.clear()
      await this.messages.clear()
      await this.tags.clear()
      await this.embeddings.clear()
      await this.qaPairs.clear()
    })
  }
}

export const db = new MemoriaDB()
