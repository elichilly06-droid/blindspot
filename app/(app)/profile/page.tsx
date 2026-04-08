'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { Avatar } from '@/components/Avatar'
import { Tag } from '@/components/Tag'
import { INTERESTS } from '@/lib/interests'
import { VALUES_QUESTIONS } from '@/lib/values'
import { SwipeCard } from '@/components/SwipeCard'

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

const GENDERS = ['Man', 'Woman', 'Non-binary']
const SEXUALITIES = ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Asexual', 'Queer', 'Prefer not to say']
const RACES = ['Asian', 'Black / African American', 'Hispanic / Latino', 'Middle Eastern', 'Native American', 'Pacific Islander', 'White / Caucasian', 'Mixed / Multiracial', 'Prefer not to say']
const RELIGIONS = ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Buddhist', 'Spiritual', 'Agnostic', 'Atheist', 'Other', 'Prefer not to say']
const HEIGHTS: string[] = []
for (let ft = 4; ft <= 7; ft++) {
  const maxIn = ft === 7 ? 0 : 11
  for (let inc = (ft === 4 ? 8 : 0); inc <= maxIn; inc++) HEIGHTS.push(`${ft}'${inc}"`)
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selected ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
      {label}
    </button>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  const { profile, loading, updateProfile } = useProfile(userId ?? '')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [gender, setGender] = useState('')
  const [sexuality, setSexuality] = useState('')
  const [height, setHeight] = useState('')
  const [race, setRace] = useState('')
  const [religion, setReligion] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [valuesAnswers, setValuesAnswers] = useState<Record<string, string>>({})
  const [selectedPrompt, setSelectedPrompt] = useState('')
  const [promptAnswer, setPromptAnswer] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [birthday, setBirthday] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')
  const [locationName, setLocationName] = useState<string>('')
  const [extraPhotos, setExtraPhotos] = useState<string[]>([])
  const [photoUploading2, setPhotoUploading2] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setMajor(profile.major ?? '')
      setYear(profile.year ?? '')
      setGender(profile.gender ?? '')
      setSexuality(profile.sexuality ?? '')
      setHeight(profile.height ?? '')
      setRace(profile.race ?? '')
      setReligion(profile.religion ?? '')
      setBirthday(profile.birthday ?? '')
      setSelectedInterests(profile.interests ?? [])
      setValuesAnswers(profile.values_answers ?? {})
      setSelectedPrompt(profile.prompt ?? PROMPTS[0])
      setPromptAnswer(profile.prompt_answer ?? '')
      setLocationName(profile.location_name ?? '')
      setExtraPhotos(profile.photos ?? [])
    }
  }, [profile])

  // Upload immediately on file pick — no Save needed for photo
  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setPhotoUploading(true)
    setPhotoError('')
    setPhotoPreview(URL.createObjectURL(file))
    try {
      const storagePath = `${userId}/avatar`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, file, { upsert: true, contentType: file.type })
      if (uploadError) {
        setPhotoError('Upload failed: ' + uploadError.message)
        setPhotoPreview('')
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath)
      const photo_url = `${urlData.publicUrl}?t=${Date.now()}`
      const { error: saveError } = await updateProfile({ photo_url })
      if (saveError) {
        setPhotoError('Save failed: ' + saveError.message)
        setPhotoPreview('')
      }
    } finally {
      setPhotoUploading(false)
    }
  }

  const toggleInterest = (item: string) =>
    setSelectedInterests(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])

  const updateLocation = () => {
    if (!navigator.geolocation || !userId) return
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        // Reverse geocode to get a readable place name
        let location_name = ''
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const geo = await res.json()
          const a = geo.address ?? {}
          // Pick the most specific useful label: neighbourhood > suburb > quarter > city_district > city > town
          const area = a.neighbourhood || a.suburb || a.quarter || a.city_district || ''
          const city = a.city || a.town || a.village || a.county || ''
          location_name = [area, city].filter(Boolean).join(', ')
        } catch { /* ignore geocoding errors */ }

        const { error } = await updateProfile({ latitude, longitude, location_name })
        if (!error) setLocationName(location_name)
        setLocationStatus(error ? 'error' : 'saved')
        setTimeout(() => setLocationStatus('idle'), 3000)
      },
      () => {
        setLocationStatus('error')
        setTimeout(() => setLocationStatus('idle'), 3000)
      },
      { timeout: 8000 }
    )
  }

  const pickExtraPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setPhotoUploading2(true)
    try {
      const idx = extraPhotos.length
      const storagePath = `${userId}/photo_${idx}_${Date.now()}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, file, { upsert: true, contentType: file.type })
      if (uploadError) return
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath)
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`
      const updated = [...extraPhotos, newUrl]
      setExtraPhotos(updated)
      await updateProfile({ photos: updated })
    } finally {
      setPhotoUploading2(false)
    }
  }

  const removeExtraPhoto = async (url: string) => {
    const updated = extraPhotos.filter(p => p !== url)
    setExtraPhotos(updated)
    await updateProfile({ photos: updated })
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const { error } = await updateProfile({ name, major, year, gender, sexuality, height, race, religion, birthday, interests: selectedInterests, values_answers: valuesAnswers, prompt: selectedPrompt, prompt_answer: promptAnswer })
      if (error) setError(error.message)
      else setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const displayPhoto = photoPreview || profile.photo_url

  return (
    <>
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Avatar + location pill */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <label className="cursor-pointer relative">
            <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
            {displayPhoto ? (
              <img src={displayPhoto} className="w-24 h-24 rounded-full object-cover border-4 border-pink-200" alt="" />
            ) : (
              <Avatar uri={null} size={96} revealed />
            )}
            <span className="absolute bottom-0 right-0 bg-pink-500 text-white text-xs rounded-full w-7 h-7 flex items-center justify-center shadow-md">
              {photoUploading ? '…' : '✎'}
            </span>
          </label>
          {photoError && <p className="text-xs text-red-500">{photoError}</p>}
          {!displayPhoto && !photoUploading && (
            <p className="text-xs text-gray-400">Tap to add a photo</p>
          )}
          {!editing && <h2 className="text-xl font-bold">{profile.name}</h2>}

          {/* Location pill — Hinge-style, small pin + place name */}
          {!editing && (
            <button
              onClick={updateLocation}
              disabled={locationStatus === 'loading'}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-pink-500 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {locationStatus === 'loading' ? (
                <span>Updating…</span>
              ) : locationStatus === 'saved' ? (
                <span className="text-green-500">Updated</span>
              ) : (
                <span>{locationName || (profile.latitude ? 'Update location' : 'Add location')}</span>
              )}
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-4">
            <input className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-pink-400"
              value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
            <input className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-pink-400"
              value={major} onChange={e => setMajor(e.target.value)} placeholder="Major" />
            <input className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-pink-400"
              value={year} onChange={e => setYear(e.target.value)} placeholder="Year" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Birthday</p>
              <input type="date" className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-pink-400 w-full text-gray-700"
                value={birthday} onChange={e => setBirthday(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Used to show your age — never shared directly</p>
            </div>

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
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-pink-400 text-gray-700"
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

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Interests{selectedInterests.length > 0 && <span className="ml-1 text-pink-500 normal-case">({selectedInterests.length})</span>}</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(item => (
                  <Chip key={item} label={item} selected={selectedInterests.includes(item)} onClick={() => toggleInterest(item)} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Values
                {Object.keys(valuesAnswers).length > 0 && (
                  <span className="ml-1 text-pink-500 normal-case">({Object.keys(valuesAnswers).length}/{VALUES_QUESTIONS.length})</span>
                )}
              </p>
              <div className="flex flex-col gap-4">
                {VALUES_QUESTIONS.map(q => (
                  <div key={q.id}>
                    <p className="text-xs text-gray-600 mb-1.5">{q.question}</p>
                    <div className="flex flex-col gap-1">
                      {q.options.map(opt => (
                        <button key={opt} type="button"
                          onClick={() => setValuesAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`text-left px-3 py-2 rounded-xl text-xs border transition-colors ${
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
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Prompt</p>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto mb-2">
                {PROMPTS.map(p => (
                  <button key={p} type="button" onClick={() => setSelectedPrompt(p)}
                    className={`text-left px-3 py-2 rounded-xl text-sm border transition-colors ${selectedPrompt === p ? 'border-pink-400 bg-pink-50 text-pink-800' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    {p}
                  </button>
                ))}
              </div>
              <textarea className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-pink-400 resize-none w-full"
                rows={3} placeholder="Your answer…" value={promptAnswer} onChange={e => setPromptAnswer(e.target.value)} />
            </div>

            {/* Additional photos */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Additional photos</p>
              <div className="flex flex-wrap gap-2">
                {extraPhotos.map((url, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={url} className="w-full h-full object-cover rounded-xl" alt="" />
                    <button type="button" onClick={() => removeExtraPhoto(url)}
                      className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none">
                      ×
                    </button>
                  </div>
                ))}
                {extraPhotos.length < 5 && (
                  <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-pink-300 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={pickExtraPhoto} disabled={photoUploading2} />
                    <span className="text-2xl text-gray-300">{photoUploading2 ? '…' : '+'}</span>
                  </label>
                )}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={save} disabled={saving}
              className="w-full bg-pink-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 mt-1">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-sm text-gray-400 text-center py-1">Cancel</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Profile completeness bar */}
            {(() => {
              const fields = [
                profile.photo_url,
                profile.name,
                profile.major,
                profile.birthday,
                profile.gender,
                profile.prompt && profile.prompt_answer,
                (profile.interests ?? []).length > 0,
                Object.keys(profile.values_answers ?? {}).length >= 6,
              ]
              const done = fields.filter(Boolean).length
              const pct = Math.round((done / fields.length) * 100)
              if (pct >= 100) return null
              return (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-gray-500 font-medium">Profile {pct}% complete</p>
                    <p className="text-xs text-gray-400">More = more matches</p>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })()}

            <div className="text-center text-sm text-gray-500">
              {[profile.major, profile.year, profile.height].filter(Boolean).join(' · ')}
            </div>

            {(profile.gender || profile.sexuality || profile.race || profile.religion) && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {profile.gender && <Tag label={profile.gender} />}
                {profile.sexuality && <Tag label={profile.sexuality} />}
                {profile.race && <Tag label={profile.race} />}
                {profile.religion && <Tag label={profile.religion} />}
              </div>
            )}

            {profile.prompt && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 italic mb-1">{profile.prompt}</p>
                <p className="text-sm text-gray-700">{profile.prompt_answer}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 justify-center">
              {(profile.interests ?? []).map((i: string) => <Tag key={i} label={i} />)}
            </div>

            <button onClick={() => setEditing(true)}
              className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors">
              Edit profile
            </button>

            <button onClick={() => setShowPreview(true)}
              className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors">
              Preview my card
            </button>

            <Link href="/settings"
              className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors text-center block">
              Discovery settings
            </Link>

            {/* Active toggle */}
            <div className="flex items-center justify-between px-1 py-1">
              <div>
                <p className="text-sm font-medium text-gray-700">Show me in Discover</p>
                <p className="text-xs text-gray-400">Pause to hide your profile</p>
              </div>
              <button
                onClick={async () => {
                  const next = !profile.is_active
                  await updateProfile({ is_active: next })
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile.is_active ? 'bg-pink-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${profile.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Delete account */}
            <DeleteAccount userId={userId!} />
          </div>
        )}
      </div>
    </div>

    {showPreview && profile && (
      <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center p-6 gap-4"
        onClick={() => setShowPreview(false)}>
        <p className="text-white text-sm font-medium opacity-70">This is how others see you</p>
        <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
          <SwipeCard
            profile={profile}
            myValues={{}}
            distance={null}
            onSwipeLeft={() => setShowPreview(false)}
            onSwipeRight={() => setShowPreview(false)}
            draggable={false}
          />
        </div>
        <button onClick={() => setShowPreview(false)}
          className="text-white/60 text-sm mt-2">Close</button>
      </div>
    )}
    </>
  )
}

function DeleteAccount({ userId }: { userId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch('/api/delete-account', { method: 'DELETE' })
    if (!res.ok) {
      setDeleting(false)
      alert('Failed to delete account. Please try again.')
      return
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!confirm) return (
    <button onClick={() => setConfirm(true)} className="text-xs text-gray-300 hover:text-red-400 transition-colors text-center py-1">
      Delete account
    </button>
  )

  return (
    <div className="border border-red-100 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-sm text-gray-700 font-medium">Delete your account?</p>
      <p className="text-xs text-gray-400">This permanently deletes your profile, matches, messages, and account. This cannot be undone.</p>
      <div className="flex gap-2">
        <button onClick={() => setConfirm(false)} className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm">Cancel</button>
        <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50">
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
