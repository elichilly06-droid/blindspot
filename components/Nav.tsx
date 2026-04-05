'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const links = [
  { href: '/discover', label: 'Discover' },
  { href: '/matches', label: 'Matches' },
  { href: '/profile', label: 'Profile' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-black text-pink-500 tracking-tight">blindspot</span>
        <div className="flex items-center gap-6">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                pathname === href ? 'text-pink-500' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          ))}
          <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
