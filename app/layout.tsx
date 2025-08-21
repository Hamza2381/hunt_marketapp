import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth-provider"
import { SessionStateProvider } from "@/components/session-state-provider"
import { SessionActivityTracker } from "@/components/session-activity-tracker"
import { CartProvider } from "@/context/cart-context"
import { ErrorBoundary } from "@/components/error-boundary"
import ClientLayout from "./client-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Business Marketplace - Your One-Stop Shop",
  description: "Professional marketplace for businesses and individuals",
  generator: 'v0.dev',
  icons: {
    icon: ['/favicon.ico', '/favicon.svg'],
    shortcut: '/favicon.ico',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light" style={{colorScheme: "light"}} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.svg" />
      </head>
      <body className={inter.className} suppressHydrationWarning>

      </body>
    </html>
  )
}