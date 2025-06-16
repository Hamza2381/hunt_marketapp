import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 === GET MESSAGES API DEBUG START ===')
  
  try {
    const conversationId = parseInt(params.id)
    console.log('🔧 GET MESSAGES: Conversation ID:', conversationId)
    
    if (isNaN(conversationId)) {
      console.error('❌ Invalid conversation ID:', params.id)
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ GET MESSAGES: No auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('🔧 GET MESSAGES: Verifying token...')
    
    // Verify token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.log('❌ GET MESSAGES Auth error:', authError?.message)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ GET MESSAGES: User authenticated:', user.id)

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ GET MESSAGES: Profile error:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if conversation exists and user has access
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (conversationError) {
      console.error('❌ GET MESSAGES: Conversation error:', conversationError)
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check permissions
    if (!userProfile.is_admin && conversation.user_id !== user.id) {
      console.error('❌ GET MESSAGES: Access denied')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('🔧 GET MESSAGES: Fetching messages...')

    // Get all messages for this conversation without JOIN to avoid foreign key issues
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('❌ GET MESSAGES: Messages error:', messagesError)
      return NextResponse.json({ 
        error: 'Failed to fetch messages',
        debug: {
          messagesError: messagesError.message,
          code: messagesError.code,
          details: messagesError.details
        }
      }, { status: 500 })
    }

    console.log('✅ GET MESSAGES: Messages fetched:', messages?.length || 0)
    
    // Get unique sender IDs to fetch user profiles separately
    const senderIds = [...new Set(messages?.map(msg => msg.sender_id) || [])]
    let senderProfiles = []
    
    if (senderIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, name, email, is_admin')
        .in('id', senderIds)
      
      if (profilesError) {
        console.error('❌ Error fetching sender profiles:', profilesError)
        // Continue without profiles rather than failing
      } else {
        senderProfiles = profilesData || []
        console.log('✅ Sender profiles fetched:', senderProfiles.length)
      }
    }
    
    // Create profile map for quick lookup
    const profileMap = new Map()
    senderProfiles.forEach(profile => {
      profileMap.set(profile.id, profile)
    })
    
    // Add sender profile info to messages
    const enrichedMessages = messages?.map(message => ({
      ...message,
      sender: profileMap.get(message.sender_id) || {
        name: 'Unknown User',
        email: 'unknown@example.com',
        is_admin: false
      }
    })) || []
    console.log('🎉 === GET MESSAGES API SUCCESS ===')

    return NextResponse.json({
      success: true,
      messages: enrichedMessages
    })

  } catch (error: any) {
    console.error('💥 === GET MESSAGES EXCEPTION ===')
    console.error('Exception:', error.message)
    console.error('Stack:', error.stack)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { exception: error.message }
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 === POST MESSAGE API DEBUG START ===')
  console.log('🔧 Requested conversation ID for message:', params.id)
  
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
      console.error('❌ POST MESSAGE: No auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('🔧 POST MESSAGE: Verifying token...')
    
    // Verify token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.log('❌ POST MESSAGE Auth error:', authError?.message)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ POST MESSAGE: User authenticated:', user.id)

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ POST MESSAGE: Profile error:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if conversation exists first (using service role) - simplified query
    console.log('🔧 Checking if conversation exists:', conversationId)
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('chat_conversations')
      .select('id, user_id, status')
      .eq('id', conversationId)
      .single()

    console.log('🔧 Conversation check result:', {
      hasData: !!conversation,
      hasError: !!conversationError,
      errorCode: conversationError?.code,
      errorMessage: conversationError?.message,
      conversationData: conversation
    })

    if (conversationError) {
      console.error('❌ POST MESSAGE: Conversation error:', conversationError)
      return NextResponse.json({ 
        error: 'Conversation not found',
        debug: {
          requestedId: conversationId,
          conversationError: conversationError.message,
          code: conversationError.code
        }
      }, { status: 404 })
    }

    // Check permissions
    if (!userProfile.is_admin && conversation.user_id !== user.id) {
      console.error('❌ POST MESSAGE: Access denied')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { message } = body

    console.log('🔧 POST MESSAGE: Message data:', { messageLength: message?.length })

    if (!message || !message.trim()) {
      console.error('❌ POST MESSAGE: Missing message')
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log('🔧 POST MESSAGE: Creating message...')
    console.log('🔧 Message data:', {
      conversation_id: conversationId,
      sender_id: user.id,
      message: message.trim(),
      is_admin: userProfile.is_admin
    })

    // Create the message with detailed error handling - simplified without joins
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message: message.trim(),
        is_admin: userProfile.is_admin,
        read: false
      })
      .select('*')
      .single()

    console.log('🔧 Message creation result:', {
      hasData: !!newMessage,
      hasError: !!messageError,
      errorCode: messageError?.code,
      errorMessage: messageError?.message,
      errorDetails: messageError?.details,
      errorHint: messageError?.hint
    })

    if (messageError) {
      console.error('❌ POST MESSAGE: Message creation error:', messageError)
      return NextResponse.json({ 
        error: 'Failed to create message',
        debug: {
          messageError: messageError.message,
          code: messageError.code,
          details: messageError.details,
          hint: messageError.hint
        }
      }, { status: 500 })
    }

    console.log('✅ POST MESSAGE: Message created:', newMessage.id)

    // Update conversation timestamp
    const { error: updateError } = await supabaseAdmin
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (updateError) {
      console.warn('⚠️ POST MESSAGE: Failed to update conversation timestamp:', updateError)
    }

    console.log('🎉 === POST MESSAGE API SUCCESS ===')

    return NextResponse.json({
      success: true,
      message: newMessage
    })

  } catch (error: any) {
    console.error('💥 === POST MESSAGE EXCEPTION ===')
    console.error('Exception:', error.message)
    console.error('Stack:', error.stack)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { exception: error.message }
    }, { status: 500 })
  }
}
