"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Star, Grid, List, ShoppingCart } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

// Mock category data
const categoryData = {
  paper: {
    name: "Paper",
    description: "High-quality paper products for all your business needs",
    image: "/placeholder.svg?height=300&width=1200",
    subcategories: ["Copy Paper", "Cardstock", "Photo Paper", "Specialty Paper"],
    brands: ["Hammermill", "Georgia-Pacific", "International Paper", "Staples"],
  },
  "ink-toner": {
    name: "Ink & Toner",
    description: "Printer cartridges and supplies for all major printer brands",
    image: "/placeholder.svg?height=300&width=1200",
    subcategories: ["Ink Cartridges", "Toner Cartridges", "Ink Refills", "Photo Paper"],
    brands: ["HP", "Canon", "Epson", "Brother", "Generic"],
  },
  "office-supplies": {
    name: "Office Supplies",
    description: "Essential supplies to keep your office running smoothly",
    image: "/placeholder.svg?height=300&width=1200",
    subcategories: ["Writing Instruments", "Desk Accessories", "Filing", "Binding"],
    brands: ["Staples", "Post-it", "Sharpie", "BIC", "Scotch"],
  },
  "coffee-snacks": {
    name: "Coffee & Snacks",
    description: "Keep your team energized with quality coffee and snacks",
    image: "/placeholder.svg?height=300&width=1200",
    subcategories: ["Coffee", "Tea", "Snacks", "Water"],
    brands: ["Dunkin'", "Starbucks", "Folgers", "Lipton", "Kind"],
  },
  technology: {
    name: "Technology",
    description: "Computer accessories and electronic devices for modern offices",
    image: "/placeholder.svg?height=300&width=1200",
    subcategories: ["Keyboards & Mice", "Cables", "Storage", "Monitors"],
    brands: ["Logitech", "Microsoft", "Apple", "Samsung", "Dell"],
  },
  cleaning: {
    name: "Cleaning",
    description: "Professional cleaning supplies for a healthy workplace",
    image: "/placeholder.svg?height=300&width=1200",
    subcategories: ["All-Purpose Cleaners", "Paper Towels", "Sanitizers", "Trash Bags"],
    brands: ["Lysol", "Clorox", "Bounty", "Charmin", "Glad"],
  },
}

// Mock products for each category
const categoryProducts = {
  paper: [
    {
      id: 1,
      name: "Premium Copy Paper - 500 Sheets",
      sku: "PP-500-001",
      price: 12.99,
      originalPrice: 15.99,
      rating: 4.5,
      reviews: 234,
      subcategory: "Copy Paper",
      brand: "Hammermill",
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
      subcategory: "Copy Paper",
      brand: "Georgia-Pacific",
      inStock: true,
      image: "/placeholder.svg?height=200&width=200",
    },
  ],
  "ink-toner": [
    {
      id: 2,
      name: "Black Ink Cartridge - HP Compatible",
      sku: "INK-HP-001",
      price: 24.99,
      originalPrice: 39.99,
      rating: 4.2,
      reviews: 156,
      subcategory: "Ink Cartridges",
      brand: "Generic",
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
      subcategory: "Ink Cartridges",
      brand: "HP",
      inStock: true,
      image: "/placeholder.svg?height=200&width=200",
    },
  ],
  "office-supplies": [
    {
      id: 5,
      name: "Sticky Notes - Assorted Colors",
      sku: "OFFICE-001",
      price: 8.99,
      originalPrice: 12.99,
      rating: 4.3,
      reviews: 67,
      subcategory: "Desk Accessories",
      brand: "Post-it",
      inStock: true,
      image: "/placeholder.svg?height=200&width=200",
    },
  ],
  "coffee-snacks": [
    {
      id: 4,
      name: "Coffee K-Cups - Variety Pack",
      sku: "COFFEE-001",
      price: 32.99,
      originalPrice: 45.99,
      rating: 4.8,
      reviews: 312,
      subcategory: "Coffee",
      brand: "Dunkin'",
      inStock: true,
      image: "/placeholder.svg?height=200&width=200",
    },
  ],
  technology: [
    {
      id: 3,
      name: "Wireless Mouse - Ergonomic Design",
      sku: "TECH-MS-001",
      price: 19.99,
      originalPrice: 29.99,
      rating: 4.7,
      reviews: 89,
      subcategory: "Keyboards & Mice",
      brand: "Logitech",
      inStock: false,
      image: "/placeholder.svg?height=200&width=200",
    },
  ],
  cleaning: [
    {
      id: 6,
      name: "All-Purpose Cleaner - 32oz",
      sku: "CLEAN-001",
      price: 6.99,
      originalPrice: 9.99,
      rating: 4.1,
      reviews: 45,
      subcategory: "All-Purpose Cleaners",
      brand: "Lysol",
      inStock: true,
      image: "/placeholder.svg?height=200&width=200",
    },
  ],
}

