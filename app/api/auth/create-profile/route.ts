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
    const profileData = await request.json()
    
    console.log(`Creating profile for user: ${profileData.email}`)
    
    if (!profileData.id || !profileData.email) {
      return NextResponse.json({ 
        success: false, 
        error: "User ID and email are required" 
      }, { status: 400 })
    }
    
    // Use admin client to create profile
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .insert(profileData)
      .select()
      .single()
    
    if (error) {
      console.error(`Failed to create profile for user: ${profileData.email}`, error)
      return NextResponse.json({ 
        success: false, 
        error: error.message || "Failed to create profile" 
      }, { status: 500 })
    }
    
    console.log(`Profile created successfully for user: ${profile.email}`)
    
    return NextResponse.json({
      success: true,
      profile: profile
    })
    
  } catch (error: any) {
    console.error('Profile creation API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}
