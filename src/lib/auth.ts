import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: 'user' | 'admin' | 'operator';
  department?: string;
  is_active: boolean;
  is_approved?: boolean;
  email_confirmed_at?: string;
  auth_user_id?: string; // Links to auth.users.id
  auth_method?: 'pending' | 'password' | 'otp';
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovedPhoneNumber {
  id: string;
  phone_number: string;
  approved_by?: string;
  approved_at: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
  resource: string;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  access_level: 'read' | 'write' | 'admin';
  granted_by?: string;
  granted_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModulePermission {
  id: string;
  user_id: string;
  module_name: string;
  access_level: 'blocked' | 'read' | 'write' | 'admin';
  granted_by?: string;
  granted_at: string;
  is_active: boolean;
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
  phoneNumber: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
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

// Phone number validation
export const validatePhoneNumber = (phoneNumber: string): { valid: boolean; error?: string } => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  
  if (!phoneRegex.test(phoneNumber)) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  
  return { valid: true };
};

// Auth API functions
export const authAPI = {
  // Sign up with email/password and phone number
  async signUp(data: SignupData): Promise<{ user: AuthUser | null; error: any }> {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.valid) {
      return { user: null, error: { message: emailValidation.error } };
    }
    
    const phoneValidation = validatePhoneNumber(data.phoneNumber);
    if (!phoneValidation.valid) {
      return { user: null, error: { message: phoneValidation.error } };
    }
    
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      return { user: null, error: { message: passwordValidation.errors.join(', ') } };
    }

    console.log('Signup data received:', {
      email: data.email,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      department: data.department
    });

    try {
      // Phone number approval is no longer required - users can sign up with any valid phone number
      // The approval will happen after email confirmation

      // Sign up with phone number as primary identifier
      const tempEmail = `phone_${data.phoneNumber.replace(/[^0-9]/g, '')}@polypacks.in`;
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: tempEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone_number: data.phoneNumber,
            department: data.department,
            original_email: data.email // Store the original email
          },
          emailRedirectTo: `${window.location.origin}/auth/login`
        }
      });

      if (error) {
        return { user: null, error };
      }

        // Create user profile using RPC function (bypasses RLS)
        if (authData.user) {
          let profileData = null;
          let profileError = null;
          let retryCount = 0;
          const maxRetries = 3;
          
          // First, check if profile already exists for this phone number
          try {
            const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('phone_number', data.phoneNumber)
              .single();
            
            if (existingProfile) {
              console.log('Found existing profile for phone number:', existingProfile);
              
              // Connect to existing profile
              const result = await supabase
                .rpc('connect_user_profile_signup', {
                  user_id: authData.user.id,
                  full_name: data.fullName,
                  email: data.email,
                  phone_number: data.phoneNumber,
                  department: data.department || null
                });
              
              if (result.error) {
                console.error('Error connecting to existing profile:', result.error);
                profileError = result.error;
              } else {
                console.log('Successfully connected to existing profile:', result.data);
                profileData = result.data;
                profileError = null;
              }
            } else {
              // Check if profile exists by email (for admin-created profiles)
              const { data: emailProfile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('email', data.email)
                .single();
              
              if (emailProfile) {
                console.log('Found existing profile by email:', emailProfile);
                
                // Update the existing profile with the auth user ID
                const { data: updatedProfile, error: updateError } = await supabase
                  .from('user_profiles')
                  .update({
                    id: authData.user.id,
                    phone_number: data.phoneNumber,
                    department: data.department || emailProfile.department,
                    updated_at: new Date().toISOString()
                  })
                  .eq('email', data.email)
                  .select()
                  .single();
                
                if (updateError) {
                  console.error('Error updating existing profile:', updateError);
                  profileError = updateError;
                } else {
                  console.log('Successfully updated existing profile:', updatedProfile);
                  profileData = updatedProfile;
                  profileError = null;
                }
              } else {
                console.log('No existing profile found, will create new one');
                // Fall back to creating new profile if none exists
                profileData = null;
                profileError = null;
              }
            }
          } catch (checkError) {
            console.log('No existing profile found, will create new one');
            profileData = null;
            profileError = null;
          }
          
          // Only try to create if no existing profile was found/connected
          if (!profileData) {
            while (retryCount < maxRetries) {
              try {
                console.log(`Attempt ${retryCount + 1} to create profile...`);
                
                const result = await supabase
                  .rpc('create_user_profile_signup', {
                    user_id: authData.user.id,
                    full_name: data.fullName,
                    email: data.email,
                    phone_number: data.phoneNumber,
                    department: data.department || null,
                    role: 'user'
                  });
                
                profileData = result.data;
                profileError = result.error;
                
                if (!profileError) {
                  console.log('Profile created successfully on attempt', retryCount + 1);
                  break;
                }
                
                if (profileError.code === '23503') {
                  // Foreign key violation - user might not be ready yet
                  console.log('Foreign key violation, retrying...');
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  retryCount++;
                } else {
                  // Other error, don't retry
                  break;
                }
              } catch (err) {
                console.error('Exception during profile creation:', err);
                profileError = err;
                break;
              }
            }
          }
          
          if (profileError) {
            console.error('Profile creation error after retries:', profileError);
            console.error('Profile creation details:', {
              user_id: authData.user.id,
              full_name: data.fullName,
              email: data.email,
              phone_number: data.phoneNumber,
              department: data.department || null,
              role: 'user',
              is_active: true
            });
            
            // Try to get more specific error information
            let errorMessage = 'Account created but profile setup failed. Please contact administrator.';
            const error = profileError as any;
            if (error.code === '23505') {
              errorMessage = 'User profile already exists. Please try logging in instead.';
            } else if (error.code === '42P01') {
              errorMessage = 'Database function not found. Please run the migration first.';
            } else if (error.code === '23503') {
              errorMessage = 'User account not ready. Please try again in a moment.';
            } else if (error.message) {
              errorMessage = `Profile setup failed: ${error.message}`;
            }
            
            return { user: null, error: { message: errorMessage } };
          } else {
            console.log('Profile created successfully:', profileData);
          }
        
          // Phone number approval is no longer needed - approval happens after email confirmation
          
          // Set default read-only permissions for new user using database function
          if (authData.user) {
            try {
              const { error: permError } = await supabase
                .rpc('set_default_user_permissions', { user_id: authData.user.id });
              
              if (permError) {
                console.error('Default permission setup error:', permError);
              } else {
                console.log('Default permissions set for new user:', authData.user.id);
              }
            } catch (permError) {
              console.error('Permission setup error:', permError);
            }
          }
        }

        return { user: authData.user, error: null };
      } catch (err) {
        return { user: null, error: err };
      }
    },

  // Sign in with phone number/password
  async signIn(credentials: LoginCredentials): Promise<{ user: AuthUser | null; session: any; error: any }> {
    const phoneValidation = validatePhoneNumber(credentials.phoneNumber);
    if (!phoneValidation.valid) {
      return { user: null, session: null, error: { message: phoneValidation.error } };
    }

    try {
      // Add timeout to prevent hanging
      const signInTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timeout')), 15000)
      );
      
      // Custom phone number login - find user by phone number
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('auth_user_id, is_approved')
        .eq('phone_number', credentials.phoneNumber)
        .single();

      if (userError || !userData) {
        return { user: null, session: null, error: { message: 'User not found with this phone number' } };
      }

      if (!userData.is_approved) {
        return { user: null, session: null, error: { message: 'Your account is pending approval. Please contact your administrator.' } };
      }

      // Now sign in with the auth_user_id
      const signInPromise = supabase.auth.signInWithPassword({
        email: userData.auth_user_id, // Use auth_user_id as email for Supabase
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

      // Check if user is approved (even after email confirmation)
      try {
        const { data: approvalData, error: approvalError } = await supabase
          .rpc('check_user_approval_for_login', { user_phone: credentials.phoneNumber });
        
        if (approvalError) {
          console.error('Approval check error:', approvalError);
          return { 
            user: null, 
            session: null, 
            error: { message: 'Failed to verify user approval status' } 
          };
        }
        
        if (!approvalData) {
          return { 
            user: null, 
            session: null, 
            error: { message: 'Your account is pending approval. Please contact your administrator.' } 
          };
        }
      } catch (approvalErr) {
        console.error('Approval check exception:', approvalErr);
        return { 
          user: null, 
          session: null, 
          error: { message: 'Failed to verify user approval status' } 
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
  },

  // Test function to check signup process
  async testSignupProcess(): Promise<{ success: boolean; error: any }> {
    try {
      console.log('Testing signup process...');
      
      // Test if we can access the user_profiles table
      const { data: testData, error: testError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('Test access error:', testError);
        return { success: false, error: testError };
      }
      
      console.log('Table access test successful');
      return { success: true, error: null };
    } catch (err) {
      console.error('Test signup process error:', err);
      return { success: false, error: err };
    }
  },

  // Fix Yogesh's profile connection
  async fixYogeshProfile(): Promise<{ success: boolean; error: any; message: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== 'yogesh@polypacks.in') {
        return { success: false, error: null, message: 'Only Yogesh can run this fix' };
      }

      console.log('Fixing Yogesh profile connection...');
      console.log('Auth user ID:', user.id);
      console.log('Auth user email:', user.email);

      // Update Yogesh's profile to use his auth user ID
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('email', 'yogesh@polypacks.in')
        .select()
        .single();

      if (updateError) {
        console.error('Error updating Yogesh profile:', updateError);
        return { success: false, error: updateError, message: 'Failed to update profile' };
      }

      console.log('Yogesh profile updated:', updatedProfile);
      return { success: true, error: null, message: 'Profile connection fixed successfully' };
    } catch (err) {
      console.error('Exception fixing Yogesh profile:', err);
      return { success: false, error: err, message: 'Exception occurred' };
    }
  },

  // Test database setup and function availability
  async testDatabaseSetup(): Promise<{ success: boolean; error: any; details: any }> {
    try {
      console.log('Testing database setup...');
      
      // Test if user_profiles table exists and is accessible
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);
      
      // Test if approved_phone_numbers table exists and is accessible
      const { data: phoneData, error: phoneError } = await supabase
        .from('approved_phone_numbers')
        .select('count')
        .limit(1);
      
      // Test if RPC functions exist
      const { data: createProfileData, error: createProfileError } = await supabase
        .rpc('create_empty_user_profile_for_phone', {
          phone_number: '+919999999999',
          approved_by_name: 'Test'
        });
      
      const { data: connectProfileData, error: connectProfileError } = await supabase
        .rpc('connect_user_profile_signup', {
          user_id: '00000000-0000-0000-0000-000000000000',
          full_name: 'Test User',
          email: 'test@test.com',
          phone_number: '+919999999999',
          department: 'Test'
        });
      
      const { data: validatePhoneData, error: validatePhoneError } = await supabase
        .rpc('validate_signup_phone', {
          phone_number: '+919999999999'
        });
      
      const details = {
        userProfiles: {
          exists: !profilesError,
          error: profilesError?.message
        },
        approvedPhoneNumbers: {
          exists: !phoneError,
          error: phoneError?.message
        },
        createEmptyProfileFunction: {
          exists: !createProfileError,
          error: createProfileError?.message,
          data: createProfileData
        },
        connectProfileFunction: {
          exists: !connectProfileError,
          error: connectProfileError?.message,
          data: connectProfileData
        },
        validatePhoneFunction: {
          exists: !validatePhoneError,
          error: validatePhoneError?.message,
          data: validatePhoneData
        }
      };
      
      const success = !profilesError && !phoneError && !createProfileError && !connectProfileError && !validatePhoneError;
      
      console.log('Database setup test results:', details);
      
      return { success, error: null, details };
    } catch (err) {
      console.error('Database setup test error:', err);
      return { success: false, error: err, details: null };
    }
  },

  // Admin user creation with full auth account (temporary for password-based auth)
  async createUserAsAdmin(userData: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    department?: string;
    role?: 'user' | 'admin' | 'operator';
  }): Promise<{ user: AuthUser | null; error: any }> {
    try {
      console.log('Admin creating user with auth account:', userData);

      // First, check if current user is admin by auth_user_id
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { user: null, error: { message: 'Not authenticated' } };
      }

      // Check if current user is admin by looking up their profile with auth_user_id
      const { data: currentProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('auth_user_id', currentUser.id)
        .single();

      if (profileError || !currentProfile || currentProfile.role !== 'admin') {
        return { user: null, error: { message: 'Only admins can create users' } };
      }

      // Create standalone profile first (not linked to auth yet)
      const newProfileId = crypto.randomUUID();
      
      const { data: profileData, error: createProfileError } = await supabase
        .from('user_profiles')
        .insert({
          id: newProfileId,
          full_name: userData.fullName,
          email: userData.email,
          phone_number: userData.phoneNumber,
          department: userData.department || null,
          role: userData.role || 'user',
          is_active: true,
          auth_method: 'pending' // Will be updated when user logs in
        })
        .select()
        .single();

      if (createProfileError) {
        console.error('Profile creation error:', createProfileError);
        return { user: null, error: { message: 'Failed to create user profile: ' + createProfileError.message } };
      }

      // Create auth user with admin signup (this will work since we're authenticated)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            phone_number: userData.phoneNumber,
            department: userData.department
          }
        }
      });

      if (authError) {
        console.error('Auth user creation error:', authError);
        // Clean up the profile if auth creation failed
        await supabase.from('user_profiles').delete().eq('id', newProfileId);
        return { user: null, error: { message: 'Failed to create auth account: ' + authError.message } };
      }

      // Link the profile to the auth user
      if (authData.user) {
        const { error: linkError } = await supabase
          .from('user_profiles')
          .update({
            auth_user_id: authData.user.id,
            auth_method: 'password',
            updated_at: new Date().toISOString()
          })
          .eq('id', newProfileId);

        if (linkError) {
          console.error('Profile linking error:', linkError);
          // Don't fail completely, just log the error
        } else {
          console.log('Profile linked to auth user successfully');
        }
      }

      // Add phone number to approved list (with conflict handling)
      try {
        const { error: phoneError } = await supabase
          .from('approved_phone_numbers')
          .upsert({
            phone_number: userData.phoneNumber,
            approved_by: currentUser.id,
            notes: `Admin-created user: ${userData.fullName}`,
            is_active: true
          }, {
            onConflict: 'phone_number'
          });
        
        if (phoneError && phoneError.code !== '23505') {
          console.error('Error adding phone to approved list:', phoneError);
        }
      } catch (phoneError) {
        console.error('Exception adding phone to approved list:', phoneError);
      }

      console.log('User created successfully with auth account');
      return { 
        user: authData.user as AuthUser, 
        error: null 
      };
    } catch (err) {
      console.error('Admin user creation exception:', err);
      return { user: null, error: err };
    }
  }
};

