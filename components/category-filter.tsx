"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"

interface Category {
  id: number
  name: string
  description?: string
  status: string
}

interface CategoryFilterProps {
  selectedCategory: string
  onSelectCategory: (categoryId: string) => void
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('status', 'active')
          .order('name')
        
        if (error) throw error
        
        setCategories(data || [])
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCategories()
  }, [])
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }
  
  if (categories.length === 0) {
    return <p className="text-sm text-gray-500">No categories available</p>
  }
  
  return (
    <div className="space-y-2">
      <Button
        variant={selectedCategory === '' ? "default" : "ghost"}
        className="justify-start w-full text-left font-normal"
        onClick={() => onSelectCategory('')}
      >
        All Categories
        {selectedCategory === '' && <Badge className="ml-auto">Active</Badge>}
      </Button>
      
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id.toString() ? "default" : "ghost"}
          className="justify-start w-full text-left font-normal"
          onClick={() => onSelectCategory(category.id.toString())}
        >
          {category.name}
          {selectedCategory === category.id.toString() && <Badge className="ml-auto">Active</Badge>}
        </Button>
      ))}
    </div>
  )
}
