import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSlug } from '@/lib/category-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// NO SERVER-SIDE CACHING - Follow products API pattern

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    // Await params in Next.js 15+
    const { slug } = await params
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Category slug:', slug)
    }
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error' 
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // NO CACHING - Always fetch fresh categories from database
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, description')
    
    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json({ 
        success: false, 
        error: categoriesError.message 
      }, { status: 500 })
    }
    
    // Find the category by slug
    const category = categories?.find(cat => createSlug(cat.name) === slug)
    
    if (!category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Category not found',
        availableCategories: categories?.map(cat => ({ 
          name: cat.name, 
          slug: createSlug(cat.name)
        })) || []
      }, { status: 404 })
    }
    
    // Optimized query: Get products with minimal joins and faster indexing
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, sku, description, price, stock_quantity, status, image_url, is_featured, created_at')
      .eq('category_id', category.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({ 
        success: false, 
        error: productsError.message 
      }, { status: 500 })
    }
    
    // Fast transformation with pre-generated random values
    const transformedProducts = products?.map((product, index) => ({
      ...product,
      category_name: category.name,
      // Pre-computed demo values for better performance
      rating: (3 + ((product.id + index) % 20) / 10).toFixed(1),
      reviews: 10 + ((product.id + index) % 290),
    })) || []
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Found ${transformedProducts.length} products for category: ${category.name}`)
    }
    
    return NextResponse.json({
      success: true,
      category: {
        ...category,
        slug: slug,
        productCount: transformedProducts.length
      },
      products: transformedProducts,
      count: transformedProducts.length
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
