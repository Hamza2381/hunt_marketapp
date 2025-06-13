"use client"

import { useState } from "react"

export function DebugPanel() {
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState('')

  const createSampleData = async () => {
    setIsCreating(true)
    setMessage('Creating sample data...')
    
    try {
      const response = await fetch('/api/debug/sample-data', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMessage(`✅ Success! Created ${result.summary?.categories || 0} categories and ${result.summary?.products || 0} products`)
        console.log('Sample data created:', result)
        
        // Refresh the page after 2 seconds to show the new data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setMessage(`❌ Error: ${result.error}`)
        console.error('Sample data creation failed:', result)
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error}`)
      console.error('Network error:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-medium text-blue-800 mb-2">🔧 Debug Information</h3>
        <p className="text-sm text-blue-700 mb-2">
          If products are not loading, check the browser console or use these tools:
        </p>
        
        <div className="flex space-x-2 text-sm mb-3">
          <a 
            href="/api/debug" 
            className="text-blue-600 underline hover:text-blue-800" 
            target="_blank"
            rel="noopener noreferrer"
          >
            🔍 Database Test
          </a>
          <span className="text-blue-400">|</span>
          <button 
            onClick={createSampleData}
            disabled={isCreating}
            className="text-blue-600 underline cursor-pointer hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? '⏳ Creating...' : '🔧 Create Sample Data'}
          </button>
        </div>
        
        {message && (
          <div className={`text-sm p-2 rounded ${
            message.includes('✅') 
              ? 'bg-green-100 text-green-700' 
              : message.includes('❌') 
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}