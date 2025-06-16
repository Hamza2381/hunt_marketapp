import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  console.log('🚀 === CHAT API DEBUG START ===')
  
  try {
    // 1. Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('🔧 Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length || 0,
      serviceKeyLength: supabaseServiceKey?.length || 0
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables')
      return NextResponse.json({ 
        error: 'Server configuration error - missing environment variables',
        debug: { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey }
      }, { status: 500 })
    }

    // 2. Initialize Supabase admin client
    console.log('🔧 Initializing Supabase admin client...')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Supabase admin client created')

    // 3. Check authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔧 Auth header check:', {
      hasHeader: !!authHeader,
      headerStart: authHeader?.substring(0, 20) + '...' || 'none'
    })
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Invalid auth header')
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid auth header',
        debug: { hasHeader: !!authHeader, startsWithBearer: authHeader?.startsWith('Bearer ') }
      }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('🔧 Token extracted, length:', token?.length || 0)

    // 4. Verify user authentication
    console.log('🔧 Verifying user authentication...')
    let user
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
      
      console.log('🔧 Auth response:', {
        hasUser: !!authData.user,
        hasError: !!authError,
        errorCode: authError?.name || 'none',
        errorMessage: authError?.message || 'none'
      })
      
      if (authError) {
        console.error('❌ Auth error:', authError)
        return NextResponse.json({ 
          error: 'Authentication failed',
          debug: { authError: authError.message }
        }, { status: 401 })
      }
      
      user = authData.user
      if (!user) {
        console.error('❌ No user in auth response')
        return NextResponse.json({ 
          error: 'Invalid token - no user data' 
        }, { status: 401 })
      }
      
      console.log('✅ User authenticated:', { userId: user.id, email: user.email })
    } catch (authException) {
      console.error('❌ Auth exception:', authException)
      return NextResponse.json({ 
        error: 'Authentication exception',
        debug: { exception: (authException as Error).message }
      }, { status: 401 })
    }

    // 5. Get user profile
    console.log('🔧 Fetching user profile...')
    let userProfile
    try {
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, name, email, is_admin')
        .eq('id', user.id)
        .single()

      console.log('🔧 Profile response:', {
        hasProfile: !!profileData,
        hasError: !!profileError,
        errorCode: profileError?.code || 'none',
        errorMessage: profileError?.message || 'none'
      })

      if (profileError) {
        console.error('❌ Profile error:', profileError)
        return NextResponse.json({ 
          error: 'User profile not found',
          debug: { profileError: profileError.message, code: profileError.code }
        }, { status: 404 })
      }
      
      userProfile = profileData
      console.log('✅ User profile found:', { 
        userId: userProfile.id, 
        name: userProfile.name, 
        isAdmin: userProfile.is_admin 
      })
    } catch (profileException) {
      console.error('❌ Profile exception:', profileException)
      return NextResponse.json({ 
        error: 'Profile fetch exception',
        debug: { exception: (profileException as Error).message }
      }, { status: 500 })
    }

    // 6. Test database connectivity and check tables (temporarily disabled)
    console.log('🔧 Skipping table connectivity test for debugging...')

    // 7. Fetch conversations and user profiles separately to avoid foreign key issues
    console.log('🔧 Fetching conversations and user profiles separately...')
    
    // Check if this is a request for archived conversations
    const url = new URL(request.url)
    const isArchivedRequest = url.searchParams.get('archived') === 'true'
    
    try {
    // First, get conversations based on archive status
    let conversationsQuery = supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50)
    
    if (isArchivedRequest) {
      // Get archived conversations (deleted_by_admin = true)
      conversationsQuery = conversationsQuery.eq('deleted_by_admin', true)
      console.log('🔧 Fetching ARCHIVED conversations')
    } else {
      // Get active conversations based on user type
      if (userProfile.is_admin) {
        // For admins: show conversations not archived by admin (regardless of user deletion status)
        conversationsQuery = conversationsQuery.eq('deleted_by_admin', false)
        console.log('🔧 Fetching ACTIVE conversations for ADMIN (ignoring user deletions)')
      } else {
        // For users: show conversations not deleted by user and not archived by admin
        conversationsQuery = conversationsQuery
          .eq('deleted_by_user', false)
          .eq('deleted_by_admin', false)
        console.log('🔧 Fetching ACTIVE conversations for USER')
      }
    }
    
    const { data: conversations, error: conversationsError } = await conversationsQuery

    console.log('🔧 Conversations query result:', {
    hasData: !!conversations,
    dataLength: conversations?.length || 0,
    hasError: !!conversationsError,
          errorCode: conversationsError?.code || 'none',
      errorMessage: conversationsError?.message || 'none'
    })

    if (conversationsError) {
    console.error('❌ Conversations query error:', conversationsError)
    return NextResponse.json({ 
      error: 'Failed to fetch conversations',
      debug: { 
          conversationsError: conversationsError.message, 
              code: conversationsError.code,
          details: conversationsError.details,
        hint: conversationsError.hint
      }
    }, { status: 500 })
    }

    console.log('✅ Conversations fetched:', conversations?.length || 0)
    
    // Filter by user if not admin
    let filteredConversations = conversations || []
    if (!userProfile.is_admin) {
      filteredConversations = conversations?.filter(conv => conv.user_id === user.id) || []
          console.log('🔧 Filtered conversations for user', user.id, ':', filteredConversations.length)
    }

    // Get unique user IDs for profile lookup
    const userIds = [...new Set(filteredConversations.map(conv => conv.user_id))]
    console.log('🔧 Fetching user profiles for user IDs:', userIds)
    
    // Fetch user profiles separately
    let userProfiles = []
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabaseAdmin
            .from('user_profiles')
            .select('id, name, email')
            .in('id', userIds)
          
          if (profilesError) {
            console.error('❌ Error fetching user profiles:', profilesError)
            // Continue without profiles rather than failing completely
          } else {
            userProfiles = profilesData || []
            console.log('✅ User profiles fetched:', userProfiles.length)
          }
        }

        // 8. Get unread message counts for each conversation
        console.log('🔧 Fetching unread counts for conversations...')
        const conversationIds = filteredConversations.map(conv => conv.id)
        
        let unreadCounts = new Map()
        if (conversationIds.length > 0) {
          const { data: unreadData } = await supabaseAdmin
            .from('chat_messages')
            .select('conversation_id')
            .in('conversation_id', conversationIds)
            .eq('read', false)
            .neq('sender_id', user.id) // Don't count our own messages as unread
          
          // Count unread messages per conversation
          unreadData?.forEach(msg => {
            unreadCounts.set(msg.conversation_id, (unreadCounts.get(msg.conversation_id) || 0) + 1)
          })
        }

        // 9. Get latest message for each conversation
        console.log('🔧 Fetching latest messages...')
        let latestMessages = new Map()
        if (conversationIds.length > 0) {
          const { data: latestData } = await supabaseAdmin
            .from('chat_messages')
            .select('conversation_id, message, created_at')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: false })
          
          // Get the latest message for each conversation
          latestData?.forEach(msg => {
            if (!latestMessages.has(msg.conversation_id)) {
              latestMessages.set(msg.conversation_id, {
                message: msg.message,
                created_at: msg.created_at
              })
            }
          })
        }

        // 10. Prepare final response with all data
        console.log('🔧 Preparing final conversation response...')
        
        // Create a map for quick profile lookup
        const profileMap = new Map()
        userProfiles.forEach(profile => {
          profileMap.set(profile.id, profile)
        })
        
        const result = filteredConversations.map(conv => {
          const latestMsg = latestMessages.get(conv.id)
          const unreadCount = unreadCounts.get(conv.id) || 0
          const userProfile = profileMap.get(conv.user_id) || {
            id: conv.user_id,
            name: 'Unknown User',
            email: 'unknown@example.com'
          }
          
          console.log('🔧 Processing conversation:', { 
            id: conv.id, 
            user_id: conv.user_id, 
            subject: conv.subject,
            user_profile: userProfile.name,
            unread_count: unreadCount,
            latest_message: latestMsg?.message?.substring(0, 50) || 'No messages'
          })
          
          return {
            id: conv.id,
            user_id: conv.user_id,
            subject: conv.subject || 'No Subject',
            status: conv.status,
            priority: conv.priority,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            user_profile: userProfile,
            messages: [], // Will be loaded separately when conversation is opened
            unread_count: unreadCount,
            latest_message: latestMsg?.message || 'No messages yet',
            latest_message_at: latestMsg?.created_at || conv.updated_at
          }
        })
      
      console.log('🔧 Final result being returned:', result)

      console.log('🎉 === CHAT API DEBUG SUCCESS ===')
      return NextResponse.json({ 
        success: true, 
        conversations: result,
        debug: {
          userIsAdmin: userProfile.is_admin,
          conversationCount: result.length,
          userId: user.id
        }
      })

    } catch (fetchException) {
      console.error('❌ Fetch exception:', fetchException)
      return NextResponse.json({ 
        error: 'Conversation fetch exception',
        debug: { exception: (fetchException as Error).message }
      }, { status: 500 })
    }

  } catch (globalException) {
    console.error('💥 === GLOBAL EXCEPTION ===')
    console.error('Exception:', globalException)
    console.error('Stack:', (globalException as Error).stack)
    
    return NextResponse.json({ 
      error: 'Unexpected server error',
      debug: { 
        exception: (globalException as Error).message,
        stack: (globalException as Error).stack?.split('\n').slice(0, 3).join('\n')
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 === POST CHAT API DEBUG START ===')
  
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables for POST')
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ POST: No auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('🔧 POST: Verifying token...')
    
    // Verify token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.log('❌ POST Auth error:', authError?.message)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ POST: User authenticated:', user.id)

    const body = await request.json()
    const { subject, message, priority = 'medium' } = body

    console.log('🔧 POST: Request data:', { subject, messageLength: message?.length, priority })

    if (!subject || !message) {
      console.error('❌ POST: Missing subject or message')
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }

    console.log('🔧 POST: Creating conversation for user:', user.id)

    // Create conversation
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        priority,
        status: 'open'
      })
      .select()
      .single()

    if (conversationError) {
      console.error('❌ POST: Error creating conversation:', conversationError)
      return NextResponse.json({ 
        error: 'Failed to create conversation',
        debug: { conversationError: conversationError.message }
      }, { status: 500 })
    }

    console.log('✅ POST: Conversation created:', conversation.id)

    // Create initial message
    const { data: initialMessage, error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        message: message.trim(),
        is_admin: false,
        read: false
      })
      .select()
      .single()

    if (messageError) {
      console.error('❌ POST: Error creating initial message:', messageError)
      return NextResponse.json({ 
        error: 'Failed to create initial message',
        debug: { messageError: messageError.message }
      }, { status: 500 })
    }

    console.log('✅ POST: Initial message created:', initialMessage.id)

    // Get user profile for response
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('🎉 === POST CHAT API DEBUG SUCCESS ===')

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        user_profile: userProfile,
        messages: [initialMessage],
        unread_count: 0,
        latest_message: message.trim(),
        latest_message_at: initialMessage.created_at
      }
    })

  } catch (error: any) {
    console.error('💥 === POST GLOBAL EXCEPTION ===')
    console.error('Exception:', error.message)
    console.error('Stack:', error.stack)
    
    return NextResponse.json({ 
      error: 'Unexpected server error',
      debug: { exception: error.message }
    }, { status: 500 })
  }
}
