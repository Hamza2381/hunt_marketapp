import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Simple test endpoint for chat system
export async function GET(request: NextRequest) {
  console.log('🔬 === CHAT TEST API START ===')
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        debug: { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey }
      }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Test 1: Check if chat_conversations table exists
    console.log('🔬 Test 1: Checking chat_conversations table...')
    const { data: convTest, error: convError } = await supabaseAdmin
      .from('chat_conversations')
      .select('count')
      .limit(1)
    
    console.log('🔬 Conversations table test:', {
      success: !convError,
      error: convError?.message,
      code: convError?.code,
      hint: convError?.hint
    })

    // Test 2: Check if chat_messages table exists
    console.log('🔬 Test 2: Checking chat_messages table...')
    const { data: msgTest, error: msgError } = await supabaseAdmin
      .from('chat_messages')
      .select('count')
      .limit(1)
    
    console.log('🔬 Messages table test:', {
      success: !msgError,
      error: msgError?.message,
      code: msgError?.code,
      hint: msgError?.hint
    })

    // Test 3: Check if user_profiles table exists
    console.log('🔬 Test 3: Checking user_profiles table...')
    const { data: userTest, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('count')
      .limit(1)
    
    console.log('🔬 User profiles table test:', {
      success: !userError,
      error: userError?.message,
      code: userError?.code,
      hint: userError?.hint
    })

    console.log('🎉 === CHAT TEST API COMPLETE ===')
    
    return NextResponse.json({
      success: true,
      tests: {
        conversations_table: {
          exists: !convError,
          error: convError?.message || null,
          code: convError?.code || null
        },
        messages_table: {
          exists: !msgError,
          error: msgError?.message || null,
          code: msgError?.code || null
        },
        user_profiles_table: {
          exists: !userError,
          error: userError?.message || null,
          code: userError?.code || null
        }
      }
    })

  } catch (error: any) {
    console.error('💥 Chat test exception:', error)
    return NextResponse.json({
      error: 'Test failed with exception',
      debug: { exception: error.message }
    }, { status: 500 })
  }
}
