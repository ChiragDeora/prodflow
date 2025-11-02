'use client';

import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRootAdmin?: boolean;
  redirectTo?: string;
}

export default function RouteGuard({ 
  children, 
  requireAuth = false, 
  requireRootAdmin = false,
  redirectTo = '/auth/login'
}: RouteGuardProps) {
  const { user, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Always check setup status first, regardless of loading state
    if (window.location.pathname !== '/setup') {
      checkSetupStatus();
    }

    // Check for logout timestamp to prevent back button access
    if (typeof window !== 'undefined') {
      const logoutTimestamp = localStorage.getItem('logoutTimestamp');
      if (logoutTimestamp) {
        const logoutTime = parseInt(logoutTimestamp);
        const currentTime = Date.now();
        const timeSinceLogout = currentTime - logoutTime;
        
        // If logout was less than 24 hours ago, force re-authentication
        if (timeSinceLogout < 24 * 60 * 60 * 1000) {
          console.log('🚫 RouteGuard: User has logged out, preventing back button access');
          localStorage.removeItem('logoutTimestamp');
          router.replace('/auth/login');
          return;
        } else {
          // Clear old logout timestamp
          localStorage.removeItem('logoutTimestamp');
        }
      }
    }

    if (!isLoading) {
      // Handle authentication requirements
      if (requireAuth && !user) {
        router.push(redirectTo);
        return;
      }

      if (requireRootAdmin && (!user || !user.isRootAdmin)) {
        router.push('/unauthorized');
        return;
      }

      // Handle password reset requirement
      if (user?.requiresPasswordReset && window.location.pathname !== '/auth/change-password') {
        router.push('/auth/change-password');
        return;
      }
    }
  }, [user, isLoading, requireAuth, requireRootAdmin, redirectTo, router]);

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup/root-admin');
      const data = await response.json();
      
      if (data.needsSetup && window.location.pathname !== '/setup') {
        router.push('/setup');
      }
    } catch (error) {
      console.error('Setup check error:', error);
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
              <button 
                onClick={clearError}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Clear Error
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show unauthorized if requirements not met
  if (requireAuth && !user) {
    return null; // Will redirect
  }

  if (requireRootAdmin && (!user || !user.isRootAdmin)) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
