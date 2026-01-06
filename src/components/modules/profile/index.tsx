'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Edit, Save, X, LogOut, Plus, Trash2, Building, Settings, Shield, Users, Package, RefreshCw, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { unitAPI, unitManagementSettingsAPI, Unit } from '../../../lib/supabase';
import AdminDashboard from '../../admin/AdminDashboard';

// Stock item types
interface StockItem {
  id: number;
  item_code: string;
  item_name: string;
  item_type: 'RM' | 'PM' | 'SFG' | 'FG';
  category: string | null;
  sub_category: string | null;
  unit_of_measure: 'KG' | 'NOS' | 'METERS';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type TabType = 'profile' | 'user-management' | 'unit-management' | 'stock-management' | 'account-actions';

const UserProfileModule: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: user?.fullName || '',
    email: user?.email || '',
    department: '',
    role: user?.isRootAdmin ? 'admin' : 'user'
  });

  // Unit management state
  const [units, setUnits] = useState<Unit[]>([]);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: '',
    description: '',
    location: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Maintenance'
  });

  // Unit management settings state
  const [unitManagementEnabled, setUnitManagementEnabled] = useState(false);
  const [defaultUnit, setDefaultUnit] = useState('Unit 1');

  // Stock management state
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockItemsLoading, setStockItemsLoading] = useState(false);
  const [showStockItemModal, setShowStockItemModal] = useState(false);
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [stockItemSearch, setStockItemSearch] = useState('');
  const [stockItemTypeFilter, setStockItemTypeFilter] = useState<string>('');
  const [stockItemForm, setStockItemForm] = useState({
    item_code: '',
    item_name: '',
    item_type: 'SFG' as 'RM' | 'PM' | 'SFG' | 'FG',
    category: '',
    sub_category: '',
    unit_of_measure: 'NOS' as 'KG' | 'NOS' | 'METERS'
  });
  const [openingStockForm, setOpeningStockForm] = useState({
    item_code: '',
    location_code: 'FG_STORE' as 'STORE' | 'PRODUCTION' | 'FG_STORE',
    quantity: 0,
    remarks: ''
  });
  const [stockMessage, setStockMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('Profile debug:', {
      user: user?.email,
      profile: user ? {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        role: user.isRootAdmin ? 'admin' : 'user',
        department: '',
        phone_number: user.phone || '',
        is_active: user.status === 'active'
      } : null,
      isAdmin: user?.isRootAdmin || false
    });
  }, [user]);

  // Load units and settings on component mount
  useEffect(() => {
    if (user?.isRootAdmin) {
      loadUnits();
      loadUnitManagementSettings();
    }
  }, [user?.isRootAdmin]);

  const loadUnitManagementSettings = async () => {
    try {
      const enabled = await unitManagementSettingsAPI.isUnitManagementEnabled();
      const defaultUnitSetting = await unitManagementSettingsAPI.getDefaultUnit();
      setUnitManagementEnabled(enabled);
      setDefaultUnit(defaultUnitSetting);
    } catch (error) {
      console.error('Error loading unit management settings:', error);
    }
  };

  const loadUnits = async () => {
    try {
      const unitsData = await unitAPI.getAll();
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  const handleSave = async () => {
    // Here you would typically update the user profile in Supabase
    // For now, we'll just close the edit mode
    setIsEditing(false);
    // TODO: Implement profile update functionality
  };

  const handleSignOut = () => {
    // No authentication system - just log the action
    console.log('Sign out requested (no authentication system)');
  };

  // Unit management functions
  const handleUnitSubmit = async () => {
    try {
      if (editingUnit) {
        // Update existing unit
        await unitAPI.update(editingUnit.id, unitForm);
      } else {
        // Create new unit
        await unitAPI.create(unitForm);
      }
      
      setShowUnitModal(false);
      setEditingUnit(null);
      setUnitForm({ name: '', description: '', location: '', status: 'Active' });
      loadUnits();
    } catch (error) {
      console.error('Error saving unit:', error);
      alert('Error saving unit. Please try again.');
    }
  };

  const handleUnitDelete = async (unitId: string) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      try {
        await unitAPI.delete(unitId);
        loadUnits();
      } catch (error) {
        console.error('Error deleting unit:', error);
        alert('Error deleting unit. Please try again.');
      }
    }
  };

  const openUnitModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({
        name: unit.name,
        description: unit.description || '',
        location: unit.location || '',
        status: unit.status
      });
    } else {
      setEditingUnit(null);
      setUnitForm({ name: '', description: '', location: '', status: 'Active' });
    }
    setShowUnitModal(true);
  };

  // Stock management functions
  const loadStockItems = useCallback(async () => {
    setStockItemsLoading(true);
    try {
      const params = new URLSearchParams();
      if (stockItemTypeFilter) params.append('item_type', stockItemTypeFilter);
      if (stockItemSearch) params.append('search', stockItemSearch);
      params.append('include_inactive', 'true');
      
      const response = await fetch(`/api/admin/stock-items?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setStockItems(result.data || []);
      } else {
        console.error('Error loading stock items:', result.error);
      }
    } catch (error) {
      console.error('Error loading stock items:', error);
    } finally {
      setStockItemsLoading(false);
    }
  }, [stockItemTypeFilter, stockItemSearch]);

  useEffect(() => {
    if (user?.isRootAdmin && activeTab === 'stock-management') {
      loadStockItems();
    }
  }, [user?.isRootAdmin, activeTab, loadStockItems]);

  const handleStockItemSubmit = async () => {
    try {
      const response = await fetch('/api/admin/stock-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockItemForm)
      });
      const result = await response.json();
      
      if (result.success) {
        setStockMessage({ type: 'success', text: result.message });
        setShowStockItemModal(false);
        setStockItemForm({
          item_code: '',
          item_name: '',
          item_type: 'SFG',
          category: '',
          sub_category: '',
          unit_of_measure: 'NOS'
        });
        loadStockItems();
      } else {
        setStockMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setStockMessage({ type: 'error', text: 'Failed to create stock item' });
    }
    
    setTimeout(() => setStockMessage(null), 5000);
  };

  const handleOpeningStockSubmit = async () => {
    try {
      const response = await fetch('/api/admin/opening-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...openingStockForm,
          posted_by: user?.email || 'ADMIN'
        })
      });
      const result = await response.json();
      
      if (result.success || result.partial) {
        setStockMessage({ 
          type: result.success ? 'success' : 'error', 
          text: result.data?.successMessages?.join(', ') || result.message 
        });
        setShowOpeningStockModal(false);
        setOpeningStockForm({
          item_code: '',
          location_code: 'FG_STORE',
          quantity: 0,
          remarks: ''
        });
      } else {
        setStockMessage({ type: 'error', text: result.data?.errorMessages?.join(', ') || result.error });
      }
    } catch (error) {
      setStockMessage({ type: 'error', text: 'Failed to add opening stock' });
    }
    
    setTimeout(() => setStockMessage(null), 5000);
  };

  const handleDeleteStockItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to deactivate this stock item?')) return;
    
    try {
      const response = await fetch(`/api/admin/stock-items/${itemId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        setStockMessage({ type: 'success', text: 'Stock item deactivated' });
        loadStockItems();
      } else {
        setStockMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setStockMessage({ type: 'error', text: 'Failed to delete stock item' });
    }
    
    setTimeout(() => setStockMessage(null), 5000);
  };

  const tabs = [
    {
      id: 'profile' as TabType,
      label: 'Profile Information',
      icon: User,
      description: 'Manage your personal information and account details'
    },
    {
      id: 'user-management' as TabType,
      label: 'User Management',
      icon: Users,
      description: 'Approve users, reset passwords, and manage accounts',
      adminOnly: true
    },
    {
      id: 'unit-management' as TabType,
      label: 'Unit Management',
      icon: Building,
      description: 'Configure units and unit management settings',
      adminOnly: true
    },
    {
      id: 'stock-management' as TabType,
      label: 'Stock Management',
      icon: Package,
      description: 'Manage stock items and add opening stock',
      adminOnly: true
    },
    {
      id: 'account-actions' as TabType,
      label: 'Account Actions',
      icon: Settings,
      description: 'Account security and session management'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {user?.fullName || user?.email || 'Current User'}
                </h2>
                <p className="text-sm text-gray-500 capitalize">
                  {user?.email === 'yogesh@polypacks.in' ? 'Owner' : user?.isRootAdmin ? 'Root Admin' : 'User'}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Email</span>
                  <span className="text-sm text-gray-800">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Department</span>
                  <span className="text-sm text-gray-800 capitalize">
                    {user?.email === 'yogesh@polypacks.in' ? 'Admin' : user?.department || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Member Since</span>
                  <span className="text-sm text-gray-800">
                    {user?.email === 'yogesh@polypacks.in' ? 'Founder' : 
                     user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-800">
                    {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
                

                

              </div>
            </div>

            {/* Edit Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {isEditing ? 'Edit Profile Information' : 'Profile Information'}
                </h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      disabled
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={editForm.department}
                      onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value as 'user' | 'admin' | 'operator'})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="operator">Operator</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                      {user?.fullName || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                      {user?.email}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                      Not specified
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 capitalize">
                      {user?.isRootAdmin ? 'Root Admin' : 'User'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'user-management':
        if (!user?.isRootAdmin) {
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Restricted</h3>
                <p className="text-gray-600">User management is only available to administrators.</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <AdminDashboard />
          </div>
        );

      case 'unit-management':
        if (!user?.isRootAdmin) {
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Restricted</h3>
                <p className="text-gray-600">Unit management is only available to administrators.</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Unit Management Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Unit Management Settings
                </h3>
              </div>
              
              <div className="space-y-4">
                {/* Unit Management Toggle */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Enable Unit Management</h4>
                    <p className="text-sm text-gray-600">
                      When enabled, unit selection will appear in all master data forms
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const newValue = !unitManagementEnabled;
                      try {
                        await unitManagementSettingsAPI.updateSetting('unit_management_enabled', newValue.toString());
                        setUnitManagementEnabled(newValue);
                      } catch (error) {
                        console.error('Error updating unit management setting:', error);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      unitManagementEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        unitManagementEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Default Unit Selection */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Default Unit</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Select the default unit for new master data entries
                  </p>
                  <select
                    value={defaultUnit}
                    onChange={async (e) => {
                      const newValue = e.target.value;
                      try {
                        await unitManagementSettingsAPI.updateSetting('default_unit', newValue);
                        setDefaultUnit(newValue);
                      } catch (error) {
                        console.error('Error updating default unit:', error);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {units.map(unit => (
                      <option key={unit.id} value={unit.name}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Unit Management Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Unit Management
                </h3>
                <button
                  onClick={() => openUnitModal()}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Unit
                </button>
              </div>
              
              <div className="space-y-3">
                {units.map(unit => (
                  <div key={unit.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-800">{unit.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          unit.status === 'Active' ? 'bg-green-100 text-green-800' :
                          unit.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {unit.status}
                        </span>
                      </div>
                      {unit.description && (
                        <p className="text-sm text-gray-600 mt-1">{unit.description}</p>
                      )}
                      {unit.location && (
                        <p className="text-xs text-gray-500 mt-1">📍 {unit.location}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openUnitModal(unit)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Edit unit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUnitDelete(unit.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {units.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No units found</p>
                    <p className="text-sm">Click "Add Unit" to create your first unit</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'stock-management':
        return (
          <div className="space-y-6">
            {/* Message Banner */}
            {stockMessage && (
              <div className={`p-4 rounded-lg flex items-center ${
                stockMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {stockMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                {stockMessage.text}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Stock Management
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowStockItemModal(true)}
                  className="flex items-center justify-center p-4 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Stock Item
                </button>
                <button
                  onClick={() => setShowOpeningStockModal(true)}
                  className="flex items-center justify-center p-4 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50 hover:border-green-400 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Opening Stock
                </button>
              </div>
            </div>

            {/* Stock Items List */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Stock Items</h3>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={stockItemSearch}
                      onChange={(e) => setStockItemSearch(e.target.value)}
                      className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
                    />
                  </div>
                  <select
                    value={stockItemTypeFilter}
                    onChange={(e) => setStockItemTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="RM">Raw Material (RM)</option>
                    <option value="PM">Packing Material (PM)</option>
                    <option value="SFG">Semi-Finished Goods (SFG)</option>
                    <option value="FG">Finished Goods (FG)</option>
                  </select>
                  <button
                    onClick={loadStockItems}
                    disabled={stockItemsLoading}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${stockItemsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {stockItemsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500" />
                  <p className="mt-2 text-gray-500">Loading stock items...</p>
                </div>
              ) : stockItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No stock items found</p>
                  <p className="text-sm">Click "Add New Stock Item" to create one</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockItems.map((item) => (
                        <tr key={item.id} className={!item.is_active ? 'bg-gray-50 opacity-60' : ''}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.item_code}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.item_name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.item_type === 'RM' ? 'bg-blue-100 text-blue-800' :
                              item.item_type === 'PM' ? 'bg-purple-100 text-purple-800' :
                              item.item_type === 'SFG' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.item_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.category || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.unit_of_measure}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setOpeningStockForm(prev => ({ ...prev, item_code: item.item_code }));
                                setShowOpeningStockModal(true);
                              }}
                              className="text-green-600 hover:text-green-800 mr-2 text-sm"
                              title="Add opening stock"
                            >
                              + Stock
                            </button>
                            {item.is_active && (
                              <button
                                onClick={() => handleDeleteStockItem(item.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Deactivate"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Stock Item Modal */}
            {showStockItemModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Add New Stock Item</h3>
                    <p className="text-sm text-gray-500 mt-1">Create a new item to track in stock</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Code *</label>
                      <input
                        type="text"
                        value={stockItemForm.item_code}
                        onChange={(e) => setStockItemForm({ ...stockItemForm, item_code: e.target.value })}
                        placeholder="e.g., 110110001 or RM-HP"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                      <input
                        type="text"
                        value={stockItemForm.item_name}
                        onChange={(e) => setStockItemForm({ ...stockItemForm, item_name: e.target.value })}
                        placeholder="e.g., RPRo16T-C or Raw Material HP"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Type *</label>
                        <select
                          value={stockItemForm.item_type}
                          onChange={(e) => setStockItemForm({ ...stockItemForm, item_type: e.target.value as 'RM' | 'PM' | 'SFG' | 'FG' })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value="RM">Raw Material (RM)</option>
                          <option value="PM">Packing Material (PM)</option>
                          <option value="SFG">Semi-Finished Goods (SFG)</option>
                          <option value="FG">Finished Goods (FG)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure *</label>
                        <select
                          value={stockItemForm.unit_of_measure}
                          onChange={(e) => setStockItemForm({ ...stockItemForm, unit_of_measure: e.target.value as 'KG' | 'NOS' | 'METERS' })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value="KG">Kilograms (KG)</option>
                          <option value="NOS">Numbers (NOS)</option>
                          <option value="METERS">Meters</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <input
                          type="text"
                          value={stockItemForm.category}
                          onChange={(e) => setStockItemForm({ ...stockItemForm, category: e.target.value })}
                          placeholder="e.g., PP, PACKING"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
                        <input
                          type="text"
                          value={stockItemForm.sub_category}
                          onChange={(e) => setStockItemForm({ ...stockItemForm, sub_category: e.target.value })}
                          placeholder="e.g., HP, ICP"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowStockItemModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStockItemSubmit}
                      disabled={!stockItemForm.item_code.trim() || !stockItemForm.item_name.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Add Stock Item
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Opening Stock Modal */}
            {showOpeningStockModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Add Opening Stock</h3>
                    <p className="text-sm text-gray-500 mt-1">Add initial stock balance for an item</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Code *</label>
                      <input
                        type="text"
                        value={openingStockForm.item_code}
                        onChange={(e) => setOpeningStockForm({ ...openingStockForm, item_code: e.target.value })}
                        placeholder="Enter item code or select from list"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        list="stock-item-codes"
                      />
                      <datalist id="stock-item-codes">
                        {stockItems.filter(i => i.is_active).map(item => (
                          <option key={item.id} value={item.item_code}>{item.item_name}</option>
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                      <select
                        value={openingStockForm.location_code}
                        onChange={(e) => setOpeningStockForm({ ...openingStockForm, location_code: e.target.value as 'STORE' | 'PRODUCTION' | 'FG_STORE' })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="STORE">Main Store</option>
                        <option value="PRODUCTION">Production Floor</option>
                        <option value="FG_STORE">FG Store (Finished Goods)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                      <input
                        type="number"
                        value={openingStockForm.quantity}
                        onChange={(e) => setOpeningStockForm({ ...openingStockForm, quantity: parseFloat(e.target.value) || 0 })}
                        placeholder="Enter quantity"
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                      <textarea
                        value={openingStockForm.remarks}
                        onChange={(e) => setOpeningStockForm({ ...openingStockForm, remarks: e.target.value })}
                        placeholder="Optional remarks"
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowOpeningStockModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleOpeningStockSubmit}
                      disabled={!openingStockForm.item_code.trim() || openingStockForm.quantity <= 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Add Opening Stock
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'account-actions':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Actions</h3>
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Session Management</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Sign out of your current session and return to the login page.
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">User ID:</span>
                      <span className="text-gray-800">{user?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="text-gray-800">{user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className="text-gray-800 capitalize">{user?.isRootAdmin ? 'Root Admin' : 'User'}</span>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">User Profile</h1>
              <p className="text-sm text-gray-500">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex h-full">
          {/* Left Sidebar - Tabs */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 p-6">
            <div className="space-y-2">
              {tabs.map((tab) => {
                if (tab.adminOnly && !user?.isRootAdmin) return null;
                
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-start space-x-3 p-4 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{tab.label}</h3>
                      <p className="text-xs text-gray-500 mt-1">{tab.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingUnit ? 'Edit Unit' : 'Add New Unit'}
                </h3>
                <button
                  onClick={() => setShowUnitModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({...unitForm, name: e.target.value})}
                  placeholder="e.g., Unit 1, Unit 2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({...unitForm, description: e.target.value})}
                  placeholder="e.g., Main Production Unit"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={unitForm.location}
                  onChange={(e) => setUnitForm({...unitForm, location: e.target.value})}
                  placeholder="e.g., Bhimpore"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={unitForm.status}
                  onChange={(e) => setUnitForm({...unitForm, status: e.target.value as 'Active' | 'Inactive' | 'Maintenance'})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowUnitModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnitSubmit}
                disabled={!unitForm.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {editingUnit ? 'Update Unit' : 'Add Unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileModule;