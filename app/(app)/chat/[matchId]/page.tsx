'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useMessages } from '@/hooks/useMessages'
import { ProgressBar } from '@/components/ProgressBar'

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const [userId, setUserId] = useState<string | null>(null)
  const [match, setMatch] = useState<any>(null)
  const [otherProfile, setOtherProfile] = useState<any>(null)
  const [text, setText] = useState('')
  const [showReveal, setShowReveal] = useState(false)
  const [revealCountdown, setRevealCountdown] = useState(5)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage } = useMessages(matchId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!userId) return
    supabase.from('matches').select('*').eq('id', matchId).single().then(({ data }) => {
      setMatch(data)
      // Fetch the other person's profile
      const otherId = data?.user_a === userId ? data?.user_b : data?.user_a
      if (otherId) {
        supabase.from('profiles').select('id, name, photo_url').eq('id', otherId).single().then(({ data: p }) => setOtherProfile(p))
      }
    })
  }, [matchId, userId])

  // Subscribe to match changes (for date proposal / reveal)
  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        ({ new: updated }) => {
          const prev = match
          setMatch(updated)
          // Trigger reveal animation when photos are first revealed
          if (updated.revealed && prev && !prev.revealed) {
            setShowReveal(true)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [matchId, match])

  // Auto-reveal profiles after 48 hours from first message
  useEffect(() => {
    if (!match?.first_message_at || match.revealed) return
    const revealAfter = 48 * 60 * 60 * 1000 // 48 hours
    const elapsed = Date.now() - new Date(match.first_message_at).getTime()

    if (elapsed >= revealAfter) {
      supabase.from('matches').update({ revealed: true }).eq('id', matchId).then(() => {
        // DB update will be picked up by the match subscription and show the reveal overlay
      }).catch(() => {})
      return
    }

    const remaining = revealAfter - elapsed
    const t = setTimeout(() => {
      supabase.from('matches').update({ revealed: true }).eq('id', matchId).catch(() => {})
    }, remaining)
    return () => clearTimeout(t)
  }, [match, matchId])

  // Countdown for reveal overlay
  useEffect(() => {
    if (!showReveal) return
    setRevealCountdown(5)
    const interval = setInterval(() => {
      setRevealCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [showReveal])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!text.trim() || !userId) return
    const content = text.trim()
    setText('')
    await sendMessage(userId, content)
  }

  const proposeDate = async () => {
    if (!userId) return
    await supabase.from('matches').update({ date_proposed_by: userId }).eq('id', matchId)
    await sendMessage(userId, '💘 wants to go on a date — share photos & meet up?', 'system', { kind: 'date_request', status: 'pending' })
    setMatch((m: any) => ({ ...m, date_proposed_by: userId }))
  }

  const acceptDate = async () => {
    if (!userId) return
    await supabase.from('matches').update({ revealed: true, date_confirmed: true, date_proposed_by: null }).eq('id', matchId)
    await sendMessage(userId, '🎉 Date confirmed! Photos revealed.', 'system', { kind: 'date_accepted' })
    setShowReveal(true)
  }

  const declineDate = async () => {
    if (!userId) return
    await supabase.from('matches').update({ date_proposed_by: null }).eq('id', matchId)
    await sendMessage(userId, 'Declined the date request.', 'system', { kind: 'date_declined' })
    setMatch((m: any) => ({ ...m, date_proposed_by: null }))
  }

  // 24h check — first_message_at must exist and be 24h+ ago
  const canProposeDate = (() => {
    if (!match || match.date_confirmed || match.date_proposed_by) return false
    // Only allow proposing a date after profiles have been revealed
    return !!match.revealed
  })()

  const iProposed = match?.date_proposed_by === userId
  const theyProposed = match?.date_proposed_by && match?.date_proposed_by !== userId

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -mt-8 -mx-4">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-semibold text-pink-600">{otherProfile?.name ?? '???'}</p>
          {match && !match.revealed && !match.date_confirmed && (
            <div className="w-48 mt-1">
              <ProgressBar firstMessageAt={match.first_message_at ?? null} />
            </div>
          )}
          {match?.date_confirmed && (
            <p className="text-xs text-pink-400 mt-0.5">Date confirmed 💘</p>
          )}
        </div>
        
      </div>

      {/* Date proposal banner */}
      {theyProposed && !match.date_confirmed && (
        <div className="bg-pink-50 border-b border-pink-100 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-pink-700 font-medium">💘 They want to go on a date — share photos & meet up?</p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={acceptDate} className="bg-pink-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold">Accept</button>
            <button onClick={declineDate} className="border border-gray-200 text-gray-500 text-xs px-3 py-1.5 rounded-full">Decline</button>
          </div>
        </div>
      )}
      {iProposed && !match.date_confirmed && (
        <div className="bg-pink-50 border-b border-pink-100 px-4 py-3 text-center text-sm text-pink-500">
          💘 Date proposed — waiting for them to accept…
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === userId
          const meta = msg.metadata ?? {}

          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="self-center bg-pink-50 border border-pink-100 text-pink-600 text-xs px-4 py-2 rounded-full max-w-xs text-center">
                {msg.content}
              </div>
            )
          }
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                isMe ? 'bg-pink-500 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Propose date button */}
      {canProposeDate && (
        <div className="px-4 py-2 bg-pink-50 border-t border-pink-100 text-center">
          <button
            onClick={proposeDate}
            className="text-sm text-pink-600 font-semibold hover:text-pink-800 transition-colors"
          >
            💘 Propose a date — share photos & meet up?
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2">
        
        <input
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-pink-400 transition-colors"
          placeholder="Message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="bg-pink-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 transition-opacity"
        >
          Send
        </button>
      </div>

      {/* Photo reveal overlay */}
      {showReveal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-6 p-8">
          <p className="text-white text-2xl font-bold">✨ Photos revealed!</p>
          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-2">
              {otherProfile?.photo_url ? (
                <img src={otherProfile.photo_url} className="w-32 h-32 rounded-full object-cover border-4 border-pink-400" alt="" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center text-4xl">?</div>
              )}
              <p className="text-white text-sm">{otherProfile?.name}</p>
            </div>
          </div>
          {revealCountdown > 0 ? (
            <p className="text-white/60 text-sm">Closing in {revealCountdown}s…</p>
          ) : (
            <button
              onClick={() => setShowReveal(false)}
              className="bg-pink-500 text-white px-8 py-3 rounded-full font-semibold"
            >
              Let's go 💘
            </button>
          )}
        </div>
      )}

      
    </div>
  )
}
