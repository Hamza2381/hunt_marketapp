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
    
    // STEP 1: Fast email conflict check with parallel cleanup
    console.log(`Starting optimized user creation for: ${emailToCheck}`);
    
    // Find and remove ALL profiles with this email (including any orphaned ones)
    const { data: allProfilesWithEmail, error: findError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, name, status")
      .eq("email", emailToCheck);
    
    if (findError) {
      console.error("Error finding profiles with email:", findError);
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${findError.message}` 
      }, { status: 500 });
    }
    
    if (allProfilesWithEmail && allProfilesWithEmail.length > 0) {
      console.log(`Found ${allProfilesWithEmail.length} profile(s) with email ${emailToCheck}`);
      
      // Check if any are truly active (not deleted/inactive)
      const activeProfiles = allProfilesWithEmail.filter(p => 
        p.status === 'active' && p.name !== '[Deleted User]'
      );
      
      if (activeProfiles.length > 0) {
        console.log(`Found ${activeProfiles.length} active profile(s) - email is taken`);
        return NextResponse.json({ 
          success: false, 
          error: `Email ${userData.email} is already registered. Please use a different email address.` 
        }, { status: 400 });
      }
      
      // OPTIMIZED: Parallel cleanup instead of sequential
      console.log(`Cleaning up ${allProfilesWithEmail.length} inactive profile(s) in parallel...`);
      
      const cleanupPromises = allProfilesWithEmail.map(profile => 
        supabaseAdmin
          .from("user_profiles")
          .delete()
          .eq("id", profile.id)
      );
      
      await Promise.allSettled(cleanupPromises);
      console.log(`Parallel cleanup completed for email ${emailToCheck}`);
    } else {
      console.log(`No existing profiles found with email ${emailToCheck}`);
    }
    
    // STEP 2: Email is available in database, proceed with creation
    // Generate password
    const password = Math.random().toString(36).slice(-8) + 
      Math.random().toString(36).slice(-8).toUpperCase() + 
      Math.floor(Math.random() * 1000)
    
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
    
    // STEP 4: OPTIMIZED - Remove unnecessary cleanup operations
    console.log(`Creating profile for auth user: ${authUserId}`);
    
    // STEP 5: Create the user profile with upsert to handle any ID conflicts
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
