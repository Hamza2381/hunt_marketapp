"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase-client"
import { SessionManager } from "@/lib/session-manager"
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
  const [initialized, setInitialized] = useState(false)

  // Memoize isAuthenticated to prevent unnecessary re-renders
  const isAuthenticated = useMemo(() => !!user, [user])

  // Enhanced user profile loading with admin status protection
  const loadUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    const isAdminPage = window.location.pathname.startsWith('/admin')
    
    try {
      console.log('Loading user profile for:', supabaseUser.id, 'on admin page:', isAdminPage)

      // Test database connection first
      try {
        const { data: connectionTest, error: connectionError } = await supabase
          .from('user_profiles')
          .select('count')
          .limit(1)
        
        if (connectionError) {
          console.error('Database connection test failed:', connectionError)
          throw new Error(`Database connection failed: ${connectionError.message}`)
        }
        
        console.log('Database connection successful for user profiles')
      } catch (dbError: any) {
        console.error('Database connection error:', dbError)
        throw new Error(`Database connection error: ${dbError.message}`)
      }

      // Get profile from database with proper error handling
      console.log('Fetching user profile from database...')
      const { data: fetchedProfile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId: supabaseUser.id
        })
        throw error
      }

      let profileData = fetchedProfile

      // If profile doesn't exist, create it (but never as admin by default)
      if (!profileData) {
        console.log("Creating new user profile...")
        
        const newProfile = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User",
          email: supabaseUser.email!,
          account_type: supabaseUser.user_metadata?.account_type || "personal",
          company_name: supabaseUser.user_metadata?.company_name,
          is_admin: false, // New users are never admin by default
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
          isAdmin: Boolean(profileData.is_admin), // Ensure boolean conversion
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
          isAdmin: user.isAdmin,
          adminValue: profileData.is_admin,
          booleanCheck: Boolean(profileData.is_admin)
        })
        
        setUser(user)
        
        // Only save to session for non-admin pages to avoid conflicts
        if (!isAdminPage) {
          SessionManager.saveAppState({
            isAuthenticated: true,
            userEmail: user.email,
            userId: user.id,
            isAdmin: user.isAdmin,
            currentPath: window.location.pathname
          })
        }
      } else {
        console.log('No profile data found')
        setUser(null)
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
      // Only clear session for non-admin pages
      if (!isAdminPage) {
        SessionManager.clearAppState()
      }
      setUser(null)
    }
  }, []) // Remove dependencies to prevent recreations

  // Fast restoration from session (disabled for admin pages)
  const restoreFromSession = useCallback(() => {
    // Never restore from session on admin pages
    if (window.location.pathname.startsWith('/admin')) {
      return false
    }
    
    const sessionUser = SessionManager.getUserFromSession()
    if (sessionUser) {
      console.log('Restoring user from session:', sessionUser.email, 'isAdmin:', sessionUser.isAdmin)
      setUser({
        id: sessionUser.id,
        name: 'Loading...',
        email: sessionUser.email,
        accountType: 'personal',
        isAdmin: sessionUser.isAdmin,
        creditLimit: 0,
        creditUsed: 0,
        availableCredit: 0
      } as User)
      return true
    }
    return false
  }, []) // Remove dependencies

  // Initialize auth state with enhanced admin page handling
  useEffect(() => {
    if (initialized) return
    
    let isMounted = true // Prevent state updates if component unmounts
    
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        
        if (!isMounted) return
        setInitialized(true)

        // For admin pages, use direct database lookup without session management
        if (window.location.pathname.startsWith('/admin')) {
          console.log('Admin page detected - using direct auth flow')
          
          try {
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session?.user && isMounted) {
              // Direct profile load for admin pages
              await loadUserProfile(session.user)
            } else {
              console.log('No session found for admin page')
              if (isMounted) setUser(null)
            }
          } catch (error) {
            console.error('Admin auth error:', error)
            if (isMounted) setUser(null)
          } finally {
            if (isMounted) setIsLoading(false)
          }
          return
        }

        // Regular flow for non-admin pages
        // Check if this is a tab switch return
        if (SessionManager.isTabSwitch()) {
          console.log('Detected tab switch - attempting quick restore')
          if (restoreFromSession() && isMounted) {
            setIsLoading(false)
            SessionManager.clearTabSwitch()
            
            // Verify and refresh user data in background
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user && isMounted) {
              await loadUserProfile(session.user)
            }
            return
          }
          SessionManager.clearTabSwitch()
        }

        // Check if we have valid session data for quick restore
        if (SessionManager.hasValidSession()) {
          console.log('Found valid session - quick restore')
          if (restoreFromSession() && isMounted) {
            setIsLoading(false)
            
            // Verify auth in background and refresh if needed
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user && isMounted) {
              await loadUserProfile(session.user)
            } else {
              // Session expired, clear state
              if (isMounted) {
                setUser(null)
                SessionManager.clearAppState()
              }
            }
            return
          }
        }

        // Full initialization
        console.log('Performing full auth initialization')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user && isMounted) {
          await loadUserProfile(session.user)
        } else {
          SessionManager.clearAppState()
          if (isMounted) setUser(null)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (isMounted) {
          SessionManager.clearAppState()
          setUser(null)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    initializeAuth()
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false
    }
  }, []) // Empty dependency array to run only once

  // Enhanced auth state change handler with better logout and login handling
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'Session exists:', !!session, 'Current path:', window.location.pathname)
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, loading profile...')
        
        // Clear any existing loading states that might be stuck
        setIsLoading(true)
        
        try {
          // Always reload profile from database for any sign-in
          await loadUserProfile(session.user)
          console.log('Profile loaded successfully after sign in')
        } catch (error) {
          console.error('Failed to load profile after sign in:', error)
          setUser(null)
        } finally {
          setIsLoading(false)
        }
      } else if (event === 'SIGNED_OUT' || !session) {
        console.log('User signed out or session expired, clearing all state')
        
        // Immediate state cleanup
        setUser(null)
        setIsLoading(false) // Important: don't keep loading state
        SessionManager.clearAppState()
        
        // Handle redirects based on current page
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          
          const isAlreadyOnAuthPage = currentPath.includes('/login') || 
                                     currentPath.includes('/signup') || 
                                     currentPath.includes('/forgot-password') || 
                                     currentPath.includes('/reset-password')
          
          const isPublicPage = currentPath === '/' || 
                              currentPath.includes('/products') || 
                              currentPath.includes('/categories') || 
                              currentPath.includes('/deals') || 
                              currentPath.includes('/contact')
          
          const isProtectedPage = currentPath.includes('/admin') || 
                                currentPath.includes('/profile') || 
                                currentPath.includes('/orders') || 
                                currentPath.includes('/cart')
          
          // Redirect to login if on protected pages or admin pages
          if (isProtectedPage || (!isAlreadyOnAuthPage && !isPublicPage)) {
            console.log('Redirecting to login from protected/admin route:', currentPath)
            // Small delay to ensure state is cleared
            setTimeout(() => {
              window.location.replace('/login')
            }, 50)
          }
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed, updating profile if needed')
        // Don't reload profile unnecessarily on token refresh
        if (session?.user && !user) {
          await loadUserProfile(session.user)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserProfile, user])

  // Tab visibility management (only disabled for admin pages for session management, but allows auth flow)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // For admin pages, skip session management but allow normal auth flow
      if (window.location.pathname.startsWith('/admin')) {
        return
      }
      
      if (document.hidden) {
        SessionManager.markTabSwitch()
        SessionManager.updateActivity()
      } else {
        SessionManager.updateActivity()
        
        if (user) {
          SessionManager.saveAppState({
            isAuthenticated: true,
            userEmail: user.email,
            userId: user.id,
            isAdmin: user.isAdmin,
            currentPath: window.location.pathname
          })
        }
      }
    }

    const handleFocus = () => {
      // For admin pages, skip session management but allow normal auth flow
      if (window.location.pathname.startsWith('/admin')) {
        return
      }
      SessionManager.updateActivity()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Starting login process for:', email)
      
      // Clear any existing auth state before login
      setUser(null)
      SessionManager.clearAppState()
      setIsLoading(true)
      
      // Use our custom login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const result = await response.json()
      
      if (!result.success) {
        console.log('Login API failed:', result.error)
        return { success: false, error: result.error || 'Login failed' }
      }
      
      console.log('Login API successful, signing in with Supabase...')
      
      // Sign in with auth credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: result.authEmail,
        password: result.password,
      })

      if (error) {
        console.log('Supabase sign in failed:', error.message)
        return { success: false, error: error.message }
      }
      
      if (data.session?.user) {
        console.log('Login successful, loading user profile...')
        // The auth state change handler will load the profile
        return { success: true }
      } else {
        console.log('Login succeeded but no session/user data')
        return { success: false, error: 'Login succeeded but session was not created' }
      }
      
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: "An unexpected error occurred" }
    } finally {
      // Don't set loading to false here - let the auth state change handler do it
      // setIsLoading(false) // Removed this line
    }
  }

  const logout = async () => {
    try {
      console.log('Starting enhanced logout process...')
      
      // Step 1: Immediately clear ALL auth state to prevent conflicts
      setUser(null)
      setIsLoading(false) // Don't set loading during logout to avoid infinite loading
      
      // Step 2: Complete session cleanup - clear everything
      SessionManager.clearAppState()
      
      // Step 3: Clear ALL browser storage that could interfere with auth (but preserve cart)
      if (typeof window !== 'undefined') {
        try {
          // SELECTIVE CLEARING: Only clear auth-related items, preserve cart data
          const authKeysToRemove = [
            'supabase-auth-token',
            'sb-localhost-auth-token',
            'supabase.auth.token',
            'app_session_state',
            'app_last_activity',
            'app_tab_switch',
            'user_is_admin' // Clear admin status flag
          ]
          
          // Clear specific auth keys from both localStorage and sessionStorage
          authKeysToRemove.forEach(key => {
            localStorage.removeItem(key)
            sessionStorage.removeItem(key)
          })
          
          // Clear sessionStorage completely (it shouldn't have cart data)
          sessionStorage.clear()
          
          // Clear any remaining Supabase auth keys with dynamic patterns
          const allLocalStorageKeys = Object.keys(localStorage)
          allLocalStorageKeys.forEach(key => {
            // Only remove auth-related keys, preserve cart and other app data
            if (key.includes('supabase') && (key.includes('auth') || key.includes('token'))) {
              localStorage.removeItem(key)
            }
          })
          
          console.log('Auth-related storage cleared, cart data preserved')
        } catch (storageError) {
          console.warn('Failed to clear storage:', storageError)
        }
      }
      
      // Step 4: IMMEDIATE redirect for admin pages (before Supabase logout)
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        if (currentPath.startsWith('/admin')) {
          console.log('Admin page logout detected - immediate redirect to login')
          window.location.replace('/login')
          return // Exit early for admin pages
        }
      }
      
      // Step 5: Sign out from Supabase (but don't wait too long)
      const signOutPromise = supabase.auth.signOut({ scope: 'global' })
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 3000) // Reduced timeout
      )
      
      try {
        await Promise.race([signOutPromise, timeoutPromise])
        console.log('Supabase signOut completed successfully')
      } catch (signOutError) {
        console.warn('Supabase signOut failed or timed out:', signOutError)
        // Continue with redirect - don't let this block the logout
      }
      
      // Step 6: Force clear any cached session data
      try {
        // Clear the internal Supabase session cache
        await supabase.auth.getSession() // This refreshes the internal state
      } catch {
        // Ignore errors - we're logging out anyway
      }
      
      console.log('Enhanced logout process completed')
      
      // Step 7: Redirect for non-admin pages
      if (typeof window !== 'undefined') {
        console.log('Redirecting to login with page refresh...')
        // Use location.replace to avoid back button issues
        window.location.replace('/login')
      }
      
    } catch (error) {
      console.error('Logout error:', error)
      
      // Emergency cleanup - even if everything fails, force clean state
      setUser(null)
      setIsLoading(false)
      SessionManager.clearAppState()
      
      if (typeof window !== 'undefined') {
        try {
          // Emergency selective clearing - preserve cart data even in error scenarios
          const authKeysToRemove = [
            'supabase-auth-token',
            'sb-localhost-auth-token',
            'supabase.auth.token',
            'app_session_state',
            'app_last_activity',
            'app_tab_switch',
            'user_is_admin'
          ]
          
          authKeysToRemove.forEach(key => {
            localStorage.removeItem(key)
            sessionStorage.removeItem(key)
          })
          
          sessionStorage.clear()
        } catch {}
        
        // Force redirect even on error
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
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    } finally {
      setIsLoading(false)
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

      // Reload user profile to get updated data
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      if (supabaseUser) {
        await loadUserProfile(supabaseUser)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  // Admin functions
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
        isAdmin: Boolean(profile.is_admin), // Ensure boolean conversion
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
      
      const result = await response.json()
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