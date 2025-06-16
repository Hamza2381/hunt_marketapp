import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured')
    const limit = searchParams.get('limit')
    const dealType = searchParams.get('type')
    const status = searchParams.get('status') || 'active'

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
        deal_products(
          product_id,
          products(
            id,
            name,
            sku,
            price,
            stock_quantity,
            image_url,
            status
          )
        )
      `)
      .eq('status', status)
      .gte('end_date', new Date().toISOString())
      .lte('start_date', new Date().toISOString())

    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }

    if (dealType) {
      query = query.eq('deal_type', dealType)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    query = query.order('created_at', { ascending: false })

    const { data: deals, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch deals' },
        { status: 500 }
      )
    }

    // Transform deals data to include calculated prices
    const transformedDeals = deals?.map(deal => {
      const productsWithDeals = deal.deal_products?.map(dp => {
        const product = dp.products
        if (!product) return null

        let discountedPrice = product.price
        let savings = 0

        if (deal.discount_type === 'percentage') {
          const discountAmount = (product.price * deal.discount_value) / 100
          const actualDiscount = deal.max_discount_amount 
            ? Math.min(discountAmount, deal.max_discount_amount)
            : discountAmount
          discountedPrice = product.price - actualDiscount
          savings = actualDiscount
        } else if (deal.discount_type === 'fixed_amount') {
          const discountAmount = Math.min(deal.discount_value, product.price - 0.01)
          discountedPrice = product.price - discountAmount
          savings = discountAmount
        }

        // Calculate time remaining
        const now = new Date()
        const endDate = new Date(deal.end_date)
        const timeLeft = endDate.getTime() - now.getTime()
        
        let timeLeftString = 'Expired'
        if (timeLeft > 0) {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
          
          if (days > 0) {
            timeLeftString = `${days}d ${hours}h`
          } else if (hours > 0) {
            timeLeftString = `${hours}h ${minutes}m`
          } else {
            timeLeftString = `${minutes}m`
          }
        }

        return {
          ...product,
          deal_id: deal.id,
          deal_title: deal.title,
          deal_type: deal.deal_type,
          original_price: product.price,
          discounted_price: Math.max(discountedPrice, 0.01),
          savings: savings,
          discount_percentage: deal.discount_type === 'percentage' ? deal.discount_value : Math.round((savings / product.price) * 100),
          time_left: timeLeftString,
          banner_text: deal.banner_text,
          usage_limit: deal.usage_limit,
          usage_count: deal.usage_count,
          is_limited_stock: product.stock_quantity <= 20
        }
      }).filter(Boolean)

      return {
        ...deal,
        products: productsWithDeals
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedDeals
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Server error in /api/deals:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
