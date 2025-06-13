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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    console.log("Resetting password for user ID:", userId);
    
    // Generate random password
    const tempPassword = Math.random().toString(36).slice(-8) + 
      Math.random().toString(36).slice(-8).toUpperCase() + 
      Math.floor(Math.random() * 1000);
    
    // Update auth user password with admin client
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (error) {
      console.error("Error resetting password:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to reset password" 
      }, { status: 500 });
    }

    console.log("Password reset successful for user:", userId);

    return NextResponse.json({ 
      success: true, 
      password: tempPassword 
    });
    
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred while resetting the password" 
    }, { status: 500 });
  }
}
