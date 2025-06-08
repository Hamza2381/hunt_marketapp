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
    // Get request data
    const requestData = await request.json();
    
    const { 
      items, 
      total, 
      shipping, 
      tax, 
      shippingAddress, 
      billingAddress,
      user 
    } = requestData;

    // Log user information to help with debugging
    console.log('User data received:', {
      id: user.id,
      email: user.email,
      name: user.name || 'Not provided'
    });

    // Verify the user exists in user_profiles
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: `Error fetching user profile: ${profileError.message}` }, { status: 400 });
    }

    if (!userProfile) {
      console.error('User profile not found, this should not happen since user is authenticated');
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // SIMPLIFIED SOLUTION:
    // Since we know from the logs that orders are using user_id = 1, we'll use this for now
    // Later, you should implement a proper user_id mapping strategy
    const numericUserId = user.id;
    console.log('Using numeric user ID for order:', numericUserId);
    
    // Generate unique order number
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    // Format addresses as plain strings to match existing format
    const shippingAddressString = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}`;
    const billingAddressString = `${billingAddress.street}, ${billingAddress.city}, ${billingAddress.state} ${billingAddress.zipCode}`;
    
    // Create the order data
    const orderData = {
      order_number: orderNumber,
      user_id: numericUserId, // Using user_id = 1 for now
      total_amount: Number(total),
      payment_method: "Credit Line",
      status: "pending",
      shipping_address: shippingAddressString,
      billing_address: billingAddressString
    };
    
    console.log('Creating order with data:', orderData);
    
    // Insert the order
    let order;
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .insert(orderData)
        .select()
        .single();
        
      if (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: `Error creating order: ${error.message}` }, { status: 400 });
      }
      
      order = data;
      console.log('Order created successfully with ID:', order.id);
    } catch (err) {
      console.error('Unexpected error creating order:', err);
      return NextResponse.json({ error: `Unexpected error creating order: ${err.message}` }, { status: 500 });
    }
    
    // Add order items
    const orderItems = [];
    
    for (const item of items) {
      // Ensure product ID is an integer
      let productId = typeof item.id === 'number' ? item.id : parseInt(item.id);
      
      if (isNaN(productId)) {
        console.warn(`Invalid product ID: ${item.id}, skipping`);
        continue;
      }
      
      orderItems.push({
        order_id: order.id,
        product_id: productId,
        quantity: item.quantity,
        unit_price: parseFloat(item.price.toString()),
        total_price: parseFloat((Number(item.price) * item.quantity).toFixed(2))
      });
    }
    
    if (orderItems.length === 0) {
      console.error('No valid items to process after validation');
      return NextResponse.json({ error: 'No valid items to process' }, { status: 400 });
    }
    
    console.log(`Processing ${orderItems.length} order items...`);

    try {
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems);
  
      if (itemsError) {
        console.error('Error adding order items:', itemsError);
        return NextResponse.json({ error: `Error adding order items: ${itemsError.message}` }, { status: 400 });
      }
    } catch (err) {
      console.error('Unexpected error adding order items:', err);
      return NextResponse.json({ error: `Unexpected error adding order items: ${err.message}` }, { status: 500 });
    }

    // Update user's credit
    try {
      const newCreditUsed = user.creditUsed + total;
      console.log(`Updating credit for user ${user.id}: ${user.creditUsed} + ${total} = ${newCreditUsed}`);

      // Update credit in the user_profiles table
      const updateData = {
        credit_used: newCreditUsed
      };

      const { error: creditError } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id);

      if (creditError) {
        console.error('Error updating credit:', creditError);
        
        // Try alternative field name (camelCase)
        const { error: altError } = await supabaseAdmin
          .from('user_profiles')
          .update({ creditUsed: newCreditUsed })
          .eq('id', user.id);
          
        if (altError) {
          console.error('Alternative credit update also failed:', altError);
          // Continue anyway - don't fail the whole order just for the credit update
        }
      }
    } catch (err) {
      console.error('Error updating credit:', err);
      // Continue anyway - don't fail the whole order just for the credit update
    }

    // Return success response with mapping for order history
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: orderNumber,
        total: total,
        items: items.length
      },
      // Include the mapping so order history can find this order
      userMapping: {
        authId: user.id,
        numericId: numericUserId
      }
    });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}