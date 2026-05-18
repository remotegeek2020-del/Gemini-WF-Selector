import { createServerClient } from '@/lib/supabase/server'

export interface UserRole {
  user_id: string
  role: 'agency_admin' | 'sub_account'
  account_id: string | null
}

export async function getCurrentUser() {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role, account_id')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as UserRole
}
