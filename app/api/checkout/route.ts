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

    // Verify the user exists in user_profiles using UUID
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, credit_limit, credit_used')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: `Error fetching user profile: ${profileError.message}` }, { status: 400 });
    }

    if (!userProfile) {
      console.error('User profile not found');
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check if user has enough credit
    const availableCredit = userProfile.credit_limit - userProfile.credit_used;
    if (availableCredit < total) {
      console.error('Insufficient credit:', { availableCredit, total });
      return NextResponse.json({ 
        error: 'Insufficient credit', 
        details: {
          required: total,
          available: availableCredit,
          creditLimit: userProfile.credit_limit,
          creditUsed: userProfile.credit_used
        }
      }, { status: 400 });
    }
    
    // Generate unique order number
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    // Format addresses as plain strings to match existing format
    const shippingAddressString = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}`;
    const billingAddressString = `${billingAddress.street}, ${billingAddress.city}, ${billingAddress.state} ${billingAddress.zipCode}`;
    
    // Start a transaction by creating order and updating credit in sequence
    console.log('Starting order creation transaction...');
    
    // Create the order data with proper UUID
    const orderData = {
      order_number: orderNumber,
      user_id: user.id, // Use UUID directly
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
      // Rollback: Delete the order we just created
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: 'No valid items to process' }, { status: 400 });
    }
    
    console.log(`Processing ${orderItems.length} order items...`);

    try {
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems);
  
      if (itemsError) {
        console.error('Error adding order items:', itemsError);
        // Rollback: Delete the order we just created
        await supabaseAdmin.from('orders').delete().eq('id', order.id);
        return NextResponse.json({ error: `Error adding order items: ${itemsError.message}` }, { status: 400 });
      }
    } catch (err) {
      console.error('Unexpected error adding order items:', err);
      // Rollback: Delete the order we just created
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: `Unexpected error adding order items: ${err.message}` }, { status: 500 });
    }

    // Update user's credit - this is the final step
    try {
      const newCreditUsed = userProfile.credit_used + total;
      console.log(`Updating credit for user ${user.id}: ${userProfile.credit_used} + ${total} = ${newCreditUsed}`);

      const { error: creditError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          credit_used: newCreditUsed,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (creditError) {
        console.error('Error updating credit:', creditError);
        // Rollback: Delete order and items
        await supabaseAdmin.from('order_items').delete().eq('order_id', order.id);
        await supabaseAdmin.from('orders').delete().eq('id', order.id);
        return NextResponse.json({ error: `Error updating credit: ${creditError.message}` }, { status: 400 });
      }
      
      console.log('Credit updated successfully');
    } catch (err) {
      console.error('Error updating credit:', err);
      // Rollback: Delete order and items
      await supabaseAdmin.from('order_items').delete().eq('order_id', order.id);
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: `Error updating credit: ${err.message}` }, { status: 500 });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: orderNumber,
        total: total,
        items: items.length,
        userId: user.id // Return the UUID for reference
      }
    });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
