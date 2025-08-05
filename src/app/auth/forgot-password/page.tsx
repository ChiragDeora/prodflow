'use client';

import React from 'react';
import { PasswordResetForm } from '../../../components/auth/PasswordResetForm';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <PasswordResetForm />
    </div>
  );
} 