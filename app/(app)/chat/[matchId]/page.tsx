'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useMessages } from '@/hooks/useMessages'
import { CoffeeChatModal } from '@/components/CoffeeChatModal'
import { ProgressBar } from '@/components/ProgressBar'

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const [userId, setUserId] = useState<string | null>(null)
  const [match, setMatch] = useState<any>(null)
  const [text, setText] = useState('')
  const [showCoffee, setShowCoffee] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage } = useMessages(matchId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
    supabase.from('matches').select('*').eq('id', matchId).single().then(({ data }) => setMatch(data))
  }, [matchId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!text.trim() || !userId) return
    const content = text.trim()
    setText('')
    await sendMessage(userId, content)
  }

  const other = match
    ? (match.user_a === userId ? match.user_b : match.user_a)
    : null

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -mt-8 -mx-4">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-semibold">{match?.revealed ? other?.name ?? '???' : '???'}</p>
          {match && !match.revealed && (
            <div className="w-48 mt-1">
              <ProgressBar current={match.message_count} total={5} />
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCoffee(true)}
          className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          ☕ Coffee chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.map((msg: any) => {
          if (msg.type === 'coffee_invite') return (
            <div key={msg.id} className="self-center bg-amber-50 border border-amber-100 text-amber-800 text-xs px-4 py-2 rounded-full max-w-xs text-center">
              ☕ {msg.content}
            </div>
          )
          const isMe = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                isMe ? 'bg-red-700 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2">
        <input
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-red-400 transition-colors"
          placeholder="Message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="bg-red-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 transition-opacity"
        >
          Send
        </button>
      </div>

      {showCoffee && userId && (
        <CoffeeChatModal matchId={matchId} requesterId={userId} onClose={() => setShowCoffee(false)} />
      )}
    </div>
  )
}
