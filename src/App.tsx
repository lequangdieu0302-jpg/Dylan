import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Navbar } from '@/components/layout/Navbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { HomePage } from '@/pages/HomePage'
import { AuthPage } from '@/pages/AuthPage'
import { MatchesPage } from '@/pages/MatchesPage'
import { MatchDetailPage } from '@/pages/MatchDetailPage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminMatches } from '@/pages/admin/AdminMatches'
import { AdminCompanies } from '@/pages/admin/AdminCompanies'
import { AdminUsers } from '@/pages/admin/AdminUsers'
import { AdminTeams } from '@/pages/admin/AdminTeams'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { getSession, getProfile } from '@/services/authService'
import { supabase } from '@/lib/supabase'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuthStore()
  if (!user) return <Navigate to="/auth" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="py-4 px-6 border-t border-white/5 bg-black/10 text-xs text-muted-foreground flex justify-between items-center pb-20 md:pb-4">
        <span>© 2026</span>
        <a 
          href="mailto:lequangdieu0302@gmail.com" 
          className="hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <span>📧 Contact:</span>
          <span className="underline">lequangdieu0302@gmail.com</span>
        </a>
      </footer>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { setUser } = useAuthStore()
  // authReady blocks all routes from rendering until initAuth() finishes.
  // Without this, pages render with user=null (guest mode) and never
  // re-fetch data once the real user loads — causing blank tabs.
  const [authReady, setAuthReady] = useState(false)

  const { theme } = useThemeStore()

  useEffect(() => {
    // Sync theme class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    // Initialize auth state — MUST call setAuthReady(true) in all code paths
    async function initAuth() {
      try {
        const session = await getSession()
        if (session?.user) {
          const profile = await getProfile(session.user.id)
          if (profile) {
            setUser(profile)
          } else {
            console.warn('[initAuth] Profile not found. Force logging out...')
            const { clearUser } = useAuthStore.getState()
            clearUser()
            try { await supabase.auth.signOut() } catch (_) {}
            const keysToRemove: string[] = []
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                keysToRemove.push(key)
              }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k))
          }
        } else {
          const { clearUser } = useAuthStore.getState()
          clearUser()
        }
      } catch (e) {
        console.error('[initAuth] unexpected error:', e)
        const { clearUser } = useAuthStore.getState()
        clearUser()
      } finally {
        // Always unblock the routes regardless of outcome
        setAuthReady(true)
      }
    }
    initAuth()

    // Listen for auth changes (login / logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await getProfile(session.user.id)
        if (profile) {
          setUser(profile)
        } else {
          console.warn('[onAuthStateChange] SIGNED_IN but no profile. Logging out...')
          const { clearUser } = useAuthStore.getState()
          clearUser()
          try { await supabase.auth.signOut() } catch (_) {}
          const keysToRemove: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k))
        }
      } else if (event === 'SIGNED_OUT') {
        const { clearUser } = useAuthStore.getState()
        clearUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser])

  // Show a full-screen spinner until auth is resolved.
  // This prevents pages from rendering with wrong user state.
  if (!authReady) {
    return (
      <div className="min-h-screen hero-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes with main layout */}
        <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/matches" element={<MainLayout><MatchesPage /></MainLayout>} />
        <Route path="/matches/:id" element={<MainLayout><MatchDetailPage /></MainLayout>} />
        <Route path="/leaderboard" element={<MainLayout><LeaderboardPage /></MainLayout>} />

        {/* Protected user routes */}
        <Route path="/profile" element={<MainLayout><AuthGuard><ProfilePage /></AuthGuard></MainLayout>} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="matches" element={<AdminMatches />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="teams" element={<AdminTeams />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
