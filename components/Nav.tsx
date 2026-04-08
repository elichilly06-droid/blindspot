'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const tabs = [
  {
    href: '/discover',
    label: 'Discover',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    href: '/likes',
    label: 'Likes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: '/matches',
    label: 'Matches',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:block sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full px-6 py-3 flex items-center justify-between">
          <span className="text-xl font-black text-pink-500 tracking-tight">blindspot</span>
          <div className="flex items-center gap-6">
            {tabs.map(({ href, label }) => (
              <Link key={href} href={href}
                className={`text-sm font-medium transition-colors ${pathname === href ? 'text-pink-500' : 'text-gray-500 hover:text-gray-900'}`}>
                {label}
              </Link>
            ))}
            <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile top header */}
      <header className="md:hidden sticky top-0 z-50 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
        <span className="text-xl font-black text-pink-500 tracking-tight">blindspot</span>
        <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Sign out
        </button>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 flex safe-area-pb">
        {tabs.map(({ href, label, icon }) => (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${pathname === href ? 'text-pink-500' : 'text-gray-400'}`}>
            {icon}
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
