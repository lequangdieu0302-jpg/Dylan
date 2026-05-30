import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMatches } from '@/services/matchService'
import { useAuthStore } from '@/stores/authStore'
import { MatchCard } from '@/components/ui/MatchCard'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import type { Match, Prediction, MatchStatus } from '@/types'

import { useMatchStore } from '@/stores/matchStore'

async function fetchWithTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ])
}

import { DbErrorPanel } from '@/components/ui/DbErrorPanel'

export function MatchesPage() {
  const { user } = useAuthStore()
  const { matches, setMatches, loading, setLoading } = useMatchStore()
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [filter, setFilter] = useState<MatchStatus | 'all'>('all')
  const [selectedDate, setSelectedDate] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'list' | 'matrix'>('list')
  const [hasError, setHasError] = useState(false)
  const [retryTrigger, setRetryTrigger] = useState(0)

  useEffect(() => {
    async function load() {
      if (matches.length === 0) {
        setLoading(true)
      }
      try {
        setHasError(false)
        const matchesPromise = fetchWithTimeout(getMatches())
        const predsPromise = user
          ? fetchWithTimeout(
              supabase
                .from('predictions')
                .select('*')
                .eq('user_id', user.id) as any
            )
          : Promise.resolve({ data: [], error: null })

        const [matchesResult, predsResult] = await Promise.allSettled([
          matchesPromise,
          predsPromise
        ]) as any[]

        if (matchesResult.status === 'fulfilled') {
          setMatches(matchesResult.value)
        } else {
          console.error('[MatchesPage] Failed to fetch matches:', matchesResult.reason)
          setHasError(true)
        }

        if (predsResult.status === 'fulfilled' && predsResult.value && predsResult.value.data) {
          const predMap: Record<string, Prediction> = {}
          predsResult.value.data.forEach((p: any) => {
            predMap[p.match_id] = p as Prediction
          })
          setPredictions(predMap)
        }
      } catch (err) {
        console.error('[MatchesPage] error in load:', err)
        setHasError(true)
      } finally {
        setLoading(false)
      }
    }

    load()

    // Auto-revalidate on tab focus or network recovery
    const handleRevalidate = () => {
      load()
    }

    window.addEventListener('focus', handleRevalidate)
    window.addEventListener('online', handleRevalidate)

    return () => {
      window.removeEventListener('focus', handleRevalidate)
      window.removeEventListener('online', handleRevalidate)
    }
  }, [user, setMatches, setLoading, matches.length, retryTrigger])

  // Extract unique dates in ascending order (YYYY-MM-DD)
  const uniqueDateStrings = Array.from(
    new Set(matches.map(m => m.match_time.split('T')[0]))
  ).sort()

  // Extract unique group codes dynamically
  const availableGroups = Array.from(
    new Set(
      matches
        .map(m => m.home_team?.group_code)
        .filter((g): g is string => !!g)
    )
  ).sort()

  // Helper to format date headers
  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const weekday = d.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('Th ', 'T')
    return { date: `${day}/${month}`, weekday }
  }

  // Filtered list of matches for List View
  const filtered = matches.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false
    if (selectedDate !== 'all') {
      const matchDate = m.match_time.split('T')[0]
      if (matchDate !== selectedDate) return false
    }
    if (selectedGroup !== 'all') {
      if (selectedGroup === 'KO') {
        if (m.home_team?.group_code) return false
      } else {
        if (m.home_team?.group_code !== selectedGroup) return false
      }
    }
    return true
  })

  const matrixRows = [...availableGroups, 'KO']

  return (
    <div className="min-h-screen hero-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl mb-1 text-gradient-gold">Trận đấu</h1>
            <p className="text-muted-foreground text-sm">Dự đoán kết quả để giành chiến thắng!</p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex border-b border-white/10 mb-6 gap-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'list' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Danh sách trận đấu
            {activeTab === 'list' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'matrix' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Lịch thi đấu (Ma trận)
            {activeTab === 'matrix' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Filters for List view */}
        {activeTab === 'list' && !loading && (
          <div className="mb-6 bg-white/5 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Bộ lọc tìm kiếm
              </span>
              {(filter !== 'all' || selectedDate !== 'all' || selectedGroup !== 'all') && (
                <button
                  onClick={() => {
                    setFilter('all')
                    setSelectedDate('all')
                    setSelectedGroup('all')
                  }}
                  className="text-xs font-semibold text-primary hover:underline hover:text-amber-500 transition-colors"
                >
                  Xoá bộ lọc ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 dark:text-muted-foreground font-semibold uppercase tracking-wider">Trạng thái</label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-slate-950 dark:text-white"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as MatchStatus | 'all')}
                >
                  <option value="all" className="text-slate-950 dark:text-white bg-white dark:bg-slate-900">Tất cả trạng thái</option>
                  <option value="upcoming" className="text-slate-955 dark:text-white bg-white dark:bg-slate-900">Sắp diễn ra</option>
                  <option value="live" className="text-slate-955 dark:text-white bg-white dark:bg-slate-900">🔴 LIVE</option>
                  <option value="finished" className="text-slate-955 dark:text-white bg-white dark:bg-slate-900">Kết thúc</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 dark:text-muted-foreground font-semibold uppercase tracking-wider">Ngày đấu</label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-slate-950 dark:text-white"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  <option value="all" className="text-slate-955 dark:text-white bg-white dark:bg-slate-900">Tất cả các ngày</option>
                  {uniqueDateStrings.map(dateStr => {
                    const d = new Date(dateStr)
                    const formatted = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    return (
                      <option key={dateStr} value={dateStr} className="text-slate-955 dark:text-white bg-white dark:bg-slate-900">{formatted}</option>
                    )
                  })}
                </select>
              </div>

              {/* Group Filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 dark:text-muted-foreground font-semibold uppercase tracking-wider">Bảng đấu</label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-slate-950 dark:text-white"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <option value="all" className="text-slate-955 dark:text-white bg-white dark:bg-slate-900">Tất cả các bảng</option>
                  {availableGroups.map(g => (
                    <option key={g} value={g} className="text-slate-955 dark:text-white bg-white dark:bg-slate-900">Bảng {g}</option>
                  ))}
                  <option value="KO" className="text-slate-955 dark:text-white bg-white dark:bg-slate-900">Vòng Knockout</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        {hasError ? (
          <DbErrorPanel onRetry={() => setRetryTrigger(prev => prev + 1)} />
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : activeTab === 'list' ? (
          filtered.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground border-slate-200 dark:border-white/10">
              <div className="text-4xl mb-3">⚽</div>
              <p className="text-slate-600 dark:text-slate-400">Không có trận đấu nào khớp với bộ lọc</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={predictions[m.id] ?? null}
                />
              ))}
            </div>
          )
        ) : (
          /* Matrix view */
          <div className="relative overflow-auto border border-slate-200 dark:border-white/10 rounded-2xl max-h-[650px] w-full bg-white dark:bg-slate-950">
            <table className="w-full border-separate border-spacing-0 text-left bg-white dark:bg-slate-950">
              <thead>
                <tr>
                  {/* Top-left cell */}
                  <th className="sticky top-0 left-0 z-30 bg-slate-200 dark:bg-slate-900 border-r border-b border-slate-300 dark:border-white/10 p-3 text-[10px] font-bold text-slate-800 dark:text-gradient-gold min-w-[110px] text-center uppercase tracking-wider">
                    LỊCH ĐẤU
                  </th>
                  {uniqueDateStrings.map(dateStr => {
                    const { date, weekday } = formatDateHeader(dateStr)
                    return (
                      <th key={dateStr} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 p-3 text-center border-r border-b border-slate-200 dark:border-white/10 min-w-[130px]">
                        <div className="text-[9px] text-slate-500 dark:text-muted-foreground font-semibold uppercase">{weekday}</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{date}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map(group => {
                  const label = group === 'KO' ? 'Knockout' : `Bảng ${group}`
                  return (
                    <tr key={group}>
                      {/* Left group header */}
                      <td className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-white/10 p-3 font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {label}
                      </td>
                      {uniqueDateStrings.map(dateStr => {
                        // Find matches for this group and date
                        const cellMatches = matches.filter(m => {
                          const matchDate = m.match_time.split('T')[0]
                          if (matchDate !== dateStr) return false
                          if (group === 'KO') {
                            return !m.home_team?.group_code
                          } else {
                            return m.home_team?.group_code === group
                          }
                        })

                        return (
                          <td key={dateStr} className="p-2 border-r border-b border-slate-200 dark:border-white/5 h-20 align-middle text-center bg-white dark:bg-slate-950">
                            {cellMatches.length > 0 ? (
                              <div className="flex flex-col gap-1 justify-center items-center">
                                {cellMatches.map(m => {
                                  const isLive = m.status === 'live'
                                  const isFinished = m.status === 'finished'
                                  const homeCode = m.home_team?.country_code ?? 'TBD'
                                  const awayCode = m.away_team?.country_code ?? 'TBD'

                                  return (
                                    <div key={m.id} className="relative group/tooltip w-24">
                                      <Link
                                        to={`/matches/${m.id}`}
                                        className={`flex flex-col items-center justify-center p-1 rounded-lg border text-[9px] w-full transition-all hover:scale-[1.04]
                                          ${isLive
                                            ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold'
                                            : isFinished
                                              ? 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 opacity-70'
                                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:border-primary/40 hover:bg-slate-100 dark:hover:bg-white/10'
                                          }`}
                                      >
                                        <div className="flex items-center justify-center gap-1 font-bold w-full px-0.5">
                                          {m.home_team?.logo_url ? (
                                            <img src={m.home_team.logo_url} alt={homeCode} className="w-3 h-3 rounded-full object-cover border border-slate-300 dark:border-white/20 shrink-0" />
                                          ) : (
                                            <div className="w-3 h-3 rounded-full bg-slate-350 dark:bg-slate-750 shrink-0 border border-slate-400 dark:border-slate-650" />
                                          )}
                                          <span className="truncate max-w-[20px]">{homeCode}</span>
                                          <span className="text-slate-400 dark:text-muted-foreground/40 font-normal text-[7px] shrink-0">v</span>
                                          <span className="truncate max-w-[20px]">{awayCode}</span>
                                          {m.away_team?.logo_url ? (
                                            <img src={m.away_team.logo_url} alt={awayCode} className="w-3 h-3 rounded-full object-cover border border-slate-300 dark:border-white/20 shrink-0" />
                                          ) : (
                                            <div className="w-3 h-3 rounded-full bg-slate-350 dark:bg-slate-750 shrink-0 border border-slate-400 dark:border-slate-650" />
                                          )}
                                        </div>
                                        {isFinished ? (
                                          <div className="font-bold text-primary mt-0.5">
                                            {m.home_score} - {m.away_score}
                                          </div>
                                        ) : (
                                          <div className="text-[8px] text-slate-500 dark:text-muted-foreground/80 mt-0.5">
                                            {new Date(m.match_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                          </div>
                                        )}
                                      </Link>

                                      {/* Custom styled Tooltip */}
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 rounded-xl 
                                        bg-slate-950/95 dark:bg-slate-900/95 text-white border border-slate-200 dark:border-white/10 
                                        shadow-2xl backdrop-blur-md opacity-0 pointer-events-none group-hover/tooltip:opacity-100 
                                        transition-all duration-200 z-50 flex flex-col gap-2 text-center text-xs scale-95 group-hover/tooltip:scale-100"
                                      >
                                        <div className="text-[9px] font-bold tracking-wider text-amber-500 uppercase">
                                          {m.round || 'VÒNG BẢNG'}
                                        </div>
                                        
                                        <div className="flex items-center justify-between gap-2 px-1 py-0.5">
                                          <div className="flex flex-col items-center gap-1 w-20">
                                            {m.home_team?.logo_url ? (
                                              <img src={m.home_team.logo_url} alt={m.home_team.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-800 border border-slate-400 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 font-bold shrink-0">?</div>
                                            )}
                                            <span className="text-[10px] font-bold truncate max-w-full text-slate-200">{m.home_team?.name}</span>
                                          </div>

                                          <div className="text-[11px] font-black text-slate-400">VS</div>

                                          <div className="flex flex-col items-center gap-1 w-20">
                                            {m.away_team?.logo_url ? (
                                              <img src={m.away_team.logo_url} alt={m.away_team.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-800 border border-slate-400 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 font-bold shrink-0">?</div>
                                            )}
                                            <span className="text-[10px] font-bold truncate max-w-full text-slate-200">{m.away_team?.name}</span>
                                          </div>
                                        </div>

                                        <div className="border-t border-slate-800 dark:border-white/5 pt-1.5 text-[9px] text-slate-400 flex flex-col gap-0.5">
                                          <div className="flex items-center justify-center gap-1">
                                            <span>📍</span>
                                            <span className="truncate max-w-[160px]">{m.venue || 'Chưa cập nhật'}</span>
                                          </div>
                                          <div className="flex items-center justify-center gap-1">
                                            <span>⏰</span>
                                            <span>{new Date(m.match_time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                          </div>
                                        </div>
                                        
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-950/95 dark:border-t-slate-900/95" />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/10 mx-auto" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
