"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: number
  name: string
  sku: string
  price: number
  image_url: string
  stock_quantity: number
  status: string
}

interface Category {
  id: number
  name: string
  status: string
}

interface Deal {
  id: number
  title: string
  description: string
  deal_type: string
  discount_type: string
  discount_value: number
  min_purchase_amount: number
  max_discount_amount?: number
  start_date: string
  end_date: string
  usage_limit?: number
  status: string
  is_featured: boolean
  banner_text?: string
  deal_products?: Array<{
    product_id: number
    products: Product
  }>
  deal_categories?: Array<{
    category_id: number
    categories: Category
  }>
}

interface DealFormProps {
  deal?: Deal | null
  onClose: () => void
  onSuccess: () => void
}

export function DealForm({ deal, onClose, onSuccess }: DealFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    title: deal?.title || "",
    description: deal?.description || "",
    deal_type: deal?.deal_type || "flash",
    discount_type: deal?.discount_type || "percentage",
    discount_value: deal?.discount_value?.toString() || "",
    min_purchase_amount: deal?.min_purchase_amount?.toString() || "0",
    max_discount_amount: deal?.max_discount_amount?.toString() || "",
    start_date: deal?.start_date ? new Date(deal.start_date).toISOString().slice(0, 16) : "",
    end_date: deal?.end_date ? new Date(deal.end_date).toISOString().slice(0, 16) : "",
    usage_limit: deal?.usage_limit?.toString() || "",
    is_featured: deal?.is_featured || false,
    banner_text: deal?.banner_text || "",
    status: deal?.status || "active"
  })

  // Fetch products and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const productsResponse = await fetch('/api/products', {
          credentials: 'include'
        })
        if (productsResponse.ok) {
          const productsResult = await productsResponse.json()
          if (productsResult.success) {
            setProducts(productsResult.data)
          }
        }

        // Fetch categories
        const categoriesResponse = await fetch('/api/categories', {
          credentials: 'include'
        })
        if (categoriesResponse.ok) {
          const categoriesResult = await categoriesResponse.json()
          if (categoriesResult.success) {
            setCategories(categoriesResult.data)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  // Set initial selected products/categories when editing
  useEffect(() => {
    if (deal) {
      setSelectedProducts(deal.deal_products?.map(dp => dp.product_id) || [])
      setSelectedCategories(deal.deal_categories?.map(dc => dc.category_id) || [])
    }
  }, [deal])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleProductToggle = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validation
      if (!formData.title || !formData.deal_type || !formData.discount_type || 
          !formData.discount_value || !formData.start_date || !formData.end_date) {
        throw new Error('Please fill in all required fields')
      }

      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        throw new Error('End date must be after start date')
      }

      if (selectedProducts.length === 0 && selectedCategories.length === 0) {
        throw new Error('Please select at least one product or category')
      }

      const payload = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        min_purchase_amount: parseFloat(formData.min_purchase_amount),
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        product_ids: selectedProducts,
        category_ids: selectedCategories
      }

      const url = deal ? `/api/admin/deals/${deal.id}` : '/api/admin/deals'
      const method = deal ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Failed to ${deal ? 'update' : 'create'} deal: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || `Failed to ${deal ? 'update' : 'create'} deal`)
      }

      toast({
        title: `Deal ${deal ? 'updated' : 'created'}`,
        description: `The deal has been successfully ${deal ? 'updated' : 'created'}.`,
      })

      // REAL-TIME: Broadcast change to refresh frontend immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dealsChanged'))
      }

      onSuccess()

    } catch (error: any) {
      console.error('Error saving deal:', error)
      toast({
        title: "Error",
        description: error.message || `Failed to ${deal ? 'update' : 'create'} deal`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deals
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {deal ? 'Edit Deal' : 'Create New Deal'}
          </h2>
          <p className="text-muted-foreground">
            {deal ? 'Update deal settings and products' : 'Set up a new promotional deal'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Flash Sale - 50% Off Office Supplies"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your deal..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="banner_text">Banner Text (Optional)</Label>
                <Input
                  id="banner_text"
                  value={formData.banner_text}
                  onChange={(e) => handleInputChange('banner_text', e.target.value)}
                  placeholder="e.g., Limited Time Offer!"
                />
              </div>

              <div>
                <Label htmlFor="deal_type">Deal Type *</Label>
                <Select value={formData.deal_type} onValueChange={(value) => handleInputChange('deal_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flash">Flash Deal</SelectItem>
                    <SelectItem value="daily">Daily Deal</SelectItem>
                    <SelectItem value="weekly">Weekly Special</SelectItem>
                    <SelectItem value="clearance">Clearance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleInputChange('is_featured', !!checked)}
                />
                <Label htmlFor="is_featured">Featured Deal (Show on homepage)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Discount Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Discount Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="discount_type">Discount Type *</Label>
                <Select value={formData.discount_type} onValueChange={(value) => handleInputChange('discount_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discount_value">Discount Value *</Label>
                <Input
                  id="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_value}
                  onChange={(e) => handleInputChange('discount_value', e.target.value)}
                  placeholder={formData.discount_type === 'percentage' ? "e.g., 25" : "e.g., 10.00"}
                  required
                />
              </div>

              <div>
                <Label htmlFor="min_purchase_amount">Minimum Purchase Amount</Label>
                <Input
                  id="min_purchase_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_purchase_amount}
                  onChange={(e) => handleInputChange('min_purchase_amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {formData.discount_type === 'percentage' && (
                <div>
                  <Label htmlFor="max_discount_amount">Maximum Discount Amount (Optional)</Label>
                  <Input
                    id="max_discount_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.max_discount_amount}
                    onChange={(e) => handleInputChange('max_discount_amount', e.target.value)}
                    placeholder="e.g., 100.00"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="usage_limit">Usage Limit (Optional)</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => handleInputChange('usage_limit', e.target.value)}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="start_date">Start Date & Time *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date & Time *</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Products & Categories</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select products or categories to include in this deal
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div>
              <Label htmlFor="search">Search Products</Label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name or SKU..."
              />
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <Label>Categories (Apply deal to all products in category)</Label>
                <div className="grid gap-2 mt-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => handleCategoryToggle(category.id)}
                      />
                      <Label htmlFor={`category-${category.id}`} className="flex-1">
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products */}
            <div>
              <Label>Products</Label>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto mt-2">
                {filteredProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No products found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => handleProductToggle(product.id)}
                        />
                        <img
                          src={product.image_url || '/placeholder.svg'}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div className="flex-1">
                          <Label htmlFor={`product-${product.id}`} className="cursor-pointer">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              SKU: {product.sku} • ${product.price} • Stock: {product.stock_quantity}
                            </div>
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected items summary */}
            {(selectedProducts.length > 0 || selectedCategories.length > 0) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Selected Items:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(categoryId => {
                    const category = categories.find(c => c.id === categoryId)
                    return category ? (
                      <Badge key={`cat-${categoryId}`} variant="secondary">
                        Category: {category.name}
                      </Badge>
                    ) : null
                  })}
                  {selectedProducts.map(productId => {
                    const product = products.find(p => p.id === productId)
                    return product ? (
                      <Badge key={`prod-${productId}`} variant="outline">
                        {product.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {deal ? 'Update Deal' : 'Create Deal'}
          </Button>
        </div>
      </form>
    </div>
  )
}
