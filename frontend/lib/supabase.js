import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Ye check karega ki keys mili hain ya nahi. Agar nahi mili toh proper error dega.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key. Apni .env.local file check karein aur server restart karein.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)