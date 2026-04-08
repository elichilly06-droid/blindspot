'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getPasswordError } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ready, setReady] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const passwordError = useMemo(() => {
    if (!password) return ''
    return getPasswordError(password)
  }, [password])

  const confirmError = useMemo(() => {
    if (!confirmPassword) return ''
    return password === confirmPassword ? '' : 'Passwords do not match.'
  }, [confirmPassword, password])

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setHasRecoverySession(!!data.session)
      setReady(true)
    }

    loadSession()

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasRecoverySession(!!session)
        setReady(true)
      }
      if (event === 'SIGNED_OUT') {
        setHasRecoverySession(false)
        setReady(true)
      }
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!hasRecoverySession) {
      setError('This reset link is invalid or has expired. Request a new one from the login page.')
      return
    }
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (confirmError) {
      setError(confirmError)
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess('Password updated. Redirecting you back to sign in…')
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-pink-500 font-black text-4xl tracking-tight mb-6">blindspot</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Set a new password</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Choose a new password for your Northeastern account login.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col gap-4">
          {!ready ? (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hasRecoverySession ? (
            <>
              <div className="flex flex-col gap-1.5">
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 transition-colors"
                  autoComplete="new-password"
                />
                {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 transition-colors"
                  autoComplete="new-password"
                />
                {confirmError && <p className="text-xs text-red-500">{confirmError}</p>}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              This reset link is invalid or has expired. Request a fresh reset link from the login page.
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading || !ready || !hasRecoverySession}
            className="bg-pink-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>

          <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors text-center">
            Back to sign in
          </Link>
        </form>
      </div>
    </div>
  )
}
