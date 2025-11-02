'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';

interface PendingUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  status: string;
  isRootAdmin: boolean;
  requiresPasswordReset: boolean;
  lastLogin?: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const { user } = useAuth();

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'active');

  useEffect(() => {
    if (user?.isRootAdmin) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Load users error:', error);
      setError('Network error loading users');
    } finally {
      setIsLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roleId: null }), // Can add role selection later
        credentials: 'include'
      });

      if (response.ok) {
        setSuccessMessage('User approved successfully');
        await loadUsers();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Approve user error:', error);
      setError('Network error approving user');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const rejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reject and delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Rejected by admin' }),
        credentials: 'include'
      });

      if (response.ok) {
        setSuccessMessage('User rejected and removed');
        await loadUsers();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Reject user error:', error);
      setError('Network error rejecting user');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const resetPassword = async (userId: string) => {
    if (!confirm('Are you sure you want to reset this user\'s password? They will receive a temporary password.')) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Password reset successful!\nTemporary password: ${data.temporaryPassword}\n\nPlease share this with the user securely.`);
        await loadUsers();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Network error resetting password');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user?.isRootAdmin) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600">Only root administrators can access this feature.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-gray-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        {/* Pending Users Section */}
        <div className="mb-6 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Pending Approvals ({pendingUsers.length})
              </h2>
            </div>
            {pendingUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                          {user.phone && (
                            <div className="text-sm text-gray-500">{user.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => approveUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-green-600 hover:text-green-900 mr-4 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => rejectUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? 'Rejecting...' : 'Reject'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-lg font-medium mb-2">No Pending Approvals</div>
                <p className="text-sm">All new user registrations will appear here for your approval.</p>
              </div>
            )}
          </div>

        {/* Active Users Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Active Users ({activeUsers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Name
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Username
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Email
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Phone
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Status
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Last Login
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.fullName}
                        {user.isRootAdmin && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Root Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {user.phone || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                        {user.requiresPasswordReset && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Password Reset Required
                          </span>
                        )}
                        {user.isLocked && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                      {!user.isRootAdmin && (
                        <button
                          onClick={() => resetPassword(user.id)}
                          disabled={actionLoading === user.id}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 text-xs"
                        >
                          {actionLoading === user.id ? 'Resetting...' : 'Reset Password'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{users.length}</div>
            <div className="text-gray-600 text-sm">Total Users</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{activeUsers.length}</div>
            <div className="text-gray-600 text-sm">Active Users</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</div>
            <div className="text-gray-600 text-sm">Pending Approval</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => u.isLocked).length}
            </div>
            <div className="text-gray-600 text-sm">Locked Accounts</div>
          </div>
        </div>
    </div>
  );
}
