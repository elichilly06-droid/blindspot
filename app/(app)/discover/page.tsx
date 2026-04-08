'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getDiscoverProfiles, recordSwipe, haversineDistance } from '@/lib/matching'
import { SwipeCard } from '@/components/SwipeCard'

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [pendingUser, setPendingUser] = useState<any>(null)
  const [pendingMe, setPendingMe] = useState<any>(null)

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
      () => {
        setLocationDenied(true)
        loadProfiles(user, me)
      },
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
          setLocationDenied(true)
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
    await recordSwipe(userId, profiles[0].id, direction)
    setProfiles(prev => prev.slice(1))
  }, [userId, profiles])

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

  // Custom pre-prompt before browser asks for location
  if (showLocationPrompt) return (
    <div className="flex flex-col items-center justify-center h-64 gap-5 text-center px-6">
      <div className="text-4xl">📍</div>
      <div>
        <p className="text-lg font-semibold text-gray-800">Enable location?</p>
        <p className="text-sm text-gray-500 mt-1">blindspot uses your location to show you people nearby. Your exact location is never shared.</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={() => requestLocation(pendingUser, pendingMe)}
          className="w-full bg-pink-500 text-white py-3 rounded-full font-semibold text-sm"
        >
          Allow while using the app
        </button>
        <button
          onClick={() => { setShowLocationPrompt(false); loadProfiles(pendingUser, pendingMe) }}
          className="w-full border border-gray-200 text-gray-500 py-3 rounded-full text-sm"
        >
          Not now
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
      {locationDenied && (
        <p className="text-xs text-gray-400 bg-gray-100 rounded-full px-4 py-1.5">
          📍 Location off — matching by interests only
        </p>
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
                userInterests={myProfile?.interests ?? []}
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
      <div className="flex gap-8">
        <button
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-2xl hover:scale-110 transition-transform active:scale-95"
        >
          ✕
        </button>
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
