"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Building2, 
  Menu, 
  X, 
  ShoppingCart, 
  User, 
  CreditCard, 
  LogOut, 
  Package, 
  MessageCircle, 
  ClipboardList
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/hooks/use-cart"

export function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { getItemCount, items } = useCart()
  const [cartItemCount, setCartItemCount] = useState(0)
  
  // Update cart item count whenever items change
  useEffect(() => {
    setCartItemCount(getItemCount())
  }, [items, getItemCount])

  useEffect(() => {
    // Close mobile menu when path changes
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await logout()
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    })
    router.push("/login")
  }

  const isAdmin = user?.isAdmin === true

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-green-600" />
            <span className="font-bold text-xl">BizMart</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className={`text-sm font-medium ${
                pathname === "/" ? "text-green-600" : "text-gray-600 hover:text-green-600"
              }`}
            >
              Home
            </Link>
            <Link
              href="/products"
              className={`text-sm font-medium ${
                pathname.startsWith("/products") ? "text-green-600" : "text-gray-600 hover:text-green-600"
              }`}
            >
              Products
            </Link>
            <Link
              href="/categories"
              className={`text-sm font-medium ${
                pathname.startsWith("/categories") ? "text-green-600" : "text-gray-600 hover:text-green-600"
              }`}
            >
              Categories
            </Link>
            <Link
              href="/deals"
              className={`text-sm font-medium ${
                pathname.startsWith("/deals") ? "text-green-600" : "text-gray-600 hover:text-green-600"
              }`}
            >
              Deals
            </Link>
            <Link
              href="/contact"
              className={`text-sm font-medium ${
                pathname.startsWith("/contact") ? "text-green-600" : "text-gray-600 hover:text-green-600"
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Cart Link */}
                <Link href="/cart" className="p-2 relative">
                  <ShoppingCart className="h-5 w-5 text-gray-600" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs">{cartItemCount}</Badge>
                  )}
                </Link>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    
                    {/* Credit Info */}
                    {user?.creditLimit > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                          <div className="flex items-center space-x-2 text-sm">
                            <CreditCard className="h-4 w-4 text-green-600" />
                            <span>Credit Available</span>
                          </div>
                          <div className="mt-1">
                            <div className="flex justify-between text-xs">
                              <span>${user.availableCredit?.toLocaleString()}</span>
                              <span>of ${user.creditLimit.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-green-600 h-1.5 rounded-full"
                                style={{
                                  width: `${100 - ((user.creditUsed / user.creditLimit) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer flex items-center">
                          <Building2 className="mr-2 h-4 w-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="cursor-pointer flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Account</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="cursor-pointer flex items-center">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        <span>My Orders</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="mt-4 py-4 border-t md:hidden">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className={`text-sm font-medium ${
                  pathname === "/" ? "text-green-600" : "text-gray-600"
                }`}
              >
                Home
              </Link>
              <Link
                href="/products"
                className={`text-sm font-medium ${
                  pathname.startsWith("/products") ? "text-green-600" : "text-gray-600"
                }`}
              >
                Products
              </Link>
              <Link
                href="/categories"
                className={`text-sm font-medium ${
                  pathname.startsWith("/categories") ? "text-green-600" : "text-gray-600"
                }`}
              >
                Categories
              </Link>
              <Link
                href="/deals"
                className={`text-sm font-medium ${
                  pathname.startsWith("/deals") ? "text-green-600" : "text-gray-600"
                }`}
              >
                Deals
              </Link>
              <Link
                href="/contact"
                className={`text-sm font-medium ${
                  pathname.startsWith("/contact") ? "text-green-600" : "text-gray-600"
                }`}
              >
                Contact
              </Link>
              
              {isAuthenticated && (
                <>
                  <div className="border-t pt-4 mt-2">
                    <Link
                      href="/account"
                      className={`text-sm font-medium flex items-center ${
                        pathname.startsWith("/account") ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      <User className="h-4 w-4 mr-2" />
                      My Account
                    </Link>
                  </div>
                  <Link
                    href="/orders"
                    className={`text-sm font-medium flex items-center ${
                      pathname.startsWith("/orders") ? "text-green-600" : "text-gray-600"
                    }`}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    My Orders
                  </Link>
                  
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={`text-sm font-medium flex items-center ${
                        pathname.startsWith("/admin") ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Link>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium flex items-center text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
