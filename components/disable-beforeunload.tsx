"use client";

import { useEffect } from 'react';

export function DisableBeforeUnload() {
  useEffect(() => {
    // This script runs on mount and immediately disables all beforeunload dialogs
    const disableBeforeUnloadPrompts = () => {
      // 1. First approach: Override the event directly
      const disableBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };
      
      // Add the event listener with capture to intercept all events
      window.addEventListener('beforeunload', disableBeforeUnload, { capture: true });
      
      // 2. Second approach: Monkey patch addEventListener
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = function(type, listener, options) {
        if (type === 'beforeunload') {
          // Replace the listener with our own that does nothing
          return originalAddEventListener.call(
            this, 
            type, 
            disableBeforeUnload,
            { capture: true, ...options }
          );
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // 3. Third approach: Completely remove the beforeunload property
      try {
        // This is a more aggressive approach that will work in most browsers
        Object.defineProperty(window, 'onbeforeunload', {
          get: function() { return null; },
          set: function() { return null; },
          configurable: true
        });
      } catch (e) {
        console.error('Could not override onbeforeunload property', e);
      }
      
      // 4. Fourth approach: Add a final handler that runs at the end of the event loop
      setTimeout(() => {
        window.addEventListener('beforeunload', disableBeforeUnload, { 
          capture: true,
          passive: false
        });
      }, 0);
      
      return () => {
        // Clean up
        window.addEventListener = originalAddEventListener;
        window.removeEventListener('beforeunload', disableBeforeUnload, { capture: true });
      };
    };
    
    // Run the disabling function
    const cleanup = disableBeforeUnloadPrompts();
    
    // Add a listener to re-apply our fix after any route change
    const handleRouteChange = () => {
      disableBeforeUnloadPrompts();
    };
    
    // This helps ensure our fix is applied even after navigating
    document.addEventListener('visibilitychange', handleRouteChange);
    
    return () => {
      // Clean up
      cleanup && cleanup();
      document.removeEventListener('visibilitychange', handleRouteChange);
    };
  }, []);
  
  // Also add an inline script that runs before React hydration
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Immediately disable beforeunload prompts
            (function() {
              window.addEventListener('beforeunload', function(e) {
                e.preventDefault();
                e.returnValue = '';
                return '';
              }, true);
              
              // Also remove any existing handlers
              window.onbeforeunload = null;
            })();
          `,
        }}
      />
    </>
  );
}

