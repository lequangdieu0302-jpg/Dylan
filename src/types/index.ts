// Database entity types
export interface Company {
  id: string
  name: string
  logo_url: string | null
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  company_id: string | null
  username: string
  avatar_url: string | null
  role: 'admin' | 'user'
  total_correct: number
  total_wrong: number
  total_money: number
  hope_stars: number
  created_at: string
  company?: Company
}

export interface Team {
  id: string
  name: string
  logo_url: string | null
  group_code: string | null
  country_code: string | null
}

export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'cancelled'
export type MatchResult = 'home' | 'draw' | 'away' | null

export interface Match {
  id: string
  home_team_id: string
  away_team_id: string
  match_time: string
  home_score: number | null
  away_score: number | null
  result: MatchResult
  status: MatchStatus
  round: string | null
  venue: string | null
  external_id: string | null
  created_at: string
  home_team?: Team
  away_team?: Team
}

export type PredictionChoice = 'home' | 'draw' | 'away'

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  prediction: PredictionChoice
  used_hope_star: boolean
  is_correct: boolean | null
  money_change: number
  created_at: string
  match?: Match
  profile?: Profile
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  avatar_url: string | null
  company_id: string
  company_name: string
  total_correct: number
  total_wrong: number
  total_money: number
  hope_stars: number
  accuracy: number
  win_streak: number
}

// Admin stats
export interface AdminStats {
  total_users: number
  total_companies: number
  total_predictions: number
  total_fund: number
  upcoming_matches: number
}

// Football API types
export interface FootballFixture {
  id: number
  date: string
  homeTeam: {
    id: number
    name: string
    logo: string
  }
  awayTeam: {
    id: number
    name: string
    logo: string
  }
  status: string
  score: {
    home: number | null
    away: number | null
  }
}

// UI state types
export interface AuthState {
  user: Profile | null
  session: unknown
  loading: boolean
  isAdmin: boolean
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  description?: string
}
