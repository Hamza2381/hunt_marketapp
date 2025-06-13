import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing environment variables:', {
    supabaseUrl: !!supabaseUrl,
    supabaseServiceKey: !!supabaseServiceKey,
    supabaseAnonKey: !!supabaseAnonKey
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
    const { email, password } = await request.json()
    
    console.log(`Login attempt for email: ${email}`)
    
    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: "Email and password are required" 
      }, { status: 400 })
    }
    
    const emailToCheck = email.toLowerCase().trim()
    
    // Step 1: Find user profile by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, name, account_type, is_admin, status")
      .eq("email", emailToCheck)
      .eq("status", "active")
      .single()
    
    if (profileError || !profile) {
      console.log(`No active profile found for email: ${emailToCheck}`)
      return NextResponse.json({ 
        success: false, 
        error: "Invalid email or password" 
      }, { status: 401 })
    }
    
    console.log(`Found profile for user: ${profile.name} (${profile.id})`)
    
    // Step 2: Get the auth user by ID
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
    
    if (authError || !authUser.user) {
      console.error(`Auth user not found for profile ID: ${profile.id}`, authError)
      return NextResponse.json({ 
        success: false, 
        error: "Authentication system error" 
      }, { status: 500 })
    }
    
    console.log(`Found auth user: ${authUser.user.email}`)
    
    // Step 3: Verify password by attempting to sign in with auth email
    try {
      // Create a temporary client to test the password
      const tempClient = createClient(supabaseUrl, supabaseAnonKey)
      
      const { data: tempSignIn, error: tempError } = await tempClient.auth.signInWithPassword({
        email: authUser.user.email!,
        password: password
      })
      
      if (tempError) {
        console.log(`Password verification failed for ${authUser.user.email}:`, tempError.message)
        return NextResponse.json({ 
          success: false, 
          error: "Invalid email or password" 
        }, { status: 401 })
      }
      
      // Sign out the temporary session immediately
      await tempClient.auth.signOut()
      
      console.log(`Password verified successfully for user: ${profile.name}`)
      
      return NextResponse.json({
        success: true,
        user: {
          id: profile.id,
          email: profile.email, // Return the real email
          name: profile.name,
          accountType: profile.account_type,
          isAdmin: profile.is_admin
        },
        // Return the auth email for the client to use
        authEmail: authUser.user.email,
        password: password, // Return password for client-side auth
        message: "Login successful"
      })
      
    } catch (passwordError) {
      console.error('Password verification error:', passwordError)
      return NextResponse.json({ 
        success: false, 
        error: "Invalid email or password" 
      }, { status: 401 })
    }
    
  } catch (error: any) {
    console.error('Login API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}
