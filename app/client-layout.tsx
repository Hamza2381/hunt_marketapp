"use client"

import { useEffect, useState } from "react"
import { ChatWidget } from "@/components/chat/chat-widget"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <>
      {children}
      {isClient && <ChatWidget />}
    </>
  )
}