import { supabase } from '@/lib/supabase'
import type { Match } from '@/types'

export async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `)
    .order('match_time', { ascending: true })
  if (error) throw error
  return data as Match[]
}

export async function getMatchById(id: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `)
    .eq('id', id)
    .single()
  if (error) return null
  return data as Match
}

export async function getUpcomingMatches(limit = 5): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `)
    .in('status', ['upcoming', 'live'])
    .order('match_time', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data as Match[]
}

// Admin only
export async function createMatch(match: Partial<Match>) {
  const { data, error } = await supabase
    .from('matches')
    .insert([match])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMatch(id: string, updates: Partial<Match>) {
  const { data, error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMatch(id: string) {
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) throw error
}

export async function setMatchResult(
  id: string,
  homeScore: number,
  awayScore: number
) {
  let result: 'home' | 'draw' | 'away'
  if (homeScore > awayScore) result = 'home'
  else if (homeScore < awayScore) result = 'away'
  else result = 'draw'

  const { data, error } = await supabase.rpc('set_match_result', {
    p_match_id: id,
    p_home_score: homeScore,
    p_away_score: awayScore,
    p_result: result,
  })
  if (error) throw error
  return data
}
