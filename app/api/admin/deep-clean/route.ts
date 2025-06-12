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
    const { email, force = false } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`🧹 Deep cleaning email: ${email} (force: ${force})`);
    
    const results = {
      email: email,
      steps: [],
      success: false,
      canProceedWithCreation: false
    };

    // Step 1: Find all auth users with this email
    let authUsers = [];
    try {
      const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) {
        results.steps.push({
          step: 'Find Auth Users',
          status: 'ERROR',
          error: authError.message
        });
        return NextResponse.json(results, { status: 400 });
      }
      
      authUsers = authUsersData.users?.filter(u => u.email?.toLowerCase() === email.toLowerCase()) || [];
      results.steps.push({
        step: 'Find Auth Users',
        status: 'SUCCESS',
        data: { found: authUsers.length, users: authUsers.map(u => ({ id: u.id, email: u.email })) }
      });
    } catch (err) {
      results.steps.push({
        step: 'Find Auth Users',
        status: 'EXCEPTION',
        error: err.message
      });
      return NextResponse.json(results, { status: 500 });
    }

    if (authUsers.length === 0) {
      results.success = true;
      results.canProceedWithCreation = true;
      results.steps.push({
        step: 'Final Status',
        status: 'SUCCESS',
        message: 'No auth users found - email is available for use'
      });
      return NextResponse.json(results);
    }

    // Step 2: For each auth user, check and clean up related data
    for (const authUser of authUsers) {
      const userId = authUser.id;
      console.log(`🧹 Processing auth user: ${userId}`);

      // Check for user profile
      try {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          results.steps.push({
            step: `Check Profile (${userId})`,
            status: 'ERROR',
            error: profileError.message
          });
          continue;
        }

        const hasProfile = !profileError;
        results.steps.push({
          step: `Check Profile (${userId})`,
          status: 'SUCCESS',
          data: { hasProfile, profile: hasProfile ? { email: profile.email, name: profile.name } : null }
        });

        // Check for related orders
        const { data: orders, error: ordersError } = await supabaseAdmin
          .from('orders')
          .select('id, total_amount, status')
          .eq('user_id', userId);

        if (ordersError) {
          results.steps.push({
            step: `Check Orders (${userId})`,
            status: 'ERROR',
            error: ordersError.message
          });
          continue;
        }

        const hasOrders = orders && orders.length > 0;
        results.steps.push({
          step: `Check Orders (${userId})`,
          status: 'SUCCESS',
          data: { hasOrders, orderCount: orders?.length || 0 }
        });

        // If user has orders and we're not forcing, just anonymize
        if (hasOrders && !force) {
          if (hasProfile) {
            const anonymizedEmail = `deleted_user_${Date.now()}_${Math.random().toString(36).slice(2)}@anonymized.local`;
            const { error: anonymizeError } = await supabaseAdmin
              .from('user_profiles')
              .update({
                name: '[Deleted User]',
                email: anonymizedEmail,
                phone: null,
                address_street: null,
                address_city: null,
                address_state: null,
                address_zip: null,
                company_name: null,
                status: 'inactive',
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (anonymizeError) {
              results.steps.push({
                step: `Anonymize Profile (${userId})`,
                status: 'ERROR',
                error: anonymizeError.message
              });
              continue;
            } else {
              results.steps.push({
                step: `Anonymize Profile (${userId})`,
                status: 'SUCCESS',
                message: 'Profile anonymized to preserve order history'
              });
            }
          }
        } else {
          // Clean up related data first
          
          // Delete chat messages
          const { error: messagesError } = await supabaseAdmin
            .from('chat_messages')
            .delete()
            .eq('sender_id', userId);

          results.steps.push({
            step: `Delete Chat Messages (${userId})`,
            status: messagesError ? 'ERROR' : 'SUCCESS',
            error: messagesError?.message
          });

          // Delete chat conversations
          const { error: conversationsError } = await supabaseAdmin
            .from('chat_conversations')
            .delete()
            .eq('user_id', userId);

          results.steps.push({
            step: `Delete Chat Conversations (${userId})`,
            status: conversationsError ? 'ERROR' : 'SUCCESS',
            error: conversationsError?.message
          });

          // Delete order items first (if forcing and has orders)
          if (hasOrders && force) {
            for (const order of orders) {
              const { error: itemsError } = await supabaseAdmin
                .from('order_items')
                .delete()
                .eq('order_id', order.id);

              results.steps.push({
                step: `Delete Order Items (Order ${order.id})`,
                status: itemsError ? 'ERROR' : 'SUCCESS',
                error: itemsError?.message
              });
            }

            // Delete orders
            const { error: ordersDeleteError } = await supabaseAdmin
              .from('orders')
              .delete()
              .eq('user_id', userId);

            results.steps.push({
              step: `Delete Orders (${userId})`,
              status: ordersDeleteError ? 'ERROR' : 'SUCCESS',
              error: ordersDeleteError?.message
            });
          }

          // Delete user profile
          if (hasProfile) {
            const { error: profileDeleteError } = await supabaseAdmin
              .from('user_profiles')
              .delete()
              .eq('id', userId);

            results.steps.push({
              step: `Delete Profile (${userId})`,
              status: profileDeleteError ? 'ERROR' : 'SUCCESS',
              error: profileDeleteError?.message
            });
          }
        }

        // Finally, try to delete the auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (authDeleteError) {
          results.steps.push({
            step: `Delete Auth User (${userId})`,
            status: 'ERROR',
            error: authDeleteError.message
          });
          
          // If we can't delete the auth user, the email is still not available
          continue;
        } else {
          results.steps.push({
            step: `Delete Auth User (${userId})`,
            status: 'SUCCESS',
            message: 'Auth user deleted successfully'
          });
        }

      } catch (err) {
        results.steps.push({
          step: `Process User (${userId})`,
          status: 'EXCEPTION',
          error: err.message
        });
      }
    }

    // Check if all auth users were successfully deleted
    const failedDeletions = results.steps.filter(step => 
      step.step.includes('Delete Auth User') && step.status !== 'SUCCESS'
    );

    if (failedDeletions.length === 0) {
      results.success = true;
      results.canProceedWithCreation = true;
      results.steps.push({
        step: 'Final Status',
        status: 'SUCCESS',
        message: 'All auth users cleaned up - email is now available for use'
      });

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      results.success = false;
      results.canProceedWithCreation = false;
      results.steps.push({
        step: 'Final Status',
        status: 'ERROR',
        message: `Failed to delete ${failedDeletions.length} auth user(s) - email is still not available`
      });
    }

    console.log('🧹 Deep clean complete:', results);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Deep clean API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
