"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
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

interface CartContextType {
  items: CartItem[]
  addItem: (product: Omit<CartItem, "quantity">) => void
  removeItem: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
  isLoading: boolean
}

// Create the context
const CartContext = createContext<CartContextType | undefined>(undefined)

// Create the provider component
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Load cart from localStorage on initial load
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart")
      if (savedCart) {
        // Parse the cart and ensure we have valid data
        const parsedCart = JSON.parse(savedCart)
        // If the parsed cart is an array, use it, otherwise initialize with an empty array
        if (Array.isArray(parsedCart)) {
          if (parsedCart.length > 0) {
            console.log('Loading', parsedCart.length, 'items from localStorage')
            setItems(parsedCart)
          }
        } else {
          console.warn("Invalid cart data in localStorage, resetting")
          localStorage.removeItem("cart")
          setItems([])
        }
      } else {
        // No cart in localStorage, ensure we start with an empty array
        setItems([])
      }
    } catch (error) {
      console.error("Error loading cart from localStorage:", error)
      // Reset localStorage and state in case of error
      localStorage.removeItem("cart")
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        console.log('Saving cart to localStorage:', items.length, 'items')
        localStorage.setItem("cart", JSON.stringify(items))
      } catch (error) {
        console.error("Error saving cart to localStorage:", error)
      }
    }
  }, [items, isLoading])

  const addItem = useCallback((product: Omit<CartItem, "quantity">) => {
    if (!product.inStock) {
      // Defer toast to after render
      setTimeout(() => {
        toast({
          title: "Out of stock",
          description: "This item is currently out of stock.",
          variant: "destructive",
        })
      }, 0)
      return
    }

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)
      if (existingItem) {
        // Defer toast to after render
        setTimeout(() => {
          toast({
            title: "Quantity updated",
            description: `${product.name} quantity increased in your cart.`,
          })
        }, 0)
        return currentItems.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }

      // Defer toast to after render
      setTimeout(() => {
        toast({
          title: "Added to cart",
          description: `${product.name} has been added to your cart.`,
        })
      }, 0)
      return [...currentItems, { ...product, quantity: 1 }]
    })
  }, [toast])

  const removeItem = useCallback((id: number) => {
    setItems((currentItems) => {
      const itemToRemove = currentItems.find((item) => item.id === id)
      if (itemToRemove) {
        // Defer toast to after render
        setTimeout(() => {
          toast({
            title: "Removed from cart",
            description: `${itemToRemove.name} has been removed from your cart.`,
          })
        }, 0)
      }
      return currentItems.filter((item) => item.id !== id)
    })
  }, [toast])

  const updateQuantity = useCallback((id: number, quantity: number) => {
    if (quantity < 1) {
      removeItem(id)
      return
    }

    setItems((currentItems) => {
      const updatedItems = currentItems.map((item) => (item.id === id ? { ...item, quantity } : item))

      const updatedItem = updatedItems.find((item) => item.id === id)
      if (updatedItem) {
        // Defer toast to after render
        setTimeout(() => {
          toast({
            title: "Quantity updated",
            description: `${updatedItem.name} quantity updated to ${quantity}.`,
          })
        }, 0)
      }

      return updatedItems
    })
  }, [removeItem, toast])

  const clearCart = useCallback(() => {
    setItems([])
    // Defer toast to after render
    setTimeout(() => {
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart.",
      })
    }, 0)
  }, [toast])

  // Use a callback to ensure consistent reference
  const getItemCount = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }, [items])

  const getSubtotal = useCallback(() => {
    return items.reduce((total, item) => total + Number(item.price) * item.quantity, 0)
  }, [items])

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
    getSubtotal,
    isLoading,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// Custom hook to use the cart context
export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
