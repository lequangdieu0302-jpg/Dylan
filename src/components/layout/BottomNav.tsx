import { Link, useLocation } from 'react-router-dom'
import { Home, ListOrdered, Trophy, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/matches', label: 'Matches', icon: ListOrdered },
  { href: '/leaderboard', label: 'BXH', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const location = useLocation()
  const { user } = useAuthStore()

  if (!user) return null

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-background/90 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              to={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all duration-200
                ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary/15' : ''}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : ''}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
