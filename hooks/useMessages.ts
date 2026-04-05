'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useMessages(matchId: string) {
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    if (!matchId) return

    supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .then(({ data }: { data: any[] | null }) => setMessages(data ?? []))

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload: { new: any }) => setMessages((m: any[]) => [...m, payload.new]))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  const sendMessage = async (senderId: string, content: string, type = 'text', metadata?: object) => {
    await supabase.from('messages').insert({ match_id: matchId, sender_id: senderId, content, type, metadata })
  }

  return { messages, sendMessage }
}
