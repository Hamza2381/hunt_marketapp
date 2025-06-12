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

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()
    
    console.log("API: Creating user:", userData.email)
    console.log("Supabase config check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length,
      keyLength: supabaseServiceKey?.length
    })
    
    // Validate required fields
    if (!userData.name || !userData.name.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
    }
    if (!userData.email || !userData.email.trim()) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }
    if (!userData.accountType) {
      return NextResponse.json({ success: false, error: "Account type is required" }, { status: 400 })
    }
    
    const emailToCheck = userData.email.toLowerCase().trim()
    
    console.log("Starting user creation process for:", emailToCheck)
    console.log("User data received:", {
      name: userData.name,
      email: emailToCheck,
      accountType: userData.accountType,
      creditLimit: userData.creditLimit
    })
    
    // Test database connection
    console.log('Testing database connection...')
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('user_profiles')
        .select('count')
        .limit(1)
      
      console.log('Database connection test:', {
        success: !testError,
        error: testError,
        data: testData
      })
      
      if (testError) {
        console.error('Database connection failed:', testError)
        return NextResponse.json({ 
          success: false, 
          error: `Database connection error: ${testError.message}` 
        }, { status: 500 })
      }
    } catch (dbTestError) {
      console.error('Database test exception:', dbTestError)
      return NextResponse.json({ 
        success: false, 
        error: `Database test failed: ${dbTestError}` 
      }, { status: 500 })
    }
    
    // STEP 1: Check if email exists in our database (user_profiles)
    console.log('Checking database for existing email:', emailToCheck)
    
    let existingProfile
    let profileCheckError
    
    try {
      const result = await supabaseAdmin
        .from("user_profiles")
        .select("id, email")
        .eq("email", emailToCheck)
        .maybeSingle()
      
      existingProfile = result.data
      profileCheckError = result.error
    } catch (queryException) {
      console.error('Database query exception:', queryException)
      return NextResponse.json({ 
        success: false, 
        error: `Database query failed: ${queryException}` 
      }, { status: 500 })
    }
    
    console.log('Database check result:', {
      existingProfile,
      error: profileCheckError,
      errorCode: profileCheckError?.code,
      errorMessage: profileCheckError?.message
    })
    
    if (profileCheckError) {
      // Only treat as error if it's not a "no rows returned" error
      if (profileCheckError.code !== 'PGRST116') {
        console.error("Error checking existing profile:", profileCheckError)
        return NextResponse.json({ 
          success: false, 
          error: `Database error: ${profileCheckError.message}` 
        }, { status: 500 })
      }
      // PGRST116 means no rows found, which is what we want
      console.log('No existing profile found (PGRST116 - expected)')
    }
    
    if (existingProfile) {
      console.log("Email already exists in database:", existingProfile)
      return NextResponse.json({ 
        success: false, 
        error: `Email ${userData.email} is already registered. Please use a different email address.` 
      }, { status: 400 })
    }
    
    console.log("Email is available in database, proceeding with creation...")
    
    // STEP 2: Generate password
    const password = Math.random().toString(36).slice(-8) + 
      Math.random().toString(36).slice(-8).toUpperCase() + 
      Math.floor(Math.random() * 1000)
    
    // STEP 3: Check if auth user exists, if so, delete it first
    console.log("Checking for existing auth users...")
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => 
      u.email?.toLowerCase().trim() === emailToCheck
    )
    
    if (existingAuthUser) {
      console.log(`Found existing auth user ${existingAuthUser.id}, deleting...`)
      try {
        await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id)
        console.log(`Deleted auth user ${existingAuthUser.id}`)
        
        // Wait for auth deletion to propagate
        console.log("Waiting for auth deletion to propagate...")
        let waitAttempts = 0
        const maxWaitAttempts = 5
        
        while (waitAttempts < maxWaitAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const { data: checkUsers } = await supabaseAdmin.auth.admin.listUsers()
          const stillExists = checkUsers?.users?.find(u => 
            u.email?.toLowerCase().trim() === emailToCheck
          )
          
          if (!stillExists) {
            console.log(`Auth user successfully deleted after ${waitAttempts + 1} attempts`)
            break
          }
          
          waitAttempts++
        }
        
        if (waitAttempts >= maxWaitAttempts) {
          console.log("Auth user deletion taking longer than expected, proceeding anyway...")
        }
        
      } catch (deleteError) {
        console.error("Failed to delete existing auth user:", deleteError)
        // Continue anyway - we'll handle creation failure below
      }
    }
    
    // STEP 4: Create auth user with retry logic
    console.log("Creating auth user...")
    let authUserId
    let createAttempts = 0
    const maxCreateAttempts = 3
    
    while (createAttempts < maxCreateAttempts) {
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: emailToCheck,
        password,
        email_confirm: true,
      })
      
      if (createError) {
        if (createError.message.includes('already been registered') && createAttempts < maxCreateAttempts - 1) {
          console.log(`Auth creation failed (attempt ${createAttempts + 1}), retrying in 2 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          createAttempts++
          continue
        } else {
          console.error("Auth creation failed after retries:", createError)
          return NextResponse.json({ 
            success: false, 
            error: `Failed to create authentication user: ${createError.message}. The email may still be in use by the authentication system.` 
          }, { status: 500 })
        }
      }
      
      if (!createData.user) {
        return NextResponse.json({ success: false, error: "Failed to create authentication user" }, { status: 500 })
      }
      
      authUserId = createData.user.id
      console.log('Auth user created successfully:', authUserId)
      break
    }
    
    if (!authUserId) {
      return NextResponse.json({ success: false, error: "Failed to create authentication user after multiple attempts" }, { status: 500 })
    }
    
    // STEP 5: Create profile
    const profileData = {
      id: authUserId,
      name: userData.name.trim(),
      email: emailToCheck,
      account_type: userData.accountType,
      company_name: userData.accountType === 'business' ? (userData.company?.trim() || null) : null,
      phone: userData.phone?.trim() || null,
      is_admin: false,
      credit_limit: Number(userData.creditLimit) || 0,
      credit_used: 0,
      address_street: userData.address?.street?.trim() || null,
      address_city: userData.address?.city?.trim() || null,
      address_state: userData.address?.state?.trim() || null,
      address_zip: userData.address?.zipCode?.trim() || null,
      status: 'active'
    }
    
    // STEP 5.1: Check if profile with this ID already exists
    console.log('Checking for existing profile with ID:', authUserId)
    const { data: existingProfileById, error: idCheckError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email")
      .eq("id", authUserId)
      .maybeSingle()
    
    if (idCheckError && idCheckError.code !== 'PGRST116') {
      console.error("Error checking profile by ID:", idCheckError)
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ success: false, error: "Failed to verify profile ID uniqueness" }, { status: 500 })
    }
    
    if (existingProfileById) {
      console.log(`Profile with ID ${authUserId} already exists with email ${existingProfileById.email}`)
      console.log("Deleting existing profile and related data to resolve ID conflict...")
      
      // Delete related data first to avoid foreign key constraints
      try {
        await supabaseAdmin.from("chat_messages").delete().eq("sender_id", authUserId)
        await supabaseAdmin.from("chat_conversations").delete().eq("user_id", authUserId)
        await supabaseAdmin.from("order_items").delete().eq("order_id", authUserId) // In case there are order items
        await supabaseAdmin.from("orders").delete().eq("user_id", authUserId)
        console.log("Deleted related data")
      } catch (relatedDataError) {
        console.warn("Warning: Could not delete all related data:", relatedDataError)
        // Continue anyway - the profile deletion might still work
      }
      
      // Delete the existing profile to resolve the conflict
      const { error: deleteError } = await supabaseAdmin
        .from("user_profiles")
        .delete()
        .eq("id", authUserId)
      
      if (deleteError) {
        console.error("Failed to delete conflicting profile:", deleteError)
        // Clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        return NextResponse.json({ 
          success: false, 
          error: `Profile ID conflict could not be resolved: ${deleteError.message}` 
        }, { status: 500 })
      }
      
      console.log("Successfully deleted conflicting profile and related data")
    }
    
    console.log('Creating profile:', {
      id: profileData.id,
      email: profileData.email,
      name: profileData.name,
      credit_limit: profileData.credit_limit
    })
    
    const { error: profileError, data: createdProfile } = await supabaseAdmin
      .from("user_profiles")
      .insert(profileData)
      .select()
      .single()

    if (profileError) {
      console.error("Profile creation error:", profileError)
      // Clean up auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        console.log("Cleaned up auth user after profile creation failure")
      } catch (cleanupError) {
        console.error("Failed to cleanup auth user:", cleanupError)
      }
      return NextResponse.json({ success: false, error: `Profile creation failed: ${profileError.message}` }, { status: 500 })
    }

    console.log('User created successfully!')
    console.log('Final profile data:', {
      id: createdProfile.id,
      email: createdProfile.email,
      credit_limit: createdProfile.credit_limit,
      credit_used: createdProfile.credit_used
    })

    return NextResponse.json({ 
      success: true,
      user: {
        id: authUserId,
        name: userData.name,
        email: emailToCheck,
        accountType: userData.accountType,
        isAdmin: false,
        creditLimit: Number(userData.creditLimit) || 0,
        creditUsed: 0,
        company: userData.accountType === 'business' ? userData.company : undefined,
        phone: userData.phone,
        address: userData.address,
        temporaryPassword: true,
      },
      password 
    })
    
  } catch (error: any) {
    console.error("API: User creation error:", error)
    return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
