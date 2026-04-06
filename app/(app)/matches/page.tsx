'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useMatches } from '@/hooks/useMatches'
import { Avatar } from '@/components/Avatar'
import { ProgressBar } from '@/components/ProgressBar'

export default function MatchesPage() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  const matches = useMatches(userId ?? '')

  if (!userId) return null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Matches</h1>
      {matches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No matches yet</p>
          <p className="text-sm mt-1">Keep swiping on Discover!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match: any) => {
            const other = match.user_a?.id === userId ? match.user_b : match.user_a
            const isDateProposed = !!match.date_proposed_by
            const isDateConfirmed = match.date_confirmed

            return (
              <Link
                key={match.id}
                href={`/chat/${match.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-pink-100 hover:border-pink-200 transition-colors shadow-sm"
              >
                <Avatar uri={other?.photo_url} size={52} revealed={match.revealed} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-pink-600">{other?.name ?? '???'}</p>
                    {isDateConfirmed && (
                      <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">Date confirmed 💘</span>
                    )}
                    {isDateProposed && !isDateConfirmed && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Date proposed</span>
                    )}
                  </div>
                  {!isDateConfirmed && (
                    <div className="mt-1.5">
                      <ProgressBar current={match.message_count} />
                    </div>
                  )}
                </div>
                <svg className="w-4 h-4 text-pink-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
