"use client"

import type React from "react"
import { createContext, useContext } from "react"
import { useAuth } from "@/hooks/use-auth-supabase"
import type { User } from "@/hooks/use-auth-supabase"

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
  getAllUsers: () => Promise<any[]>
  updateUserById: (id: string, updates: any) => Promise<{ success: boolean; error?: string }>
  createUser: (userData: any) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}
