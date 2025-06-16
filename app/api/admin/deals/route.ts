import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const dealType = searchParams.get('deal_type')

    const offset = (page - 1) * limit

    // Build query
    let query = supabaseAdmin
      .from('deals')
      .select(`
        id,
        title,
        description,
        deal_type,
        discount_type,
        discount_value,
        min_purchase_amount,
        max_discount_amount,
        start_date,
        end_date,
        usage_limit,
        usage_count,
        status,
        is_featured,
        banner_text,
        created_at,
        updated_at,
        deal_products(
          product_id,
          products(name, sku, price, image_url)
        )
      `)

    if (status) {
      query = query.eq('status', status)
    }

    if (dealType) {
      query = query.eq('deal_type', dealType)
    }

    // Get total count
    const { count } = await supabaseAdmin
      .from('deals')
      .select('*', { count: 'exact', head: true })

    // Get paginated data
    const { data: deals, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch deals' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: deals,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      title,
      description,
      deal_type,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      start_date,
      end_date,
      usage_limit,
      is_featured,
      banner_text,
      product_ids,
      category_ids
    } = body

    // Validate required fields
    if (!title || !deal_type || !discount_type || !discount_value || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate dates
    if (new Date(start_date) >= new Date(end_date)) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Create deal
    const { data: deal, error: dealError } = await supabaseAdmin
      .from('deals')
      .insert({
        title,
        description,
        deal_type,
        discount_type,
        discount_value: parseFloat(discount_value),
        min_purchase_amount: parseFloat(min_purchase_amount || 0),
        max_discount_amount: max_discount_amount ? parseFloat(max_discount_amount) : null,
        start_date,
        end_date,
        usage_limit: usage_limit ? parseInt(usage_limit) : null,
        is_featured: Boolean(is_featured),
        banner_text,
        status: 'active'
      })
      .select()
      .single()

    if (dealError) {
      console.error('Deal creation error:', dealError)
      return NextResponse.json(
        { success: false, error: 'Failed to create deal' },
        { status: 500 }
      )
    }

    // Add products to deal
    if (product_ids && product_ids.length > 0) {
      const dealProducts = product_ids.map((product_id: number) => ({
        deal_id: deal.id,
        product_id
      }))

      const { error: productsError } = await supabaseAdmin
        .from('deal_products')
        .insert(dealProducts)

      if (productsError) {
        console.error('Deal products error:', productsError)
        // Rollback deal creation
        await supabaseAdmin.from('deals').delete().eq('id', deal.id)
        return NextResponse.json(
          { success: false, error: 'Failed to add products to deal' },
          { status: 500 }
        )
      }
    }

    // Add categories to deal
    if (category_ids && category_ids.length > 0) {
      const dealCategories = category_ids.map((category_id: number) => ({
        deal_id: deal.id,
        category_id
      }))

      const { error: categoriesError } = await supabaseAdmin
        .from('deal_categories')
        .insert(dealCategories)

      if (categoriesError) {
        console.error('Deal categories error:', categoriesError)
        // Note: We don't rollback here as categories are optional
      }
    }

    return NextResponse.json({
      success: true,
      data: deal
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
