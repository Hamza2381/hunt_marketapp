import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Creating sample data...')
    
    if (!supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Service key not available'
      }, { status: 500 })
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    const results: any = {
      categories: [],
      products: []
    }
    
    // First, ensure we have categories
    console.log('Checking for existing categories...')
    const { data: existingCategories } = await supabaseAdmin
      .from('categories')
      .select('id, name')
    
    let categoryId = 1
    
    if (!existingCategories || existingCategories.length === 0) {
      console.log('Creating sample categories...')
      const sampleCategories = [
        {
          name: 'Office Supplies',
          description: 'Essential office supplies for your business'
        },
        {
          name: 'Electronics',
          description: 'Business electronics and accessories'
        },
        {
          name: 'Business Essentials',
          description: 'Must-have items for every business'
        }
      ]
      
      const { data: createdCategories, error: categoryError } = await supabaseAdmin
        .from('categories')
        .insert(sampleCategories)
        .select()
      
      if (categoryError) {
        throw new Error(`Failed to create categories: ${categoryError.message}`)
      }
      
      results.categories = createdCategories
      categoryId = createdCategories[0]?.id || 1
      console.log('Created categories:', createdCategories?.length)
    } else {
      results.categories = existingCategories
      categoryId = existingCategories[0].id
      console.log('Using existing categories:', existingCategories.length)
    }
    
    // Create sample products
    console.log('Creating sample products...')
    const sampleProducts = [
      {
        name: 'Premium Business Notebook',
        sku: 'NB-001',
        description: 'High-quality notebook for professional use with premium paper and elegant design',
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
        description: 'Elegant pen set for executives and professionals',
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
        description: 'Keep your desk organized with this premium multi-compartment organizer',
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
        description: 'Ergonomic wireless mouse perfect for business use',
        category_id: categoryId,
        price: 29.99,
        stock_quantity: 40,
        status: 'active',
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'
      },
      {
        name: 'Professional Briefcase',
        sku: 'BC-001',
        description: 'Stylish and durable briefcase for business professionals',
        category_id: categoryId,
        price: 89.99,
        stock_quantity: 15,
        status: 'active',
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'
      },
      {
        name: 'Business Card Holder',
        sku: 'BCH-001',
        description: 'Elegant business card holder made from premium materials',
        category_id: categoryId,
        price: 19.99,
        stock_quantity: 60,
        status: 'active',
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400'
      }
    ]
    
    // Delete existing products first to avoid conflicts
    await supabaseAdmin
      .from('products')
      .delete()
      .neq('id', 0) // Delete all
    
    const { data: createdProducts, error: productsError } = await supabaseAdmin
      .from('products')
      .insert(sampleProducts)
      .select()
    
    if (productsError) {
      throw new Error(`Failed to create products: ${productsError.message}`)
    }
    
    results.products = createdProducts
    console.log('Created products:', createdProducts?.length)
    
    return NextResponse.json({
      success: true,
      message: 'Sample data created successfully',
      data: results,
      summary: {
        categories: results.categories.length,
        products: results.products.length
      }
    })
    
  } catch (error: any) {
    console.error('❌ Sample data creation failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Sample data creation failed'
    }, { status: 500 })
  }
}