"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { fastCache, CACHE_KEYS } from "@/lib/fast-cache"

interface Category {
  id: number
  name: string
  description?: string
  status?: string
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
      
      // Check cache first
      const cached = fastCache.get<Category[]>(CACHE_KEYS.CATEGORIES)
      if (cached) {
        console.log('Categories loaded from cache')
        setCategories(cached)
        setIsLoading(false)
        onCategoriesLoaded?.(cached)
        return
      }
      
      console.log('Fetching categories from API...')
      
      const response = await fetch('/api/categories', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch categories')
      }
      
      const categoriesData = result.data || []
      console.log('Categories fetched successfully:', categoriesData.length)
      
      // Cache the results for 10 minutes
      fastCache.set(CACHE_KEYS.CATEGORIES, categoriesData, 10 * 60 * 1000)
      
      setCategories(categoriesData)
      onCategoriesLoaded?.(categoriesData)
      
    } catch (err: any) {
      console.error('Error fetching categories:', err)
      setError(err.message || 'Failed to load categories')
      
      // Try to load default categories as fallback
      const defaultCategories = [
        { id: 1, name: 'Paper', description: 'All types of paper products', status: 'active' },
        { id: 2, name: 'Ink & Toner', description: 'Printer cartridges and toner', status: 'active' },
        { id: 3, name: 'Office Supplies', description: 'Essential office supplies', status: 'active' },
        { id: 4, name: 'Technology', description: 'Computer accessories and electronics', status: 'active' },
        { id: 5, name: 'Coffee & Snacks', description: 'Break room supplies', status: 'active' },
        { id: 6, name: 'Cleaning', description: 'Cleaning supplies and janitorial products', status: 'active' }
      ]
      
      setCategories(defaultCategories)
      onCategoriesLoaded?.(defaultCategories)
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    fetchCategories()
  }, [])
  
  const handleRetry = () => {
    // Clear cache and retry
    fastCache.clear(CACHE_KEYS.CATEGORIES)
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
          className="justify-start w-full text-left font-normal h-8 px-3"
          onClick={() => onSelectCategory(category.id.toString())}
        >
          <span className="text-sm">{category.name}</span>
          {selectedCategory === category.id.toString() && (
            <Badge className="ml-auto bg-green-600 text-xs px-1">Active</Badge>
          )}
        </Button>
      ))}
    </div>
  )
}