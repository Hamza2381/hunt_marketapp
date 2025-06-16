import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Enhanced caching for categories with product counts
let categoriesCache: any[] | null = null
let cacheExpiry = 0
const CACHE_TTL = 3 * 60 * 1000 // 3 minutes

// Function to clear cache (useful for real-time updates)
export function clearCategoriesCache() {
  categoriesCache = null
  cacheExpiry = 0
}

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Categories API called')
    }
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 })
    }
    
    // Disable server-side caching in production to prevent stale data
    // Always fetch fresh data from database
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Optimized single query to get categories with product counts
    const { data: categoriesData, error } = await supabase
      .rpc('get_categories_with_product_counts')
    
    // If the RPC function doesn't exist, fall back to manual approach
    if (error && error.message.includes('function')) {
      return await getCategoriesManually(supabase)
    } else if (error) {
      console.error('RPC error:', error)
      return await getCategoriesManually(supabase)
    }
    
    // Store in memory but don't rely on it for serving
    categoriesCache = categoriesData || []
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Fetched ${categoriesCache.length} categories with counts`)
    }
    
    return NextResponse.json({
      success: true,
      data: categoriesCache,
      count: categoriesCache.length
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error: any) {
    console.error('Unexpected API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${error.message}`
    }, { status: 500 })
  }
}

// Fallback manual method with optimized queries
async function getCategoriesManually(supabase: any) {
  try {
    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, description')
      .order('name')
    
    if (categoriesError) {
      console.error('Categories error:', categoriesError)
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${categoriesError.message}`
      }, { status: 500 })
    }
    
    if (!categories || categories.length === 0) {
      const defaultCategories = [
        { id: 1, name: 'Office Supplies', description: 'Essential office supplies', productCount: 0 },
        { id: 2, name: 'Technology', description: 'Computer accessories and electronics', productCount: 0 },
        { id: 3, name: 'Stationery', description: 'Pens, paper, and writing materials', productCount: 0 },
        { id: 4, name: 'Storage', description: 'Filing cabinets and storage solutions', productCount: 0 },
        { id: 5, name: 'Furniture', description: 'Office furniture and seating', productCount: 0 }
      ]
      
      return NextResponse.json({
        success: true,
        data: defaultCategories,
        count: defaultCategories.length,
        note: 'Using default categories - database appears to be empty'
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // Get all product counts in a single optimized query
    const { data: productCounts, error: countsError } = await supabase
      .from('products')
      .select('category_id')
      .eq('status', 'active')
    
    if (countsError) {
      console.error('Product counts error:', countsError)
      // Continue without counts rather than failing
    }
    
    // Create count map for O(1) lookup
    const countMap = new Map<number, number>()
    if (productCounts) {
      productCounts.forEach((product: any) => {
        const count = countMap.get(product.category_id) || 0
        countMap.set(product.category_id, count + 1)
      })
    }
    
    // Combine categories with their counts
    const categoriesWithCounts = categories.map(category => ({
      ...category,
      productCount: countMap.get(category.id) || 0
    }))
    
    // Store in memory but don't rely on it for serving
    categoriesCache = categoriesWithCounts
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Fetched ${categoriesWithCounts.length} categories manually`)
    }
    
    return NextResponse.json({
      success: true,
      data: categoriesWithCounts,
      count: categoriesWithCounts.length
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error: any) {
    console.error('Manual fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${error.message}`
    }, { status: 500 })
  }
}