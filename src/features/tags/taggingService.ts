// Placeholder for auto-tagging service

import { ChatSession, Tag } from '@/types'

export interface TaggingAdapter {
  generateTags(session: ChatSession, messages: string[]): Promise<string[]>
}

export class AITaggingAdapter implements TaggingAdapter {
  async generateTags(_session: ChatSession, _messages: string[]): Promise<string[]> {
    // TODO: Call LLM API or use local model to generate 2-3 tags
    // TODO: Consider session title and message content
    
    return []
  }
}

export class KeywordTaggingAdapter implements TaggingAdapter {
  async generateTags(_session: ChatSession, _messages: string[]): Promise<string[]> {
    // TODO: Extract keywords using TF-IDF or similar
    // TODO: Return top 2-3 keywords as tags
    
    return []
  }
}

export async function mergeTags(existingTags: Tag[], _newTagNames: string[]): Promise<Tag[]> {
  // TODO: Implement tag merging logic
  // TODO: Handle duplicates and similar tags
  
  return existingTags
}