interface CategoryPageProps {
  categorySlug: string
}

export function CategoryPage({ categorySlug }: CategoryPageProps) {
  const [category, setCategory] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("featured")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const categoryInfo = categoryData[categorySlug as keyof typeof categoryData]
    const categoryProductList = categoryProducts[categorySlug as keyof typeof categoryProducts] || []

    if (categoryInfo) {
      setCategory(categoryInfo)
      setProducts(categoryProductList)
      setFilteredProducts(categoryProductList)
    }
  }, [categorySlug])

  useEffect(() => {
    let filtered = products

    // Filter by subcategories
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter((product) => selectedSubcategories.includes(product.subcategory))
    }

    // Filter by brands
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((product) => selectedBrands.includes(product.brand))
    }

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
      default:
        // Keep original order for featured
        break
    }

    setFilteredProducts(filtered)
  }, [products, selectedSubcategories, selectedBrands, sortBy])

  const handleSubcategoryChange = (subcategory: string, checked: boolean) => {
    if (checked) {
      setSelectedSubcategories([...selectedSubcategories, subcategory])
    } else {
      setSelectedSubcategories(selectedSubcategories.filter((s) => s !== subcategory))
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

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Category not found</h1>
            <p className="text-gray-600 mt-2">The category you're looking for doesn't exist.</p>
            <Button asChild className="mt-4">
              <Link href="/categories">Browse Categories</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="hover:text-green-600">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/categories" className="hover:text-green-600">
                Categories
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900">{category.name}</li>
          </ol>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <div className="relative h-48 rounded-lg overflow-hidden mb-6">
            <img
              src={category.image || "/placeholder.svg"}
              alt={category.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-center text-white">
                <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
                <p className="text-lg">{category.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Products ({filteredProducts.length})</h2>
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
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div>
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Subcategories */}
                <div>
                  <h3 className="font-medium mb-3">Subcategories</h3>
                  <div className="space-y-2">
                    {category.subcategories.map((subcategory: string) => (
                      <div key={subcategory} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subcategory-${subcategory}`}
                          checked={selectedSubcategories.includes(subcategory)}
                          onCheckedChange={(checked) => handleSubcategoryChange(subcategory, checked as boolean)}
                        />
                        <label htmlFor={`subcategory-${subcategory}`} className="text-sm cursor-pointer">
                          {subcategory}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div>
                  <h3 className="font-medium mb-3">Brands</h3>
                  <div className="space-y-2">
                    {category.brands.map((brand: string) => (
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

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedSubcategories([])
                    setSelectedBrands([])
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600 mb-6">Try adjusting your filters or browse other categories</p>
                  <Button asChild>
                    <Link href="/categories">Browse Categories</Link>
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
                            {product.subcategory}
                          </Badge>
                        </div>

                        <Link href={`/products/${product.id}`}>
                          <h3 className="font-medium mb-2 hover:text-green-600 line-clamp-2">{product.name}</h3>
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
