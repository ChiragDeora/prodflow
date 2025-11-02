'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Simplified user profile interface
export interface SimpleUserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'user' | 'admin' | 'operator';
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Simplified auth user interface
export interface SimpleAuthUser {
  id: string;
  email: string;
  user_metadata?: any;
}

// Auth context interface
interface SimpleAuthContextType {
  user: SimpleAuthUser | null;
  profile: SimpleUserProfile | null;
  loading: boolean;
  signOut: () => void;
  hasRole: (role: SimpleUserProfile['role'] | SimpleUserProfile['role'][]) => boolean;
}

// Create the context
const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

// Default user profile
const defaultProfile: SimpleUserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  full_name: 'Current User',
  email: 'user@example.com',
  role: 'user',
  department: 'General',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Default auth user
const defaultUser: SimpleAuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  user_metadata: {
    full_name: 'Current User',
    role: 'user',
    department: 'General'
  }
};

// Provider component
export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SimpleAuthUser | null>(defaultUser);
  const [profile, setProfile] = useState<SimpleUserProfile | null>(defaultProfile);
  const [loading, setLoading] = useState(false);

  // Simple sign out function (just for compatibility)
  const signOut = () => {
    // No actual sign out needed since there's no authentication
    console.log('Sign out called (no authentication system)');
  };

  // Role checking function
  const hasRole = (role: SimpleUserProfile['role'] | SimpleUserProfile['role'][]): boolean => {
    if (!profile) return false;
    
    if (Array.isArray(role)) {
      return role.includes(profile.role);
    }
    
    return profile.role === role;
  };

  const value: SimpleAuthContextType = {
    user,
    profile,
    loading,
    signOut,
    hasRole
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

// Hook to use the auth context
export const useSimpleAuth = (): SimpleAuthContextType => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};
