"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// History state type definition
interface HistoryState {
  scrollY?: number;
}

// This hook preserves scroll position when navigating back
export function usePreserveScroll() {
  const pathname = usePathname();
  const scrollPositions = useRef<{[url: string]: number}>({});
  
  // Save scroll position before navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Save the current scroll position for this URL
      scrollPositions.current[pathname] = window.scrollY;
      
      // Custom handler for browser back/forward navigation
      const handlePopState = (event: PopStateEvent) => {
        const state = event.state as HistoryState;
        
        // Restore scroll position if available in state
        if (state && typeof state.scrollY === 'number') {
          setTimeout(() => {
            window.scrollTo(0, state.scrollY);
          }, 0);
        } 
        // Try to restore from our ref if not in history state
        else if (scrollPositions.current[pathname]) {
          setTimeout(() => {
            window.scrollTo(0, scrollPositions.current[pathname]);
          }, 0);
        }
      };
      
      window.addEventListener('popstate', handlePopState);
      
      // Save scroll position to history state
      const handleBeforeUnload = () => {
        const currentState = window.history.state || {};
        window.history.replaceState(
          { ...currentState, scrollY: window.scrollY },
          '',
          window.location.href
        );
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [pathname]);
}
