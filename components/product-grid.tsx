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

interface ProductGridProps {
  searchQuery?: string;
  categoryFilter?: string;
  sortOrder?: string;
  onlyFeatured?: boolean;
}

export function ProductGrid({ searchQuery = '', categoryFilter = '', sortOrder = 'newest', onlyFeatured = false }: ProductGridProps) {
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch all products and categories once
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
        
        // Fetch active products - don't limit on the products page
        let query = supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
        
        // Check if the column exists by fetching just one product first
        if (onlyFeatured) {
          try {
            // Try to execute a query with is_featured
            const testQuery = await supabase
              .from('products')
              .select('id')
              .eq('is_featured', true)
              .limit(1)
            
            // If there's no error, use the filter
            if (!testQuery.error) {
              query = query.eq('is_featured', true)
            } else {
              console.warn('is_featured column not available:', testQuery.error.message)
              // We'll fall back to showing all products
              // For demo purposes, let's limit to first 4 products
              query = query.limit(4)
            }
          } catch (err) {
            console.warn('Error checking for is_featured column, showing all products')
            // For demo purposes, let's limit to first 4 products on the home page
            query = query.limit(4)
          }
        }
        
        const { data: productsData, error: productsError } = await query
        
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
        setFilteredProducts(enhancedProducts) // Initialize with all products
      } catch (err: any) {
        console.error('Error fetching products:', err.message)
        setError('Failed to load products. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProducts()
  }, [onlyFeatured])
  
  // Apply filters and sorting whenever filters or products change
  useEffect(() => {
    if (products.length === 0) return;
    
    // Start with all products
    let filtered = [...products];
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(product => 
        product.category_id.toString() === categoryFilter
      );
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.description?.toLowerCase().includes(query) ||
        product.category_name?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    switch (sortOrder) {
      case 'newest':
        filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popularity':
        // Sort by rating * reviews for a popularity score
        filtered.sort((a, b) => {
          const scoreA = (parseFloat(a.rating?.toString() || '0') * (a.reviews || 0));
          const scoreB = (parseFloat(b.rating?.toString() || '0') * (b.reviews || 0));
          return scoreB - scoreA;
        });
        break;
    }
    
    // Update filtered products
    setFilteredProducts(filtered);
  }, [products, categoryFilter, searchQuery, sortOrder])

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
  
  // Show message when no products match the filters
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

  // Determine whether to show title based on context
  const showTitle = !searchQuery && !categoryFilter;
  
  return (
    <div className="space-y-8">
      {showTitle && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-gray-600 mb-2">Discover our most popular business and office supplies</p>
          {onlyFeatured && (
            <p className="text-xs text-gray-500">
              <strong>Note for Admin:</strong> Please run the migration script in scripts/add-featured-products.sql to enable proper featured products filtering.
            </p>
          )}
        </div>
      )}
      
      {!showTitle && searchQuery && (
        <div className="mb-4">
          <h3 className="text-xl font-medium mb-2">Search Results: "{searchQuery}"</h3>
          <p className="text-gray-600">{filteredProducts.length} product(s) found</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
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

      {/* Only show 'View All' on homepage, not on products page */}
      {!categoryFilter && !searchQuery && (
        <div className="text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/products">View All Products</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
