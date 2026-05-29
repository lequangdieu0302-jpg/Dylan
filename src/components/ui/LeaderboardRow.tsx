import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HopeStars } from '@/components/ui/HopeStars'
import { formatMoney, getAvatarFallback, getRankBadge } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types'
import { cn } from '@/lib/utils'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  isCurrentUser?: boolean
}

export function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  const isTop3 = entry.rank <= 3

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
      isTop3 ? 'glass-card border-primary/20' : 'hover:bg-white/5',
      isCurrentUser && 'border border-primary/40 bg-primary/5',
    )}>
      {/* Rank */}
      <div className={cn(
        'w-10 text-center font-bold font-display text-lg shrink-0',
        entry.rank === 1 && 'text-gradient-gold',
        entry.rank === 2 && 'text-gray-400',
        entry.rank === 3 && 'text-amber-600',
        entry.rank > 3 && 'text-muted-foreground text-sm',
      )}>
        {getRankBadge(entry.rank)}
      </div>

      {/* Avatar */}
      <Avatar className={cn('h-9 w-9 shrink-0', isTop3 && 'ring-2 ring-primary/40')}>
        <AvatarImage src={entry.avatar_url ?? undefined} />
        <AvatarFallback>{getAvatarFallback(entry.username)}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-semibold text-sm truncate', isCurrentUser && 'text-primary')}>
            {entry.username}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] text-primary bg-primary/10 px-1.5 rounded-full shrink-0">Bạn</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{entry.accuracy}% accuracy</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-xs text-green-400">{entry.total_correct}✓</span>
          <span className="text-xs text-red-400">{entry.total_wrong}✗</span>
        </div>
      </div>

      {/* Stars & Money */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn(
          'font-bold text-sm font-mono',
          entry.total_money === 0 ? 'text-green-400' : 'text-red-400'
        )}>
          {entry.total_money === 0 ? '🏆 Free' : formatMoney(entry.total_money)}
        </span>
        <HopeStars count={entry.hope_stars} size="sm" />
      </div>
    </div>
  )
}
