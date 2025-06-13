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

  // Timeout protection for infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('Auth loading timeout reached')
        setAuthTimeout(true)
      }
    }, 15000) // Increased to 15 seconds

    // Update loading message over time
    const messageTimeout1 = setTimeout(() => {
      if (isLoading) {
        setLoadingMessage('Authenticating...')
      }
    }, 2000)

    const messageTimeout2 = setTimeout(() => {
      if (isLoading) {
        setLoadingMessage('Loading profile...')
      }
    }, 5000)

    const messageTimeout3 = setTimeout(() => {
      if (isLoading) {
        setLoadingMessage('Almost ready...')
      }
    }, 10000)

    return () => {
      clearTimeout(timeoutId)
      clearTimeout(messageTimeout1)
      clearTimeout(messageTimeout2)
      clearTimeout(messageTimeout3)
    }
  }, [isLoading])

  // Handle auth redirects
  useEffect(() => {
    if (!isLoading && !authTimeout) {
      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login')
        router.push('/login')
        return
      }
      
      if (!user?.isAdmin) {
        console.log('Not admin, redirecting to home')
        router.push('/')
        return
      }
    }
  }, [isLoading, isAuthenticated, user?.isAdmin, router, authTimeout])

  // Show timeout error
  if (authTimeout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Loading Timeout</h1>
          <p className="text-gray-600 mb-4">
            The admin dashboard is taking longer than expected to load. 
            This might be due to network issues or server load.
          </p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh Page
            </Button>
            <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
              Go to Login
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
  
  // Show access denied for non-admin users
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You do not have permission to view this page.</p>
          <Button onClick={() => router.push('/')} variant="outline">
            Go to Home
          </Button>
        </div>
      </div>
    )
  }

  // User is authenticated and admin - render the admin content
  return <>{children}</>
}
