import { create } from 'zustand'
import type { Match, MatchStatus } from '@/types'

type FilterStatus = MatchStatus | 'all'

interface MatchStore {
  matches: Match[]
  filter: FilterStatus
  loading: boolean
  setMatches: (matches: Match[]) => void
  setFilter: (filter: FilterStatus) => void
  setLoading: (loading: boolean) => void
  filteredMatches: () => Match[]
}

export const useMatchStore = create<MatchStore>()((set, get) => ({
  matches: [],
  filter: 'all',
  loading: false,
  setMatches: (matches) => set({ matches }),
  setFilter: (filter) => set({ filter }),
  setLoading: (loading) => set({ loading }),
  filteredMatches: () => {
    const { matches, filter } = get()
    if (filter === 'all') return matches
    return matches.filter((m) => m.status === filter)
  },
}))
