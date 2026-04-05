'use client'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Avatar } from './Avatar'
import { Tag } from './Tag'

interface Profile {
  id: string
  name: string
  major?: string
  year?: string
  interests?: string[]
  prompt?: string
  prompt_answer?: string
  photo_url?: string
}

interface SwipeCardProps {
  profile: Profile
  revealed?: boolean
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

export function SwipeCard({ profile, revealed = false, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  const likeOpacity = useTransform(x, [20, 100], [0, 1])
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0])

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
      className="bg-white rounded-3xl shadow-xl p-6 cursor-grab select-none w-full max-w-sm"
    >
      {/* Like / Nope stamps */}
      <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-6 border-4 border-green-500 text-green-500 font-black text-2xl px-3 py-1 rounded-lg rotate-[-12deg]">
        LIKE
      </motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-6 border-4 border-red-500 text-red-500 font-black text-2xl px-3 py-1 rounded-lg rotate-[12deg]">
        NOPE
      </motion.div>

      <div className="flex flex-col items-center gap-3">
        <Avatar uri={profile.photo_url} size={110} revealed={revealed} />
        <h2 className="text-2xl font-bold">{revealed ? profile.name : '???'}</h2>
        {profile.major && (
          <p className="text-sm text-gray-500">{profile.major} · {profile.year}</p>
        )}
        {profile.prompt && (
          <div className="bg-gray-50 rounded-xl p-4 w-full text-center mt-1">
            <p className="text-xs text-gray-400 italic mb-1">{profile.prompt}</p>
            <p className="text-sm text-gray-700">{profile.prompt_answer}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 justify-center pt-1">
          {(profile.interests ?? []).slice(0, 6).map(i => <Tag key={i} label={i} />)}
        </div>
      </div>
    </motion.div>
  )
}
