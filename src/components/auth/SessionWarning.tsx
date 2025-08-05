'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { authAPI } from '../../lib/auth';

interface SessionWarningProps {
  warningMinutes?: number; // Show warning X minutes before expiry
  autoLogoutMinutes?: number; // Auto logout X minutes after warning
}

export const SessionWarning: React.FC<SessionWarningProps> = ({
  warningMinutes = 5,
  autoLogoutMinutes = 1
}) => {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (!user) return;

    let warningTimer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;
    let autoLogoutTimer: NodeJS.Timeout;

    const checkSessionExpiry = async () => {
      try {
        // Add timeout to prevent hanging during sign out
        const sessionTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 15000) // Increased to 15 seconds
        );
        
        const sessionPromise = authAPI.getSession();
        const { session } = await Promise.race([sessionPromise, sessionTimeout]) as any;
        
        if (!session || !session.expires_at) {
          console.log('SessionWarning: No session found, skipping warning');
          return;
        }

        const expiresAt = session.expires_at * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const warningTime = warningMinutes * 60 * 1000; // Warning time in milliseconds

        console.log('SessionWarning: Session check', {
          expiresAt,
          now,
          timeUntilExpiry,
          warningTime,
          shouldShowWarning: timeUntilExpiry <= warningTime && timeUntilExpiry > 0,
          sessionUser: session.user?.email
        });

        if (timeUntilExpiry <= warningTime && timeUntilExpiry > 0) {
          // Show warning
          setShowWarning(true);
          setTimeLeft(Math.ceil(timeUntilExpiry / 1000 / 60)); // Time left in minutes

          // Start countdown
          countdownTimer = setInterval(() => {
            const currentTimeLeft = Math.ceil((expiresAt - Date.now()) / 1000 / 60);
            setTimeLeft(Math.max(0, currentTimeLeft));
            
            if (currentTimeLeft <= 0) {
              clearInterval(countdownTimer);
              handleAutoLogout();
            }
          }, 60000); // Update every minute

          // Auto logout after warning period
          autoLogoutTimer = setTimeout(() => {
            handleAutoLogout();
          }, autoLogoutMinutes * 60 * 1000);
        } else if (timeUntilExpiry > warningTime) {
          // Schedule warning
          warningTimer = setTimeout(() => {
            checkSessionExpiry();
          }, timeUntilExpiry - warningTime);
        } else if (timeUntilExpiry <= 0) {
          // Session is already expired, logout immediately
          console.log('SessionWarning: Session already expired, logging out');
          handleAutoLogout();
        }
      } catch (error) {
        console.error('Error checking session expiry:', error);
        // Don't redirect on timeout - just log and continue
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('timeout')) {
          console.log('SessionWarning: Session check timeout, will retry later');
          // Retry after a delay instead of giving up
          setTimeout(() => {
            if (user) { // Only retry if user is still logged in
              checkSessionExpiry();
            }
          }, 10000); // Retry after 10 seconds
        } else {
          console.log('SessionWarning: Session check failed, continuing without warning');
          // Don't redirect on other errors either - just continue
        }
      }
    };

    const handleAutoLogout = async () => {
      setShowWarning(false);
      await signOut();
      window.location.href = '/auth/login?reason=session_expired';
    };

    checkSessionExpiry();

    return () => {
      if (warningTimer) clearTimeout(warningTimer);
      if (countdownTimer) clearInterval(countdownTimer);
      if (autoLogoutTimer) clearTimeout(autoLogoutTimer);
    };
  }, [user, warningMinutes, autoLogoutMinutes, signOut]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    
    try {
      // Add timeout to prevent hanging
      const refreshTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session refresh timeout')), 8000) // 8 second timeout
      );
      
      const refreshPromise = authAPI.refreshSession();
      const { session, error } = await Promise.race([refreshPromise, refreshTimeout]) as any;
      
      if (error || !session) {
        // Session refresh failed, logout
        await signOut();
        window.location.href = '/auth/login?reason=session_expired';
      } else {
        // Session extended successfully
        setShowWarning(false);
        setTimeLeft(0);
      }
    } catch (error) {
      console.error('Error extending session:', error);
      // Session refresh failed, logout
      await signOut();
      window.location.href = '/auth/login?reason=session_expired';
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogoutNow = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Session Expiring Soon
            </h3>
            <p className="text-gray-600 mb-4">
              Your session will expire in approximately{' '}
              <span className="font-semibold text-red-600">
                {timeLeft} minute{timeLeft !== 1 ? 's' : ''}
              </span>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              To continue working, please extend your session. Otherwise, you'll be automatically logged out for security.
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleExtendSession}
              disabled={isExtending}
              className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isExtending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isExtending ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Extending...
                </div>
              ) : (
                'Extend Session'
              )}
            </button>

            <button
              onClick={handleLogoutNow}
              disabled={isExtending}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 