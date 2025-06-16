"use client"

import { useEffect, useState } from "react"
import { ChatWidget } from "@/components/chat/chat-widget"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
    // Add a small delay to ensure proper hydration
    const hydrationTimer = setTimeout(() => {
      setIsHydrated(true)
    }, 100)
    
    return () => clearTimeout(hydrationTimer)
  }, [])

  return (
    <>
      {children}
      {isClient && isHydrated && <ChatWidget />}
    </>
  )
}