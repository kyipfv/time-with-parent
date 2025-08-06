import { createClient } from '@supabase/supabase-js'

// These should be in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey)
}

// Only create client if we have valid config, otherwise create a dummy client
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

// Provide a safe wrapper for Supabase operations
export const safeSupabase = () => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, using demo mode')
    return null
  }
  return supabase
}