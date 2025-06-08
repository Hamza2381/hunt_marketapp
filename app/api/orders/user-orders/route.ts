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
    // Get user ID and email from request body
    const { userId, userEmail, numericId } = await request.json();

    if (!userId && !userEmail) {
      return NextResponse.json({ error: 'User ID or email is required' }, { status: 400 });
    }

    console.log('Fetching orders for user:', { userId, userEmail, numericId });

    // Fetch all orders to filter on the client side
    const { data: allOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: `Error fetching orders: ${ordersError.message}` }, { status: 400 });
    }

    console.log(`Found ${allOrders.length} total orders in database`);
    
    // For each order, fetch the order items
    const ordersWithItems = await Promise.all(allOrders.map(async (order) => {
      const { data: items, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select(`
          id,
          product_id,
          quantity,
          unit_price,
          total_price
        `)
        .eq('order_id', order.id);

      if (itemsError) {
        console.error(`Error fetching items for order ${order.id}:`, itemsError);
        return {
          ...order,
          items_detail: []
        };
      }

      // Try to get product names where possible
      const productIds = items.map(item => item.product_id);
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
          }
        } catch (productError) {
          console.error('Error fetching product names:', productError);
        }
      }

      const formattedItems = items.map(item => ({
        id: item.id,
        name: productNames[item.product_id] || `Product #${item.product_id}`,
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
        estimatedDelivery: order.estimated_delivery || new Date(new Date(order.created_at).getTime() + 3*24*60*60*1000).toISOString(), // 3 days after order date
        actualDelivery: order.delivery_date || null,
        items_detail: formattedItems,
        // Add user_id for client-side filtering
        user_id: order.user_id
      };
    }));

    // Try to find a user mapping if we have a numeric ID
    let userMapping = null;
    if (numericId) {
      userMapping = {
        authId: userId,
        numericId: numericId
      };
    } else {
      // Try to find a mapping in the database
      try {
        const { data: mappingData, error: mappingError } = await supabaseAdmin
          .from('users')  // Assuming there's a users table with auth_id -> id mapping
          .select('id')
          .eq('auth_id', userId)
          .single();
          
        if (!mappingError && mappingData) {
          userMapping = {
            authId: userId,
            numericId: mappingData.id
          };
          console.log('Found user mapping in database:', userMapping);
        }
      } catch (e) {
        console.log('Error looking up user mapping:', e);
      }
    }

    return NextResponse.json({ 
      orders: ordersWithItems,
      // Include the user identifiers for client-side filtering
      userId: userId,
      userEmail: userEmail,
      // Include any mapping information we have
      userMapping: userMapping
    });
  } catch (error) {
    console.error('Order history API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
