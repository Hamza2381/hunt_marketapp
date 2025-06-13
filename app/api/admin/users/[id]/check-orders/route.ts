import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables for admin operations")
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    console.log("Checking orders for user ID:", userId);
    
    // Check for existing orders
    const { data: existingOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", userId);
    
    if (ordersError) {
      console.error("Error checking existing orders:", ordersError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to check user's order history" 
      }, { status: 500 });
    }
    
    const hasOrders = existingOrders && existingOrders.length > 0;
    const orderCount = existingOrders ? existingOrders.length : 0;
    
    console.log(`User ${userId} has ${orderCount} orders`);
    
    return NextResponse.json({ 
      success: true,
      hasOrders,
      orderCount
    });
    
  } catch (error: any) {
    console.error("Unexpected error during order check:", error);
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred while checking orders" 
    }, { status: 500 });
  }
}
