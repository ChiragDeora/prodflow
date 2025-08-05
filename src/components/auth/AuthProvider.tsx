'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI, userProfileAPI, sessionManager, UserProfile, AuthUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName: string, department?: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
  updatePassword: (newPassword: string) => Promise<{ error?: any }>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  hasRole: (role: UserProfile['role'] | UserProfile['role'][]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  // Debug logging for admin role
  useEffect(() => {
    console.log('Admin role check:', {
      profile: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        department: profile.department
      } : null,
      isAdmin,
      user: user?.email
    });
  }, [profile, isAdmin, user]);

  const hasRole = (role: UserProfile['role'] | UserProfile['role'][]): boolean => {
    if (!profile) return false;
    if (Array.isArray(role)) {
      return role.includes(profile.role);
    }
    return profile.role === role;
  };

  const refreshProfile = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const { profile: userProfile } = await userProfileAPI.getProfile(user.id);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error?: any }> => {
    try {
      console.log('Signing in user:', email);
      setLoading(true);
      
      // Add timeout to prevent hanging
      const signInTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timeout')), 15000)
      );
      
      const signInPromise = authAPI.signIn({ email, password });
      const { user: authUser, session, error } = await Promise.race([signInPromise, signInTimeout]) as any;
      
      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      if (authUser && session) {
        console.log('Sign in successful, setting user');
        setUser(authUser);
        
        // Save user ID to localStorage immediately
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentUserId', authUser.id);
          // Store email for session expiration recovery
          if (authUser.email) {
            localStorage.setItem('lastUserEmail', authUser.email);
          }
        }
        
        // Fetch profile with timeout
        try {
          console.log('Fetching profile after sign in...');
          const profileTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
          );
          
          const profilePromise = userProfileAPI.getProfile(authUser.id);
          const { profile: userProfile } = await Promise.race([profilePromise, profileTimeout]) as any;
          console.log('Profile loaded:', userProfile?.full_name);
          setProfile(userProfile);
        } catch (profileError) {
          console.error('Error fetching profile after sign in:', profileError);
          // Continue without profile - don't block login
        }
      }

      return {};
    } catch (error) {
      console.error('Sign in exception:', error);
      return { error };
    } finally {
      console.log('Sign in complete, setting loading to false');
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, department?: string): Promise<{ error?: any }> => {
    try {
      setLoading(true);
      const { user: authUser, error } = await authAPI.signUp({
        email,
        password,
        fullName,
        department
      });
      
      if (error) {
        return { error };
      }

      // Note: User will need to confirm email before they can sign in
      return {};
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('Signing out user');
      
      // Clear state immediately
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      // Clear localStorage immediately
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('lastUserEmail');
      }
      
      console.log('State cleared, calling authAPI.signOut()');
      
      // Call the API signOut (but don't wait for it)
      authAPI.signOut().catch(error => {
        console.error('Sign out API error:', error);
      });
      
      console.log('Redirecting to login page');
      
      // Redirect immediately
      window.location.href = '/auth/login';
      
    } catch (error) {
      console.error('Sign out exception:', error);
      // Even if there's an error, clear state and redirect
      setUser(null);
      setProfile(null);
      setLoading(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('lastUserEmail');
      }
      window.location.href = '/auth/login';
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: any }> => {
    return await authAPI.resetPassword(email);
  };

  const updatePassword = async (newPassword: string): Promise<{ error?: any }> => {
    return await authAPI.updatePassword(newPassword);
  };

  // Initialize auth state and setup listeners
  useEffect(() => {
    let mounted = true;

    // Get initial session with improved error handling
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Simple auth initialization with timeout
        const authTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout')), 10000) // 10 second timeout
        );
        
        const authPromise = (async () => {
          const { session, error } = await authAPI.getSession();
          return { session, error };
        })();
        
        const { session, error } = await Promise.race([authPromise, authTimeout]) as { session: any; error?: any };
        
        console.log('Session result:', session ? 'Found session' : 'No session', error ? `Error: ${error.message}` : 'No error');
        
        if (error) {
          console.error('Session error:', error);
          // Clear any stale data on error
          if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('lastUserEmail');
          }
        }
        
        if (session?.user && mounted) {
          console.log('Setting user:', session.user.email);
          setUser(session.user as AuthUser);
          
          // Save user data
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentUserId', session.user.id);
            if (session.user.email) {
              localStorage.setItem('lastUserEmail', session.user.email);
            }
          }
          
          // Fetch profile (but don't block on it)
          userProfileAPI.getProfile(session.user.id).then(({ profile: userProfile }) => {
            if (mounted && userProfile) {
              console.log('Profile loaded:', userProfile?.full_name);
              setProfile(userProfile);
            }
          }).catch(profileError => {
            console.error('Error fetching profile:', profileError);
            console.log('Continuing without profile data');
          });
        } else {
          console.log('No valid session found');
          // Clear any stale data when no session is found
          if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('lastUserEmail');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // If auth fails, still stop loading and continue without auth
        if (mounted) {
          console.log('Auth failed, continuing without authentication');
          setLoading(false);
          // Clear any stale data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('lastUserEmail');
          }
        }
      } finally {
        if (mounted) {
          console.log('Auth initialization complete');
          setLoading(false);
        }
      }
    };

    // Simple fallback timeout
    const fallbackTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.log('Auth initialization timeout, forcing loading to false');
        setLoading(false);
      }
    }, 8000); // 8 second fallback

    console.log('Starting auth initialization...');
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            console.log('User signed in:', session.user.email);
            setUser(session.user as AuthUser);
            
            // Save user data
            if (typeof window !== 'undefined') {
              localStorage.setItem('currentUserId', session.user.id);
              if (session.user.email) {
                localStorage.setItem('lastUserEmail', session.user.email);
              }
            }
            
            // Fetch profile (but don't block)
            userProfileAPI.getProfile(session.user.id).then(({ profile: userProfile }) => {
              if (mounted && userProfile) {
                setProfile(userProfile);
              }
            }).catch(profileError => {
              console.error('Error fetching profile on auth change:', profileError);
            });
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setProfile(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('lastUserEmail');
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    isAdmin,
    hasRole
  };

  // Debug session status in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth state:', {
      user: user?.email,
      profile: profile?.full_name,
      loading,
      isAdmin
    });
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 