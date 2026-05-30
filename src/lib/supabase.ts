import { createClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

console.log('[Supabase Client] URL:', supabaseUrl, 'AnonKey length:', supabaseAnonKey ? supabaseAnonKey.length : 0)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env vars. Check .env.local')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: async (url, options) => {
        const res = await fetch(url, options)
        if (res.status === 401) {
          const clone = res.clone()
          try {
            const body = await clone.json()
            const msg = body?.message?.toLowerCase() || ''
            if (msg.includes('jwt') || msg.includes('expired') || msg.includes('token') || msg.includes('invalid')) {
              console.warn('[Supabase Client] JWT expired/invalid token detected. Logging out...')
              const { clearUser } = useAuthStore.getState()
              clearUser()
              setTimeout(async () => {
                try {
                  await supabase.auth.signOut()
                } catch (e) {
                  console.error(e)
                } finally {
                  window.location.reload()
                }
              }, 10)
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        return res
      }
    }
  }
)
