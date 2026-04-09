'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useMessages } from '@/hooks/useMessages'
import { ProgressBar } from '@/components/ProgressBar'
import { ReportModal } from '@/components/ReportModal'

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const [userId, setUserId] = useState<string | null>(null)
  const [match, setMatch] = useState<any>(null)
  const [otherProfile, setOtherProfile] = useState<any>(null)
  const [text, setText] = useState('')
  const [showReveal, setShowReveal] = useState(false)
  const [revealCountdown, setRevealCountdown] = useState(5)
  const [showReport, setShowReport] = useState(false)
  const [myPhone, setMyPhone] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage } = useMessages(matchId)
  const [otherTyping, setOtherTyping] = useState(false)
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      supabase.from('matches').update({ revealed: true }).eq('id', matchId)
      return
    }

    const remaining = revealAfter - elapsed
    const t = setTimeout(() => {
      supabase.from('matches').update({ revealed: true }).eq('id', matchId)
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

  // Typing presence channel
  useEffect(() => {
    if (!userId || !matchId) return
    const ch = supabase.channel(`typing:${matchId}`, { config: { presence: { key: userId } } })
    typingChannel.current = ch
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ typing: boolean }>()
      const isOtherTyping = Object.entries(state).some(
        ([key, presences]) => key !== userId && presences.some(p => p.typing)
      )
      setOtherTyping(isOtherTyping)
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, matchId])

  // Mark as read when chat is open
  useEffect(() => {
    if (!userId || !match?.id) return
    const isA = match.user_a === userId
    const update = isA ? { last_read_a: new Date().toISOString() } : { last_read_b: new Date().toISOString() }
    supabase.from('matches').update(update).eq('id', matchId).then(() => {})
  }, [userId, match?.id, matchId, messages.length])

  const send = async () => {
    if (!text.trim() || !userId) return
    const content = text.trim()
    setText('')
    await sendMessage(userId, content)
  }

  const proposeDate = async () => {
    if (!userId) return
    await supabase.from('matches').update({ date_proposed_by: userId }).eq('id', matchId)
    await sendMessage(userId, '💘 proposed a date!', 'system', { kind: 'date_request' })
    setMatch((m: any) => ({ ...m, date_proposed_by: userId }))
  }

  const cancelProposal = async () => {
    if (!userId) return
    await supabase.from('matches').update({ date_proposed_by: null }).eq('id', matchId)
    setMatch((m: any) => ({ ...m, date_proposed_by: null }))
  }

  const acceptDate = async () => {
    if (!userId) return
    await supabase.from('matches').update({ date_confirmed: true, date_proposed_by: null }).eq('id', matchId)
    await sendMessage(userId, "🎉 It's a date!", 'system', { kind: 'date_accepted' })
  }

  const declineDate = async () => {
    if (!userId) return
    await supabase.from('matches').update({ date_proposed_by: null }).eq('id', matchId)
    await sendMessage(userId, 'Declined the date.', 'system', { kind: 'date_declined' })
    setMatch((m: any) => ({ ...m, date_proposed_by: null }))
  }

  const iProposed = match?.date_proposed_by === userId
  const theyProposed = match?.date_proposed_by && match?.date_proposed_by !== userId
  const EXPIRY_MS = 48 * 60 * 60 * 1000
  const matchExpired = match && !match.first_message_at && match.message_count === 0 &&
    Date.now() - new Date(match.created_at).getTime() > EXPIRY_MS

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
        <button onClick={() => setShowReport(true)} className="text-gray-400 hover:text-gray-600 p-2 transition-colors">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>


      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === userId
          const meta = msg.metadata ?? {}

          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="self-center text-gray-400 text-xs py-1 text-center">
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
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Bottom action area */}
      {matchExpired ? (
        <div className="px-6 py-4 bg-white border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">This match expired — neither of you sent a message in time.</p>
        </div>
      ) : match?.date_confirmed ? (
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <p className="text-sm font-medium text-gray-800 mb-2">You're going on a date — share your number</p>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-pink-400 transition-colors"
              placeholder="Your number…"
              value={myPhone}
              onChange={e => setMyPhone(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && myPhone.trim() && userId) { sendMessage(userId, `My number: ${myPhone.trim()}`, 'system', { kind: 'phone_share' }); setMyPhone('') } }}
            />
            <button
              disabled={!myPhone.trim()}
              onClick={() => { if (myPhone.trim() && userId) { sendMessage(userId, `My number: ${myPhone.trim()}`, 'system', { kind: 'phone_share' }); setMyPhone('') } }}
              className="bg-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium disabled:opacity-40"
            >
              Share
            </button>
          </div>
        </div>
      ) : match?.revealed ? (
        <div className="px-6 py-4 bg-white border-t border-gray-100">
          {!match.date_proposed_by ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500">Ready to meet in person?</p>
              <button onClick={proposeDate}
                className="flex-shrink-0 bg-pink-500 text-white px-5 py-2 rounded-full text-sm font-medium">
                Ask out
              </button>
            </div>
          ) : iProposed ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-400">Waiting for their response…</p>
              <button onClick={cancelProposal} className="text-sm text-gray-400 underline-offset-2 underline">Cancel</button>
            </div>
          ) : theyProposed ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-800 font-medium">{otherProfile?.name} asked you out</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={declineDate} className="border border-gray-200 text-gray-500 px-4 py-2 rounded-full text-sm">Pass</button>
                <button onClick={acceptDate} className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium">Accept</button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-pink-400 transition-colors"
            placeholder="Message…"
            value={text}
            onChange={e => {
              setText(e.target.value)
              if (typingChannel.current && userId) {
                typingChannel.current.track({ typing: true })
                if (typingTimeout.current) clearTimeout(typingTimeout.current)
                typingTimeout.current = setTimeout(() => {
                  typingChannel.current?.track({ typing: false })
                }, 2000)
              }
            }}
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
      )}

      {/* Report/block modal */}
      {showReport && userId && otherProfile && (
        <ReportModal
          reportedId={otherProfile.id}
          reportedName={otherProfile.name}
          myId={userId}
          matchId={matchId}
          onClose={() => setShowReport(false)}
          onBlocked={() => window.history.back()}
          onUnmatched={() => window.history.back()}
        />
      )}

      {/* Photo reveal overlay */}
      {showReveal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-center gap-8 p-8">
          <div className="flex flex-col items-center gap-4">
            {otherProfile?.photo_url ? (
              <img src={otherProfile.photo_url} className="w-36 h-36 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-36 h-36 rounded-full bg-gray-700" />
            )}
            <div className="text-center">
              <p className="text-white text-xl font-semibold">{otherProfile?.name}</p>
              <p className="text-white/50 text-sm mt-1">Photos are now visible</p>
            </div>
          </div>
          {revealCountdown > 0 ? (
            <p className="text-white/40 text-xs">Closing in {revealCountdown}s</p>
          ) : (
            <button
              onClick={() => setShowReveal(false)}
              className="bg-white text-gray-900 px-8 py-3 rounded-full text-sm font-semibold"
            >
              Continue
            </button>
          )}
        </div>
      )}

      
    </div>
  )
}
