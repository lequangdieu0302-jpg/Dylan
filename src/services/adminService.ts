import { supabase } from '@/lib/supabase'
import type { Company, Team, Match, Profile, AdminStats } from '@/types'

// ── Stats ──────────────────────────────────────────────────────────────
export async function getAdminStats(): Promise<AdminStats> {
  const [usersRes, companiesRes, predictionsRes, matchesRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'user'),
    supabase.from('companies').select('id', { count: 'exact' }).eq('is_active', true),
    supabase.from('predictions').select('money_change', { count: 'exact' }),
    supabase.from('matches').select('id', { count: 'exact' }).in('status', ['upcoming', 'live']),
  ])

  const totalFund = (predictionsRes.data || []).reduce(
    (sum, p) => sum + (p.money_change > 0 ? p.money_change : 0),
    0
  )

  return {
    total_users: usersRes.count ?? 0,
    total_companies: companiesRes.count ?? 0,
    total_predictions: predictionsRes.count ?? 0,
    total_fund: totalFund,
    upcoming_matches: matchesRes.count ?? 0,
  }
}

// ── Companies ──────────────────────────────────────────────────────────
export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Company[]
}

export async function createCompany(company: Partial<Company>) {
  const { data, error } = await supabase
    .from('companies')
    .insert([company])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCompany(id: string, updates: Partial<Company>) {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCompany(id: string) {
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) throw error
}

// ── Teams ──────────────────────────────────────────────────────────────
export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Team[]
}

export async function createTeam(team: Partial<Team>) {
  const { data, error } = await supabase.from('teams').insert([team]).select().single()
  if (error) throw error
  return data
}

export async function updateTeam(id: string, updates: Partial<Team>) {
  const { data, error } = await supabase.from('teams').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTeam(id: string) {
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}

// ── Users ──────────────────────────────────────────────────────────────
export async function getAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, company:companies(*)')
    .order('total_money', { ascending: true })
  if (error) throw error
  return data as Profile[]
}

export async function banUser(userId: string) {
  // Set a flag or handle via Supabase admin API
  const { error } = await supabase.from('profiles').update({ role: 'banned' as never }).eq('id', userId)
  if (error) throw error
}

export async function resetHopeStars(userId: string) {
  const { error } = await supabase.from('profiles').update({ hope_stars: 5 }).eq('id', userId)
  if (error) throw error
}

export async function adjustMoney(userId: string, amount: number) {
  const { error } = await supabase.from('profiles').update({ total_money: amount }).eq('id', userId)
  if (error) throw error
}

export async function moveUserCompany(userId: string, companyId: string) {
  const { error } = await supabase.from('profiles').update({ company_id: companyId }).eq('id', userId)
  if (error) throw error
}

export async function deleteUser(userId: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', userId)
  if (error) throw error
}

// ── Matches Admin ──────────────────────────────────────────────────────
export async function adminGetAllMatches(): Promise<Match[]> {
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

// ── Storage ────────────────────────────────────────────────────────────
export async function uploadLogo(
  bucket: 'company-logos' | 'team-logos',
  file: File,
  name: string
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${name}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
