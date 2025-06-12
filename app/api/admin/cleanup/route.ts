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

    console.log(`Admin: Cleaning up auth records for email: ${email}`);
    
    // Get all auth users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing auth users:', listError);
      return NextResponse.json({ error: `Error listing users: ${listError.message}` }, { status: 400 });
    }
    
    // Find users with the specified email
    const usersToDelete = authUsers.users?.filter(user => user.email === email) || [];
    
    if (usersToDelete.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: `No auth records found for email: ${email}`,
        deletedCount: 0
      });
    }
    
    console.log(`Found ${usersToDelete.length} auth records for email ${email}`);
    
    // Delete each auth record
    let deletedCount = 0;
    const errors = [];
    
    for (const user of usersToDelete) {
      try {
        console.log(`Deleting auth user ${user.id} (${user.email})`);\n        \n        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);\n        \n        if (deleteError) {\n          console.error(`Error deleting auth user ${user.id}:`, deleteError);\n          errors.push(`User ${user.id}: ${deleteError.message}`);\n        } else {\n          deletedCount++;\n          console.log(`Successfully deleted auth user ${user.id}`);\n        }\n      } catch (err) {\n        console.error(`Unexpected error deleting user ${user.id}:`, err);\n        errors.push(`User ${user.id}: Unexpected error`);\n      }\n    }\n    \n    return NextResponse.json({ \n      success: deletedCount > 0,\n      message: `Deleted ${deletedCount} auth records for email: ${email}`,\n      deletedCount,\n      errors: errors.length > 0 ? errors : undefined\n    });\n  } catch (error) {\n    console.error('Admin cleanup API error:', error);\n    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });\n  }\n}\n\n// GET endpoint to check for orphaned auth records\nexport async function GET(request: NextRequest) {\n  try {\n    console.log('Admin: Checking for orphaned auth records...');\n    \n    // Get all auth users\n    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();\n    \n    if (authError) {\n      console.error('Error listing auth users:', authError);\n      return NextResponse.json({ error: `Error listing auth users: ${authError.message}` }, { status: 400 });\n    }\n    \n    // Get all user profiles\n    const { data: profiles, error: profileError } = await supabaseAdmin\n      .from('user_profiles')\n      .select('id, email');\n    \n    if (profileError) {\n      console.error('Error fetching user profiles:', profileError);\n      return NextResponse.json({ error: `Error fetching profiles: ${profileError.message}` }, { status: 400 });\n    }\n    \n    const profileIds = new Set(profiles?.map(p => p.id) || []);\n    \n    // Find auth users without profiles (orphaned)\n    const orphanedAuthUsers = authUsers.users?.filter(user => !profileIds.has(user.id)) || [];\n    \n    console.log(`Found ${orphanedAuthUsers.length} orphaned auth records`);\n    \n    return NextResponse.json({ \n      success: true,\n      orphanedCount: orphanedAuthUsers.length,\n      orphanedUsers: orphanedAuthUsers.map(user => ({\n        id: user.id,\n        email: user.email,\n        created_at: user.created_at\n      }))\n    });\n  } catch (error) {\n    console.error('Admin cleanup check API error:', error);\n    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });\n  }\n}\n