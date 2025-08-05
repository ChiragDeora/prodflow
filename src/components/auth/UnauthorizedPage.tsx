'use client';

import React from 'react';
import { useAuth } from './AuthProvider';

export const UnauthorizedPage: React.FC = () => {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Lock Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h2>
            
            <div className="text-gray-600 space-y-2 mb-6">
              <p>You don't have the required permissions to access this page.</p>
              {profile && (
                <p className="text-sm">
                  Current role: <span className="font-medium capitalize">{profile.role}</span>
                </p>
              )}
            </div>

            {/* User Info */}
            {user && profile && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-600">
                  <p><span className="font-medium">Signed in as:</span> {profile.full_name}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <p><span className="font-medium">Role:</span> {profile.role}</p>
                  {profile.department && (
                    <p><span className="font-medium">Department:</span> {profile.department}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => window.history.back()}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ← Go Back
              </button>

              <a
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </a>

              <button
                onClick={handleSignOut}
                className="w-full flex justify-center py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out & Login as Different User
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Need Access?</h3>
            <p className="text-xs text-blue-600 mb-3">
              If you believe you should have access to this page, contact your system administrator.
            </p>
            <div className="text-xs text-blue-600">
              <p><strong>Contact Information:</strong></p>
              <p>Email: admin@polypacks.in</p>
              <p>Include your email address and the page you're trying to access.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 