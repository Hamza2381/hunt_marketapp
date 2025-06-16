"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { getCategoryIcon, createSlug } from "@/lib/category-utils"
import { useCategories } from "@/hooks/use-categories"

export function CategoryNav() {
  const { categories, isLoading } = useCategories()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-1 py-3">
            <div className="animate-pulse flex space-x-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-1 py-3">
            <div className="animate-pulse flex space-x-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const allCategoriesItem = { name: "All Categories", icon: Menu, href: "/categories" }
  const categoryItems = categories.map(category => ({
    name: category.name,
    icon: getCategoryIcon(category.name),
    href: `/categories/${createSlug(category.name)}`
  }))

  const navigationItems = [allCategoriesItem, ...categoryItems]

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-1 py-3 overflow-x-auto scrollbar-thin scroll-smooth pb-3 px-1">
          <div className="flex items-center space-x-1 min-w-max">
          {navigationItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              asChild
              className="flex items-center space-x-2 whitespace-nowrap hover:bg-gray-100 transition-colors duration-200 rounded-lg"
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            </Button>
          ))}
          </div>
        </div>
      </div>
    </div>
  )
}
