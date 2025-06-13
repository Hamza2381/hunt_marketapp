"use client"

import type React from "react"
import { createContext, useContext, useMemo, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { SessionManager } from "@/lib/session-manager"
import type { User } from "@/hooks/use-auth"

// Define types
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  signUp: (email: string, password: string, userData: any) => Promise<{ success: boolean; error?: string }>
  updateUser: (updates: any) => Promise<{ success: boolean; error?: string }>
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock users for demo
const mockUsers = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    password: "password",
    isAdmin: true,
    accountType: "business",
    companyName: "Admin Corp",
  },
  {
    id: "2",
    name: "Business User",
    email: "business@example.com",
    password: "password",
    isAdmin: false,
    accountType: "business",
    companyName: "Business Corp",
    creditLimit: 10000,
    availableCredit: 8500,
  },
  {
    id: "3",
    name: "Personal User",
    email: "user@example.com",
    password: "password",
    isAdmin: false,
    accountType: "personal",
  },
  {
    id: "4",
    name: "Jane Smith",
    email: "jane@example.com",
    password: "password",
    isAdmin: false,
    accountType: "personal",
    creditLimit: 5000,
    availableCredit: 4200,
  },
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const router = useRouter()
  const [isTabReturn, setIsTabReturn] = useState(false)
  const [isAdminPage, setIsAdminPage] = useState(false)

  // Check if current page is admin
  useEffect(() => {
    const checkAdminPage = () => {
      setIsAdminPage(window.location.pathname.startsWith('/admin'))
    }
    
    checkAdminPage()
    
    // Listen for route changes
    const handleRouteChange = () => {
      checkAdminPage()
    }
    
    window.addEventListener('popstate', handleRouteChange)
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  // Check if this is a tab return on mount
  useEffect(() => {
    const checkTabReturn = () => {
      // Skip tab return logic for admin pages
      if (isAdminPage) {
        return
      }
      
      // Check if we have session data and this might be a tab return
      if (SessionManager.hasValidSession() || SessionManager.isTabSwitch()) {
        setIsTabReturn(true)
        // Clear the flag after a short delay
        setTimeout(() => setIsTabReturn(false), 1000)
      }
    }
    
    checkTabReturn()
  }, [isAdminPage])

  // Memoize the auth context value to prevent unnecessary re-renders
  const memoizedAuth = useMemo(() => auth, [auth.user, auth.isLoading, auth.isAuthenticated]);

  // Enhanced loading logic - prevent infinite loading states
  const shouldShowLoading = useMemo(() => {
    // Never show loading for admin pages
    if (isAdminPage) return false
    
    // Don't show loading if we have valid session data
    if (SessionManager.hasValidSession()) return false
    
    // Don't show loading if this is a tab return
    if (isTabReturn) return false
    
    // Only show loading if auth is actually loading and we don't have a user
    return auth.isLoading && !auth.user
  }, [auth.isLoading, auth.user, isAdminPage, isTabReturn])

  // Show loading spinner only when necessary and not stuck
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={memoizedAuth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}
