'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { validateEmail, validatePassword, validatePhoneNumber, authAPI } from '../../lib/auth';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, redirectTo = '/' }) => {
  const { signIn, loading } = useAuth();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    password: '',
    passwordFilled: false
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check for pre-filled phone number from localStorage
  React.useEffect(() => {
    // Try to pre-fill phone number from localStorage if available
    if (typeof window !== 'undefined') {
      const storedPhone = localStorage.getItem('lastUserPhone');
      if (storedPhone) {
        setFormData(prev => ({ ...prev, phoneNumber: storedPhone }));
      }
    }
  }, []);

  // Check for pre-filled password on component mount
  React.useEffect(() => {
    // Check immediately
    checkPasswordField();
    
    // Check again after delays to catch browser auto-fill
    setTimeout(checkPasswordField, 100);
    setTimeout(checkPasswordField, 500);
    setTimeout(checkPasswordField, 1000);
    
    // Also listen for input events on the password field
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (passwordInput) {
      const handlePasswordInput = () => {
        checkPasswordField();
      };
      
      passwordInput.addEventListener('input', handlePasswordInput);
      
      return () => {
        passwordInput.removeEventListener('input', handlePasswordInput);
      };
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Security: Don't log password values
    if (name === 'password') {
      console.log(`Password field updated (value hidden for security)`);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Security: Don't store password in state, only track if it's filled
    if (name === 'password') {
      setFormData(prev => ({
        ...prev,
        passwordFilled: value.length > 0
      }));
      
      // Clear password error when user starts typing
      if (errors.password) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.password;
          return newErrors;
        });
      }
    }
  };

  // Force check password field value on mount and after delays
  const checkPasswordField = () => {
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (passwordInput) {
      const hasPassword = passwordInput.value.length > 0;
      setFormData(prev => ({ ...prev, passwordFilled: hasPassword }));
      console.log('Password field check:', { hasPassword, valueLength: passwordInput.value.length });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Phone number validation
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else {
      const phoneValidation = validatePhoneNumber(formData.phoneNumber);
      if (!phoneValidation.valid) {
        newErrors.phoneNumber = phoneValidation.error || 'Invalid phone number';
      }
    }

    // Password validation - get from DOM since we don't store in state
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const password = passwordInput?.value || '';
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get password value directly from DOM for security
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const password = passwordInput?.value || '';
    
    // Validate password
    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      console.log('Attempting login for:', formData.phoneNumber);
      const { error } = await signIn(formData.phoneNumber, password);
      
      if (error) {
        console.error('Login error:', error);
        if (error.message?.includes('Rate limit') || error.message?.includes('Too many')) {
          setErrors({ form: 'Too many login attempts. Please try again later.' });
        } else if (error.message?.includes('Email not confirmed')) {
          setErrors({ form: 'Please confirm your email before logging in. Check your inbox for a confirmation link.' });
        } else if (error.message?.includes('Invalid login credentials')) {
          setErrors({ form: 'Invalid email or password. Please try again.' });
        } else if (error.message?.includes('domain')) {
          setErrors({ form: 'Only @polypacks.in email addresses are allowed.' });
        } else if (error.message?.includes('timeout') || error.message?.includes('Sign in timeout')) {
          setErrors({ form: 'Login is taking too long. Please check your connection and try again.' });
        } else {
          setErrors({ form: error.message || 'Login failed. Please try again.' });
        }
      } else {
        console.log('Login successful, redirecting...');
        // Success - add a small delay to ensure auth state is updated
        setTimeout(() => {
          console.log('Redirecting after successful login...');
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = redirectTo;
          }
        }, 1000); // Increased delay to ensure auth state is properly updated
      }
    } catch (error) {
      console.error('Login exception:', error);
      setErrors({ form: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.phoneNumber && formData.passwordFilled && Object.keys(errors).length === 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Sign In</h2>
          <p className="text-gray-600 mt-2">Access your production scheduler</p>
        </div>
        
        {/* Debug button for testing session refresh */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-center mb-4 space-y-2">
            <button
              onClick={async () => {
                try {
                  const { session } = await authAPI.getSession();
                  console.log('Manual session check:', session ? 'Valid' : 'Invalid');
                  alert(session ? 'Session is valid' : 'Session is invalid');
                } catch (error) {
                  console.error('Session check failed:', error);
                  alert('Session check failed');
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline block"
            >
              Debug: Check Session
            </button>
            <button
              onClick={() => {
                checkPasswordField();
                const passwordInput = document.getElementById('password') as HTMLInputElement;
                console.log('Manual password check:', {
                  value: passwordInput?.value || 'no input found',
                  valueLength: passwordInput?.value?.length || 0,
                  passwordFilled: formData.passwordFilled
                });
              }}
              className="text-xs text-green-600 hover:text-green-800 underline block"
            >
              Debug: Check Password Field
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Phone Number Field */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+919876543210"
              disabled={isSubmitting || loading}
              autoComplete="tel"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                onChange={handlePasswordChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-gray-900 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                disabled={isSubmitting || loading}
                autoComplete="current-password"
                data-testid="password-input"
                spellCheck="false"
                autoCorrect="off"
                autoCapitalize="off"
                ref={(el) => {
                  if (el) el.setAttribute('data-secure', 'true');
                }}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting || loading}
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Form Error */}
          {errors.form && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-2 text-sm text-red-600">
                  <p>{errors.form}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting || loading}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isFormValid && !isSubmitting && !loading
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting || loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Links */}
          <div className="text-center space-y-2">
            <a
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Forgot your password?
            </a>
            <div className="text-sm text-gray-600">
              Need an account?{' '}
              <span className="text-gray-500">
                Contact your administrator
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Only employees with @polypacks.in email addresses can access this system.
        </p>
      </div>
    </div>
  );
}; 