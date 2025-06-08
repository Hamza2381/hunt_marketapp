"use client"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Configure client options for better caching
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase-auth-token',
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') return null
        // Add a timestamp to check later if the session is too old
        const value = localStorage.getItem(key)
        if (value) {
          // Store last access time to help with visibility changes
          const now = new Date().getTime()
          sessionStorage.setItem('auth_last_access', now.toString())
        }
        return value
      },
      setItem: (key, value) => {
        if (typeof window === 'undefined') return
        // Store timestamp when setting auth
        const now = new Date().getTime()
        sessionStorage.setItem('auth_last_access', now.toString())
        localStorage.setItem(key, value)
      },
      removeItem: (key) => {
        if (typeof window === 'undefined') return
        localStorage.removeItem(key)
        sessionStorage.removeItem('auth_last_access')
      },
    },
  },
})
