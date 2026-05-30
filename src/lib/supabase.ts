import { createClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

console.log('[Supabase Client] URL:', supabaseUrl, 'AnonKey length:', supabaseAnonKey ? supabaseAnonKey.length : 0)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env vars. Check .env.local')
}

let activeRefreshPromise: Promise<{ data: { session: any }; error: any }> | null = null

function getSharedRefreshPromise() {
  if (!activeRefreshPromise) {
    activeRefreshPromise = supabase.auth.refreshSession().finally(() => {
      activeRefreshPromise = null
    })
  }
  return activeRefreshPromise
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
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : ''
        const isAuthRequest = urlStr.includes('/auth/v1/')

        const res = await fetch(url, options)
        
        // Only intercept database/storage requests that return errors
        if ((res.status === 400 || res.status === 401 || res.status === 403) && !isAuthRequest) {
          const clone = res.clone()
          try {
            const body = await clone.json()
            const msg = body?.message?.toLowerCase() || ''
            if (msg.includes('jwt') || msg.includes('expired') || msg.includes('token') || msg.includes('invalid') || body?.code === 'PGRST301') {
              console.log('[Supabase Client] JWT expired/invalid. Attempting to refresh session...')

              const reqHeaders = new Headers(options?.headers)
              
              // Prevent infinite retry loop if we already retried this request
              if (reqHeaders.has('X-Retry-Auth') || reqHeaders.has('x-retry-auth')) {
                console.warn('[Supabase Client] Token refresh retry failed twice. Reverting to guest...')
                const { clearUser } = useAuthStore.getState()
                clearUser()
                try {
                  await supabase.auth.signOut()
                } catch (e) {
                  // Ignore
                }
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const key = localStorage.key(i)
                  if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    localStorage.removeItem(key)
                  }
                }

                reqHeaders.delete('Authorization')
                reqHeaders.delete('authorization')
                return fetch(url, { ...options, headers: reqHeaders })
              }

              // Attempt to refresh the Supabase session (shared to prevent concurrent collisions)
              const { data: { session }, error: refreshError } = await getSharedRefreshPromise()

              if (session && !refreshError) {
                console.log('[Supabase Client] Session refreshed successfully. Retrying original request...')
                
                reqHeaders.set('Authorization', `Bearer ${session.access_token}`)
                reqHeaders.set('X-Retry-Auth', 'true')
                return fetch(url, { ...options, headers: reqHeaders })
              } else {
                console.warn('[Supabase Client] Session refresh failed. Logging out and retrying as guest...')
                const { clearUser } = useAuthStore.getState()
                clearUser()
                try {
                  await supabase.auth.signOut()
                } catch (e) {
                  // Ignore
                }
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const key = localStorage.key(i)
                  if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    localStorage.removeItem(key)
                  }
                }

                reqHeaders.delete('Authorization')
                reqHeaders.delete('authorization')
                reqHeaders.set('X-Retry-Auth', 'true')
                return fetch(url, { ...options, headers: reqHeaders })
              }
            }
          } catch (e) {
            // Ignore body JSON parse errors
          }
        }
        return res
      }
    }
  }
)
