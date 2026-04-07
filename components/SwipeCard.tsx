'use client'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { getAge } from '@/lib/matching'

interface Profile {
  id: string
  name: string
  birthday?: string
  major?: string
  year?: string
  interests?: string[]
  prompt?: string
  prompt_answer?: string
  photo_url?: string
}

interface SwipeCardProps {
  profile: Profile
  userInterests: string[]
  distance: number | null
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

export function SwipeCard({ profile, userInterests, distance, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  const likeOpacity = useTransform(x, [20, 100], [0, 1])
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0])

  const age = profile.birthday ? getAge(profile.birthday) : null
  const distanceLabel = distance !== null ? `${distance.toFixed(1)} mi away` : null

  const sharedInterests = (profile.interests ?? []).filter(i => userInterests.includes(i))
  const otherInterests = (profile.interests ?? []).filter(i => !userInterests.includes(i))

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) onSwipeRight()
        else if (info.offset.x < -100) onSwipeLeft()
      }}
      whileDrag={{ cursor: 'grabbing' }}
      className="bg-white rounded-3xl shadow-xl cursor-grab select-none w-full max-w-sm overflow-hidden"
    >
      {/* Photo */}
      <div className="relative h-56 bg-gray-200">
        {profile.photo_url ? (
          <img
            src={profile.photo_url}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'blur(14px)', transform: 'scale(1.1)' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center"
            style={{ filter: 'blur(8px)' }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-20 h-20 opacity-50">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
        )}

        {/* Like / Nope stamps */}
        <motion.div style={{ opacity: likeOpacity }} className="absolute top-4 left-4 border-4 border-green-400 text-green-400 font-black text-xl px-3 py-1 rounded-lg rotate-[-12deg] bg-white/80">
          LIKE
        </motion.div>
        <motion.div style={{ opacity: nopeOpacity }} className="absolute top-4 right-4 border-4 border-red-400 text-red-400 font-black text-xl px-3 py-1 rounded-lg rotate-[12deg] bg-white/80">
          NOPE
        </motion.div>

        {/* Name / age / distance overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-white font-bold text-xl">{profile.name}</span>
              {age !== null && <span className="text-white/90 text-lg font-normal">, {age}</span>}
            </div>
            {distanceLabel && (
              <span className="text-white/80 text-xs">{distanceLabel}</span>
            )}
          </div>
          {profile.major && (
            <p className="text-white/70 text-xs mt-0.5">{profile.major} · {profile.year}</p>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3">
        {profile.prompt && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 italic mb-1">{profile.prompt}</p>
            <p className="text-sm text-gray-700">{profile.prompt_answer}</p>
          </div>
        )}

        {/* Interests */}
        {(profile.interests ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sharedInterests.map(i => (
              <span key={i} className="bg-pink-100 text-pink-700 text-xs px-3 py-1 rounded-full font-medium">
                {i}
              </span>
            ))}
            {otherInterests.map(i => (
              <span key={i} className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                {i}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
