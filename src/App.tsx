import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
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
        <span>© 2026 WC Predict</span>
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
  const { setUser, setLoading } = useAuthStore()

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
    // Initialize auth state
    async function initAuth() {
      setLoading(true)
      const session = await getSession()
      if (session?.user) {
        const profile = await getProfile(session.user.id)
        if (profile) {
          setUser(profile)
        } else {
          const { clearUser } = useAuthStore.getState()
          clearUser()
        }
      } else {
        const { clearUser } = useAuthStore.getState()
        clearUser()
      }
    }
    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await getProfile(session.user.id)
        if (profile) {
          setUser(profile)
        } else {
          const { clearUser } = useAuthStore.getState()
          clearUser()
        }
      } else if (event === 'SIGNED_OUT') {
        const { clearUser } = useAuthStore.getState()
        clearUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

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
