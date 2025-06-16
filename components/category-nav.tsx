"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { getCategoryIcon, createSlug } from "@/lib/category-utils"

interface Category {
  id: number
  name: string
  description?: string
}

export function CategoryNav() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Add timestamp to prevent any caching
        const timestamp = new Date().getTime()
        const response = await fetch(`/api/categories?_t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store' // Force no browser caching
        })
        const result = await response.json()
        
        if (result.success) {
          setCategories(result.data || [])
        } else {
          console.error('Failed to fetch categories:', result.error)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

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
