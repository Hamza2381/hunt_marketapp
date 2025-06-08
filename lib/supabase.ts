import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface UserProfile {
  id: string
  name: string
  email: string
  account_type: "personal" | "business"
  company_name?: string
  credit_limit: number
  credit_used: number
  status: "active" | "suspended" | "inactive"
  is_admin: boolean
  phone?: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  created_at: string
  updated_at: string
  temporary_password?: boolean
  last_login?: string
}

export interface Product {
  id: number
  name: string
  sku: string
  description?: string
  category_id: number
  price: number
  stock_quantity: number
  status: "active" | "inactive" | "out_of_stock"
  image_url?: string
  is_featured?: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  description?: string
  status: "active" | "inactive"
  created_at: string
}

export interface Order {
  id: number
  order_number: string
  user_id: string
  total_amount: number
  payment_method: string
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  shipping_address?: string
  billing_address?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
  total_price: number
}

export interface ChatConversation {
  id: number
  user_id: string
  subject?: string
  status: "open" | "closed" | "pending"
  priority: "low" | "medium" | "high" | "urgent"
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: number
  conversation_id: number
  sender_id: string
  message: string
  is_admin: boolean
  created_at: string
}