// User profile API functions
export const userProfileAPI = {
  // Get user profile by auth_user_id (new approach)
  async getProfile(authUserId?: string): Promise<{ profile: UserProfile | null; error: any }> {
    try {
      const targetUserId = authUserId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) {
        return { profile: null, error: { message: 'No user ID available' } };
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', targetUserId)
        .single();

      return { profile: data, error };
    } catch (err) {
      return { profile: null, error: err };
    }
  },

  // Get user profile by email
  async getProfileByEmail(email: string): Promise<{ profile: UserProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      return { profile: data, error };
    } catch (err) {
      return { profile: null, error: err };
    }
  },

  // Link profile during authentication (new approach)
  async linkUserProfile(email: string): Promise<{ profile: UserProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .rpc('link_user_profile', { user_email: email });

      if (error) {
        return { profile: null, error };
      }

      return { profile: data as UserProfile, error: null };
    } catch (err) {
      return { profile: null, error: err };
    }
  },

  // Create profile for authenticated user who doesn't have one (fallback)
  async createProfileForAuthenticatedUser(): Promise<{ profile: UserProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .rpc('create_profile_for_authenticated_user');

      if (error) {
        return { profile: null, error };
      }

      return { profile: data as UserProfile, error: null };
    } catch (err) {
      return { profile: null, error: err };
    }
  },

  // Direct profile fetch (bypasses RLS for debugging)
  async getProfileDirect(userId?: string): Promise<{ profile: UserProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_profile_direct', { 
          user_id: userId || (await supabase.auth.getUser()).data.user?.id 
        });

      // Handle JSON response
      if (data && typeof data === 'object') {
        return { profile: data as UserProfile, error: null };
      }

      return { profile: null, error: error || new Error('No profile data returned') };
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

  // Delete user (admin only)
  async deleteUser(userId: string): Promise<{ error: any }> {
    try {
      console.log('Deleting user:', userId);
      
      // First delete related permissions
      const { error: permError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);
      
      if (permError) {
        console.error('Error deleting user permissions:', permError);
      }

      // Delete module permissions
      const { error: modulePermError } = await supabase
        .from('module_permissions')
        .delete()
        .eq('user_id', userId);
      
      if (modulePermError) {
        console.error('Error deleting module permissions:', modulePermError);
      }

      // Finally delete the user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Error deleting user profile:', profileError);
        return { error: profileError };
      }

      console.log('User deleted successfully:', userId);
      return { error: null };
    } catch (err) {
      console.error('Exception deleting user:', err);
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

// Approved phone numbers API
export const approvedPhoneNumbersAPI = {
  // Get all approved phone numbers (admin only)
  async getAll(): Promise<{ phoneNumbers: ApprovedPhoneNumber[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('approved_phone_numbers')
        .select('*')
        .order('created_at', { ascending: false });

      return { phoneNumbers: data || [], error };
    } catch (err) {
      return { phoneNumbers: [], error: err };
    }
  },

  // Add approved phone number (admin only)
  async add(phoneNumber: string, notes?: string): Promise<{ phoneNumber: ApprovedPhoneNumber | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('approved_phone_numbers')
        .insert({
          phone_number: phoneNumber,
          notes,
          approved_by: user?.id
        })
        .select()
        .single();

      return { phoneNumber: data, error };
    } catch (err) {
      return { phoneNumber: null, error: err };
    }
  },

  // Remove approved phone number (admin only)
  async remove(phoneNumberId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('approved_phone_numbers')
        .delete()
        .eq('id', phoneNumberId);

      return { error };
    } catch (err) {
      return { error: err };
    }
  },

  // Check if phone number is approved
  async isApproved(phoneNumber: string): Promise<{ approved: boolean; error: any }> {
    try {
      const { data, error } = await supabase
        .rpc('is_phone_approved', { phone_number: phoneNumber });

      return { approved: data || false, error };
    } catch (err) {
      return { approved: false, error: err };
    }
  }
};

