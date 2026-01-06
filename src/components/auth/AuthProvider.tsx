'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  status: string;
  isRootAdmin: boolean;
  requiresPasswordReset?: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  department?: string;
  jobTitle?: string;
  permissions?: Record<string, boolean>;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; requiresPasswordReset?: boolean }>;
  logout: () => Promise<void>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

interface SignupData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch user permissions
  const fetchPermissions = async (): Promise<Record<string, boolean>> => {
    try {
      const response = await fetch('/api/user/permissions', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.permissions || {};
      }
      return {};
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return {};
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
    
    // Cleanup function to remove event listeners
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', () => {
          window.history.pushState(null, '', '/auth/login');
        });
      }
    };
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔍 Starting auth check...');
      setError(null); // Clear any previous errors
      
      // Add timeout to prevent hanging (20 seconds for cold database connections)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch('/api/auth/verify-session', {
        credentials: 'include', // Important: ensures cookies are sent
        signal: controller.signal,
        cache: 'no-store' // Prevent caching of auth responses
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Auth successful, user data:', data.user);
        
        // Clear any stale logout timestamp since we have a valid session
        if (typeof window !== 'undefined') {
          localStorage.removeItem('logoutTimestamp');
        }
        
        // Use permissions from response if available, otherwise fetch separately
        const permissions = data.user.permissions || await fetchPermissions();
        console.log('✅ Permissions loaded:', Object.keys(permissions).length, 'permissions');
        
        setUser({ ...data.user, permissions });
        setError(null);
      } else {
        setUser(null);
        
        // Check logout timestamp ONLY when session verification fails
        if (typeof window !== 'undefined') {
          const logoutTimestamp = localStorage.getItem('logoutTimestamp');
          if (logoutTimestamp) {
            const logoutTime = parseInt(logoutTimestamp);
            const currentTime = Date.now();
            const timeSinceLogout = currentTime - logoutTime;
            
            // If logout was less than 24 hours ago, show message and redirect
            if (timeSinceLogout < 24 * 60 * 60 * 1000) {
              console.log('🚫 User has logged out, preventing back button access');
              localStorage.removeItem('logoutTimestamp');
              router.replace('/auth/login');
              setIsLoading(false);
              return;
            } else {
              // Clear old logout timestamp
              localStorage.removeItem('logoutTimestamp');
            }
          }
        }
        
        // Only set error for non-401 responses (401 just means not logged in)
        if (response.status !== 401) {
          try {
            const errorData = await response.json();
            console.log('❌ Auth error:', errorData.error || 'Authentication error');
            setError(errorData.error || 'Authentication error');
          } catch (parseError) {
            console.log('❌ Could not parse error response');
            setError('Authentication error');
          }
        }
      }
    } catch (error) {
      // Only log non-AbortError errors to reduce noise
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('❌ Auth check error:', error);
        setError('Network error. Please check your connection.');
      } else if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏰ Auth check timed out or was cancelled');
      }
      setUser(null);
    } finally {
      console.log('🏁 Auth check completed, setting loading to false');
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setError(null); // Clear any previous errors
      setIsLoading(true); // Show loading during login
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        // Clear logout timestamp to prevent false logouts on refresh
        if (typeof window !== 'undefined') {
          localStorage.removeItem('logoutTimestamp');
        }
        
        // Use permissions from response if available, otherwise fetch separately
        const permissions = data.user.permissions || await fetchPermissions();
        
        setUser({ ...data.user, permissions });
        setError(null);
        
        // Clear console errors after successful login
        if (typeof window !== 'undefined') {
          console.clear();
          console.log('✅ Login successful');
          console.log('👤 User:', data.user.username);
          console.log('🔐 Role:', data.user.isRootAdmin ? 'Root Admin' : 'User');
          console.log('🔑 Permissions loaded:', Object.keys(permissions).length, 'permissions');
        }
        
        return { 
          success: true, 
          requiresPasswordReset: data.user.requiresPasswordReset 
        };
      } else {
        setUser(null);
        setError(data.error || 'Login failed');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      setError('Network error. Please try again.');
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setError(null); // Clear any errors on logout

    // Fire-and-forget server logout so the UI can navigate instantly.
    // The request continues in the background; our front-end still
    // treats the user as logged out immediately via local state.
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch((error) => {
      console.error('Logout error:', error);
    });

    // Clear user preferences from localStorage before logout
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const keysToRemove: string[] = [];
      
      // Find all keys that belong to the current user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(`_${userId}`)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all user-specific keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} user preferences on logout`);
      
      // Mark that we navigated here via logout so the login page
      // can safely force a one-time reload if needed.
      sessionStorage.setItem('fromLogout', '1');
    }
    
    // Immediately drop auth state on the client
    setUser(null);
    setError(null);
    
    // Add a logout timestamp to prevent back button access
    if (typeof window !== 'undefined') {
      localStorage.setItem('logoutTimestamp', Date.now().toString());
      
      // Clear browser history to prevent back button access
      if (window.history && window.history.pushState) {
        // Replace current history entry with login page
        window.history.replaceState(null, '', '/auth/login');
        // Clear all history entries
        window.history.pushState(null, '', '/auth/login');
      }
    }
    
    // Force navigation to login page and prevent back button
    router.replace('/auth/login');
    
    // Additional security: disable back button after logout
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/auth/login');
        window.addEventListener('popstate', () => {
          window.history.pushState(null, '', '/auth/login');
        });
      }
    }, 100);
  };

  const signup = async (data: SignupData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        // Update user to reflect password change
        if (user) {
          setUser({ ...user, requiresPasswordReset: false });
        }
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const refreshPermissions = async () => {
    if (user) {
      const permissions = await fetchPermissions();
      setUser({ ...user, permissions });
      console.log('🔄 Permissions refreshed:', Object.keys(permissions).length, 'permissions');
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    clearError,
    login,
    logout,
    signup,
    changePassword,
    refreshUser,
    refreshPermissions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
