import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:', {
    supabaseUrl: !!supabaseUrl,
    supabaseServiceKey: !!supabaseServiceKey
  })
  throw new Error("Missing Supabase environment variables")
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { authEmail, newPassword } = await request.json()
    
    console.log(`Password change attempt for auth email: ${authEmail}`)
    
    if (!authEmail || !newPassword) {
      return NextResponse.json({ 
        success: false, 
        error: "Auth email and new password are required" 
      }, { status: 400 })
    }
    
    if (newPassword.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: "Password must be at least 6 characters long" 
      }, { status: 400 })
    }
    
    try {
      // Get the user by email to get their ID
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listError) {
        console.error('Error listing users:', listError)
        return NextResponse.json({ 
          success: false, 
          error: "Authentication system error" 
        }, { status: 500 })
      }
      
      const authUser = authUsers.users.find(user => user.email === authEmail)
      
      if (!authUser) {
        console.error(`Auth user not found with email: ${authEmail}`)
        return NextResponse.json({ 
          success: false, 
          error: "Authentication system error" 
        }, { status: 500 })
      }
      
      // Update the password using admin API
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: newPassword }
      )
      
      if (updateError) {
        console.error('Password update failed:', updateError)
        return NextResponse.json({ 
          success: false, 
          error: updateError.message || "Failed to update password" 
        }, { status: 500 })
      }
      
      console.log(`Password updated successfully for user: ${authUser.id}`)
      
      return NextResponse.json({
        success: true,
        message: "Password updated successfully"
      })
      
    } catch (passwordError) {
      console.error('Password change error:', passwordError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to update password" 
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('Password change API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}
