"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

// Mock product data
const products = [
  {
    id: 1,
    name: "Premium Copy Paper - 500 Sheets",
    sku: "PP-500-001",
    price: 12.99,
    originalPrice: 15.99,
    rating: 4.5,
    reviews: 234,
    category: "Paper",
    inStock: true,
    stockQuantity: 150,
    images: [
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
    ],
    description:
      "High-quality white copy paper, 20lb weight, perfect for everyday printing and copying needs. Compatible with all major printer brands.",
    features: [
      "20lb weight for professional documents",
      "99.99% jam-free guarantee",
      "Acid-free for long-term storage",
      "Compatible with inkjet and laser printers",
      "Made from sustainable forests",
    ],
    specifications: {
      "Paper Weight": "20 lb",
      "Sheet Size": '8.5" x 11"',
      "Sheets per Ream": "500",
      Brightness: "92",
      Opacity: "94%",
      Caliper: "4.0 mil",
    },
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
    inStock: true,
    stockQuantity: 75,
    images: ["/placeholder.svg?height=400&width=400"],
    description: "Compatible black ink cartridge for HP printers, high yield with professional quality output.",
    features: [
      "High yield - up to 600 pages",
      "Professional quality output",
      "Easy installation",
      "100% compatible with HP printers",
      "1-year warranty included",
    ],
    specifications: {
      "Page Yield": "600 pages",
      "Ink Type": "Pigment-based",
      "Compatible Models": "HP 64, 65, 67 series",
      Color: "Black",
      Warranty: "1 year",
    },
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
    inStock: false,
    stockQuantity: 0,
    images: ["/placeholder.svg?height=400&width=400"],
    description: "Comfortable wireless mouse with ergonomic design for all-day use.",
    features: [
      "Wireless connectivity up to 33ft",
      "Ergonomic design reduces wrist strain",
      "18-month battery life",
      "Compatible with Windows, Mac, and Linux",
      "Plug-and-play setup with included USB receiver",
    ],
    specifications: {
      Connectivity: "2.4GHz wireless",
      Battery: "1 AA (included)",
      DPI: "1200",
      Buttons: "3",
      Warranty: "2 years",
    },
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
    inStock: true,
    stockQuantity: 120,
    images: ["/placeholder.svg?height=400&width=400"],
    description: "Assorted coffee flavors in convenient K-Cup pods, compatible with all Keurig brewers.",
    features: [
      "40-count variety pack",
      "Includes 4 popular flavors",
      "100% Arabica coffee",
      "Compatible with all Keurig K-Cup brewers",
      "Individually sealed for freshness",
    ],
    specifications: {
      Count: "40 pods",
      Flavors: "Original, Dark Roast, French Vanilla, Hazelnut",
      Caffeine: "Regular",
      Compatibility: "All Keurig K-Cup brewers",
      "Shelf Life": "12 months",
    },
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
    inStock: true,
    stockQuantity: 200,
    images: ["/placeholder.svg?height=400&width=400"],
    description: "Colorful sticky notes perfect for reminders, notes, and organization.",
    features: [
      "12-pack of 100 sheets each",
      "5 assorted bright colors",
      "3x3 inch size",
      "Super sticky adhesive",
      "Recyclable paper",
    ],
    specifications: {
      Size: "3x3 inches",
      Sheets: "100 per pad",
      Pads: "12",
      Colors: "Yellow, Blue, Green, Pink, Orange",
      Material: "Recycled paper",
    },
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
    inStock: true,
    stockQuantity: 85,
    images: ["/placeholder.svg?height=400&width=400"],
    description: "Powerful all-purpose cleaner for surfaces throughout your office.",
    features: [
      "Kills 99.9% of bacteria",
      "Safe for most surfaces",
      "Pleasant lemon scent",
      "No harsh chemicals",
      "Ready to use - no dilution needed",
    ],
    specifications: {
      Size: "32 oz",
      Scent: "Lemon",
      Form: "Spray",
      "Surface Types": "Counters, glass, stainless steel, plastic",
      Ingredients: "Plant-based surfactants, essential oils",
    },
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
    inStock: true,
    stockQuantity: 75,
    images: ["/placeholder.svg?height=400&width=400"],
    description: "Premium laser printer paper for sharp, professional documents.",
    features: [
      "24lb weight for premium feel",
      "98 brightness for vivid printing",
      "Acid-free for archival quality",
      "Optimized for laser printers",
      "500 sheets per ream",
    ],
    specifications: {
      "Paper Weight": "24 lb",
      "Sheet Size": '8.5" x 11"',
      "Sheets per Ream": "500",
      Brightness: "98",
      Opacity: "96%",
      Caliper: "4.5 mil",
    },
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
    inStock: true,
    stockQuantity: 50,
    images: ["/placeholder.svg?height=400&width=400"],
    description: "Complete set of color ink cartridges for vibrant photo and document printing.",
    features: [
      "4-pack includes Cyan, Magenta, Yellow, and Black",
      "High capacity - up to 450 pages per cartridge",
      "Fade-resistant for long-lasting prints",
      "Compatible with major printer brands",
      "Easy installation with chip technology",
    ],
    specifications: {
      Colors: "Cyan, Magenta, Yellow, Black",
      "Page Yield": "450 pages per color",
      "Ink Type": "Dye-based",
      "Compatible Models": "HP, Canon, Epson (check compatibility)",
      Warranty: "1 year",
    },
  },
]

