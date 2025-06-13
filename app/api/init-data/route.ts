import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({
        error: 'Service key not available'
      }, { status: 500 })
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Create categories first
    const { data: existingCategories } = await supabaseAdmin
      .from('categories')
      .select('id')
      .limit(1)
    
    let categoryId = 1
    
    if (!existingCategories || existingCategories.length === 0) {
      const { data: newCategory } = await supabaseAdmin
        .from('categories')
        .insert([{
          name: 'Office Supplies',
          description: 'Professional office supplies'
        }])
        .select()
        .single()
      
      categoryId = newCategory?.id || 1
    } else {
      categoryId = existingCategories[0].id
    }
    
    // Create sample products
    const sampleProducts = [
      {
        name: 'Premium Business Notebook',
        sku: 'NB-001',
        description: 'High-quality notebook for professionals',
        category_id: categoryId,
        price: 24.99,
        stock_quantity: 50,
        status: 'active',
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'
      },
      {
        name: 'Executive Pen Set',
        sku: 'PEN-001',
        description: 'Elegant pen set for executives',
        category_id: categoryId,
        price: 49.99,
        stock_quantity: 25,
        status: 'active',
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccc?w=400'
      },
      {
        name: 'Desk Organizer Pro',
        sku: 'ORG-001',
        description: 'Premium desk organizer',
        category_id: categoryId,
        price: 39.99,
        stock_quantity: 30,
        status: 'active',
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=400'
      },
      {
        name: 'Wireless Business Mouse',
        sku: 'MS-001',
        description: 'Ergonomic wireless mouse',
        category_id: categoryId,
        price: 29.99,
        stock_quantity: 40,
        status: 'active',
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'
      }
    ]
    
    // Check if products already exist
    const { data: existingProducts } = await supabaseAdmin
      .from('products')
      .select('id')
      .limit(1)
    
    if (existingProducts && existingProducts.length > 0) {
      return NextResponse.json({
        message: 'Sample data already exists',
        existing: true
      })
    }
    
    // Insert products
    const { data: createdProducts, error } = await supabaseAdmin
      .from('products')
      .insert(sampleProducts)
      .select()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      message: 'Sample data created successfully',
      products: createdProducts?.length || 0
    })
    
  } catch (error: any) {
    console.error('Sample data creation error:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}