"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { fastCache } from "@/lib/fast-cache"
import { globalEvents, EVENTS } from "@/lib/global-events"

interface Category {
  id: number
  name: string
  description?: string
  productCount?: number
}

interface CategoryFilterProps {
  selectedCategory: string
  onSelectCategory: (categoryId: string) => void
  onCategoriesLoaded?: (categories: Category[]) => void
}

export function CategoryFilter({ selectedCategory, onSelectCategory, onCategoriesLoaded }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Use a different cache key for the filter to avoid conflicts
      const cached = fastCache.get<Category[]>('categories-filter')
      if (cached) {
        console.log('Categories loaded from cache for filter')
        setCategories(cached)
        setIsLoading(false)
        onCategoriesLoaded?.(cached)
        return
      }
      
      console.log('Fetching categories from API for filter...')
      
      const response = await fetch('/api/categories', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        console.error(`Categories API error: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        console.error('Categories API returned error:', result.error)
        throw new Error(result.error || 'Failed to fetch categories')
      }
      
      const categoriesData = result.data || []
      console.log('Categories fetched successfully for filter:', categoriesData.length)
      
      // Cache the results for 5 minutes (shorter than main categories page)
      fastCache.set('categories-filter', categoriesData, 5 * 60 * 1000)
      
      setCategories(categoriesData)
      onCategoriesLoaded?.(categoriesData)
      
    } catch (err: any) {
      console.error('Error fetching categories for filter:', err)
      setError(err.message || 'Failed to load categories')
      
      // Try to load default categories as fallback
      const defaultCategories = [
        { id: 1, name: 'Paper', description: 'All types of paper products', productCount: 0 },
        { id: 2, name: 'Ink & Toner', description: 'Printer cartridges and toner', productCount: 0 },
        { id: 3, name: 'Office Supplies', description: 'Essential office supplies', productCount: 0 },
        { id: 4, name: 'Technology', description: 'Computer accessories and electronics', productCount: 0 },
        { id: 5, name: 'Coffee & Snacks', description: 'Break room supplies', productCount: 0 },
        { id: 6, name: 'Cleaning', description: 'Cleaning supplies and janitorial products', productCount: 0 }
      ]
      
      setCategories(defaultCategories)
      onCategoriesLoaded?.(defaultCategories)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Real-time updates for category product counts
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
          
          return {
            ...category,
            productCount: newCount
          }
        }
        return category
      })
      
      // Update cache with new data
      fastCache.set('categories-filter', updatedCategories, 5 * 60 * 1000)
      return updatedCategories
    })
  }, [])
  
  useEffect(() => {
    // Listen for inventory changes to update product counts in real-time
    const unsubscribe = globalEvents.on(EVENTS.INVENTORY_CHANGED, handleInventoryChange)
    
    // Initial data load
    fetchCategories()
    
    return () => {
      unsubscribe()
    }
  }, [handleInventoryChange])
  
  const handleRetry = () => {
    // Clear cache and retry
    fastCache.clear('categories-filter')
    fetchCategories()
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <p className="text-xs text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (error && categories.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 space-y-3">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <p className="text-xs">Failed to load</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRetry}
          className="text-xs px-2 py-1 h-auto"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    )
  }
  
  if (categories.length === 0) {
    return (
      <div className="py-4">
        <p className="text-xs text-gray-500 text-center">No categories</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-1">
      <Button
        variant={selectedCategory === '' ? "default" : "ghost"}
        className="justify-start w-full text-left font-normal h-8 px-3"
        onClick={() => onSelectCategory('')}
      >
        <span className="text-sm">All Categories</span>
        {selectedCategory === '' && <Badge className="ml-auto bg-green-600 text-xs px-1">Active</Badge>}
      </Button>
      
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id.toString() ? "default" : "ghost"}
          className="justify-between w-full text-left font-normal h-8 px-3"
          onClick={() => onSelectCategory(category.id.toString())}
        >
          <span className="text-sm">{category.name}</span>
          <div className="flex items-center space-x-1">
            {category.productCount !== undefined && (
              <Badge variant="outline" className="text-xs px-1 ml-1">
                {category.productCount}
              </Badge>
            )}
            {selectedCategory === category.id.toString() && (
              <Badge className="bg-green-600 text-xs px-1">Active</Badge>
            )}
          </div>
        </Button>
      ))}
    </div>
  )
}