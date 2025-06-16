// lib/fast-cache.ts
"use client";

import { globalEvents, EVENTS } from './global-events'

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class FastDataCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 0; // DISABLED - No caching at all

  constructor() {
    // Auto-invalidate product-related caches when products change
    globalEvents.on(EVENTS.INVENTORY_CHANGED, (event) => {
      // Clear all caches immediately
      this.cache.clear()
      
      // Optional: Log for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('All cache cleared due to inventory changes:', event.type)
      }
    })
  }

  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL): void {
    // DISABLED - Never cache anything
    return;
  }

  get<T>(key: string): T | null {
    // DISABLED - Never return cached data
    return null;
  }

  has(key: string): boolean {
    // DISABLED - Never has cached data
    return false;
  }

  clear(keyPrefix?: string): void {
    this.cache.clear();
  }

  // Force invalidate specific cache patterns
  invalidatePattern(pattern: string): void {
    this.cache.clear()
  }

  // Get cache stats
  getStats() {
    return { valid: 0, expired: 0, total: 0 };
  }
}

// Export singleton instance
export const fastCache = new FastDataCache();

// Cache keys
export const CACHE_KEYS = {
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  PRODUCTS_FEATURED: 'products_featured',
  FEATURED_DEALS: 'featured_deals',
  ALL_DEALS: 'all_deals',
  PRODUCT_DETAIL: (id: string) => `product_${id}`,
  CATEGORY_PRODUCTS: (slug: string) => `category_products_${slug}`,
} as const;