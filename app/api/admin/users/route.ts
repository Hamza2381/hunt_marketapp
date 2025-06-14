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
    
    // Validate required fields
    if (!userData.name?.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
    }
    if (!userData.email?.trim()) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }
    if (!userData.accountType) {
      return NextResponse.json({ success: false, error: "Account type is required" }, { status: 400 })
    }
    
    const emailToCheck = userData.email.toLowerCase().trim()
    
    // STEP 1: Streamlined email conflict check (optimized for speed)
    console.log(`Starting fast user creation for: ${emailToCheck}`);
    
    // Quick active user check only (skip inactive cleanup for speed)
    const { data: activeProfileCheck, error: findError } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("email", emailToCheck)
      .eq("status", "active")
      .neq("name", "[Deleted User]")
      .limit(1);
    
    if (findError) {
      console.error("Error checking for active profiles:", findError);
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${findError.message}` 
      }, { status: 500 });
    }
    
    if (activeProfileCheck && activeProfileCheck.length > 0) {
      console.log(`Email ${emailToCheck} is already in use`);
      return NextResponse.json({ 
        success: false, 
        error: `Email ${userData.email} is already registered. Please use a different email address.` 
      }, { status: 400 });
    }
    
    console.log(`Email ${emailToCheck} is available - proceeding with creation`);
    
    // STEP 2: Email is available in database, proceed with creation
    // Use pre-generated password from frontend, or generate one if not provided
    const password = userData.preGeneratedPassword || (
      Math.random().toString(36).slice(-8) + 
      Math.random().toString(36).slice(-8).toUpperCase() + 
      Math.floor(Math.random() * 1000)
    )
    
    console.log(`Using ${userData.preGeneratedPassword ? 'pre-generated' : 'backend-generated'} password for user creation`);
    
    // STEP 3: Create auth user with system email (no conflicts possible)
    let authUserId;
    
    console.log(`Creating auth user for profile email: ${emailToCheck}`);
    
    try {
      // Always create auth user with unique system email to avoid conflicts
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const authEmail = `user_${timestamp}_${randomId}@auth.internal`;
      
      console.log(`Creating auth user with system email: ${authEmail}`);
      
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
      });
      
      if (createData?.user) {
        authUserId = createData.user.id;
        console.log(`Successfully created auth user: ${authUserId}`);
        console.log(`User's real email ${emailToCheck} will be stored in profile`);
      } else {
        console.error(`Auth user creation failed:`, createError);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to create authentication user: ${createError?.message || 'Unknown error'}`
        }, { status: 500 });
      }
    } catch (authError) {
      console.error("Auth user creation failed:", authError);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to create authentication user: ${authError.message}` 
      }, { status: 500 });
    }
    
    if (!authUserId) {
      return NextResponse.json({ 
        success: false, 
        error: "Unable to create authentication user. Please try again." 
      }, { status: 500 })
    }
    
    // STEP 4: Create the user profile immediately (no unnecessary operations)
    console.log(`Creating profile for auth user: ${authUserId}`);
    
    // STEP 5: Create the user profile directly (faster than upsert)
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
    
    // Use upsert to handle potential ID conflicts (this will insert or update)
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      console.error("Profile creation failed:", profileError);
      
      // Clean up auth user on failure (non-blocking for speed)
      supabaseAdmin.auth.admin.deleteUser(authUserId).catch(cleanupError => {
        console.error("Auth user cleanup failed:", cleanupError);
      });
      
      return NextResponse.json({ 
        success: false, 
        error: `Failed to create user profile: ${profileError.message}` 
      }, { status: 500 });
    }

    // Success!
    console.log(`User creation completed successfully for ${emailToCheck}`);
    
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
        temporaryPassword: true, // This is just for the UI response
      },
      password 
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred while creating the user" 
    }, { status: 500 })
  }
}
