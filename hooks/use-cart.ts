"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface CartItem {
  id: number
  name: string
  sku: string
  price: number
  quantity: number
  image?: string
  inStock: boolean
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Load cart from localStorage
    try {
      const savedCart = localStorage.getItem("cart")
      if (savedCart) {
        setItems(JSON.parse(savedCart))
      }
    } catch (error) {
      console.error("Error loading cart from localStorage:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Save cart to localStorage whenever it changes
    if (!isLoading) {
      try {
        localStorage.setItem("cart", JSON.stringify(items))
      } catch (error) {
        console.error("Error saving cart to localStorage:", error)
      }
    }
  }, [items, isLoading])

  const addItem = (product: Omit<CartItem, "quantity">) => {
    if (!product.inStock) {
      toast({
        title: "Out of stock",
        description: "This item is currently out of stock.",
        variant: "destructive",
      })
      return
    }

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)
      if (existingItem) {
        toast({
          title: "Quantity updated",
          description: `${product.name} quantity increased in your cart.`,
        })
        return currentItems.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      })
      return [...currentItems, { ...product, quantity: 1 }]
    })
  }

  const removeItem = (id: number) => {
    setItems((currentItems) => {
      const itemToRemove = currentItems.find((item) => item.id === id)
      if (itemToRemove) {
        toast({
          title: "Removed from cart",
          description: `${itemToRemove.name} has been removed from your cart.`,
        })
      }
      return currentItems.filter((item) => item.id !== id)
    })
  }

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) {
      removeItem(id)
      return
    }

    setItems((currentItems) => {
      const updatedItems = currentItems.map((item) => (item.id === id ? { ...item, quantity } : item))

      const updatedItem = updatedItems.find((item) => item.id === id)
      if (updatedItem) {
        toast({
          title: "Quantity updated",
          description: `${updatedItem.name} quantity updated to ${quantity}.`,
        })
      }

      return updatedItems
    })
  }

  const clearCart = () => {
    setItems([])
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    })
  }

  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const getSubtotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
    getSubtotal,
    isLoading,
  }
}
