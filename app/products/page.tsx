"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProductGrid } from "@/components/product-grid"
import { CategoryFilter } from "@/components/category-filter"
import { Search, SlidersHorizontal, X } from "lucide-react"

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const initialCategory = searchParams.get('category') || ''
  
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [categoryFilter, setCategoryFilter] = useState(initialCategory)
  const [sortOrder, setSortOrder] = useState("newest")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setSortOrder('newest')
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-green-600">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Products</span>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Products</h1>
        <p className="text-gray-600">Browse our complete catalog of products</p>
      </div>
      
      {/* Search and Filter Section */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            className="lg:hidden"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filter Sidebar - Desktop */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <h3 className="font-medium text-lg mb-4">Categories</h3>
            <CategoryFilter 
              selectedCategory={categoryFilter} 
              onSelectCategory={setCategoryFilter} 
            />
            
            <div className="mt-8">
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                <X className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </div>
        </div>
        
        {/* Filter Sidebar - Mobile */}
        {isFilterOpen && (
          <div className="lg:hidden fixed inset-0 bg-white z-50 p-4 overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Filters</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsFilterOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <h3 className="font-medium text-lg mb-4">Categories</h3>
            <CategoryFilter 
              selectedCategory={categoryFilter} 
              onSelectCategory={(cat) => {
                setCategoryFilter(cat)
                setIsFilterOpen(false)
              }} 
            />
            
            <div className="mt-8 flex gap-2">
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Reset Filters
              </Button>
              <Button onClick={() => setIsFilterOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}
        
        {/* Products Grid */}
        <div className="flex-1">
          <ProductGrid 
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            sortOrder={sortOrder}
          />
        </div>
      </div>
    </div>
  )
}
