"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function SimpleRealtimeTest() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected")
  const [testMessage, setTestMessage] = useState("")

  useEffect(() => {
    if (!user) return

    console.log('🧪 Setting up simple real-time test for user:', user.email)
    
    const channel = supabase
      .channel('simple-test')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        console.log('🧪 REAL-TIME MESSAGE:', payload)
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe((status, error) => {
        console.log('🧪 Subscription status:', status)
        setConnectionStatus(status)
        if (error) {
          console.error('🧪 Subscription error:', error)
        }
      })

    return () => {
      console.log('🧪 Cleaning up simple test')
      supabase.removeChannel(channel)
    }
  }, [user])

  const sendTestMessage = async () => {
    if (!user || !testMessage.trim()) return

    try {
      // Find or create a test conversation
      let conversationId = 1 // Default test conversation

      const headers = {
        'Content-Type': 'application/json'
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: testMessage.trim() })
      })

      if (response.ok) {
        console.log('✅ Test message sent')
        setTestMessage("")
      } else {
        console.error('❌ Failed to send test message:', response.status)
      }
    } catch (error) {
      console.error('❌ Test message error:', error)
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">Simple Real-time Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Status:</span>
          <Badge variant={connectionStatus === 'SUBSCRIBED' ? 'default' : 'destructive'}>
            {connectionStatus}
          </Badge>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Type test message..."
            className="flex-1 px-2 py-1 border rounded text-sm"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendTestMessage()
              }
            }}
          />
          <Button 
            size="sm" 
            onClick={sendTestMessage}
            disabled={!testMessage.trim()}
          >
            Send Test
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Recent Messages ({messages.length}):</div>
          <div className="max-h-32 overflow-y-auto border rounded p-2">
            {messages.length === 0 ? (
              <div className="text-xs text-gray-500">No messages yet...</div>
            ) : (
              messages.slice(-5).map((msg, i) => (
                <div key={i} className="text-xs border-b py-1">
                  <strong>ID {msg.id}:</strong> {msg.message}
                  <div className="text-gray-500">
                    From: {msg.is_admin ? 'Admin' : 'Customer'} at {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
