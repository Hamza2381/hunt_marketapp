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
    const { orderId, newStatus } = await request.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'Order ID and new status are required' }, { status: 400 });
    }

    console.log(`Admin: Updating order ${orderId} status to ${newStatus}`);
    
    // Update the order status
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('Error updating order status:', error);
      return NextResponse.json({ error: `Error updating order status: ${error.message}` }, { status: 400 });
    }
    
    console.log(`Admin: Order ${orderId} status updated to ${newStatus}`);
    
    return NextResponse.json({ 
      success: true,
      message: `Order status updated to ${newStatus}`
    });
  } catch (error) {
    console.error('Admin update order status API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
