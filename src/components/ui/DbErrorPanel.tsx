import { RefreshCw, LogOut, Database } from 'lucide-react'
import { Button } from './button'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

interface DbErrorPanelProps {
  onRetry: () => void
  message?: string
}

export function DbErrorPanel({ onRetry, message }: DbErrorPanelProps) {
  const { clearUser } = useAuthStore()

  const handleLogoutAndLogin = async () => {
    clearUser()
    try {
      await supabase.auth.signOut()
    } catch (e) {
      // Ignore
    }
    // Force wipe client storage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    // Redirect to auth
    window.location.href = '/auth'
  }

  return (
    <div className="glass-card p-8 md:p-12 max-w-md mx-auto text-center border-red-500/20 my-12 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        <Database className="h-8 w-8 animate-pulse" />
      </div>
      
      <h3 className="font-display font-bold text-xl mb-3 text-slate-900 dark:text-white">
        Không thể tải dữ liệu
      </h3>
      
      <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
        {message || 'Kết nối tới cơ sở dữ liệu đã bị gián đoạn hoặc phiên làm việc đã hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại.'}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          onClick={onRetry} 
          variant="gold"
          className="gap-2 w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Tải lại dữ liệu
        </Button>
        
        <Button 
          onClick={handleLogoutAndLogin} 
          variant="outline"
          className="gap-2 w-full sm:w-auto border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut className="h-4 w-4" />
          Đăng nhập lại
        </Button>
      </div>
    </div>
  )
}
