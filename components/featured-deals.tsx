"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ShoppingCart, Loader2, AlertCircle, RefreshCw, Clock, Zap, Flame } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { fastCache, CACHE_KEYS } from "@/lib/fast-cache"

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

export function FeaturedDeals() {
  const { addItem } = useCart()
  const { toast } = useToast()
  const { isAuthenticated, isLoading } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<DealProduct[]>([])
  const [isLoadingDeals, setIsLoadingDeals] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchFeaturedDeals = async () => {
    try {
      setIsLoadingDeals(true)
      setError(null)
      
      // FORCE FRESH DATA - NO CACHING AT ALL
      const timestamp = Date.now()
      const randomParam = Math.random().toString(36)
      const response = await fetch(`/api/deals?featured=true&limit=4&_t=${timestamp}&_r=${randomParam}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include',
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch deals')
      }
      
      // Extract all products from deals
      const allFeaturedProducts: DealProduct[] = []
      result.data.forEach((deal: Deal) => {
        if (deal.products && deal.products.length > 0) {
          allFeaturedProducts.push(...deal.products.slice(0, 4)) // Limit to 4 total products
        }
      })
      
      // Limit to 4 products maximum
      const limitedProducts = allFeaturedProducts.slice(0, 4)
      
      // REAL-TIME: No caching - always use fresh data
      setFeaturedProducts(limitedProducts)
      setDeals(result.data)
    } catch (error: any) {
      console.error('Error fetching featured deals:', error)
      setError(error.message || 'Failed to load featured deals')
      setFeaturedProducts([])
      setDeals([])
    } finally {
      setIsLoadingDeals(false)
    }
  }
  
  useEffect(() => {
    fetchFeaturedDeals()
    
    // REAL-TIME: Listen for deal changes and auto-refresh
    const handleDealsChanged = () => {
      console.log('Deals changed - refreshing featured deals')
      fetchFeaturedDeals()
    }
    
    window.addEventListener('dealsChanged', handleDealsChanged)
    
    return () => {
      window.removeEventListener('dealsChanged', handleDealsChanged)
    }
  }, [])
  
  const handleRetry = () => {
    // REAL-TIME: No cache to clear, just refetch
    fetchFeaturedDeals()
  }
  
  const getDealIcon = (dealType: string) => {
    switch (dealType) {
      case "flash":
        return <Zap className="h-4 w-4" />
      case "daily":
        return <Clock className="h-4 w-4" />
      case "weekly":
        return <Flame className="h-4 w-4" />
      case "clearance":
        return <Badge variant="destructive" className="text-xs">CLEARANCE</Badge>
      default:
        return null
    }
  }
  
  const getDealBadgeColor = (dealType: string) => {
    switch (dealType) {
      case "flash":
        return "bg-red-500"
      case "daily":
        return "bg-orange-500"
      case "weekly":
        return "bg-purple-500"
      case "clearance":
        return "bg-gray-500"
      default:
        return "bg-green-500"
    }
  }
  
  const handleAddToCart = (product: DealProduct) => {
    // RACE CONDITION FIX: Don't check auth while still loading
    if (isLoading) {
      toast({
        title: "Loading...",
        description: "Please wait while we verify your login status.",
      })
      return
    }

    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to your cart.",
        variant: "destructive",
      })
      return
    }

    const inStock = product.stock_quantity > 0 && product.status === 'active'
    if (!inStock) {
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
      price: product.discounted_price, // Use discounted price
      image: product.image_url,
      inStock: inStock,
      quantity: 1,
    })

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart at the deal price of ${product.discounted_price.toFixed(2)}.`,
    })
  }

  return (
    <div className="bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Featured Deals</h2>
          <div className="text-sm text-gray-600">
            Limited time offers
          </div>
        </div>
        
        {isLoadingDeals ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Show skeleton loading cards */}
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                  <div className="space-y-2">
                    <div className="bg-gray-200 h-4 rounded w-full"></div>
                    <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                    <div className="bg-gray-200 h-6 rounded w-1/3"></div>
                    <div className="bg-gray-200 h-8 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <h3 className="text-lg font-medium text-red-600">Error loading deals</h3>
              <p className="text-gray-600">{error}</p>
              <Button variant="outline" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deals available</h3>
            <p className="text-gray-600">Check back later for new deals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => {
              const inStock = product.stock_quantity > 0 && product.status === 'active'
              
              return (
                <Card key={`${product.deal_id}-${product.id}`} className="hover:shadow-lg transition-shadow duration-200 relative overflow-hidden">
                  <CardContent className="p-4">
                    {/* Deal Type Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className={`${getDealBadgeColor(product.deal_type)} text-white flex items-center space-x-1`}>
                        {getDealIcon(product.deal_type)}
                        <span className="uppercase text-xs font-bold">{product.deal_type}</span>
                      </Badge>
                    </div>

                    {/* Discount Badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-green-500 text-white font-bold">-{product.discount_percentage}%</Badge>
                    </div>

                    <div className="relative mb-4 mt-8">
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-lg"
                        loading="lazy"
                      />
                      {!inStock && <Badge className="absolute bottom-2 right-2 bg-gray-500">Out of Stock</Badge>}
                    </div>

                    <h3 className="font-medium text-sm mb-2 line-clamp-2">{product.name}</h3>

                    {/* Deal banner text */}
                    {product.banner_text && (
                      <p className="text-xs text-blue-600 font-medium mb-2">{product.banner_text}</p>
                    )}

                    {/* Rating placeholder - could be real ratings from products table */}
                    <div className="flex items-center space-x-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600">(4.0)</span>
                    </div>

                    {/* Prices */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg font-bold text-green-600">${product.discounted_price.toFixed(2)}</span>
                      <span className="text-sm text-gray-500 line-through">${product.original_price.toFixed(2)}</span>
                    </div>

                    <div className="text-xs text-green-600 font-medium mb-2">
                      Save ${product.savings.toFixed(2)}
                    </div>

                    {/* Time left */}
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-gray-600">Time left:</span>
                      <span className="font-medium text-red-600">{product.time_left}</span>
                    </div>

                    {/* Limited stock warning */}
                    {product.is_limited_stock && inStock && (
                      <div className="text-xs text-orange-600 font-medium mb-3">
                        Only {product.stock_quantity} left!
                      </div>
                    )}

                    <Button 
                      className="w-full" 
                      size="sm" 
                      onClick={() => handleAddToCart(product)}
                      disabled={!inStock}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {inStock ? "Add to Cart" : "Out of Stock"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}