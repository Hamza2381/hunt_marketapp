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

export async function POST(request: NextRequest) {
  try {
    // Get user ID from request body
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('Fetching orders for user:', userId);

    // Fetch orders for the specific user with joins for user profiles and order items
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: `Error fetching orders: ${ordersError.message}` }, { status: 400 });
    }

    console.log(`Found ${ordersData.length} orders for user ${userId}`);
    
    // Format orders for the frontend
    const formattedOrders = ordersData.map(order => {
      const formattedItems = order.order_items.map(item => ({
        id: item.id,
        name: item.products?.name || `Product #${item.product_id}`,
        quantity: item.quantity,
        price: item.unit_price,
        total: item.total_price
      }));

      return {
        id: order.order_number,
        orderId: order.id, // Store the actual order ID for later use
        date: order.created_at,
        status: order.status || 'pending',
        total: order.total_amount,
        items: formattedItems.length,
        paymentMethod: order.payment_method,
        trackingNumber: order.tracking_number || null,
        estimatedDelivery: order.estimated_delivery || new Date(new Date(order.created_at).getTime() + 3*24*60*60*1000).toISOString(),
        actualDelivery: order.delivery_date || null,
        items_detail: formattedItems,
        user_id: order.user_id,
        shippingAddress: order.shipping_address,
        billingAddress: order.billing_address
      };
    });

    return NextResponse.json({ 
      orders: formattedOrders,
      userId: userId
    });
  } catch (error) {
    console.error('User orders API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
