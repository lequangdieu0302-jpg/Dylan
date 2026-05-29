import { createClient } from '@supabase/supabase-js'

// ============================================================
// CONFIGURATION
// Add these to your environment variables or a local .env file
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables.')
  process.exit(1)
}

// Initialise Supabase Client with service_role key to bypass RLS policies
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function syncResults() {
  console.log('=== STARTING WORLD CUP MATCH SYNC ===')
  
  try {
    // 1. Fetch matches from database that are NOT finished yet
    const { data: dbMatches, error: dbError } = await supabase
      .from('matches')
      .select('id, external_id, status, home_team_id, away_team_id')
      .neq('status', 'finished')

    if (dbError) throw dbError
    if (!dbMatches || dbMatches.length === 0) {
      console.log('No unfinished matches found in database. Sync complete.')
      return
    }

    console.log(`Found ${dbMatches.length} unfinished matches in database.`)

    // 2. Fetch match updates from Football-Data.org
    // competition 'WC' represents the FIFA World Cup
    const headers = FOOTBALL_DATA_API_KEY ? { 'X-Auth-Token': FOOTBALL_DATA_API_KEY } : {}
    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Failed to fetch from Football-Data API: ${response.status} ${errText}`)
    }

    const apiData = await response.json()
    const apiMatches = apiData.matches || []
    console.log(`Fetched ${apiMatches.length} matches from Football-Data API.`)

    // 3. Compare and update
    let updatedCount = 0

    for (const dbMatch of dbMatches) {
      // Find matching match in the API response using external_id (e.g. Football-Data match ID)
      // Or fallback: match by team names/coordinates if external_id is not set.
      const apiMatch = apiMatches.find(m => String(m.id) === String(dbMatch.external_id))

      if (!apiMatch) {
        // Log a warning and skip
        console.warn(`[Warning] No matching API match found for local match ID: ${dbMatch.id} (external_id: ${dbMatch.external_id})`)
        continue
      }

      const apiStatus = apiMatch.status // 'SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED', etc.
      const isApiFinished = apiStatus === 'FINISHED'

      // Check if match is finished in the API but not yet finished in our DB
      if (isApiFinished && dbMatch.status !== 'finished') {
        const homeScore = apiMatch.score.fullTime.home
        const awayScore = apiMatch.score.fullTime.away

        if (homeScore === null || awayScore === null) {
          console.warn(`[Warning] Match ${dbMatch.id} is marked FINISHED by API but has null scores. Skipping.`)
          continue
        }

        // Determine result string for our database
        let result = 'draw'
        if (homeScore > awayScore) result = 'home'
        else if (awayScore > homeScore) result = 'away'

        console.log(`Updating Match ID: ${dbMatch.id} | Results: ${homeScore} - ${awayScore} (${result})`)

        // Execute Supabase RPC function which updates the match and scores predictions automatically
        const { error: rpcError } = await supabase.rpc('set_match_result', {
          p_match_id: dbMatch.id,
          p_home_score: homeScore,
          p_away_score: awayScore,
          p_result: result
        })

        if (rpcError) {
          console.error(`Error executing set_match_result for match ${dbMatch.id}:`, rpcError)
        } else {
          console.log(`Successfully scored and updated Match ID: ${dbMatch.id}`)
          updatedCount++
        }
      } else if (apiStatus === 'IN_PLAY' && dbMatch.status !== 'live') {
        // Optional: Update status to 'live' if match is currently playing
        console.log(`Setting Match ID ${dbMatch.id} status to LIVE.`)
        await supabase
          .from('matches')
          .update({ status: 'live' })
          .eq('id', dbMatch.id)
      }
    }

    console.log(`=== SYNC COMPLETE. Updated and scored ${updatedCount} matches. ===`)
  } catch (error) {
    console.error('ERROR during sync process:', error)
  }
}

syncResults()
