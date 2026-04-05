import { supabase } from './supabase'

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8 // miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getAge(birthday: string): number {
  const today = new Date()
  const birth = new Date(birthday)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export async function getDiscoverProfiles(userId: string, userInterests: string[] = [], limit = 20) {
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
  if (!data) return []

  // Sort by shared interest count descending
  return data.sort((a: any, b: any) => {
    const sharedA = (a.interests ?? []).filter((i: string) => userInterests.includes(i)).length
    const sharedB = (b.interests ?? []).filter((i: string) => userInterests.includes(i)).length
    return sharedB - sharedA
  })
}

export async function recordSwipe(swiperId: string, swipedId: string, direction: 'left' | 'right') {
  await supabase.from('swipes').insert({ swiper_id: swiperId, swiped_id: swipedId, direction })
}
