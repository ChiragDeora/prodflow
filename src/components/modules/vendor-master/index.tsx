'use client';

import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Filter, Download, Upload, 
  Eye, Edit, Trash2, History, Settings, FileText,
  ChevronRight, ChevronDown, CheckCircle, AlertTriangle,
  Lock, Unlock, Archive, RotateCcw, Building, Phone, Mail,
  MapPin, Globe, Calendar, User, Package
} from 'lucide-react';

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
  vendor_type: 'material' | 'service' | 'both';
  payment_terms: string;
  credit_period: number;
  bank_name: string;
  bank_account: string;
  ifsc_code: string;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: string;
  updated_at: string;
}

const VendorMaster: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'material' | 'service' | 'both'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('vendor_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Load vendors on component mount
  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/masters/vendors');
      const result = await response.json();
      
      if (result.success) {
        setVendors(result.data || []);
      } else {
        setError(result.error || 'Failed to load vendors');
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (vendorData: Partial<Vendor>) => {
    try {
      const response = await fetch('/api/masters/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorData),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadVendors();
        setShowCreateForm(false);
        alert('Vendor created successfully!');
      } else {
        alert(`Failed to create vendor: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      alert('Failed to create vendor');
    }
  };

  const handleUpdateVendor = async (id: string, updates: Partial<Vendor>) => {
    try {
      const response = await fetch(`/api/masters/vendors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadVendors();
        setSelectedVendor(null);
        alert('Vendor updated successfully!');
      } else {
        alert(`Failed to update vendor: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor');
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = searchTerm === '' || 
      vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendor_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    const matchesType = typeFilter === 'all' || vendor.vendor_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedVendors = [...filteredVendors].sort((a, b) => {
    let aValue: any = a[sortField as keyof Vendor];
    let bValue: any = b[sortField as keyof Vendor];
    
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
              <Truck className="w-8 h-8 mr-3 text-blue-600" />
              Vendor Master
            </h1>
            <p className="text-gray-600 mt-1">Manage vendor information and details</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadVendors}
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
              Add Vendor
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
                placeholder="Search vendors..."
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
              <option value="material">Material</option>
              <option value="service">Service</option>
              <option value="both">Both</option>
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
            {filteredVendors.length} of {vendors.length} vendors
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
                  <option value="vendor_name">Vendor Name</option>
                  <option value="vendor_code">Vendor Code</option>
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
                    setSortField('vendor_name');
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

      {/* Vendors Table */}
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
                    Vendor Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business Details
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
                {sortedVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{vendor.vendor_name}</div>
                        <div className="text-sm text-gray-500">Code: {vendor.vendor_code}</div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <User className="w-3 h-3 mr-1" />
                          {vendor.contact_person}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Mail className="w-3 h-3 mr-1 text-gray-400" />
                          {vendor.email}
                        </div>
                        <div className="text-sm text-gray-900 flex items-center">
                          <Phone className="w-3 h-3 mr-1 text-gray-400" />
                          {vendor.phone}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                          {vendor.city}, {vendor.state}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            vendor.vendor_type === 'material' 
                              ? 'bg-blue-100 text-blue-800' 
                              : vendor.vendor_type === 'service'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {vendor.vendor_type.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">GST: {vendor.gst_number || 'N/A'}</div>
                        <div className="text-sm text-gray-500">Credit: {vendor.credit_period || 0} days</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        vendor.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {vendor.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="text-blue-600 hover:text-blue-900 text-xs bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-2 py-1 rounded hover:bg-green-100"
                          title="Edit Vendor"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedVendors.length === 0 && (
              <div className="text-center py-12">
                <Truck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {vendors.length === 0 ? 'Get started by creating a new vendor.' : 'Try adjusting your search filters.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Vendor Modal would go here */}
      {(showCreateForm || selectedVendor) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedVendor ? 'Edit Vendor' : 'Create New Vendor'}
            </h2>
            {/* Vendor form would go here */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedVendor(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle save logic here
                  setShowCreateForm(false);
                  setSelectedVendor(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {selectedVendor ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorMaster;
