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
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Auto-invalidate product-related caches when products change
    globalEvents.on(EVENTS.INVENTORY_CHANGED, (event) => {
      // Clear related caches for more efficient updates
      this.clear('products')
      this.clear('categories-filter') // Clear category filter cache
      this.invalidatePattern('^category_products_') // Clear all category-specific product caches
      
      // Note: We don't clear 'categories' cache here because the categories page
      // handles its own optimistic updates in real-time
      
      // Optional: Log for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Cache invalidated due to inventory changes:', event.type)
      }
    })
  }

  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMs
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  clear(keyPrefix?: string): void {
    if (keyPrefix) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(keyPrefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Force invalidate specific cache patterns
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        expired++;
      } else {
        valid++;
      }
    }

    return { valid, expired, total: this.cache.size };
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