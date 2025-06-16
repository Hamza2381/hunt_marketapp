"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "./use-auth"
import { supabase } from "@/lib/supabase-client"

export interface ChatMessage {
  id: number
  conversation_id: number
  sender_id: string
  message: string
  is_admin: boolean
  read: boolean
  created_at: string
  sender?: {
    name: string
    email: string
    is_admin: boolean
  }
}

export interface ChatConversation {
  id: number
  user_id: string
  subject?: string
  status: "open" | "closed" | "pending"
  priority: "low" | "medium" | "high" | "urgent"
  created_at: string
  updated_at: string
  user_profile?: {
    id: string
    name: string
    email: string
    account_type: string
    company_name?: string
    is_admin: boolean
  }
  messages: ChatMessage[]
  unread_count: number
  latest_message: string
  latest_message_at: string
}

export function useChat(selectedConversationId?: number | null) {
  const { user, session, isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  
  // Refs to prevent race conditions and enable caching
  const subscriptionsRef = useRef<any[]>([])
  const isUpdatingRef = useRef(false)
  const conversationCacheRef = useRef<Map<number, ChatMessage[]>>(new Map())
  const selectedConversationRef = useRef<number | null>(null)
  
  // Update the ref whenever selectedConversationId changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversationId
  }, [selectedConversationId])

  // Get authorization header
  const getAuthHeaders = useCallback(() => {
    if (!session?.access_token) {
      console.error('getAuthHeaders: No access token available')
      throw new Error('No authentication token available')
    }
    console.log('getAuthHeaders: Token available, length:', session.access_token.length)
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }, [session])

  // Optimized conversation fetcher with intelligent caching
  const fetchConversations = useCallback(async (filters?: { status?: string; priority?: string }, preserveMessages = false, forceRefresh = false) => {
    if (!user || !session || !isInitialized) {
      console.log('fetchConversations: Not ready', { user: !!user, session: !!session, isInitialized })
      return
    }

    // Only fetch for non-admin users (customers)
    if (user.isAdmin) {
      console.log('fetchConversations: Skipping for admin user')
      return
    }

    // Check if we should use cache (don't fetch if data is fresh and not forced)
    const now = Date.now()
    const cacheDuration = 30000 // 30 seconds cache
    if (!forceRefresh && (now - lastFetchTime) < cacheDuration && conversations.length > 0) {
      console.log('fetchConversations: Using cached data, skipping fetch')
      return
    }

    // Prevent concurrent updates
    if (isUpdatingRef.current) {
      console.log('fetchConversations: Update already in progress, skipping')
      return
    }

    isUpdatingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      console.log('fetchConversations: Starting fetch for user:', user.email)
      
      const url = new URL('/api/chat/conversations', window.location.origin)
      if (filters?.status && filters.status !== 'all') {
        url.searchParams.set('status', filters.status)
      }
      if (filters?.priority && filters.priority !== 'all') {
        url.searchParams.set('priority', filters.priority)
      }

      console.log('fetchConversations: Making request to:', url.toString())
      console.log('fetchConversations: Auth token available:', !!session?.access_token)
      
      const response = await fetch(url.toString(), {
        headers: getAuthHeaders()
      })

      console.log('fetchConversations: Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        // Try to get more detailed error info
        let errorMessage = `Failed to fetch conversations: ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
          console.log('fetchConversations: Error response:', errorData)
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('fetchConversations: Response data:', data)
      
      if (data.success) {
        const newConversations = data.conversations || []
        
        if (preserveMessages) {
          // Preserve existing messages when updating conversations
          setConversations(prevConversations => {
            return newConversations.map((newConv: ChatConversation) => {
              const existingConv = prevConversations.find(conv => conv.id === newConv.id)
              if (existingConv && existingConv.messages && existingConv.messages.length > 0) {
                // Keep existing messages and update cache
                conversationCacheRef.current.set(newConv.id, existingConv.messages)
                return {
                  ...newConv,
                  messages: existingConv.messages
                }
              }
              // Check cache for messages
              const cachedMessages = conversationCacheRef.current.get(newConv.id)
              if (cachedMessages) {
                return {
                  ...newConv,
                  messages: cachedMessages
                }
              }
              return newConv
            })
          })
        } else {
          setConversations(newConversations)
        }
        
        setLastFetchTime(now)
        console.log('fetchConversations: Set conversations:', newConversations?.length || 0)
      } else {
        throw new Error(data.error || 'Failed to fetch conversations')
      }
    } catch (err: any) {
      console.error('fetchConversations: Error:', err.message)
      setError(err.message)
      if (!preserveMessages) {
        setConversations([])
      }
    } finally {
      setIsLoading(false)
      isUpdatingRef.current = false
    }
  }, [user, session, isInitialized, getAuthHeaders])

  // Initialize chat system after auth is stable (only for non-admin users)
  useEffect(() => {
    if (isAuthenticated && user && session) {
      // Don't initialize chat system for admin users
      if (user.isAdmin) {
        console.log('Skipping chat initialization for admin user:', user.email)
        return
      }
      
      // Only initialize if not already initialized
      if (!isInitialized) {
        console.log('Initializing chat system for user:', user.email)
        setIsInitialized(true)
      }
    } else {
      if (isInitialized) {
        console.log('User logged out, clearing chat state')
        setIsInitialized(false)
        setConversations([])
        setError(null)
        // Clean up subscriptions
        subscriptionsRef.current.forEach(channel => {
          supabase.removeChannel(channel)
        })
        subscriptionsRef.current = []
      }
    }
  }, [isAuthenticated, user, session, isInitialized])

  // Define refreshConversations function first
  const refreshConversations = useCallback((filters?: { status?: string; priority?: string }, forceRefresh = false) => {
    if (isInitialized) {
      fetchConversations(filters, true, forceRefresh) // Preserve messages when refreshing
    }
  }, [fetchConversations, isInitialized])

  // Load conversations when initialized
  useEffect(() => {
    if (isInitialized && user && session) {
      fetchConversations()
    }
  }, [isInitialized, fetchConversations])

  // Deduplicate conversations whenever they change
  useEffect(() => {
    setConversations(prevConversations => {
      const uniqueIds = new Set()
      const deduplicatedConversations = prevConversations.filter(conv => {
        if (uniqueIds.has(conv.id)) {
          console.log('Removing duplicate conversation:', conv.id)
          return false
        }
        uniqueIds.add(conv.id)
        return true
      })
      
      if (deduplicatedConversations.length !== prevConversations.length) {
        console.log('Deduplicated conversations:', prevConversations.length, '→', deduplicatedConversations.length)
        return deduplicatedConversations
      }
      
      return prevConversations
    })
  }, [conversations.length])

  // Enhanced real-time subscriptions with better message handling
  useEffect(() => {
    if (!isInitialized || !user || !session) {
      console.log('🔄 Customer: Not setting up subscriptions yet:', { isInitialized, user: !!user, session: !!session })
      return
    }

    console.log('🔄 Customer: Setting up real-time subscriptions for user:', user.email, 'ID:', user.id)

    // Clean up existing subscriptions
    subscriptionsRef.current.forEach(channel => {
      console.log('🔌 Customer: Removing existing channel')
      supabase.removeChannel(channel)
    })
    subscriptionsRef.current = []

    // Create a single channel for real-time updates
    const channel = supabase
      .channel(`customer-chat-${user.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: `customer-${user.id}` }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('💬 Customer: Real-time message received:', payload.new)
          
          const newMessage = payload.new as any
          
          // Only process messages that are NOT from the current user
          if (newMessage.sender_id === user.id) {
            console.log('💬 Customer: Ignoring own message (already handled optimistically)')
            return
          }
          
          // Only process admin messages (for customer)
          if (!newMessage.is_admin) {
            console.log('💬 Customer: Ignoring non-admin message')
            return
          }

          console.log('💬 Customer: Processing admin message for conversation:', newMessage.conversation_id)

          // Add the message to the conversation immediately
          setConversations(prevConversations => {
            console.log('💬 Customer: Current conversations:', prevConversations.length)
            return prevConversations.map(conv => {
              if (conv.id === newMessage.conversation_id) {
                console.log('💬 Customer: Found matching conversation:', conv.id)
                
                // Check if message already exists
                const messageExists = conv.messages.some(msg => msg.id === newMessage.id)
                if (messageExists) {
                  console.log('💬 Customer: Message already exists, skipping')
                  return conv
                }

                console.log('💬 Customer: Adding new admin message to conversation', conv.id)

                const updatedMessages = [...conv.messages, {
                  ...newMessage,
                  sender: {
                    name: 'Admin',
                    email: 'admin@example.com',
                    is_admin: true
                  }
                }]

                // Update cache with new message
                conversationCacheRef.current.set(conv.id, updatedMessages)

                // Check if this conversation is currently selected/active
                const isConversationActive = selectedConversationRef.current === conv.id
                console.log('💬 Customer: Is conversation active?', isConversationActive, 'Selected:', selectedConversationRef.current)
                
                // If conversation is active, don't increment unread count and auto-mark as read
                let newUnreadCount = conv.unread_count || 0
                let shouldAutoMarkRead = false
                
                if (isConversationActive) {
                  // Auto-mark as read if conversation is currently open
                  console.log('💬 Customer: Auto-marking as read (conversation is active)')
                  newUnreadCount = 0
                  shouldAutoMarkRead = true
                } else {
                  // Increment unread count if conversation is not active
                  console.log('💬 Customer: Incrementing unread count (conversation not active)')
                  newUnreadCount = newUnreadCount + 1
                }
                
                // Auto-mark as read on server (non-blocking) if needed
                if (shouldAutoMarkRead) {
                  setTimeout(async () => {
                    try {
                      if (!session?.access_token) return
                      const headers = {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                      }
                      await fetch(`/api/chat/conversations/${conv.id}/read`, {
                        method: 'POST',
                        headers
                      })
                      console.log('✅ Customer: Auto-marked conversation as read:', conv.id)
                    } catch (error) {
                      console.warn('⚠️ Customer: Failed to auto-mark conversation as read:', error)
                    }
                  }, 100)
                }

                return {
                  ...conv,
                  messages: updatedMessages,
                  latest_message: newMessage.message,
                  latest_message_at: newMessage.created_at,
                  updated_at: newMessage.created_at,
                  unread_count: newUnreadCount
                }
              }
              return conv
            })
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations'
        },
        (payload) => {
          console.log('📞 Customer: Conversation updated:', payload.new)
          
          const updatedConv = payload.new as any
          
          // Only update if it's user's conversation (for non-admin users)
          if (updatedConv.user_id !== user.id) {
            console.log('📞 Customer: Conversation not for this user, ignoring')
            return
          }
          
          setConversations(prevConversations => {
            return prevConversations.map(conv => {
              if (conv.id === updatedConv.id) {
                // Preserve existing messages when updating conversation metadata
                return {
                  ...conv,
                  ...updatedConv,
                  messages: conv.messages // Keep existing messages
                }
              }
              return conv
            })
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_conversations'
        },
        (payload) => {
          console.log('📞 Customer: New conversation:', payload.new)
          
          const newConv = payload.new as any
          
          // Only add if it's user's conversation (for non-admin users)
          if (newConv.user_id !== user.id) {
            console.log('📞 Customer: New conversation not for this user, ignoring')
            return
          }
          
          setConversations(prevConversations => {
            // Check if conversation already exists to prevent duplicates
            const exists = prevConversations.some(conv => conv.id === newConv.id)
            if (exists) {
              console.log('📞 Customer: Conversation already exists, skipping duplicate')
              return prevConversations
            }
            return [{ ...newConv, messages: [], unread_count: 0 }, ...prevConversations]
          })
        }
      )
      .subscribe((status, error) => {
        console.log('📡 Customer: Subscription status:', status)
        if (error) {
          console.error('📡 Customer: Subscription error:', error)
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ Customer: Real-time subscriptions active!')
        }
      })

    subscriptionsRef.current = [channel]

    return () => {
      console.log('🔌 Customer: Cleaning up real-time subscriptions')
      subscriptionsRef.current.forEach(ch => {
        supabase.removeChannel(ch)
      })
      subscriptionsRef.current = []
    }
  }, [isInitialized, user, session])



  const createConversation = async (subject: string, initialMessage: string): Promise<ChatConversation> => {
    if (!user || !session || !isInitialized) throw new Error("User must be authenticated")

    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          subject: subject.trim(),
          message: initialMessage.trim(),
          priority: 'medium'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        const newConversation = data.conversation
        
        console.log('✅ Customer: API returned conversation:', newConversation)
        console.log('✅ Customer: API returned messages:', newConversation.messages)
        
        // Ensure the conversation has the initial message
        if (newConversation.messages && newConversation.messages.length > 0) {
          // Cache the initial messages
          conversationCacheRef.current.set(newConversation.id, newConversation.messages)
          console.log('✅ Customer: Cached initial messages for conversation', newConversation.id)
        }
        
        // Add to local state with messages included
        setConversations(prev => {
          const exists = prev.some(conv => conv.id === newConversation.id)
          if (exists) {
            console.log('Conversation already exists, updating with messages')
            // Update existing conversation with messages
            return prev.map(conv => 
              conv.id === newConversation.id 
                ? { ...newConversation }
                : conv
            )
          }
          console.log('✅ Customer: Adding new conversation with', newConversation.messages?.length || 0, 'messages')
          return [newConversation, ...prev]
        })
        
        console.log('✅ Customer: New conversation created with messages:', newConversation.messages?.length || 0)
        return newConversation
      } else {
        throw new Error(data.error || 'Failed to create conversation')
      }
    } catch (error: any) {
      console.error('Error creating conversation:', error)
      throw error
    }
  }

  const sendMessage = async (conversationId: number, message: string): Promise<ChatMessage> => {
    if (!user || !session || !isInitialized) throw new Error("User must be authenticated")

    try {
      // Create optimistic message for immediate UI update
      const optimisticMessage: ChatMessage = {
        id: Date.now(), // Temporary ID
        conversation_id: conversationId,
        sender_id: user.id,
        message: message.trim(),
        is_admin: user.isAdmin || false,
        read: false,
        created_at: new Date().toISOString(),
        sender: {
          name: user.name || 'You',
          email: user.email || '',
          is_admin: user.isAdmin || false
        }
      }

      // Update UI immediately (optimistic update)
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          const updatedMessages = [...conv.messages, optimisticMessage]
          
          // Update cache with optimistic message
          conversationCacheRef.current.set(conversationId, updatedMessages)
          
          return {
            ...conv,
            messages: updatedMessages,
            latest_message: message.trim(),
            latest_message_at: optimisticMessage.created_at,
            updated_at: optimisticMessage.created_at
          }
        }
        return conv
      }))

      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: message.trim()
        })
      })

      if (!response.ok) {
        // Remove optimistic message on error
        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            const filteredMessages = conv.messages.filter(msg => msg.id !== optimisticMessage.id)
            
            // Update cache
            conversationCacheRef.current.set(conversationId, filteredMessages)
            
            return {
              ...conv,
              messages: filteredMessages
            }
          }
          return conv
        }))
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        const realMessage = data.message
        
        // Replace optimistic message with real message
        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            const updatedMessages = conv.messages.map(msg => 
              msg.id === optimisticMessage.id 
                ? { ...realMessage, sender: optimisticMessage.sender }
                : msg
            )
            
            // Update cache with real message
            conversationCacheRef.current.set(conversationId, updatedMessages)
            
            return {
              ...conv,
              messages: updatedMessages,
              latest_message: message.trim(),
              latest_message_at: realMessage.created_at,
              updated_at: realMessage.created_at
            }
          }
          return conv
        }))

        return realMessage
      } else {
        // Remove optimistic message on error
        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            const filteredMessages = conv.messages.filter(msg => msg.id !== optimisticMessage.id)
            
            // Update cache
            conversationCacheRef.current.set(conversationId, filteredMessages)
            
            return {
              ...conv,
              messages: filteredMessages
            }
          }
          return conv
        }))
        throw new Error(data.error || 'Failed to send message')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  const getConversationWithMessages = async (conversationId: number): Promise<ChatConversation | null> => {
    if (!user || !session || !isInitialized) return null

    try {
      console.log('🔧 Customer: Loading conversation with messages:', conversationId)
      
      // Always fetch fresh messages from API when conversation is selected
      // This ensures we get the complete message history, just like admin side
      console.log('🔧 Customer: Fetching fresh messages from API')
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        const conversation = data.conversation
        
        // Cache the messages for future real-time updates
        if (conversation.messages && conversation.messages.length > 0) {
          conversationCacheRef.current.set(conversationId, conversation.messages)
        }
        
        // Update local state with the complete conversation and clear unread count
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                messages: conversation.messages || [], 
                unread_count: 0 
              }
            : conv
        ))

        console.log('✅ Customer: Conversation loaded with', conversation.messages?.length || 0, 'messages')
        return conversation
      } else {
        throw new Error(data.error || 'Failed to fetch conversation')
      }
    } catch (error: any) {
      console.error('Customer: Error fetching conversation:', error)
      return null
    }
  }

  const updateConversationStatus = async (conversationId: number, status: "open" | "closed" | "pending") => {
    if (!user?.isAdmin || !isInitialized) throw new Error("Only admins can update conversation status")

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error(`Failed to update conversation: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId ? { ...conv, status } : conv
        ))
      } else {
        throw new Error(data.error || 'Failed to update conversation')
      }
    } catch (error: any) {
      console.error('Error updating conversation status:', error)
      throw error
    }
  }

  const updateConversationPriority = async (conversationId: number, priority: "low" | "medium" | "high" | "urgent") => {
    if (!user?.isAdmin || !isInitialized) throw new Error("Only admins can update conversation priority")

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ priority })
      })

      if (!response.ok) {
        throw new Error(`Failed to update conversation: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId ? { ...conv, priority } : conv
        ))
      } else {
        throw new Error(data.error || 'Failed to update conversation')
      }
    } catch (error: any) {
      console.error('Error updating conversation priority:', error)
      throw error
    }
  }

  const markAsRead = async (conversationId: number) => {
    if (!user || !session || !isInitialized) return

    // Clear unread count immediately in local state
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
    ))

    try {
      console.log('🔧 Customer: Marking conversation as read:', conversationId)
      
      const response = await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        console.log('✅ Customer: Conversation marked as read on server')
      } else {
        console.warn('⚠️ Customer: Failed to mark as read on server:', response.status)
      }
    } catch (error) {
      console.error('Customer: Error marking conversation as read:', error)
    }
  }

  const deleteConversation = async (conversationId: number, deleteType?: 'permanent' | 'admin_archive') => {
    if (!user || !session || !isInitialized) throw new Error("User must be authenticated")

    try {
      console.log('🗑️ Delete conversation:', { conversationId, deleteType, isAdmin: user.isAdmin })
      
      const headers = getAuthHeaders()
      const response = await fetch(`/api/chat/conversations/${conversationId}/delete`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ deleteType })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to delete conversation: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        // Remove conversation from local state immediately
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        
        console.log('✅ Conversation deleted successfully:', data.message)
        return data
      } else {
        throw new Error(data.error || 'Failed to delete conversation')
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error)
      throw error
    }
  }

  const getUnreadCount = (): number => {
    return conversations.reduce((total, conv) => total + conv.unread_count, 0)
  }

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    sendMessage,
    getConversationWithMessages,
    updateConversationStatus,
    updateConversationPriority,
    markAsRead,
    getUnreadCount,
    deleteConversation,
    refreshConversations
  }
}
