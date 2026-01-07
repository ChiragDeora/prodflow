'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // SECURITY: Remove any credentials from URL parameters immediately
    // This prevents passwords from appearing in browser history, logs, or being shared
    const urlParams = new URLSearchParams(window.location.search);
    const hasCredentials = urlParams.has('username') || urlParams.has('password') || urlParams.has('email');
    
    if (hasCredentials) {
      // Remove all credential-related parameters
      urlParams.delete('username');
      urlParams.delete('password');
      urlParams.delete('email');
      
      // Replace URL without credentials (no page reload)
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
      
      console.warn('⚠️ Security: Credentials were detected in URL and have been removed');
    }

    // If we just came here from a logout navigation, we know that a
    // manual full refresh fixes the blank-screen issue. Do that once
    // automatically so the user doesn't have to.
    const fromLogout = sessionStorage.getItem('fromLogout');
    if (fromLogout === '1') {
      sessionStorage.removeItem('fromLogout');
      // Full reload to completely reset client state.
      window.location.reload();
    }
  }, [router, searchParams]);

  return <LoginForm />;
}

function LoginPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
