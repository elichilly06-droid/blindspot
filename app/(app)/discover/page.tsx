'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getDiscoverProfiles, recordSwipe } from '@/lib/matching'
import { SwipeCard } from '@/components/SwipeCard'

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      getDiscoverProfiles(user.id).then(data => {
        setProfiles(data)
        setLoading(false)
      })
    })
  }, [])

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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (profiles.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
      <p className="text-xl font-semibold text-gray-700">You've seen everyone!</p>
      <p className="text-sm text-gray-400">Check back later for new people.</p>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-xs text-gray-400">Drag or use ← → arrow keys</p>

      {/* Card stack */}
      <div className="relative flex items-center justify-center" style={{ height: 480 }}>
        {profiles.slice(0, 3).map((profile, i) => (
          <div
            key={profile.id}
            className="absolute"
            style={{
              zIndex: 3 - i,
              transform: `scale(${1 - i * 0.04}) translateY(${i * 10}px)`,
              pointerEvents: i === 0 ? 'auto' : 'none',
            }}
          >
            {i === 0 ? (
              <SwipeCard
                profile={profile}
                revealed={false}
                onSwipeLeft={() => handleSwipe('left')}
                onSwipeRight={() => handleSwipe('right')}
              />
            ) : (
              <div className="bg-white rounded-3xl shadow-md w-full max-w-sm p-6" style={{ height: 420 }} />
            )}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-6">
        <button
          onClick={() => handleSwipe('left')}
          className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors text-xl"
        >
          ✕
        </button>
        <button
          onClick={() => handleSwipe('right')}
          className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors text-xl"
        >
          ♥
        </button>
      </div>
    </div>
  )
}
