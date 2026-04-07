'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmail, signUp } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (isForgot) {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        // Always show success to avoid leaking whether email exists
        setSuccess("If that email is registered, you'll receive a reset link shortly.")
      } else {
        if (isSignUp) {
          const { data, error } = await signUp(email, password)
          if (error) {
            setError('Could not create account. Try a different email or check your details.')
          } else if (!data.session) {
            setSuccess('Check your email to confirm your account before signing in.')
          } else {
            router.push('/onboarding')
          }
        } else {
          const { error } = await signInWithEmail(email, password)
          if (error) {
            setError('Invalid email or password.')
          } else {
            router.push('/discover')
          }
        }
      }
    } catch (e: any) {
      // Keep domain restriction message since it's intentional UX
      if (e.message?.includes('northeastern.edu')) {
        setError(e.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-pink-500 tracking-tight">blindspot</h1>
          <p className="text-gray-500 mt-2 text-sm">Matching for Northeastern students</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col gap-4">
          <input
            type="email"
            placeholder="you@northeastern.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 transition-colors"
            required
          />

          {!isForgot && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 transition-colors"
              required
            />
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-pink-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 mt-1"
          >
            {loading ? '…' : isForgot ? 'Send reset link' : isSignUp ? 'Create account' : 'Sign in'}
          </button>

          {!isForgot && (
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          )}

          <button
            type="button"
            onClick={() => { setIsForgot(!isForgot); setError(''); setSuccess('') }}
            className="text-sm text-pink-400 hover:text-pink-600 transition-colors"
          >
            {isForgot ? '← Back to sign in' : 'Forgot password?'}
          </button>
        </form>
      </div>
    </div>
  )
}
