"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, Clock, Flame, Zap } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import Link from "next/link"

const deals = [
  {
    id: 1,
    name: 'Hammermill Copy Plus 8.5" x 11" Copy Paper, 20 lbs., 3-Hole Punched',
    price: 44.99,
    originalPrice: 79.99,
    discount: 44,
    rating: 4.5,
    reviews: 1753,
    category: "Paper",
    dealType: "flash",
    timeLeft: "2h 15m",
    image: "/placeholder.svg?height=200&width=200",
    inStock: true,
    stockLeft: 23,
  },
  {
    id: 2,
    name: "Dunkin' Original Blend Coffee Keurig® K-Cup® Pods",
    price: 36.99,
    originalPrice: 79.99,
    discount: 54,
    rating: 4.8,
    reviews: 554,
    category: "Coffee & Snacks",
    dealType: "daily",
    timeLeft: "18h 45m",
    image: "/placeholder.svg?height=200&width=200",
    inStock: true,
    stockLeft: 156,
  },
  {
    id: 3,
    name: "Quill Brand® File Folders, 1/3-Cut Tab, Letter Size, Manila",
    price: 15.99,
    originalPrice: 32.69,
    discount: 51,
    rating: 4.3,
    reviews: 523,
    category: "Office Supplies",
    dealType: "weekly",
    timeLeft: "3d 12h",
    image: "/placeholder.svg?height=200&width=200",
    inStock: true,
    stockLeft: 89,
  },
  {
    id: 4,
    name: "Duracell Coppertop AA Alkaline Battery, 36/Pack",
    price: 19.99,
    originalPrice: 42.99,
    discount: 53,
    rating: 4.6,
    reviews: 504,
    category: "Office Supplies",
    dealType: "clearance",
    timeLeft: "Limited Stock",
    image: "/placeholder.svg?height=200&width=200",
    inStock: true,
    stockLeft: 12,
  },
  {
    id: 5,
    name: "HP 64XL Black High Yield Original Ink Cartridge",
    price: 29.99,
    originalPrice: 54.99,
    discount: 45,
    rating: 4.4,
    reviews: 892,
    category: "Ink & Toner",
    dealType: "flash",
    timeLeft: "1h 30m",
    image: "/placeholder.svg?height=200&width=200",
    inStock: true,
    stockLeft: 7,
  },
  {
    id: 6,
    name: "Lysol Disinfecting Wipes, Lemon & Lime Blossom, 80 Wipes",
    price: 8.99,
    originalPrice: 15.99,
    discount: 44,
    rating: 4.7,
    reviews: 1234,
    category: "Cleaning",
    dealType: "daily",
    timeLeft: "22h 10m",
    image: "/placeholder.svg?height=200&width=200",
    inStock: true,
    stockLeft: 45,
  },
]

export function DealsPage() {
  const [sortBy, setSortBy] = useState("discount")
  const [filterBy, setFilterBy] = useState("all")
  const { addItem } = useCart()

  const filteredDeals = deals.filter((deal) => {
    if (filterBy === "all") return true
    return deal.dealType === filterBy
  })

  const sortedDeals = [...filteredDeals].sort((a, b) => {
    switch (sortBy) {
      case "discount":
        return b.discount - a.discount
      case "price-low":
        return a.price - b.price
      case "price-high":
        return b.price - a.price
      case "rating":
        return b.rating - a.rating
      case "ending-soon":
        // Simple time sorting - in real app would parse actual time
        return a.timeLeft.localeCompare(b.timeLeft)
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

  const handleAddToCart = (deal: any) => {
    addItem({
      id: deal.id,
      name: deal.name,
      sku: `DEAL-${deal.id}`,
      price: deal.price,
      image: deal.image,
      inStock: deal.inStock,
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

        {/* Deals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedDeals.map((deal) => (
            <Card key={deal.id} className="hover:shadow-lg transition-shadow relative overflow-hidden">
              {/* Deal Type Badge */}
              <div className="absolute top-2 left-2 z-10">
                <Badge className={`${getDealBadgeColor(deal.dealType)} text-white flex items-center space-x-1`}>
                  {getDealIcon(deal.dealType)}
                  <span className="uppercase text-xs font-bold">{deal.dealType}</span>
                </Badge>
              </div>

              {/* Discount Badge */}
              <div className="absolute top-2 right-2 z-10">
                <Badge className="bg-green-500 text-white text-lg font-bold">-{deal.discount}%</Badge>
              </div>

              <CardContent className="p-4">
                <div className="relative mb-4">
                  <Link href={`/products/${deal.id}`}>
                    <img
                      src={deal.image || "/placeholder.svg"}
                      alt={deal.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </Link>
                </div>

                <Link href={`/products/${deal.id}`}>
                  <h3 className="font-medium text-sm mb-2 line-clamp-2 hover:text-green-600">{deal.name}</h3>
                </Link>

                <div className="flex items-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(deal.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600">({deal.reviews})</span>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-xl font-bold text-green-600">${deal.price}</span>
                  <span className="text-sm text-gray-500 line-through">${deal.originalPrice}</span>
                  <span className="text-sm text-green-600 font-medium">
                    Save ${(deal.originalPrice - deal.price).toFixed(2)}
                  </span>
                </div>

                {/* Time Left */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Time left:</span>
                    <span className="font-medium text-red-600">{deal.timeLeft}</span>
                  </div>
                  {deal.stockLeft <= 20 && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-600">Stock left:</span>
                      <span className="font-medium text-orange-600">{deal.stockLeft} remaining</span>
                    </div>
                  )}
                </div>

                <Button className="w-full" size="sm" disabled={!deal.inStock} onClick={() => handleAddToCart(deal)}>
                  {deal.inStock ? "Add to Cart" : "Out of Stock"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

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
