"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ShoppingCart, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { fastCache, CACHE_KEYS } from "@/lib/fast-cache"

interface Deal {
  id: number
  title: string
  price: number
  originalPrice: number
  rating: number
  reviews: number
  badge?: string
  discount?: string
  image?: string
  inStock: boolean
  sku: string
}

export function FeaturedDeals() {
  const { addItem } = useCart()
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchFeaturedDeals = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Check cache first
      const cached = fastCache.get<Deal[]>(CACHE_KEYS.FEATURED_DEALS)
      if (cached) {
        setDeals(cached)
        setIsLoading(false)
        return
      }
      
      // Use API endpoint
      const response = await fetch('/api/products?featured=true&limit=4', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch products')
      }
      
      // Transform API data to Deal format
      const featuredDeals = result.data.map((product: any) => {
        // Calculate original price (20-50% higher than actual price for demo)
        const markup = Math.random() * 0.3 + 0.2 // 20-50% markup
        const originalPrice = product.price * (1 + markup)
        
        // Calculate discount percentage
        const discountPercent = Math.floor(markup * 100)
        
        return {
          id: product.id,
          title: product.name,
          price: product.price,
          originalPrice: originalPrice,
          rating: product.rating || (Math.random() * 2 + 3).toFixed(1),
          reviews: product.reviews || Math.floor(Math.random() * 2000) + 100,
          badge: discountPercent > 30 ? "Price Promise" : "New Customers",
          discount: discountPercent > 30 ? `${discountPercent}% off` : undefined,
          image: product.image_url || "/placeholder.svg?height=200&width=200",
          inStock: product.stock_quantity > 0,
          sku: product.sku
        }
      })
      
      // Cache the results for 5 minutes
      fastCache.set(CACHE_KEYS.FEATURED_DEALS, featuredDeals, 5 * 60 * 1000)
      
      setDeals(featuredDeals)
    } catch (error: any) {
      console.error('Error fetching featured deals:', error)
      setError(error.message || 'Failed to load featured deals')
      setDeals([])
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    fetchFeaturedDeals()
  }, [])
  
  const handleRetry = () => {
    // Clear cache and retry
    fastCache.clear(CACHE_KEYS.FEATURED_DEALS)
    fetchFeaturedDeals()
  }
  
  const handleAddToCart = (deal: Deal) => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to your cart.",
        variant: "destructive",
      })
      return
    }

    if (!deal.inStock) {
      toast({
        title: "Out of stock",
        description: "This item is currently out of stock.",
        variant: "destructive",
      })
      return
    }

    addItem({
      id: deal.id,
      name: deal.title,
      sku: deal.sku,
      price: deal.price,
      image: deal.image,
      inStock: deal.inStock,
      quantity: 1,
    })

    toast({
      title: "Added to cart",
      description: `${deal.title} has been added to your cart.`,
    })
  }

  return (
    <div className="bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Featured Deals</h2>
        
        {isLoading ? (
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
        ) : deals.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deals available</h3>
            <p className="text-gray-600">Check back later for new deals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {deals.map((deal) => (
              <Card key={deal.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="relative mb-4">
                    <img
                      src={deal.image || "/placeholder.svg"}
                      alt={deal.title}
                      className="w-full h-48 object-cover rounded-lg"
                      loading="lazy"
                    />
                    <Badge className="absolute top-2 left-2 bg-blue-600">{deal.badge}</Badge>
                    {deal.discount && <Badge className="absolute top-2 right-2 bg-red-500">{deal.discount}</Badge>}
                    {!deal.inStock && <Badge className="absolute top-2 right-2 bg-gray-500">Out of Stock</Badge>}
                  </div>

                  <h3 className="font-medium text-sm mb-2 line-clamp-2">{deal.title}</h3>

                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(parseFloat(deal.rating.toString())) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-600">({deal.reviews})</span>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-lg font-bold">${deal.price.toFixed(2)}</span>
                    <span className="text-sm text-gray-500 line-through">${deal.originalPrice.toFixed(2)}</span>
                  </div>

                  <Button 
                    className="w-full" 
                    size="sm" 
                    onClick={() => handleAddToCart(deal)}
                    disabled={!deal.inStock}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {deal.inStock ? "Add to Cart" : "Out of Stock"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}