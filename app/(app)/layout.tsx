import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/Nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // If user has no profile yet, send them to onboarding
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()
  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
