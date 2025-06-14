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
  const [isTabSwitching, setIsTabSwitching] = useState(false)
  const [hasCheckedLocalAuth, setHasCheckedLocalAuth] = useState(false)

  // Check if user was admin in this browser session
  const checkLocalAdminStatus = () => {
    try {
      // Check multiple storage locations for admin status
      const localAdmin = localStorage.getItem('user_is_admin') === 'true'
      const sessionAdmin = sessionStorage.getItem('user_is_admin') === 'true'
      const supabaseAuth = localStorage.getItem('supabase-auth-token') || sessionStorage.getItem('supabase-auth-token')
      
      return localAdmin || sessionAdmin || !!supabaseAuth
    } catch {
      return false
    }
  }

  // Save admin status when user is confirmed as admin
  useEffect(() => {
    if (user?.isAdmin && isAuthenticated) {
      try {
        localStorage.setItem('user_is_admin', 'true')
        sessionStorage.setItem('user_is_admin', 'true')
      } catch {}
    }
  }, [user?.isAdmin, isAuthenticated])

  // Check local auth status on mount
  useEffect(() => {
    const hasLocalAuth = checkLocalAdminStatus()
    setHasCheckedLocalAuth(true)
    
    if (hasLocalAuth) {
      console.log('Found local admin authentication - bypassing loading')
    }
  }, [])

  // Simple tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabSwitching(true)
      } else {
        setTimeout(() => setIsTabSwitching(false), 50)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      setIsTabSwitching(false)
    }
  }, [])

  // Timeout protection - only for genuine new logins
  useEffect(() => {
    if (isTabSwitching || !hasCheckedLocalAuth) {
      return
    }

    // If we have local auth evidence, don't set timeout
    if (checkLocalAdminStatus()) {
      return
    }

    // Only set timeout for genuine first-time authentication
    if (isLoading && !user?.isAdmin && !isAuthenticated) {
      const timeoutId = setTimeout(() => {
        console.warn('Admin auth loading timeout reached')
        setAuthTimeout(true)
      }, 8000) // 8 seconds

      const messageTimeout1 = setTimeout(() => {
        if (isLoading) setLoadingMessage('Verifying admin access...')
      }, 2000)

      const messageTimeout2 = setTimeout(() => {
        if (isLoading) setLoadingMessage('Loading admin profile...')
      }, 4000)

      const messageTimeout3 = setTimeout(() => {
        if (isLoading) setLoadingMessage('Taking longer than expected...')
      }, 6000)

      return () => {
        clearTimeout(timeoutId)
        clearTimeout(messageTimeout1)
        clearTimeout(messageTimeout2)
        clearTimeout(messageTimeout3)
      }
    }
  }, [isLoading, user?.isAdmin, isAuthenticated, isTabSwitching, hasCheckedLocalAuth])

  // Handle redirects
  useEffect(() => {
    if (isTabSwitching || authTimeout) {
      return
    }
    
    // Don't redirect if we have local evidence of admin status
    if (checkLocalAdminStatus()) {
      return
    }
    
    // Only redirect if we're definitely not authenticated and not loading
    if (!isLoading && !isAuthenticated) {
      console.log('Admin page: User not authenticated, redirecting to login')
      router.replace('/login')
      return
    }
    
    // Redirect non-admin users
    if (!isLoading && isAuthenticated && user && !user.isAdmin) {
      console.log('Admin page: User is not admin, redirecting to home')
      router.replace('/')
      return
    }
  }, [isLoading, isAuthenticated, user, router, authTimeout, isTabSwitching])

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

  // PRIORITY 1: If user is confirmed admin, show content immediately
  if (isAuthenticated && user?.isAdmin) {
    return <>{children}</>
  }

  // PRIORITY 2: If we have local evidence of admin status, show content (bypass loading)
  if (hasCheckedLocalAuth && checkLocalAdminStatus()) {
    console.log('Showing admin content based on local auth evidence')
    return <>{children}</>
  }

  // PRIORITY 3: Show loading only for genuine first-time authentication
  if (isLoading && !isTabSwitching && !checkLocalAdminStatus()) {
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
  
  // Handle access denied scenarios
  if (!isLoading && isAuthenticated && user && !user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Admin Access Required</h1>
          <p className="text-gray-600 mb-4">
            Your account does not have administrator privileges.
          </p>
          <Button onClick={() => router.push('/')} className="w-full">
            Go to Home
          </Button>
        </div>
      </div>
    )
  }

  if (!isLoading && !isAuthenticated && !checkLocalAdminStatus()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Admin Access Required</h1>
          <p className="text-gray-600 mb-4">
            Please log in with an admin account to access this page.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Login as Admin
          </Button>
        </div>
      </div>
    )
  }

  // Fallback: show content
  return <>{children}</>
}
