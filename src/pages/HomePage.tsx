import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Trophy, Users, Zap, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MatchCard } from '@/components/ui/MatchCard'
import { LeaderboardRow } from '@/components/ui/LeaderboardRow'
import { CountdownTimer } from '@/components/ui/CountdownTimer'
import { Skeleton } from '@/components/ui/skeleton'
import { getUpcomingMatches } from '@/services/matchService'
import { getCompanyLeaderboard } from '@/services/leaderboardService'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import type { Match, LeaderboardEntry } from '@/types'

export function HomePage() {
  const { user } = useAuthStore()
  const [matches, setMatches] = useState<Match[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [playerCount, setPlayerCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const nextMatch = matches.find(m => m.status === 'upcoming' || m.status === 'live')

  useEffect(() => {
    async function load() {
      try {
        const [m, lb, countRes] = await Promise.all([
          getUpcomingMatches(6),
          user?.company_id ? getCompanyLeaderboard(user.company_id) : Promise.resolve([]),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user')
        ])
        setMatches(m)
        setLeaderboard(lb.slice(0, 5))
        if (countRes.count !== null) {
          setPlayerCount(countRes.count)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.company_id])

  return (
    <div className="min-h-screen hero-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute -top-10 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24 text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Zap className="h-3.5 w-3.5" />
            World Cup 2026 · Dự Đoán Vui
          </div>

          <h1 className="font-display font-black text-5xl md:text-7xl leading-tight mb-6 animate-slide-up">
            <span className="text-gradient-gold">Dự đoán cùng</span>
            <br />
            <span className="text-foreground">World Cup</span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8 animate-slide-up">
            Dự đoán kết quả bóng đá cùng đồng nghiệp. Ai đoán giỏi nhất sẽ không phải đóng quỹ! ⚽
          </p>

          {!user ? (
            <div className="flex items-center justify-center gap-3 animate-slide-up">
              <Link to="/auth">
                <Button size="xl" variant="gold" className="gap-2">
                  🚀 Tham gia ngay
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button size="xl" variant="outline" className="gap-2">
                  <Trophy className="h-5 w-5" />
                  Bảng xếp hạng
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 animate-slide-up">
              <Link to="/matches">
                <Button size="xl" variant="gold">⚽ Dự đoán ngay</Button>
              </Link>
            </div>
          )}

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { icon: <Calendar className="h-5 w-5 text-neon-blue" />, label: 'Trận đấu', value: '104' },
              { icon: <Users className="h-5 w-5 text-purple-400" />, label: 'Người chơi', value: playerCount !== null ? String(playerCount) : '?' },
              { icon: <Trophy className="h-5 w-5 text-gold-400" />, label: 'Đội bóng', value: '48' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4 flex flex-col items-center justify-center gap-1.5 min-w-[90px]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 shadow-sm">
                  {stat.icon}
                </div>
                <div className="font-bold text-xl text-gradient-neon">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Countdown to next match */}
      {nextMatch && (
        <section className="container mx-auto px-4 mb-12">
          <div className="glass-card p-6 border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-2">Trận tiếp theo</p>
            <div className="flex items-center justify-center gap-4 text-lg font-bold mb-4">
              <span className="text-slate-900 dark:text-white">{nextMatch.home_team?.name ?? 'TBD'}</span>
              <span className="text-muted-foreground">VS</span>
              <span className="text-slate-900 dark:text-white">{nextMatch.away_team?.name ?? 'TBD'}</span>
            </div>
            <div className="flex justify-center">
              <CountdownTimer matchTime={nextMatch.match_time} />
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 pb-24 md:pb-12 grid md:grid-cols-2 gap-8">
        {/* Upcoming matches */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl">Trận sắp diễn ra</h2>
            <Link to="/matches" className="flex items-center gap-1 text-sm text-primary hover:underline">
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)
              : matches.slice(0, 3).map((m) => <MatchCard key={m.id} match={m} />)
            }
            {!loading && matches.length === 0 && (
              <div className="glass-card p-8 text-center text-muted-foreground">
                Chưa có trận đấu nào được lên lịch
              </div>
            )}
          </div>
        </section>

        {/* Leaderboard preview */}
        {user && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-xl">Bảng Xếp Hạng</h2>
                {user.company && (
                  <p className="text-sm text-muted-foreground">{user.company.name}</p>
                )}
              </div>
              <Link to="/leaderboard" className="flex items-center gap-1 text-sm text-primary hover:underline">
                Xem đầy đủ <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="glass-card p-3 space-y-1">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)
                : leaderboard.map((entry) => (
                    <LeaderboardRow
                      key={entry.user_id}
                      entry={entry}
                      isCurrentUser={entry.user_id === user.id}
                    />
                  ))
              }
              {!loading && leaderboard.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Chưa có ai dự đoán
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
