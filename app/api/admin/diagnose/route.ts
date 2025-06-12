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
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`🔍 Diagnosing email: ${email}`);
    
    const diagnosis = {
      email: email,
      timestamp: new Date().toISOString(),
      checks: []
    };

    // Check 1: Auth users
    try {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) {
        diagnosis.checks.push({
          name: 'Auth Users List',
          status: 'ERROR',
          error: authError.message,
          data: null
        });
      } else {
        const matchingAuthUsers = authUsers.users?.filter(u => u.email?.toLowerCase() === email.toLowerCase()) || [];
        diagnosis.checks.push({
          name: 'Auth Users List',
          status: 'SUCCESS',
          data: {
            totalAuthUsers: authUsers.users?.length || 0,
            matchingAuthUsers: matchingAuthUsers.length,
            matchingUsers: matchingAuthUsers.map(u => ({
              id: u.id,
              email: u.email,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
              email_confirmed_at: u.email_confirmed_at
            }))
          }
        });
      }
    } catch (err) {
      diagnosis.checks.push({
        name: 'Auth Users List',
        status: 'EXCEPTION',
        error: err.message,
        data: null
      });
    }

    // Check 2: User profiles
    try {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .ilike('email', email);
      
      if (profileError) {
        diagnosis.checks.push({
          name: 'User Profiles',
          status: 'ERROR',
          error: profileError.message,
          data: null
        });
      } else {
        diagnosis.checks.push({
          name: 'User Profiles',
          status: 'SUCCESS',
          data: {
            matchingProfiles: profiles?.length || 0,
            profiles: profiles || []
          }
        });
      }
    } catch (err) {
      diagnosis.checks.push({
        name: 'User Profiles',
        status: 'EXCEPTION',
        error: err.message,
        data: null
      });
    }

    // Check 3: Related orders
    try {
      const { data: orders, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, total_amount, status, created_at')
        .in('user_id', [
          // We'll check for any user IDs that might be related to this email
        ]);
      
      // Since we don't have the user ID yet, let's get all orders and see if any are orphaned
      const { data: allOrders, error: allOrdersError } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, total_amount, status, created_at');
      
      if (allOrdersError) {
        diagnosis.checks.push({
          name: 'Related Orders',
          status: 'ERROR',
          error: allOrdersError.message,
          data: null
        });
      } else {
        diagnosis.checks.push({
          name: 'Related Orders',
          status: 'SUCCESS',
          data: {
            totalOrders: allOrders?.length || 0,
            // We'll analyze this in the response
          }
        });
      }
    } catch (err) {
      diagnosis.checks.push({
        name: 'Related Orders',
        status: 'EXCEPTION',
        error: err.message,
        data: null
      });
    }

    // Check 4: Try to understand why deletion might fail
    const authUsersCheck = diagnosis.checks.find(c => c.name === 'Auth Users List');
    if (authUsersCheck?.status === 'SUCCESS' && authUsersCheck.data?.matchingUsers?.length > 0) {
      const userId = authUsersCheck.data.matchingUsers[0].id;
      
      // Check what might be preventing deletion
      try {
        // Check for related records in various tables
        const relatedDataChecks = await Promise.all([
          supabaseAdmin.from('orders').select('id').eq('user_id', userId),
          supabaseAdmin.from('chat_conversations').select('id').eq('user_id', userId),
          supabaseAdmin.from('chat_messages').select('id').eq('sender_id', userId),
        ]);

        diagnosis.checks.push({
          name: 'Related Data Check',
          status: 'SUCCESS',
          data: {
            userId: userId,
            relatedOrders: relatedDataChecks[0].data?.length || 0,
            relatedConversations: relatedDataChecks[1].data?.length || 0,
            relatedMessages: relatedDataChecks[2].data?.length || 0,
          }
        });
      } catch (err) {
        diagnosis.checks.push({
          name: 'Related Data Check',
          status: 'EXCEPTION',
          error: err.message,
          data: null
        });
      }
    }

    console.log('🔍 Diagnosis complete:', diagnosis);
    
    return NextResponse.json({ 
      success: true,
      diagnosis: diagnosis
    });
  } catch (error) {
    console.error('Diagnosis API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
