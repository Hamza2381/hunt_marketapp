"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase-client"
import { supabaseAdmin } from "@/lib/supabase-admin"
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
  // Memoize user state to improve performance and prevent unnecessary re-renders
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  
  // Create ref at the top level of the hook
  const isAuthenticatedRef = useRef(false)
  
  // Update the ref when user changes
  useEffect(() => {
    if (user) {
      isAuthenticatedRef.current = true
    }
  }, [user])
  
  // Cache auth state to survive refreshes and back/forward navigation
  useEffect(() => {
    
    if (typeof window !== 'undefined') {
      // Only cache the minimal user data when we have a user
      if (user) {
        sessionStorage.setItem('userMinimal', JSON.stringify({ 
          id: user.id,
          isAuthenticated: true 
        }));
      }
      
      // Function to handle page visibility changes (tab switching, etc.)
      const handleVisibilityChange = async () => {
        // Check if we should prevent refresh due to user interaction
        const preventRefresh = sessionStorage.getItem('preventRefresh') === 'true';
        if (preventRefresh) {
          return; // Skip authentication check if user recently interacted
        }
        
        // Only attempt to refresh if we're coming back to the tab AND 
        // we were previously authenticated but don't have a user object now
        if (document.visibilityState === 'visible' && 
            isAuthenticatedRef.current && 
            !user && 
            !isLoading) {
          
          // Subtle check - don't set loading state to avoid UI flicker
          try {
            const { data } = await supabase.auth.getSession();
            // If we have a session but no user, the auth listener will handle it
            if (!data.session) {
              // Only clear auth state if we really don't have a session
              isAuthenticatedRef.current = false;
              sessionStorage.removeItem('userMinimal');
            }
          } catch (err) {
            console.error('Error checking auth state:', err);
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isLoading, user, isAuthenticatedRef]);

  useEffect(() => {
   // Initialize auth
    // Get initial session
    const getInitialSession = async () => {
      // Check if we have minimal user data in session storage to avoid loading state flicker
      if (typeof window !== 'undefined') {
        const storedUser = sessionStorage.getItem('userMinimal');
        if (storedUser) {
          try {
            const minimalUser = JSON.parse(storedUser);
            // Set minimal user info to prevent loading screen on navigation
            if (minimalUser && minimalUser.isAuthenticated) {
              // Don't set full loading state if we have minimal info
              setIsLoading(false);
            }
          } catch (e) {
            console.error('Error parsing stored user data', e);
          }
        }
      }

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
      // Auth state changed handler

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

      // if (error) {
      //   console.error("Error loading user profile:", error)

      //   // If profile doesn't exist, create it
      //   if (error.code === "PGRST116") {
      //     console.log("Creating user profile...")
      //     const { data: newProfile, error: createError } = await supabase
      //       .from("user_profiles")
      //       .insert({
      //         id: supabaseUser.id,
      //         name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User",
      //         email: supabaseUser.email!,
      //         account_type: supabaseUser.user_metadata?.account_type || "personal",
      //         company_name: supabaseUser.user_metadata?.company_name,
      //         is_admin: false,
      //         credit_limit: 0,
      //         credit_used: 0,
      //       })
      //       .select()
      //       .single()

      //     if (createError) {
      //       console.error("Error creating user profile:", createError)
      //       setIsLoading(false)
      //       return
      //     }

      //     profile = newProfile
      //   } else {
      //     setIsLoading(false)
      //     return
      //   }
      // }

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

        // User profile successfully loaded
        setUser(user)
        
        // Cache minimal user data for navigation state preservation
        if (typeof window !== 'undefined') {
          // Store user data with a longer expiration
          try {
            const userData = { 
              id: user.id,
              isAuthenticated: true,
              timestamp: new Date().getTime()
            };
            sessionStorage.setItem('userMinimal', JSON.stringify(userData));
            
            // Also set a flag to help with navigation
            sessionStorage.setItem('isLoggedIn', 'true');
          } catch (e) {
            console.error('Error storing user data:', e);
          }
        }
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
         const dbUpdates: any = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.email !== undefined) dbUpdates.email = updates.email
      if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType
      if (updates.company !== undefined) dbUpdates.company_name = updates.company
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone
      
      // Special handling for credit fields to ensure proper decimal formatting
      if (updates.creditLimit !== undefined) {
        // Force number and format to 2 decimal places for DB
        const creditLimit = Number(updates.creditLimit);
        if (!isNaN(creditLimit)) {
          dbUpdates.credit_limit = creditLimit;
          console.log("Credit Update - Setting credit_limit to:", dbUpdates.credit_limit);
        }
      }
      
      if (updates.creditUsed !== undefined) {
        // Force number and format to 2 decimal places for DB
        const creditUsed = Number(updates.creditUsed);
        if (!isNaN(creditUsed)) {
          dbUpdates.credit_used = creditUsed;
          console.log("Credit Update - Setting credit_used to:", dbUpdates.credit_used);
        }
      }
      
      // Handle address
      if (updates.address) {
        if (updates.address.street !== undefined) dbUpdates.address_street = updates.address.street
        if (updates.address.city !== undefined) dbUpdates.address_city = updates.address.city
        if (updates.address.state !== undefined) dbUpdates.address_state = updates.address.state
        if (updates.address.zipCode !== undefined) dbUpdates.address_zip = updates.address.zipCode
      }

      console.log("Credit Update - Final DB updates:", dbUpdates);
      
      // Make sure we have something to update
      if (Object.keys(dbUpdates).length === 0) {
        console.error("Credit Update - No valid fields to update");
        return { success: false, error: "No valid fields to update" };
      }
      const { error } = await supabase.from("user_profiles").update(dbUpdates).eq("id", user.id)

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
    // No need to check for admin status here as we'll handle this in the component
    // This allows the component to properly load before checking permissions

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
        temporaryPassword: profile.temporary_password || true, // Default to true if column doesn't exist yet
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
      console.log("Credit Update - Updating user with ID:", id);
      console.log("Credit Update - Updates received:", updates);
      
      // Convert from camelCase to snake_case for DB
      const dbUpdates: any = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.email !== undefined) dbUpdates.email = updates.email
      if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType
      if (updates.company !== undefined) dbUpdates.company_name = updates.company
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone
      
      // Special handling for credit fields to ensure proper decimal formatting
      if (updates.creditLimit !== undefined) {
        // Force number and format to 2 decimal places for DB
        const creditLimit = Number(updates.creditLimit);
        if (!isNaN(creditLimit)) {
          dbUpdates.credit_limit = creditLimit;
          console.log("Credit Update - Setting credit_limit to:", dbUpdates.credit_limit);
        }
      }
      
      if (updates.creditUsed !== undefined) {
        // Force number and format to 2 decimal places for DB
        const creditUsed = Number(updates.creditUsed);
        if (!isNaN(creditUsed)) {
          dbUpdates.credit_used = creditUsed;
          console.log("Credit Update - Setting credit_used to:", dbUpdates.credit_used);
        }
      }
      
      // Handle address
      if (updates.address) {
        if (updates.address.street !== undefined) dbUpdates.address_street = updates.address.street
        if (updates.address.city !== undefined) dbUpdates.address_city = updates.address.city
        if (updates.address.state !== undefined) dbUpdates.address_state = updates.address.state
        if (updates.address.zipCode !== undefined) dbUpdates.address_zip = updates.address.zipCode
      }

      console.log("Credit Update - Final DB updates:", dbUpdates);
      
      // Make sure we have something to update
      if (Object.keys(dbUpdates).length === 0) {
        console.error("Credit Update - No valid fields to update");
        return { success: false, error: "No valid fields to update" };
      }
      
      // Directly update the profile
      const { data, error } = await supabase
        .from("user_profiles")
        .update(dbUpdates)
        .eq("id", id)
        .select();

      if (error) {
        console.error("Credit Update - Error updating profile:", error);
        return { success: false, error: error.message };
      }
      
      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", id)
        .single();
        
      if (verifyError) {
        console.error("Credit Update - Error verifying update:", verifyError);
      } else {
        console.log("Credit Update - Updated profile verification:", {
          credit_limit: verifyData.credit_limit,
          credit_used: verifyData.credit_used
        });
      }
      
      console.log("Credit Update - Update successful");
      return { success: true, data: data?.[0] || verifyData };
    } catch (error: any) {
      console.error("Credit Update - Unexpected error:", error);
      return { success: false, error: error.message || "An unexpected error occurred" };
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
      
      console.log("Creating user with admin client:", userData.email);
      
      // Create the user in auth using admin client
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password,
        email_confirm: true,
      })

      if (error) {
        console.error("Error creating auth user:", error);
        return { success: false, error: error.message }
      }

      // Create profile
      if (data.user) {
      
        const { error } = await supabase.from("user_profiles").update({
    
          name: userData.name,
          // email: userData.email,
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
          // temporary_password field will be added later
          // temporary_password: true,
        }).eq("id", data.user.id);

        if (error) {
          console.error("Error creating profile:", error)
          return { success: false, error: error.message }
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
            temporaryPassword: true, // This is just for UI display
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
      console.log("Deleting user with ID:", id);
      
      // Delete profile first to maintain referential integrity
      const { error: profileError } = await supabase.from("user_profiles").delete().eq("id", id)
      
      if (profileError) {
        console.error("Error deleting profile:", profileError)
        return false
      }

      // Delete auth user with admin client
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
      
      if (authError) {
        console.error("Error deleting auth user:", authError)
        return false
      }

      console.log("User deleted successfully");
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
      console.log("Resetting password for user ID:", id);
      // Generate random password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()
      
      // Update auth user password with admin client
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: tempPassword,
      })

      if (error) {
        console.error("Error resetting password:", error)
        return null
      }

      // Update profile to indicate temporary password
      // Commented out until column is added
      // await supabase.from("user_profiles").update({
      //   temporary_password: true,
      // }).eq("id", id)

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
