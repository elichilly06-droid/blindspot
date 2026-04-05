'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useMatches(userId: string) {
  const [matches, setMatches] = useState<any[]>([])

  useEffect(() => {
    if (!userId) return

    const fetch = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, user_a:profiles!user_a(*), user_b:profiles!user_b(*)')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order('created_at', { ascending: false })
      setMatches(data ?? [])
    }
    fetch()

    const channel = supabase
      .channel('matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return matches
}
