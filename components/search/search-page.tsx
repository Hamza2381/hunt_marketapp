"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Star, Filter, Grid, List, Search, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

// Mock products data
const allProducts = [
  {
    id: 1,
    name: "Premium Copy Paper - 500 Sheets",
    sku: "PP-500-001",
    price: 12.99,
    originalPrice: 15.99,
    rating: 4.5,
    reviews: 234,
    category: "Paper",
    brand: "Hammermill",
    inStock: true,
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 2,
    name: "Black Ink Cartridge - HP Compatible",
    sku: "INK-HP-001",
    price: 24.99,
    originalPrice: 39.99,
    rating: 4.2,
    reviews: 156,
    category: "Ink & Toner",
    brand: "Generic",
    inStock: true,
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 3,
    name: "Wireless Mouse - Ergonomic Design",
    sku: "TECH-MS-001",
    price: 19.99,
    originalPrice: 29.99,
    rating: 4.7,
    reviews: 89,
    category: "Technology",
    brand: "Logitech",
    inStock: false,
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 4,
    name: "Coffee K-Cups - Variety Pack",
    sku: "COFFEE-001",
    price: 32.99,
    originalPrice: 45.99,
    rating: 4.8,
    reviews: 312,
    category: "Coffee & Snacks",
    brand: "Dunkin'",
    inStock: true,
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 5,
    name: "Sticky Notes - Assorted Colors",
    sku: "OFFICE-001",
    price: 8.99,
    originalPrice: 12.99,
    rating: 4.3,
    reviews: 67,
    category: "Office Supplies",
    brand: "Post-it",
    inStock: true,
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 6,
    name: "All-Purpose Cleaner - 32oz",
    sku: "CLEAN-001",
    price: 6.99,
    originalPrice: 9.99,
    rating: 4.1,
    reviews: 45,
    category: "Cleaning",
    brand: "Lysol",
    inStock: true,
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 7,
    name: "Laser Printer Paper - Ream",
    sku: "PAPER-002",
    price: 15.99,
    originalPrice: 18.99,
    rating: 4.3,
    reviews: 156,
    category: "Paper",
    brand: "Georgia-Pacific",
    inStock: true,
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 8,
    name: "Color Ink Cartridge Set",
    sku: "INK-COLOR-001",
    price: 39.99,
    originalPrice: 59.99,
    rating: 4.4,
    reviews: 203,
    category: "Ink & Toner",
    brand: "HP",
    inStock: true,
    image: "/placeholder.svg?height=200&width=200",
  },
]

interface SearchPageProps {
  searchParams: {
    q?: string
    category?: string
    sort?: string
    page?: string
  }
}

export function SearchPage({ searchParams }: SearchPageProps) {
  const [products, setProducts] = useState(allProducts)
  const [filteredProducts, setFilteredProducts] = useState(allProducts)
  const [searchQuery, setSearchQuery] = useState(searchParams.q || "")
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.category ? [searchParams.category] : [],
  )
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 })
  const [sortBy, setSortBy] = useState(searchParams.sort || "featured")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showFilters, setShowFilters] = useState(false)
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  const categories = [...new Set(allProducts.map((p) => p.category))]
  const brands = [...new Set(allProducts.map((p) => p.brand))]

  useEffect(() => {
    let filtered = allProducts

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) => selectedCategories.includes(product.category))
    }

    // Filter by brands
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((product) => selectedBrands.includes(product.brand))
    }

    // Filter by price range
    filtered = filtered.filter((product) => product.price >= priceRange.min && product.price <= priceRange.max)

    // Sort products
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating)
        break
      case "newest":
        // Keep original order for newest
        break
      default:
        // Featured - keep original order
        break
    }

    setFilteredProducts(filtered)
  }, [searchQuery, selectedCategories, selectedBrands, priceRange, sortBy])

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category])
    } else {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    }
  }

  const handleBrandChange = (brand: string, checked: boolean) => {
    if (checked) {
      setSelectedBrands([...selectedBrands, brand])
    } else {
      setSelectedBrands(selectedBrands.filter((b) => b !== brand))
    }
  }

  const handleAddToCart = (product: any) => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to your cart.",
        variant: "destructive",
      })
      return
    }

    if (!product.inStock) {
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
      image: product.image,
      inStock: product.inStock,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Search Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="md:hidden">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                {searchQuery ? `Search results for "${searchQuery}"` : "All Products"}
              </h1>
              <p className="text-gray-600">{filteredProducts.length} products found</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:block ${showFilters ? "block" : "hidden"}`}>
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Categories */}
                <div>
                  <h3 className="font-medium mb-3">Categories</h3>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                        />
                        <label htmlFor={`category-${category}`} className="text-sm cursor-pointer">
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div>
                  <h3 className="font-medium mb-3">Brands</h3>
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <div key={brand} className="flex items-center space-x-2">
                        <Checkbox
                          id={`brand-${brand}`}
                          checked={selectedBrands.includes(brand)}
                          onCheckedChange={(checked) => handleBrandChange(brand, checked as boolean)}
                        />
                        <label htmlFor={`brand-${brand}`} className="text-sm cursor-pointer">
                          {brand}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-medium mb-3">Price Range</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) || 0 })}
                        className="w-20"
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) || 1000 })}
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedCategories([])
                    setSelectedBrands([])
                    setPriceRange({ min: 0, max: 1000 })
                    setSearchQuery("")
                  }}
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Products Grid/List */}
          <div className="lg:col-span-3">
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Search className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600 mb-6">Try adjusting your search criteria or browse our categories</p>
                  <Button asChild>
                    <Link href="/">Browse All Products</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div
                className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}
              >
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className={viewMode === "grid" ? "p-4" : "p-4 flex space-x-4"}>
                      <div className={viewMode === "grid" ? "" : "flex-shrink-0"}>
                        <Link href={`/products/${product.id}`}>
                          <img
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            className={
                              viewMode === "grid"
                                ? "w-full h-48 object-cover rounded-lg mb-4"
                                : "w-24 h-24 object-cover rounded-lg"
                            }
                          />
                        </Link>
                      </div>

                      <div className="flex-1">
                        <div className="mb-2">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </div>

                        <Link href={`/products/${product.id}`}>
                          <h3 className="font-medium mb-2 hover:text-blue-600 line-clamp-2">{product.name}</h3>
                        </Link>

                        <div className="flex items-center space-x-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600">({product.reviews})</span>
                        </div>

                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-lg font-bold">${product.price}</span>
                          {product.originalPrice > product.price && (
                            <span className="text-sm text-gray-500 line-through">${product.originalPrice}</span>
                          )}
                        </div>

                        <div className={viewMode === "grid" ? "" : "flex items-center space-x-2"}>
                          <Button
                            className={viewMode === "grid" ? "w-full" : ""}
                            size="sm"
                            disabled={!product.inStock}
                            onClick={() => handleAddToCart(product)}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {product.inStock ? "Add to Cart" : "Out of Stock"}
                          </Button>
                          {viewMode === "list" && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/products/${product.id}`}>View Details</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