interface ProductDetailPageProps {
  productId: string
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const [product, setProduct] = useState<any>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Find product by ID
    const foundProduct = products.find((p) => p.id === Number.parseInt(productId))
    setProduct(foundProduct)
  }, [productId])

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Product not found</h1>
            <p className="text-gray-600 mt-2">The product you're looking for doesn't exist.</p>
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

    if (!product.inStock) {
      toast({
        title: "Out of stock",
        description: "This item is currently out of stock.",
        variant: "destructive",
      })
      return
    }

    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        image: product.images[0],
        inStock: product.inStock,
      })
    }

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
                href={`/categories/${product.category.toLowerCase().replace(/\s+/g, "-")}`}
                className="hover:text-blue-600"
              >
                {product.category}
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
                src={product.images[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex space-x-2">
                {product.images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? "border-blue-600" : "border-gray-200"
                    }`}
                  >
                    <img src={image || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="mb-2">
                {product.category}
              </Badge>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-gray-600">SKU: {product.sku}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">({product.reviews} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-bold text-blue-600">${product.price}</span>
              {product.originalPrice > product.price && (
                <span className="text-xl text-gray-500 line-through">${product.originalPrice}</span>
              )}
              {product.originalPrice > product.price && (
                <Badge className="bg-red-500">Save ${(product.originalPrice - product.price).toFixed(2)}</Badge>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center space-x-2">
              {product.inStock ? (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">In Stock ({product.stockQuantity} available)</span>
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
                  max={product.stockQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                  className="w-20"
                  disabled={!product.inStock}
                />
              </div>

              <div className="flex space-x-3">
                <Button onClick={handleAddToCart} disabled={!product.inStock} className="flex-1" size="lg">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {product.inStock ? "Add to Cart" : "Out of Stock"}
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({product.reviews})</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-6">
                <div className="space-y-4">
                  <p className="text-gray-700">{product.description}</p>
                  <div>
                    <h4 className="font-medium mb-2">Key Features:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {product.features.map((feature: string, index: number) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b">
                      <span className="font-medium">{key}:</span>
                      <span className="text-gray-700">{value as string}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-6">
                  {/* Review Summary */}
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold">{product.rating}</div>
                      <div className="flex items-center justify-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-600">{product.reviews} reviews</div>
                    </div>
                    <div className="flex-1">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <div key={stars} className="flex items-center space-x-2">
                          <span className="text-sm w-8">{stars}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${Math.random() * 80 + 10}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8">{Math.floor(Math.random() * 50)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Sample Reviews */}
                  <div className="space-y-4">
                    {[
                      {
                        name: "John D.",
                        rating: 5,
                        date: "2024-01-15",
                        comment:
                          "Excellent quality paper. Works great with our office printers and the price is very competitive.",
                      },
                      {
                        name: "Sarah M.",
                        rating: 4,
                        date: "2024-01-10",
                        comment:
                          "Good value for money. The paper quality is consistent and we haven't had any jamming issues.",
                      },
                    ].map((review, index) => (
                      <div key={index} className="border-b pb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">{review.name}</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">{review.date}</span>
                        </div>
                        <p className="text-gray-700">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
