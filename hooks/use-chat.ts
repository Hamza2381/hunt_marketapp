"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./use-auth"

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: number
  senderName: string
  senderType: "user" | "admin"
  message: string
  timestamp: string
  read: boolean
}

export interface ChatConversation {
  id: string
  userId: number
  userName: string
  userEmail: string
  subject: string
  status: "open" | "closed" | "pending"
  priority: "low" | "medium" | "high"
  assignedTo?: number
  assignedToName?: string
  createdAt: string
  lastMessageAt: string
  unreadCount: number
  messages: ChatMessage[]
}

// Mock chat data
const mockConversations: ChatConversation[] = [
  {
    id: "conv-1",
    userId: 2,
    userName: "John Doe",
    userEmail: "john@company.com",
    subject: "Order delivery issue",
    status: "open",
    priority: "high",
    assignedTo: 1,
    assignedToName: "Admin User",
    createdAt: "2024-01-20T10:00:00Z",
    lastMessageAt: "2024-01-20T14:30:00Z",
    unreadCount: 2,
    messages: [
      {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: 2,
        senderName: "John Doe",
        senderType: "user",
        message: "Hi, I haven't received my order #12345 yet. It was supposed to arrive yesterday.",
        timestamp: "2024-01-20T10:00:00Z",
        read: true,
      },
      {
        id: "msg-2",
        conversationId: "conv-1",
        senderId: 1,
        senderName: "Admin User",
        senderType: "admin",
        message: "Hello John, I'm sorry to hear about the delay. Let me check the tracking information for your order.",
        timestamp: "2024-01-20T10:15:00Z",
        read: true,
      },
      {
        id: "msg-3",
        conversationId: "conv-1",
        senderId: 1,
        senderName: "Admin User",
        senderType: "admin",
        message:
          "I can see that your package is currently at the local distribution center. It should be delivered today by 6 PM. You'll receive a tracking update shortly.",
        timestamp: "2024-01-20T10:20:00Z",
        read: true,
      },
      {
        id: "msg-4",
        conversationId: "conv-1",
        senderId: 2,
        senderName: "John Doe",
        senderType: "user",
        message: "Thank you for checking! I'll wait for the delivery today.",
        timestamp: "2024-01-20T14:30:00Z",
        read: false,
      },
    ],
  },
  {
    id: "conv-2",
    userId: 3,
    userName: "Jane Smith",
    userEmail: "jane@personal.com",
    subject: "Credit limit increase request",
    status: "pending",
    priority: "medium",
    createdAt: "2024-01-19T15:30:00Z",
    lastMessageAt: "2024-01-19T15:30:00Z",
    unreadCount: 1,
    messages: [
      {
        id: "msg-5",
        conversationId: "conv-2",
        senderId: 3,
        senderName: "Jane Smith",
        senderType: "user",
        message:
          "Hello, I would like to request an increase in my credit limit. My current limit is $1,500 and I'd like to increase it to $3,000. I've been a customer for over a year and always pay on time.",
        timestamp: "2024-01-19T15:30:00Z",
        read: false,
      },
    ],
  },
]

let globalConversations = [...mockConversations]

export function useChat() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load conversations based on user role
    if (user) {
      if (user.isAdmin) {
        // Admin sees all conversations
        setConversations(globalConversations)
      } else {
        // User sees only their conversations
        setConversations(globalConversations.filter((conv) => conv.userId === user.id))
      }
    }
    setIsLoading(false)
  }, [user])

  const createConversation = (subject: string, initialMessage: string): ChatConversation => {
    if (!user) throw new Error("User must be authenticated")

    const newConversation: ChatConversation = {
      id: `conv-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      subject,
      status: "open",
      priority: "medium",
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      unreadCount: 1,
      messages: [
        {
          id: `msg-${Date.now()}`,
          conversationId: `conv-${Date.now()}`,
          senderId: user.id,
          senderName: user.name,
          senderType: user.isAdmin ? "admin" : "user",
          message: initialMessage,
          timestamp: new Date().toISOString(),
          read: false,
        },
      ],
    }

    globalConversations.unshift(newConversation)
    setConversations(user.isAdmin ? globalConversations : globalConversations.filter((conv) => conv.userId === user.id))

    return newConversation
  }

  const sendMessage = (conversationId: string, message: string): ChatMessage => {
    if (!user) throw new Error("User must be authenticated")

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: user.id,
      senderName: user.name,
      senderType: user.isAdmin ? "admin" : "user",
      message,
      timestamp: new Date().toISOString(),
      read: false,
    }

    // Update the conversation
    globalConversations = globalConversations.map((conv) => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessageAt: newMessage.timestamp,
          unreadCount: user.isAdmin ? conv.unreadCount : conv.unreadCount + 1,
        }
      }
      return conv
    })

    setConversations(user.isAdmin ? globalConversations : globalConversations.filter((conv) => conv.userId === user.id))

    return newMessage
  }

  const markAsRead = (conversationId: string) => {
    if (!user) return

    globalConversations = globalConversations.map((conv) => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          unreadCount: 0,
          messages: conv.messages.map((msg) => ({ ...msg, read: true })),
        }
      }
      return conv
    })

    setConversations(user.isAdmin ? globalConversations : globalConversations.filter((conv) => conv.userId === user.id))
  }

  const updateConversationStatus = (conversationId: string, status: "open" | "closed" | "pending") => {
    if (!user?.isAdmin) return

    globalConversations = globalConversations.map((conv) => {
      if (conv.id === conversationId) {
        return { ...conv, status }
      }
      return conv
    })

    setConversations(globalConversations)
  }

  const assignConversation = (conversationId: string, adminId: number, adminName: string) => {
    if (!user?.isAdmin) return

    globalConversations = globalConversations.map((conv) => {
      if (conv.id === conversationId) {
        return { ...conv, assignedTo: adminId, assignedToName: adminName }
      }
      return conv
    })

    setConversations(globalConversations)
  }

  const getUnreadCount = (): number => {
    if (!user) return 0

    if (user.isAdmin) {
      return globalConversations.reduce((total, conv) => total + conv.unreadCount, 0)
    } else {
      return globalConversations
        .filter((conv) => conv.userId === user.id)
        .reduce((total, conv) => total + conv.unreadCount, 0)
    }
  }

  return {
    conversations,
    isLoading,
    createConversation,
    sendMessage,
    markAsRead,
    updateConversationStatus,
    assignConversation,
    getUnreadCount,
  }
}
