"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { UserProfile } from "@/lib/supabase"

export interface User {
  id: string
  name: string
  email: string
  accountType: "business" | "personal"
  isAdmin: boolean
  creditLimit: number
  creditUsed: number
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user)
      } else {
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .single()

      if (error) {
        console.error("Error loading user profile:", error)
        setIsLoading(false)
        return
      }

      if (profile) {
        const user: User = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          accountType: profile.account_type,
          isAdmin: profile.is_admin,
          creditLimit: profile.credit_limit,
          creditUsed: profile.credit_used,
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
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
    }
  }

  const updateUser = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
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

  const getAllUsers = async (): Promise<UserProfile[]> => {
    if (!user?.isAdmin) return []

    try {
      const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching users:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error fetching users:", error)
      return []
    }
  }

  const updateUserById = async (
    id: string,
    updates: Partial<UserProfile>,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.isAdmin) return { success: false, error: "Unauthorized" }

    try {
      const { error } = await supabase.from("user_profiles").update(updates).eq("id", id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const createUser = async (userData: {
    email: string
    password: string
    name: string
    accountType: "personal" | "business"
    companyName?: string
    creditLimit?: number
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user?.isAdmin) return { success: false, error: "Unauthorized" }

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          name: userData.name,
          account_type: userData.accountType,
          company_name: userData.companyName,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      // Update credit limit if provided
      if (userData.creditLimit && data.user) {
        await supabase.from("user_profiles").update({ credit_limit: userData.creditLimit }).eq("id", data.user.id)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
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
  }
}
