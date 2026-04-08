'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/Avatar'
import { recordSwipe } from '@/lib/matching'

export default function LikesPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [likers, setLikers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actioned, setActioned] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  const loadLikers = useCallback(async (uid: string) => {
    const [{ data: likes }, { data: mySwipes }] = await Promise.all([
      supabase.from('swipes').select('swiper_id, created_at').eq('swiped_id', uid).eq('direction', 'right'),
      supabase.from('swipes').select('swiped_id').eq('swiper_id', uid),
    ])

    const mySwipedIds = new Set((mySwipes ?? []).map((s: any) => s.swiped_id))
    const unactioned = (likes ?? []).filter((l: any) => !mySwipedIds.has(l.swiper_id))
    const likerIds = unactioned.map((l: any) => l.swiper_id)

    if (likerIds.length === 0) { setLikers([]); setLoading(false); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, photo_url, birthday, major, year')
      .in('id', likerIds)

    setLikers(profiles ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (userId) loadLikers(userId)
  }, [userId, loadLikers])

  const handleLikeBack = async (likerId: string) => {
    if (!userId) return
    setActioned(prev => new Set([...prev, likerId]))
    await recordSwipe(userId, likerId, 'right')
  }

  const handlePass = async (likerId: string) => {
    if (!userId) return
    setActioned(prev => new Set([...prev, likerId]))
    await recordSwipe(userId, likerId, 'left')
  }

  const visible = likers.filter(l => !actioned.has(l.id))

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Likes</h1>
        {visible.length > 0 && (
          <span className="bg-pink-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">{visible.length}</span>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">No new likes yet</p>
          <p className="text-xs mt-1 text-gray-300">Keep your profile updated to attract matches</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map(profile => (
            <div key={profile.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="relative aspect-square bg-gray-100">
                <Avatar uri={profile.photo_url} size={0} revealed={false} />
                <div className="absolute inset-0 w-full h-full">
                  <Avatar uri={profile.photo_url} size={0} revealed={false} />
                </div>
                {/* blurred full-size photo */}
                <div className="absolute inset-0">
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt="" className="w-full h-full object-cover"
                      style={{ filter: 'blur(20px)', transform: 'scale(1.15)' }} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-200 to-pink-300"
                      style={{ filter: 'blur(8px)' }} />
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white font-semibold text-sm">Someone liked you</p>
                </div>
              </div>
              <div className="p-3 flex gap-2">
                <button onClick={() => handlePass(profile.id)}
                  className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-full text-xs font-medium hover:border-gray-400 transition-colors">
                  Pass
                </button>
                <button onClick={() => handleLikeBack(profile.id)}
                  className="flex-1 bg-pink-500 text-white py-2 rounded-full text-xs font-medium">
                  Like back
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
