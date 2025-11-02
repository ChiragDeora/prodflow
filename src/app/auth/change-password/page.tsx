'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChangePasswordPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <ChangePasswordForm isRequired={user.requiresPasswordReset} />;
}
