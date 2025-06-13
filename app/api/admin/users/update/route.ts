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
    const { userId, updates, adminUserId } = await request.json()
    
    console.log(`Admin update request for user: ${userId}`)
    console.log('Updates to apply:', updates)
    
    if (!userId || !updates || !adminUserId) {
      return NextResponse.json({ 
        success: false, 
        error: "User ID, updates, and admin user ID are required" 
      }, { status: 400 })
    }
    
    // Verify the requesting user is an admin
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("user_profiles")
      .select("is_admin")
      .eq("id", adminUserId)
      .eq("status", "active")
      .single()
    
    if (adminError || !adminProfile?.is_admin) {
      console.log(`Unauthorized update attempt by user: ${adminUserId}`)
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized: Admin access required" 
      }, { status: 403 })
    }
    
    // Validate and convert updates to database format
    const dbUpdates: any = {}
    
    if (updates.name !== undefined) dbUpdates.name = updates.name?.trim()
    
    // Email validation and conflict checking
    if (updates.email !== undefined) {
      const newEmail = updates.email.toLowerCase().trim()
      
      if (newEmail) {
        // Check for email conflicts (excluding current user)
        const { data: existingUser, error: emailCheckError } = await supabaseAdmin
          .from("user_profiles")
          .select("id, email")
          .eq("email", newEmail)
          .neq("id", userId)
          .maybeSingle()
        
        if (emailCheckError && emailCheckError.code !== 'PGRST116') {
          console.error("Error checking email uniqueness:", emailCheckError)
          return NextResponse.json({ 
            success: false, 
            error: "Failed to verify email uniqueness" 
          }, { status: 500 })
        }
        
        if (existingUser) {
          return NextResponse.json({ 
            success: false, 
            error: `Email ${updates.email} is already in use by another user` 
          }, { status: 400 })
        }
        
        dbUpdates.email = newEmail
      }
    }
    
    if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType
    if (updates.company !== undefined) dbUpdates.company_name = updates.company?.trim() || null
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone?.trim() || null
    
    // Credit fields with proper number validation
    if (updates.creditLimit !== undefined) {
      const creditLimit = Number(updates.creditLimit)
      if (isNaN(creditLimit) || creditLimit < 0) {
        return NextResponse.json({ 
          success: false, 
          error: "Credit limit must be a valid positive number" 
        }, { status: 400 })
      }
      dbUpdates.credit_limit = creditLimit
      console.log("Setting credit_limit to:", creditLimit)
    }
    
    if (updates.creditUsed !== undefined) {
      const creditUsed = Number(updates.creditUsed)
      if (isNaN(creditUsed) || creditUsed < 0) {
        return NextResponse.json({ 
          success: false, 
          error: "Credit used must be a valid positive number" 
        }, { status: 400 })
      }
      dbUpdates.credit_used = creditUsed
      console.log("Setting credit_used to:", creditUsed)
    }
    
    // Address fields
    if (updates.address) {
      if (updates.address.street !== undefined) dbUpdates.address_street = updates.address.street?.trim() || null
      if (updates.address.city !== undefined) dbUpdates.address_city = updates.address.city?.trim() || null
      if (updates.address.state !== undefined) dbUpdates.address_state = updates.address.state?.trim() || null
      if (updates.address.zipCode !== undefined) dbUpdates.address_zip = updates.address.zipCode?.trim() || null
    }
    
    // Ensure we have something to update
    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "No valid fields to update" 
      }, { status: 400 })
    }
    
    console.log("Final database updates:", dbUpdates)
    
    // Perform the update using admin privileges
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update(dbUpdates)
      .eq("id", userId)
      .select("*")
      .single()
    
    if (updateError) {
      console.error("Database update failed:", updateError)
      return NextResponse.json({ 
        success: false, 
        error: `Update failed: ${updateError.message}` 
      }, { status: 500 })
    }
    
    if (!updateResult) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found or update failed" 
      }, { status: 404 })
    }
    
    console.log(`Successfully updated user: ${updateResult.email}`)
    
    // Transform the result to match the expected User interface
    const updatedUser = {
      id: updateResult.id,
      name: updateResult.name,
      email: updateResult.email,
      accountType: updateResult.account_type,
      isAdmin: updateResult.is_admin,
      creditLimit: updateResult.credit_limit || 0,
      creditUsed: updateResult.credit_used || 0,
      availableCredit: (updateResult.credit_limit || 0) - (updateResult.credit_used || 0),
      company: updateResult.company_name,
      phone: updateResult.phone,
      address: updateResult.address_street ? {
        street: updateResult.address_street || "",
        city: updateResult.address_city || "",
        state: updateResult.address_state || "",
        zipCode: updateResult.address_zip || ""
      } : undefined,
      createdAt: updateResult.created_at,
      temporaryPassword: false, // This would need to be tracked separately if needed
      lastLogin: updateResult.last_login
    }
    
    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "User updated successfully"
    })
    
  } catch (error: any) {
    console.error('User update API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred during update" 
    }, { status: 500 })
  }
}
