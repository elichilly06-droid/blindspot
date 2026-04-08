'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useUnreadCount(userId: string) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) return

    const fetch = async () => {
      const { data } = await (supabase
        .from('matches')
        .select('user_a, user_b, last_read_a, last_read_b, last_message_at, last_message_sender') as any)
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)

      const unread = (data ?? []).filter((m: any) => {
        if (!m.last_message_at || !m.last_message_sender) return false
        if (m.last_message_sender === userId) return false
        const myLastRead = m.user_a === userId ? m.last_read_a : m.last_read_b
        if (!myLastRead) return true
        return new Date(m.last_message_at) > new Date(myLastRead)
      })

      setCount(unread.length)
    }

    fetch()

    const channel = supabase
      .channel(`unread:${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, fetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return count
}
