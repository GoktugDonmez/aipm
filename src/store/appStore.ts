import { create } from 'zustand'
import { ChatSession, Tag } from '@/types'

interface AppState {
  sessions: ChatSession[]
  tags: Tag[]
  selectedSessionId: string | null
  isLoading: boolean
  
  setSessions: (sessions: ChatSession[]) => void
  setTags: (tags: Tag[]) => void
  setSelectedSession: (id: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  sessions: [],
  tags: [],
  selectedSessionId: null,
  isLoading: false,
  
  setSessions: (sessions) => set({ sessions }),
  setTags: (tags) => set({ tags }),
  setSelectedSession: (id) => set({ selectedSessionId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
