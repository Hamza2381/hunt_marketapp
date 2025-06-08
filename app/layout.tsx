import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth-provider"
import { LayoutClient } from "@/components/layout-client"
import { SessionStateProvider } from "@/components/session-state-provider"
import { DisableBeforeUnload } from "@/components/disable-beforeunload"
import { CartProvider } from "@/context/cart-context"
import { useEffect, useState } from "react"
import CustomCursor from "@/components/ui/cursor/cursor"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Business Marketplace - Your One-Stop Shop",
  description: "Professional marketplace for businesses and individuals",
  generator: 'v0.dev'
}

import ClientLayout from "./client-layout"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light" style={{colorScheme: "light"}} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          // Disable beforeunload dialog at the earliest possible moment
          window.onbeforeunload = null;
          window.addEventListener('beforeunload', function(e) {
            e.preventDefault();
            e.returnValue = '';
            return '';
          }, true);
        `}} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <SessionStateProvider>
            <AuthProvider>
              <CartProvider>
                {/* <LayoutClient> */}
                  {/* <DisableBeforeUnload /> */}
                <ClientLayout>
                  <Header />
                  <main>{children}</main>
                  <Footer />
                  <Toaster />
                </ClientLayout>
                {/* </LayoutClient> */}
              </CartProvider>
            </AuthProvider>
          </SessionStateProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
