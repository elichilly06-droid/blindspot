import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function DELETE() {
  // Get the calling user from their session cookie
  const cookieStore = await cookies()
  const supabaseUser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role to delete auth user (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Delete table data in dependency order
  await supabaseAdmin.from('messages').delete().eq('sender_id', user.id)
  await supabaseAdmin.from('matches').delete().or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
  await supabaseAdmin.from('swipes').delete().or(`swiper_id.eq.${user.id},swiped_id.eq.${user.id}`)
  await supabaseAdmin.from('blocks').delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
  await supabaseAdmin.from('reports').delete().or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)
  await supabaseAdmin.from('profiles').delete().eq('id', user.id)

  // Delete from auth.users
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
