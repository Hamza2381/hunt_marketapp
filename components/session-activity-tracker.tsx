// components/session-activity-tracker.tsx
"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SessionManager } from '@/lib/session-manager';

export function SessionActivityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Update activity on route changes
    SessionManager.updateActivity();
    
    // Update current path in session
    if (SessionManager.hasValidSession()) {
      SessionManager.saveAppState({
        currentPath: pathname
      });
    }
  }, [pathname]);

  useEffect(() => {
    // Track user interactions
    const trackActivity = () => {
      SessionManager.updateActivity();
    };

    // Listen for various user interactions
    const events = [
      'mousedown', 
      'mousemove', 
      'keypress', 
      'scroll', 
      'touchstart', 
      'click'
    ];

    // Throttle activity updates to avoid excessive calls
    let lastUpdate = 0;
    const throttledTrackActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 30000) { // Update at most every 30 seconds
        trackActivity();
        lastUpdate = now;
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledTrackActivity, { passive: true });
    });

    // Clean up event listeners
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledTrackActivity);
      });
    };
  }, []);

  // This component doesn't render anything
  return null;
}