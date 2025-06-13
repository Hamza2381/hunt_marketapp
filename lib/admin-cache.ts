// Shared cache system for admin components
// This prevents re-fetching data when switching between tabs

export interface CacheEntry<T> {
  data: T | null
  timestamp: number
  isLoading: boolean
}

export class AdminCache {
  private static caches = new Map<string, CacheEntry<any>>()
  private static readonly CACHE_TIMEOUT = 2 * 60 * 1000 // 2 minutes
  
  static get<T>(key: string): CacheEntry<T> {
    if (!this.caches.has(key)) {
      this.caches.set(key, {
        data: null,
        timestamp: 0,
        isLoading: false
      })
    }
    return this.caches.get(key)!
  }
  
  static set<T>(key: string, data: T): void {
    this.caches.set(key, {
      data,
      timestamp: Date.now(),
      isLoading: false
    })
  }
  
  static setLoading(key: string, isLoading: boolean): void {
    const cache = this.get(key)
    cache.isLoading = isLoading
    this.caches.set(key, cache)
  }
  
  static isExpired(key: string): boolean {
    const cache = this.get(key)
    return Date.now() - cache.timestamp > this.CACHE_TIMEOUT
  }
  
  static shouldRefresh<T>(key: string, forceRefresh: boolean = false): boolean {
    const cache = this.get<T>(key)
    
    // Force refresh requested
    if (forceRefresh) return true
    
    // No data cached
    if (!cache.data) return true
    
    // Cache expired
    if (this.isExpired(key)) return true
    
    // Already loading
    if (cache.isLoading) return false
    
    // Cache is fresh
    return false
  }
  
  static clear(key?: string): void {
    if (key) {
      this.caches.delete(key)
    } else {
      this.caches.clear()
    }
  }
  
  static getKeys(): string[] {
    return Array.from(this.caches.keys())
  }
}