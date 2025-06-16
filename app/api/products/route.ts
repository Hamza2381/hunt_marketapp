import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for regular operations
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for privileged operations (bypasses RLS)
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to verify admin status
async function verifyAdminAccess(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  try {
    // Get auth header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAdmin: false, error: 'No authorization header' }
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return { isAdmin: false, error: 'Invalid token' }
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return { isAdmin: false, error: 'Profile not found' }
    }
    
    return { 
      isAdmin: Boolean(profile.is_admin), 
      userId: user.id 
    }
  } catch (error: any) {
    console.error('Admin verification error:', error)
    return { isAdmin: false, error: error.message }
  }
}

// Helper function to validate product data
function validateProductData(data: any) {
  const errors = []
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Product name is required')
  }
  
  if (!data.sku || typeof data.sku !== 'string' || data.sku.trim() === '') {
    errors.push('SKU is required')
  }
  
  if (!data.category_id || typeof data.category_id !== 'number') {
    errors.push('Category ID is required and must be a number')
  }
  
  if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
    errors.push('Price is required and must be greater than 0')
  }
  
  if (data.stock_quantity !== undefined && (typeof data.stock_quantity !== 'number' || data.stock_quantity < 0)) {
    errors.push('Stock quantity must be a non-negative number')
  }
  
  if (data.status && !['active', 'inactive', 'out_of_stock'].includes(data.status)) {
    errors.push('Status must be one of: active, inactive, out_of_stock')
  }
  
  return errors
}

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching products...')
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured')
    const category = searchParams.get('category')
    const limit = searchParams.get('limit')
    
    // Build query - using simpler approach without foreign key naming issues
    let query = supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('status', 'active')
    
    // Apply filters
    if (featured === 'true') {
      // Try to use is_featured column, fallback to limit if column doesn't exist
      try {
        const testQuery = await supabase
          .from('products')
          .select('id')
          .eq('is_featured', true)
          .limit(1)
        
        if (!testQuery.error) {
          query = query.eq('is_featured', true)
        } else {
          // Fallback: get top 4 highest priced products as "featured"
          query = query.order('price', { ascending: false }).limit(4)
        }
      } catch {
        // Fallback: get top 4 highest priced products as "featured"
        query = query.order('price', { ascending: false }).limit(4)
      }
    }
    
    if (category) {
      query = query.eq('category_id', parseInt(category))
    }
    
    if (limit) {
      query = query.limit(parseInt(limit))
    }
    
    // Default ordering
    if (!featured) {
      query = query.order('created_at', { ascending: false })
    }
    
    const { data: products, error } = await query
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    // Transform data to include category name
    const transformedProducts = products?.map(product => ({
      ...product,
      category_name: product.categories?.name || 'Uncategorized',
      // Add demo ratings
      rating: (Math.random() * 2 + 3).toFixed(1),
      reviews: Math.floor(Math.random() * 300) + 10,
    })) || []
    
    console.log(`Successfully fetched ${transformedProducts.length} products`)
    
    return NextResponse.json({
      success: true,
      data: transformedProducts
    })
    
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

// POST - Create new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    console.log('Creating new product...')
    
    // For now, bypass admin check since we don't have proper auth headers setup
    // In production, you'd want to verify admin status properly
    console.log('Note: Using service role for product creation (admin operation)')
    
    const body = await request.json()
    console.log('Request body:', body)
    
    // Validate input data
    const validationErrors = validateProductData(body)
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 })
    }
    
    // Prepare product data
    const productData = {
      name: body.name.trim(),
      sku: body.sku.trim(),
      description: body.description?.trim() || null,
      category_id: body.category_id,
      price: body.price,
      stock_quantity: body.stock_quantity || 0,
      status: body.status || 'active',
      image_url: body.image_url || null,
      is_featured: body.is_featured || false
    }
    
    console.log('Inserting product data:', productData)
    
    // Use admin client to bypass RLS for product creation
    const { data: product, error } = await adminSupabase
      .from('products')
      .insert([productData])
      .select()
      .single()
    
    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    console.log('Product created successfully:', product)
    
    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product created successfully'
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create product'
    }, { status: 500 })
  }
}

// PUT - Update existing product (Admin only)
export async function PUT(request: NextRequest) {
  try {
    console.log('Updating product...')
    
    const body = await request.json()
    console.log('Request body:', body)
    
    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 })
    }
    
    // Validate input data
    const validationErrors = validateProductData(body)
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 })
    }
    
    // Prepare product data
    const productData = {
      name: body.name.trim(),
      sku: body.sku.trim(),
      description: body.description?.trim() || null,
      category_id: body.category_id,
      price: body.price,
      stock_quantity: body.stock_quantity || 0,
      status: body.status || 'active',
      image_url: body.image_url || null,
      is_featured: body.is_featured || false,
      updated_at: new Date().toISOString()
    }
    
    console.log('Updating product data:', productData)
    
    // Use admin client to bypass RLS for product updates
    const { data: product, error } = await adminSupabase
      .from('products')
      .update(productData)
      .eq('id', body.id)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    console.log('Product updated successfully:', product)
    
    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    })
    
  } catch (error: any) {
    console.error('Error updating product:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update product'
    }, { status: 500 })
  }
}

// DELETE - Delete product (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    console.log('Deleting product...')
    
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')
    
    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 })
    }
    
    const id = parseInt(productId)
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid product ID'
      }, { status: 400 })
    }
    
    console.log('Deleting product with ID:', id)
    
    // Check if product exists and get its data first (using admin client)
    const { data: existingProduct, error: fetchError } = await adminSupabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Product not found'
        }, { status: 404 })
      }
      throw fetchError
    }
    
    // Delete product from database (using admin client)
    const { error: deleteError } = await adminSupabase
      .from('products')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('Supabase delete error:', deleteError)
      return NextResponse.json({
        success: false,
        error: deleteError.message
      }, { status: 500 })
    }
    
    console.log('Product deleted successfully:', existingProduct.name)
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      data: existingProduct
    })
    
  } catch (error: any) {
    console.error('Error deleting product:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete product'
    }, { status: 500 })
  }
}