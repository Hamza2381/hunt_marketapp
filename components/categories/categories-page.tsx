"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getCategoryIcon, createSlug } from "@/lib/category-utils"
import { globalEvents, EVENTS } from "@/lib/global-events"
import { fastCache, CACHE_KEYS } from "@/lib/fast-cache"

interface Category {
  id: number
  name: string
  description?: string
  productCount?: number
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategoriesWithCounts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // FORCE FRESH DATA: No client-side caching
      // Fetch categories
      const categoriesResponse = await fetch('/api/categories', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      })
      const categoriesResult = await categoriesResponse.json()
      
      if (!categoriesResult.success) {
        throw new Error(categoriesResult.error || 'Failed to fetch categories')
      }

      const categoriesData = categoriesResult.data || []

      // Fetch product counts for each category
      const categoriesWithCounts = await Promise.all(
        categoriesData.map(async (category: Category) => {
          try {
            const slug = createSlug(category.name)
            const productsResponse = await fetch(`/api/categories/${slug}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              },
              cache: 'no-store'
            })
            const productsResult = await productsResponse.json()
            
            return {
              ...category,
              productCount: productsResult.success ? productsResult.count || 0 : 0
            }
          } catch (error) {
            console.error(`Error fetching products for ${category.name}:`, error)
            return {
              ...category,
              productCount: 0
            }
          }
        })
      )

      // NO CACHING: Always use fresh data
      setCategories(categoriesWithCounts)
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      setError(error.message || 'Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Optimistic update for real-time product count changes
  const handleInventoryChange = useCallback((event: { type: string; product: any }) => {
    setCategories(prev => {
      const updatedCategories = prev.map(category => {
        if (category.id === event.product.category_id) {
          const currentCount = category.productCount || 0
          let newCount = currentCount
          
          switch (event.type) {
            case 'added':
              newCount = currentCount + 1
              break
            case 'deleted':
              newCount = Math.max(0, currentCount - 1)
              break
            case 'updated':
              // For updates, we don't change the count unless category changed
              newCount = currentCount
              break
          }
          
          // Optional: Log for debugging in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`Updated ${category.name} count: ${currentCount} → ${newCount}`)
          }
          
          return {
            ...category,
            productCount: newCount
          }
        }
        return category
      })
      
      // Update cache with new data
      fastCache.set(CACHE_KEYS.CATEGORIES, updatedCategories, 2 * 60 * 1000)
      
      return updatedCategories
    })
  }, [])

  // Set up real-time event listeners and initial data load
  useEffect(() => {
    // Listen for inventory changes to update product counts in real-time
    const unsubscribe = globalEvents.on(EVENTS.INVENTORY_CHANGED, handleInventoryChange)
    
    // Initial data load
    fetchCategoriesWithCounts()
    
    return () => {
      unsubscribe()
    }
  }, [handleInventoryChange, fetchCategoriesWithCounts])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Shop by Category</h1>
            <p className="text-gray-600 mt-2">Find exactly what you need for your business</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="relative">
                  <div className="w-full h-48 bg-gray-200 rounded-t-lg"></div>
                  <div className="absolute top-4 left-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <div className="h-6 w-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 h-6 w-20 bg-gray-200 rounded"></div>
                </div>
                <CardHeader>
                  <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="flex gap-1">
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Categories</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Categories Available</h2>
            <p className="text-gray-600">Categories will appear here once they're added to the system.</p>
          </div>
        </div>
      </div>
    )
  }

  // Sort categories by product count (descending) for popular section
  const popularCategories = [...categories]
    .sort((a, b) => (b.productCount || 0) - (a.productCount || 0))
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Shop by Category</h1>
          <p className="text-gray-600 mt-2">Find exactly what you need for your business</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const IconComponent = getCategoryIcon(category.name)
            const slug = createSlug(category.name)
            
            return (
              <Link key={category.id} href={`/categories/${slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="relative">
                    <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 rounded-t-lg flex items-center justify-center">
                      <IconComponent className="h-16 w-16 text-white opacity-80" />
                    </div>
                    <div className="absolute top-4 left-4">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <Badge className="absolute top-4 right-4 bg-blue-600">
                      {category.productCount || 0} products
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{category.name}</span>
                    </CardTitle>
                    <p className="text-gray-600 text-sm">
                      {category.description || `Explore our ${category.name.toLowerCase()} collection`}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Available now:</h4>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          Quality Products
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Fast Shipping
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Best Prices
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Popular Categories Section */}
        {popularCategories.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Most Popular</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {popularCategories.map((category) => {
                const IconComponent = getCategoryIcon(category.name)
                const slug = createSlug(category.name)
                
                return (
                  <Link key={category.id} href={`/categories/${slug}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 text-center">
                        <IconComponent className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <h3 className="font-medium">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category.productCount || 0} items</p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
