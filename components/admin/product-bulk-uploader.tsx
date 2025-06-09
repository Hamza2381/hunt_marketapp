"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Plus, Loader2, Image, Check, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Category } from "@/lib/supabase"

// Sample business products with HD images
const sampleProducts = [
  {
    name: "Premium Ergonomic Office Chair",
    sku: "CHAIR-ERG-001",
    description: "High-quality ergonomic office chair with adjustable lumbar support, height adjustment, and 360° swivel. Perfect for long working hours with breathable mesh back and padded armrests. Supports up to 300 lbs.",
    price: 299.99,
    stock_quantity: 15,
    status: "active",
    image_url: "https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=1600"
  },
  {
    name: "Dell XPS 15 Laptop",
    sku: "TECH-LPT-002",
    description: "High-performance business laptop featuring Intel Core i7 processor, 32GB RAM, 1TB SSD, and 15.6\" 4K touchscreen display. Includes Windows 11 Pro, backlit keyboard, and fingerprint reader for security.",
    price: 1899.99,
    stock_quantity: 8,
    status: "active",
    image_url: "https://images.pexels.com/photos/7974/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1600"
  },
  {
    name: "Professional Document Scanner",
    sku: "TECH-SCN-003",
    description: "High-speed document scanner with automatic document feeder. Scans up to 50 pages per minute at 600 dpi with duplex capability. Includes OCR software for searchable PDFs and direct cloud upload options.",
    price: 349.95,
    stock_quantity: 10,
    status: "active",
    image_url: "https://images.pexels.com/photos/4065891/pexels-photo-4065891.jpeg?auto=compress&cs=tinysrgb&w=1600"
  },
  {
    name: "Wireless Conference Speaker",
    sku: "AUDIO-SPK-004",
    description: "360° omnidirectional conference speakerphone with noise cancellation and echo reduction technology. Features Bluetooth 5.0, 15-hour battery life, and touch controls. Perfect for meetings up to 8 participants.",
    price: 179.99,
    stock_quantity: 12,
    status: "active",
    image_url: "https://images.pexels.com/photos/164710/pexels-photo-164710.jpeg?auto=compress&cs=tinysrgb&w=1600"
  },
  {
    name: "Adjustable Standing Desk",
    sku: "FURN-DSK-005",
    description: "Electric height-adjustable standing desk with programmable memory settings. Sturdy steel frame supports up to 350 lbs with smooth and quiet motor operation. Includes cable management system and scratch-resistant surface.",
    price: 499.99,
    stock_quantity: 6,
    status: "active",
    image_url: "https://images.pexels.com/photos/4050318/pexels-photo-4050318.jpeg?auto=compress&cs=tinysrgb&w=1600"
  },
  {
    name: "Business Card Scanner",
    sku: "TECH-SCN-006",
    description: "Portable business card scanner with integrated OCR technology. Automatically extracts contact information and syncs with your CRM. Supports multiple languages and exports to various formats.",
    price: 89.95,
    stock_quantity: 20,
    status: "active",
    image_url: "https://images.pexels.com/photos/6980429/pexels-photo-6980429.jpeg?auto=compress&cs=tinysrgb&w=1600"
  },
  {
    name: "Executive Leather Portfolio",
    sku: "OFFC-PRT-007",
    description: "Premium leather portfolio with zipper closure. Features multiple document pockets, business card holders, and a dedicated tablet sleeve. Includes a letter-size notepad and pen loop.",
    price: 79.99,
    stock_quantity: 25,
    status: "active",
    image_url: "https://images.pexels.com/photos/4226896/pexels-photo-4226896.jpeg?auto=compress&cs=tinysrgb&w=1600"
  },
  {
    name: "Smart Whiteboard",
    sku: "OFFC-WBD-008",
    description: "Digital whiteboard with real-time collaboration features. Captures and digitizes handwritten notes, connects to your devices via WiFi, and integrates with productivity apps. Includes wall mounting kit.",
    price: 899.99,
    stock_quantity: 4,
    status: "active",
    image_url: "https://images.pexels.com/photos/6177645/pexels-photo-6177645.jpeg?auto=compress&cs=tinysrgb&w=1600"
  },
  {
    name: "Commercial Paper Shredder",
    sku: "OFFC-SHD-009",
    description: "Heavy-duty cross-cut paper shredder for sensitive documents. Shreds up to 20 sheets at once, including credit cards and small staples. Features 30-minute continuous run time and 10-gallon pullout bin.",
    price: 249.99,
    stock_quantity: 8,
    status: "active",
    image_url: "https://images.pexels.com/photos/5816302/pexels-photo-5816302.jpeg?auto=compress&cs=tinysrgb&w=1600"
  },
  {
    name: "Wireless Presentation Remote",
    sku: "TECH-RMT-010",
    description: "Wireless presenter with laser pointer and slide navigation controls. 100ft range with USB receiver, compatible with all major presentation software. Includes carrying case and battery.",
    price: 39.99,
    stock_quantity: 30,
    status: "active",
    image_url: "https://images.pexels.com/photos/7262382/pexels-photo-7262382.jpeg?auto=compress&cs=tinysrgb&w=1600"
  }
];

