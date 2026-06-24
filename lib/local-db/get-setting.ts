import { getSupabase } from '@/lib/supabase/admin'

export async function getSetting(key: string, fallbackEnv?: string): Promise<string> {
  try {
    const sb = getSupabase()
    const { data } = await sb.from('app_settings').select('value').eq('key', key).single()
    if (data?.value) return data.value
  } catch { /* ignore */ }
  return (fallbackEnv ? process.env[fallbackEnv] ?? '' : '') || ''
}
