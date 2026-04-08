'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { VALUES_QUESTIONS } from '@/lib/values'
import { INTERESTS } from '@/lib/interests'

const PROMPTS = [
  // Core values & character
  "The value I refuse to compromise on…",
  "Something I've changed my mind about in the last year…",
  "The moment I felt most proud of myself…",
  "I know I've grown when I realized…",
  "The thing I'm actively working on about myself…",
  // Emotional style
  "When I'm overwhelmed, I tend to…",
  "The way I show love that people often miss…",
  "What I need most when something goes wrong…",
  "My biggest emotional blind spot is probably…",
  "The last time I was genuinely vulnerable was…",
  // Partnership
  "The kind of partner I'm actively trying to be…",
  "My non-negotiable in a relationship…",
  "I fall for people who…",
  "The thing I hope my future partner understands about me…",
  "I know it's real when…",
  // Life & ambition
  "In five years, I see myself…",
  "The chapter of my life I'm currently in…",
  "My relationship with ambition looks like…",
  "The thing I want to build in my lifetime…",
  "My family shaped me by…",
  // Deeper personality
  "The question I wish people asked me more…",
  "I feel most like myself when…",
  "The thing that scares me most about falling in love…",
  "My relationship with social media is…",
  "The hill I will die on…",
]

const RELIGIONS = ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Buddhist', 'Spiritual', 'Agnostic', 'Atheist', 'Other', 'Prefer not to say']
const GENDERS = ['Man', 'Woman', 'Non-binary']
const SEXUALITIES = ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Asexual', 'Queer', 'Prefer not to say']
const RACES = ['Asian', 'Black / African American', 'Hispanic / Latino', 'Middle Eastern', 'Native American', 'Pacific Islander', 'White / Caucasian', 'Mixed / Multiracial', 'Prefer not to say']

const HEIGHTS: string[] = []
for (let ft = 4; ft <= 7; ft++) {
  const maxIn = ft === 7 ? 0 : 11
  for (let inc = (ft === 4 ? 8 : 0); inc <= maxIn; inc++) HEIGHTS.push(`${ft}'${inc}"`)
}

