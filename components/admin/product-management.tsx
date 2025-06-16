"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Search, Package, Loader2, AlertTriangle, RefreshCw, Upload, Image as ImageIcon, Star } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import type { Product, Category } from "@/lib/supabase"
import { emitProductChange } from "@/lib/global-events"

import { AdminCache } from "@/lib/admin-cache"
import { 
  compressImageFast, 
  createInstantPreview, 
  validateImageFile, 
  generateUniqueFilename, 
  convertToWebP,
  fastUploadQueue,
  uploadWithRetry,
  cleanupImageResources,
  measureUploadPerformance
} from "@/lib/image-utils-fast"

const CACHE_KEY = 'admin-products'

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isEditProductOpen, setIsEditProductOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Simplified operation state - single source of truth
  const [operationState, setOperationState] = useState<'idle' | 'saving' | 'uploading' | 'deleting'>('idle')
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)
  const [storageChecked, setStorageChecked] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category_id: "",
    price: 0,
    stock_quantity: 0,
    description: "",
    status: "active",
    image_url: "",
    is_featured: false,
  })

  // Memoized form reset function
  const resetForm = useCallback(() => {
    setProductForm({
      name: "",
      sku: "",
      category_id: "",
      price: 0,
      stock_quantity: 0,
      description: "",
      status: "active",
      image_url: "",
      is_featured: false,
    })
    setOperationState('idle')
  }, [])

  // Lazy storage check - only when needed
  const ensureStorageReady = useCallback(async () => {
    if (storageChecked) return true
    
    try {
      // Quick check - just see if we can access the bucket
      await supabase.storage.from('products').list('', { limit: 1 })
      setStorageChecked(true)
      return true
    } catch (error) {
      console.warn('Storage not immediately available:', error)
      return false
    }
  }, [storageChecked])

  // Super-fast image upload with advanced optimizations
  const uploadImageToStorage = useCallback(async (file: File): Promise<string> => {
    return measureUploadPerformance(async () => {
      // Step 1: WebP conversion for better compression (if supported)
      const optimizedFile = await convertToWebP(file, 0.85)
      
      // Step 2: Fast compression with WebWorker
      const compressedFile = await compressImageFast(optimizedFile, 1200, 1200, 0.85)
      
      // Step 3: Generate unique filename
      const fileName = generateUniqueFilename(compressedFile.name)
      const filePath = `product-images/${fileName}`
      
      // Step 4: Upload with retry mechanism and queue management
      const uploadResult = await fastUploadQueue.add(`upload-${Date.now()}`, async () => {
        return uploadWithRetry(async () => {
          const { data, error } = await supabase.storage
            .from('products')
            .upload(filePath, compressedFile, {
              cacheControl: '31536000',
              upsert: false
            })
          
          if (error) {
            throw new Error(`Upload failed: ${error.message}`)
          }
          
          return data
        }, 3, 1000)
      })
      
      // Step 5: Get optimized public URL
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath)
      
      return `${publicUrl}?t=${Date.now()}&v=optimized`
    }, 'Complete Upload Process')
  }, [])

  // Lightning-fast image upload handler with instant preview
  const handleImageUpload = useCallback(async (file: File, isEdit: boolean = false) => {
    if (operationState !== 'idle') return

    // Step 1: Instant validation
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    try {
      setOperationState('uploading')
      
      // Step 2: Instant preview using createObjectURL (fastest method)
      const instantPreview = createInstantPreview(file)
      setProductForm(prev => {
        // Cleanup previous blob URL
        if (prev.image_url?.startsWith('blob:')) {
          URL.revokeObjectURL(prev.image_url)
        }
        return { ...prev, image_url: instantPreview }
      })
      
      // Step 3: Background optimization and upload (removed success toaster)
      setTimeout(async () => {
        try {
          // Ensure storage is ready
          const storageReady = await ensureStorageReady()
          if (!storageReady) {
            toast({
              title: 'Storage Unavailable', 
              description: 'Using preview image. Storage upload will retry later.',
              variant: 'destructive',
            })
            return
          }
          
          const storageUrl = await uploadImageToStorage(file)
          
          // Replace preview with optimized storage URL
          setProductForm(prev => {
            // Cleanup preview blob URL
            if (prev.image_url?.startsWith('blob:')) {
              URL.revokeObjectURL(prev.image_url)
            }
            return { ...prev, image_url: storageUrl }
          })
          
          // Removed the rocket toaster notification here
          
        } catch (uploadError) {
          console.error('Background upload failed:', uploadError)
          toast({
            title: 'Upload Warning',
            description: 'Preview ready. Background upload failed but will retry.',
            variant: 'destructive',
          })
        }
      }, 100) // Small delay to ensure UI updates
      
    } catch (error) {
      console.error('Image handling error:', error)
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to process image',
        variant: 'destructive',
      })
    } finally {
      setOperationState('idle')
    }
  }, [operationState, ensureStorageReady, uploadImageToStorage, toast])

  // File input handlers
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleImageUpload(file, false)
    }
  }, [handleImageUpload])

  const handleEditFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleImageUpload(file, true)
    }
  }, [handleImageUpload])

  // Optimized data refresh with caching (same pattern as users)
  const refreshData = useCallback(async (forceRefresh: boolean = false) => {
    // Check cache first unless force refresh
    if (!AdminCache.shouldRefresh<{products: Product[], categories: Category[]}>(CACHE_KEY, forceRefresh)) {
      const cached = AdminCache.get<{products: Product[], categories: Category[]}>(CACHE_KEY)
      if (cached.data) {
        setProducts(cached.data.products)
        setCategories(cached.data.categories)
        setIsLoading(false)
        return
      }
    }
    
    // Prevent multiple simultaneous requests
    if (AdminCache.get(CACHE_KEY).isLoading && !forceRefresh) {
      return
    }
    
    AdminCache.setLoading(CACHE_KEY, true)
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch both in parallel for speed
      const [productsResponse, categoriesResponse] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name')
      ])
      
      if (productsResponse.error) throw productsResponse.error
      if (categoriesResponse.error) throw categoriesResponse.error
      
      const productsData = productsResponse.data || []
      const categoriesData = categoriesResponse.data || []
      
      // Update cache and state
      AdminCache.set(CACHE_KEY, { products: productsData, categories: categoriesData })
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (err: any) {
      console.error('Error fetching data:', err.message)
      setError('Failed to load data. Please try again.')
      setProducts([])
      setCategories([])
      toast({
        title: 'Error',
        description: 'Failed to load products data.',
        variant: 'destructive',
      })
    } finally {
      AdminCache.setLoading(CACHE_KEY, false)
      setIsLoading(false)
    }
  }, [toast])

  // Initial data load
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Cleanup memory when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup any blob URLs to prevent memory leaks
      if (productForm.image_url?.startsWith('blob:')) {
        URL.revokeObjectURL(productForm.image_url)
      }
    }
  }, [])

  // Manual refresh with visual feedback
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refreshData(true)
    setIsRefreshing(false)
  }, [refreshData])
  
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Optimistic product addition using API
  const handleAddProduct = useCallback(async () => {
    if (operationState !== 'idle') return

    // Validation
    if (!productForm.name || !productForm.sku || !productForm.category_id || productForm.price <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields (name, SKU, category, price).',
        variant: 'destructive',
      })
      return
    }

    // Check for blob URL (preview) - allow saving with preview
    if (productForm.image_url && productForm.image_url.startsWith('blob:')) {
      console.log('Saving with preview image - background upload will continue')
    }

    setOperationState('saving')
    
    try {
      const categoryId = parseInt(productForm.category_id)
      if (isNaN(categoryId)) {
        throw new Error('Please select a valid category.')
      }

      // Create optimistic product for immediate UI update
      const optimisticProduct: Product = {
        id: -Math.abs(Date.now() % 1000000), // Negative ID to mark as temporary
        name: productForm.name,
        sku: productForm.sku,
        description: productForm.description || null,
        category_id: categoryId,
        price: productForm.price,
        stock_quantity: productForm.stock_quantity,
        status: productForm.stock_quantity > 0 ? productForm.status as any : 'out_of_stock',
        image_url: productForm.image_url || null,
        is_featured: productForm.is_featured,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Immediate UI update
      setProducts(prev => [optimisticProduct, ...prev])
      setIsAddProductOpen(false)
      const addedProductName = productForm.name
      resetForm()
      
      // Show immediate success
      toast({
        title: 'Product Added',
        description: `${addedProductName} has been added successfully.`,
      })

      // Background API call
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: optimisticProduct.name,
          sku: optimisticProduct.sku,
          description: optimisticProduct.description,
          category_id: optimisticProduct.category_id,
          price: optimisticProduct.price,
          stock_quantity: optimisticProduct.stock_quantity,
          status: optimisticProduct.status,
          image_url: optimisticProduct.image_url,
          is_featured: optimisticProduct.is_featured,
        })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to create product'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          if (errorData.details && Array.isArray(errorData.details)) {
            errorMessage += ': ' + errorData.details.join(', ')
          }
        } catch (jsonError) {
          console.warn('Could not parse error response as JSON:', jsonError)
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.warn('Could not parse success response as JSON:', jsonError)
        // If we can't parse the response but the status was OK, assume success
        console.log('Assuming success since HTTP status was OK')
        return // Exit successfully without trying to process the result
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create product')
      }

      // Replace optimistic product with real one
      setProducts(prev => prev.map(p => 
        p.id === optimisticProduct.id ? result.data : p
      ))
      
      // Emit global event for real-time updates
      emitProductChange('added', result.data)
      
      // Refresh admin stats after successful product addition
      if (typeof window !== 'undefined' && window.refreshAdminStats) {
        window.refreshAdminStats()
      }

    } catch (err: any) {
      console.error('Error adding product:', err.message)
      
      // Rollback optimistic update
      setProducts(prev => prev.filter(p => p.id !== optimisticProduct.id))
      
      toast({
        title: 'Error',
        description: 'Failed to add product. ' + err.message,
        variant: 'destructive',
      })
    } finally {
      setOperationState('idle')
    }
  }, [operationState, productForm, toast, resetForm])

  // Optimistic product update using API
  const handleUpdateProduct = useCallback(async () => {
    if (!selectedProduct || operationState !== 'idle') return

    // Validation
    if (!productForm.name || !productForm.sku || !productForm.category_id || productForm.price <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields (name, SKU, category, price).',
        variant: 'destructive',
      })
      return
    }

    // Check for blob URL (preview) - allow saving with preview
    if (productForm.image_url && productForm.image_url.startsWith('blob:')) {
      console.log('Updating with preview image - background upload will continue')
    }

    setOperationState('saving')

    try {
      const categoryId = parseInt(productForm.category_id)
      if (isNaN(categoryId)) {
        throw new Error('Please select a valid category.')
      }

      // Create updated product for optimistic update
      const updatedProduct: Product = {
        ...selectedProduct,
        name: productForm.name,
        sku: productForm.sku,
        description: productForm.description || null,
        category_id: categoryId,
        price: productForm.price,
        stock_quantity: productForm.stock_quantity,
        status: productForm.stock_quantity > 0 ? productForm.status as any : 'out_of_stock',
        image_url: productForm.image_url || null,
        is_featured: productForm.is_featured,
        updated_at: new Date().toISOString(),
      }

      // Immediate UI update
      setProducts(prev => prev.map(p => 
        p.id === selectedProduct.id ? updatedProduct : p
      ))
      
      const updatedProductName = productForm.name
      setIsEditProductOpen(false)
      setSelectedProduct(null)
      resetForm()

      // Show immediate success
      toast({
        title: 'Product Updated',
        description: `${updatedProductName} has been updated successfully.`,
      })

      // Background API call
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProduct.id,
          name: updatedProduct.name,
          sku: updatedProduct.sku,
          description: updatedProduct.description,
          category_id: updatedProduct.category_id,
          price: updatedProduct.price,
          stock_quantity: updatedProduct.stock_quantity,
          status: updatedProduct.status,
          image_url: updatedProduct.image_url,
          is_featured: updatedProduct.is_featured,
        })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to update product'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          if (errorData.details && Array.isArray(errorData.details)) {
            errorMessage += ': ' + errorData.details.join(', ')
          }
        } catch (jsonError) {
          console.warn('Could not parse error response as JSON:', jsonError)
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.warn('Could not parse success response as JSON:', jsonError)
        // If we can't parse the response but the status was OK, assume success
        console.log('Assuming success since HTTP status was OK')
        return // Exit successfully without trying to process the result
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update product')
      }

      // Emit global event for real-time updates
      // Check if category changed to handle count updates properly
      if (selectedProduct.category_id !== updatedProduct.category_id) {
        // Product moved to different category - emit delete for old category, add for new
        emitProductChange('deleted', selectedProduct) // Remove from old category
        emitProductChange('added', updatedProduct)    // Add to new category
      } else {
        // Same category - just update
        emitProductChange('updated', updatedProduct)
      }

    } catch (err: any) {
      console.error('Error updating product:', err.message)
      
      // Rollback optimistic update
      setProducts(prev => prev.map(p => 
        p.id === selectedProduct.id ? selectedProduct : p
      ))
      
      toast({
        title: 'Error',
        description: 'Failed to update product. ' + err.message,
        variant: 'destructive',
      })
    } finally {
      setOperationState('idle')
    }
  }, [selectedProduct, operationState, productForm, toast, resetForm])

  // Optimized product deletion using API
  const handleDeleteProduct = useCallback(async (product: Product) => {
    if (operationState !== 'idle') return
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) return

    // Check if this is a temporary product (created optimistically but not yet saved)
    const isTemporaryProduct = product.id < 0 || product.id > 2147483647 // PostgreSQL integer max
    
    if (isTemporaryProduct) {
      // Just remove from local state - it was never saved to database
      setProducts(prev => prev.filter(p => p.id !== product.id))
      toast({
        title: 'Product Removed',
        description: `${product.name} has been removed (was not yet saved).`,
      })
      return
    }

    setDeletingProductId(product.id)

    try {
      // Optimistic removal
      setProducts(prev => prev.filter(p => p.id !== product.id))
      
      toast({
        title: 'Product Deleted',
        description: `${product.name} has been deleted successfully.`,
      })

      // Background API call
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        let errorMessage = 'Failed to delete product'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          console.warn('Could not parse error response as JSON:', jsonError)
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.warn('Could not parse success response as JSON:', jsonError)
        // If we can't parse the response but the status was OK, assume success
        console.log('Assuming success since HTTP status was OK')
        return // Exit successfully without trying to process the result
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete product')
      }
      
      // Emit global event for real-time updates
      emitProductChange('deleted', product)
      
      // Refresh admin stats after successful product deletion
      if (typeof window !== 'undefined' && window.refreshAdminStats) {
        window.refreshAdminStats()
      }

    } catch (err: any) {
      console.error('Error deleting product:', err.message)
      
      // Rollback - add product back
      setProducts(prev => [...prev, product].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
      
      toast({
        title: 'Error',
        description: 'Failed to delete product. This may be because it has associated order items.',
        variant: 'destructive',
      })
    } finally {
      setDeletingProductId(null)
    }
  }, [operationState, toast])

  // Fast product editing
  const handleEditProduct = useCallback((product: Product) => {
    if (operationState !== 'idle') return

    // Check if this is a temporary product (not yet saved to database)
    const isTemporaryProduct = product.id < 0 || product.id > 2147483647
    
    if (isTemporaryProduct) {
      toast({
        title: 'Cannot Edit',
        description: 'This product has not been saved yet. Please wait for it to be created first.',
        variant: 'destructive',
      })
      return
    }

    setSelectedProduct(product)
    setProductForm({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id.toString(),
      price: product.price,
      stock_quantity: product.stock_quantity,
      description: product.description || '',
      status: product.status,
      image_url: product.image_url || '',
      is_featured: product.is_featured || false,
    })
    setIsEditProductOpen(true)
  }, [operationState, toast])

  // Filtered products for search
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getCategoryName(product.category_id) || '').toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Helper function to get category name by ID
  const getCategoryName = useCallback((categoryId: number) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  }, [categories])

  // Prevent operations when busy
  const isOperationInProgress = operationState !== 'idle'

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Product Management</CardTitle>
            <CardDescription>Manage your product catalog and inventory</CardDescription>
          </div>
          <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
            <DialogTrigger asChild>
              <Button disabled={isOperationInProgress}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Add a new product to your catalog</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="productName">Product Name*</Label>
                    <Input
                      id="productName"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      disabled={isOperationInProgress}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sku">SKU*</Label>
                    <Input
                      id="sku"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      disabled={isOperationInProgress}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category*</Label>
                    <Select
                      value={productForm.category_id || undefined}
                      onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
                      disabled={isOperationInProgress}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <SelectItem value="no-categories">
                            No categories available
                          </SelectItem>
                        ) : (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price ($)*</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: Number.parseFloat(e.target.value) || 0 })}
                      disabled={isOperationInProgress}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={productForm.stock_quantity}
                      onChange={(e) => setProductForm({ ...productForm, stock_quantity: Number.parseInt(e.target.value) || 0 })}
                      disabled={isOperationInProgress}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={productForm.status}
                      onValueChange={(value) => setProductForm({ ...productForm, status: value as "active" | "inactive" | "out_of_stock" })}
                      disabled={isOperationInProgress}
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
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="featured"
                      checked={productForm.is_featured}
                      onCheckedChange={(checked) => setProductForm({ ...productForm, is_featured: !!checked })}
                      disabled={isOperationInProgress}
                    />
                    <Label htmlFor="featured" className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>Mark as Featured Product</span>
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Featured products will be displayed prominently on the homepage</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="product-image">Product Image</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        id="product-image"
                        name="product-image"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full upload-button upload-transition"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isOperationInProgress}
                      >
                        {operationState === 'uploading' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        Instant preview + WebP optimization + fast compression
                      </p>
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border flex items-center justify-center preview-container image-container">
                      {productForm.image_url ? (
                        <img 
                          src={productForm.image_url} 
                          alt="Product preview" 
                          className="w-full h-full object-cover product-image-optimized state-transition"
                          loading="eager"
                          decoding="async"
                          onError={(e) => {
                            console.error('Image preview failed to load:', productForm.image_url);
                            e.currentTarget.src = "https://placehold.co/400x400/e2e8f0/94a3b8?text=Product+Image";
                          }}
                        />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-500 mt-1">No image</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={3}
                    disabled={isOperationInProgress}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddProduct} 
                  disabled={isOperationInProgress}
                >
                  {operationState === 'saving' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Product'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || isOperationInProgress} title="Refresh products">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading products...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-500 mt-2">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-8 text-center border rounded-md">
            <Package className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm ? "No products found matching your search" : "No products available"}
            </p>
            {searchTerm && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearchTerm("")}>Clear Search</Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="product-table-row">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded overflow-hidden w-12 h-12 image-container performance-optimized">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-full h-full object-cover rounded product-image-optimized" 
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              console.error('Product image failed to load:', product.image_url);
                              e.currentTarget.src = "https://placehold.co/100x100/e2e8f0/94a3b8?text=Product";
                            }}
                          />
                        ) : (
                          <Package className="h-6 w-6 m-auto text-gray-400" />
                        )}
                      </div>
                      <div className="font-medium">{product.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryName(product.category_id)}</Badge>
                  </TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={product.stock_quantity === 0 ? "text-red-600 font-medium" : ""}>
                      {product.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={product.status === "active" ? "default" : product.status === "inactive" ? "outline" : "destructive"}
                    >
                      {product.status === "active" ? "Active" : product.status === "inactive" ? "Inactive" : "Out of Stock"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {product.is_featured ? (
                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                          ⭐ Featured
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Not Featured
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditProduct(product)}
                        disabled={isOperationInProgress}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeleteProduct(product)}
                        disabled={isOperationInProgress || deletingProductId === product.id}
                      >
                        {deletingProductId === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-productName">Product Name*</Label>
                <Input
                  id="edit-productName"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  disabled={isOperationInProgress}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sku">SKU*</Label>
                <Input
                  id="edit-sku"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  disabled={isOperationInProgress}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category*</Label>
                <Select
                  value={productForm.category_id || undefined}
                  onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
                  disabled={isOperationInProgress}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Price ($)*</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: Number.parseFloat(e.target.value) || 0 })}
                  disabled={isOperationInProgress}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-stock">Stock Quantity</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={productForm.stock_quantity}
                  onChange={(e) => setProductForm({ ...productForm, stock_quantity: Number.parseInt(e.target.value) || 0 })}
                  disabled={isOperationInProgress}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={productForm.status}
                  onValueChange={(value) => setProductForm({ ...productForm, status: value as "active" | "inactive" | "out_of_stock" })}
                  disabled={isOperationInProgress}
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
            <div className="grid gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-featured"
                  checked={productForm.is_featured}
                  onCheckedChange={(checked) => setProductForm({ ...productForm, is_featured: !!checked })}
                  disabled={isOperationInProgress}
                />
                <Label htmlFor="edit-featured" className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Mark as Featured Product</span>
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">Featured products will be displayed prominently on the homepage</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-product-image">Product Image</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    ref={editFileInputRef}
                    onChange={handleEditFileChange}
                    className="hidden"
                    id="edit-product-image"
                    name="edit-product-image"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full upload-button upload-transition"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={isOperationInProgress}
                  >
                    {operationState === 'uploading' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {productForm.image_url ? 'Replace Image' : 'Upload'}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Instant preview + WebP optimization + fast compression
                  </p>
                </div>
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border flex items-center justify-center preview-container image-container">
                  {productForm.image_url ? (
                    <img 
                      src={productForm.image_url} 
                      alt="Product preview" 
                      className="w-full h-full object-cover product-image-optimized state-transition"
                      loading="eager"
                      decoding="async"
                      onError={(e) => {
                        console.error('Image preview failed to load:', productForm.image_url);
                        e.currentTarget.src = "https://placehold.co/400x400/e2e8f0/94a3b8?text=Product+Image";
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-1">No image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={3}
                disabled={isOperationInProgress}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateProduct} 
              disabled={isOperationInProgress}
            >
              {operationState === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}