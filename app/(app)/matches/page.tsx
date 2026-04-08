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

  const EXPIRY_MS = 48 * 60 * 60 * 1000

  const isExpired = (match: any) =>
    !match.first_message_at &&
    match.message_count === 0 &&
    Date.now() - new Date(match.created_at).getTime() > EXPIRY_MS

  const active = matches.filter((m: any) => !isExpired(m))
  const expired = matches.filter((m: any) => isExpired(m))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Matches</h1>
      {matches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">No matches yet</p>
          <p className="text-xs mt-1 text-gray-300">Keep swiping on Discover</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-gray-100">
            {active.map((match: any) => {
              const other = match.user_a?.id === userId ? match.user_b : match.user_a
              const isDateConfirmed = match.date_confirmed
              const isDateProposed = !!match.date_proposed_by && !isDateConfirmed

              let sublabel = null
              if (isDateConfirmed) {
                sublabel = <span className="text-xs text-gray-400">Going on a date</span>
              } else if (isDateProposed) {
                sublabel = <span className="text-xs text-pink-400">Date pending</span>
              } else if (match.revealed) {
                sublabel = <span className="text-xs text-gray-400">Photos revealed</span>
              } else {
                sublabel = (
                  <div className="mt-1">
                    <ProgressBar firstMessageAt={match.first_message_at ?? null} />
                  </div>
                )
              }

              return (
                <Link
                  key={match.id}
                  href={`/chat/${match.id}`}
                  className="flex items-center gap-4 bg-white py-4 hover:bg-gray-50 transition-colors"
                >
                  <Avatar uri={other?.photo_url} size={52} revealed={match.revealed} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{other?.name ?? '???'}</p>
                    <div className="mt-0.5">{sublabel}</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )
            })}
          </div>

          {expired.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Expired</p>
              <div className="flex flex-col divide-y divide-gray-100 opacity-40">
                {expired.map((match: any) => {
                  const other = match.user_a?.id === userId ? match.user_b : match.user_a
                  return (
                    <div key={match.id} className="flex items-center gap-4 py-4">
                      <Avatar uri={other?.photo_url} size={52} revealed={false} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-500 text-sm">{other?.name ?? '???'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">No message sent in time</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
