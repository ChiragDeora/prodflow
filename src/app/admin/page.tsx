'use client';

import React from 'react';
import { AdminRoute } from '../../components/auth/RouteGuard';
import { UserManagement } from '../../components/admin/UserManagement';

export default function AdminPage() {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <UserManagement />
        </div>
      </div>
    </AdminRoute>
  );
} 