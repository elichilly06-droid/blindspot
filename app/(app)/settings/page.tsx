'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100]

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  const { profile, loading, updateProfile } = useProfile(userId ?? '')
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(35)
  const [maxDistance, setMaxDistance] = useState(50)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setMinAge(profile.pref_min_age ?? 18)
      setMaxAge(profile.pref_max_age ?? 35)
      setMaxDistance(profile.pref_max_distance ?? 50)
    }
  }, [profile])

  const save = async () => {
    setSaving(true)
    await updateProfile({ pref_min_age: minAge, pref_max_age: maxAge, pref_max_distance: maxDistance })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading || !profile) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
        <h1 className="text-2xl font-bold">Discovery settings</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-6">

        {/* Age range */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-800">Age range</p>
            <span className="text-sm text-pink-500 font-medium">{minAge}–{maxAge}</span>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-400">Min</label>
              <input type="range" min={18} max={maxAge - 1} value={minAge}
                onChange={e => setMinAge(Number(e.target.value))}
                className="w-full accent-pink-500" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-400">Max</label>
              <input type="range" min={minAge + 1} max={50} value={maxAge}
                onChange={e => setMaxAge(Number(e.target.value))}
                className="w-full accent-pink-500" />
            </div>
          </div>
        </div>

        {/* Max distance */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-800">Maximum distance</p>
            <span className="text-sm text-pink-500 font-medium">{maxDistance} mi</span>
          </div>
          <input type="range" min={1} max={100} value={maxDistance}
            onChange={e => setMaxDistance(Number(e.target.value))}
            className="w-full accent-pink-500" />
          <div className="flex justify-between mt-1">
            {DISTANCE_OPTIONS.map(d => (
              <button key={d} onClick={() => setMaxDistance(d)}
                className={`text-xs transition-colors ${maxDistance === d ? 'text-pink-500 font-medium' : 'text-gray-400'}`}>
                {d}mi
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full bg-pink-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save preferences'}
        </button>
      </div>
    </div>
  )
}
