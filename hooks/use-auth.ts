"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase-client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export interface User {
  id: string
  name: string
  email: string
  accountType: "business" | "personal"
  isAdmin: boolean
  creditLimit: number
  creditUsed: number
  availableCredit?: number
  company?: string
  phone?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  createdAt?: string
  temporaryPassword?: boolean
  lastLogin?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<any>(null)

  // Memoize isAuthenticated to prevent unnecessary re-renders
  const isAuthenticated = useMemo(() => !!user, [user])

  // Simplified user profile loading
  const loadUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      console.log('Loading user profile for:', supabaseUser.id)

      // Get profile from database
      const { data: profileData, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error)
        throw error
      }

      // If profile doesn't exist, create it
      if (!profileData) {
        console.log("Creating new user profile...")
        
        const newProfile = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User",
          email: supabaseUser.email!,
          account_type: supabaseUser.user_metadata?.account_type || "personal",
          company_name: supabaseUser.user_metadata?.company_name,
          is_admin: false,
          credit_limit: 1000,
          credit_used: 0,
          status: 'active'
        }

        const { data: createdProfile, error: createError } = await supabase
          .from("user_profiles")
          .insert([newProfile])
          .select()
          .single()

        if (createError) {
          console.error("Error creating profile:", createError)
          throw createError
        }

        profileData = createdProfile
      }

      if (profileData) {
        const user: User = {
          id: profileData.id,
          name: profileData.name,
          email: profileData.email,
          accountType: profileData.account_type,
          isAdmin: Boolean(profileData.is_admin),
          creditLimit: profileData.credit_limit || 0,
          creditUsed: profileData.credit_used || 0,
          availableCredit: (profileData.credit_limit || 0) - (profileData.credit_used || 0),
          company: profileData.company_name,
          phone: profileData.phone,
          address: profileData.address_street
            ? {
                street: profileData.address_street,
                city: profileData.address_city || "",
                state: profileData.address_state || "",
                zipCode: profileData.address_zip || "",
              }
            : undefined,
          createdAt: profileData.created_at,
        }

        console.log('User profile loaded successfully:', {
          email: user.email,
          isAdmin: user.isAdmin
        })
        
        setUser(user)
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
      setUser(null)
    }
  }, [])

  // Initialize auth state - SIMPLIFIED
  useEffect(() => {
    let isMounted = true
    
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (isMounted) {
          setSession(currentSession)
          
          if (currentSession?.user) {
            await loadUserProfile(currentSession.user)
          } else {
            setUser(null)
          }
          
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (isMounted) {
          setUser(null)
          setSession(null)
          setIsLoading(false)
        }
      }
    }

    initializeAuth()
    
    return () => {
      isMounted = false
    }
  }, [loadUserProfile])

  // SIMPLIFIED auth state change handler with better error handling
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('🔄 Auth state changed:', event, 'Session exists:', !!currentSession)
      
      try {
        setSession(currentSession)
        
        if (event === 'SIGNED_IN' && currentSession?.user) {
          console.log('✅ User signed in, loading profile...')
          await loadUserProfile(currentSession.user)
          setIsLoading(false)
        } else if (event === 'SIGNED_OUT' || !currentSession) {
          console.log('❌ User signed out')
          setUser(null)
          setIsLoading(false)
          
          // Handle redirects
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            const isProtectedPage = currentPath.includes('/admin') || 
                                  currentPath.includes('/profile') || 
                                  currentPath.includes('/orders') || 
                                  currentPath.includes('/cart')
            
            if (isProtectedPage) {
              setTimeout(() => {
                window.location.replace('/login')
              }, 100)
            }
          }
        } else if (event === 'TOKEN_REFRESHED' && currentSession?.user) {
          console.log('🔄 Token refreshed')
          // Don't reload profile on token refresh if we already have user data
          setIsLoading(false)
        }
      } catch (error) {
        console.error('❌ Auth state change error:', error)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserProfile]) // Removed 'user' dependency to prevent infinite loop

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🚀 Starting login process for:', email)
      
      // Clear any existing state first
      setUser(null)
      setSession(null)
      setIsLoading(true)
      
      console.log('🔧 Making login API request...')
      
      // Use our custom login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      console.log('🔧 Login API response status:', response.status)
      
      const result = await response.json()
      console.log('🔧 Login API result:', result)
      
      if (!result.success) {
        console.log('❌ Login API failed:', result.error)
        setIsLoading(false)
        return { success: false, error: result.error || 'Login failed' }
      }
      
      console.log('✅ Login API successful, signing in with Supabase...')
      console.log('🔧 Auth email:', result.authEmail)
      
      // Sign in with auth credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: result.authEmail,
        password: result.password,
      })

      console.log('🔧 Supabase signIn result:', {
        hasData: !!data,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        error: error?.message
      })

      if (error) {
        console.log('❌ Supabase sign in failed:', error.message)
        setIsLoading(false)
        return { success: false, error: error.message }
      }
      
      if (data.session?.user) {
        console.log('✅ Login successful, session created for user:', data.user?.id)
        // The auth state change handler will handle setting session and loading profile
        // Just return success here
        return { success: true }
      } else {
        console.log('❌ Login succeeded but no session/user data')
        setIsLoading(false)
        return { success: false, error: 'Login succeeded but session was not created' }
      }
      
    } catch (error) {
      console.error('❌ Login error:', error)
      setIsLoading(false)
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const logout = async () => {
    try {
      console.log('Starting logout process...')
      
      setUser(null)
      setSession(null)
      setIsLoading(false)
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear storage
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.clear()
          // Only clear auth-related localStorage items
          const authKeys = ['supabase-auth-token', 'sb-localhost-auth-token']
          authKeys.forEach(key => localStorage.removeItem(key))
        } catch (error) {
          console.warn('Failed to clear storage:', error)
        }
        
        // Redirect
        window.location.replace('/login')
      }
      
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even on error
      if (typeof window !== 'undefined') {
        window.location.replace('/login')
      }
    }
  }

  const signUp = async (
    email: string,
    password: string,
    userData: {
      name: string
      accountType: "personal" | "business"
      companyName?: string
    },
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            account_type: userData.accountType,
            company_name: userData.companyName,
          },
        },
      })

      if (error) {
        setIsLoading(false)
        return { success: false, error: error.message }
      }

      setIsLoading(false)
      return { success: true }
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const updateUser = async (updates: any): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not authenticated" }

    try {
      const dbUpdates: any = {}
      
      if (updates.name !== undefined) dbUpdates.name = updates.name?.trim()
      if (updates.email !== undefined) dbUpdates.email = updates.email?.toLowerCase().trim()
      if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType
      if (updates.company !== undefined) dbUpdates.company_name = updates.company?.trim()
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone?.trim()
      
      if (updates.creditLimit !== undefined) {
        const creditLimit = Number(updates.creditLimit)
        if (!isNaN(creditLimit)) dbUpdates.credit_limit = creditLimit
      }
      
      if (updates.creditUsed !== undefined) {
        const creditUsed = Number(updates.creditUsed)
        if (!isNaN(creditUsed)) dbUpdates.credit_used = creditUsed
      }
      
      if (updates.address) {
        if (updates.address.street !== undefined) dbUpdates.address_street = updates.address.street
        if (updates.address.city !== undefined) dbUpdates.address_city = updates.address.city
        if (updates.address.state !== undefined) dbUpdates.address_state = updates.address.state
        if (updates.address.zipCode !== undefined) dbUpdates.address_zip = updates.address.zipCode
      }

      if (Object.keys(dbUpdates).length === 0) {
        return { success: false, error: "No valid fields to update" }
      }

      const { error } = await supabase
        .from("user_profiles")
        .update(dbUpdates)
        .eq("id", user.id)

      if (error) {
        return { success: false, error: error.message }
      }

      // Reload user profile
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      if (supabaseUser) {
        await loadUserProfile(supabaseUser)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  // Admin functions (simplified)
  const getAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching users:", error)
        return []
      }

      return data.map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        accountType: profile.account_type,
        isAdmin: Boolean(profile.is_admin),
        creditLimit: profile.credit_limit || 0,
        creditUsed: profile.credit_used || 0,
        availableCredit: (profile.credit_limit || 0) - (profile.credit_used || 0),
        company: profile.company_name,
        phone: profile.phone,
        address: profile.address_street
          ? {
              street: profile.address_street,
              city: profile.address_city || "",
              state: profile.address_state || "",
              zipCode: profile.address_zip || "",
            }
          : undefined,
        createdAt: profile.created_at,
        lastLogin: profile.last_login,
      })) || []
    } catch (error) {
      console.error("Error fetching users:", error)
      return []
    }
  }

  const updateUserById = async (id: string, updates: any) => {
    if (!user?.isAdmin) {
      return { success: false, error: "Unauthorized" }
    }

    try {
      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: id,
          updates: updates,
          adminUserId: user.id
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Update failed' }
      }
      
      return result
    } catch (error: any) {
      return { success: false, error: error.message || "Network error" }
    }
  }

  const createUser = async (userData: any) => {
    if (!user?.isAdmin) {
      return { success: false, error: "Unauthorized" }
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      
      return await response.json()
    } catch (error: any) {
      return { success: false, error: error.message || "Network error" }
    }
  }

  const deleteUser = async (id: string) => {
    if (!user?.isAdmin) {
      return false
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      
      return response.ok
    } catch (error) {
      console.error("Error deleting user:", error)
      return false
    }
  }

  const resetUserPassword = async (id: string) => {
    if (!user?.isAdmin) {
      return null
    }

    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        return null
      }
      
      return result.password
    } catch (error) {
      console.error("Error resetting password:", error)
      return null
    }
  }

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    login,
    logout,
    signUp,
    updateUser,
    getAllUsers,
    updateUserById,
    createUser,
    deleteUser,
    resetUserPassword,
  }
}
