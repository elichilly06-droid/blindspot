'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getPasswordError,
  isAllowedEmail,
  normalizeEmail,
  signInWithEmail,
  signUp,
} from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type AuthMode = 'sign-in' | 'sign-up' | 'forgot'

const RESET_COOLDOWN_SECONDS = 30

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'Confirm your email before signing in.'
  }
  if (normalized.includes('already registered')) {
    return 'That account already exists. Try signing in instead.'
  }
  if (normalized.includes('password should be')) {
    return 'Use a stronger password and try again.'
  }

  return 'Something went wrong. Please try again.'
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email])
  const emailError = useMemo(() => {
    if (!email) return ''
    if (!normalizedEmail.includes('@')) return 'Enter your Northeastern email.'
    if (!isAllowedEmail(normalizedEmail)) return 'Use your @northeastern.edu email.'
    return ''
  }, [email, normalizedEmail])

  const passwordError = useMemo(() => {
    if (mode !== 'sign-up' || !password) return ''
    return getPasswordError(password)
  }, [mode, password])

  useEffect(() => {
    if (cooldownRemaining <= 0) return

    const timeout = window.setTimeout(() => {
      setCooldownRemaining(value => Math.max(0, value - 1))
    }, 1000)

    return () => window.clearTimeout(timeout)
  }, [cooldownRemaining])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setPassword('')
    setAwaitingConfirmation(false)
    resetMessages()
  }

  const getValidationError = () => {
    if (!email) return 'Enter your Northeastern email.'
    if (emailError) return emailError
    if (mode === 'forgot') return ''
    if (!password) return 'Enter your password.'
    if (mode === 'sign-up' && passwordError) return passwordError
    return ''
  }

  const sendResetLink = async () => {
    const validationError = getValidationError()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(getAuthErrorMessage(resetError.message))
      setLoading(false)
      return
    }

    setSuccess("If that email is registered, you'll receive a reset link shortly.")
    setCooldownRemaining(RESET_COOLDOWN_SECONDS)
    setLoading(false)
  }

  const resendConfirmation = async () => {
    if (emailError) {
      setError(emailError)
      return
    }

    setLoading(true)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (resendError) {
      setError(getAuthErrorMessage(resendError.message))
      setLoading(false)
      return
    }

    setSuccess('Confirmation email resent. Check your inbox.')
    setCooldownRemaining(RESET_COOLDOWN_SECONDS)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()
    setAwaitingConfirmation(false)

    if (mode === 'forgot') {
      await sendResetLink()
      return
    }

    const validationError = getValidationError()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      if (mode === 'sign-up') {
        const { data, error: signUpError } = await signUp(
          normalizedEmail,
          password,
          `${window.location.origin}/login`
        )

        if (signUpError) {
          setError(getAuthErrorMessage(signUpError.message))
        } else if (!data.session) {
          setAwaitingConfirmation(true)
          setSuccess('Check your email to confirm your account before signing in.')
        } else {
          router.push('/onboarding')
        }
      } else {
        const { error: signInError } = await signInWithEmail(normalizedEmail, password)
        if (signInError) {
          setError(getAuthErrorMessage(signInError.message))
        } else {
          router.push('/discover')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      if (message.includes('northeastern.edu') || message.includes('Use at least')) {
        setError(message)
      } else {
        setError(getAuthErrorMessage(message))
      }
    } finally {
      setLoading(false)
    }
  }

  const heading = mode === 'forgot'
    ? { title: 'Reset your password', sub: "We'll send you a link to get back in" }
    : mode === 'sign-up'
    ? { title: 'Create your account', sub: 'Join Blindspot with your @northeastern.edu email' }
    : { title: 'Welcome back', sub: 'Sign in to your Blindspot account' }

  const submitDisabled =
    loading ||
    !!emailError ||
    (mode !== 'forgot' && !password) ||
    (mode === 'sign-up' && !!passwordError)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-pink-500 font-black text-4xl tracking-tight mb-6">blindspot</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{heading.title}</h1>
          <p className="text-gray-400 mt-2 text-sm">{heading.sub}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col gap-4">
          {mode !== 'forgot' ? (
            <div className="grid grid-cols-2 rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => switchMode('sign-in')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'sign-in' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode('sign-up')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'sign-up' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Create account
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('sign-in')}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors text-left"
            >
              ← Back to sign in
            </button>
          )}

          <div className="flex flex-col gap-1.5">
            <input
              type="email"
              placeholder="you@northeastern.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 transition-colors"
              autoComplete="email"
              required
            />
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
          </div>

          {mode !== 'forgot' && (
            <div className="flex flex-col gap-1.5">
              <input
                type="password"
                placeholder={mode === 'sign-up' ? 'Create a password' : 'Password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 transition-colors"
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                required
              />
              {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
              {mode === 'sign-up' && !passwordError && (
                <p className="text-xs text-gray-400">Use at least 8 characters with a letter and a number.</p>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={submitDisabled}
            className="bg-pink-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 mt-1"
          >
            {loading ? '…' : mode === 'forgot' ? 'Send reset link' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
          </button>

          {awaitingConfirmation && mode === 'sign-up' && (
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={loading || cooldownRemaining > 0 || !!emailError}
              className="text-sm text-pink-500 hover:text-pink-700 transition-colors disabled:opacity-50"
            >
              {cooldownRemaining > 0
                ? `Resend confirmation in ${cooldownRemaining}s`
                : 'Resend confirmation email'}
            </button>
          )}

          <button
            type="button"
            onClick={() => switchMode(mode === 'forgot' ? 'sign-in' : 'forgot')}
            className="text-sm text-pink-400 hover:text-pink-600 transition-colors"
          >
            {mode === 'forgot'
              ? 'Need to sign in instead?'
              : cooldownRemaining > 0 && mode === 'sign-in'
              ? `Reset email cooldown: ${cooldownRemaining}s`
              : 'Forgot password?'}
          </button>

          <div className="rounded-xl bg-pink-50 border border-pink-100 px-4 py-3 text-xs text-gray-600 leading-5">
            Blindspot is limited to Northeastern email accounts. After account creation, first-time users go through onboarding and photos stay hidden until the app reveals them.
          </div>
        </form>
      </div>
    </div>
  )
}
