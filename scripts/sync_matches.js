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

// Helper function to normalize team names for robust matching
function normalizeName(name) {
  if (!name) return ''
  let normalized = name.toLowerCase()
  
  // Normalize Unicode characters (strip accents like in Côte d'Ivoire, Curaçao, Türkiye)
  normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  
  // Replace symbols and standardise spaces
  normalized = normalized.replace(/&/g, 'and')
  normalized = normalized.replace(/[-\s]+/g, ' ')
  
  // Apply direct mappings for known mismatches between DB and Football-Data API
  const mappings = {
    'cote d\'ivoire': 'ivory coast',
    'cote divoire': 'ivory coast',
    'turkiye': 'turkey',
    'czechia': 'czech republic',
    'democratic republic of the congo': 'dr congo',
    'congo dr': 'dr congo',
    'united states': 'usa',
    'united states of america': 'usa',
    'cabo verde': 'cape verde',
    'korea republic': 'south korea',
    'republic of korea': 'south korea',
    'korea': 'south korea'
  }
  
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized === key || normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }
  
  return normalized
}

async function syncResults() {
  console.log('=== STARTING WORLD CUP MATCH SYNC ===')
  
  try {
    // 1. Fetch all matches from database (to match placeholders 'local_2026_x' even if manually marked finished)
    const { data: dbMatches, error: dbError } = await supabase
      .from('matches')
      .select(`
        id, 
        external_id, 
        status, 
        home_team_id, 
        away_team_id,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)

    if (dbError) throw dbError
    if (!dbMatches || dbMatches.length === 0) {
      console.log('No matches found in database. Sync complete.')
      return
    }

    console.log(`Found ${dbMatches.length} matches in database.`)

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
      let apiMatch = apiMatches.find(m => String(m.id) === String(dbMatch.external_id))

      if (!apiMatch) {
        // Fallback: match by team names (fuzzy matching English names)
        const localHomeName = dbMatch.home_team?.name || ''
        const localAwayName = dbMatch.away_team?.name || ''

        if (localHomeName && localAwayName) {
          const normLocalHome = normalizeName(localHomeName)
          const normLocalAway = normalizeName(localAwayName)

          apiMatch = apiMatches.find(m => {
            const apiHomeName = m.homeTeam?.name || ''
            const apiAwayName = m.awayTeam?.name || ''
            const apiHomeShort = m.homeTeam?.shortName || ''
            const apiAwayShort = m.awayTeam?.shortName || ''
            const apiHomeTla = m.homeTeam?.tla?.toLowerCase() || ''
            const apiAwayTla = m.awayTeam?.tla?.toLowerCase() || ''

            const normApiHomeName = normalizeName(apiHomeName)
            const normApiAwayName = normalizeName(apiAwayName)
            const normApiHomeShort = normalizeName(apiHomeShort)
            const normApiAwayShort = normalizeName(apiAwayShort)

            // Compare names (exact, shortName, tla, or substring matches)
            const isHomeMatch = normApiHomeName === normLocalHome || 
                                normApiHomeShort === normLocalHome || 
                                apiHomeTla === normLocalHome || 
                                normLocalHome.includes(normApiHomeName) || 
                                normApiHomeName.includes(normLocalHome)

            const isAwayMatch = normApiAwayName === normLocalAway || 
                                normApiAwayShort === normLocalAway || 
                                apiAwayTla === normLocalAway || 
                                normLocalAway.includes(normApiAwayName) || 
                                normApiAwayName.includes(normLocalAway)

            return isHomeMatch && isAwayMatch
          })

          if (apiMatch) {
            console.log(`[Fuzzy Match] Mapped local match ID ${dbMatch.id} (${dbMatch.home_team?.name} vs ${dbMatch.away_team?.name}) -> API Match ID: ${apiMatch.id}`)
            
            // Save the resolved external_id back to database so next run matches instantly by ID
            const { error: updateErr } = await supabase
              .from('matches')
              .update({ external_id: String(apiMatch.id) })
              .eq('id', dbMatch.id)

            if (updateErr) {
              console.warn(`[Warning] Failed to update external_id for match ${dbMatch.id}:`, updateErr.message)
            } else {
              console.log(`[Database] Auto-updated external_id = '${apiMatch.id}' for match ${dbMatch.id}`)
              dbMatch.external_id = String(apiMatch.id) // update local ref
            }
          }
        }
      }

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
