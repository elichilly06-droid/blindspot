'use client'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { getAge } from '@/lib/matching'
import { valuesCompatibilityScore, VALUES_QUESTIONS } from '@/lib/values'

interface Profile {
  id: string
  name: string
  birthday?: string
  major?: string
  year?: string
  values_answers?: Record<string, string>
  interests?: string[]
  prompt?: string
  prompt_answer?: string
  photo_url?: string
}

interface SwipeCardProps {
  profile: Profile
  myValues: Record<string, string>
  distance: number | null
  onSwipeLeft: () => void
  onSwipeRight: () => void
  draggable?: boolean
}

export function SwipeCard({ profile, myValues, distance, onSwipeLeft, onSwipeRight, draggable = true }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  const likeOpacity = useTransform(x, [20, 100], [0, 1])
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0])

  const age = profile.birthday ? getAge(profile.birthday) : null
  const distanceLabel = distance !== null ? `${distance.toFixed(1)} mi` : null

  const theirValues = profile.values_answers ?? {}
  const compatScore = Object.keys(myValues).length > 0 && Object.keys(theirValues).length > 0
    ? valuesCompatibilityScore(myValues, theirValues)
    : null

  // Find 2 questions where both answered and align well
  const sharedValues = VALUES_QUESTIONS
    .filter(q => myValues[q.id] && theirValues[q.id] && myValues[q.id] === theirValues[q.id])
    .slice(0, 2)

  return (
    <motion.div
      style={{ x: draggable ? x : undefined, rotate: draggable ? rotate : undefined }}
      drag={draggable ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={draggable ? (_, info) => {
        if (info.offset.x > 100) onSwipeRight()
        else if (info.offset.x < -100) onSwipeLeft()
      } : undefined}
      whileDrag={draggable ? { cursor: 'grabbing' } : undefined}
      className={`bg-white rounded-3xl shadow-xl select-none w-full max-w-sm overflow-hidden ${draggable ? 'cursor-grab' : ''}`}
    >
      {/* Photo */}
      <div className="relative h-56 bg-gray-200">
        {profile.photo_url ? (
          <img src={profile.photo_url} alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'blur(14px)', transform: 'scale(1.1)' }} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center"
            style={{ filter: 'blur(8px)' }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-20 h-20 opacity-50">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
        )}

        <motion.div style={{ opacity: likeOpacity }} className="absolute top-4 left-4 border-4 border-green-400 text-green-400 font-black text-xl px-3 py-1 rounded-lg rotate-[-12deg] bg-white/80">
          LIKE
        </motion.div>
        <motion.div style={{ opacity: nopeOpacity }} className="absolute top-4 right-4 border-4 border-red-400 text-red-400 font-black text-xl px-3 py-1 rounded-lg rotate-[12deg] bg-white/80">
          NOPE
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-white font-bold text-xl">{profile.name}</span>
              {age !== null && <span className="text-white/90 text-lg font-normal">, {age}</span>}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              {distanceLabel && <span className="text-white/70 text-xs">{distanceLabel}</span>}
              {compatScore !== null && (
                <span className="text-white/90 text-xs font-medium">
                  {Math.round(compatScore * 100)}% match
                </span>
              )}
            </div>
          </div>
          {profile.major && (
            <p className="text-white/70 text-xs mt-0.5">{profile.major}{profile.year ? ` · ${profile.year}` : ''}</p>
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

        {sharedValues.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {sharedValues.map(q => (
              <div key={q.id} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-pink-400">✓</span>
                <span className="font-medium text-gray-700">{theirValues[q.id]}</span>
              </div>
            ))}
          </div>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.slice(0, 6).map(i => (
              <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{i}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
