"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Plus } from "lucide-react"
import { useChat } from "@/hooks/use-chat"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function ChatWidget() {
  const { user } = useAuth()
  const { conversations, createConversation, sendMessage, markAsRead, getUnreadCount } = useChat()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatSubject, setNewChatSubject] = useState("")
  const [newChatMessage, setNewChatMessage] = useState("")

  if (!user || user.isAdmin) return null // Don't show widget for admins

  const unreadCount = getUnreadCount()
  const selectedConv = conversations.find((conv) => conv.id === selectedConversation)

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      sendMessage(selectedConversation, newMessage.trim())
      setNewMessage("")
      toast({
        title: "Message sent",
        description: "Your message has been sent to support.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCreateConversation = () => {
    if (!newChatSubject.trim() || !newChatMessage.trim()) return

    try {
      const conversation = createConversation(newChatSubject.trim(), newChatMessage.trim())
      setSelectedConversation(conversation.id)
      setShowNewChat(false)
      setNewChatSubject("")
      setNewChatMessage("")
      toast({
        title: "Chat started",
        description: "Your support request has been created.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create chat. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId)
    markAsRead(conversationId)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setIsOpen(true)} className="rounded-full h-14 w-14 shadow-lg relative" size="icon">
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
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
            {!selectedConversation && (
              <Button variant="ghost" size="icon" onClick={() => setShowNewChat(true)} className="h-8 w-8">
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
              }}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-60px)]">
          {showNewChat ? (
            <div className="p-4 space-y-4 h-full">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={newChatSubject}
                  onChange={(e) => setNewChatSubject(e.target.value)}
                  placeholder="What can we help you with?"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  className="h-32"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateConversation}
                  disabled={!newChatSubject.trim() || !newChatMessage.trim()}
                  className="flex-1"
                >
                  Start Chat
                </Button>
                <Button variant="outline" onClick={() => setShowNewChat(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : selectedConversation && selectedConv ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setSelectedConversation(null)} className="p-0 h-auto">
                    ← Back
                  </Button>
                  <Badge variant={selectedConv.status === "open" ? "default" : "secondary"}>
                    {selectedConv.status}
                  </Badge>
                </div>
                <h3 className="font-medium mt-2">{selectedConv.subject}</h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedConv.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex", message.senderType === "user" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3 text-sm",
                          message.senderType === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900",
                        )}
                      >
                        <p>{message.message}</p>
                        <p className="text-xs mt-1 opacity-70">{new Date(message.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Your Conversations</h3>
                <Button variant="outline" size="sm" onClick={() => setShowNewChat(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
              <ScrollArea className="h-[calc(100%-60px)]">
                {conversations.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a chat to get help from our support team</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => handleConversationClick(conversation.id)}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">{conversation.subject}</h4>
                          {conversation.unreadCount > 0 && (
                            <Badge
                              variant="default"
                              className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                            >
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.messages[conversation.messages.length - 1]?.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant={conversation.status === "open" ? "default" : "secondary"} className="text-xs">
                            {conversation.status}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(conversation.lastMessageAt).toLocaleDateString()}
                          </span>
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
    </div>
  )
}
