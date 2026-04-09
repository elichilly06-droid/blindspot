import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/Nav'
import { NotificationManager } from '@/components/NotificationManager'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Redirect to onboarding if profile is missing or incomplete (no name or photo)
  const { data: profile } = await supabase.from('profiles').select('id, name, photo_url').eq('id', user.id).single()
  if (!profile || !profile.name || !profile.photo_url) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationManager userId={user.id} />
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">{children}</main>
    </div>
  )
}
