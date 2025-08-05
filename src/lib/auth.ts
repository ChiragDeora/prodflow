import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'user' | 'admin' | 'operator';
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  user_metadata?: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  department?: string;
}

// Password validation
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Email validation
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (!email.toLowerCase().endsWith('@polypacks.in')) {
    return { valid: false, error: 'Only @polypacks.in email addresses are allowed' };
  }
  
  return { valid: true };
};

// Auth API functions
export const authAPI = {
  // Sign up with email/password
  async signUp(data: SignupData): Promise<{ user: AuthUser | null; error: any }> {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.valid) {
      return { user: null, error: { message: emailValidation.error } };
    }
    
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      return { user: null, error: { message: passwordValidation.errors.join(', ') } };
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            department: data.department
          }
        }
      });

      return { user: authData.user, error };
    } catch (err) {
      return { user: null, error: err };
    }
  },

  // Sign in with email/password
  async signIn(credentials: LoginCredentials): Promise<{ user: AuthUser | null; session: any; error: any }> {
    const emailValidation = validateEmail(credentials.email);
    if (!emailValidation.valid) {
      return { user: null, session: null, error: { message: emailValidation.error } };
    }

    try {
      // Add timeout to prevent hanging
      const signInTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timeout')), 15000)
      );
      
      const signInPromise = supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });
      
      const { data, error } = await Promise.race([signInPromise, signInTimeout]) as any;

      if (error) {
        return { user: null, session: null, error };
      }

      // Check if email is confirmed
      if (!data.user?.email_confirmed_at) {
        return { 
          user: null, 
          session: null, 
          error: { message: 'Please confirm your email before logging in' } 
        };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err) {
      return { user: null, session: null, error: err };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: any }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Request password reset
  async resetPassword(email: string): Promise<{ error: any }> {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return { error: { message: emailValidation.error } };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    
    return { error };
  },

  // Update password
  async updatePassword(newPassword: string): Promise<{ error: any }> {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return { error: { message: passwordValidation.errors.join(', ') } };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    return { error };
  },

  // Get current session
  async getSession(): Promise<{ session: any; error: any }> {
    try {
      console.log('Getting session...');
      
      // Simple session get with timeout
      const sessionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session get timeout')), 10000) // 10 second timeout
      );
      
      const sessionPromise = supabase.auth.getSession();
      const { data, error } = await Promise.race([sessionPromise, sessionTimeout]) as any;
      
      console.log('Session result:', data.session ? 'Found' : 'Not found', error ? `Error: ${error.message}` : 'No error');
      
      if (error) {
        console.error('Session error:', error);
        return { session: null, error };
      }
      
      return { session: data.session, error: null };
    } catch (err) {
      console.error('Exception getting session:', err);
      return { session: null, error: err };
    }
  },

  // Get current user
  async getUser(): Promise<{ user: AuthUser | null; error: any }> {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  // Refresh session
  async refreshSession(): Promise<{ session: any; error: any }> {
    try {
      console.log('Refreshing session...');
      
      // Add timeout to prevent hanging
      const refreshTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session refresh timeout')), 8000) // 8 second timeout
      );
      
      const refreshPromise = supabase.auth.refreshSession();
      const { data, error } = await Promise.race([refreshPromise, refreshTimeout]) as any;
      
      console.log('Refresh result:', data.session ? 'Success' : 'Failed', error ? `Error: ${error.message}` : 'No error');
      return { session: data.session, error };
    } catch (err) {
      console.error('Exception refreshing session:', err);
      return { session: null, error: err };
    }
  }
};

// User profile API functions
export const userProfileAPI = {
  // Get user profile
  async getProfile(userId?: string): Promise<{ profile: UserProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId || (await supabase.auth.getUser()).data.user?.id)
        .single();

      return { profile: data, error };
    } catch (err) {
      return { profile: null, error: err };
    }
  },

  // Update user profile
  async updateProfile(updates: Partial<UserProfile>): Promise<{ profile: UserProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .select()
        .single();

      return { profile: data, error };
    } catch (err) {
      return { profile: null, error: err };
    }
  },

  // Get all profiles (admin only)
  async getAllProfiles(): Promise<{ profiles: UserProfile[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      return { profiles: data || [], error };
    } catch (err) {
      return { profiles: [], error: err };
    }
  },

  // Update user role (admin only)
  async updateUserRole(userId: string, role: UserProfile['role']): Promise<{ error: any }> {
    try {
      console.log('Updating user role:', { userId, role });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Error updating user role:', error);
        return { error };
      }

      console.log('User role updated successfully:', data);
      return { error: null };
    } catch (err) {
      console.error('Exception updating user role:', err);
      return { error: err };
    }
  },

  // Direct SQL update for user role (bypasses RLS)
  async updateUserRoleDirect(email: string, role: UserProfile['role']): Promise<{ error: any }> {
    try {
      console.log('Direct SQL update for user role:', { email, role });
      
      const { data, error } = await supabase
        .rpc('update_user_role_direct', { 
          user_email: email, 
          new_role: role 
        });

      if (error) {
        console.error('Error in direct SQL update:', error);
        return { error };
      }

      console.log('Direct SQL update successful:', data);
      return { error: null };
    } catch (err) {
      console.error('Exception in direct SQL update:', err);
      return { error: err };
    }
  }
};

// Session management
export const sessionManager = {
  // Simple session check - no expiry logic
  async isSessionValid(): Promise<boolean> {
    try {
      const { session } = await authAPI.getSession();
      return !!session && !!session.user;
    } catch (error) {
      console.log('Session check failed:', error);
      return false;
    }
  },

  // Force refresh session
  async forceRefresh(): Promise<boolean> {
    try {
      const { session, error } = await authAPI.refreshSession();
      return !!session && !error;
    } catch (error) {
      console.log('Session refresh failed:', error);
      return false;
    }
  }
};

// Role checking utilities
export const roleUtils = {
  // Check if user is admin
  async isAdmin(): Promise<boolean> {
    const { profile } = await userProfileAPI.getProfile();
    return profile?.role === 'admin';
  },

  // Check if user has required role
  async hasRole(requiredRole: UserProfile['role'] | UserProfile['role'][]): Promise<boolean> {
    const { profile } = await userProfileAPI.getProfile();
    if (!profile) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(profile.role);
    }
    
    return profile.role === requiredRole;
  },

  // Get user role
  async getUserRole(): Promise<UserProfile['role'] | null> {
    const { profile } = await userProfileAPI.getProfile();
    return profile?.role || null;
  }
}; 