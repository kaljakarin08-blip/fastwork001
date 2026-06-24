import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

let _client: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase() {
  if (!_client) {
    _client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  }
  return _client
}
