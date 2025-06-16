"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, Clock, Flame, Zap, Loader2, AlertCircle, RefreshCw, ShoppingCart } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { fastCache, CACHE_KEYS } from "@/lib/fast-cache"
import Link from "next/link"

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
  discount_type: string
  discount_value: number
  start_date: string
  end_date: string
  status: string
  is_featured: boolean
  products: DealProduct[]
}

export function DealsPage() {
  const [sortBy, setSortBy] = useState("discount")
  const [filterBy, setFilterBy] = useState("all")
  const [deals, setDeals] = useState<Deal[]>([])
  const [allProducts, setAllProducts] = useState<DealProduct[]>([])
  const [isLoadingDeals, setIsLoadingDeals] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useCart()
  const { toast } = useToast()
  const { isAuthenticated, isLoading } = useAuth()

  // Fetch deals data
  const fetchDeals = async () => {
    try {
      setIsLoadingDeals(true)
      setError(null)
      
      // REAL-TIME: No caching - always fetch fresh data
      const response = await fetch('/api/deals', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch deals')
      }
      
      // Extract all products from deals
      const allDealProducts: DealProduct[] = []
      result.data.forEach((deal: Deal) => {
        if (deal.products && deal.products.length > 0) {
          allDealProducts.push(...deal.products)
        }
      })
      
      // REAL-TIME: No caching - always use fresh data
      setAllProducts(allDealProducts)
      setDeals(result.data)
      
    } catch (error: any) {
      console.error('Error fetching deals:', error)
      setError(error.message || 'Failed to load deals')
      setAllProducts([])
    } finally {
      setIsLoadingDeals(false)
    }
  }
  
  useEffect(() => {
    fetchDeals()
    
    // REAL-TIME: Listen for deal changes and auto-refresh
    const handleDealsChanged = () => {
      console.log('Deals changed - refreshing deals page')
      fetchDeals()
    }
    
    window.addEventListener('dealsChanged', handleDealsChanged)
    
    return () => {
      window.removeEventListener('dealsChanged', handleDealsChanged)
    }
  }, [])
  
  const handleRetry = () => {
    // REAL-TIME: No cache to clear, just refetch
    fetchDeals()
  }
  
  const filteredDeals = allProducts.filter((product) => {
    if (filterBy === "all") return true
    return product.deal_type === filterBy
  })

  const sortedDeals = [...filteredDeals].sort((a, b) => {
    switch (sortBy) {
      case "discount":
        return b.discount_percentage - a.discount_percentage
      case "price-low":
        return a.discounted_price - b.discounted_price
      case "price-high":
        return b.discounted_price - a.discounted_price
      case "rating":
        // Could implement real ratings later
        return 0
      case "ending-soon":
        return a.time_left.localeCompare(b.time_left)
      default:
        return 0
    }
  })

  const getDealIcon = (dealType: string) => {
    switch (dealType) {
      case "flash":
        return <Zap className="h-4 w-4" />
      case "daily":
        return <Clock className="h-4 w-4" />
      case "weekly":
        return <Flame className="h-4 w-4" />
      case "clearance":
        return (
          <Badge variant="destructive" className="text-xs">
            CLEARANCE
          </Badge>
        )
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
      price: product.discounted_price,
      image: product.image_url,
      inStock: inStock,
      quantity: 1,
    })

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart at the deal price of $${product.discounted_price.toFixed(2)}.`,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔥 Hot Deals & Special Offers</h1>
          <p className="text-gray-600">Limited time offers - save big on business essentials!</p>
        </div>

        {/* Deal Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 mx-auto mb-2" />
              <h3 className="font-bold">Flash Deals</h3>
              <p className="text-sm opacity-90">Limited time only</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <h3 className="font-bold">Daily Deals</h3>
              <p className="text-sm opacity-90">New deals every day</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2" />
              <h3 className="font-bold">Weekly Specials</h3>
              <p className="text-sm opacity-90">Week-long savings</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
            <CardContent className="p-4 text-center">
              <Badge className="h-8 w-8 mx-auto mb-2 bg-white text-gray-600">%</Badge>
              <h3 className="font-bold">Clearance</h3>
              <p className="text-sm opacity-90">Final markdowns</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <h2 className="text-xl font-bold">All Deals ({sortedDeals.length})</h2>
          <div className="flex space-x-4">
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deals</SelectItem>
                <SelectItem value="flash">Flash Deals</SelectItem>
                <SelectItem value="daily">Daily Deals</SelectItem>
                <SelectItem value="weekly">Weekly Specials</SelectItem>
                <SelectItem value="clearance">Clearance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">Highest Discount</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingDeals ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
        ) : sortedDeals.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deals available</h3>
            <p className="text-gray-600">Check back later for new deals or try changing your filters.</p>
          </div>
        ) : (
          /* Deals Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDeals.map((product) => {
              const inStock = product.stock_quantity > 0 && product.status === 'active'
              
              return (
                <Card key={`${product.deal_id}-${product.id}`} className="hover:shadow-lg transition-shadow relative overflow-hidden">
                  {/* Deal Type Badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className={`${getDealBadgeColor(product.deal_type)} text-white flex items-center space-x-1`}>
                      {getDealIcon(product.deal_type)}
                      <span className="uppercase text-xs font-bold">{product.deal_type}</span>
                    </Badge>
                  </div>

                  {/* Discount Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-green-500 text-white text-lg font-bold">-{product.discount_percentage}%</Badge>
                  </div>

                  <CardContent className="p-4">
                    <div className="relative mb-4 mt-8">
                      <Link href={`/products/${product.id}`}>
                        <img
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </Link>
                    </div>

                    <Link href={`/products/${product.id}`}>
                      <h3 className="font-medium text-sm mb-2 line-clamp-2 hover:text-green-600">{product.name}</h3>
                    </Link>

                    {/* Deal banner text */}
                    {product.banner_text && (
                      <p className="text-xs text-blue-600 font-medium mb-2">{product.banner_text}</p>
                    )}

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

                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-xl font-bold text-green-600">${product.discounted_price.toFixed(2)}</span>
                      <span className="text-sm text-gray-500 line-through">${product.original_price.toFixed(2)}</span>
                    </div>
                    
                    <div className="text-sm text-green-600 font-medium mb-3">
                      Save ${product.savings.toFixed(2)}
                    </div>

                    {/* Time Left */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Time left:</span>
                        <span className="font-medium text-red-600">{product.time_left}</span>
                      </div>
                      {product.is_limited_stock && inStock && (
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-gray-600">Stock left:</span>
                          <span className="font-medium text-orange-600">{product.stock_quantity} remaining</span>
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full" 
                      size="sm" 
                      disabled={!inStock} 
                      onClick={() => handleAddToCart(product)}
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

        {/* Newsletter Signup */}
        <Card className="mt-12 bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">Never Miss a Deal!</h3>
            <p className="text-gray-600 mb-6">Subscribe to get notified about flash sales and exclusive offers</p>
            <div className="flex max-w-md mx-auto space-x-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Button>Subscribe</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
