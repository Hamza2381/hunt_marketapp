"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, Grid, List, ShoppingCart, Loader2, AlertTriangle } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getCategoryIcon } from "@/lib/category-utils"
import Link from "next/link"

interface Product {
  id: number
  name: string
  sku: string
  price: number
  stock_quantity: number
  status: string
  image_url?: string
  description?: string
  rating?: number
  reviews?: number
  category_name?: string
}

interface Category {
  id: number
  name: string
  description?: string
  slug: string
  productCount: number
}

interface CategoryPageProps {
  categorySlug: string
}

export function CategoryPage({ categorySlug }: CategoryPageProps) {
  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [sortBy, setSortBy] = useState("featured")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/categories/${categorySlug}`)
        const result = await response.json()

        if (!result.success) {
          if (response.status === 404) {
            setError('Category not found')
          } else {
            setError(result.error || 'Failed to load category')
          }
          return
        }

        setCategory(result.category)
        setProducts(result.products || [])
        setFilteredProducts(result.products || [])
      } catch (error: any) {
        console.error('Error fetching category data:', error)
        setError(error.message || 'Failed to load category')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategoryData()
  }, [categorySlug])

  useEffect(() => {
    let filtered = [...products]

    // Sort products
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        // Keep original order for featured
        break
    }

    setFilteredProducts(filtered)
  }, [products, sortBy])

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to your cart.",
        variant: "destructive",
      })
      return
    }

    if (product.stock_quantity <= 0 || product.status !== "active") {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading category...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {error === 'Category not found' ? 'Category Not Found' : 'Error Loading Category'}
            </h1>
            <p className="text-gray-600 mb-6">
              {error === 'Category not found' 
                ? "The category you're looking for doesn't exist or may have been moved."
                : error || 'Something went wrong while loading this category.'
              }
            </p>
            <div className="space-x-4">
              <Button asChild>
                <Link href="/categories">Browse Categories</Link>
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const CategoryIcon = getCategoryIcon(category.name)

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
          <div className="relative h-48 rounded-lg overflow-hidden mb-6 bg-gradient-to-br from-blue-400 to-blue-600">
            <div className="absolute inset-0 flex items-center justify-center">
              <CategoryIcon className="h-32 w-32 text-white opacity-20" />
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="mb-4">
                  <CategoryIcon className="h-12 w-12 mx-auto mb-2" />
                </div>
                <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
                <p className="text-lg">
                  {category.description || `Explore our ${category.name.toLowerCase()} collection`}
                </p>
                <p className="text-sm mt-2 opacity-90">
                  {category.productCount} {category.productCount === 1 ? 'product' : 'products'} available
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CategoryIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
              <p className="text-gray-600 mb-6">
                Products in the {category.name} category are coming soon.
              </p>
              <Button asChild>
                <Link href="/categories">Browse Other Categories</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters and Sorting */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">
                  Products ({filteredProducts.length})
                </h2>
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
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Grid/List */}
            <div
              className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" : "space-y-4"}
            >
              {filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className={viewMode === "grid" ? "p-4" : "p-4 flex space-x-4"}>
                    <div className={viewMode === "grid" ? "" : "flex-shrink-0"}>
                      <Link href={`/products/${product.id}`}>
                        <img
                          src={product.image_url || "/placeholder.svg?height=200&width=200"}
                          alt={product.name}
                          className={
                            viewMode === "grid"
                              ? "w-full h-48 object-cover rounded-lg mb-4"
                              : "w-24 h-24 object-cover rounded-lg"
                          }
                          loading="lazy"
                        />
                      </Link>
                    </div>

                    <div className="flex-1">
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs">
                          {product.category_name || category.name}
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
                              i < Math.floor(product.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600">({product.reviews || 0})</span>
                      </div>

                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                      </div>

                      <div className={viewMode === "grid" ? "" : "flex items-center space-x-2"}>
                        <Button
                          className={viewMode === "grid" ? "w-full" : ""}
                          size="sm"
                          disabled={product.stock_quantity <= 0 || product.status !== "active"}
                          onClick={() => handleAddToCart(product)}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {product.stock_quantity > 0 && product.status === "active" ? "Add to Cart" : "Out of Stock"}
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
          </>
        )}
      </div>
    </div>
  )
}