// Steps: Name, About, Identity, Values, Interests, Prompt, Photo
const STEPS = ['Name', 'About', 'Identity', 'Values', 'Interests', 'Prompt', 'Photo']

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

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selected ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
      {label}
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [gender, setGender] = useState('')
  const [sexuality, setSexuality] = useState('')
  const [height, setHeight] = useState('')
  const [race, setRace] = useState('')
  const [religion, setReligion] = useState('')
  const [valuesAnswers, setValuesAnswers] = useState<Record<string, string>>({})
  const [interests, setInterests] = useState<string[]>([])
  const [promptIndex, setPromptIndex] = useState(0)
  const [promptAnswer, setPromptAnswer] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setAnswer = (id: string, option: string) =>
    setValuesAnswers(prev => ({ ...prev, [id]: option }))

  const toggleInterest = (item: string) =>
    setInterests(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const finish = async () => {
    if (!photoFile) { setError('Please add a photo before finishing.'); return }
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('No session found — try signing in again.'); setSaving(false); return }

      const storagePath = `${user.id}/avatar`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, photoFile, { upsert: true, contentType: photoFile.type })
      if (uploadError) { setError('Photo upload failed: ' + uploadError.message); setSaving(false); return }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath)
      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`
      const coords = await getCoords()

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        name,
        birthday: birthday || null,
        major,
        year,
        gender: gender || null,
        sexuality: sexuality || null,
        height: height || null,
        race: race || null,
        religion: religion || null,
        values_answers: valuesAnswers,
        interests,
        prompt: PROMPTS[promptIndex],
        prompt_answer: promptAnswer,
        photo_url: photoUrl,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      })

      if (upsertError) { setError(upsertError.message); setSaving(false); return }
      router.push('/discover')
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const answeredCount = Object.keys(valuesAnswers).length
  const isValuesStep = step === 3
  const isInterestsStep = step === 4

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-pink-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Step 0 — Name + Birthday */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">What's your name?</h2>
              <input className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400"
                placeholder="First name" value={name} onChange={e => setName(e.target.value)} />
              <input type="date"
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 text-gray-700"
                value={birthday} onChange={e => setBirthday(e.target.value)} />
              <p className="text-xs text-gray-400 -mt-2">Your birthday is used to show your age</p>
            </div>
          )}

          {/* Step 1 — Major + Year */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">Tell us about yourself</h2>
              <input className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400"
                placeholder="Major" value={major} onChange={e => setMajor(e.target.value)} />
              <input className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400"
                placeholder="Year (e.g. Junior)" value={year} onChange={e => setYear(e.target.value)} />
            </div>
          )}

          {/* Step 2 — Identity */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-2xl font-bold">Identity</h2>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Gender</p>
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map(g => <Chip key={g} label={g} selected={gender === g} onClick={() => setGender(g)} />)}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Sexuality</p>
                <div className="flex flex-wrap gap-2">
                  {SEXUALITIES.map(s => <Chip key={s} label={s} selected={sexuality === s} onClick={() => setSexuality(s)} />)}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Height</p>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 text-gray-700"
                  value={height} onChange={e => setHeight(e.target.value)}>
                  <option value="">Select height</option>
                  {HEIGHTS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Race / Ethnicity</p>
                <div className="flex flex-wrap gap-2">
                  {RACES.map(r => <Chip key={r} label={r} selected={race === r} onClick={() => setRace(r)} />)}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Religion</p>
                <div className="flex flex-wrap gap-2">
                  {RELIGIONS.map(r => <Chip key={r} label={r} selected={religion === r} onClick={() => setReligion(r)} />)}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Values */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-bold">Your values</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Answer what you're comfortable with — this drives who you're matched with.
                  <span className="ml-1 text-pink-500">{answeredCount}/{VALUES_QUESTIONS.length}</span>
                </p>
              </div>
              {VALUES_QUESTIONS.map(q => (
                <div key={q.id} className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-gray-800">{q.question}</p>
                  <div className="flex flex-col gap-1.5">
                    {q.options.map(opt => (
                      <button key={opt} type="button" onClick={() => setAnswer(q.id, opt)}
                        className={`text-left px-4 py-2.5 rounded-xl text-sm border transition-colors ${
                          valuesAnswers[q.id] === opt
                            ? 'border-pink-400 bg-pink-50 text-pink-800'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4 — Interests */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-2xl font-bold">Your interests</h2>
                <p className="text-sm text-gray-400 mt-1">Pick as many as you like.{interests.length > 0 && <span className="ml-1 text-pink-500">{interests.length} selected</span>}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(item => (
                  <Chip key={item} label={item} selected={interests.includes(item)} onClick={() => toggleInterest(item)} />
                ))}
              </div>
            </div>
          )}

          {/* Step 5 — Prompt */}
          {step === 5 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">Answer a prompt</h2>
              <div className="flex flex-col gap-2">
                {PROMPTS.map((p, i) => (
                  <button key={i} type="button" onClick={() => setPromptIndex(i)}
                    className={`text-left px-4 py-3 rounded-xl text-sm border transition-colors ${
                      promptIndex === i ? 'border-pink-400 bg-pink-50 text-pink-800' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
              <textarea
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 resize-none"
                rows={3} placeholder="Your answer…"
                value={promptAnswer} onChange={e => setPromptAnswer(e.target.value)} />
            </div>
          )}

          {/* Step 6 — Photo */}
          {step === 6 && (
            <div className="flex flex-col gap-5 items-center">
              <h2 className="text-2xl font-bold self-start">Add your photo</h2>
              <p className="text-sm text-gray-500 self-start -mt-2">
                Stays blurred until photos are revealed — after 2 days or when you both agree to a date.
              </p>
              <label className="cursor-pointer w-full">
                <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview"
                    className="w-48 h-48 rounded-full object-cover border-4 border-pink-300 mx-auto" />
                ) : (
                  <div className="w-48 h-48 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 mx-auto hover:border-pink-400 transition-colors">
                    <span className="text-4xl">📷</span>
                    <span className="text-xs text-gray-400">Tap to upload</span>
                  </div>
                )}
              </label>
              {photoPreview && (
                <label className="text-xs text-pink-500 cursor-pointer hover:text-pink-700 underline">
                  <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
                  Change photo
                </label>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:border-gray-400 transition-colors">
                Back
              </button>
            )}
            <button type="button"
              onClick={step < STEPS.length - 1 ? () => setStep(s => s + 1) : finish}
              disabled={saving || (step === STEPS.length - 1 && !photoFile)}
              className="flex-1 bg-pink-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
              {step < STEPS.length - 1
                ? isValuesStep && answeredCount < 5
                  ? `Skip (${answeredCount} answered)`
                  : isInterestsStep && interests.length === 0
                  ? 'Skip'
                  : 'Next'
                : saving ? 'Saving…' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
