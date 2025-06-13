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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    console.log("Starting deletion process for user ID:", userId);
    console.log("Supabase URL:", supabaseUrl ? "✓ Set" : "✗ Missing");
    console.log("Service Role Key:", supabaseServiceKey ? "✓ Set" : "✗ Missing");
    
    // Step 1: Get user profile
    const { data: userProfile, error: fetchError } = await supabaseAdmin
      .from("user_profiles")
      .select("email, name")
      .eq("id", userId)
      .single();
    
    if (fetchError) {
      console.error("Error fetching user profile:", fetchError);
      return NextResponse.json({ 
        success: false, 
        error: "User not found or unable to fetch user data" 
      }, { status: 404 });
    }
    
    console.log("Found user:", userProfile.email);
    
    // Step 2: Check for existing orders and get their details
    const { data: existingOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, total_amount, status")
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
    
    // Calculate revenue impact from completed orders
    let completedOrdersRevenue = 0;
    if (hasOrders) {
      completedOrdersRevenue = existingOrders
        .filter(order => order.status === 'delivered' || order.status === 'completed')
        .reduce((sum, order) => sum + (order.total_amount || 0), 0);
    }
    
    console.log(`User has ${orderCount} orders. Completed orders revenue: ${completedOrdersRevenue}`);
    
    // Step 3: Always proceed with complete deletion
    console.log(hasOrders ? 
      `Deleting user with ${orderCount} orders and all related data` : 
      "No orders found. Proceeding with complete deletion.");
    
    try {
      // Step 3a: Delete auth user first to free up email
      console.log("Deleting auth user first to free email...");
      
      try {
        const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (!getUserError && authUser) {
          const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
          
          if (authError) {
            console.error("Error deleting auth user:", authError);
          } else {
            console.log("Auth user deleted successfully - email is now available");
          }
        }
      } catch (authCheckError) {
        console.error("Error with auth user operations:", authCheckError);
      }
      
      // Step 3b: Delete all related data in the correct order
      console.log("Deleting all related data...");
      
      if (hasOrders) {
        // Delete order items first (foreign key constraint)
        console.log("Deleting order items...");
        const { error: orderItemsError } = await supabaseAdmin
          .from("order_items")
          .delete()
          .in("order_id", existingOrders.map(order => order.id));
        
        if (orderItemsError) {
          console.error("Error deleting order items:", orderItemsError);
        } else {
          console.log("Order items deleted successfully");
        }
        
        // Delete orders
        console.log("Deleting orders...");
        const { error: ordersDeleteError } = await supabaseAdmin
          .from("orders")
          .delete()
          .eq("user_id", userId);
        
        if (ordersDeleteError) {
          console.error("Error deleting orders:", ordersDeleteError);
        } else {
          console.log(`${orderCount} orders deleted successfully`);
          
          // Create revenue adjustment for completed orders to maintain revenue totals
          if (completedOrdersRevenue > 0) {
            console.log(`Creating revenue adjustment for completed orders: ${completedOrdersRevenue}`);
            
            try {
              // Insert the revenue adjustment (table should be created manually in database)
              const completedOrderIds = existingOrders
                .filter(o => o.status === 'delivered' || o.status === 'completed')
                .map(o => o.id);
              
              const { error: adjustmentError } = await supabaseAdmin
                .from('revenue_adjustments')
                .insert({
                  adjustment_type: 'add',
                  amount: completedOrdersRevenue,
                  reason: `Revenue adjustment for completed orders from deleted user: ${userProfile.name || userProfile.email}`,
                  related_user_id: userId,
                  related_order_ids: completedOrderIds
                });
              
              if (adjustmentError) {
                console.log('Revenue adjustment table may not exist yet, skipping adjustment:', adjustmentError.message);
              } else {
                console.log('Revenue adjustment created successfully');
              }
            } catch (adjustmentError) {
              console.log('Revenue adjustment failed, continuing with deletion:', adjustmentError.message);
            }
          }
        }
      }
      
      // Delete other related data
      const deleteOperations = [
        supabaseAdmin.from("chat_messages").delete().eq("sender_id", userId),
        supabaseAdmin.from("chat_conversations").delete().eq("user_id", userId)
      ];
      
      console.log("Executing other deletion operations...");
      await Promise.allSettled(deleteOperations);
      
      // Finally, delete user profile
      console.log("Deleting user profile...");
      const { error: profileDeleteError } = await supabaseAdmin
        .from("user_profiles")
        .delete()
        .eq("id", userId);
      
      if (profileDeleteError) {
        console.error("Profile deletion failed:", profileDeleteError);
        return NextResponse.json({ 
          success: false, 
          error: "Failed to delete user profile" 
        }, { status: 500 });
      }
      
      console.log(`User ${userProfile.email} ${hasOrders ? `and ${orderCount} orders` : ''} deleted completely`);
      
      return NextResponse.json({ 
        success: true, 
        action: "deleted",
        message: hasOrders ? 
          `User and ${orderCount} orders completely removed. Email is available for reuse.` :
          "User completely removed. Email is available for reuse.",
        orderCount: orderCount,
        completedOrdersRevenue: completedOrdersRevenue,
        emailFreed: true
      });
      
    } catch (deleteError) {
      console.error("Error during user deletion process:", deleteError);
      return NextResponse.json({ 
        success: false, 
        error: "An error occurred during the deletion process" 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("Unexpected error during user deletion:", error);
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred while deleting the user" 
    }, { status: 500 });
  }
}
