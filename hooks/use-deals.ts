"use client"

import { useState, useEffect, useCallback } from 'react'

interface DealProduct {
  id: number
  name: string
  sku: string
  price: number
  stock_quantity: number
  image_url: string
  status: string
  deal_id: number
  deal_title: string
  deal_type: string
  original_price: number
  discounted_price: number
  savings: number
  discount_percentage: number
  time_left: string
  banner_text?: string
  usage_limit?: number
  usage_count: number
  is_limited_stock: boolean
}

interface Deal {
  id: number
  title: string
  description: string
  deal_type: string
  products: DealProduct[]
}

interface UseDealsResult {
  deals: Deal[]
  featuredProducts: DealProduct[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseDealsOptions {
  featured?: boolean
  limit?: number
}

export function useDeals(options: UseDealsOptions = {}): UseDealsResult {
  const [deals, setDeals] = useState<Deal[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<DealProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeals = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      params.append('_t', Date.now().toString())
      
      if (options.featured) {
        params.append('featured', 'true')
      }
      if (options.limit) {
        params.append('limit', options.limit.toString())
      }

      const response = await fetch(`/api/deals?${params.toString()}`, {
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
        throw new Error(result.error || 'Failed to fetch deals')
      }

      const dealsData = result.data || []
      setDeals(dealsData)

      // Extract featured products if this is for featured deals
      if (options.featured) {
        const allFeaturedProducts: DealProduct[] = []
        dealsData.forEach((deal: Deal) => {
          if (deal.products && deal.products.length > 0) {
            allFeaturedProducts.push(...deal.products)
          }
        })
        setFeaturedProducts(allFeaturedProducts.slice(0, options.limit || 4))
      }

    } catch (err: any) {
      console.error('Error fetching deals:', err)
      setError(err.message || 'Failed to load deals')
      setDeals([])
      setFeaturedProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [options.featured, options.limit])

  useEffect(() => {
    // Only fetch on client side after hydration
    if (typeof window !== 'undefined') {
      fetchDeals()
    }
  }, [fetchDeals])

  return {
    deals,
    featuredProducts,
    isLoading,
    error,
    refetch: fetchDeals
  }
}
