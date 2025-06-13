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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);

    if (!orderId || isNaN(orderId)) {
      return NextResponse.json({ error: 'Valid order ID is required' }, { status: 400 });
    }

    console.log(`Admin: Deleting order ${orderId}`);
    
    // First, check if the order exists
    const { data: orderExists, error: checkError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number')
      .eq('id', orderId)
      .single();
    
    if (checkError || !orderExists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Delete order items first (due to foreign key constraints)
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .delete()
      .eq('order_id', orderId);
    
    if (itemsError) {
      console.error('Error deleting order items:', itemsError);
      return NextResponse.json({ error: `Error deleting order items: ${itemsError.message}` }, { status: 400 });
    }
    
    // Then delete the order
    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', orderId);
    
    if (orderError) {
      console.error('Error deleting order:', orderError);
      return NextResponse.json({ error: `Error deleting order: ${orderError.message}` }, { status: 400 });
    }
    
    console.log(`Admin: Order ${orderId} deleted successfully`);
    
    return NextResponse.json({ 
      success: true,
      message: `Order ${orderExists.order_number} has been deleted`
    });
  } catch (error) {
    console.error('Admin delete order API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}