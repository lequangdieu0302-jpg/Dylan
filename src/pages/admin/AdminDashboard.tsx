import { useEffect, useState } from 'react'
import { Users, Building2, Trophy, Calendar, TrendingUp, DollarSign, BarChart2, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getAdminStats, getAllUsers } from '@/services/adminService'
import { getGlobalLeaderboard } from '@/services/leaderboardService'
import { LeaderboardRow } from '@/components/ui/LeaderboardRow'
import { formatMoney } from '@/lib/utils'
import type { AdminStats, LeaderboardEntry, Profile } from '@/types'
import { cn } from '@/lib/utils'

interface CompanyStat {
  id: string
  name: string
  members: number
  correct: number
  wrong: number
  money: number
  stars: number
  accuracy: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'company' | 'chart'>('overview')

  useEffect(() => {
    Promise.all([getAdminStats(), getGlobalLeaderboard(), getAllUsers()])
      .then(([s, lb, u]) => { 
        setStats(s)
        setTopUsers(lb.slice(0, 5))
        setUsers(u)
      })
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    { label: 'Người dùng', value: stats.total_users, icon: Users, color: 'text-blue-400' },
    { label: 'Công ty', value: stats.total_companies, icon: Building2, color: 'text-purple-400' },
    { label: 'Dự đoán', value: stats.total_predictions, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Trận sắp tới', value: stats.upcoming_matches, icon: Calendar, color: 'text-orange-400' },
    { label: 'Tổng quỹ', value: formatMoney(stats.total_fund), icon: DollarSign, color: 'text-primary' },
  ] : []

  // Aggregate stats by company
  const companyStats = Object.values(
    users.reduce((acc: Record<string, CompanyStat>, u) => {
      const companyId = u.company_id || 'no-company'
      const companyName = u.company?.name || 'Tự do'
      
      if (!acc[companyId]) {
        acc[companyId] = {
          id: companyId,
          name: companyName,
          members: 0,
          correct: 0,
          wrong: 0,
          money: 0,
          stars: 0,
          accuracy: 0,
        }
      }
      
      const stat = acc[companyId]
      stat.members += 1
      stat.correct += u.total_correct ?? 0
      stat.wrong += u.total_wrong ?? 0
      stat.money += u.total_money ?? 0
      stat.stars += u.hope_stars ?? 0
      
      return acc
    }, {})
  ).map(s => {
    const total = s.correct + s.wrong
    s.accuracy = total > 0 ? Math.round((s.correct / total) * 100) : 0
    return s
  }).sort((a, b) => b.money - a.money)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <Shield className="h-6 w-6 text-gold-400" /> Báo Cáo Thống Kê
          </h1>
          <p className="text-muted-foreground text-sm">Trang phân tích dành riêng cho Quản trị viên</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 flex rounded-xl w-full sm:w-auto max-w-md">
        {(['overview', 'company', 'chart'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === t
                ? "bg-primary text-primary-foreground shadow font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === 'overview' ? 'Tổng quan' : t === 'company' ? 'Báo cáo công ty' : 'Biểu đồ quỹ đóng'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : statCards.map((s) => (
                <Card key={s.label} className="glass-card border-white/10">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs text-muted-foreground font-medium">{s.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</div>
                    <s.icon className={`h-5 w-5 ${s.color} opacity-50 mt-1`} />
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Top users */}
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Top người chơi (toàn hệ thống)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)
                : topUsers.map((e) => <LeaderboardRow key={e.user_id} entry={e} />)
              }
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'company' && (
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-400" />
              Thống kê tổng hợp theo công ty
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="text-left p-4 font-medium">Tên Công Ty</th>
                    <th className="text-center p-4 font-medium">Thành Viên</th>
                    <th className="text-center p-4 font-medium">Dự Đoán Đúng / Sai</th>
                    <th className="text-center p-4 font-medium">Tỷ Lệ Trúng</th>
                    <th className="text-center p-4 font-medium">Sao Hy Vọng Còn Lại</th>
                    <th className="text-right p-4 font-medium">Tổng Tiền Quỹ Đóng</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}><td colSpan={6} className="p-4"><Skeleton className="h-8" /></td></tr>
                    ))
                  ) : companyStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">Chưa có dữ liệu thống kê.</td>
                    </tr>
                  ) : (
                    companyStats.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="p-4 font-semibold text-slate-100">{c.name}</td>
                        <td className="p-4 text-center">{c.members} người</td>
                        <td className="p-4 text-center">
                          <span className="text-green-400">{c.correct}✓</span>
                          {' - '}
                          <span className="text-red-400">{c.wrong}✗</span>
                        </td>
                        <td className="p-4 text-center font-bold text-gradient-neon">{c.accuracy}%</td>
                        <td className="p-4 text-center text-gold-400 font-medium">⭐ {c.stars} sao</td>
                        <td className="p-4 text-right font-mono font-bold text-red-400">
                          {formatMoney(c.money)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'chart' && (
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-green-400" />
              So sánh tiền quỹ thu được giữa các công ty
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : companyStats.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Chưa có dữ liệu so sánh.</div>
            ) : (
              companyStats.map((s) => {
                const maxMoney = Math.max(...companyStats.map(c => c.money), 1)
                const pct = Math.round((s.money / maxMoney) * 100)
                return (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-200">{s.name} ({s.members} thành viên)</span>
                      <span className="font-bold text-red-400">{formatMoney(s.money)}</span>
                    </div>
                    <div className="h-4 w-full bg-white/5 border border-white/10 rounded-full overflow-hidden flex relative">
                      <div 
                        style={{ width: `${Math.max(pct, 2)}%` }} 
                        className="bg-gradient-to-r from-red-500/80 to-amber-500/80 h-full rounded-full transition-all duration-500 glow-red" 
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
