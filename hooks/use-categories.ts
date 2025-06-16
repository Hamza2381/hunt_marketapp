"use client"

import { useState, useEffect, useCallback } from 'react'

interface Category {
  id: number
  name: string
  description?: string
  productCount?: number
}

interface UseCategoriesResult {
  categories: Category[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use timestamp to force fresh data
      const timestamp = Date.now()
      const response = await fetch(`/api/categories?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch categories')
      }

      setCategories(result.data || [])
    } catch (err: any) {
      console.error('Error fetching categories:', err)
      setError(err.message || 'Failed to load categories')
      
      // Fallback to default categories
      const defaultCategories = [
        { id: 1, name: 'Office Supplies', description: 'Essential office supplies', productCount: 0 },
        { id: 2, name: 'Technology', description: 'Computer accessories and electronics', productCount: 0 },
        { id: 3, name: 'Stationery', description: 'Pens, paper, and writing materials', productCount: 0 },
        { id: 4, name: 'Storage', description: 'Filing cabinets and storage solutions', productCount: 0 },
        { id: 5, name: 'Furniture', description: 'Office furniture and seating', productCount: 0 }
      ]
      setCategories(defaultCategories)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only fetch on client side after hydration
    if (typeof window !== 'undefined') {
      fetchCategories()
    }
  }, [fetchCategories])

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories
  }
}
