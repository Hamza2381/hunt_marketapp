"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw, Loader2, FileText } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { supabase } from "@/lib/supabase-client"
import type { Product, Category } from "@/lib/supabase"

interface ExtendedProduct extends Product {
  category_name?: string;
  specifications?: Record<string, string>;
  images?: string[];
}

interface ProductDetailPageProps {
  productId: string
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const [product, setProduct] = useState<ExtendedProduct | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Fetch product data
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()
        
        if (productError) throw productError
        
        if (!productData) {
          setError('Product not found')
          setIsLoading(false)
          return
        }
        
        // Fetch category name
        const { data: categoryData } = await supabase
          .from('categories')
          .select('name')
          .eq('id', productData.category_id)
          .single()
        
        // Transform product data with additional info
        const enhancedProduct: ExtendedProduct = {
          ...productData,
          category_name: categoryData?.name || 'Uncategorized',
          
          // Only include essential specifications from the database
          specifications: {
            'SKU': productData.sku,
            'Category': categoryData?.name || 'Uncategorized',
            'Stock': productData.stock_quantity.toString(),
            'Status': productData.status.charAt(0).toUpperCase() + productData.status.slice(1)
          }
        }
        
        // Handle product images - if it's a single image string, convert to array
        if (typeof enhancedProduct.image_url === 'string' && enhancedProduct.image_url) {
          enhancedProduct.images = [enhancedProduct.image_url]
        } else {
          enhancedProduct.images = ["/placeholder.svg?height=400&width=400"]
        }
        
        setProduct(enhancedProduct)
      } catch (err: any) {
        console.error('Error fetching product details:', err.message)
        setError('Failed to load product details. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (productId) {
      fetchProduct()
    }
  }, [productId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-gray-600 mt-4">Loading product details...</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Product not found</h1>
            <p className="text-gray-600 mt-2">{error || "The product you're looking for doesn't exist."}</p>
            <Button asChild className="mt-4">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleAddToCart = () => {
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

    // Fixed: Remove the quantity property from the addItem call
    // The addItem function expects an object WITHOUT a quantity property
    addItem({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      image: product.images ? product.images[0] : product.image_url || "/placeholder.svg",
      inStock: product.stock_quantity > 0 && product.status === "active",
    })

    toast({
      title: "Added to cart",
      description: `${quantity} ${quantity === 1 ? "item" : "items"} of ${product.name} added to your cart.`,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="hover:text-blue-600">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/categories" className="hover:text-blue-600">
                Categories
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                href={`/categories/${product.category_name?.toLowerCase().replace(/\s+/g, "-")}`}
                className="hover:text-blue-600"
              >
                {product.category_name}
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900">{product.name}</li>
          </ol>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden">
              <img
                src={product.images && product.images.length > 0 ? product.images[selectedImage] : "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=400&width=400";
                }}
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex space-x-2">
                {product.images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? "border-blue-600" : "border-gray-200"
                    }`}
                  >
                    <img 
                      src={image || "/placeholder.svg"} 
                      alt="" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=100&width=100";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="mb-2">
                {product.category_name}
              </Badge>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-gray-600">SKU: {product.sku}</p>
            </div>

            {/* Price */}
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-bold text-blue-600">${product.price.toFixed(2)}</span>
            </div>

            {/* Stock Status */}
            <div className="flex items-center space-x-2">
              {product.stock_quantity > 0 && product.status === "active" ? (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">In Stock ({product.stock_quantity} available)</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-600 font-medium">Out of Stock</span>
                </>
              )}
            </div>

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label htmlFor="quantity" className="font-medium">
                  Quantity:
                </label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.stock_quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                  className="w-20"
                  disabled={product.stock_quantity <= 0 || product.status !== "active"}
                />
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={handleAddToCart} 
                  disabled={product.stock_quantity <= 0 || product.status !== "active"} 
                  className="flex-1" 
                  size="lg"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {product.stock_quantity > 0 && product.status === "active" ? "Add to Cart" : "Out of Stock"}
                </Button>
                <Button variant="outline" size="lg" onClick={() => setIsWishlisted(!isWishlisted)}>
                  <Heart className={`h-5 w-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                <Button variant="outline" size="lg">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <Truck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium">Free Shipping</p>
                <p className="text-xs text-gray-600">On orders over $45</p>
              </div>
              <div className="text-center">
                <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium">Quality Guarantee</p>
                <p className="text-xs text-gray-600">100% satisfaction</p>
              </div>
              <div className="text-center">
                <RotateCcw className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium">Easy Returns</p>
                <p className="text-xs text-gray-600">30-day policy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="description">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-6">
                {product.description ? (
                  <p className="text-gray-700">{product.description}</p>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No description available for this product.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="specifications" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.specifications && Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b">
                      <span className="font-medium">{key}:</span>
                      <span className="text-gray-700">{value}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}