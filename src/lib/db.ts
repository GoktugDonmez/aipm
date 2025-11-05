import Dexie, { Table } from 'dexie'
import { ChatSession, Message, Tag, EmbeddingMeta } from '@/types'

export class MemoriaDB extends Dexie {
  sessions!: Table<ChatSession>
  messages!: Table<Message>
  tags!: Table<Tag>
  embeddings!: Table<EmbeddingMeta>

  constructor() {
    super('memoriaDB')
    this.version(1).stores({
      sessions: 'id, source, createdAt, updatedAt, *tags',
      messages: 'id, sessionId, timestamp, role',
      tags: 'id, name, auto',
      embeddings: 'id, messageId, model',
    })
  }
}

export const db = new MemoriaDB()
