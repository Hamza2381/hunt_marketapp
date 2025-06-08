"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart, Loader2 } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import type { Product, Category } from "@/lib/supabase"

interface ProductWithCategory extends Product {
  category_name?: string;
  rating?: number;
  reviews?: number;
}

export function ProductGrid() {
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch categories first
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
        
        if (categoriesError) throw categoriesError
        
        setCategories(categoriesData || [])
        
        // Fetch active products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8)
        
        if (productsError) throw productsError
        
        // Enhance products with category names
        const enhancedProducts = productsData.map(product => {
          const category = categoriesData.find(cat => cat.id === product.category_id)
          return {
            ...product,
            category_name: category?.name || 'Uncategorized',
            // Add mock rating and reviews for demo purposes
            rating: (Math.random() * 2 + 3).toFixed(1),  // Random rating between 3.0 and 5.0
            reviews: Math.floor(Math.random() * 300) + 10, // Random reviews between 10 and 310
          }
        })
        
        setProducts(enhancedProducts)
      } catch (err: any) {
        console.error('Error fetching products:', err.message)
        setError('Failed to load products. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProducts()
  }, [])

  const handleAddToCart = (product: ProductWithCategory) => {
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

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-4 text-gray-600">Loading products...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-red-600 mb-2">Error loading products</h3>
        <p className="text-gray-600">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
        <p className="text-gray-600">Check back later for new products.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
        <p className="text-gray-600">Discover our most popular business and office supplies</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-4">
                  <img
                    src={product.image_url || "/placeholder.svg?height=200&width=200"}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {/* Add discount badges if needed in the future */}
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
                  <h3 className="font-medium hover:text-green-600 line-clamp-2">{product.name}</h3>
                </Link>

                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(Number(product.rating || 0)) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600">({product.reviews})</span>
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

      <div className="text-center">
        <Button asChild variant="outline" size="lg">
          <Link href="/products">View All Products</Link>
        </Button>
      </div>
    </div>
  )
}
