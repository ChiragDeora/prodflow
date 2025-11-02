'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * SecurityGuard component that prevents back button access after logout
 * and handles security-related browser events
 */
export default function SecurityGuard() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Function to check logout timestamp and prevent back button access
    const checkLogoutStatus = () => {
      const logoutTimestamp = localStorage.getItem('logoutTimestamp');
      if (logoutTimestamp) {
        const logoutTime = parseInt(logoutTimestamp);
        const currentTime = Date.now();
        const timeSinceLogout = currentTime - logoutTime;
        
        // If logout was less than 24 hours ago, force re-authentication
        if (timeSinceLogout < 24 * 60 * 60 * 1000) {
          console.log('🚫 SecurityGuard: User has logged out, preventing access');
          localStorage.removeItem('logoutTimestamp');
          router.replace('/auth/login');
          return true; // User was logged out
        } else {
          // Clear old logout timestamp
          localStorage.removeItem('logoutTimestamp');
        }
      }
      return false; // User was not logged out
    };

    // Check immediately on mount
    if (checkLogoutStatus()) {
      return; // Don't set up event listeners if user was logged out
    }

    // Prevent back button access after logout
    const handlePopState = (event: PopStateEvent) => {
      if (checkLogoutStatus()) {
        // Prevent the navigation and force login
        event.preventDefault();
        window.history.pushState(null, '', '/auth/login');
        return;
      }
    };

    // Prevent page refresh/reload if user has logged out
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const logoutTimestamp = localStorage.getItem('logoutTimestamp');
      if (logoutTimestamp) {
        const logoutTime = parseInt(logoutTimestamp);
        const currentTime = Date.now();
        const timeSinceLogout = currentTime - logoutTime;
        
        if (timeSinceLogout < 24 * 60 * 60 * 1000) {
          // Clear logout timestamp on page unload to prevent back button access
          localStorage.removeItem('logoutTimestamp');
        }
      }
    };

    // Set up event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router]);

  // This component doesn't render anything
  return null;
}
