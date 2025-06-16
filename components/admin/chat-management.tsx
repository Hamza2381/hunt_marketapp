"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { MessageCircle, Send, Search, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, AlertTriangle, MoreVertical, Trash2, Archive } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

interface ChatManagementProps {
  user?: any
  isAdmin?: boolean
}

export function ChatManagement({ user: propUser, isAdmin: propIsAdmin }: ChatManagementProps = {}) {
  // Use prop user if provided, otherwise fall back to useAuth
  const authResult = useAuth()
  const user = propUser || authResult.user
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authResult.user?.isAdmin
  const { toast } = useToast()
  
  // ALL STATE HOOKS MUST BE DECLARED FIRST
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false)
  const [componentError, setComponentError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingArchived, setIsLoadingArchived] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [archivedConversations, setArchivedConversations] = useState<any[]>([])
  const [conversationsLoaded, setConversationsLoaded] = useState(false)
  const [archivedLoaded, setArchivedLoaded] = useState(false)
  const [pendingDeletes, setPendingDeletes] = useState<Map<number, { type: 'permanent' | 'admin_archive'; timestamp: number }>>(new Map())
  
  // Refs for real-time subscriptions and preventing race conditions
  const subscriptionsRef = useRef<any[]>([])
  const isUpdatingRef = useRef(false)
  const selectedConversationRef = useRef<number | null>(null)
  
  // Update the ref whenever selectedConversation changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation
  }, [selectedConversation])

  // Mount effect to prevent SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Choose which conversations to show based on archive view
  const displayConversations = showArchived ? archivedConversations : conversations
  
  // Clear selection if selected conversation is not in current view
  useEffect(() => {
    if (selectedConversation && !displayConversations.find(conv => conv.id === selectedConversation)) {
      setSelectedConversation(null)
    }
  }, [showArchived, displayConversations, selectedConversation])

  // Get session token for API calls
  const getAuthHeaders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    } catch (error) {
      console.error('Error getting auth headers:', error)
      throw new Error('Authentication failed')
    }
  }

  // Enhanced fetch conversations with message preservation
  const fetchConversations = async (filters?: { status?: string; priority?: string }, preserveMessages = false, force = false) => {
    if (!isAdmin || !user) return

    // Only fetch if not already loaded or forced refresh
    if (conversationsLoaded && !force) {
      console.log('Conversations already loaded, skipping fetch')
      return
    }

    if (isUpdatingRef.current) {
      console.log('Fetch already in progress, skipping')
      return
    }

    isUpdatingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Admin fetching conversations', { preserveMessages, selectedConversation, force })
      
      const url = new URL('/api/chat/conversations', window.location.origin)
      if (filters?.status && filters.status !== 'all') {
        url.searchParams.set('status', filters.status)
      }
      if (filters?.priority && filters.priority !== 'all') {
        url.searchParams.set('priority', filters.priority)
      }

      const headers = await getAuthHeaders()
      const response = await fetch(url.toString(), { headers })

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ Conversations fetched:', data)
      
      if (data.success) {
        const newConversations = data.conversations || []
        
        if (preserveMessages) {
          // Preserve existing messages when updating
          setConversations(prevConversations => {
            return newConversations.map((newConv: any) => {
              const existingConv = prevConversations.find(conv => conv.id === newConv.id)
              if (existingConv && existingConv.messages && existingConv.messages.length > 0) {
                return {
                  ...newConv,
                  messages: existingConv.messages
                }
              }
              return newConv
            })
          })
        } else {
          setConversations(newConversations)
        }
        
        setConversationsLoaded(true) // Mark as loaded
        console.log('✅ Admin conversations updated:', newConversations.length)
      } else {
        throw new Error(data.error || 'Failed to fetch conversations')
      }
    } catch (err: any) {
      console.error('❌ Error fetching conversations:', err.message)
      setError(err.message)
      if (!preserveMessages) {
        setConversations([])
      }
    } finally {
      setIsLoading(false)
      isUpdatingRef.current = false
    }
  }

  // Fetch archived conversations
  const fetchArchivedConversations = async (force = false) => {
    if (!isAdmin || !user) return

    // Only fetch if not already loaded or forced refresh
    if (archivedLoaded && !force) {
      console.log('Archived conversations already loaded, skipping fetch')
      return
    }

    setIsLoadingArchived(true) // Use separate loading state for archived conversations
    try {
      console.log('📁 Admin fetching archived conversations', { force })
      
      const url = new URL('/api/chat/conversations', window.location.origin)
      url.searchParams.set('archived', 'true') // Special parameter for archived conversations

      const headers = await getAuthHeaders()
      const response = await fetch(url.toString(), { headers })

      if (!response.ok) {
        throw new Error(`Failed to fetch archived conversations: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ Archived conversations fetched:', data)
      
      if (data.success) {
        setArchivedConversations(data.conversations || [])
        setArchivedLoaded(true) // Mark as loaded
        console.log('✅ Admin archived conversations updated:', data.conversations?.length || 0)
      } else {
        throw new Error(data.error || 'Failed to fetch archived conversations')
      }
    } catch (err: any) {
      console.error('❌ Error fetching archived conversations:', err.message)
      toast({
        title: "Error",
        description: "Failed to load archived conversations.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingArchived(false) // Always clear archived loading state
    }
  }

  // Setup real-time subscriptions for admin
  useEffect(() => {
    if (!mounted || !isAdmin || !user) return

    console.log('🔄 Setting up admin real-time subscriptions')

    // Clean up existing subscriptions
    subscriptionsRef.current.forEach(channel => {
      supabase.removeChannel(channel)
    })
    subscriptionsRef.current = []

    // Create admin channel for real-time updates
    const adminChannel = supabase
      .channel(`admin-chat-${user.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: `admin-${user.id}` }
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
          console.log('💬 Admin: Real-time message received:', payload.new)
          
          const newMessage = payload.new as any
          
          // Skip if this is our own message (already handled optimistically)
          if (newMessage.sender_id === user.id) {
            console.log('💬 Admin: Ignoring own message')
            return
          }
          
          // Add message to the conversation immediately
          setConversations(prevConversations => {
            return prevConversations.map(conv => {
              if (conv.id === newMessage.conversation_id) {
                // Check for duplicates
                const messageExists = conv.messages?.some((msg: any) => msg.id === newMessage.id)
                if (messageExists) {
                  console.log('💬 Admin: Message already exists, skipping')
                  return conv
                }

                console.log('💬 Admin: Adding message to conversation', conv.id)

                const updatedMessages = [...(conv.messages || []), {
                  ...newMessage,
                  sender: {
                    name: newMessage.is_admin ? 'Admin' : conv.user_profile?.name || 'Customer',
                    email: newMessage.is_admin ? 'admin@example.com' : conv.user_profile?.email || 'customer@example.com',
                    is_admin: newMessage.is_admin
                  }
                }]

                // Check if this conversation is currently selected/active
                const isConversationActive = selectedConversationRef.current === conv.id
                
                // If conversation is active, don't increment unread count and auto-mark as read
                let newUnreadCount = conv.unread_count || 0
                if (!newMessage.is_admin) { // Only for customer messages to admin
                  if (isConversationActive) {
                    // Auto-mark as read if conversation is currently open
                    newUnreadCount = 0
                    
                    // Also mark as read on server (non-blocking)
                    setTimeout(async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession()
                        if (!session?.access_token) return
                        
                        const headers = {
                          'Authorization': `Bearer ${session.access_token}`,
                          'Content-Type': 'application/json'
                        }
                        
                        await fetch(`/api/chat/conversations/${conv.id}/read`, {
                          method: 'POST',
                          headers
                        })
                        
                        console.log('✅ Admin: Auto-marked conversation as read:', conv.id)
                      } catch (error) {
                        console.warn('⚠️ Admin: Failed to auto-mark conversation as read:', error)
                      }
                    }, 100)
                  } else {
                    // Increment unread count if conversation is not active
                    newUnreadCount = newUnreadCount + 1
                  }
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
          console.log('📞 Admin: Conversation updated:', payload.new)
          
          const updatedConv = payload.new as any
          
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
        async (payload) => {
          console.log('📞 Admin: New conversation:', payload.new)
          
          const newConv = payload.new as any
          
          // Fetch user profile for the new conversation
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) return
            
            const headers = {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
            
            // Fetch user profile for this conversation
            const response = await fetch(`/api/admin/users/${newConv.user_id}`, {
              headers
            })
            
            let userProfile = null
            if (response.ok) {
              const userData = await response.json()
              if (userData.success) {
                userProfile = {
                  id: userData.user.id,
                  name: userData.user.name,
                  email: userData.user.email,
                  is_admin: userData.user.is_admin || false
                }
                console.log('✅ Admin: Fetched user profile for new conversation:', userProfile)
              }
            }
            
            // If API fails, try direct Supabase query as fallback
            if (!userProfile) {
              console.log('📞 Admin: API failed, trying direct Supabase query')
              const { data: profileData } = await supabase
                .from('user_profiles')
                .select('id, name, email, is_admin')
                .eq('id', newConv.user_id)
                .single()
              
              if (profileData) {
                userProfile = profileData
                console.log('✅ Admin: Fetched user profile via Supabase:', userProfile)
              }
            }
            
            setConversations(prevConversations => {
              // Check if conversation already exists to prevent duplicates
              const exists = prevConversations.some(conv => conv.id === newConv.id)
              if (exists) {
                console.log('📞 Admin: Conversation already exists, skipping duplicate')
                return prevConversations
              }
              
              // For new conversations, there should be at least 1 unread message (the initial message)
              // since the admin hasn't seen it yet
              const initialUnreadCount = 1
              
              const conversationWithProfile = {
                ...newConv, 
                messages: [], 
                unread_count: initialUnreadCount, // Set initial unread count
                user_profile: userProfile || {
                  id: newConv.user_id,
                  name: 'Unknown User',
                  email: 'unknown@example.com',
                  is_admin: false
                }
              }
              
              console.log('📞 Admin: Adding new conversation with profile and unread count:', conversationWithProfile)
              return [conversationWithProfile, ...prevConversations]
            })
          } catch (error) {
            console.error('📞 Admin: Error fetching user profile for new conversation:', error)
            
            // Fallback: add conversation without profile (will show Unknown User)
            setConversations(prevConversations => {
              const exists = prevConversations.some(conv => conv.id === newConv.id)
              if (exists) {
                return prevConversations
              }
              
              // For new conversations, there should be at least 1 unread message (the initial message)
              const initialUnreadCount = 1
              
              return [{ 
                ...newConv, 
                messages: [], 
                unread_count: initialUnreadCount, // Set initial unread count
                user_profile: {
                  id: newConv.user_id,
                  name: 'Unknown User',
                  email: 'unknown@example.com',
                  is_admin: false
                }
              }, ...prevConversations]
            })
          }
        }
      )
      .subscribe((status, error) => {
        console.log('📡 Admin subscription status:', status)
        if (error) {
          console.error('📡 Admin subscription error:', error)
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ Admin real-time subscriptions active!')
        }
      })

    subscriptionsRef.current = [adminChannel]

    // Don't auto-fetch on mount - let user click the tab to load data
    console.log('✅ Admin real-time subscriptions set up - waiting for user to access chat tab')

    return () => {
      console.log('🔌 Cleaning up admin real-time subscriptions')
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      subscriptionsRef.current = []
    }
  }, [mounted, isAdmin, user?.email])

  // Load conversations only when component is first accessed
  useEffect(() => {
    if (mounted && isAdmin && user && !conversationsLoaded) {
      console.log('🔄 First time accessing chat tab - loading conversations')
      fetchConversations({ status: statusFilter, priority: priorityFilter })
    }
  }, [mounted, isAdmin, user, conversationsLoaded, statusFilter, priorityFilter])

  // Debug logging for admin chat
  console.log('🛠️ ChatManagement render:', {
    user: user ? { email: user.email, isAdmin: user.isAdmin } : null,
    conversationsCount: conversations.length,
    isLoading,
    error,
    componentError,
    mounted,
    isAdmin
  })

  // Wait for component to mount before checking auth
  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
          <h3 className="text-lg font-medium mb-2">Loading Chat Management</h3>
          <p className="text-gray-500">Initializing...</p>
        </CardContent>
      </Card>
    )
  }

  const filteredConversations = displayConversations.filter((conv) => {
    // Don't filter out conversations without user_profile - just handle gracefully
    const userName = conv.user_profile?.name || 'Unknown User'
    const userEmail = conv.user_profile?.email || 'unknown@example.com'
    
    const matchesSearch =
      (conv.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  // Only show for admin users
  if (!isAdmin) {
    console.log('❌ ChatManagement: Access denied - user is not admin', { isAdmin, user: user ? { email: user.email } : null })
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Access Denied</h3>
          <p className="text-gray-500">Admin privileges required to access chat management.</p>
        </CardContent>
      </Card>
    )
  }

  // Show component error if any
  if (componentError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium mb-2 text-red-600">Component Error</h3>
          <p className="text-red-500 mb-4">{componentError}</p>
          <Button onClick={() => {
            setComponentError(null)
            fetchConversations()
          }}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const selectedConv = displayConversations.find((conv) => conv.id === selectedConversation)
  
  // Debug logging for selected conversation
  console.log('🛮 Selected conversation debug:', {
    selectedConversation,
    selectedConv: selectedConv ? {
      id: selectedConv.id,
      subject: selectedConv.subject,
      messagesCount: selectedConv.messages?.length || 0,
      hasMessages: !!(selectedConv.messages && selectedConv.messages.length > 0),
      messages: selectedConv.messages?.map(m => ({ id: m.id, message: m.message?.substring(0, 50) })) || []
    } : null,
    totalConversations: conversations.length,
    isLoadingConversation
  })

  const stats = {
    total: displayConversations.length,
    open: displayConversations.filter((c) => c.status === "open").length,
    pending: displayConversations.filter((c) => c.status === "pending").length,
    closed: displayConversations.filter((c) => c.status === "closed").length,
    unread: displayConversations.reduce((total, conv) => total + (conv.unread_count || 0), 0),
  }

  // Enhanced send message with optimistic updates
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSendingMessage) return

    setIsSendingMessage(true)

    try {
      // Create optimistic message for immediate UI update
      const optimisticMessage = {
        id: Date.now(), // Temporary ID
        conversation_id: selectedConversation,
        sender_id: user.id,
        message: newMessage.trim(),
        is_admin: true,
        read: false,
        created_at: new Date().toISOString(),
        sender: {
          name: user?.name || 'Admin',
          email: user?.email || 'admin@example.com',
          is_admin: true
        }
      }

      // Clear input immediately
      const messageToSend = newMessage.trim()
      setNewMessage("")

      // Update UI immediately (optimistic update)
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv.id === selectedConversation) {
            const newMessages = [...(conv.messages || []), optimisticMessage]
            return {
              ...conv,
              messages: newMessages,
              latest_message: messageToSend,
              latest_message_at: optimisticMessage.created_at,
              updated_at: optimisticMessage.created_at
            }
          }
          return conv
        })
      )

      // Send to API
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/chat/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: messageToSend })
      })

      if (!response.ok) {
        // Remove optimistic message on error
        setConversations(prevConversations => 
          prevConversations.map(conv => {
            if (conv.id === selectedConversation) {
              return {
                ...conv,
                messages: (conv.messages || []).filter((msg: any) => msg.id !== optimisticMessage.id)
              }
            }
            return conv
          })
        )
        
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to send message`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Replace optimistic message with real message
        const realMessage = data.message
        setConversations(prevConversations => 
          prevConversations.map(conv => {
            if (conv.id === selectedConversation) {
              const updatedMessages = (conv.messages || []).map((msg: any) => 
                msg.id === optimisticMessage.id 
                  ? { ...realMessage, sender: optimisticMessage.sender }
                  : msg
              )
              return {
                ...conv,
                messages: updatedMessages,
                latest_message: messageToSend,
                latest_message_at: realMessage.created_at,
                updated_at: realMessage.created_at
              }
            }
            return conv
          })
        )
        
        toast({
          title: "Message sent",
          description: "Your reply has been sent to the customer.",
          duration: 1500, // 1.5 seconds
        })
        
        console.log('✅ Admin message sent successfully')
      } else {
        throw new Error(data.error || 'Failed to send message')
      }
    } catch (error: any) {
      console.error('Send message error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      })
      
      // Restore the message in the input on error
      setNewMessage(messageToSend)
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!selectedConversation || isUpdatingStatus) return

    setIsUpdatingStatus(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/chat/conversations/${selectedConversation}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update status`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Update local state
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === selectedConversation 
              ? { ...conv, status }
              : conv
          )
        )
        
        toast({
          title: "Status updated",
          description: `Conversation status changed to ${status}.`,
          duration: 1500, // 1.5 seconds
        })
      } else {
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (error: any) {
      console.error('Update status error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handlePriorityChange = async (priority: string) => {
    if (!selectedConversation || isUpdatingPriority) return

    setIsUpdatingPriority(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/chat/conversations/${selectedConversation}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ priority })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update priority`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Update local state
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === selectedConversation 
              ? { ...conv, priority }
              : conv
          )
        )
        
        toast({
          title: "Priority updated",
          description: `Conversation priority changed to ${priority}.`,
          duration: 1500, // 1.5 seconds
        })
      } else {
        throw new Error(data.error || 'Failed to update priority')
      }
    } catch (error: any) {
      console.error('Update priority error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update priority. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingPriority(false)
    }
  }

  const handleDeleteConversation = (conversationId: number, type: 'permanent' | 'admin_archive') => {
    if (type === 'permanent') {
      // For permanent delete, show inline confirmation (non-blocking)
      const newPendingDeletes = new Map(pendingDeletes)
      newPendingDeletes.set(conversationId, { type, timestamp: Date.now() })
      setPendingDeletes(newPendingDeletes)
      
      // Auto-cancel after 10 seconds to prevent UI clutter
      setTimeout(() => {
        setPendingDeletes(prev => {
          const updated = new Map(prev)
          updated.delete(conversationId)
          return updated
        })
      }, 10000)
    } else {
      // For archive, proceed immediately without confirmation
      executeDeleteConversation(conversationId, type)
    }
  }

  const executeDeleteConversation = (conversationId: number, type: 'permanent' | 'admin_archive') => {
    // Store the data we need immediately
    const conversationToRemove = displayConversations.find(conv => conv.id === conversationId)
    
    if (!conversationToRemove) return
    
    console.log(`🔴 EXECUTING ${type.toUpperCase()} DELETE - ${type === 'permanent' ? 'After confirmation' : 'Direct action'}`)
    
    // Clear from pending deletes if it was there
    setPendingDeletes(prev => {
      const updated = new Map(prev)
      updated.delete(conversationId)
      return updated
    })
    
    // Remove from UI immediately
    if (showArchived) {
      setArchivedConversations(prevConversations => 
        prevConversations.filter(conv => conv.id !== conversationId)
      )
    } else {
      setConversations(prevConversations => 
        prevConversations.filter(conv => conv.id !== conversationId)
      )
    }
    
    // If archived, add to archived list immediately
    if (type === 'admin_archive' && !showArchived) {
      setArchivedConversations(prev => [conversationToRemove, ...prev])
    }
    
    // If the deleted conversation was selected, clear selection
    if (conversationId === selectedConversation) {
      setSelectedConversation(null)
    }
    
    // Show immediate feedback
    toast({
      title: type === 'permanent' ? "Conversation deleted" : "Conversation archived",
      description: type === 'permanent' 
        ? "Conversation has been permanently deleted."
        : "Conversation has been archived from your dashboard.",
      duration: 2000,
    })
    
    // Fire and forget API call
    setTimeout(async () => {
      try {
        console.log('🔴 MAKING API CALL')
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/chat/conversations/${conversationId}/delete`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ deleteType: type })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Request failed`)
        }

        const data = await response.json()
        
        if (data.success) {
          console.log('✅ Admin: Server operation completed:', data.message)
        } else {
          throw new Error(data.error || 'Server operation failed')
        }
      } catch (error: any) {
        console.error('❌ Admin: Server operation failed:', error)
        
        // Rollback on error
        if (showArchived) {
          setArchivedConversations(prevConversations => 
            [conversationToRemove, ...prevConversations]
          )
        } else {
          setConversations(prevConversations => 
            [conversationToRemove, ...prevConversations]
          )
        }
        
        if (type === 'admin_archive' && !showArchived) {
          setArchivedConversations(prev => 
            prev.filter(conv => conv.id !== conversationId)
          )
        }
        
        toast({
          title: "Operation Failed",
          description: "Server error - conversation has been restored.",
          variant: "destructive",
          duration: 3000,
        })
      }
    }, 100)
  }

  const confirmDeleteConversation = (conversationId: number) => {
    const pending = pendingDeletes.get(conversationId)
    if (!pending) return
    
    executeDeleteConversation(conversationId, pending.type)
  }

  const cancelDeleteConversation = (conversationId: number) => {
    setPendingDeletes(prev => {
      const updated = new Map(prev)
      updated.delete(conversationId)
      return updated
    })
  }

  const handleUnarchiveConversation = async (conversationId: number) => {
    const conversationToUnarchive = archivedConversations.find(conv => conv.id === conversationId)
    
    if (!conversationToUnarchive) return
    
    // 1. IMMEDIATE UI UPDATES - Completely synchronous
    setArchivedConversations(prev => prev.filter(conv => conv.id !== conversationId))
    setConversations(prev => [conversationToUnarchive, ...prev])
    
    toast({
      title: "Conversation unarchived",
      description: "Conversation has been restored to your dashboard.",
      duration: 2000,
    })
    
    // 2. FIRE AND FORGET API CALL - Completely asynchronous, no blocking
    setTimeout(async () => {
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/chat/conversations/${conversationId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ 
            deleted_by_admin: false,
            deleted_at: null 
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to unarchive conversation')
        }
        
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to unarchive')
        }
        
        console.log('✅ Conversation unarchived successfully')
      } catch (error: any) {
        console.error('❌ Unarchive failed:', error)
        
        // Rollback on error
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        setArchivedConversations(prev => [conversationToUnarchive, ...prev])
        
        toast({
          title: "Unarchive Failed",
          description: "Failed to unarchive conversation.",
          variant: "destructive",
          duration: 3000,
        })
      }
    }, 0) // Execute immediately but asynchronously
  }

  // Load messages for a specific conversation
  const loadConversationMessages = async (conversationId: number) => {
    try {
      console.log('🔧 Admin: Loading messages for conversation:', conversationId)
      
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        headers
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Always update with fresh messages from API
        const updateConversations = (prevConversations: any[]) => 
          prevConversations.map(conv => 
            conv.id === conversationId 
              ? { ...conv, messages: data.messages || [], unread_count: 0 }
              : conv
          )
        
        // Update the appropriate conversation list
        if (showArchived) {
          setArchivedConversations(updateConversations)
        } else {
          setConversations(updateConversations)
        }
        
        console.log('✅ Admin: Messages loaded:', data.messages?.length || 0)
        return data.messages || []
      } else {
        throw new Error(data.error || 'Failed to load messages')
      }
    } catch (error: any) {
      console.error('Admin: Load messages error:', error)
      throw error
    }
  }

  // Mark conversation messages as read
  const markConversationAsRead = async (conversationId: number) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        headers
      })

      if (response.ok) {
        console.log('✅ Conversation marked as read')
      } else {
        console.warn('⚠️ Failed to mark conversation as read:', response.status)
      }
    } catch (error: any) {
      console.warn('⚠️ Error marking conversation as read:', error.message)
      // Fail silently - this is not critical functionality
    }
  }

  const handleConversationClick = async (conversationId: number) => {
    if (conversationId === selectedConversation) return

    console.log('🔧 Admin: Conversation clicked:', conversationId)
    
    setSelectedConversation(conversationId)
    setIsLoadingConversation(true)
    
    // Clear unread count immediately in UI
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unread_count: 0 }
          : conv
      )
    )
    
    try {
      // Always load fresh messages from API
      await loadConversationMessages(conversationId)
      
      // Mark as read on server
      markConversationAsRead(conversationId)
      
      console.log('✅ Admin: Conversation loaded and marked as read')
    } catch (error: any) {
      console.error('Admin: Conversation click error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load conversation.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-700 bg-red-100"
      case "high":
        return "text-red-600 bg-red-50"
      case "medium":
        return "text-yellow-600 bg-yellow-50"
      case "low":
        return "text-green-600 bg-green-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "closed":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <MessageCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
          Debug: {conversations.length} conversations loaded, Admin: {isAdmin ? 'Yes' : 'No'}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Chats</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open</p>
                <p className="text-2xl font-bold text-red-600">{stats.open}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Closed</p>
                <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-purple-600">{stats.unread}</p>
              </div>
              <Badge className="h-8 w-8 rounded-full p-0 flex items-center justify-center">{stats.unread}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="h-[600px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  {showArchived ? 'Archived Conversations' : 'All Support Conversations'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showArchived ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowArchived(!showArchived)
                      setSelectedConversation(null) // Clear selection when switching views
                      if (!showArchived && !archivedLoaded) {
                        // Only fetch archived conversations if not already loaded
                        fetchArchivedConversations()
                      }
                    }}
                  >
                    {showArchived ? 'Show All Chats' : 'Show Archived'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (showArchived) {
                        fetchArchivedConversations(true) // Force refresh
                      } else {
                        fetchConversations({ status: statusFilter, priority: priorityFilter }, true, true) // Force refresh
                      }
                    }}
                    disabled={showArchived ? isLoadingArchived : isLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", (showArchived ? isLoadingArchived : isLoading) && "animate-spin")} />
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {(showArchived ? isLoadingArchived : isLoading) ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                    <p className="text-gray-500">
                      {showArchived ? 'Loading archived conversations...' : 'Loading conversations...'}
                    </p>
                  </div>
                ) : error ? (
                  <div className="p-4 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500 opacity-50" />
                    <p className="text-red-500">{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4" 
                      onClick={() => showArchived ? fetchArchivedConversations(true) : fetchConversations({}, false, true)}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {showArchived ? 'No archived conversations found' : 'No conversations found'}
                    </p>
                    {(searchTerm || statusFilter !== "all" || priorityFilter !== "all") && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4" 
                        onClick={() => {
                          setSearchTerm("")
                          setStatusFilter("all")
                          setPriorityFilter("all")
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-colors border relative group",
                          selectedConversation === conversation.id
                            ? "bg-blue-50 border-blue-200 ring-2 ring-blue-200"
                            : "hover:bg-gray-50 border-transparent",
                        )}
                      >
                        <div onClick={() => handleConversationClick(conversation.id)} className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 pr-8">
                              <h4 className="font-medium text-sm truncate">{conversation.subject || "Support Request"}</h4>
                              <p className="text-xs text-gray-500">{conversation.user_profile?.name || 'Unknown User'}</p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {selectedConversation === conversation.id && (
                                <Badge 
                                  variant="default" 
                                  className="bg-green-100 text-green-800 border-green-300 text-xs px-2 py-0.5"
                                >
                                  Open
                                </Badge>
                              )}
                              {conversation.unread_count > 0 && (
                                <Badge
                                  variant="default"
                                  className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                                >
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={cn("text-xs", getPriorityColor(conversation.priority))}>
                              {conversation.priority}
                            </Badge>
                            <Badge variant={conversation.status === "open" ? "default" : "secondary"} className="text-xs">
                              {conversation.status}
                            </Badge>
                          </div>

                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(conversation.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {/* Inline Delete Confirmation - Non-blocking */}
                        {pendingDeletes.has(conversation.id) && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded" onClick={(e) => e.stopPropagation()}>
                            <p className="text-xs text-red-700 font-medium mb-2">
                              ⚠️ Delete this conversation permanently?
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 text-xs px-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  confirmDeleteConversation(conversation.id)
                                }}
                              >
                                Yes, Delete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs px-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  cancelDeleteConversation(conversation.id)
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* 3-dot menu */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 hover:bg-gray-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {showArchived ? (
                                // Archived view - show unarchive and delete options
                                <>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleUnarchiveConversation(conversation.id)
                                    }}
                                    className="text-blue-600 focus:text-blue-600"
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Unarchive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteConversation(conversation.id, 'permanent')
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Permanently
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                // Active view - show archive and delete options
                                <>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteConversation(conversation.id, 'admin_archive')
                                    }}
                                    className="text-orange-600 focus:text-orange-600"
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive from Dashboard
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteConversation(conversation.id, 'permanent')
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Permanently
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          {selectedConv ? (
            <Card className="h-[600px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{selectedConv.subject || "Support Request"}</CardTitle>
                      {showArchived && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {selectedConv.user_profile?.name || 'Unknown User'} ({selectedConv.user_profile?.email || 'unknown@example.com'})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // Force reload messages
                        const conv = conversations.find(c => c.id === selectedConversation)
                        if (conv) {
                          // Clear existing messages to force reload
                          setConversations(prevConversations => 
                            prevConversations.map(c => 
                              c.id === selectedConversation 
                                ? { ...c, messages: [] }
                                : c
                            )
                          )
                          // Reload messages
                          loadConversationMessages(selectedConversation)
                        }
                      }}
                      disabled={isLoadingConversation}
                      title="Refresh messages"
                    >
                      <RefreshCw className={cn("h-4 w-4", isLoadingConversation && "animate-spin")} />
                    </Button>
                    <Select
                      value={selectedConv.priority}
                      onValueChange={handlePriorityChange}
                      disabled={isUpdatingPriority || showArchived}
                    >
                      <SelectTrigger className="w-32">
                        {isUpdatingPriority ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedConv.status}
                      onValueChange={handleStatusChange}
                      disabled={isUpdatingStatus || showArchived}
                    >
                      <SelectTrigger className="w-32">
                        {isUpdatingStatus ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 h-[calc(100%-120px)]">
                <div className="flex flex-col h-full">
                  <>
                    <ScrollArea className="flex-1 p-4" ref={(ref) => {
                      // Auto-scroll to bottom when new messages are added
                      if (ref) {
                        const viewport = ref.querySelector('[data-radix-scroll-area-viewport]')
                        if (viewport) {
                          viewport.scrollTop = viewport.scrollHeight
                        }
                      }
                    }}>
                      <div className="space-y-4">
                        {isLoadingConversation ? (
                          <div className="text-center py-8 text-gray-500">
                            <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                            <p>Loading messages...</p>
                          </div>
                        ) : (!selectedConv.messages || selectedConv.messages.length === 0) ? (
                          <div className="text-center py-8 text-gray-500">
                            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No messages yet</p>
                            <p className="text-xs mt-1">You can now send messages!</p>
                          </div>
                        ) : (
                          selectedConv.messages.map((message: any) => (
                            <div
                              key={message.id}
                              className={cn("flex", message.is_admin ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-lg p-3",
                                  message.is_admin ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900",
                                )}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {message.is_admin ? "Admin" : selectedConv.user_profile?.name || 'Unknown User'}
                                  </span>
                                  <span className="text-xs opacity-70">
                                    {new Date(message.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm">{message.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>

                    {!showArchived && (
                      <div className="p-4 border-t">
                        <div className="flex gap-2">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your reply..."
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSendMessage()
                              }
                            }}
                            disabled={isSendingMessage}
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={!newMessage.trim() || isSendingMessage}
                          >
                            {isSendingMessage ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {showArchived && (
                      <div className="p-4 border-t bg-gray-50">
                        <p className="text-sm text-gray-500 text-center">
                          📁 This conversation is archived. Unarchive it to send messages.
                        </p>
                      </div>
                    )}
                  </>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px]">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a conversation from the list to view details</p>
                  <p className="text-xs mt-2 font-semibold text-green-600">✅ Real-time chat is now active!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>


    </div>
  )
}
