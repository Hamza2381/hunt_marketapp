"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import type { Product, Category } from "@/lib/supabase"

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading products:", error)
        return
      }

      setProducts(data || [])
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").eq("status", "active").order("name")

      if (error) {
        console.error("Error loading categories:", error)
        return
      }

      setCategories(data || [])
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  const searchProducts = async (query: string): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`name.ilike.%${query}%, description.ilike.%${query}%, sku.ilike.%${query}%`)
        .eq("status", "active")

      if (error) {
        console.error("Error searching products:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error searching products:", error)
      return []
    }
  }

  const getProductsByCategory = async (categoryId: number): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", categoryId)
        .eq("status", "active")

      if (error) {
        console.error("Error loading products by category:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error loading products by category:", error)
      return []
    }
  }

  const getProductById = async (id: number): Promise<Product | null> => {
    try {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single()

      if (error) {
        console.error("Error loading product:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error loading product:", error)
      return null
    }
  }

  const updateProduct = async (
    id: number,
    updates: Partial<Product>,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from("products").update(updates).eq("id", id)

      if (error) {
        return { success: false, error: error.message }
      }

      // Reload products
      await loadProducts()
      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  const createProduct = async (
    product: Omit<Product, "id" | "created_at" | "updated_at">,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from("products").insert([product])

      if (error) {
        return { success: false, error: error.message }
      }

      // Reload products
      await loadProducts()
      return { success: true }
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" }
    }
  }

  return {
    products,
    categories,
    isLoading,
    searchProducts,
    getProductsByCategory,
    getProductById,
    updateProduct,
    createProduct,
    refreshProducts: loadProducts,
  }
}