// Permissions API
export const permissionsAPI = {
  // Get all permissions
  async getAll(): Promise<{ permissions: Permission[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('name', { ascending: true });

      return { permissions: data || [], error };
    } catch (err) {
      return { permissions: [], error: err };
    }
  },

  // Get user permissions
  async getUserPermissions(userId: string): Promise<{ userPermissions: UserPermission[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          *,
          permission:permissions(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      return { userPermissions: data || [], error };
    } catch (err) {
      return { userPermissions: [], error: err };
    }
  },

  // Grant permission to user (admin only)
  async grantPermission(userId: string, permissionId: string, accessLevel: UserPermission['access_level']): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_id: permissionId,
          access_level: accessLevel,
          granted_by: user?.id,
          is_active: true
        });

      return { error };
    } catch (err) {
      return { error: err };
    }
  },

  // Revoke permission from user (admin only)
  async revokePermission(userId: string, permissionId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('permission_id', permissionId);

      return { error };
    } catch (err) {
      return { error: err };
    }
  },

  // Check if user has specific permission
  async hasPermission(userId: string, permissionName: string): Promise<{ hasPermission: boolean; error: any }> {
    try {
      const { data, error } = await supabase
        .rpc('check_user_permission', { 
          user_id: userId, 
          permission_name: permissionName 
        });

      return { hasPermission: data || false, error };
    } catch (err) {
      return { hasPermission: false, error: err };
    }
  }
};

