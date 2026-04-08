'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { Avatar } from '@/components/Avatar'
import { Tag } from '@/components/Tag'

const PROMPTS = [
  "A life goal of mine…",
  "My love language is…",
  "We'll get along if…",
  "I go crazy for…",
  "The way to win me over…",
  "My most irrational fear…",
  "I'm weirdly attracted to…",
  "A shower thought I recently had…",
  "Two truths and a lie…",
  "I know the best spot in town for…",
  "Never have I ever…",
  "My simple pleasures…",
  "Green flags I look for…",
  "I'm looking for someone who…",
  "Worst idea I've ever had…",
  "Change my mind about…",
  "My therapist would say…",
  "A fun fact about me…",
  "I'm convinced that…",
  "People are surprised when they find out…",
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
  const [selectedPrompt, setSelectedPrompt] = useState('')
  const [promptAnswer, setPromptAnswer] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')
  const [locationName, setLocationName] = useState<string>('')

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
      setSelectedPrompt(profile.prompt ?? PROMPTS[0])
      setPromptAnswer(profile.prompt_answer ?? '')
      setLocationName(profile.location_name ?? '')
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

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const { error } = await updateProfile({ name, major, year, gender, sexuality, height, race, religion, prompt: selectedPrompt, prompt_answer: promptAnswer })
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

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={save} disabled={saving}
              className="w-full bg-pink-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 mt-1">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-sm text-gray-400 text-center py-1">Cancel</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
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
          </div>
        )}
      </div>
    </div>
  )
}
