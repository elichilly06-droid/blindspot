'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const SPOTS = ["Kigo Kitchen", "Tatte", "Punchy's", "Stetson West Cafe", "Other"]

interface CoffeeChatModalProps {
  matchId: string
  requesterId: string
  onClose: () => void
}

export function CoffeeChatModal({ matchId, requesterId, onClose }: CoffeeChatModalProps) {
  const [spot, setSpot] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (!spot || !day || !time) return
    setSending(true)
    await supabase.from('coffee_chats').insert({ match_id: matchId, requester_id: requesterId, spot, day, time })
    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: requesterId,
      content: `Coffee chat request: ${spot} on ${day} at ${time}`,
      type: 'coffee_invite',
      metadata: { spot, day, time, status: 'pending' },
    })
    setSending(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-bold mb-4">Propose a Coffee Chat</h2>

        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Spot</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {SPOTS.map(s => (
            <button
              key={s}
              onClick={() => setSpot(s)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                spot === s ? 'bg-red-700 text-white border-red-700' : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Day</p>
        <input
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 outline-none focus:border-red-400"
          placeholder="e.g. Monday"
          value={day}
          onChange={e => setDay(e.target.value)}
        />

        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Time</p>
        <input
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-6 outline-none focus:border-red-400"
          placeholder="e.g. 2:00 PM"
          value={time}
          onChange={e => setTime(e.target.value)}
        />

        <button
          onClick={submit}
          disabled={sending || !spot || !day || !time}
          className="w-full bg-red-700 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 mb-2"
        >
          {sending ? 'Sending…' : 'Send Invite'}
        </button>
        <button onClick={onClose} className="w-full text-sm text-gray-400 py-2">Cancel</button>
      </div>
    </div>
  )
}
