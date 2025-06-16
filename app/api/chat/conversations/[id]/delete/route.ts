import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 === DELETE CONVERSATION API DEBUG START ===')
  
  try {
    const conversationId = parseInt(params.id)
    console.log('🔧 DELETE: Conversation ID:', conversationId)
    
    if (isNaN(conversationId)) {
      console.error('❌ Invalid conversation ID:', params.id)
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ DELETE: No auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('🔧 DELETE: Verifying token...')
    
    // Verify token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.log('❌ DELETE Auth error:', authError?.message)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ DELETE: User authenticated:', user.id)

    // Get user profile to check admin status
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ DELETE: Profile error:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    console.log('✅ DELETE: User profile found, isAdmin:', userProfile.is_admin)

    // Check if conversation exists and get ownership info
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (conversationError) {
      console.error('❌ DELETE: Conversation error:', conversationError)
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    console.log('✅ DELETE: Conversation found, owner:', conversation.user_id)

    // Check permissions
    if (!userProfile.is_admin && conversation.user_id !== user.id) {
      console.error('❌ DELETE: Access denied')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get request body to determine delete type (for admin)
    const body = await request.json()
    const { deleteType } = body || {}

    console.log('🔧 DELETE: Request details:', {
      isAdmin: userProfile.is_admin,
      deleteType,
      conversationOwner: conversation.user_id,
      currentUser: user.id
    })

    let updateData: any = {
      deleted_at: new Date().toISOString()
    }

    if (userProfile.is_admin) {
      // Admin delete logic
      if (deleteType === 'permanent') {
        // Hard delete - remove from database completely
        console.log('🔧 DELETE: Admin performing permanent delete')
        
        // First delete all messages
        const { error: messagesDeleteError } = await supabaseAdmin
          .from('chat_messages')
          .delete()
          .eq('conversation_id', conversationId)

        if (messagesDeleteError) {
          console.error('❌ DELETE: Error deleting messages:', messagesDeleteError)
          return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 })
        }

        // Then delete the conversation
        const { error: conversationDeleteError } = await supabaseAdmin
          .from('chat_conversations')
          .delete()
          .eq('id', conversationId)

        if (conversationDeleteError) {
          console.error('❌ DELETE: Error deleting conversation:', conversationDeleteError)
          return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
        }

        console.log('✅ DELETE: Conversation permanently deleted')
        return NextResponse.json({
          success: true,
          message: 'Conversation permanently deleted',
          deleteType: 'permanent'
        })
      } else {
        // Archive from admin view only
        console.log('🔧 DELETE: Admin archiving conversation from dashboard')
        updateData.deleted_by_admin = true
      }
    } else {
      // User delete logic - hide from user view only
      if (deleteType === 'user_hide') {
        console.log('🔧 DELETE: User hiding conversation from their view')
        updateData.deleted_by_user = true
      } else {
        // Fallback for backward compatibility
        console.log('🔧 DELETE: User hiding conversation from their view (fallback)')
        updateData.deleted_by_user = true
      }
    }

    // Update conversation with soft delete flags
    const { error: updateError } = await supabaseAdmin
      .from('chat_conversations')
      .update(updateData)
      .eq('id', conversationId)

    if (updateError) {
      console.error('❌ DELETE: Update error:', updateError)
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    console.log('✅ DELETE: Conversation updated with delete flags')
    console.log('🎉 === DELETE CONVERSATION API SUCCESS ===')

    return NextResponse.json({
      success: true,
      message: userProfile.is_admin 
        ? (deleteType === 'permanent' ? 'Conversation permanently deleted' : 'Conversation archived from dashboard')
        : 'Conversation removed from your view',
      deleteType: userProfile.is_admin ? deleteType || 'admin_archive' : 'user_hide'
    })

  } catch (error: any) {
    console.error('💥 === DELETE CONVERSATION EXCEPTION ===')
    console.error('Exception:', error.message)
    console.error('Stack:', error.stack)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { exception: error.message }
    }, { status: 500 })
  }
}
