/**
 * Admin Status Checker and Recovery Utility
 * Use this to check and fix admin status issues
 */

import { supabase } from "./supabase-client"

export class AdminStatusChecker {
  
  /**
   * Check current user's admin status directly from database
   */
  static async checkCurrentUserAdminStatus(): Promise<{
    isAdmin: boolean;
    userId: string;
    email: string;
    profileData: any;
  } | null> {
    try {
      // Get current auth user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        console.log('No authenticated user found')
        return null
      }
      
      // Get profile from database
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      
      const result = {
        isAdmin: Boolean(profile.is_admin),
        userId: profile.id,
        email: profile.email,
        profileData: profile
      }
      
      console.log('Admin Status Check Result:', result)
      return result
      
    } catch (error) {
      console.error('Admin status check failed:', error)
      return null
    }
  }
  
  /**
   * Get all users with admin status from database
   */
  static async getAllAdminUsers(): Promise<any[]> {
    try {
      const { data: adminUsers, error } = await supabase
        .from('user_profiles')
        .select('id, name, email, is_admin, created_at')
        .eq('is_admin', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching admin users:', error)
        return []
      }
      
      console.log('Current Admin Users:', adminUsers)
      return adminUsers || []
      
    } catch (error) {
      console.error('Failed to get admin users:', error)
      return []
    }
  }
  
  /**
   * Grant admin status to a user by email (emergency function)
   * WARNING: Use this only for emergency admin restoration
   */
  static async grantAdminStatus(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Attempting to grant admin status to:', email)
      
      // Update user profile to admin
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ is_admin: true })
        .eq('email', email.toLowerCase().trim())
        .select()
      
      if (error) {
        console.error('Error granting admin status:', error)
        return { success: false, error: error.message }
      }
      
      if (!data || data.length === 0) {
        return { success: false, error: 'User not found with that email' }
      }
      
      console.log('Admin status granted successfully to:', data[0])
      return { success: true }
      
    } catch (error: any) {
      console.error('Failed to grant admin status:', error)
      return { success: false, error: error.message || 'Unknown error' }
    }
  }
  
  /**
   * Debug function to check database connection and table structure
   */
  static async debugDatabaseConnection(): Promise<void> {
    try {
      console.log('🔍 Debugging database connection...')
      
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('❌ Database connection failed:', testError)
        return
      }
      
      console.log('✅ Database connection successful')
      
      // Check user_profiles table structure
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, is_admin')
        .limit(5)
      
      if (profilesError) {
        console.error('❌ User profiles query failed:', profilesError)
        return
      }
      
      console.log('✅ User profiles table accessible')
      console.log('Sample profiles:', profiles)
      
      // Check for admin users
      const adminUsers = await this.getAllAdminUsers()
      console.log(`✅ Found ${adminUsers.length} admin users`)
      
    } catch (error) {
      console.error('❌ Database debug failed:', error)
    }
  }
  
  /**
   * Emergency admin recovery function
   * Call this from browser console if you lose admin access
   */
  static async emergencyAdminRecovery(yourEmail: string): Promise<void> {
    console.log('🚨 EMERGENCY ADMIN RECOVERY STARTING...')
    
    // Step 1: Debug database
    await this.debugDatabaseConnection()
    
    // Step 2: Check current status
    const currentStatus = await this.checkCurrentUserAdminStatus()
    if (currentStatus?.isAdmin) {
      console.log('✅ You already have admin status!')
      return
    }
    
    // Step 3: Grant admin status
    console.log('🔧 Attempting to restore admin status...')
    const result = await this.grantAdminStatus(yourEmail)
    
    if (result.success) {
      console.log('✅ Admin status restored! Please refresh the page.')
      console.log('🔄 Refreshing page in 3 seconds...')
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } else {
      console.error('❌ Failed to restore admin status:', result.error)
      console.log('📞 Contact system administrator for manual intervention')
    }
  }
}

// Global helper functions for browser console
declare global {
  interface Window {
    checkAdminStatus: () => Promise<any>
    getAllAdmins: () => Promise<any[]>
    emergencyAdminRecovery: (email: string) => Promise<void>
    debugDatabase: () => Promise<void>
  }
}

// Expose functions to global scope for emergency use
if (typeof window !== 'undefined') {
  window.checkAdminStatus = AdminStatusChecker.checkCurrentUserAdminStatus
  window.getAllAdmins = AdminStatusChecker.getAllAdminUsers
  window.emergencyAdminRecovery = AdminStatusChecker.emergencyAdminRecovery
  window.debugDatabase = AdminStatusChecker.debugDatabaseConnection
}