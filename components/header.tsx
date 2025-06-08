"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserCircle2, ShoppingCart } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useCart } from "@/hooks/use-cart"

export default function Header() {
  const { user, isAuthenticated } = useAuth()
  const { getItemCount, items } = useCart()
  const pathname = usePathname()
  const [creditInfo, setCreditInfo] = useState({
    available: 0,
    limit: 0,
    used: 0,
  })
  const [cartItemCount, setCartItemCount] = useState(0)
  
  // Initialize localStorage if needed (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear any invalid cart data
      try {
        const cartData = localStorage.getItem('cart')
        
        if (cartData && cartData.includes('"3"')) {
          console.warn('Found static cart value, resetting')
          localStorage.removeItem('cart')
        }
        
        if (cartData) {
          try {
            const parsedCart = JSON.parse(cartData)
            if (!Array.isArray(parsedCart)) {
              console.warn('Invalid cart format in localStorage, resetting')
              localStorage.removeItem('cart')
            }
          } catch (e) {
            console.error('Error parsing cart data:', e)
            localStorage.removeItem('cart')
          }
        }
      } catch (error) {
        console.error('Error checking cart data:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (user) {
      setCreditInfo({
        available: user.availableCredit || 0,
        limit: user.creditLimit || 0,
        used: user.creditUsed || 0,
      })
    }
  }, [user])

  // Immediately update cart count when items change
  useEffect(() => {
    const count = getItemCount()
    console.log('Current cart count:', count, 'Items:', items.length)
    setCartItemCount(count)
  }, [items, getItemCount])

  // Don't show header on login or admin pages
  if (pathname.startsWith("/login") || pathname.startsWith("/admin")) {
    return null
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-green-600">BizMart</span>
          </Link>

          <div className="flex items-center space-x-6">
            {isAuthenticated && user?.creditLimit > 0 && (
              <div className="hidden md:flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-md">
                <div className="text-sm text-green-800">
                  <span className="font-medium">Credit:</span> ${creditInfo.available.toLocaleString()} available
                </div>
                <div className="h-1.5 w-24 bg-gray-200 rounded-full">
                  <div
                    className="h-1.5 bg-green-600 rounded-full"
                    style={{
                      width: `${(creditInfo.used / creditInfo.limit) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}

            <Link href="/products" className="text-sm font-medium hover:text-green-600">
              Products
            </Link>
            <Link href="/categories" className="text-sm font-medium hover:text-green-600">
              Categories
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link href="/cart">
                  <Badge variant="outline" className="hover:bg-gray-100 flex items-center gap-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span>{cartItemCount > 0 ? `Cart (${cartItemCount})` : 'Cart'}</span>
                  </Badge>
                </Link>
                
                <Link href="/account">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <UserCircle2 className="h-5 w-5" />
                    <span className="hidden md:inline">{user.name.split(" ")[0]}</span>
                  </Button>
                </Link>
                
                {user.isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      Admin
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
