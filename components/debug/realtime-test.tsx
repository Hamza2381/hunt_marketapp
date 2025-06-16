"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function RealtimeTest() {
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected")
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [subscriptionErrors, setSubscriptionErrors] = useState<string[]>([])

  useEffect(() => {
    console.log('🧪 Starting real-time test...')
    
    // Test real-time connection
    const channel = supabase
      .channel('realtime-test')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        console.log('🧪 Real-time message received:', payload)
        setLastMessage(payload.new)
        setConnectionStatus("receiving")
      })
      .on('postgres_changes', {
        event: 'UPDATE', 
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        console.log('🧪 Real-time message updated:', payload)
        setLastMessage(payload.new)
        setConnectionStatus("receiving")
      })
      .subscribe((status, error) => {
        console.log('🧪 Subscription status:', status, error)
        setConnectionStatus(status)
        if (error) {
          setSubscriptionErrors(prev => [...prev, error.message])
        }
      })

    return () => {
      console.log('🧪 Cleaning up test subscription')
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">Real-time Debug Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span>Connection Status:</span>
            <Badge variant={connectionStatus === 'SUBSCRIBED' ? 'default' : 'destructive'}>
              {connectionStatus}
            </Badge>
          </div>
          {lastMessage && (
            <div>
              <span>Last Message: </span>
              <code className="text-xs bg-gray-100 p-1 rounded">
                {JSON.stringify(lastMessage, null, 2)}
              </code>
            </div>
          )}
          {subscriptionErrors.length > 0 && (
            <div>
              <span>Errors: </span>
              {subscriptionErrors.map((error, i) => (
                <div key={i} className="text-red-500">{error}</div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
