import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Building2 } from 'lucide-react'
import { LeaderboardRow } from '@/components/ui/LeaderboardRow'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getCompanyLeaderboard, getGlobalLeaderboard } from '@/services/leaderboardService'
import { getCompanies } from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import type { LeaderboardEntry, Company } from '@/types'

import { DbErrorPanel } from '@/components/ui/DbErrorPanel'

export function LeaderboardPage() {
  const { user } = useAuthStore()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('global')
  const [companies, setCompanies] = useState<Company[]>([])
  const [hasError, setHasError] = useState(false)
  const [retryTrigger, setRetryTrigger] = useState(0)

  useEffect(() => {
    if (user?.role === 'admin') {
      getCompanies().then(setCompanies).catch(console.error)
    }
  }, [user?.role])

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      setHasError(false)
      try {
        if (user?.role === 'admin') {
          if (selectedCompanyId === 'global') {
            const data = await getGlobalLeaderboard()
            setEntries(data)
          } else {
            const data = await getCompanyLeaderboard(selectedCompanyId)
            setEntries(data)
          }
        } else {
          // Regular user
          if (user?.company_id) {
            const data = await getCompanyLeaderboard(user.company_id)
            setEntries(data)
          } else {
            const data = await getGlobalLeaderboard()
            setEntries(data)
          }
        }
      } catch (e) {
        console.error('[Leaderboard] error:', e)
        setHasError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [user?.role, user?.company_id, selectedCompanyId, retryTrigger])

  const topThree = entries.slice(0, 3)

  return (
    <div className="min-h-screen hero-bg">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
            <img src="/wc2026-logo.png" alt="FIFA World Cup 2026" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          </div>
          <h1 className="font-display font-black text-3xl text-gradient-gold drop-shadow-md">Bảng Xếp Hạng</h1>
          {user?.role === 'admin' ? (
            <div className="mt-4 max-w-xs mx-auto flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <Building2 className="h-4 w-4 text-gold-400 shrink-0" />
              <select
                className="w-full bg-transparent text-sm focus:outline-none font-medium cursor-pointer text-slate-100"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                <option value="global" className="bg-slate-900 text-slate-100">Bảng xếp hạng Toàn Cầu</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            user?.company && (
              <p className="text-muted-foreground mt-1">{user.company.name}</p>
            )
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Sắp xếp: Người đóng quỹ ít nhất lên đầu 🏆
          </p>
        </div>

        {hasError ? (
          <DbErrorPanel onRetry={() => setRetryTrigger(prev => prev + 1)} />
        ) : (
          <>
            {/* Podium top 3 */}
            {!loading && topThree.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-8 px-4">
                {/* 2nd */}
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-3xl">🥈</div>
                  <div className="w-full glass-card p-3 text-center border-gray-500/20" style={{ paddingTop: '12px', paddingBottom: '12px', height: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                    <div className="font-bold text-sm truncate">{topThree[1].username}</div>
                    <div className="text-xs text-muted-foreground">{topThree[1].total_money === 0 ? 'Free!' : `${topThree[1].total_money / 1000}k`}</div>
                  </div>
                </div>
                {/* 1st */}
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-4xl animate-float">🏆</div>
                  <div className="w-full glass-card p-3 text-center border-gold-400/30 glow-gold" style={{ paddingTop: '16px', paddingBottom: '16px', height: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                    <div className="font-bold truncate text-gradient-gold">{topThree[0].username}</div>
                    <div className="text-xs text-gold-400">{topThree[0].total_money === 0 ? 'Free!' : `${topThree[0].total_money / 1000}k`}</div>
                  </div>
                </div>
                {/* 3rd */}
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-3xl">🥉</div>
                  <div className="w-full glass-card p-3 text-center border-amber-700/20" style={{ paddingTop: '8px', paddingBottom: '8px', height: '75px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                    <div className="font-bold text-sm truncate">{topThree[2].username}</div>
                    <div className="text-xs text-muted-foreground">{topThree[2].total_money === 0 ? 'Free!' : `${topThree[2].total_money / 1000}k`}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Full list */}
            <div className="glass-card p-3 space-y-1">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)
              ) : !user ? (
                <div className="py-12 text-center text-muted-foreground space-y-4">
                  <Users className="h-12 w-12 mx-auto opacity-30 animate-pulse" />
                  <p className="font-medium text-slate-200">Vui lòng đăng nhập để xem bảng xếp hạng</p>
                  <Link to="/auth">
                    <Button size="sm" variant="gold">Đăng nhập ngay</Button>
                  </Link>
                </div>
              ) : entries.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-3">
                  <Users className="h-12 w-12 mx-auto opacity-30" />
                  <p className="font-medium">Chưa có ai trong bảng xếp hạng</p>
                  <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">
                    Hãy chạy <code className="bg-white/10 px-1 rounded">fix_missing_profiles.sql</code> trong Supabase SQL Editor để tạo profile cho các tài khoản đã đăng ký
                  </p>
                </div>
              ) : (
                entries.map((entry) => (
                  <LeaderboardRow
                    key={entry.user_id}
                    entry={entry}
                    isCurrentUser={entry.user_id === user?.id}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* Rules reminder */}
        <div className="mt-6 glass-card p-4 border-white/5">
          <h3 className="font-semibold text-sm mb-3">📋 Luật chơi</h3>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>✅ Đoán đúng</span><span className="text-green-400">Không mất tiền</span></div>
            <div className="flex justify-between"><span>❌ Đoán sai</span><span className="text-red-400">Đóng quỹ 10.000 VNĐ</span></div>
            <div className="flex justify-between"><span>⭐ Sao + Đúng</span><span className="text-green-400">Trừ quỹ 10.000 VNĐ</span></div>
            <div className="flex justify-between"><span>⭐ Sao + Sai</span><span className="text-red-400">Đóng quỹ 20.000 VNĐ</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
