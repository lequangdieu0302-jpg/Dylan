import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Lock, CheckCircle, XCircle, Trophy, Handshake, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitPrediction, getPredictionsForMatch } from '@/services/predictionService'
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
  const navigate = useNavigate()
  const locked = isMatchLocked(match.match_time)

  const [selected, setSelected] = useState<PredictionChoice | null>(existingPrediction?.prediction ?? null)
  const [useStar, setUseStar] = useState(existingPrediction?.used_hope_star ?? false)
  const [saving, setSaving] = useState(false)

  const [voters, setVoters] = useState<Prediction[]>([])
  const [votersLoading, setVotersLoading] = useState(true)

  const loadVoters = async () => {
    try {
      const list = await getPredictionsForMatch(match.id)
      setVoters(list)
    } catch (e) {
      console.error(e)
    } finally {
      setVotersLoading(false)
    }
  }

  useEffect(() => {
    loadVoters()
  }, [match.id])

  useEffect(() => {
    setSelected(existingPrediction?.prediction ?? null)
    setUseStar(existingPrediction?.used_hope_star ?? false)
  }, [existingPrediction])

  // Tên đội thật thay vì "Đội nhà / Đội khách"
  const homeName = match.home_team?.name || 'Đội nhà'
  const awayName = match.away_team?.name || 'Đội khách'

  const choices: { value: PredictionChoice; label: string; sublabel: string; color: string }[] = [
    { value: 'home', label: homeName, sublabel: 'Thắng',  color: 'selected-home' },
    { value: 'draw', label: 'Hoà',    sublabel: 'Tỷ số hoà', color: 'selected-draw' },
    { value: 'away', label: awayName, sublabel: 'Thắng',  color: 'selected-away' },
  ]

  const homeVoters = voters.filter(v => v.prediction === 'home')
  const drawVoters = voters.filter(v => v.prediction === 'draw')
  const awayVoters = voters.filter(v => v.prediction === 'away')

  const totalVotes = voters.length
  const homePct = totalVotes > 0 ? Math.round((homeVoters.length / totalVotes) * 100) : 0
  const drawPct = totalVotes > 0 ? Math.round((drawVoters.length / totalVotes) * 100) : 0
  const awayPct = totalVotes > 0 ? Math.round((awayVoters.length / totalVotes) * 100) : 0

  const handleSubmit = async () => {
    if (!user || !selected) return
    if (locked) { toast.error('Trận đấu đã bắt đầu!'); return }
    if (useStar && user.hope_stars <= 0) { toast.error('Bạn không còn sao hy vọng!'); return }

    setSaving(true)
    try {
      const pred = await submitPrediction(user.id, match.id, selected, useStar)
      toast.success('🎉 Dự đoán đã được lưu!', useStar ? 'Đã dùng 1 sao hy vọng' : undefined)
      onSaved?.(pred)
      loadVoters()
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

  const canPredict = !!user && !locked && match.status !== 'finished' && match.status !== 'cancelled'

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

      {/* Nút đăng nhập cho khách */}
      {!user && (
        <Button
          onClick={() => navigate('/auth')}
          className="w-full font-bold text-base h-12 flex items-center justify-center gap-2"
          variant="gold"
          size="lg"
        >
          <LogIn className="h-5 w-5" /> Đăng nhập để dự đoán
        </Button>
      )}

      {/* Thống kê bình chọn từ cộng đồng */}
      <div className="space-y-4 pt-5 mt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gradient-gold">Bình chọn từ cộng đồng</h4>
          <span className="text-xs text-muted-foreground">{totalVotes} lượt bình chọn</span>
        </div>

        {votersLoading ? (
          <div className="flex flex-col gap-2 py-4">
            <div className="h-3 w-full bg-white/5 rounded-full animate-pulse" />
            <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
          </div>
        ) : totalVotes > 0 ? (
          <div className="space-y-4">
            {/* Segmented bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-white/5 border border-white/10 relative">
              {homePct > 0 && (
                <div 
                  style={{ width: `${homePct}%` }} 
                  className="bg-gradient-to-r from-blue-500/80 to-cyan-500/80 h-full hover:opacity-90 transition-all duration-300 cursor-pointer"
                  title={`${homeName}: ${homeVoters.length} lượt (${homePct}%)`}
                />
              )}
              {drawPct > 0 && (
                <div 
                  style={{ width: `${drawPct}%` }} 
                  className="bg-gradient-to-r from-gray-500/80 to-gray-600/80 h-full hover:opacity-90 transition-all duration-300 cursor-pointer"
                  title={`Hòa: ${drawVoters.length} lượt (${drawPct}%)`}
                />
              )}
              {awayPct > 0 && (
                <div 
                  style={{ width: `${awayPct}%` }} 
                  className="bg-gradient-to-r from-red-500/80 to-pink-500/80 h-full hover:opacity-90 transition-all duration-300 cursor-pointer"
                  title={`${awayName}: ${awayVoters.length} lượt (${awayPct}%)`}
                />
              )}
            </div>

            {/* Percentages row */}
            <div className="grid grid-cols-3 text-center text-xs font-semibold">
              <div className="text-blue-400">
                <span className="block text-base font-black">{homePct}%</span>
                <span className="text-[10px] text-muted-foreground font-medium truncate block max-w-full px-1">{homeName}</span>
              </div>
              <div className="text-gray-400 border-x border-white/5">
                <span className="block text-base font-black">{drawPct}%</span>
                <span className="text-[10px] text-muted-foreground font-medium block">Hòa</span>
              </div>
              <div className="text-red-400">
                <span className="block text-base font-black">{awayPct}%</span>
                <span className="text-[10px] text-muted-foreground font-medium truncate block max-w-full px-1">{awayName}</span>
              </div>
            </div>

            {/* Voter Lists grouped by Choice */}
            <div className="space-y-4 mt-4">
              {/* Home Voters */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{homeName} ({homeVoters.length})</span>
                </div>
                {homeVoters.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {homeVoters.map((v) => (
                      <div 
                        key={v.id} 
                        className={cn(
                          "flex items-center gap-1.5 bg-blue-500/5 border rounded-full pl-1 pr-2.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-blue-500/10",
                          v.used_hope_star ? "border-gold-500/30 bg-gold-500/5 hover:bg-gold-500/10" : "border-white/10"
                        )}
                        title={v.profile?.company?.name ? `Công ty: ${v.profile.company.name}` : undefined}
                      >
                        {v.profile?.avatar_url ? (
                          <img src={v.profile.avatar_url} className="w-4.5 h-4.5 rounded-full object-cover shrink-0" alt="" />
                        ) : (
                          <span className="w-4.5 h-4.5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center text-[9px] shrink-0">
                            {v.profile?.username?.[0]?.toUpperCase() ?? '?'}
                          </span>
                        )}
                        <span className="truncate max-w-[100px]">{v.profile?.username ?? 'Ẩn danh'}</span>
                        {v.used_hope_star && (
                          <span className="text-[10px] text-gold-400 filter drop-shadow-[0_0_2px_rgba(234,179,8,0.5)]">⭐</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground/60 italic pl-3">Chưa có ai chọn</div>
                )}
              </div>

              {/* Draw Voters */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  <span>Hòa ({drawVoters.length})</span>
                </div>
                {drawVoters.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {drawVoters.map((v) => (
                      <div 
                        key={v.id} 
                        className={cn(
                          "flex items-center gap-1.5 bg-gray-500/5 border rounded-full pl-1 pr-2.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-gray-500/10",
                          v.used_hope_star ? "border-gold-500/30 bg-gold-500/5 hover:bg-gold-500/10" : "border-white/10"
                        )}
                        title={v.profile?.company?.name ? `Công ty: ${v.profile.company.name}` : undefined}
                      >
                        {v.profile?.avatar_url ? (
                          <img src={v.profile.avatar_url} className="w-4.5 h-4.5 rounded-full object-cover shrink-0" alt="" />
                        ) : (
                          <span className="w-4.5 h-4.5 rounded-full bg-gray-500/20 text-gray-300 font-bold flex items-center justify-center text-[9px] shrink-0">
                            {v.profile?.username?.[0]?.toUpperCase() ?? '?'}
                          </span>
                        )}
                        <span className="truncate max-w-[100px]">{v.profile?.username ?? 'Ẩn danh'}</span>
                        {v.used_hope_star && (
                          <span className="text-[10px] text-gold-400 filter drop-shadow-[0_0_2px_rgba(234,179,8,0.5)]">⭐</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground/60 italic pl-3">Chưa có ai chọn</div>
                )}
              </div>

              {/* Away Voters */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-red-400/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>{awayName} ({awayVoters.length})</span>
                </div>
                {awayVoters.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {awayVoters.map((v) => (
                      <div 
                        key={v.id} 
                        className={cn(
                          "flex items-center gap-1.5 bg-red-500/5 border rounded-full pl-1 pr-2.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-red-500/10",
                          v.used_hope_star ? "border-gold-500/30 bg-gold-500/5 hover:bg-gold-500/10" : "border-white/10"
                        )}
                        title={v.profile?.company?.name ? `Công ty: ${v.profile.company.name}` : undefined}
                      >
                        {v.profile?.avatar_url ? (
                          <img src={v.profile.avatar_url} className="w-4.5 h-4.5 rounded-full object-cover shrink-0" alt="" />
                        ) : (
                          <span className="w-4.5 h-4.5 rounded-full bg-red-500/20 text-red-300 font-bold flex items-center justify-center text-[9px] shrink-0">
                            {v.profile?.username?.[0]?.toUpperCase() ?? '?'}
                          </span>
                        )}
                        <span className="truncate max-w-[100px]">{v.profile?.username ?? 'Ẩn danh'}</span>
                        {v.used_hope_star && (
                          <span className="text-[10px] text-gold-400 filter drop-shadow-[0_0_2px_rgba(234,179,8,0.5)]">⭐</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground/60 italic pl-3">Chưa có ai chọn</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-muted-foreground/50 border border-dashed border-white/5 rounded-xl bg-white/1">
            Chưa có lượt bình chọn nào cho trận đấu này. Hãy là người đầu tiên!
          </div>
        )}
      </div>
    </div>
  )
}
