import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export interface RegisterData {
  email: string
  password: string
  username: string
  company_id: string
}

export interface LoginData {
  email: string
  password: string
}

export async function registerUser(data: RegisterData) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        username: data.username,
        company_id: data.company_id,
      },
    },
  })
  if (authError) throw authError

  // Fallback: nếu trigger on_auth_user_created chưa chạy trên Supabase,
  // tự insert profile để đảm bảo user có thể dùng app ngay.
  if (authData.user) {
    try {
      // Chờ 500ms để trigger có cơ hội chạy trước
      await new Promise((r) => setTimeout(r, 500))

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single()

      if (!existing) {
        // Trigger chưa tạo profile → tự tạo
        const { error: insertError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          username: data.username,
          company_id: data.company_id || null,
          role: 'user',
        })
        if (insertError) {
          console.warn('[registerUser] fallback profile insert failed:', insertError.message)
        } else {
          console.log('[registerUser] fallback profile created successfully')
        }
      }
    } catch (e) {
      console.warn('[registerUser] profile check/create error:', e)
    }
  }

  return authData
}

export async function loginUser(data: LoginData) {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })
  if (error) throw error
  return authData
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, company:companies(*)')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as Profile
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
