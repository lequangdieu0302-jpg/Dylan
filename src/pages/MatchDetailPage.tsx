import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getMatchById } from '@/services/matchService'
import { getPredictionForMatch } from '@/services/predictionService'
import { useAuthStore } from '@/stores/authStore'
import { PredictionCard } from '@/components/ui/PredictionCard'
import { CountdownTimer } from '@/components/ui/CountdownTimer'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'
import { formatMatchTime } from '@/lib/utils'
import type { Match, Prediction } from '@/types'

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [match, setMatch] = useState<Match | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const [m, p] = await Promise.all([
        getMatchById(id),
        user ? getPredictionForMatch(user.id, id) : Promise.resolve(null),
      ])
      if (m) {
        setMatch(m)
      }
      setPrediction(p)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  if (loading) return (
    <div className="container mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-64" />
      <Skeleton className="h-80" />
    </div>
  )

  if (!match) return (
    <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
      Không tìm thấy trận đấu
    </div>
  )

  const statusVariants = {
    upcoming: 'blue' as const,
    live: 'red' as const,
    finished: 'secondary' as const,
    cancelled: 'secondary' as const,
  }

  return (
    <div className="min-h-screen hero-bg">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Match header */}
        <div className="glass-card border-white/10 p-6 mb-4 text-center">
          {match.round && (
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
              {match.round}
              {match.home_team?.group_code && ` · Bảng ${match.home_team.group_code}`}
            </p>
          )}
          <Badge variant={statusVariants[match.status]} className="mb-4">
            {match.status === 'live' && '🔴 '}
            {match.status === 'upcoming' ? 'Sắp diễn ra' : match.status === 'live' ? 'LIVE' : match.status === 'finished' ? 'Kết thúc' : 'Huỷ'}
          </Badge>

          {/* Teams row */}
          <div className="flex items-center gap-6 justify-center my-6">
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                {match.home_team?.country_code && match.home_team.logo_url ? (
                  <img src={match.home_team.logo_url} className="w-14 h-14 object-contain" alt={match.home_team.name} />
                ) : (
                  <Trophy className="h-10 w-10 text-gold-500/80 animate-pulse" />
                )}
              </div>
              <span className="font-bold text-lg text-center">{match.home_team?.name ?? 'TBD'}</span>
            </div>

            <div className="flex flex-col items-center gap-2 min-w-[80px]">
              {match.status !== 'upcoming' ? (
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black tabular-nums">{match.home_score ?? 0}</span>
                  <span className="text-muted-foreground text-xl">-</span>
                  <span className="text-4xl font-black tabular-nums">{match.away_score ?? 0}</span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-muted-foreground/40">VS</span>
              )}
              <span className="text-xs text-muted-foreground">{formatMatchTime(match.match_time)}</span>
            </div>

            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                {match.away_team?.country_code && match.away_team.logo_url ? (
                  <img src={match.away_team.logo_url} className="w-14 h-14 object-contain" alt={match.away_team.name} />
                ) : (
                  <Trophy className="h-10 w-10 text-gold-500/80 animate-pulse" />
                )}
              </div>
              <span className="font-bold text-lg text-center">{match.away_team?.name ?? 'TBD'}</span>
            </div>
          </div>

          {/* Countdown */}
          {match.status === 'upcoming' && (
            <div className="flex justify-center">
              <CountdownTimer matchTime={match.match_time} />
            </div>
          )}
        </div>

        {/* Prediction */}
        <PredictionCard
          match={match}
          existingPrediction={prediction}
          onSaved={(p) => setPrediction(p)}
        />

      </div>
    </div>
  )
}
