"use client"

import type React from "react"
import { createContext, useContext, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
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

  // Memoize the auth context value to prevent unnecessary re-renders
  const memoizedAuth = useMemo(() => auth, [auth.user, auth.isLoading, auth.isAuthenticated]);

  // Show loading spinner while checking auth state
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
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
