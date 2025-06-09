"use client";

import { createContext, useContext, useEffect, useState } from "react";

// This context helps maintain session state across navigations
interface SessionStateContextType {
  setSessionValue: (key: string, value: any) => void;
  getSessionValue: (key: string) => any;
  clearSessionValue: (key: string) => void;
  clearAllSessionValues: () => void;
}

const SessionStateContext = createContext<SessionStateContextType | undefined>(undefined);

export function SessionStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  
  // Initialize provider
  useEffect(() => {
    setReady(true);
    
    // Add unload handler to clean up temporary session values
    const handleUnload = () => {
      // Clear any temporary flags but preserve authentication state
      sessionStorage.removeItem('preventRefresh');
      sessionStorage.removeItem('intentionalNavigation');
      
      // Set a flag to indicate this is a real page unload, not a tab switch
      sessionStorage.setItem('fullPageUnload', 'true');
    };
    
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);
  
  // Create a namespace for app session storage to avoid conflicts
  const APP_NAMESPACE = 'app_session_';
  
  const setSessionValue = (key: string, value: any) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`${APP_NAMESPACE}${key}`, JSON.stringify(value));
    }
  };
  
  const getSessionValue = (key: string) => {
    if (typeof window !== 'undefined') {
      const value = sessionStorage.getItem(`${APP_NAMESPACE}${key}`);
      if (value) {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }
    }
    return null;
  };
  
  const clearSessionValue = (key: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`${APP_NAMESPACE}${key}`);
    }
  };
  
  const clearAllSessionValues = () => {
    if (typeof window !== 'undefined') {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(APP_NAMESPACE)) {
          sessionStorage.removeItem(key);
        }
      });
    }
  };
  
  const contextValue: SessionStateContextType = {
    setSessionValue,
    getSessionValue,
    clearSessionValue,
    clearAllSessionValues
  };
  
  // Only render children once the provider is ready
  if (!ready) return null;
  
  return (
    <SessionStateContext.Provider value={contextValue}>
      {children}
    </SessionStateContext.Provider>
  );
}

export function useSessionState() {
  const context = useContext(SessionStateContext);
  if (context === undefined) {
    throw new Error("useSessionState must be used within a SessionStateProvider");
  }
  return context;
}
