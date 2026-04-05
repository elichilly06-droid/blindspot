'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PROMPTS = [
  'My ideal Sunday looks like…',
  'A fun fact about me is…',
  "I'm convinced that…",
  'People are surprised when they find out…',
]

const INTERESTS = [
  'Hiking', 'Coffee', 'Film', 'Music', 'Startups', 'Gaming',
  'Cooking', 'Running', 'Art', 'Travel', 'Books', 'Fitness',
]

const STEPS = ['Name', 'About', 'Interests', 'Prompt']

function getCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    )
  })
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [promptIndex, setPromptIndex] = useState(0)
  const [promptAnswer, setPromptAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = (i: string) =>
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const finish = async () => {
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('No session found — try signing in again.')
        setSaving(false)
        return
      }

      const coords = await getCoords()

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        name,
        birthday: birthday || null,
        major,
        year,
        interests,
        prompt: PROMPTS[promptIndex],
        prompt_answer: promptAnswer,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      })

      if (upsertError) {
        setError(upsertError.message)
        setSaving(false)
        return
      }

      router.push('/discover')
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-pink-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">What's your name?</h2>
              <input
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400"
                placeholder="First name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                type="date"
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 text-gray-700"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
              />
              <p className="text-xs text-gray-400 -mt-2">Your birthday (used to show your age)</p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">Tell us about yourself</h2>
              <input
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400"
                placeholder="Major"
                value={major}
                onChange={e => setMajor(e.target.value)}
              />
              <input
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400"
                placeholder="Year (e.g. Junior)"
                value={year}
                onChange={e => setYear(e.target.value)}
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">Pick your interests</h2>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(i => (
                  <button
                    key={i}
                    onClick={() => toggle(i)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      interests.includes(i) ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">Answer a prompt</h2>
              <div className="flex flex-col gap-2">
                {PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPromptIndex(i)}
                    className={`text-left px-4 py-3 rounded-xl text-sm border transition-colors ${
                      promptIndex === i ? 'border-pink-400 bg-pink-50 text-pink-800' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <textarea
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 resize-none"
                rows={3}
                placeholder="Your answer…"
                value={promptAnswer}
                onChange={e => setPromptAnswer(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          <div className="flex gap-3 mt-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:border-gray-400 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={step < STEPS.length - 1 ? () => setStep(s => s + 1) : finish}
              disabled={saving}
              className="flex-1 bg-pink-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {step < STEPS.length - 1 ? 'Next' : saving ? 'Saving…' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
