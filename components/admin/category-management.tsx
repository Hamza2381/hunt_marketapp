"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Plus, Edit, Trash2, FolderOpen, Loader2, AlertTriangle, Search, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase-client"
import { AdminCache } from "@/lib/admin-cache"

interface Category {
  id: number
  name: string
  description?: string
  status: "active" | "inactive"
  created_at: string
  productCount: number
}

const CACHE_KEY = 'admin-categories'

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOperating, setIsOperating] = useState(false)
  const { toast } = useToast()
  
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  })

  // Optimized category fetching with caching (same pattern as users)
  const fetchCategories = useCallback(async (forceRefresh = false) => {
    // Check cache first unless force refresh
    if (!AdminCache.shouldRefresh<Category[]>(CACHE_KEY, forceRefresh)) {
      const cached = AdminCache.get<Category[]>(CACHE_KEY)
      if (cached.data) {
        setCategories(cached.data)
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
      console.log('Fetching categories...')
      
      // Fetch categories with product counts in parallel
      const [categoriesResponse, productsResponse] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('products').select('id, category_id')
      ])
      
      if (categoriesResponse.error) {
        throw new Error(categoriesResponse.error.message)
      }
      
      const categoriesData = categoriesResponse.data || []
      const productsData = productsResponse.data || []
      
      // Count products per category efficiently
      const productCounts = productsData.reduce((acc, product) => {
        acc[product.category_id] = (acc[product.category_id] || 0) + 1
        return acc
      }, {} as Record<number, number>)
      
      const categoriesWithCounts = categoriesData.map(category => ({
        ...category,
        productCount: productCounts[category.id] || 0
      }))
      
      console.log(`Loaded ${categoriesWithCounts.length} categories`)
      
      // Update cache and state
      AdminCache.set(CACHE_KEY, categoriesWithCounts)
      setCategories(categoriesWithCounts)
      
    } catch (err: any) {
      console.error('Error fetching categories:', err)
      setError(err.message || 'Failed to load categories')
      setCategories([])
      
      toast({
        title: 'Error Loading Categories',
        description: err.message || 'Failed to load categories. Please try again.',
        variant: 'destructive',
      })
    } finally {
      AdminCache.setLoading(CACHE_KEY, false)
      setIsLoading(false)
    }
  }, [toast])
  
  // Initial load
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await fetchCategories(true)
    setIsRefreshing(false)
  }, [fetchCategories])

  // Memoized filtered categories
  const filteredCategories = useMemo(() => 
    categories.filter((category) => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [categories, searchTerm]
  )

  const resetForm = useCallback(() => {
    setCategoryForm({
      name: "",
      description: "",
      status: "active",
    })
  }, [])

  const handleAddCategory = async () => {
    if (isOperating) return
    
    if (!categoryForm.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required.',
        variant: 'destructive',
      })
      return
    }
    
    try {
      setIsOperating(true)
      console.log("Adding new category:", categoryForm.name)
      
      // Create optimistic category for immediate UI update
      const optimisticCategory: Category = {
        id: Date.now(), // Temporary ID
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
        status: categoryForm.status,
        created_at: new Date().toISOString(),
        productCount: 0
      }
      
      // Immediate UI update
      setCategories(prev => [optimisticCategory, ...prev])
      setIsAddCategoryOpen(false)
      const addedCategoryName = categoryForm.name
      resetForm()
      
      // Show immediate success
      toast({
        title: 'Category Added',
        description: `${addedCategoryName} has been added successfully.`,
      })
      
      // Background database operation
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: optimisticCategory.name,
          description: optimisticCategory.description || null,
          status: optimisticCategory.status,
        }])
        .select()
        .single()
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Replace optimistic category with real one
      const realCategory = { ...data, productCount: 0 }
      setCategories(prev => prev.map(cat => 
        cat.id === optimisticCategory.id ? realCategory : cat
      ))
      
      // Update cache
      AdminCache.set(CACHE_KEY, categories.map(cat => 
        cat.id === optimisticCategory.id ? realCategory : cat
      ))
      
      // Refresh admin stats after successful category addition
      if (typeof window !== 'undefined' && window.refreshAdminStats) {
        window.refreshAdminStats()
      }
      
    } catch (err: any) {
      console.error('Error adding category:', err)
      
      // Rollback optimistic update
      setCategories(prev => prev.filter(cat => cat.id !== Date.now()))
      
      toast({
        title: 'Error',
        description: err.message || 'Failed to add category',
        variant: 'destructive',
      })
    } finally {
      setIsOperating(false)
    }
  }
  
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      status: category.status,
    })
    setIsEditCategoryOpen(true)
  }
  
  const handleUpdateCategory = async () => {
    if (!selectedCategory || isOperating) return
    
    if (!categoryForm.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required.',
        variant: 'destructive',
      })
      return
    }
    
    try {
      setIsOperating(true)
      console.log("Updating category:", selectedCategory.id)
      
      // Create updated category for optimistic update
      const updatedCategory: Category = {
        ...selectedCategory,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
        status: categoryForm.status,
      }
      
      // Immediate UI update
      setCategories(prev => prev.map(cat => 
        cat.id === selectedCategory.id ? updatedCategory : cat
      ))
      
      const updatedCategoryName = categoryForm.name
      setIsEditCategoryOpen(false)
      setSelectedCategory(null)
      resetForm()
      
      // Show immediate success
      toast({
        title: 'Category Updated',
        description: `${updatedCategoryName} has been updated successfully.`,
      })
      
      // Background database operation
      const { error } = await supabase
        .from('categories')
        .update({
          name: updatedCategory.name,
          description: updatedCategory.description || null,
          status: updatedCategory.status,
        })
        .eq('id', selectedCategory.id)
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Update cache
      AdminCache.set(CACHE_KEY, categories.map(cat => 
        cat.id === selectedCategory.id ? updatedCategory : cat
      ))
      
    } catch (err: any) {
      console.error('Error updating category:', err)
      
      // Rollback optimistic update
      setCategories(prev => prev.map(cat => 
        cat.id === selectedCategory.id ? selectedCategory : cat
      ))
      
      toast({
        title: 'Error',
        description: err.message || 'Failed to update category',
        variant: 'destructive',
      })
    } finally {
      setIsOperating(false)
    }
  }
  
  const handleDeleteCategory = async (category: Category) => {
    if (isOperating) return
    
    if (category.productCount > 0) {
      toast({
        title: 'Cannot Delete',
        description: `This category contains ${category.productCount} products. Please move or delete these products first.`,
        variant: 'destructive',
      })
      return
    }
    
    if (!confirm(`Are you sure you want to delete ${category.name}?`)) return
    
    try {
      setIsOperating(true)
      console.log("Deleting category:", category.id)
      
      // Optimistic removal
      setCategories(prev => prev.filter(cat => cat.id !== category.id))
      
      toast({
        title: 'Category Deleted',
        description: `${category.name} has been deleted successfully.`,
      })
      
      // Background database operation
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Update cache
      const updatedCategories = categories.filter(cat => cat.id !== category.id)
      AdminCache.set(CACHE_KEY, updatedCategories)
      
      // Refresh admin stats after successful category deletion
      if (typeof window !== 'undefined' && window.refreshAdminStats) {
        window.refreshAdminStats()
      }
      
    } catch (err: any) {
      console.error('Error deleting category:', err)
      
      // Rollback - add category back
      setCategories(prev => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
      
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete category',
        variant: 'destructive',
      })
    } finally {
      setIsOperating(false)
    }
  }

  if (isLoading && categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Management</CardTitle>
          <CardDescription>Organize your products into categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Loading categories...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Category Management</CardTitle>
            <CardDescription>Organize your products into categories</CardDescription>
          </div>
          <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button disabled={isOperating}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>Create a new product category</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoryName">Category Name*</Label>
                  <Input
                    id="categoryName"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Enter category name"
                    disabled={isOperating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categoryDescription">Description</Label>
                  <Textarea
                    id="categoryDescription"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Optional description"
                    rows={3}
                    disabled={isOperating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categoryStatus">Status</Label>
                  <Select
                    value={categoryForm.status}
                    onValueChange={(value) => setCategoryForm({ ...categoryForm, status: value as 'active' | 'inactive' })}
                    disabled={isOperating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsAddCategoryOpen(false)
                  resetForm()
                }} disabled={isOperating}>
                  Cancel
                </Button>
                <Button onClick={handleAddCategory} disabled={isOperating}>
                  {isOperating ? 'Adding...' : 'Add Category'}
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
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing || isOperating}
            title="Refresh categories"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {error ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-8 text-center border rounded-md">
            <FolderOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm ? "No categories found matching your search" : "No categories available"}
            </p>
            {searchTerm && (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded">
                        <FolderOpen className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="font-medium">{category.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {category.description || 'No description'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{category.productCount} products</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.status === "active" ? "default" : "secondary"}>
                      {category.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditCategory(category)}
                        disabled={isOperating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeleteCategory(category)}
                        disabled={category.productCount > 0 || isOperating}
                      >
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
      
      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editCategoryName">Category Name*</Label>
              <Input
                id="editCategoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                disabled={isOperating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editCategoryDescription">Description</Label>
              <Textarea
                id="editCategoryDescription"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                rows={3}
                disabled={isOperating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editCategoryStatus">Status</Label>
              <Select
                value={categoryForm.status}
                onValueChange={(value) => setCategoryForm({ ...categoryForm, status: value as 'active' | 'inactive' })}
                disabled={isOperating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedCategory && selectedCategory.productCount > 0 && (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline-block mr-1" />
                This category contains {selectedCategory.productCount} products. Changing the status to inactive will
                affect product visibility.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditCategoryOpen(false)
              setSelectedCategory(null)
              resetForm()
            }} disabled={isOperating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory} disabled={isOperating}>
              {isOperating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}