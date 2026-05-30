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
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : ''
        const isAuthRequest = urlStr.includes('/auth/v1/')

        const res = await fetch(url, options)
        
        // Only intercept database/storage requests that return 401 Unauthorized
        if (res.status === 401 && !isAuthRequest) {
          const clone = res.clone()
          try {
            const body = await clone.json()
            const msg = body?.message?.toLowerCase() || ''
            if (msg.includes('jwt') || msg.includes('expired') || msg.includes('token') || msg.includes('invalid')) {
              console.log('[Supabase Client] JWT expired/invalid. Attempting to refresh session...')

              const headers = { ...(options?.headers || {}) } as Record<string, string>
              
              // Prevent infinite retry loop if we already retried this request
              if (headers['X-Retry-Auth']) {
                console.warn('[Supabase Client] Token refresh retry failed twice. Reverting to guest...')
                const { clearUser } = useAuthStore.getState()
                clearUser()

                const guestOptions = { ...options }
                const guestHeaders = { ...headers }
                delete guestHeaders['Authorization']
                delete guestHeaders['authorization']
                guestOptions.headers = guestHeaders
                return fetch(url, guestOptions)
              }

              // Attempt to refresh the Supabase session
              const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

              if (session && !refreshError) {
                console.log('[Supabase Client] Session refreshed successfully. Retrying original request...')
                
                const retryOptions = { ...options }
                const retryHeaders = { ...headers }
                retryHeaders['Authorization'] = `Bearer ${session.access_token}`
                retryHeaders['X-Retry-Auth'] = 'true'
                retryOptions.headers = retryHeaders
                
                return fetch(url, retryOptions)
              } else {
                console.warn('[Supabase Client] Session refresh failed. Logging out and retrying as guest...')
                const { clearUser } = useAuthStore.getState()
                clearUser()

                const guestOptions = { ...options }
                const guestHeaders = { ...headers }
                delete guestHeaders['Authorization']
                delete guestHeaders['authorization']
                guestHeaders['X-Retry-Auth'] = 'true'
                guestOptions.headers = guestHeaders
                return fetch(url, guestOptions)
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
