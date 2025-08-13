'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'user' | 'admin' | 'operator';
  department?: string;
}

interface RolePermissionsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, role: string) => void;
}

export default function RolePermissionsModal({ 
  user, 
  isOpen, 
  onClose, 
  onSave 
}: RolePermissionsModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    if (user && isOpen) {
      setSelectedRole(user.role);
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Update user role in database
      const response = await fetch(`/api/users/${user.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole
        }),
      });

      if (response.ok) {
        setSuccess('User role updated successfully!');
        onSave(user.id, selectedRole);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user role');
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Manage User: {user.full_name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Basic Role Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Basic Role</h3>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
          >
            <option value="user">User</option>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-sm text-gray-600 mt-2">
            Basic role provides default permissions. Granular permissions will be added later.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
} 