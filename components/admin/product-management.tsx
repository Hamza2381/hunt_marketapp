"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Edit, Trash2, Search, Package, Loader2, AlertTriangle, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import type { Product, Category } from "@/lib/supabase"

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isEditProductOpen, setIsEditProductOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
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
  })

  // Function to refresh products and categories
  const refreshData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (productsError) throw productsError
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (categoriesError) throw categoriesError
      
      setProducts(productsData || [])
      setCategories(categoriesData || [])
    } catch (err: any) {
      console.error('Error fetching products data:', err.message)
      setError('Failed to load products. Please try again.')
      toast({
        title: 'Error',
        description: 'Failed to load products data.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch products and categories on component mount
  useEffect(() => {
    refreshData()
  }, [])

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getCategoryName(product.category_id) || '').toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Helper function to get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'Unknown'
  }

  const handleAddProduct = async () => {
    try {
      // Validate form
      if (!productForm.name || !productForm.sku || !productForm.category_id || productForm.price <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill all required fields (name, SKU, category, price).',
          variant: 'destructive',
        })
        return
      }
      
      console.log("Adding new product:", productForm.name);
      
      // Insert new product
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: productForm.name,
          sku: productForm.sku,
          description: productForm.description || null,
          category_id: parseInt(productForm.category_id),
          price: productForm.price,
          stock_quantity: productForm.stock_quantity,
          status: productForm.stock_quantity > 0 ? productForm.status : 'out_of_stock',
          image_url: productForm.image_url || null,
        }])
        .select()
      
      if (error) {
        console.error("Error inserting product:", error);
        throw error;
      }
      
      console.log("Product added successfully, refreshing products list");
      // Refresh product list
      await refreshData()
      setIsAddProductOpen(false)
      setProductForm({
        name: "",
        sku: "",
        category_id: "",
        price: 0,
        stock_quantity: 0,
        description: "",
        status: "active",
        image_url: "",
      })
      
      toast({
        title: 'Product Added',
        description: `${productForm.name} has been added successfully.`,
      })
    } catch (err: any) {
      console.error('Error adding product:', err.message)
      toast({
        title: 'Error',
        description: 'Failed to add product. ' + err.message,
        variant: 'destructive',
      })
    }
  }
  
  const handleEditProduct = (product: Product) => {
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
    })
    setIsEditProductOpen(true)
  }
  
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return
    
    try {
      // Validate form
      if (!productForm.name || !productForm.sku || !productForm.category_id || productForm.price <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill all required fields (name, SKU, category, price).',
          variant: 'destructive',
        })
        return
      }
      
      console.log("Updating product:", selectedProduct.id, productForm.name);
      
      // Update product
      const { error } = await supabase
        .from('products')
        .update({
          name: productForm.name,
          sku: productForm.sku,
          description: productForm.description || null,
          category_id: parseInt(productForm.category_id),
          price: productForm.price,
          stock_quantity: productForm.stock_quantity,
          status: productForm.stock_quantity > 0 ? productForm.status : 'out_of_stock',
          image_url: productForm.image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedProduct.id)
      
      if (error) {
        console.error("Error updating product:", error);
        throw error;
      }
      
      console.log("Product updated successfully, refreshing products list");
      // Refresh data
      await refreshData()
      setIsEditProductOpen(false)
      setSelectedProduct(null)
      
      toast({
        title: 'Product Updated',
        description: `${productForm.name} has been updated successfully.`,
      })
    } catch (err: any) {
      console.error('Error updating product:', err.message)
      toast({
        title: 'Error',
        description: 'Failed to update product. ' + err.message,
        variant: 'destructive',
      })
    }
  }
  
  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) return
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
      
      if (error) throw error
      
      // Refresh products list
      await refreshData()
      
      toast({
        title: 'Product Deleted',
        description: `${product.name} has been deleted successfully.`,
      })
    } catch (err: any) {
      console.error('Error deleting product:', err.message)
      toast({
        title: 'Error',
        description: 'Failed to delete product. This may be because it has associated order items.',
        variant: 'destructive',
      })
    }
  }

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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sku">SKU*</Label>
                    <Input
                      id="sku"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category*</Label>
                    <Select
                      value={productForm.category_id}
                      onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <SelectItem value="" disabled>
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
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={productForm.status}
                      onValueChange={(value) => setProductForm({ ...productForm, status: value as "active" | "inactive" | "out_of_stock" })}
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
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={productForm.image_url}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddProduct}>Add Product</Button>
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
          <Button variant="outline" onClick={refreshData} title="Refresh products">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
            <Button variant="outline" size="sm" className="mt-4" onClick={refreshData}>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded">
                        {product.image_url ? (
                          <div className="w-8 h-8 relative rounded overflow-hidden">
                            <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                          </div>
                        ) : (
                          <Package className="h-4 w-4" />
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
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteProduct(product)}>
                        <Trash2 className="h-4 w-4" />
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
        <DialogContent className="max-w-2xl">
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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sku">SKU*</Label>
                <Input
                  id="edit-sku"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category*</Label>
                <Select
                  value={productForm.category_id}
                  onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={productForm.status}
                  onValueChange={(value) => setProductForm({ ...productForm, status: value as "active" | "inactive" | "out_of_stock" })}
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
              <Label htmlFor="edit-image_url">Image URL</Label>
              <Input
                id="edit-image_url"
                value={productForm.image_url}
                onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProduct}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
