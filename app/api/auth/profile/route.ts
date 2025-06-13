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
    const { userId } = await request.json()
    
    console.log(`Fetching profile for user ID: ${userId}`)
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: "User ID is required" 
      }, { status: 400 })
    }
    
    // Use admin client to fetch profile
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single()
    
    if (error) {
      console.log(`Profile not found for user: ${userId}`, error)
      return NextResponse.json({ 
        success: false, 
        error: error.message || "Profile not found" 
      }, { status: 404 })
    }
    
    console.log(`Profile found for user: ${profile.email}`)
    
    return NextResponse.json({
      success: true,
      profile: profile
    })
    
  } catch (error: any) {
    console.error('Profile fetch API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}
