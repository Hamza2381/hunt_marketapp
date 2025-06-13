import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    console.log('=== Categories API Called ===')
    console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing')
    console.log('Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log('Fetching categories from database...')
    
    // First try to get categories with status filter
    let { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, description, status')
      .eq('status', 'active')
      .order('name')
    
    // If that fails (maybe status column doesn't exist), try without status filter
    if (error && error.message.includes('status')) {
      console.log('Status column might not exist, trying without status filter...')
      const { data: allCategories, error: allError } = await supabase
        .from('categories')
        .select('id, name, description')
        .order('name')
      
      if (allError) {
        console.error('Failed to fetch categories without status filter:', allError)
        return NextResponse.json({ 
          success: false, 
          error: `Database error: ${allError.message}`
        }, { status: 500 })
      }
      
      categories = allCategories
    } else if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${error.message}`
      }, { status: 500 })
    }
    
    // If no categories found, return default categories
    if (!categories || categories.length === 0) {
      console.log('No categories found in database, returning default categories')
      const defaultCategories = [
        { id: 1, name: 'Paper', description: 'All types of paper products', status: 'active' },
        { id: 2, name: 'Ink & Toner', description: 'Printer cartridges and toner', status: 'active' },
        { id: 3, name: 'Office Supplies', description: 'Essential office supplies', status: 'active' },
        { id: 4, name: 'Technology', description: 'Computer accessories and electronics', status: 'active' },
        { id: 5, name: 'Coffee & Snacks', description: 'Break room supplies', status: 'active' },
        { id: 6, name: 'Cleaning', description: 'Cleaning supplies and janitorial products', status: 'active' }
      ]
      
      return NextResponse.json({
        success: true,
        data: defaultCategories,
        count: defaultCategories.length,
        note: 'Using default categories - database appears to be empty'
      })
    }
    
    console.log(`Successfully fetched ${categories.length} categories`)
    console.log('Categories:', categories.map(c => ({ id: c.id, name: c.name })))
    
    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length
    })
    
  } catch (error: any) {
    console.error('Unexpected API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${error.message}`
    }, { status: 500 })
  }
}