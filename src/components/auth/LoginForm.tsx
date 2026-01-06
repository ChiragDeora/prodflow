'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError(); // Clear global auth errors
    setIsSubmitting(true);

    try {
      // Get password from ref (never stored in state)
      const loginPassword = passwordRef.current?.value || '';
      
      // Clear password field immediately
      if (passwordRef.current) {
        passwordRef.current.value = '';
      }
      
      const result = await login(username, loginPassword);
      
      if (result.success) {
        // Clear username on successful login
        setUsername('');
        setLocalError('');
        
        // Clear any URL parameters before redirecting (security)
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.search = ''; // Remove all query parameters
          window.history.replaceState({}, '', url.pathname);
        }
        
        // Wait for cookie to be fully set before redirecting
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (result.requiresPasswordReset) {
          router.push('/auth/change-password');
        } else {
          router.push('/');
        }
      } else {
        setLocalError(result.error || 'Login failed');
        // Restore focus to password field on error
        if (passwordRef.current) {
          passwordRef.current.focus();
        }
      }
    } catch (error) {
      setLocalError('An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Production Scheduler
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Polypacks Injection Molding ERP System
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {(localError || error) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {localError || error}
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setLocalError(''); // Clear error when user starts typing
                  clearError();
                }}
                disabled={isSubmitting}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                data-lpignore="true"
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                disabled={isSubmitting}
                onFocus={() => {
                  setLocalError(''); // Clear error when user focuses on password
                  clearError();
                }}
                onChange={() => {
                  setLocalError(''); // Clear error when user types in password
                  clearError();
                }}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/auth/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Don't have an account? Sign up
            </a>
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Only @polypacks.in email addresses are allowed</p>
          <p>New accounts require admin approval</p>
        </div>
      </div>
    </div>
  );
}
