"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { fastCache, CACHE_KEYS } from "@/lib/fast-cache"

interface Product {
  id: number
  name: string
  sku: string
  description?: string
  category_id: number
  price: number
  stock_quantity: number
  status: string
  image_url?: string
  created_at: string
  category_name?: string
  rating?: number
  reviews?: number
}

interface Category {
  id: number
  name: string
}

interface ProductGridProps {
  searchQuery?: string
  categoryFilter?: string
  sortOrder?: string
  onlyFeatured?: boolean
  categories?: Category[]
}

export function ProductGrid({ 
  searchQuery = '', 
  categoryFilter = '', 
  sortOrder = 'newest', 
  onlyFeatured = false,
  categories = []
}: ProductGridProps) {
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Create category lookup map for fast category name resolution
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach(cat => map.set(cat.id, cat.name))
    return map
  }, [categories])
  
  // Enhanced products with category names
  const enhancedProducts = useMemo(() => {
    return products.map(product => ({
      ...product,
      category_name: categoryMap.get(product.category_id) || 'Unknown Category'
    }))
  }, [products, categoryMap])
  
  // Apply filters and sorting
  const filteredProducts = useMemo(() => {
    let filtered = [...enhancedProducts]
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(product => 
        product.category_id.toString() === categoryFilter
      )
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.description?.toLowerCase().includes(query) ||
        product.category_name?.toLowerCase().includes(query)
      )
    }
    
    // Apply sorting
    switch (sortOrder) {
      case 'newest':
        filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        break
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'popularity':
        filtered.sort((a, b) => {
          const scoreA = (a.rating || 0) * (a.reviews || 0)
          const scoreB = (b.rating || 0) * (b.reviews || 0)
          return scoreB - scoreA
        })
        break
    }
    
    return filtered
  }, [enhancedProducts, categoryFilter, searchQuery, sortOrder])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Check cache first
      const cacheKey = onlyFeatured ? CACHE_KEYS.PRODUCTS_FEATURED : CACHE_KEYS.PRODUCTS
      const cached = fastCache.get<Product[]>(cacheKey)
      
      if (cached) {
        setProducts(cached)
        setIsLoading(false)
        return
      }
      
      const response = await fetch(`/api/products${onlyFeatured ? '?featured=true' : ''}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch products')
      }
      
      const productsData = result.data || []
      
      // Cache the results for 5 minutes
      fastCache.set(cacheKey, productsData, 5 * 60 * 1000)
      
      setProducts(productsData)
      
    } catch (err: any) {
      console.error('Error fetching products:', err)
      setError(err.message || 'Failed to load products')
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  } // Added isLoading to dependencies
  
  useEffect(() => {
    fetchProducts()
  }, [onlyFeatured])

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to your cart.",
        variant: "destructive",
      })
      return
    }

    if (product.stock_quantity <= 0 || product.status === "out_of_stock") {
      toast({
        title: "Out of stock",
        description: "This item is currently out of stock.",
        variant: "destructive",
      })
      return
    }

    addItem({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      image: product.image_url || "/placeholder.svg",
      inStock: product.stock_quantity > 0 && product.status === "active",
      quantity: 1,
    })

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    })
  }

  const handleRetry = () => {
    // Clear cache and retry
    const cacheKey = onlyFeatured ? CACHE_KEYS.PRODUCTS_FEATURED : CACHE_KEYS.PRODUCTS
    fastCache.clear(cacheKey)
    fetchProducts()
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Show skeleton loading cards */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
              <div className="space-y-2">
                <div className="bg-gray-200 h-4 rounded w-1/3"></div>
                <div className="bg-gray-200 h-5 rounded w-full"></div>
                <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                <div className="bg-gray-200 h-6 rounded w-1/4"></div>
                <div className="bg-gray-200 h-8 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h3 className="text-lg font-medium text-red-600">Error loading products</h3>
          <p className="text-gray-600">{error}</p>
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
        <p className="text-gray-600">Check back later for new products.</p>
      </div>
    )
  }
  
  if (filteredProducts.length === 0 && (searchQuery || categoryFilter)) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products match your filters</h3>
        <p className="text-gray-600 mb-4">
          {searchQuery && categoryFilter
            ? `No products found matching "${searchQuery}" in the selected category.`
            : searchQuery
            ? `No products found matching "${searchQuery}".`
            : `No products found in the selected category.`}
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/products'}>
          Clear Filters
        </Button>
      </div>
    )
  }

  const showTitle = !searchQuery && !categoryFilter
  
  return (
    <div className="space-y-6">
      {showTitle && onlyFeatured && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Featured Products</h2>
          <p className="text-gray-600">Discover our most popular business and office supplies</p>
        </div>
      )}
      
      {!showTitle && searchQuery && (
        <div className="mb-4">
          <h3 className="text-xl font-medium mb-1">Search Results: "{searchQuery}"</h3>
          <p className="text-gray-600">{filteredProducts.length} product(s) found</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-4">
                  <img
                    src={product.image_url || "/placeholder.svg?height=200&width=200"}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg"
                    loading="lazy"
                  />
                  {product.stock_quantity <= 0 && (
                    <Badge className="absolute top-2 right-2 bg-gray-500">Out of Stock</Badge>
                  )}
                </div>
              </Link>

              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">
                  {product.category_name}
                </Badge>

                <Link href={`/products/${product.id}`}>
                  <h3 className="font-medium hover:text-green-600 line-clamp-2 text-sm leading-tight">
                    {product.name}
                  </h3>
                </Link>

                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < Math.floor(product.rating || 0) 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-600">({product.reviews || 0})</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  disabled={product.stock_quantity <= 0 || product.status === "out_of_stock"}
                  onClick={() => handleAddToCart(product)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {product.stock_quantity > 0 ? "Add to Cart" : "Out of Stock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {onlyFeatured && !categoryFilter && !searchQuery && (
        <div className="text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/products">View All Products</Link>
          </Button>
        </div>
      )}
    </div>
  )
}