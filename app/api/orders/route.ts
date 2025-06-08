import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

// Create a server-side Supabase client with service role
// This has admin rights and can bypass RLS policies
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
    // Get the order ID from the request URL
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // No need to verify authentication since we're using the admin client
    // which bypasses RLS policies

    // Fetch the order
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      return NextResponse.json({ error: `Error fetching order: ${orderError.message}` }, { status: 400 });
    }

    if (!orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        total_price
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      return NextResponse.json({ error: `Error fetching order items: ${itemsError.message}` }, { status: 400 });
    }

    // Try to get product names if possible
    const productIds = orderItems.map(item => item.product_id);
    let productNames = {};

    if (productIds.length > 0) {
      try {
        const { data: products } = await supabaseAdmin
          .from('products')
          .select('id, name')
          .in('id', productIds);

        if (products && products.length > 0) {
          productNames = products.reduce((acc, product) => {
            acc[product.id] = product.name;
            return acc;
          }, {});
          console.log('Found product names:', productNames);
        }
      } catch (productError) {
        console.error('Error fetching product names:', productError);
        // Continue without product names
      }
    }

    // Format order items with product information
    const formattedItems = orderItems.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      // Use product name if available, otherwise use placeholder
      product_name: productNames[item.product_id] || `Product #${item.product_id}`
    }));

    // Return the complete order data
    return NextResponse.json({
      ...orderData,
      items: formattedItems
    });
  } catch (error) {
    console.error('Order API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
