import { supabase } from '@/lib/supabase'
import type { Prediction, PredictionChoice } from '@/types'

export async function getPredictionForMatch(
  userId: string,
  matchId: string
): Promise<Prediction | null> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .single()
  if (error) return null
  return data as Prediction
}

export async function getUserPredictions(userId: string): Promise<Prediction[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select(`
      *,
      match:matches(
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Prediction[]
}

export async function submitPrediction(
  userId: string,
  matchId: string,
  prediction: PredictionChoice,
  usedHopeStar: boolean
): Promise<Prediction> {
  // Upsert prediction
  const { data, error } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: userId,
        match_id: matchId,
        prediction,
        used_hope_star: usedHopeStar,
      },
      { onConflict: 'user_id,match_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as Prediction
}

export async function deletePrediction(userId: string, matchId: string) {
  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('user_id', userId)
    .eq('match_id', matchId)
  if (error) throw error
}
