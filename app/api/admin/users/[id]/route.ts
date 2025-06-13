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
    
    // Step 1: Fetch user profile and orders in parallel for speed
    const [userProfileResponse, ordersResponse] = await Promise.all([
      supabaseAdmin
        .from("user_profiles")
        .select("email, name")
        .eq("id", userId)
        .single(),
      supabaseAdmin
        .from("orders")
        .select("id, total_amount, status")
        .eq("user_id", userId)
    ]);
    
    if (userProfileResponse.error) {
      console.error("Error fetching user profile:", userProfileResponse.error);
      return NextResponse.json({ 
        success: false, 
        error: "User not found or unable to fetch user data" 
      }, { status: 404 });
    }
    
    if (ordersResponse.error) {
      console.error("Error checking existing orders:", ordersResponse.error);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to check user's order history" 
      }, { status: 500 });
    }
    
    const userProfile = userProfileResponse.data;
    const existingOrders = ordersResponse.data || [];
    
    console.log("Found user:", userProfile.email);
    
    const hasOrders = existingOrders.length > 0;
    const orderCount = existingOrders.length;
    
    // Calculate revenue impact from completed orders
    let completedOrdersRevenue = 0;
    if (hasOrders) {
      completedOrdersRevenue = existingOrders
        .filter(order => order.status === 'delivered' || order.status === 'completed')
        .reduce((sum, order) => sum + (order.total_amount || 0), 0);
    }
    
    console.log(`User has ${orderCount} orders. Completed orders revenue: ${completedOrdersRevenue}`);
    
    // Step 2: Always proceed with complete deletion
    console.log(hasOrders ? 
      `Deleting user with ${orderCount} orders and all related data` : 
      "No orders found. Proceeding with complete deletion.");
    
    try {
      // Step 3: Execute all deletion operations in parallel for maximum speed
      const deletionPromises = [];
      
      // Auth user deletion (independent operation)
      const authDeletionPromise = (async () => {
        try {
          console.log("Deleting auth user...");
          const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (authError) {
            console.error("Error deleting auth user:", authError);
          } else {
            console.log("Auth user deleted successfully");
          }
        } catch (authError) {
          console.error("Auth deletion exception:", authError);
        }
      })();
      
      deletionPromises.push(authDeletionPromise);
      
      // Database deletions (can run in parallel)
      if (hasOrders) {
        // Delete order items and orders in sequence (foreign key constraint)
        const orderDeletionPromise = (async () => {
          try {
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
            
            console.log("Deleting orders...");
            const { error: ordersDeleteError } = await supabaseAdmin
              .from("orders")
              .delete()
              .eq("user_id", userId);
            
            if (ordersDeleteError) {
              console.error("Error deleting orders:", ordersDeleteError);
            } else {
              console.log(`${orderCount} orders deleted successfully`);
            }
          } catch (error) {
            console.error("Error in order deletion:", error);
          }
        })();
        
        deletionPromises.push(orderDeletionPromise);
      }
      
      // Other related data deletions (can run in parallel)
      const chatDeletionPromise = Promise.allSettled([
        supabaseAdmin.from("chat_messages").delete().eq("sender_id", userId),
        supabaseAdmin.from("chat_conversations").delete().eq("user_id", userId)
      ]);
      
      deletionPromises.push(chatDeletionPromise);
      
      // User profile deletion (can run in parallel with others)
      const profileDeletionPromise = (async () => {
        try {
          console.log("Deleting user profile...");
          const { error: profileDeleteError } = await supabaseAdmin
            .from("user_profiles")
            .delete()
            .eq("id", userId);
          
          if (profileDeleteError) {
            console.error("Profile deletion failed:", profileDeleteError);
            throw new Error("Failed to delete user profile");
          }
          
          console.log("User profile deleted successfully");
        } catch (error) {
          console.error("Error in profile deletion:", error);
          throw error;
        }
      })();
      
      deletionPromises.push(profileDeletionPromise);
      
      // Wait for all critical deletions to complete
      console.log("Executing all deletion operations in parallel...");
      await Promise.all(deletionPromises);
      
      // Step 4: Handle revenue adjustment in background (non-blocking)
      if (completedOrdersRevenue > 0) {
        // Don't wait for this - run in background
        setImmediate(async () => {
          try {
            console.log(`Creating revenue adjustment for completed orders: ${completedOrdersRevenue}`);
            
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
            console.log('Revenue adjustment failed, continuing:', adjustmentError.message);
          }
        });
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
