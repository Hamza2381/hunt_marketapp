"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AdminPageWrapperProps {
  children: React.ReactNode
}

export function AdminPageWrapper({ children }: AdminPageWrapperProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [authTimeout, setAuthTimeout] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Loading...')

  // Enhanced timeout protection for infinite loading
  useEffect(() => {
    // Shorter timeout for admin pages since they should load quickly
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('Admin auth loading timeout reached - forcing timeout state')
        setAuthTimeout(true)
      }
    }, 8000) // Reduced to 8 seconds for admin pages

    // Update loading message over time
    const messageTimeout1 = setTimeout(() => {
      if (isLoading) {
        setLoadingMessage('Verifying admin access...')
      }
    }, 1500)

    const messageTimeout2 = setTimeout(() => {
      if (isLoading) {
        setLoadingMessage('Loading admin profile...')
      }
    }, 3000)

    const messageTimeout3 = setTimeout(() => {
      if (isLoading) {
        setLoadingMessage('Almost ready...')
      }
    }, 5000)

    const messageTimeout4 = setTimeout(() => {
      if (isLoading) {
        setLoadingMessage('Taking longer than expected...')
      }
    }, 7000)

    return () => {
      clearTimeout(timeoutId)
      clearTimeout(messageTimeout1)
      clearTimeout(messageTimeout2)
      clearTimeout(messageTimeout3)
      clearTimeout(messageTimeout4)
    }
  }, [isLoading])

  // Enhanced auth redirects with better error handling
  useEffect(() => {
    // Don't redirect if still loading or timeout occurred
    if (isLoading || authTimeout) {
      return
    }
    
    // Handle unauthenticated users
    if (!isAuthenticated) {
      console.log('Admin page: User not authenticated, redirecting to login')
      // Small delay to avoid conflicts
      const timeoutId = setTimeout(() => {
        router.replace('/login')
      }, 100)
      return () => clearTimeout(timeoutId)
    }
    
    // Handle non-admin users
    if (isAuthenticated && user && !user.isAdmin) {
      console.log('Admin page: User is not admin, redirecting to home')
      const timeoutId = setTimeout(() => {
        router.replace('/')
      }, 100)
      return () => clearTimeout(timeoutId)
    }
    
    // If we reach here, user is authenticated and admin - no redirect needed
    if (isAuthenticated && user?.isAdmin) {
      console.log('Admin page: User is authenticated admin, access granted')
    }
  }, [isLoading, isAuthenticated, user?.isAdmin, router, authTimeout, user])

  // Show timeout error
  if (authTimeout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Admin Access Timeout</h1>
          <p className="text-gray-600 mb-4">
            The admin dashboard is taking longer than expected to load. 
            This usually happens when there's an authentication issue or network problem.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => {
                // Clear all auth state and refresh
                if (typeof window !== 'undefined') {
                  localStorage.clear()
                  sessionStorage.clear()
                  window.location.href = '/admin'
                }
              }} 
              className="w-full"
            >
              Clear Cache & Retry
            </Button>
            <Button 
              onClick={() => {
                // Clear auth and go to login
                if (typeof window !== 'undefined') {
                  localStorage.clear()
                  sessionStorage.clear()
                  window.location.href = '/login'
                }
              }} 
              variant="outline" 
              className="w-full"
            >
              Login Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{loadingMessage}</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we verify your access...</p>
        </div>
      </div>
    )
  }
  
  // Show access denied for non-admin users (only after loading is complete)
  if (!isLoading && !authTimeout && (!isAuthenticated || !user?.isAdmin)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Admin Access Required</h1>
          <p className="text-gray-600 mb-4">
            {!isAuthenticated 
              ? "Please log in with an admin account to access this page." 
              : "Your account does not have administrator privileges."}
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => {
                // Clear auth state and redirect
                if (typeof window !== 'undefined') {
                  localStorage.clear()
                  sessionStorage.clear()
                  window.location.href = '/login'
                }
              }} 
              className="w-full"
            >
              Login as Admin
            </Button>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated and admin - render the admin content
  return <>{children}</>
}
