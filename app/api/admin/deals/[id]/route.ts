import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .select(`
        *,
        deal_products(
          product_id,
          products(id, name, sku, price, image_url)
        ),
        deal_categories(
          category_id,
          categories(id, name)
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      )
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      status,
      product_ids,
      category_ids
    } = body

    // Update deal
    const { data: deal, error: dealError } = await supabaseAdmin
      .from('deals')
      .update({
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
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (dealError) {
      console.error('Deal update error:', dealError)
      return NextResponse.json(
        { success: false, error: 'Failed to update deal' },
        { status: 500 }
      )
    }

    // Update deal products if provided
    if (product_ids !== undefined) {
      // Delete existing products
      await supabaseAdmin
        .from('deal_products')
        .delete()
        .eq('deal_id', params.id)

      // Add new products
      if (product_ids.length > 0) {
        const dealProducts = product_ids.map((product_id: number) => ({
          deal_id: parseInt(params.id),
          product_id
        }))

        await supabaseAdmin
          .from('deal_products')
          .insert(dealProducts)
      }
    }

    // Update deal categories if provided
    if (category_ids !== undefined) {
      // Delete existing categories
      await supabaseAdmin
        .from('deal_categories')
        .delete()
        .eq('deal_id', params.id)

      // Add new categories
      if (category_ids.length > 0) {
        const dealCategories = category_ids.map((category_id: number) => ({
          deal_id: parseInt(params.id),
          category_id
        }))

        await supabaseAdmin
          .from('deal_categories')
          .insert(dealCategories)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('deals')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete deal' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Deal deleted successfully'
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
