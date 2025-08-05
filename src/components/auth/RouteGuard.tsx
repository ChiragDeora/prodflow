'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { UserProfile } from '../../lib/auth';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'user' | 'admin' | 'operator' | ('user' | 'admin' | 'operator')[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
  requiredRole,
  fallback,
  redirectTo
}) => {
  const { user, profile, loading, hasRole } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Add timeout for loading state
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('RouteGuard loading timeout, forcing render');
        setLoadingTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    console.log('RouteGuard state:', { loading, user: !!user, profile: !!profile, shouldRender });
    
    if (loading && !loadingTimeout) {
      return;
    }

    // Check authentication requirement
    if (requireAuth && !user) {
      console.log('No user found, redirecting to login');
      // Clear any stale session data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('lastUserEmail');
      }
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole)) {
      console.log('User does not have required role, redirecting to unauthorized');
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        window.location.href = '/unauthorized';
      }
      return;
    }

    console.log('Setting shouldRender to true');
    setShouldRender(true);
  }, [user, profile, loading, loadingTimeout, requireAuth, requiredRole, hasRole, redirectTo]);

  // Show loading state
  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show fallback if access denied
  if (!shouldRender) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Access Denied</p>
          <p className="text-sm text-gray-400 mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Higher-order component for role-based route protection
export const withRoleGuard = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserProfile['role'] | UserProfile['role'][],
  redirectTo?: string
) => {
  return (props: P) => (
    <RouteGuard requiredRole={requiredRole} redirectTo={redirectTo}>
      <Component {...props} />
    </RouteGuard>
  );
};

// Specific role guard components
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard requiredRole="admin">
    {children}
  </RouteGuard>
);

export const OperatorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard requiredRole={['admin', 'operator']}>
    {children}
  </RouteGuard>
);

export const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard requiredRole={['admin', 'operator', 'user']}>
    {children}
  </RouteGuard>
); 