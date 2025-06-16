"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useCategories } from "@/hooks/use-categories"

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
  const { categories, isLoading, error, refetch } = useCategories()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (categories.length > 0) {
      onCategoriesLoaded?.(categories)
    }
  }, [categories, onCategoriesLoaded])

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex justify-center py-4">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <p className="text-xs text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  const handleRetry = () => {
    refetch()
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