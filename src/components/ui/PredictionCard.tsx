import { useState } from 'react'
import { Star, Lock, CheckCircle, XCircle, Trophy, Handshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitPrediction } from '@/services/predictionService'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/ui/toaster'
import { isMatchLocked, formatMoney } from '@/lib/utils'
import type { Match, Prediction, PredictionChoice } from '@/types'
import { cn } from '@/lib/utils'

interface PredictionCardProps {
  match: Match
  existingPrediction?: Prediction | null
  onSaved?: (pred: Prediction) => void
}

export function PredictionCard({ match, existingPrediction, onSaved }: PredictionCardProps) {
  const { user } = useAuthStore()
  const locked = isMatchLocked(match.match_time)

  const [selected, setSelected] = useState<PredictionChoice | null>(existingPrediction?.prediction ?? null)
  const [useStar, setUseStar] = useState(existingPrediction?.used_hope_star ?? false)
  const [saving, setSaving] = useState(false)

  // Tên đội thật thay vì "Đội nhà / Đội khách"
  const homeName = match.home_team?.name || 'Đội nhà'
  const awayName = match.away_team?.name || 'Đội khách'

  const choices: { value: PredictionChoice; label: string; sublabel: string; color: string }[] = [
    { value: 'home', label: homeName, sublabel: 'Thắng',  color: 'selected-home' },
    { value: 'draw', label: 'Hoà',    sublabel: 'Tỷ số hoà', color: 'selected-draw' },
    { value: 'away', label: awayName, sublabel: 'Thắng',  color: 'selected-away' },
  ]

  const handleSubmit = async () => {
    if (!user || !selected) return
    if (locked) { toast.error('Trận đấu đã bắt đầu!'); return }
    if (useStar && user.hope_stars <= 0) { toast.error('Bạn không còn sao hy vọng!'); return }

    setSaving(true)
    try {
      const pred = await submitPrediction(user.id, match.id, selected, useStar)
      toast.success('🎉 Dự đoán đã được lưu!', useStar ? 'Đã dùng 1 sao hy vọng' : undefined)
      onSaved?.(pred)
    } catch (e) {
      toast.error('Lưu thất bại', String(e))
    } finally {
      setSaving(false)
    }
  }

  const moneyIf = (correct: boolean) => {
    if (correct) return useStar ? -10000 : 0
    return useStar ? 20000 : 10000
  }

  const canPredict = !locked && match.status !== 'finished' && match.status !== 'cancelled'

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg">Dự đoán kết quả</h3>
        {locked && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Đã khoá
          </span>
        )}
      </div>

      {/* Already has result */}
      {match.status === 'finished' && existingPrediction && (
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-xl border',
          existingPrediction.is_correct
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-red-500/30 bg-red-500/10'
        )}>
          {existingPrediction.is_correct
            ? <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
            : <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
          <div>
            <div className={`font-semibold ${existingPrediction.is_correct ? 'text-green-400' : 'text-red-400'}`}>
              {existingPrediction.is_correct ? 'Dự đoán đúng! 🎉' : 'Dự đoán sai'}
            </div>
            <div className={`text-sm ${existingPrediction.money_change > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {existingPrediction.money_change > 0
                ? `+${formatMoney(existingPrediction.money_change)} vào quỹ`
                : existingPrediction.money_change < 0
                  ? `${formatMoney(existingPrediction.money_change)} (giảm trừ)`
                  : 'Không mất tiền'}
            </div>
          </div>
        </div>
      )}

      {/* Choice buttons — hiển thị tên đội thật */}
      <div className="grid grid-cols-3 gap-2">
        {choices.map((c) => (
          <button
            key={c.value}
            disabled={!canPredict}
            onClick={() => canPredict && setSelected(c.value)}
            className={cn(
              'pred-btn glass-card relative',
              selected === c.value ? c.color : 'border-white/10 hover:border-white/20',
              !canPredict && 'opacity-60 cursor-not-allowed'
            )}
          >
            {c.value === 'home' && (
              match.home_team?.logo_url ? (
                <img src={match.home_team.logo_url} alt={homeName} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
              ) : (
                <Trophy className="h-6 w-6 text-blue-400 shrink-0" />
              )
            )}
            {c.value === 'draw' && (
              <Handshake className="h-6 w-6 text-gold-400 shrink-0" />
            )}
            {c.value === 'away' && (
              match.away_team?.logo_url ? (
                <img src={match.away_team.logo_url} alt={awayName} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
              ) : (
                <Trophy className="h-6 w-6 text-green-400 shrink-0" />
              )
            )}
            <span className="text-[11px] font-bold text-center leading-tight line-clamp-2 px-0.5">{c.label}</span>
            <span className="text-[10px] text-muted-foreground">{c.sublabel}</span>
            {selected === c.value && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-current opacity-80" />
            )}
          </button>
        ))}
      </div>

      {/* Hope Star Toggle */}
      {canPredict && (
        <button
          onClick={() => setUseStar(!useStar)}
          disabled={user?.hope_stars === 0}
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200',
            useStar
              ? 'border-gold-400/50 bg-gold-400/10 glow-gold'
              : 'border-white/10 hover:border-white/20',
            user?.hope_stars === 0 && 'opacity-40 cursor-not-allowed'
          )}
        >
          <div className="flex items-center gap-2">
            <Star className={`h-5 w-5 ${useStar ? 'text-gold-400 fill-gold-400' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">Dùng Sao Hy Vọng</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              {useStar ? (
                <>
                  <span className="text-green-400">Đúng: -{formatMoney(10000)}</span>
                  {' · '}
                  <span className="text-red-400">Sai: +{formatMoney(20000)}</span>
                </>
              ) : (
                <>Còn {user?.hope_stars ?? 0} sao</>
              )}
            </div>
          </div>
        </button>
      )}

      {/* Money preview */}
      {selected && canPredict && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2 text-center">
            <div className="text-muted-foreground mb-0.5">Nếu đúng</div>
            <div className={moneyIf(true) < 0 ? 'text-green-400 font-bold' : moneyIf(true) === 0 ? 'text-foreground font-bold' : 'text-red-400 font-bold'}>
              {moneyIf(true) === 0 ? 'Không mất' : moneyIf(true) < 0 ? formatMoney(moneyIf(true)) : `+${formatMoney(moneyIf(true))}`}
            </div>
          </div>
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-center">
            <div className="text-muted-foreground mb-0.5">Nếu sai</div>
            <div className="text-red-400 font-bold">+{formatMoney(moneyIf(false))}</div>
          </div>
        </div>
      )}

      {/* Submit button — luôn hiển thị khi có thể predict */}
      {canPredict && (
        <Button
          onClick={handleSubmit}
          disabled={!selected || saving}
          className="w-full font-bold text-base h-12"
          variant={selected ? 'gold' : 'secondary'}
          size="lg"
        >
          {saving
            ? '⏳ Đang lưu...'
            : !selected
              ? 'Chọn đội để xác nhận'
              : existingPrediction
                ? '🔄 Cập nhật dự đoán'
                : '✅ Xác nhận dự đoán'}
        </Button>
      )}

      {/* Đã khoá mà có prediction cũ */}
      {locked && existingPrediction && match.status !== 'finished' && (
        <div className="text-center text-xs text-muted-foreground py-1">
          Bạn đã đoán: <span className="text-foreground font-semibold">
            {existingPrediction.prediction === 'home' ? homeName
              : existingPrediction.prediction === 'away' ? awayName
              : 'Hoà'}
          </span> {existingPrediction.used_hope_star ? '⭐' : ''}
        </div>
      )}

      {/* Chưa predict, đã khoá */}
      {locked && !existingPrediction && match.status !== 'finished' && (
        <div className="text-center text-xs text-muted-foreground/60 py-1 border border-dashed border-white/10 rounded-lg">
          <Lock className="h-3 w-3 inline mr-1" />
          Trận đã bắt đầu, không thể dự đoán
        </div>
      )}
    </div>
  )
}
