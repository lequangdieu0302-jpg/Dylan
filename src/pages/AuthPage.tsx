import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { registerUser, loginUser, getProfile } from '@/services/authService'
import { getCompanies } from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import type { Company } from '@/types'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
})

const registerSchema = z.object({
  username: z.string().min(2, 'Tên ít nhất 2 ký tự').max(20),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
  company_id: z.string().min(1, 'Vui lòng chọn công ty'),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [showPass, setShowPass] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    getCompanies()
      .then((data) => {
        setCompanies(data)
        setCompanyError(null)
      })
      .catch((err) => {
        console.error('[AuthPage] Error loading companies:', err)
        setCompanyError(err.message || String(err))
        toast.error('Không thể tải danh sách công ty', err.message || String(err))
      })
  }, [])

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const handleLogin = async (data: LoginForm) => {
    setLoading(true)
    try {
      // 10s timeout on the login request itself — prevents infinite hang
      let result: Awaited<ReturnType<typeof loginUser>>
      try {
        result = await Promise.race([
          loginUser(data),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Kết nối quá chậm, thử lại nhé!')), 10000)
          ),
        ])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
          toast.error('Sai email hoặc mật khẩu')
        } else if (msg.toLowerCase().includes('email not confirmed')) {
          toast.error('⚠️ Email chưa xác nhận', 'Tắt "Confirm email" trong Supabase → Authentication → Providers → Email')
        } else {
          toast.error('Đăng nhập thất bại', msg)
        }
        return
      }

      if (!result.session) {
        toast.error(
          '⚠️ Email chưa xác nhận',
          'Vào Supabase → Authentication → Providers → Email → Tắt "Confirm email" rồi thử lại'
        )
        return
      }

      // Try to load profile (5s timeout)
      let profile = null
      try {
        profile = await Promise.race([
          getProfile(result.session.user.id),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ])
      } catch {
        console.warn('[Login] getProfile timeout — continuing without profile')
      }

      if (profile) {
        setUser(profile)
        toast.success('Chào mừng trở lại! 👋')
      } else {
        toast.error('Hồ sơ chưa có', 'Vui lòng chạy schema.sql trong Supabase SQL Editor rồi đăng nhập lại')
      }
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (data: RegisterForm) => {
    setLoading(true)
    try {
      // 15s timeout for register (includes profile creation)
      let result: Awaited<ReturnType<typeof registerUser>>
      try {
        result = await Promise.race([
          registerUser(data),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Kết nối quá chậm, thử lại nhé!')), 15000)
          ),
        ])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        toast.error('Đăng ký thất bại', msg)
        return
      }

      if (result.session?.user) {
        try {
          const profile = await Promise.race([
            getProfile(result.session.user.id),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
          ])
          if (profile) setUser(profile)
        } catch { /* ignore */ }
        toast.success('Đăng ký thành công! 🎉')
        navigate('/')
      } else {
        toast.success('Kiểm tra email của bạn! 📧', 'Bấm link xác nhận trong email rồi quay lại đăng nhập.')
        setTab('login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen hero-bg-auth flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center drop-shadow-2xl">
            <img src="/wc2026-icon.png" alt="WC2026" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="font-display font-black text-3xl text-gradient-gold">Dự đoán cùng World Cup</h1>
          <p className="text-muted-foreground mt-1 text-sm">⚽ World Cup 2026</p>
        </div>

        {/* Tab switcher */}
        <div className="glass-card p-1 flex mb-6 rounded-xl">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${tab === t ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        <div className="glass-card p-6 border-white/10">
          {tab === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="ban@congty.com" {...loginForm.register('email')} />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-pass">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="login-pass"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pr-10"
                    {...loginForm.register('password')}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" size="lg" variant="gold" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : '🚀 Đăng nhập'}
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tên hiển thị</Label>
                <Input placeholder="Nguyễn Văn A" {...registerForm.register('username')} />
                {registerForm.formState.errors.username && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="ban@congty.com" {...registerForm.register('email')} />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Mật khẩu</Label>
                <div className="relative">
                  <Input type={showPass ? 'text' : 'password'} placeholder="••••••••" className="pr-10" {...registerForm.register('password')} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Công ty
                </Label>
                <select
                  className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                  defaultValue=""
                  onChange={(e) => registerForm.setValue('company_id', e.target.value)}
                >
                  <option value="" disabled>Chọn công ty của bạn...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {registerForm.formState.errors.company_id && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.company_id.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" size="lg" variant="gold" disabled={loading}>
                {loading ? 'Đang đăng ký...' : '⚽ Tạo tài khoản'}
              </Button>
            </form>
          )}

          {/* Hope stars info */}
          <div className="mt-4 p-3 rounded-xl bg-gold-400/5 border border-gold-400/20 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <span>⭐⭐⭐⭐⭐</span>
              <span>Mỗi user nhận <strong className="text-gold-400">5 Sao Hy Vọng</strong> khi bắt đầu!</span>
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="text-center mt-6 text-xs text-muted-foreground animate-fade-in">
          <a 
            href="mailto:lequangdieu0302@gmail.com" 
            className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
          >
            <span>📧 Liên hệ:</span>
            <span className="underline">lequangdieu0302@gmail.com</span>
          </a>
        </div>
      </div>
    </div>
  )
}
