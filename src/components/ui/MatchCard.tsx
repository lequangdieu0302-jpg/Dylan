import { Link } from 'react-router-dom'
import { Clock, MapPin, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CountdownTimer } from '@/components/ui/CountdownTimer'
import { formatMatchTime, isMatchLocked } from '@/lib/utils'
import type { Match, Prediction } from '@/types'

interface MatchCardProps {
  match: Match
  prediction?: Prediction | null
  showCountdown?: boolean
}

const statusConfig = {
  upcoming: { label: 'Sắp diễn ra', class: 'badge-upcoming', dot: 'bg-blue-400' },
  live: { label: 'LIVE', class: 'badge-live', dot: 'bg-red-500 animate-pulse' },
  finished: { label: 'Kết thúc', class: 'badge-finished', dot: 'bg-gray-500' },
  cancelled: { label: 'Huỷ', class: 'badge-finished', dot: 'bg-gray-500' },
}

const predictionColors = {
  home: 'text-neon-blue border-neon-blue/30 bg-neon-blue/10',
  draw: 'text-gold-400 border-gold-400/30 bg-gold-400/10',
  away: 'text-neon-green border-neon-green/30 bg-neon-green/10',
}

const predictionLabels = {
  home: 'Đội nhà win',
  draw: 'Hoà',
  away: 'Đội khách win',
}

export function MatchCard({ match, prediction, showCountdown = true }: MatchCardProps) {
  const status = statusConfig[match.status]
  const locked = isMatchLocked(match.match_time)

  return (
    <Link to={`/matches/${match.id}`}>
      <Card className="glass-card border-white/10 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300 cursor-pointer group overflow-hidden">
        {/* Live indicator top border */}
        {match.status === 'live' && (
          <div className="h-0.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
        )}

        <CardContent className="p-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <span className={status.class}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {match.round && <span>{match.round}</span>}
              {match.home_team?.group_code && (
                <>
                  <span>·</span>
                  <span className="text-primary font-semibold">Bảng {match.home_team.group_code}</span>
                </>
              )}
            </div>
          </div>

          {/* Teams */}
          <div className="flex items-center gap-3">
            {/* Home team */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-primary/20 transition-colors">
                {match.home_team?.country_code && match.home_team.logo_url ? (
                  <img src={match.home_team.logo_url} alt={match.home_team.name} className="w-10 h-10 object-contain" />
                ) : (
                  <Trophy className="h-6 w-6 text-gold-500/80 animate-pulse" />
                )}
              </div>
              <span className="text-sm font-semibold text-center leading-tight line-clamp-2 text-slate-900 dark:text-slate-100">
                {match.home_team?.name ?? 'TBD'}
              </span>
            </div>

            {/* Score / VS */}
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              {match.status === 'finished' || match.status === 'live' ? (
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold font-display text-slate-900 dark:text-white tabular-nums">
                    {match.home_score ?? 0}
                  </span>
                  <span className="text-muted-foreground font-medium">-</span>
                  <span className="text-3xl font-bold font-display text-slate-900 dark:text-white tabular-nums">
                    {match.away_score ?? 0}
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-bold text-slate-500 dark:text-slate-400/65">VS</div>
              )}
              {showCountdown && match.status === 'upcoming' && (
                <CountdownTimer matchTime={match.match_time} compact />
              )}
            </div>

            {/* Away team */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-primary/20 transition-colors">
                {match.away_team?.country_code && match.away_team.logo_url ? (
                  <img src={match.away_team.logo_url} alt={match.away_team.name} className="w-10 h-10 object-contain" />
                ) : (
                  <Trophy className="h-6 w-6 text-gold-500/80 animate-pulse" />
                )}
              </div>
              <span className="text-sm font-semibold text-center leading-tight line-clamp-2 text-slate-900 dark:text-slate-100">
                {match.away_team?.name ?? 'TBD'}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatMatchTime(match.match_time)}
            </div>
            {match.venue && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{match.venue}</span>
              </div>
            )}
          </div>

          {/* User prediction badge */}
          {prediction && (
            <div className={`mt-3 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-medium ${predictionColors[prediction.prediction]}`}>
              {prediction.used_hope_star && <span>⭐</span>}
              Bạn đoán: {predictionLabels[prediction.prediction]}
              {prediction.is_correct !== null && (
                <span>{prediction.is_correct ? ' ✓' : ' ✗'}</span>
              )}
            </div>
          )}
          {!prediction && !locked && (
            <div className="mt-3 text-center text-xs text-muted-foreground border border-dashed border-white/10 rounded-lg py-1.5">
              Chưa dự đoán · Nhấn để dự đoán
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
