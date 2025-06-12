import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

// Create a server-side Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    console.log('Admin: Fetching all orders...');
    
    // Fetch orders with proper joins for user profiles and order items
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        user_profiles:user_id (*),
        order_items(
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products:product_id(
            id,
            name,
            sku
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: `Error fetching orders: ${ordersError.message}` }, { status: 400 });
    }
    
    // Process the results
    const processedOrders = ordersData.map(order => ({
      ...order,
      user_profiles: order.user_profiles,
      items_count: order.order_items?.length || 0
    }));
    
    console.log('Admin: Orders fetched:', processedOrders.length);
    
    return NextResponse.json({ 
      orders: processedOrders
    });
  } catch (error) {
    console.error('Admin orders API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
