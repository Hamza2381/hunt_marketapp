"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageCircle, Send, Search, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { ChatConversation, ChatMessage, UserProfile } from "@/lib/supabase"

interface ConversationWithDetails extends ChatConversation {
  user_profile?: UserProfile;
  messages: ChatMessage[];
  unreadCount: number;
}

export function ChatManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user?.isAdmin) return
      
      setIsLoading(true)
      setError(null)
      try {
        // Fetch all conversations
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('chat_conversations')
          .select('*')
          .order('updated_at', { ascending: false })
        
        if (conversationsError) throw conversationsError
        
        // Get messages and user profiles for each conversation
        const conversationsWithDetails = await Promise.all(conversationsData.map(async (conversation) => {
          // Get user profile
          const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', conversation.user_id)
            .single()
          
          if (userError) console.error('Error fetching user for conversation:', userError)
          
          // Get messages
          const { data: messagesData, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true })
          
          if (messagesError) console.error('Error fetching messages:', messagesError)
          
          // Count unread messages (from user to admin)
          const unreadCount = messagesData?.filter(msg => !msg.is_admin && !msg.read).length || 0
          
          return {
            ...conversation,
            user_profile: userData || null,
            messages: messagesData || [],
            unreadCount
          }
        }))
        
        setConversations(conversationsWithDetails)
      } catch (err: any) {
        console.error('Error fetching conversations:', err.message)
        setError('Failed to load support conversations. Please try again.')
        toast({
          title: 'Error',
          description: 'Failed to load support conversations.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchConversations()
  }, [user])

  if (!user?.isAdmin) return null

  const selectedConv = conversations.find((conv) => conv.id === selectedConversation)

  const filteredConversations = conversations.filter((conv) => {
    if (!conv.user_profile) return false;
    
    const matchesSearch =
      (conv.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      conv.user_profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.user_profile.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter
    const matchesPriority = priorityFilter === "all" || conv.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const stats = {
    total: conversations.length,
    open: conversations.filter((c) => c.status === "open").length,
    pending: conversations.filter((c) => c.status === "pending").length,
    closed: conversations.filter((c) => c.status === "closed").length,
    unread: conversations.reduce((total, conv) => total + conv.unreadCount, 0),
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return

    try {
      // Add message to database
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          message: newMessage.trim(),
          is_admin: true,
        })
      
      if (error) throw error
      
      // Update conversation updated_at timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation)
      
      // Update local state
      setConversations(conversations.map(conv => {
        if (conv.id === selectedConversation) {
          return {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: Date.now(),  // Temporary ID until refresh
                conversation_id: selectedConversation,
                sender_id: user.id,
                message: newMessage.trim(),
                is_admin: true,
                created_at: new Date().toISOString(),
                read: true
              }
            ],
            updated_at: new Date().toISOString()
          }
        }
        return conv
      }))
      
      setNewMessage("")
      toast({
        title: "Message sent",
        description: "Your reply has been sent to the customer.",
      })
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (status: "open" | "closed" | "pending") => {
    if (!selectedConversation) return

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', selectedConversation)
      
      if (error) throw error
      
      // Update local state
      setConversations(conversations.map(conv => 
        conv.id === selectedConversation ? { ...conv, status } : conv
      ))
      
      toast({
        title: "Status updated",
        description: `Conversation marked as ${status}.`,
      })
    } catch (error: any) {
      console.error('Error updating conversation status:', error)
      toast({
        title: "Error",
        description: "Failed to update conversation status.",
        variant: "destructive",
      })
    }
  }

  const handlePriorityChange = async (priority: "low" | "medium" | "high" | "urgent") => {
    if (!selectedConversation) return

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ priority, updated_at: new Date().toISOString() })
        .eq('id', selectedConversation)
      
      if (error) throw error
      
      // Update local state
      setConversations(conversations.map(conv => 
        conv.id === selectedConversation ? { ...conv, priority } : conv
      ))
      
      toast({
        title: "Priority updated",
        description: `Conversation priority set to ${priority}.`,
      })
    } catch (error: any) {
      console.error('Error updating conversation priority:', error)
      toast({
        title: "Error",
        description: "Failed to update conversation priority.",
        variant: "destructive",
      })
    }
  }

  const handleConversationClick = async (conversationId: number) => {
    setSelectedConversation(conversationId)
    
    // Mark unread messages as read
    const convo = conversations.find(c => c.id === conversationId)
    if (!convo || convo.unreadCount === 0) return
    
    try {
      const unreadMessages = convo.messages
        .filter(msg => !msg.is_admin && !msg.read)
        .map(msg => msg.id)
      
      if (unreadMessages.length === 0) return
      
      // Update read status in database
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .in('id', unreadMessages)
      
      if (error) throw error
      
      // Update local state
      setConversations(conversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: conv.messages.map(msg => 
              !msg.is_admin && !msg.read ? { ...msg, read: true } : msg
            ),
            unreadCount: 0
          }
        }
        return conv
      }))
    } catch (error: any) {
      console.error('Error marking messages as read:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Support Conversations
              </CardTitle>

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
                  {isLoading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                      <p className="text-gray-500">Loading conversations...</p>
                    </div>
                  ) : error ? (
                    <div className="p-4 text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500 opacity-50" />
                      <p className="text-red-500">{error}</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                        Try Again
                      </Button>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No conversations found</p>
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
                          onClick={() => handleConversationClick(conversation.id)}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-colors border",
                            selectedConversation === conversation.id
                              ? "bg-blue-50 border-blue-200"
                              : "hover:bg-gray-50 border-transparent",
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{conversation.subject || "Support Request"}</h4>
                              <p className="text-xs text-gray-500">{conversation.user_profile?.name}</p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {conversation.unreadCount > 0 && (
                                <Badge
                                  variant="default"
                                  className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                                >
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                              {getStatusIcon(conversation.status)}
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
                    <CardTitle className="text-lg">{selectedConv.subject || "Support Request"}</CardTitle>
                    <p className="text-sm text-gray-500">
                      {selectedConv.user_profile?.name} ({selectedConv.user_profile?.email})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedConv.priority}
                      onValueChange={(value: "low" | "medium" | "high" | "urgent") => handlePriorityChange(value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
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
                      onValueChange={(value: "open" | "closed" | "pending") => handleStatusChange(value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
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
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {selectedConv.messages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No messages yet</p>
                        </div>
                      ) : (
                        selectedConv.messages.map((message) => (
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
                                  {message.is_admin ? "Admin" : selectedConv.user_profile?.name}
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

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your reply..."
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px]">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a conversation from the list to start chatting with customers</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
