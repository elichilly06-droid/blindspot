'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getDiscoverProfiles, recordSwipe, haversineDistance } from '@/lib/matching'
import { SwipeCard } from '@/components/SwipeCard'

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)

  const [pendingUser, setPendingUser] = useState<any>(null)
  const [pendingMe, setPendingMe] = useState<any>(null)
  const [lastSwiped, setLastSwiped] = useState<{ profile: any; direction: 'left' | 'right' } | null>(null)
  const [newMatch, setNewMatch] = useState<{ profile: any; matchId: string } | null>(null)

  const loadProfiles = useCallback(async (user: any, me: any) => {
    setMyProfile(me)
    const data = await getDiscoverProfiles(user.id, me)
    setProfiles(data)
    setLoading(false)
  }, [])

  const requestLocation = useCallback(async (user: any, me: any) => {
    setShowLocationPrompt(false)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        await supabase.from('profiles').update({ latitude, longitude }).eq('id', user.id)
        await loadProfiles(user, { ...me, latitude, longitude })
      },
      () => { loadProfiles(user, me) },
      { timeout: 8000, enableHighAccuracy: false }
    )
  }, [loadProfiles])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      const { data: me } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!navigator.geolocation) {
        loadProfiles(user, me)
        return
      }

      // Check current permission state without triggering a prompt
      if ('permissions' in navigator) {
        const perm = await navigator.permissions.query({ name: 'geolocation' })
        if (perm.state === 'granted') {
          // Already allowed — get location silently
          requestLocation(user, me)
          return
        } else if (perm.state === 'denied') {
          loadProfiles(user, me)
          return
        }
      }

      // State is 'prompt' — show our custom pre-prompt first
      setPendingUser(user)
      setPendingMe(me)
      setShowLocationPrompt(true)
    })
  }, [loadProfiles, requestLocation])

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!userId || profiles.length === 0) return
    const swiped = profiles[0]
    await recordSwipe(userId, swiped.id, direction)
    setLastSwiped({ profile: swiped, direction })
    setProfiles(prev => prev.slice(1))

    if (direction === 'right') {
      const userA = userId < swiped.id ? userId : swiped.id
      const userB = userId < swiped.id ? swiped.id : userId
      const { data: match } = await supabase.from('matches').select('id').eq('user_a', userA).eq('user_b', userB).maybeSingle()
      if (match) setNewMatch({ profile: swiped, matchId: match.id })
    }
  }, [userId, profiles])

  const handleUndo = useCallback(async () => {
    if (!userId || !lastSwiped) return
    await supabase.from('swipes').delete().eq('swiper_id', userId).eq('swiped_id', lastSwiped.profile.id)
    setProfiles(prev => [lastSwiped.profile, ...prev])
    setLastSwiped(null)
  }, [userId, lastSwiped])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleSwipe('left')
      if (e.key === 'ArrowRight') handleSwipe('right')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSwipe])

  const getDistance = (profile: any): number | null => {
    if (!myProfile?.latitude || !myProfile?.longitude) return null
    if (!profile.latitude || !profile.longitude) return null
    return haversineDistance(myProfile.latitude, myProfile.longitude, profile.latitude, profile.longitude)
  }

  // Custom pre-prompt — only shows once before browser asks
  if (showLocationPrompt) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-8">
      <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center text-4xl">📍</div>
      <div className="flex flex-col gap-2">
        <p className="text-xl font-bold text-gray-900">Allow location access</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          blindspot uses your location to show you people nearby. Your exact location is never visible to anyone.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => requestLocation(pendingUser, pendingMe)}
          className="w-full bg-pink-500 text-white py-3.5 rounded-full font-semibold text-sm shadow-sm"
        >
          Allow location access
        </button>
        <button
          onClick={() => { setShowLocationPrompt(false); loadProfiles(pendingUser, pendingMe) }}
          className="w-full text-gray-400 text-sm py-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (profiles.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <p className="text-xl font-semibold text-gray-700">You've seen everyone!</p>
      <p className="text-sm text-gray-400">
        Add more interests to your{' '}
        <a href="/profile" className="text-pink-500 underline">profile</a>
        {' '}to see more people.
      </p>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-6">
      {newMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-8 p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-700">
              {newMatch.profile.photo_url && (
                <img src={newMatch.profile.photo_url} className="w-full h-full object-cover"
                  style={{ filter: 'blur(12px)', transform: 'scale(1.1)' }} />
              )}
            </div>
            <p className="text-white text-3xl font-bold tracking-tight">It's a match</p>
            <p className="text-white/50 text-sm">You and {newMatch.profile.name} liked each other</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Link href={`/chat/${newMatch.matchId}`} onClick={() => setNewMatch(null)}
              className="w-full bg-pink-500 text-white py-3.5 rounded-full font-semibold text-sm text-center">
              Send a message
            </Link>
            <button onClick={() => setNewMatch(null)} className="text-white/40 text-sm py-2">
              Keep swiping
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400">Drag the card or use ← → arrow keys</p>

      {/* Card stack */}
      <div className="relative flex items-center justify-center w-full max-w-sm" style={{ height: 500 }}>
        {profiles.slice(0, 3).map((profile, i) => (
          <div
            key={profile.id}
            className="absolute w-full"
            style={{
              zIndex: 3 - i,
              transform: `scale(${1 - i * 0.04}) translateY(${i * 12}px)`,
              pointerEvents: i === 0 ? 'auto' : 'none',
            }}
          >
            {i === 0 ? (
              <SwipeCard
                profile={profile}
                myValues={myProfile?.values_answers ?? {}}
                distance={getDistance(profile)}
                onSwipeLeft={() => handleSwipe('left')}
                onSwipeRight={() => handleSwipe('right')}
              />
            ) : (
              <div className="bg-white rounded-3xl shadow-md w-full" style={{ height: 420 }} />
            )}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-5 items-center">
        <button
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-2xl hover:scale-110 transition-transform active:scale-95"
        >
          ✕
        </button>
        {lastSwiped && (
          <button
            onClick={handleUndo}
            className="w-11 h-11 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-sm hover:scale-110 transition-transform active:scale-95"
            title="Undo last swipe"
          >
            ↩
          </button>
        )}
        <button
          onClick={() => handleSwipe('right')}
          className="w-16 h-16 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-2xl hover:scale-110 transition-transform active:scale-95"
        >
          ♥
        </button>
      </div>
    </div>
  )
}
