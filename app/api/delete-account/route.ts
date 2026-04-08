import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const accessToken = authHeader.slice(7)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify the token and get the user
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete table data in dependency order
  // Get match IDs first so we can delete dependent rows
  const { data: userMatches } = await supabaseAdmin
    .from('matches')
    .select('id')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
  const matchIds = (userMatches ?? []).map((m: any) => m.id)

  const steps: [string, any][] = [
    ['messages', await supabaseAdmin.from('messages').delete().eq('sender_id', user.id)],
    ...(matchIds.length > 0 ? [
      ['coffee_chats', await supabaseAdmin.from('coffee_chats').delete().in('match_id', matchIds)],
    ] as [string, any][] : []),
    ['matches', await supabaseAdmin.from('matches').delete().or(`user_a.eq.${user.id},user_b.eq.${user.id}`)],
    ['swipes', await supabaseAdmin.from('swipes').delete().or(`swiper_id.eq.${user.id},swiped_id.eq.${user.id}`)],
    ['blocks', await supabaseAdmin.from('blocks').delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)],
    ['reports', await supabaseAdmin.from('reports').delete().or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)],
    ['profiles', await supabaseAdmin.from('profiles').delete().eq('id', user.id)],
  ]

  for (const [table, result] of steps) {
    if (result.error) {
      console.error(`delete-account: failed at ${table}:`, result.error)
      return NextResponse.json({ error: `Failed at ${table}: ${result.error.message}` }, { status: 500 })
    }
  }

  // Delete from auth.users
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('delete-account: failed at auth.users:', deleteError)
    return NextResponse.json({ error: `Failed at auth: ${deleteError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
