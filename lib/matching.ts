import { supabase } from './supabase'

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
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

// Returns which genders this person is attracted to, or 'all'
function getDesiredGenders(gender?: string | null, sexuality?: string | null): string[] | 'all' {
  if (!gender || !sexuality) return 'all'

  const openSexualities = ['Bisexual', 'Pansexual', 'Queer', 'Asexual', 'Prefer not to say']
  if (openSexualities.includes(sexuality)) return 'all'

  if (sexuality === 'Straight') {
    if (gender === 'Man') return ['Woman']
    if (gender === 'Woman') return ['Man']
    return 'all' // Non-binary + straight → show all
  }

  if (sexuality === 'Gay') {
    if (gender === 'Man') return ['Man']
    if (gender === 'Woman') return ['Woman']
    return 'all'
  }

  if (sexuality === 'Lesbian') return ['Woman']

  return 'all'
}

// True if both people are mutually compatible based on gender + sexuality
function isCompatible(me: any, them: any): boolean {
  const myDesired = getDesiredGenders(me.gender, me.sexuality)
  const theirDesired = getDesiredGenders(them.gender, them.sexuality)

  const iWantThem = myDesired === 'all' || !them.gender || myDesired.includes(them.gender)
  const theyWantMe = theirDesired === 'all' || !me.gender || theirDesired.includes(me.gender)

  return iWantThem && theyWantMe
}

// Score by shared interests (0–1)
function interestScore(myInterests: string[], theirInterests: string[]): number {
  if (!myInterests.length || !theirInterests.length) return 0
  const shared = theirInterests.filter(i => myInterests.includes(i)).length
  const union = new Set([...myInterests, ...theirInterests]).size
  return shared / union // Jaccard similarity
}

export async function getDiscoverProfiles(userId: string, myProfile: any, limit = 20) {
  const { data: swiped } = await supabase
    .from('swipes')
    .select('swiped_id')
    .eq('swiper_id', userId)

  const swipedIds = (swiped ?? []).map((s: any) => s.swiped_id)

  // Fetch a larger pool so we have enough after compatibility filtering
  let query = supabase
    .from('profiles')
    .select('id, name, major, year, birthday, gender, sexuality, interests, prompt, prompt_answer, photo_url, latitude, longitude')
    .eq('is_active', true)
    .neq('id', userId)
    .limit(limit * 5)

  if (swipedIds.length > 0)
    query = query.not('id', 'in', `(${swipedIds.map((id: string) => `"${id}"`).join(',')})`)

  const { data } = await query
  if (!data) return []

  const myInterests: string[] = myProfile?.interests ?? []

  return data
    .filter((profile: any) => isCompatible(myProfile, profile))
    .sort((a: any, b: any) => interestScore(myInterests, b.interests ?? []) - interestScore(myInterests, a.interests ?? []))
    .slice(0, limit)
}

export async function recordSwipe(swiperId: string, swipedId: string, direction: 'left' | 'right') {
  await supabase.from('swipes').insert({ swiper_id: swiperId, swiped_id: swipedId, direction })
}
