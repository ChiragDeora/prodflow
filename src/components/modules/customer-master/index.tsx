'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Filter, Download, Upload, 
  Eye, Edit, Trash2, History, Settings, FileText,
  ChevronRight, ChevronDown, CheckCircle, AlertTriangle,
  Lock, Unlock, Archive, RotateCcw, Building, Phone, Mail,
  MapPin, Globe, Calendar, User
} from 'lucide-react';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_person: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  country: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
  customer_type: 'domestic' | 'export';
  payment_terms: string;
  credit_limit: number;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CustomerFormData {
  customer_name: string;
  address: string;
  state: string;
  state_code: string;
  contact_person: string;
  email: string;
  phone: string;
  gst_number: string;
  pan_number: string;
}

const emptyFormData: CustomerFormData = {
  customer_name: '',
  address: '',
  state: '',
  state_code: '',
  contact_person: '',
  email: '',
  phone: '',
  gst_number: '',
  pan_number: '',
};

const CustomerMaster: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'domestic' | 'export'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('customer_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState<CustomerFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (selectedCustomer) {
      setFormData({
        customer_name: selectedCustomer.customer_name || '',
        address: selectedCustomer.address || '',
        state: selectedCustomer.state || '',
        state_code: selectedCustomer.state_code || '',
        contact_person: selectedCustomer.contact_person || '',
        email: selectedCustomer.email || '',
        phone: selectedCustomer.phone || '',
        gst_number: selectedCustomer.gst_number || '',
        pan_number: selectedCustomer.pan_number || '',
      });
    } else if (showCreateForm) {
      setFormData(emptyFormData);
    }
  }, [selectedCustomer, showCreateForm]);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/masters/customers');
      const result = await response.json();
      
      if (result.success) {
        setCustomers(result.data || []);
      } else {
        setError(result.error || 'Failed to load customers');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitForm = async () => {
    if (!formData.customer_name.trim()) {
      alert('Customer name is required');
      return;
    }

    setSaving(true);
    try {
      if (selectedCustomer) {
        // Update existing customer
        const response = await fetch(`/api/masters/customers/${selectedCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const result = await response.json();
        
        if (result.success) {
          await loadCustomers();
          setSelectedCustomer(null);
          setFormData(emptyFormData);
          alert('Customer updated successfully!');
        } else {
          alert(`Failed to update customer: ${result.error}`);
        }
      } else {
        // Create new customer
        const response = await fetch('/api/masters/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const result = await response.json();
        
        if (result.success) {
          await loadCustomers();
          setShowCreateForm(false);
          setFormData(emptyFormData);
          alert('Customer created successfully!');
        } else {
          alert(`Failed to create customer: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomer = async (customerData: Partial<Customer>) => {
    try {
      const response = await fetch('/api/masters/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadCustomers();
        setShowCreateForm(false);
        alert('Customer created successfully!');
      } else {
        alert(`Failed to create customer: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    }
  };

  const handleUpdateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const response = await fetch(`/api/masters/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadCustomers();
        setSelectedCustomer(null);
        alert('Customer updated successfully!');
      } else {
        alert(`Failed to update customer: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete "${customer.customer_name}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/masters/customers/${customer.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        await loadCustomers();
        alert('Customer deleted successfully!');
      } else {
        alert(`Failed to delete customer: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchTerm === '' || 
      customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesType = typeFilter === 'all' || customer.customer_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let aValue: any = a[sortField as keyof Customer];
    let bValue: any = b[sortField as keyof Customer];
    
    if (aValue == null) aValue = '';
    if (bValue == null) bValue = '';
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3 text-blue-600" />
              Customer Master
            </h1>
            <p className="text-gray-600 mt-1">Manage customer information and details</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadCustomers}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Enhanced Filters and Search */}
      <div className="mx-6 mb-4 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-32">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="min-w-32">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="domestic">Domestic</option>
              <option value="export">Export</option>
            </select>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {showAdvancedFilters ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
          </button>

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            {filteredCustomers.length} of {customers.length} customers
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sort Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="customer_name">Customer Name</option>
                  <option value="customer_code">Customer Code</option>
                  <option value="contact_person">Contact Person</option>
                  <option value="city">City</option>
                  <option value="created_at">Created Date</option>
                </select>
              </div>

              {/* Sort Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <select
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setSortField('customer_name');
                    setSortDirection('asc');
                  }}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customers Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST / PAN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{customer.customer_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        <div className="flex items-start">
                          <MapPin className="w-3 h-3 mr-1 text-gray-400 mt-1 flex-shrink-0" />
                          <span className="whitespace-pre-line">{customer.address || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{customer.state || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{customer.state_code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium text-gray-500">GST:</span> {customer.gst_number || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-900">
                          <span className="font-medium text-gray-500">PAN:</span> {customer.pan_number || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(customer.status || 'active').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => setViewCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900 text-xs bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-3 py-1.5 rounded hover:bg-green-100 flex items-center gap-1"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer)}
                          className="text-red-600 hover:text-red-900 text-xs bg-red-50 px-3 py-1.5 rounded hover:bg-red-100 flex items-center gap-1"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedCustomers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {customers.length === 0 ? 'Get started by creating a new customer.' : 'Try adjusting your search filters.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Customer Modal - Shows Contact Information */}
      {viewCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Eye className="w-6 h-6 mr-2 text-blue-600" />
                Customer Details
              </h2>
              <button
                onClick={() => setViewCustomer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Customer Info */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Basic Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="text-xs text-gray-500">Customer Name</label>
                    <p className="text-sm font-medium text-gray-900">{viewCustomer.customer_name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">State</label>
                    <p className="text-sm font-medium text-gray-900">{viewCustomer.state || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">State Code</label>
                    <p className="text-sm font-medium text-gray-900">{viewCustomer.state_code || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <p className="text-sm">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        viewCustomer.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(viewCustomer.status || 'active').toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-700 uppercase mb-3 flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Contact Person</label>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <User className="w-3 h-3 mr-1 text-gray-400" />
                      {viewCustomer.contact_person || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <Mail className="w-3 h-3 mr-1 text-gray-400" />
                      {viewCustomer.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <Phone className="w-3 h-3 mr-1 text-gray-400" />
                      {viewCustomer.phone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Mobile</label>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <Phone className="w-3 h-3 mr-1 text-gray-400" />
                      {viewCustomer.mobile || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Address
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-900 whitespace-pre-line">{viewCustomer.address || 'N/A'}</p>
                  <p className="text-sm text-gray-600">
                    {[viewCustomer.city, viewCustomer.state, viewCustomer.country, viewCustomer.pincode].filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Business Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                  <Building className="w-4 h-4 mr-2" />
                  Business Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">GST Number</label>
                    <p className="text-sm font-medium text-gray-900">{viewCustomer.gst_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">PAN Number</label>
                    <p className="text-sm font-medium text-gray-900">{viewCustomer.pan_number || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setViewCustomer(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedCustomer(viewCustomer);
                  setViewCustomer(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Customer Modal */}
      {(showCreateForm || selectedCustomer) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
              {selectedCustomer ? 'Edit Customer' : 'Create New Customer'}
            </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => handleFormChange('customer_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
                />
              </div>

              {/* State and State Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleFormChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Dadra & Nagar Haveli and Daman & Diu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State Code</label>
                  <input
                    type="text"
                    value={formData.state_code}
                    onChange={(e) => handleFormChange('state_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 26"
                  />
                </div>
              </div>

              {/* Contact Person and Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => handleFormChange('contact_person', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* GST and PAN */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={(e) => handleFormChange('gst_number', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 26AAFCR5189M1ZP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={formData.pan_number}
                    onChange={(e) => handleFormChange('pan_number', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., AATFD0618A"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedCustomer(null);
                  setFormData(emptyFormData);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? 'Saving...' : (selectedCustomer ? 'Update Customer' : 'Create Customer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMaster;