// Module permissions API
export const modulePermissionsAPI = {
  // Get user module permissions
  async getUserModulePermissions(userId: string): Promise<{ modulePermissions: ModulePermission[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('module_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      return { modulePermissions: data || [], error };
    } catch (err) {
      return { modulePermissions: [], error: err };
    }
  },

  // Set module permission for user (admin only)
  async setModulePermission(userId: string, moduleName: string, accessLevel: ModulePermission['access_level']): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('module_permissions')
        .upsert({
          user_id: userId,
          module_name: moduleName,
          access_level: accessLevel,
          granted_by: user?.id,
          is_active: true
        });

      return { error };
    } catch (err) {
      return { error: err };
    }
  },

  // Get user's access level for a module
  async getModuleAccess(userId: string, moduleName: string): Promise<{ accessLevel: string; error: any }> {
    try {
      const { data, error } = await supabase
        .rpc('check_module_access', { 
          user_id: userId, 
          module_name: moduleName 
        });

      return { accessLevel: data || 'read', error };
    } catch (err) {
      return { accessLevel: 'read', error: err };
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

// Access control utilities
export const accessControlUtils = {
  // Check if user can access a module
  async canAccessModule(moduleName: string): Promise<{ canAccess: boolean; accessLevel: string; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { canAccess: false, accessLevel: 'blocked', error: null };
      }

      const { accessLevel, error } = await modulePermissionsAPI.getModuleAccess(user.id, moduleName);
      
      if (error) {
        return { canAccess: false, accessLevel: 'blocked', error };
      }

      const canAccess = accessLevel !== 'blocked';
      return { canAccess, accessLevel, error: null };
    } catch (err) {
      return { canAccess: false, accessLevel: 'blocked', error: err };
    }
  },

  // Check if user has specific permission
  async hasPermission(permissionName: string): Promise<{ hasPermission: boolean; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { hasPermission: false, error: null };
      }

      return await permissionsAPI.hasPermission(user.id, permissionName);
    } catch (err) {
      return { hasPermission: false, error: err };
    }
  },

  // Check if user can perform action on resource
  async canPerformAction(action: string, resource: string): Promise<{ canPerform: boolean; error: any }> {
    try {
      const permissionName = `${resource}.${action}`;
      const { hasPermission, error } = await this.hasPermission(permissionName);
      return { canPerform: hasPermission, error };
    } catch (err) {
      return { canPerform: false, error: err };
    }
  }
}; 