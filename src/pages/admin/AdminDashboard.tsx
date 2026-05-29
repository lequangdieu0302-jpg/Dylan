import { useEffect, useState } from 'react'
import { Users, Building2, Trophy, Calendar, TrendingUp, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getAdminStats } from '@/services/adminService'
import { getGlobalLeaderboard } from '@/services/leaderboardService'
import { LeaderboardRow } from '@/components/ui/LeaderboardRow'
import { formatMoney } from '@/lib/utils'
import type { AdminStats, LeaderboardEntry } from '@/types'

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAdminStats(), getGlobalLeaderboard()])
      .then(([s, lb]) => { setStats(s); setTopUsers(lb.slice(0, 5)) })
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    { label: 'Người dùng', value: stats.total_users, icon: Users, color: 'text-blue-400' },
    { label: 'Công ty', value: stats.total_companies, icon: Building2, color: 'text-purple-400' },
    { label: 'Dự đoán', value: stats.total_predictions, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Trận sắp tới', value: stats.upcoming_matches, icon: Calendar, color: 'text-orange-400' },
    { label: 'Tổng quỹ', value: formatMoney(stats.total_fund), icon: DollarSign, color: 'text-primary' },
  ] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-black text-2xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Tổng quan hệ thống</p>
      </div>

      {/* Stats */}
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
    </div>
  )
}
