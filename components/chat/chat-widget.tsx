"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { MessageCircle, X, Send, Plus, ArrowLeft, Loader2, MoreVertical, Trash2 } from "lucide-react"
import { useChat } from "@/hooks/use-chat"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

export function ChatWidget() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  
  const { 
    conversations, 
    createConversation, 
    sendMessage, 
    getConversationWithMessages,
    markAsRead, 
    getUnreadCount,
    deleteConversation,
    isLoading: chatLoading,
    error: chatError
  } = useChat(selectedConversation)
  
  // Direct access to setConversations for immediate UI updates
  const [localConversations, setLocalConversations] = useState(conversations)
  
  // Sync local conversations with hook conversations
  useEffect(() => {
    setLocalConversations(conversations)
  }, [conversations])
  const [newMessage, setNewMessage] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatSubject, setNewChatSubject] = useState("")
  const [newChatMessage, setNewChatMessage] = useState("")
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null)
  const [isDeletingConversation, setIsDeletingConversation] = useState(false)
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  const unreadCount = getUnreadCount()
  const selectedConv = localConversations.find((conv) => conv.id === selectedConversation)
  
  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }
  
  // Auto-scroll when messages change or conversation loads
  useEffect(() => {
    if (selectedConv && selectedConv.messages && selectedConv.messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100)
    }
  }, [selectedConv?.messages?.length, selectedConversation])
  
  // Also scroll when new messages arrive (for real-time updates)
  useEffect(() => {
    if (selectedConv && selectedConv.messages && selectedConv.messages.length > 0) {
      // Check if this is a new message (by checking the last message timestamp)
      const lastMessage = selectedConv.messages[selectedConv.messages.length - 1]
      if (lastMessage) {
        // Scroll to bottom for new messages
        setTimeout(scrollToBottom, 100)
      }
    }
  }, [selectedConv?.messages])

  // Enhanced visibility check with detailed logging
  console.log('💬 ChatWidget visibility check:', {
    isAuthenticated,
    user: user ? { email: user.email, isAdmin: user.isAdmin } : null,
    shouldShow: isAuthenticated && user && !user.isAdmin
  })

  // Don't show widget for:
  // 1. Unauthenticated users
  // 2. Admin users
  // 3. Users without proper profile data
  if (!isAuthenticated || !user || user.isAdmin) {
    console.log('💬 ChatWidget hidden:', {
      reason: !isAuthenticated ? 'not authenticated' : 
              !user ? 'no user data' : 
              user.isAdmin ? 'user is admin' : 'unknown'
    })
    return null
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSendingMessage) return

    setIsSendingMessage(true)
    try {
      await sendMessage(selectedConversation, newMessage.trim())
      setNewMessage("")
      
      // Auto-scroll to bottom after sending message
      setTimeout(scrollToBottom, 100)
      
      toast({
        title: "Message sent",
        description: "Your message has been sent to support.",
        duration: 1500, // 1.5 seconds
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleCreateConversation = async () => {
    if (!newChatSubject.trim() || !newChatMessage.trim() || isCreatingConversation) return

    setIsCreatingConversation(true)
    try {
      const conversation = await createConversation(newChatSubject.trim(), newChatMessage.trim())
      
      console.log('🔧 Customer: Conversation created:', conversation)
      console.log('🔧 Customer: Initial messages:', conversation.messages)
      
      // Set the selected conversation immediately
      setSelectedConversation(conversation.id)
      
      setShowNewChat(false)
      setNewChatSubject("")
      setNewChatMessage("")
      
      // Ensure the conversation with messages is properly set in state
      // Force a slight delay to ensure the conversation is selected and rendered
      setTimeout(() => {
        console.log('🔧 Customer: Auto-scrolling after conversation creation')
        scrollToBottom()
      }, 300)
      
      toast({
        title: "Chat started",
        description: "Your support request has been created.",
        duration: 1500, // 1.5 seconds
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create chat. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingConversation(false)
    }
  }

  const handleConversationClick = async (conversationId: number) => {
    if (conversationId === selectedConversation) return

    console.log('🔧 Customer: Conversation clicked:', conversationId)
    
    setSelectedConversation(conversationId)
    
    // Mark as read immediately (clears unread count in UI)
    markAsRead(conversationId)
    
    setIsLoadingConversation(true)
    
    try {
      // Load conversation with messages
      await getConversationWithMessages(conversationId)
      
      console.log('✅ Customer: Conversation loaded successfully')
    } catch (error) {
      console.error('Customer: Conversation click error:', error)
      toast({
        title: "Error",
        description: "Failed to load conversation.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const handleChatOpen = () => {
    setIsOpen(true)
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      action()
    }
  }

  const handleDeleteConversation = (conversationId: number) => {
    setConversationToDelete(conversationId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete || isDeletingConversation) return

    setIsDeletingConversation(true)
    
    // Store conversation info for potential rollback
    const conversationToRemove = localConversations.find(conv => conv.id === conversationToDelete)
    const deletingId = conversationToDelete
    
    try {
      // 1. INSTANT UI UPDATES - Update local state immediately (user side only)
      setLocalConversations(prev => prev.filter(conv => conv.id !== deletingId))
      
      // Close dialog immediately
      setShowDeleteDialog(false)
      setConversationToDelete(null)
      
      // If the deleted conversation was selected, go back to conversation list immediately
      if (deletingId === selectedConversation) {
        setSelectedConversation(null)
      }
      
      // Show success toast immediately
      toast({
        title: "Chat deleted",
        description: "The conversation has been removed from your view.",
        duration: 2000,
      })
      
      // 2. BACKGROUND API CALL - Mark as deleted_by_user (don't remove from database)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token')
      }
      
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
      
      const response = await fetch(`/api/chat/conversations/${deletingId}/delete`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ deleteType: 'user_hide' }) // Special type for user deletion
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Request failed`)
      }
      
      const data = await response.json()
      if (data.success) {
        console.log('✅ Chat marked as deleted by user on server')
      } else {
        throw new Error(data.error || 'Server operation failed')
      }
    } catch (error: any) {
      console.error('❌ Delete failed on server:', error)
      
      // Rollback: restore conversation to local state if server fails
      if (conversationToRemove) {
        setLocalConversations(prev => [conversationToRemove, ...prev])
      }
      
      // Show error toast if server fails
      toast({
        title: "Delete Failed",
        description: "Server error - conversation restored.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsDeletingConversation(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={handleChatOpen} 
          className="rounded-full h-14 w-14 shadow-lg relative hover:scale-105 transition-transform" 
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-96 h-[500px] shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Support Chat</CardTitle>
          <div className="flex items-center gap-2">
            {!selectedConversation && !showNewChat && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowNewChat(true)} 
                className="h-8 w-8"
                disabled={chatLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false)
                setSelectedConversation(null)
                setShowNewChat(false)
                setNewMessage("")
                setNewChatSubject("")
                setNewChatMessage("")
              }}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-60px)]">
          {chatError ? (
            <div className="p-4 text-center text-red-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Failed to load chat</p>
              <p className="text-xs mt-1">{chatError}</p>
            </div>
          ) : showNewChat ? (
            <div className="p-4 space-y-4 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowNewChat(false)}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium">New Support Request</h3>
              </div>
              
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={newChatSubject}
                  onChange={(e) => setNewChatSubject(e.target.value)}
                  placeholder="What can we help you with?"
                  disabled={isCreatingConversation}
                />
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  className="h-32"
                  disabled={isCreatingConversation}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateConversation}
                  disabled={!newChatSubject.trim() || !newChatMessage.trim() || isCreatingConversation}
                  className="flex-1"
                >
                  {isCreatingConversation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Start Chat"
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewChat(false)}
                  disabled={isCreatingConversation}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : selectedConversation && selectedConv ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedConversation(null)} 
                      className="p-0 h-auto hover:bg-transparent"
                      disabled={isLoadingConversation}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedConv.status === "open" ? "default" : "secondary"}>
                      {selectedConv.status}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-medium mt-2">{selectedConv.subject}</h3>
              </div>
              
              {isLoadingConversation ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                    <div className="space-y-4">
                      {selectedConv.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn("flex", message.is_admin ? "justify-start" : "justify-end")}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg p-3 text-sm",
                              message.is_admin 
                                ? "bg-gray-100 text-gray-900" 
                                : "bg-blue-500 text-white"
                            )}
                          >
                            <p>{message.message}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {/* Invisible div to help with auto-scrolling */}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyPress={(e) => handleKeyPress(e, handleSendMessage)}
                        disabled={isSendingMessage}
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        size="icon"
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
                </>
              )}
            </div>
          ) : (
            <div className="p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Your Conversations</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowNewChat(true)}
                  disabled={chatLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
              
              <ScrollArea className="h-[calc(100%-60px)]">
                {chatLoading && !hasInitiallyLoaded ? (
                  <div className="text-center text-gray-500 mt-8">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                    <p>Loading conversations...</p>
                  </div>
                ) : localConversations.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm mt-1">Start a chat to get help from our support team</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {localConversations.map((conversation, index) => (
                      <div
                        key={`conversation-${conversation.id}-${index}`}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative group"
                      >
                        <div 
                          onClick={() => handleConversationClick(conversation.id)}
                          className="flex-1"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm truncate pr-8">{conversation.subject}</h4>
                          {conversation.unread_count > 0 && (
                            <Badge
                              variant="default"
                              className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                            >
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.latest_message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant={conversation.status === "open" ? "default" : "secondary"} className="text-xs">
                            {conversation.status}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(conversation.latest_message_at).toLocaleDateString()}
                          </span>
                        </div>
                        </div>
                        
                        {/* 3-dot menu */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <DropdownMenu modal={false}>
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
                            <DropdownMenuContent align="end" className="z-50">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteConversation(conversation.id)
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Chat
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This will remove it from your view permanently.
              You won't be able to recover it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingConversation}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteConversation}
              disabled={isDeletingConversation}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingConversation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
