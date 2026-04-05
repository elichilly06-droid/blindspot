'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import { Avatar } from '@/components/Avatar'
import { Tag } from '@/components/Tag'

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
  const [promptAnswer, setPromptAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setMajor(profile.major ?? '')
      setYear(profile.year ?? '')
      setPromptAnswer(profile.prompt_answer ?? '')
    }
  }, [profile])

  const save = async () => {
    setSaving(true)
    const { error } = await updateProfile({ name, major, year, prompt_answer: promptAnswer })
    if (error) setError(error.message)
    else setEditing(false)
    setSaving(false)
  }

  if (loading || !profile) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 transition-colors">
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col items-center gap-3 mb-6">
          <Avatar uri={profile.photo_url} size={96} revealed />
          {!editing && <h2 className="text-xl font-bold">{profile.name}</h2>}
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <input
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400"
              value={name} onChange={e => setName(e.target.value)} placeholder="Name"
            />
            <input
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400"
              value={major} onChange={e => setMajor(e.target.value)} placeholder="Major"
            />
            <input
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400"
              value={year} onChange={e => setYear(e.target.value)} placeholder="Year"
            />
            {profile.prompt && (
              <>
                <p className="text-xs text-gray-400 italic px-1">{profile.prompt}</p>
                <textarea
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 resize-none"
                  rows={3} value={promptAnswer} onChange={e => setPromptAnswer(e.target.value)}
                />
              </>
            )}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={save} disabled={saving}
              className="w-full bg-red-700 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 mt-1"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-sm text-gray-400 text-center py-1">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center text-sm text-gray-500">{profile.major} · {profile.year}</div>
            {profile.prompt && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 italic mb-1">{profile.prompt}</p>
                <p className="text-sm text-gray-700">{profile.prompt_answer}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {(profile.interests ?? []).map((i: string) => <Tag key={i} label={i} />)}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="w-full mt-2 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors"
            >
              Edit profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
