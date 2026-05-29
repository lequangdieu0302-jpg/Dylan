import { create } from 'zustand'
import type { LeaderboardEntry } from '@/types'

interface LeaderboardStore {
  entries: LeaderboardEntry[]
  loading: boolean
  tab: 'alltime' | 'weekly'
  setEntries: (entries: LeaderboardEntry[]) => void
  setLoading: (loading: boolean) => void
  setTab: (tab: 'alltime' | 'weekly') => void
}

export const useLeaderboardStore = create<LeaderboardStore>()((set) => ({
  entries: [],
  loading: false,
  tab: 'alltime',
  setEntries: (entries) => set({ entries }),
  setLoading: (loading) => set({ loading }),
  setTab: (tab) => set({ tab }),
}))
