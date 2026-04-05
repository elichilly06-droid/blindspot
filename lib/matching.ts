import { supabase } from './supabase'

export async function getDiscoverProfiles(userId: string, limit = 10) {
  const { data: swiped } = await supabase
    .from('swipes')
    .select('swiped_id')
    .eq('swiper_id', userId)

  const swipedIds = (swiped ?? []).map((s: any) => s.swiped_id)

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .neq('id', userId)
    .limit(limit)

  if (swipedIds.length > 0)
    query = query.not('id', 'in', `(${swipedIds.join(',')})`)

  const { data } = await query
  return data ?? []
}

export async function recordSwipe(swiperId: string, swipedId: string, direction: 'left' | 'right') {
  await supabase.from('swipes').insert({ swiper_id: swiperId, swiped_id: swipedId, direction })
}
