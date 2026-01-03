'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Users, Eye, EyeOff, Settings, Shield } from 'lucide-react';

interface DPRPermission {
  id: string;
  name: string;
  description: string;
  action: string;
  userCount: number;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  isRootAdmin: boolean;
}

interface UserPermission {
  userId: string;
  userName: string;
  userEmail: string;
  permissions: {
    [key: string]: boolean;
  };
}

const DPRPermissionsManagement: React.FC = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<DPRPermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user?.isRootAdmin) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/dpr-permissions?includeUsers=true', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load DPR permissions');
      }

      const data = await response.json();
      setPermissions(data.permissions || []);
      setUsers(data.users || []);
      setUserPermissions(data.userPermissions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserPermission = async (userId: string, permissionName: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: [permissionName],
          action: currentValue ? 'revoke' : 'grant',
          reason: `DPR permission ${currentValue ? 'revoked' : 'granted'} via DPR Permissions Management`,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        setSuccessMessage(`Permission ${currentValue ? 'revoked' : 'granted'} successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
        // Reload full DPR permissions matrix to reflect changes
        await loadData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update permission');
        setTimeout(() => setError(''), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update permission');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getUserPermissions = (userId: string): { [key: string]: boolean } => {
    const userPerm = userPermissions.find((up) => up.userId === userId);
    return userPerm?.permissions || {};
  };

  if (!user?.isRootAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Only root administrators can manage DPR permissions.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading DPR permissions...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-blue-600" />
            DPR Permissions Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage which users can view different DPR column categories
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Permissions Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Available DPR Permissions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {permissions.map((perm) => (
            <div key={perm.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 text-sm">{perm.name}</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {perm.userCount} users
                </span>
              </div>
              <p className="text-xs text-gray-600">{perm.description}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DPRPermissionsManagement;