export function ProductBulkUploader() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [addingProductIndex, setAddingProductIndex] = useState(-1)
  const [message, setMessage] = useState("")
  const [selectedProduct, setSelectedProduct] = useState(sampleProducts[0])
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [customProduct, setCustomProduct] = useState({
    name: "",
    sku: "",
    description: "",
    price: 0,
    stock_quantity: 0,
    status: "active" as "active" | "inactive" | "out_of_stock",
    image_url: ""
  })
  const { toast } = useToast()
  const { user } = useAuth()

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name')
        
        if (error) throw error
        
        setCategories(data || [])
      } catch (err: any) {
        console.error('Error fetching categories:', err.message)
        toast({
          title: 'Error',
          description: 'Failed to load categories.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCategories()
  }, [toast])

  // Add sample product to database
  const addSampleProduct = async () => {
    if (!selectedCategoryId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category.',
        variant: 'destructive',
      })
      return
    }

    setIsAdding(true)
    setMessage("")
    
    try {
      // Insert product with selected category
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: selectedProduct.name,
          sku: selectedProduct.sku,
          description: selectedProduct.description,
          category_id: parseInt(selectedCategoryId),
          price: selectedProduct.price,
          stock_quantity: selectedProduct.stock_quantity,
          status: selectedProduct.status,
          image_url: selectedProduct.image_url,
        }])
        .select()
      
      if (error) throw error
      
      setMessage(`Successfully added "${selectedProduct.name}" to database.`)
      toast({
        title: 'Product Added',
        description: `${selectedProduct.name} has been added successfully.`,
      })
    } catch (err: any) {
      console.error('Error adding product:', err.message)
      setMessage(`Error: ${err.message}`)
      toast({
        title: 'Error',
        description: `Failed to add product: ${err.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }

  // Add custom product to database
  const addCustomProduct = async () => {
    if (!selectedCategoryId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category.',
        variant: 'destructive',
      })
      return
    }

    if (!customProduct.name || !customProduct.sku || !customProduct.price || !customProduct.image_url) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields (name, SKU, price, image URL).',
        variant: 'destructive',
      })
      return
    }

    setIsAdding(true)
    setMessage("")
    
    try {
      // Insert custom product
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: customProduct.name,
          sku: customProduct.sku,
          description: customProduct.description,
          category_id: parseInt(selectedCategoryId),
          price: customProduct.price,
          stock_quantity: customProduct.stock_quantity,
          status: customProduct.status,
          image_url: customProduct.image_url,
        }])
        .select()
      
      if (error) throw error
      
      setMessage(`Successfully added "${customProduct.name}" to database.`)
      toast({
        title: 'Product Added',
        description: `${customProduct.name} has been added successfully.`,
      })
      
      // Reset custom product form
      setCustomProduct({
        name: "",
        sku: "",
        description: "",
        price: 0,
        stock_quantity: 0,
        status: "active",
        image_url: ""
      })
    } catch (err: any) {
      console.error('Error adding custom product:', err.message)
      setMessage(`Error: ${err.message}`)
      toast({
        title: 'Error',
        description: `Failed to add product: ${err.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }

  // Add all sample products (for quick population)
  const addAllSampleProducts = async () => {
    if (!selectedCategoryId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category.',
        variant: 'destructive',
      })
      return
    }

    setIsAdding(true)
    setMessage("")
    
    try {
      // Add products one by one
      for (let i = 0; i < sampleProducts.length; i++) {
        setAddingProductIndex(i)
        const product = sampleProducts[i]
        
        const { error } = await supabase
          .from('products')
          .insert([{
            name: product.name,
            sku: product.sku,
            description: product.description,
            category_id: parseInt(selectedCategoryId),
            price: product.price,
            stock_quantity: product.stock_quantity,
            status: product.status,
            image_url: product.image_url,
          }])
        
        if (error) throw error
        
        // Add a slight delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      setMessage(`Successfully added all ${sampleProducts.length} sample products.`)
      toast({
        title: 'Products Added',
        description: `Added ${sampleProducts.length} sample products successfully.`,
      })
    } catch (err: any) {
      console.error('Error adding all products:', err.message)
      setMessage(`Error at product ${addingProductIndex + 1}: ${err.message}`)
      toast({
        title: 'Error',
        description: `Failed to add all products: ${err.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
      setAddingProductIndex(-1)
    }
  }

  // Check if user is admin
  if (user && !user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bulk Product Uploader</h1>
        <p className="text-gray-600 mt-2">Add products with HD images quickly</p>
      </div>

      <Tabs defaultValue="sample">
        <TabsList className="mb-4">
          <TabsTrigger value="sample">Sample Products</TabsTrigger>
          <TabsTrigger value="custom">Custom Product</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sample">
          <Card>
            <CardHeader>
              <CardTitle>Add Sample Product</CardTitle>
              <CardDescription>Choose from pre-defined products with HD images</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="sampleProduct">Select Sample Product</Label>
                    <Select 
                      value={sampleProducts.indexOf(selectedProduct).toString()} 
                      onValueChange={(value) => setSelectedProduct(sampleProducts[parseInt(value)])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {sampleProducts.map((product, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Select Category</Label>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {selectedProduct && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                          {selectedProduct.image_url ? (
                            <img 
                              src={selectedProduct.image_url} 
                              alt={selectedProduct.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error("Image failed to load:", e);
                                e.currentTarget.src = "https://placehold.co/600x600/e2e8f0/94a3b8?text=Product+Image";
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Image className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <h3 className="text-xl font-medium">{selectedProduct.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">SKU: {selectedProduct.sku}</p>
                        <div className="mt-2 text-lg font-bold">${selectedProduct.price.toFixed(2)}</div>
                        <div className="mt-2 text-sm text-gray-600">{selectedProduct.description}</div>
                        <div className="mt-4 flex space-x-4 text-sm">
                          <div><span className="font-medium">Stock:</span> {selectedProduct.stock_quantity}</div>
                          <div><span className="font-medium">Status:</span> {selectedProduct.status}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {message && (
                  <div className={`p-4 rounded-lg ${message.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    {message.startsWith('Error') ? (
                      <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                    ) : (
                      <Check className="h-5 w-5 inline-block mr-2" />
                    )}
                    {message}
                  </div>
                )}
                
                <div className="flex justify-end space-x-4">
                  <Button 
                    onClick={addSampleProduct}
                    disabled={isAdding || !selectedCategoryId}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Add Custom Product</CardTitle>
              <CardDescription>Create a new product with your specifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="productName">Product Name*</Label>
                    <Input
                      id="productName"
                      value={customProduct.name}
                      onChange={(e) => setCustomProduct({ ...customProduct, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU*</Label>
                    <Input
                      id="sku"
                      value={customProduct.sku}
                      onChange={(e) => setCustomProduct({ ...customProduct, sku: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="price">Price ($)*</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={customProduct.price}
                      onChange={(e) => setCustomProduct({ ...customProduct, price: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category*</Label>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={customProduct.stock_quantity}
                      onChange={(e) => setCustomProduct({ ...customProduct, stock_quantity: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      id="status"
                      value={customProduct.status}
                      onValueChange={(value) => 
                        setCustomProduct({ 
                          ...customProduct, 
                          status: value as "active" | "inactive" | "out_of_stock" 
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="imageUrl">Image URL (HD Quality)*</Label>
                  <Input
                    id="imageUrl"
                    value={customProduct.image_url}
                    onChange={(e) => setCustomProduct({ ...customProduct, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter a URL to a high-resolution image (recommended size: 2000px width)
                  </p>
                </div>
                
                {customProduct.image_url && (
                  <div className="w-full max-w-md mx-auto">
                    <Label>Image Preview</Label>
                    <div className="mt-2 aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                      <img 
                        src={customProduct.image_url} 
                        alt="Product preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/600x600/e2e8f0/94a3b8?text=Invalid+Image+URL"
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={customProduct.description}
                    onChange={(e) => setCustomProduct({ ...customProduct, description: e.target.value })}
                    rows={4}
                  />
                </div>
                
                {message && (
                  <div className={`p-4 rounded-lg ${message.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    {message.startsWith('Error') ? (
                      <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                    ) : (
                      <Check className="h-5 w-5 inline-block mr-2" />
                    )}
                    {message}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    onClick={addCustomProduct}
                    disabled={isAdding || !selectedCategoryId}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Add Sample Products</CardTitle>
              <CardDescription>Add all sample products at once</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="bulkCategory">Select Target Category</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800">Sample Products Available</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    This will add {sampleProducts.length} business products with HD images to your selected category.
                  </p>
                  <ul className="mt-2 text-sm text-blue-700 grid grid-cols-1 md:grid-cols-2 gap-1">
                    {sampleProducts.map((product, index) => (
                      <li key={index} className={addingProductIndex === index ? "font-bold" : ""}>
                        {addingProductIndex === index && (
                          <Loader2 className="h-3 w-3 inline-block mr-1 animate-spin" />
                        )}
                        {product.name}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {message && (
                  <div className={`p-4 rounded-lg ${message.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    {message.startsWith('Error') ? (
                      <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                    ) : (
                      <Check className="h-5 w-5 inline-block mr-2" />
                    )}
                    {message}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    onClick={addAllSampleProducts}
                    disabled={isAdding || !selectedCategoryId}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding ({addingProductIndex + 1}/{sampleProducts.length})...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add All Sample Products
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
