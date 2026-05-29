import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { logoutUser } from '@/services/authService'
import { Home, ListOrdered, User, LogOut, Menu, X, Shield, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarFallback } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'

export function Navbar() {
  const { user, isAdmin, clearUser } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logoutUser()
      clearUser()
      toast.success('Đã đăng xuất thành công')
    } catch {
      toast.error('Đăng xuất thất bại')
    }
  }

  const navLinks = [
    { href: '/', label: 'Trang chủ', icon: Home },
    { href: '/matches', label: 'Trận đấu', icon: ListOrdered },
    { href: '/leaderboard', label: 'BXH', icon: Trophy },
    { href: '/profile', label: 'Hồ sơ', icon: User },
  ]

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-xl bg-background/80">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform">
            <img src="/wc2026-icon.png" alt="WC2026" className="w-9 h-9 object-contain" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-display font-black text-base text-gradient-gold tracking-tight">WC Predict</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">2026</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive(href)
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-all"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-xl"
            title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              {/* Company badge */}
              {user.company && (
                <span className="hidden sm:block text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full border border-white/10">
                  {user.company.name}
                </span>
              )}
              <Link to="/profile">
                <Avatar className="h-9 w-9 ring-2 ring-primary/30 hover:ring-primary/60 transition-all cursor-pointer">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback>{getAvatarFallback(user.username)}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex h-9 w-9">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button size="sm" variant="gold">Đăng nhập</Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-background/95 backdrop-blur-xl animate-slide-up">
          <div className="container px-4 py-3 flex flex-col gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive(href) ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-purple-400 hover:bg-purple-500/10">
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            )}
            {user && (
              <button
                onClick={() => { handleLogout(); setMobileOpen(false) }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
