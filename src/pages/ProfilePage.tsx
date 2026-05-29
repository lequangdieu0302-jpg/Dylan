import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, Star, TrendingUp, Calendar, Building2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { HopeStars } from '@/components/ui/HopeStars'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserPredictions } from '@/services/predictionService'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney, getAvatarFallback, formatAccuracy, getPredictionLabel } from '@/lib/utils'
import type { Prediction } from '@/types'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export function ProfilePage() {
  const { user } = useAuthStore()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserPredictions(user.id)
      .then(setPredictions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return (
    <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
      <p>Vui lòng <Link to="/auth" className="text-primary underline">đăng nhập</Link> để xem hồ sơ</p>
    </div>
  )

  const accuracy = formatAccuracy(user.total_correct, user.total_wrong)
  const total = user.total_correct + user.total_wrong

  return (
    <div className="min-h-screen hero-bg">
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-24 md:pb-8">
        {/* Profile header */}
        <div className="glass-card p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20 ring-4 ring-primary/30">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">{getAvatarFallback(user.username)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-2xl truncate">{user.username}</h1>
              {user.company && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {user.company.name}
                </div>
              )}
              <div className="mt-2">
                <HopeStars count={user.hope_stars} size="md" />
              </div>
            </div>
            {user.role === 'admin' && (
              <Badge variant="gold">⚡ Admin</Badge>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: <CheckCircle className="h-5 w-5 text-green-400" />,
                label: 'Đoán đúng',
                value: user.total_correct,
                color: 'text-green-400',
              },
              {
                icon: <XCircle className="h-5 w-5 text-red-400" />,
                label: 'Đoán sai',
                value: user.total_wrong,
                color: 'text-red-400',
              },
              {
                icon: <TrendingUp className="h-5 w-5 text-primary" />,
                label: 'Accuracy',
                value: accuracy,
                color: 'text-primary',
              },
              {
                icon: <Star className="h-5 w-5 text-gold-400" />,
                label: 'Sao còn lại',
                value: `${user.hope_stars}/5`,
                color: 'text-gold-400',
              },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <div className={`font-bold text-lg ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Money summary */}
        <div className={`glass-card p-4 mb-4 flex items-center justify-between border ${
          user.total_money > 0 ? 'border-red-500/30 bg-red-500/5' :
          user.total_money < 0 ? 'border-green-500/30 bg-green-500/5' :
          'border-white/10'
        }`}>
          <span className="font-semibold">💰 Tiền quỹ phải đóng</span>
          <span className={`font-bold text-xl ${
            user.total_money > 0 ? 'text-red-400' :
            user.total_money < 0 ? 'text-green-400' :
            'text-foreground'
          }`}>
            {user.total_money === 0 ? '🎉 Không có!' : formatMoney(user.total_money)}
          </span>
        </div>

        {/* Prediction history */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Lịch sử dự đoán ({total})</h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : predictions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Chưa có dự đoán nào. <Link to="/matches" className="text-primary underline">Dự đoán ngay!</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {predictions.map((pred) => (
                <div key={pred.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                  {/* Result icon */}
                  <div className="shrink-0">
                    {pred.is_correct === null ? (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">?</div>
                    ) : pred.is_correct ? (
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-400" />
                    )}
                  </div>

                  {/* Match info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {pred.match?.home_team?.name ?? '?'} vs {pred.match?.away_team?.name ?? '?'}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{getPredictionLabel(pred.prediction)}</span>
                      {pred.used_hope_star && <span className="text-gold-400">⭐</span>}
                      <span>·</span>
                      <span>{format(new Date(pred.created_at), 'dd/MM', { locale: vi })}</span>
                    </div>
                  </div>

                  {/* Money change */}
                  {pred.is_correct !== null && (
                    <div className={`shrink-0 font-bold text-sm ${
                      pred.money_change > 0 ? 'text-red-400' :
                      pred.money_change < 0 ? 'text-green-400' :
                      'text-muted-foreground'
                    }`}>
                      {pred.money_change === 0 ? '—' :
                       pred.money_change > 0 ? `+${pred.money_change / 1000}k` :
                       `${pred.money_change / 1000}k`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
