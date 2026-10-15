import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasValidSupabaseConfig = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co'),
)

export const supabase = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function assertSupabaseReady() {
  if (!supabase) {
    throw new Error(
      'Konfigurasi Supabase belum valid. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env lalu restart aplikasi.',
    )
  }

  return supabase
}