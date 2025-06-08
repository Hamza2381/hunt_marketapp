"use client"

import { usePreserveScroll } from "@/hooks/use-preserve-scroll"
import { useEffect, useRef } from "react"
import { usePathname, useRouter } from 'next/navigation'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  // Use the scroll preservation hook
  usePreserveScroll()
  
  // Track the current pathname
  const pathname = usePathname()
  const router = useRouter()
  
  // Store the current path to detect navigation
  const lastPathRef = useRef(pathname)
  
  // Add event listeners and handle navigation
  useEffect(() => {
    // Set up click handlers for all next/link components to prevent beforeunload
    const handleDocumentClick = (e: MouseEvent) => {
      // Mark that we're intentionally navigating to prevent dialogs
      sessionStorage.setItem('intentionalNavigation', 'true')
    }
    
    // Listen for all clicks as they might be link navigations
    document.addEventListener('click', handleDocumentClick)
    
    // Handle visibility changes when returning to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Set a flag that can be checked by auth components
        sessionStorage.setItem('tabVisible', 'true')
        
        // Clean up after a delay
        setTimeout(() => {
          sessionStorage.removeItem('tabVisible')
        }, 500)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Run this code immediately to disable any possible beforeunload
    window.onbeforeunload = null
    
    return () => {
      // Clean up all event listeners
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname])
  
  return <>{children}</>
}
