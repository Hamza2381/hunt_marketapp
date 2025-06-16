"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { fastCache } from "@/lib/fast-cache"

export function DebugProducts() {
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testAPI = async (featured: boolean = false) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/products${featured ? '?featured=true' : ''}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      const data = await response.json()
      setResult(data)
      console.log('API Response:', data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const clearCache = () => {
    fastCache.clear()
    setResult({ message: 'Cache cleared' })
  }

  return (
    <div className="p-6 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Debug Products API</h3>
      
      <div className="space-x-2">
        <Button onClick={() => testAPI(false)} disabled={isLoading}>
          Test All Products
        </Button>
        <Button onClick={() => testAPI(true)} disabled={isLoading}>
          Test Featured Products
        </Button>
        <Button onClick={clearCache} variant="outline">
          Clear Cache
        </Button>
      </div>
      
      {result && (
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
