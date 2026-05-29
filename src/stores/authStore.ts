import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types'

interface AuthStore {
  user: Profile | null
  loading: boolean
  isAdmin: boolean
  setUser: (user: Profile | null) => void
  setLoading: (loading: boolean) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      isAdmin: false,
      setUser: (user) => set({ user, loading: false, isAdmin: user?.role === 'admin' }),
      setLoading: (loading) => set({ loading }),
      clearUser: () => set({ user: null, loading: false, isAdmin: false }),
    }),
    {
      name: 'wc-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
