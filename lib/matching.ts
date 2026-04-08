import { supabase } from './supabase'
import { valuesCompatibilityScore } from './values'

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

// Score by shared interests (0–1, Jaccard similarity)
function interestScore(myInterests: string[], theirInterests: string[]): number {
  if (!myInterests.length || !theirInterests.length) return 0
  const shared = theirInterests.filter(i => myInterests.includes(i)).length
  const union = new Set([...myInterests, ...theirInterests]).size
  return shared / union
}

// Score by proximity (0–1): 1 at 0 miles, ~0.5 at 10 miles, ~0.09 at 50 miles
function proximityScore(distanceMiles: number): number {
  return 1 / (1 + distanceMiles / 10)
}

export async function getDiscoverProfiles(userId: string, myProfile: any, limit = 20) {
  const [{ data: swiped }, { data: blocked }] = await Promise.all([
    supabase.from('swipes').select('swiped_id').eq('swiper_id', userId),
    (supabase.from('blocks').select('blocker_id, blocked_id') as any)
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
  ])

  const swipedIds = (swiped ?? []).map((s: any) => s.swiped_id)
  const blockedIds = (blocked ?? []).flatMap((b: any) => [b.blocker_id, b.blocked_id]).filter((id: string) => id !== userId)
  const excludeIds = [...new Set([...swipedIds, ...blockedIds])]

  let query = supabase
    .from('profiles')
    .select('id, name, major, year, birthday, gender, sexuality, interests, values_answers, prompt, prompt_answer, photo_url, latitude, longitude')
    .eq('is_active', true)
    .neq('id', userId)
    .limit(limit * 5)

  if (excludeIds.length > 0)
    query = (query as any).not('id', 'in', `(${excludeIds.map((id: string) => `"${id}"`).join(',')})`)

  const { data } = await query
  if (!data) return []

  const myInterests: string[] = myProfile?.interests ?? []
  const myValues: Record<string, string> = myProfile?.values_answers ?? {}
  const hasMyLocation = myProfile?.latitude && myProfile?.longitude
  const minAge = myProfile?.pref_min_age ?? 18
  const maxAge = myProfile?.pref_max_age ?? 35
  const maxDistance = myProfile?.pref_max_distance ?? 50

  return data
    .filter((profile: any) => isCompatible(myProfile, profile))
    .filter((profile: any) => {
      if (!profile.birthday) return true
      const age = getAge(profile.birthday)
      return age >= minAge && age <= maxAge
    })
    .filter((profile: any) => {
      if (!hasMyLocation || !profile.latitude || !profile.longitude) return true
      const dist = haversineDistance(myProfile.latitude, myProfile.longitude, profile.latitude, profile.longitude)
      return dist <= maxDistance
    })
    .sort((a: any, b: any) => {
      const vScore = (p: any) => valuesCompatibilityScore(myValues, p.values_answers ?? {})
      const iScore = (p: any) => interestScore(myInterests, p.interests ?? [])
      const pScore = (p: any) => {
        if (!hasMyLocation || !p.latitude || !p.longitude) return 0.5
        const dist = haversineDistance(myProfile.latitude, myProfile.longitude, p.latitude, p.longitude)
        return proximityScore(dist)
      }
      // 55% values, 25% proximity, 20% interests
      const scoreA = 0.55 * vScore(a) + 0.25 * pScore(a) + 0.20 * iScore(a)
      const scoreB = 0.55 * vScore(b) + 0.25 * pScore(b) + 0.20 * iScore(b)
      return scoreB - scoreA
    })
    .slice(0, limit)
}

export async function recordSwipe(swiperId: string, swipedId: string, direction: 'left' | 'right') {
  await supabase.from('swipes').insert({ swiper_id: swiperId, swiped_id: swipedId, direction })
}
