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
import { Plus, Edit, Trash2, FolderOpen, Loader2, AlertTriangle, Search } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Category } from "@/lib/supabase"

export function CategoryManagement() {
  const [categories, setCategories] = useState<(Category & { productCount: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<(Category & { productCount: number }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  })

  // Fetch categories and count products
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name')
        
        if (categoriesError) throw categoriesError
        
        // Get product counts for each category
        const categoriesWithCounts = await Promise.all(categoriesData.map(async (category) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
          
          return {
            ...category,
            productCount: count || 0
          }
        }))
        
        setCategories(categoriesWithCounts || [])
      } catch (err: any) {
        console.error('Error fetching categories:', err.message)
        setError('Failed to load categories. Please try again.')
        toast({
          title: 'Error',
          description: 'Failed to load categories data.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCategories()
  }, [])

  const filteredCategories = categories.filter((category) => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleAddCategory = async () => {
    try {
      // Validate form
      if (!categoryForm.name) {
        toast({
          title: 'Validation Error',
          description: 'Category name is required.',
          variant: 'destructive',
        })
        return
      }
      
      // Insert new category
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: categoryForm.name,
          description: categoryForm.description || null,
          status: categoryForm.status,
        }])
        .select()
      
      if (error) throw error
      
      // Refresh categories list
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (categoriesError) throw categoriesError
      
      // Add product count of 0 to new categories
      const categoriesWithCounts = categoriesData.map(category => ({
        ...category,
        productCount: categories.find(c => c.id === category.id)?.productCount || 0
      }))
      
      setCategories(categoriesWithCounts)
      setIsAddCategoryOpen(false)
      setCategoryForm({
        name: "",
        description: "",
        status: "active",
      })
      
      toast({
        title: 'Category Added',
        description: `${categoryForm.name} has been added successfully.`,
      })
    } catch (err: any) {
      console.error('Error adding category:', err.message)
      toast({
        title: 'Error',
        description: 'Failed to add category. ' + err.message,
        variant: 'destructive',
      })
    }
  }
  
  const handleEditCategory = (category: Category & { productCount: number }) => {
    setSelectedCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      status: category.status,
    })
    setIsEditCategoryOpen(true)
  }
  
  const handleUpdateCategory = async () => {
    if (!selectedCategory) return
    
    try {
      // Validate form
      if (!categoryForm.name) {
        toast({
          title: 'Validation Error',
          description: 'Category name is required.',
          variant: 'destructive',
        })
        return
      }
      
      // Update category
      const { error } = await supabase
        .from('categories')
        .update({
          name: categoryForm.name,
          description: categoryForm.description || null,
          status: categoryForm.status,
        })
        .eq('id', selectedCategory.id)
      
      if (error) throw error
      
      // Update local state
      setCategories(categories.map(category => 
        category.id === selectedCategory.id 
          ? { ...category, name: categoryForm.name, description: categoryForm.description, status: categoryForm.status }
          : category
      ))
      
      setIsEditCategoryOpen(false)
      setSelectedCategory(null)
      
      toast({
        title: 'Category Updated',
        description: `${categoryForm.name} has been updated successfully.`,
      })
    } catch (err: any) {
      console.error('Error updating category:', err.message)
      toast({
        title: 'Error',
        description: 'Failed to update category. ' + err.message,
        variant: 'destructive',
      })
    }
  }
  
  const handleDeleteCategory = async (category: Category & { productCount: number }) => {
    // Check if there are products in this category
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
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)
      
      if (error) throw error
      
      // Update local state
      setCategories(categories.filter(c => c.id !== category.id))
      
      toast({
        title: 'Category Deleted',
        description: `${category.name} has been deleted successfully.`,
      })
    } catch (err: any) {
      console.error('Error deleting category:', err.message)
      toast({
        title: 'Error',
        description: 'Failed to delete category. ' + err.message,
        variant: 'destructive',
      })
    }
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
              <Button>
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
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categoryDescription">Description</Label>
                  <Textarea
                    id="categoryDescription"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categoryStatus">Status</Label>
                  <Select
                    id="categoryStatus"
                    value={categoryForm.status}
                    onValueChange={(value) => setCategoryForm({ ...categoryForm, status: value as 'active' | 'inactive' })}
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
                <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
                <Button onClick={handleAddCategory}>Add Category</Button>
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
        </div>
        
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading categories...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-500 mt-2">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-8 text-center border rounded-md">
            <FolderOpen className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm ? "No categories found matching your search" : "No categories available"}
            </p>
            {searchTerm && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearchTerm("")}>Clear Search</Button>
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
                    <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{category.productCount} products</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.status === "active" ? "default" : "secondary"}>{category.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteCategory(category)}>
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editCategoryDescription">Description</Label>
              <Textarea
                id="editCategoryDescription"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editCategoryStatus">Status</Label>
              <Select
                id="editCategoryStatus"
                value={categoryForm.status}
                onValueChange={(value) => setCategoryForm({ ...categoryForm, status: value as 'active' | 'inactive' })}
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
            <Button variant="outline" onClick={() => setIsEditCategoryOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateCategory}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
