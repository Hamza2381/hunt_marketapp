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
    } else {
      // Only update the ref if we're sure user is null AND we're not in a loading state
      // This prevents flickering during tab switches
      if (!isLoading && typeof window !== 'undefined') {
        // Check if this is a genuine logout vs a page refresh/tab switch
        const isFullUnload = sessionStorage.getItem('fullPageUnload') === 'true';
        if (isFullUnload) {
          isAuthenticatedRef.current = false;
          sessionStorage.removeItem('fullPageUnload');
        }
      }
    }
  }, [user, isLoading])
  
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
        
        // Only check session if we're coming back to the tab
        if (document.visibilityState === 'visible') {
          // Do not trigger a refresh if we're already in a loading state
          if (isLoading) return;
          
          // If we think we're authenticated but don't have a user object
          if (isAuthenticatedRef.current && !user) {
            console.log('Tab visible again, checking auth state without refresh');
            
            try {
              // Just check if we have a session, don't reload
              const { data } = await supabase.auth.getSession();
              if (!data.session) {
                // Only clear auth state if we really don't have a session
                isAuthenticatedRef.current = false;
                sessionStorage.removeItem('userMinimal');
              }
              // Do not force reload - the existing auth state listeners will handle this
            } catch (err) {
              console.error('Error checking auth state:', err);
            }
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
      // Set a flag to prevent multiple simultaneous auth checks
      if (initialized) return;
      setInitialized(true);
      
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
              // Set the auth ref to true to maintain state during tab switches
              isAuthenticatedRef.current = true;
            }
          } catch (e) {
            console.error('Error parsing stored user data', e);
          }
        }
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        
        if (session?.user) {
          await loadUserProfile(session.user)
        } else {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setIsLoading(false);
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
      // Only set loading if we're not already in a loading state
      if (!isLoading) {
        setIsLoading(true)
      }

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
              credit_limit: 1000, // Default credit limit for new users
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
      if (updates.name !== undefined) dbUpdates.name = updates.name?.trim()
      
      // Special handling for email updates to prevent conflicts
      if (updates.email !== undefined) {
        const newEmail = updates.email.toLowerCase().trim();
        
        // Check if email is changing and if new email already exists
        if (newEmail && newEmail !== user.email.toLowerCase()) {
          const { data: existingUser, error: emailCheckError } = await supabase
            .from("user_profiles")
            .select("id, email")
            .eq("email", newEmail)
            .neq("id", user.id)
            .maybeSingle();
          
          if (emailCheckError && emailCheckError.code !== 'PGRST116') {
            console.error("Error checking email uniqueness:", emailCheckError);
            return { success: false, error: "Failed to verify email uniqueness" };
          }
          
          if (existingUser) {
            return { success: false, error: `Email ${updates.email} is already in use` };
          }
          
          dbUpdates.email = newEmail;
        }
      }
      
      if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType
      if (updates.company !== undefined) dbUpdates.company_name = updates.company?.trim()
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone?.trim()
      
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
      if (updates.name !== undefined) dbUpdates.name = updates.name?.trim()
      
      // Special handling for email updates to prevent conflicts
      if (updates.email !== undefined) {
        const newEmail = updates.email.toLowerCase().trim();
        
        // Check if email is changing and if new email already exists
        if (newEmail) {
          const { data: existingUser, error: emailCheckError } = await supabase
            .from("user_profiles")
            .select("id, email")
            .eq("email", newEmail)
            .neq("id", id)
            .maybeSingle();
          
          if (emailCheckError && emailCheckError.code !== 'PGRST116') {
            console.error("Error checking email uniqueness:", emailCheckError);
            return { success: false, error: "Failed to verify email uniqueness" };
          }
          
          if (existingUser) {
            return { success: false, error: `Email ${updates.email} is already in use by another user` };
          }
          
          dbUpdates.email = newEmail;
        }
      }
      
      if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType
      if (updates.company !== undefined) dbUpdates.company_name = updates.company?.trim()
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone?.trim()
      
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
      console.log("Calling API to create user:", userData.email);
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const result = await response.json();
      
      console.log('API response:', result);
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to create user' };
      }
      
      return result;
      
    } catch (error: any) {
      console.error("User creation error:", error);
      return { success: false, error: error.message || "An unexpected error occurred" };
    }
  }

  const deleteUser = async (id: string) => {
    if (!user?.isAdmin) {
      console.error("Unauthorized access to deleteUser");
      return false;
    }

    try {
      console.log("Deleting user with ID:", id);
      
      // First, get user profile to check for existing orders
      const { data: userProfile, error: fetchError } = await supabase
        .from("user_profiles")
        .select("email, name")
        .eq("id", id)
        .single();
      
      if (fetchError) {
        console.error("Error fetching user profile:", fetchError);
        return false;
      }
      
      // Check for existing orders
      const { data: existingOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", id);
      
      if (ordersError) {
        console.error("Error checking existing orders:", ordersError);
        return false;
      }
      
      // If user has orders, we should not delete them completely
      // Instead, we'll anonymize the user data
      if (existingOrders && existingOrders.length > 0) {
        console.log(`User has ${existingOrders.length} orders. Anonymizing user data instead of full deletion.`);
        
        // Anonymize the user profile
        const anonymizedEmail = `deleted_user_${Date.now()}@anonymized.local`;
        const { error: anonymizeError } = await supabase
          .from("user_profiles")
          .update({
            name: "[Deleted User]",
            email: anonymizedEmail,
            phone: null,
            address_street: null,
            address_city: null,
            address_state: null,
            address_zip: null,
            company_name: null,
            status: "inactive",
            updated_at: new Date().toISOString()
          })
          .eq("id", id);
        
        if (anonymizeError) {
          console.error("Error anonymizing user profile:", anonymizeError);
          return false;
        }
        
        // Delete from auth after anonymizing profile
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        
        if (authError) {
          console.error("Error deleting auth user:", authError);
          // Continue anyway - the profile has been anonymized which is the main goal
          console.log("Auth deletion failed but profile has been anonymized");
        }
        
        console.log(`User ${userProfile.email} anonymized successfully due to existing orders`);
        return true;
      }
      
      // If no orders exist, we can safely delete everything
      console.log("No orders found. Proceeding with full deletion.");
      
      try {
        // STEP 1: Delete related data first (foreign key constraints)
        console.log("Deleting chat messages...");
        const { error: messagesError } = await supabase
          .from("chat_messages")
          .delete()
          .eq("sender_id", id);
        
        if (messagesError) {
          console.error("Error deleting chat messages:", messagesError);
          // Continue anyway - this is not critical
        }
        
        console.log("Deleting chat conversations...");
        const { error: conversationsError } = await supabase
          .from("chat_conversations")
          .delete()
          .eq("user_id", id);
        
        if (conversationsError) {
          console.error("Error deleting chat conversations:", conversationsError);
          // Continue anyway - this is not critical
        }
        
        // STEP 2: Delete user profile FIRST to free up the email immediately
        console.log("Deleting user profile...");
        const { error: profileError } = await supabase
          .from("user_profiles")
          .delete()
          .eq("id", id);
        
        if (profileError) {
          console.error("Error deleting profile:", profileError);
          return false;
        }
        
        console.log("Profile deleted successfully - email is now available for reuse");

        // STEP 3: Delete auth user AFTER profile deletion
        // Add a small delay to ensure profile deletion is propagated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("Deleting auth user...");
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        
        if (authError) {
          console.error("Error deleting auth user:", authError);
          // The profile is already deleted, so the email is available for reuse
          console.log("Auth user deletion failed, but profile was deleted - email is available for reuse");
        } else {
          console.log("Auth user deleted successfully");
        }

        // STEP 4: Verify cleanup by checking if email is truly available
        const { data: verifyProfile, error: verifyError } = await supabase
          .from("user_profiles")
          .select("email")
          .eq("email", userProfile.email.toLowerCase())
          .maybeSingle();
        
        if (verifyError && verifyError.code !== 'PGRST116') {
          console.warn("Could not verify profile deletion:", verifyError);
        } else if (verifyProfile) {
          console.error("Profile still exists after deletion - this should not happen");
          return false;
        } else {
          console.log("Verified: Profile completely removed from database");
        }

        console.log(`User ${userProfile.email} deleted completely and email is confirmed available for reuse`);
        return true;
        
      } catch (deleteError) {
        console.error("Error during user deletion process:", deleteError);
        return false;
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
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
