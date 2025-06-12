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

    console.log(`Admin: Force cleaning up auth records for email: ${email}`);
    
    // Get all auth users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing auth users:', listError);
      return NextResponse.json({ error: `Error listing users: ${listError.message}` }, { status: 400 });
    }
    
    // Find users with the specified email
    const usersToDelete = authUsers.users?.filter(user => user.email === email) || [];
    
    console.log(`Found ${usersToDelete.length} auth records for email ${email}`);
    console.log('Users to delete:', usersToDelete.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
    
    if (usersToDelete.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: `No auth records found for email: ${email}`,
        deletedCount: 0
      });
    }
    
    // Delete each auth record
    let deletedCount = 0;
    const errors = [];
    
    for (const user of usersToDelete) {
      try {
        console.log(`Force deleting auth user ${user.id} (${user.email})`);
        
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`Error deleting auth user ${user.id}:`, deleteError);
          errors.push(`User ${user.id}: ${deleteError.message}`);
        } else {
          deletedCount++;
          console.log(`Successfully force deleted auth user ${user.id}`);
        }
      } catch (err) {
        console.error(`Unexpected error deleting user ${user.id}:`, err);
        errors.push(`User ${user.id}: Unexpected error`);
      }
    }
    
    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return NextResponse.json({ 
      success: deletedCount > 0,
      message: `Force deleted ${deletedCount} auth records for email: ${email}`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Admin force cleanup API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// GET endpoint to check what auth records exist for an email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    console.log('Admin: Checking auth records...');
    
    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error listing auth users:', authError);
      return NextResponse.json({ error: `Error listing auth users: ${authError.message}` }, { status: 400 });
    }
    
    if (email) {
      // Check specific email
      const emailUsers = authUsers.users?.filter(user => user.email === email) || [];
      return NextResponse.json({ 
        success: true,
        email: email,
        count: emailUsers.length,
        users: emailUsers.map(user => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
        }))
      });
    }
    
    // Get all user profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email');
    
    if (profileError) {
      console.error('Error fetching user profiles:', profileError);
      return NextResponse.json({ error: `Error fetching profiles: ${profileError.message}` }, { status: 400 });
    }
    
    const profileIds = new Set(profiles?.map(p => p.id) || []);
    
    // Find auth users without profiles (orphaned)
    const orphanedAuthUsers = authUsers.users?.filter(user => !profileIds.has(user.id)) || [];
    
    console.log(`Found ${orphanedAuthUsers.length} orphaned auth records`);
    
    return NextResponse.json({ 
      success: true,
      totalAuthUsers: authUsers.users?.length || 0,
      totalProfiles: profiles?.length || 0,
      orphanedCount: orphanedAuthUsers.length,
      orphanedUsers: orphanedAuthUsers.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }))
    });
  } catch (error) {
    console.error('Admin cleanup check API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
