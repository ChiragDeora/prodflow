'use client';

import { useEffect } from 'react';
import { useAuth } from './auth/AuthProvider';
import { usePathname } from 'next/navigation';

/**
 * ConsoleCleaner component that automatically cleans console errors
 * after successful login and when navigating to main application pages
 */
export default function ConsoleCleaner() {
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only clean console when user is authenticated and on main app pages
    // AND only in production environment (not in development)
    if (user && !pathname.startsWith('/auth') && !pathname.startsWith('/setup') && process.env.NODE_ENV === 'production') {
      // Clear console on main app pages
      console.clear();
      
      // Log clean state
      console.log('🧹 Console cleaned for production use');
      console.log('👤 Welcome back,', user.username);
      console.log('📍 Current page:', pathname);
      console.log('🚀 Ready for production scheduling');
      
      // Set console to production mode (less verbose)
      console.log = console.log.bind(console);
      console.info = console.info.bind(console);
      console.warn = console.warn.bind(console);
      console.error = console.error.bind(console);
      
      // Add a custom method to clear extension errors
      (window as any).clearExtensionErrors = () => {
        console.clear();
        console.log('🧹 Extension errors cleared');
        console.log('✅ Console ready for production use');
      };
      
      // Auto-clear extension errors every 5 seconds for the first minute
      let clearCount = 0;
      const intervalId = setInterval(() => {
        if (clearCount < 12) { // 12 * 5 seconds = 1 minute
          console.clear();
          console.log('🧹 Auto-clearing console for clean production environment');
          clearCount++;
        } else {
          clearInterval(intervalId);
        }
      }, 5000);
      
      // Cleanup function
      return () => {
        clearInterval(intervalId);
      };
    } else if (process.env.NODE_ENV === 'development') {
      // In development, just log that console cleaner is disabled
      console.log('🔧 Console cleaner disabled in development mode');
      console.log('🐛 All errors and logs will be visible for debugging');
    }
  }, [user, pathname]);

  // This component doesn't render anything
  return null;
}
