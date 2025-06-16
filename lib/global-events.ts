// Global event system for real-time updates across components
type EventCallback = (...args: any[]) => void

class GlobalEventBus {
  private events: Map<string, EventCallback[]> = new Map()

  // Subscribe to an event
  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  // Emit an event
  emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args)
        } catch (error) {
          console.error('Error in event callback:', error)
        }
      })
    }
  }

  // Remove all listeners for an event
  off(event: string) {
    this.events.delete(event)
  }

  // Get number of listeners for an event
  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0
  }
}

// Create singleton instance
export const globalEvents = new GlobalEventBus()

// Event types for type safety
export const EVENTS = {
  PRODUCT_ADDED: 'product:added',
  PRODUCT_UPDATED: 'product:updated', 
  PRODUCT_DELETED: 'product:deleted',
  CATEGORY_UPDATED: 'category:updated',
  INVENTORY_CHANGED: 'inventory:changed'
} as const

// Helper functions for common operations
export const emitProductChange = (type: 'added' | 'updated' | 'deleted', product: any) => {
  globalEvents.emit(EVENTS[`PRODUCT_${type.toUpperCase()}` as keyof typeof EVENTS], product)
  
  // Also emit a general inventory change event
  globalEvents.emit(EVENTS.INVENTORY_CHANGED, { type, product })
}

export const emitCategoryUpdate = (category: any) => {
  globalEvents.emit(EVENTS.CATEGORY_UPDATED, category)
}
