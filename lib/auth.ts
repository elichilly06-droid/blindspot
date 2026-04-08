import { supabase } from './supabase'

const ALLOWED_DOMAIN = 'northeastern.edu'

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isAllowedEmail(email: string) {
  return normalizeEmail(email).endsWith(`@${ALLOWED_DOMAIN}`)
}

export function getPasswordError(password: string) {
  if (password.length < 8) return 'Use at least 8 characters.'
  if (!/[a-z]/i.test(password)) return 'Include at least one letter.'
  if (!/\d/.test(password)) return 'Include at least one number.'
  return ''
}

export async function signInWithEmail(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email)

  if (!isAllowedEmail(normalizedEmail))
    throw new Error('Only @northeastern.edu accounts are allowed')

  return supabase.auth.signInWithPassword({ email: normalizedEmail, password })
}

export async function signUp(email: string, password: string, emailRedirectTo?: string) {
  const normalizedEmail = normalizeEmail(email)

  if (!isAllowedEmail(normalizedEmail))
    throw new Error('Only @northeastern.edu accounts are allowed')

  const passwordError = getPasswordError(password)
  if (passwordError) throw new Error(passwordError)

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  })

  return { data, error }
}
