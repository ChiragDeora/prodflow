'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If we just came here from a logout navigation, we know that a
    // manual full refresh fixes the blank-screen issue. Do that once
    // automatically so the user doesn't have to.
    const fromLogout = sessionStorage.getItem('fromLogout');
    if (fromLogout === '1') {
      sessionStorage.removeItem('fromLogout');
      // Full reload to completely reset client state.
      window.location.reload();
    }
  }, [router]);

  return <LoginForm />;
}
