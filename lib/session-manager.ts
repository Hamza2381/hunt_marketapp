// lib/session-manager.ts
"use client";

export interface SessionData {
  isAuthenticated: boolean;
  userEmail?: string;
  userId?: string;
  isAdmin?: boolean;
  currentPath?: string;
  timestamp: number;
  lastActivity: number;
}

export class SessionManager {
  private static readonly SESSION_KEY = 'app_session_state';
  private static readonly ACTIVITY_KEY = 'app_last_activity';
  private static readonly TAB_SWITCH_KEY = 'app_tab_switch';
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  // Save app session state
  static saveAppState(data: Partial<SessionData>): void {
    if (typeof window === 'undefined') return;
    
    // Skip session management for admin pages completely
    if (window.location.pathname.startsWith('/admin')) {
      return;
    }
    
    try {
      const currentState = this.getAppState();
      const newState: SessionData = {
        ...currentState,
        ...data,
        timestamp: Date.now(),
        lastActivity: Date.now()
      };
      
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(newState));
      sessionStorage.setItem(this.ACTIVITY_KEY, String(Date.now()));
    } catch (error) {
      console.warn('Failed to save session state:', error);
    }
  }
  
  // Get app session state
  static getAppState(): SessionData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = sessionStorage.getItem(this.SESSION_KEY);
      if (!stored) return null;
      
      const state: SessionData = JSON.parse(stored);
      
      // Check if session is expired
      if (this.isSessionExpired(state)) {
        this.clearAppState();
        return null;
      }
      
      return state;
    } catch (error) {
      console.warn('Failed to get session state:', error);
      return null;
    }
  }
  
  // Clear session state - enhanced for logout
  static clearAppState(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Clear sessionStorage
      sessionStorage.removeItem(this.SESSION_KEY);
      sessionStorage.removeItem(this.ACTIVITY_KEY);
      sessionStorage.removeItem(this.TAB_SWITCH_KEY);
      
      // Also clear localStorage for good measure
      localStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem(this.ACTIVITY_KEY);
      localStorage.removeItem(this.TAB_SWITCH_KEY);
      
      // Clear any auth-related items
      localStorage.removeItem('supabase-auth-token');
      sessionStorage.removeItem('supabase-auth-token');
      
      // Clear any other auth-related keys that might exist
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('Session state cleared completely');
    } catch (error) {
      console.warn('Failed to clear session state:', error);
    }
  }
  
  // Clear admin app state for admin routes only
  static clearAdminAppState(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Only clear if we're on an admin route
      if (window.location.pathname.startsWith('/admin')) {
        sessionStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.ACTIVITY_KEY);
        sessionStorage.removeItem(this.TAB_SWITCH_KEY);
      }
    } catch (error) {
      console.warn('Failed to clear admin session state:', error);
    }
  }
  
  // Update activity timestamp
  static updateActivity(): void {
    if (typeof window === 'undefined') return;
    
    // Skip session management for admin pages completely
    if (window.location.pathname.startsWith('/admin')) {
      return;
    }
    
    try {
      sessionStorage.setItem(this.ACTIVITY_KEY, String(Date.now()));
      
      // Also update the session state if it exists
      const currentState = this.getAppState();
      if (currentState) {
        currentState.lastActivity = Date.now();
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(currentState));
      }
    } catch (error) {
      console.warn('Failed to update activity:', error);
    }
  }
  
  // Check if session is expired
  static isSessionExpired(state: SessionData): boolean {
    const now = Date.now();
    const sessionAge = now - state.timestamp;
    const inactivityTime = now - state.lastActivity;
    
    return sessionAge > this.SESSION_TIMEOUT || inactivityTime > this.SESSION_TIMEOUT;
  }
  
  // Check if recent activity exists
  static isRecentlyActive(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const lastActivity = sessionStorage.getItem(this.ACTIVITY_KEY);
      if (!lastActivity) return false;
      
      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      return timeSinceActivity < 5 * 60 * 1000; // 5 minutes
    } catch (error) {
      return false;
    }
  }
  
  // Mark as tab switch
  static markTabSwitch(): void {
    if (typeof window === 'undefined') return;
    
    // Skip session management for admin pages completely
    if (window.location.pathname.startsWith('/admin')) {
      return;
    }
    
    try {
      sessionStorage.setItem(this.TAB_SWITCH_KEY, String(Date.now()));
    } catch (error) {
      console.warn('Failed to mark tab switch:', error);
    }
  }
  
  // Check if this is a tab switch return
  static isTabSwitch(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const tabSwitchTime = sessionStorage.getItem(this.TAB_SWITCH_KEY);
      if (!tabSwitchTime) return false;
      
      const timeSinceSwitch = Date.now() - parseInt(tabSwitchTime);
      // Consider it a tab switch if marked within last 10 seconds
      return timeSinceSwitch < 10 * 1000;
    } catch (error) {
      return false;
    }
  }
  
  // Clear tab switch marker
  static clearTabSwitch(): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(this.TAB_SWITCH_KEY);
    } catch (error) {
      console.warn('Failed to clear tab switch marker:', error);
    }
  }
  
  // Check if we have valid session data
  static hasValidSession(): boolean {
    const state = this.getAppState();
    return state !== null && state.isAuthenticated === true;
  }
  
  // Get user data from session
  static getUserFromSession(): { id: string; email: string; isAdmin: boolean } | null {
    const state = this.getAppState();
    if (!state || !state.isAuthenticated || !state.userId || !state.userEmail) {
      return null;
    }
    
    return {
      id: state.userId,
      email: state.userEmail,
      isAdmin: state.isAdmin || false
    };
  }
}