import { supabase } from './supabase'

const ALLOWED_DOMAIN = 'northeastern.edu'

export async function signInWithEmail(email: string, password: string) {
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`))
    throw new Error('Only @northeastern.edu accounts are allowed')
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`))
    throw new Error('Only @northeastern.edu accounts are allowed')
  return supabase.auth.signUp({ email, password })
}
