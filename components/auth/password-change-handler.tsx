"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { PasswordChangeModal } from "./password-change-modal"

export function PasswordChangeHandler({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  useEffect(() => {
    if (user?.mustChangePassword) {
      setShowPasswordModal(true)
    }
  }, [user])

  return (
    <>
      {children}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        isRequired={user?.mustChangePassword}
      />
    </>
  )
}
