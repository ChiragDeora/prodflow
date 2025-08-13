'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { userProfileAPI, authAPI } from '../../lib/auth';
import RolePermissionsModal from './RolePermissionsModal';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: 'user' | 'admin' | 'operator';
  department?: string;
  is_active: boolean;
  is_approved?: boolean;
  created_at: string;
}

interface NewUserData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  department: string;
  role: 'user' | 'admin' | 'operator';
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState<NewUserData>({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    department: '',
    role: 'user'
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { profiles, error } = await userProfileAPI.getAllProfiles();
      
      if (error) {
        setError('Failed to load users: ' + error.message);
      } else {
        const allUsers = profiles || [];
        setUsers(allUsers.filter(user => user.is_active));
        
        // Get pending approvals using direct query
        const { data: pendingData, error: pendingError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, phone_number, department, role, is_active, created_at, auth_user_id')
          .eq('is_approved', false)
          .eq('is_active', true)
          .not('auth_user_id', 'is', null)
          .order('created_at', { ascending: true });
        
        if (pendingError) {
          console.error('Error loading pending approvals:', pendingError);
          setPendingApprovals([]);
        } else {
          setPendingApprovals(pendingData || []);
        }
      }
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    try {
      setError('');
      
      if (!newUserData.email || !newUserData.password || !newUserData.fullName) {
        setError('Email, password, and full name are required');
        return;
      }

      console.log('Creating user:', newUserData);

      const result = await authAPI.createUserAsAdmin(newUserData);
      
      if (result.error) {
        setError('Failed to create user: ' + result.error.message);
      } else {
        setSuccess('User account created successfully! The user can now log in with their email and password.');
        setShowCreateUserForm(false);
        setNewUserData({
          email: '',
          password: '',
          fullName: '',
          phoneNumber: '',
          department: '',
          role: 'user'
        });
        loadUsers();
      }
    } catch (err) {
      setError('Failed to create user: ' + (err as any)?.message || 'Unknown error');
      console.error('Error creating user:', err);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setError('');
      const { error } = await userProfileAPI.deleteUser(userId);
      
      if (error) {
        setError('Failed to delete user: ' + error.message);
      } else {
        setSuccess('User deleted successfully!');
        loadUsers();
      }
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const updateUserRole = async (userId: string, newRole: User['role']) => {
    try {
      setError('');
      const { error } = await userProfileAPI.updateUserRole(userId, newRole);
      
      if (error) {
        setError('Failed to update user role: ' + error.message);
      } else {
        setSuccess('User role updated successfully!');
        loadUsers();
      }
    } catch (err) {
      setError('Failed to update user role');
      console.error('Error updating user role:', err);
    }
  };

  const approveUser = async (authUserId: string) => {
    try {
      setError('');
      
      // Direct update to approve user
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          is_approved: true, 
          email_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', authUserId);
      
      if (updateError) {
        setError('Failed to approve user: ' + updateError.message);
      } else {
        setSuccess('User approved successfully!');
        loadUsers();
      }
    } catch (err) {
      setError('Failed to approve user');
      console.error('Error approving user:', err);
    }
  };

  const handleNewUserInputChange = (field: keyof NewUserData, value: string) => {
    setNewUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">User Management</h1>
        <p className="text-gray-600">Manage system users and their roles</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Pending Approvals Notification */}
      {pendingApprovals.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Pending Approvals ({pendingApprovals.length})
          </h3>
          <p className="text-yellow-700 mb-3">
            The following users have signed up and are waiting for email confirmation:
          </p>
          <div className="space-y-2">
            {pendingApprovals.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded border">
                <div>
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                  <div className="text-sm text-gray-500">{user.department || 'No department'}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-yellow-600">
                    Pending approval
                  </div>
                  <button
                    onClick={() => approveUser(user.auth_user_id)}
                    className="bg-green-500 hover:bg-green-700 text-white text-xs px-3 py-1 rounded"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => setShowCreateUserForm(!showCreateUserForm)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showCreateUserForm ? 'Cancel' : 'Create New User'}
        </button>
      </div>

      {showCreateUserForm && (
        <div className="mb-6 p-4 border border-gray-300 rounded">
          <h3 className="text-lg font-semibold mb-4">Create New User</h3>
          <p className="text-sm text-gray-600 mb-4">
            This creates a complete user account with login credentials. The user can immediately log in with the email and password you specify. 
            <span className="font-medium text-blue-600">Note:</span> When OTP authentication is implemented, password creation will be replaced with phone-based authentication.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={newUserData.email}
                onChange={(e) => handleNewUserInputChange('email', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="user@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password *</label>
              <input
                type="password"
                value={newUserData.password}
                onChange={(e) => handleNewUserInputChange('password', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Enter password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input
                type="text"
                value={newUserData.fullName}
                onChange={(e) => handleNewUserInputChange('fullName', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={newUserData.phoneNumber}
                onChange={(e) => handleNewUserInputChange('phoneNumber', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="+1234567890"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input
                type="text"
                value={newUserData.department}
                onChange={(e) => handleNewUserInputChange('department', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Engineering"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={newUserData.role}
                onChange={(e) => handleNewUserInputChange('role', e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="user">User</option>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <button
              onClick={createUser}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
            >
              Create User
            </button>
            <button
              onClick={() => setShowCreateUserForm(false)}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                Role & Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.full_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {user.department || 'No department'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                  <div className="text-sm text-gray-500">
                    {user.phone_number || 'No phone'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 capitalize">{user.role}</div>
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowRoleModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 text-xs mt-1"
                    disabled={user.email === 'yogesh@polypacks.in'} // Prevent changing Yogesh's role
                  >
                    Edit Permissions
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="text-red-600 hover:text-red-900"
                    disabled={user.email === 'yogesh@polypacks.in'} // Prevent deleting Yogesh
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role & Permissions Modal */}
      <RolePermissionsModal
        user={selectedUser}
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedUser(null);
        }}
        onSave={async (userId: string, role: string) => {
          try {
            // Update user role
            await userProfileAPI.updateUserRole(userId, role as User['role']);
            
            // Reload users to reflect changes
            await loadUsers();
            
            setSuccess('User role updated successfully!');
          } catch (err) {
            setError('Failed to update user role');
            console.error('Error updating user:', err);
          }
        }}
      />
    </div>
  );
} 