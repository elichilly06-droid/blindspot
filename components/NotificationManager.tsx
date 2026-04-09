'use client'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function NotificationManager({ userId }: { userId: string }) {
  const seenAt = useRef<Record<string, string>>({})

  useEffect(() => {
    if (!userId || typeof window === 'undefined' || !('Notification' in window)) return

    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          if (Notification.permission !== 'granted') return
          const match = payload.new as any
          if (match.user_a !== userId && match.user_b !== userId) return
          new Notification('New match! 💘', { body: 'Someone liked you back. Start chatting!' })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          if (Notification.permission !== 'granted') return
          const match = payload.new as any
          if (match.user_a !== userId && match.user_b !== userId) return
          if (!match.last_message_sender || match.last_message_sender === userId) return
          if (!match.last_message_at) return

          const prev = seenAt.current[match.id]
          if (prev && match.last_message_at <= prev) return
          seenAt.current[match.id] = match.last_message_at

          if (document.hidden) {
            new Notification('New message', {
              body: match.last_message_preview ?? 'You have a new message',
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return null
}
