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

// Create revenue_adjustments table if it doesn't exist
async function ensureRevenueAdjustmentsTable() {
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS revenue_adjustments (
        id SERIAL PRIMARY KEY,
        adjustment_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT NOT NULL,
        related_user_id UUID,
        related_order_ids INTEGER[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_revenue_adjustments_type ON revenue_adjustments(adjustment_type);
      CREATE INDEX IF NOT EXISTS idx_revenue_adjustments_user ON revenue_adjustments(related_user_id);
    `
  })
  
  if (error) {
    console.error('Error creating revenue_adjustments table:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRevenueAdjustmentsTable()
    
    const { type, amount, reason, userId, orderIds, createdBy } = await request.json()
    
    // Validate required fields
    if (!type || !amount || !reason) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: type, amount, reason" 
      }, { status: 400 })
    }
    
    // Insert revenue adjustment
    const { data, error } = await supabaseAdmin
      .from('revenue_adjustments')
      .insert({
        adjustment_type: type,
        amount: parseFloat(amount),
        reason,
        related_user_id: userId || null,
        related_order_ids: orderIds || null,
        created_by: createdBy || null
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating revenue adjustment:', error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create revenue adjustment" 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      adjustment: data 
    })
    
  } catch (error: any) {
    console.error('Revenue adjustment API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('revenue_adjustments')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching revenue adjustments:', error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fetch revenue adjustments" 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      adjustments: data || [] 
    })
    
  } catch (error: any) {
    console.error('Revenue adjustments fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}
