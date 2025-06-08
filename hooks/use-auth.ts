"use client"

import { useState, useEffect } from "react"
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
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        await loadUserProfile(session.user)
      } else {
        setIsLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email)

      if (session?.user) {
        await loadUserProfile(session.user)
      } else {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      setIsLoading(true)

      const { data: fetchedProfile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .single()
      
      let profile = fetchedProfile

      if (error) {
        console.error("Error loading user profile:", error)

        // If profile doesn't exist, create it
        if (error.code === "PGRST116") {
          console.log("Creating user profile...")
          const { data: newProfile, error: createError } = await supabase
            .from("user_profiles")
            .insert({
              id: supabaseUser.id,
              name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User",
              email: supabaseUser.email!,
              account_type: supabaseUser.user_metadata?.account_type || "personal",
              company_name: supabaseUser.user_metadata?.company_name,
              is_admin: false,
              credit_limit: 0,
              credit_used: 0,
            })
            .select()
            .single()

          if (createError) {
            console.error("Error creating user profile:", createError)
            setIsLoading(false)
            return
          }

          profile = newProfile
        } else {
          setIsLoading(false)
          return
        }
      }

      if (profile) {
        const user: User = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          accountType: profile.account_type,
          isAdmin: profile.is_admin,
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
        }

        console.log("User profile loaded:", user.email)
        setUser(user)
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setIsLoading(false)
        return { success: false, error: error.message }
      }

      // User profile will be loaded by the auth state change listener
      return { success: true }
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
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

      // User profile will be created by the trigger or auth state change listener
      return { success: true }
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const updateUser = async (updates: any): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not authenticated" }

    try {
      const { error } = await supabase.from("user_profiles").update(updates).eq("id", user.id)

      if (error) {
        return { success: false, error: error.message }
      }

      // Reload user profile
      const supabaseUser = (await supabase.auth.getUser()).data.user
      if (supabaseUser) {
        await loadUserProfile(supabaseUser)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  // Admin-specific functions
  const getAllUsers = async () => {
    // Ensure user is admin
    if (!user?.isAdmin) {
      console.error("Unauthorized access to getAllUsers")
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching users:", error)
        return []
      }

      // Transform to User type
      return data.map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        accountType: profile.account_type,
        isAdmin: profile.is_admin,
        creditLimit: profile.credit_limit || 0,
        creditUsed: profile.credit_used || 0,
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
        temporaryPassword: profile.temporary_password,
        lastLogin: profile.last_login,
      })) || []
    } catch (error) {
      console.error("Error fetching users:", error)
      return []
    }
  }

  const updateUserById = async (id: string, updates: any) => {
    if (!user?.isAdmin) {
      console.error("Unauthorized access to updateUserById");
      return { success: false, error: "Unauthorized" };
    }

    try {
      // Convert from camelCase to snake_case for DB
      const dbUpdates: any = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.email !== undefined) dbUpdates.email = updates.email
      if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType
      if (updates.company !== undefined) dbUpdates.company_name = updates.company
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone
      if (updates.creditLimit !== undefined) dbUpdates.credit_limit = updates.creditLimit
      if (updates.creditUsed !== undefined) dbUpdates.credit_used = updates.creditUsed
      
      // Handle address
      if (updates.address) {
        if (updates.address.street !== undefined) dbUpdates.address_street = updates.address.street
        if (updates.address.city !== undefined) dbUpdates.address_city = updates.address.city
        if (updates.address.state !== undefined) dbUpdates.address_state = updates.address.state
        if (updates.address.zipCode !== undefined) dbUpdates.address_zip = updates.address.zipCode
      }

      const { error } = await supabase.from("user_profiles").update(dbUpdates).eq("id", id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const createUser = async (userData: any) => {
    if (!user?.isAdmin) {
      console.error("Unauthorized access to createUser");
      return { success: false, error: "Unauthorized" };
    }

    try {
      // Generate a random password if not provided
      const password = userData.password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()
      
      // Create the user in auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password,
        email_confirm: true,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      // Create profile
      if (data.user) {
        const { error: profileError } = await supabase.from("user_profiles").insert({
          id: data.user.id,
          name: userData.name,
          email: userData.email,
          account_type: userData.accountType,
          company_name: userData.company,
          phone: userData.phone,
          is_admin: userData.isAdmin || false,
          credit_limit: userData.creditLimit || 0,
          credit_used: userData.creditUsed || 0,
          address_street: userData.address?.street,
          address_city: userData.address?.city,
          address_state: userData.address?.state,
          address_zip: userData.address?.zipCode,
          temporary_password: true,
        })

        if (profileError) {
          console.error("Error creating profile:", profileError)
          return { success: false, error: profileError.message }
        }

        return { 
          success: true,
          user: {
            id: data.user.id,
            name: userData.name,
            email: userData.email,
            accountType: userData.accountType,
            isAdmin: userData.isAdmin || false,
            creditLimit: userData.creditLimit || 0,
            creditUsed: userData.creditUsed || 0,
            company: userData.company,
            phone: userData.phone,
            address: userData.address,
            temporaryPassword: true,
          },
          password 
        }
      }

      return { success: false, error: "Failed to create user" }
    } catch (error) {
      console.error("Error creating user:", error)
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const deleteUser = async (id: string) => {
    if (!user?.isAdmin) {
      console.error("Unauthorized access to deleteUser");
      return false;
    }

    try {
      // Delete profile first to maintain referential integrity
      const { error: profileError } = await supabase.from("user_profiles").delete().eq("id", id)
      
      if (profileError) {
        console.error("Error deleting profile:", profileError)
        return false
      }

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(id)
      
      if (authError) {
        console.error("Error deleting auth user:", authError)
        return false
      }

      return true
    } catch (error) {
      console.error("Error deleting user:", error)
      return false
    }
  }

  const resetUserPassword = async (id: string) => {
    if (!user?.isAdmin) {
      console.error("Unauthorized access to resetUserPassword");
      return null;
    }

    try {
      // Generate random password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()
      
      // Update auth user password
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: tempPassword,
      })

      if (error) {
        console.error("Error resetting password:", error)
        return null
      }

      // Update profile to indicate temporary password
      await supabase.from("user_profiles").update({
        temporary_password: true,
      }).eq("id", id)

      return tempPassword
    } catch (error) {
      console.error("Error resetting password:", error)
      return null
    }
  }

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    signUp,
    updateUser,
    changePassword,
    requestPasswordReset,
    getAllUsers,
    updateUserById,
    createUser,
    deleteUser,
    resetUserPassword,
  }
}
