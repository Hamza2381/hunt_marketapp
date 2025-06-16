import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 === GET CONVERSATION API DEBUG START ===')
  console.log('🔧 Requested conversation ID:', params.id)
  
  try {
    const conversationId = parseInt(params.id)
    console.log('🔧 Parsed conversation ID:', conversationId)
    
    if (isNaN(conversationId)) {
      console.error('❌ Invalid conversation ID:', params.id)
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ GET CONVERSATION: No auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('🔧 GET CONVERSATION: Verifying token...')
    
    // Verify token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.log('❌ GET CONVERSATION Auth error:', authError?.message)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ GET CONVERSATION: User authenticated:', user.id)

    // Get user profile to check admin status
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ GET CONVERSATION: Profile error:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    console.log('✅ GET CONVERSATION: User profile found, isAdmin:', userProfile.is_admin)

    // First, let's check if ANY conversations exist
    console.log('🔧 Checking all conversations...')
    const { data: allConversations, error: allConversationsError } = await supabaseAdmin
      .from('chat_conversations')
      .select('id, user_id, subject')
      .order('id')
    
    console.log('🔧 All conversations in database:', {
      count: allConversations?.length || 0,
      conversations: allConversations,
      error: allConversationsError?.message
    })

    // Get conversation WITHOUT user profile join to avoid relationship error
    console.log('🔧 Fetching specific conversation:', conversationId)
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('deleted_by_user', false)  // Don't show user-deleted conversations
      .eq('deleted_by_admin', false) // Don't show admin-deleted conversations  
      .single()

    console.log('🔧 Conversation query result:', {
      hasData: !!conversation,
      hasError: !!conversationError,
      errorCode: conversationError?.code,
      errorMessage: conversationError?.message,
      conversationData: conversation
    })

    if (conversationError) {
      console.error('❌ GET CONVERSATION: Conversation error:', conversationError)
      return NextResponse.json({ 
        error: 'Conversation not found',
        debug: { 
          requestedId: conversationId,
          profileError: conversationError.message, 
          code: conversationError.code,
          allConversations: allConversations
        }
      }, { status: 404 })
    }

    console.log('✅ GET CONVERSATION: Conversation found, owner:', conversation.user_id)

    // Get user profile separately
    const { data: conversationOwner } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, email, is_admin')
      .eq('id', conversation.user_id)
      .single()

    // Add user profile to conversation
    conversation.user_profile = conversationOwner

    // Check permissions - users can only access their own conversations, admins can access all
    if (!userProfile.is_admin && conversation.user_id !== user.id) {
      console.error('❌ GET CONVERSATION: Access denied')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('🔧 GET CONVERSATION: Fetching messages...')

    // Get all messages for this conversation - simplified query without joins
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    console.log('🔧 Messages query result:', {
      hasData: !!messages,
      messageCount: messages?.length || 0,
      hasError: !!messagesError,
      errorCode: messagesError?.code,
      errorMessage: messagesError?.message,
      messagesData: messages
    })

    if (messagesError) {
      console.error('❌ GET CONVERSATION: Messages error:', messagesError)
      return NextResponse.json({ 
        error: 'Failed to fetch messages',
        debug: {
          messagesError: messagesError.message,
          code: messagesError.code
        }
      }, { status: 500 })
    }

    console.log('✅ GET CONVERSATION: Messages fetched:', messages?.length || 0)

    console.log('🎉 === GET CONVERSATION API SUCCESS ===')

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        messages: messages || []
      }
    })

  } catch (error: any) {
    console.error('💥 === GET CONVERSATION EXCEPTION ===')
    console.error('Exception:', error.message)
    console.error('Stack:', error.stack)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { exception: error.message }
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 === PATCH CONVERSATION API DEBUG START ===')
  
  try {
    const conversationId = parseInt(params.id)
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user profile to check admin status
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status, priority, deleted_by_admin, deleted_at } = body

    console.log('🔧 PATCH: Request body:', { status, priority, deleted_by_admin, deleted_at })

    // Only admins can update conversation status and priority
    if (!userProfile.is_admin) {
      console.error('❌ PATCH: Access denied - user is not admin')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updateData: any = {}
    
    if (status && ['open', 'closed', 'pending'].includes(status)) {
      updateData.status = status
    }
    
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      updateData.priority = priority
    }

    // Handle archive/unarchive operations
    if (deleted_by_admin !== undefined) {
      updateData.deleted_by_admin = deleted_by_admin
    }

    if (deleted_at !== undefined) {
      updateData.deleted_at = deleted_at
    }

    if (Object.keys(updateData).length === 0) {
      console.error('❌ PATCH: No valid fields to update')
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updateData.updated_at = new Date().toISOString()

    console.log('🔧 PATCH: Update data:', updateData)
    console.log('🔧 PATCH: Updating conversation ID:', conversationId)

    const { data: updatedConversation, error: updateError } = await supabaseAdmin
      .from('chat_conversations')
      .update(updateData)
      .eq('id', conversationId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ PATCH: Error updating conversation:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update conversation',
        debug: { updateError: updateError.message, code: updateError.code }
      }, { status: 500 })
    }

    console.log('✅ PATCH: Conversation updated successfully:', updatedConversation.id)
    console.log('🎉 === PATCH CONVERSATION API SUCCESS ===')

    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    })

  } catch (error: any) {
    console.error('💥 === PATCH CONVERSATION EXCEPTION ===')
    console.error('Exception:', error.message)
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
