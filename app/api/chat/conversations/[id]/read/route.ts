import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 === MARK AS READ API DEBUG START ===')
  
  try {
    const conversationId = parseInt(params.id)
    console.log('🔧 MARK AS READ: Conversation ID:', conversationId)
    
    if (isNaN(conversationId)) {
      console.error('❌ Invalid conversation ID:', params.id)
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ MARK AS READ: No auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('🔧 MARK AS READ: Verifying token...')
    
    // Verify token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.log('❌ MARK AS READ Auth error:', authError?.message)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ MARK AS READ: User authenticated:', user.id)

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ MARK AS READ: Profile error:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if conversation exists and user has access
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (conversationError) {
      console.error('❌ MARK AS READ: Conversation error:', conversationError)
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check permissions
    if (!userProfile.is_admin && conversation.user_id !== user.id) {
      console.error('❌ MARK AS READ: Access denied')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('🔧 MARK AS READ: Marking messages as read...')

    // Mark all messages in this conversation as read for the current user
    // For admins: mark customer messages as read
    // For customers: mark admin messages as read
    const { error: updateError } = await supabaseAdmin
      .from('chat_messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id) // Don't mark own messages as read

    if (updateError) {
      console.error('❌ MARK AS READ: Update error:', updateError)
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 })
    }

    console.log('✅ MARK AS READ: Messages marked as read')
    console.log('🎉 === MARK AS READ API SUCCESS ===')

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read'
    })

  } catch (error: any) {
    console.error('💥 === MARK AS READ EXCEPTION ===')
    console.error('Exception:', error.message)
    console.error('Stack:', error.stack)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { exception: error.message }
    }, { status: 500 })
  }
}
