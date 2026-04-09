import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

declare global {
  // eslint-disable-next-line no-var
  var _supabase: SupabaseClient | undefined
}

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const supabase: SupabaseClient =
  globalThis._supabase ?? (globalThis._supabase = createClient())
