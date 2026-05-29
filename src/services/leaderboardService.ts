import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/types'

export async function getCompanyLeaderboard(
  companyId: string
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, company_id, total_correct, total_wrong, total_money, hope_stars, company:companies(name)')
    .eq('company_id', companyId)
    .eq('role', 'user')
    .order('total_money', { ascending: true })

  if (error) throw error

  return (data || []).map((row, idx) => {
    const correct = row.total_correct ?? 0
    const wrong = row.total_wrong ?? 0
    const total = correct + wrong
    return {
      rank: idx + 1,
      user_id: row.id,
      username: row.username,
      avatar_url: row.avatar_url,
      company_id: row.company_id ?? '',
      company_name: (row.company as { name?: string } | null)?.name ?? '',
      total_correct: correct,
      total_wrong: wrong,
      total_money: row.total_money ?? 0,
      hope_stars: row.hope_stars ?? 5,
      accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
      win_streak: 0,
    } as LeaderboardEntry
  })
}

export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, company_id, total_correct, total_wrong, total_money, hope_stars, company:companies(name)')
    .eq('role', 'user')
    .order('total_money', { ascending: true })
    .limit(50)

  if (error) throw error

  return (data || []).map((row, idx) => {
    const correct = row.total_correct ?? 0
    const wrong = row.total_wrong ?? 0
    const total = correct + wrong
    return {
      rank: idx + 1,
      user_id: row.id,
      username: row.username,
      avatar_url: row.avatar_url,
      company_id: row.company_id ?? '',
      company_name: (row.company as { name?: string } | null)?.name ?? '',
      total_correct: correct,
      total_wrong: wrong,
      total_money: row.total_money ?? 0,
      hope_stars: row.hope_stars ?? 5,
      accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
      win_streak: 0,
    } as LeaderboardEntry
  })
}
