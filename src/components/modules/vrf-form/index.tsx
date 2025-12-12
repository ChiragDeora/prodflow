'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, Upload, 
  Eye, Edit, Trash2, History, Settings, CheckCircle,
  ChevronRight, ChevronDown, AlertTriangle, Clock,
  Lock, Unlock, Archive, RotateCcw, Building, Phone, Mail,
  MapPin, Globe, Calendar, User, Package, Send, Save
} from 'lucide-react';

interface VRFForm {
  id: string;
  vrf_number: string;
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
  business_nature: string;
  annual_turnover: number;
  years_in_business: number;
  bank_name: string;
  bank_account: string;
  ifsc_code: string;
  payment_terms: string;
  credit_period: number;
  references: {
    name: string;
    company: string;
    phone: string;
    email: string;
  }[];
  documents: {
    type: string;
    filename: string;
    uploaded_at: string;
  }[];
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  remarks: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const VRFFormManager: React.FC = () => {
  const [vrfForms, setVrfForms] = useState<VRFForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedVRF, setSelectedVRF] = useState<VRFForm | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load VRF forms on component mount
  useEffect(() => {
    loadVRFForms();
  }, []);

  const loadVRFForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/vrf-forms');
      const result = await response.json();
      
      if (result.success) {
        setVrfForms(result.data || []);
      } else {
        setError(result.error || 'Failed to load VRF forms');
      }
    } catch (error) {
      console.error('Error loading VRF forms:', error);
      setError('Failed to load VRF forms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVRF = async (vrfData: Partial<VRFForm>) => {
    try {
      const response = await fetch('/api/vrf-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vrfData),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadVRFForms();
        setShowCreateForm(false);
        alert('VRF form created successfully!');
      } else {
        alert(`Failed to create VRF form: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating VRF form:', error);
      alert('Failed to create VRF form');
    }
  };

  const handleUpdateVRF = async (id: string, updates: Partial<VRFForm>) => {
    try {
      const response = await fetch(`/api/vrf-forms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadVRFForms();
        setSelectedVRF(null);
        alert('VRF form updated successfully!');
      } else {
        alert(`Failed to update VRF form: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating VRF form:', error);
      alert('Failed to update VRF form');
    }
  };

  const handleSubmitVRF = async (id: string) => {
    if (confirm('Are you sure you want to submit this VRF form for review?')) {
      await handleUpdateVRF(id, { 
        status: 'submitted', 
        submitted_at: new Date().toISOString() 
      });
    }
  };

  const handleApproveVRF = async (id: string) => {
    if (confirm('Are you sure you want to approve this VRF form?')) {
      await handleUpdateVRF(id, { 
        status: 'approved', 
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'current_user' // This should be the actual user ID
      });
    }
  };

  const handleRejectVRF = async (id: string, remarks: string) => {
    if (confirm('Are you sure you want to reject this VRF form?')) {
      await handleUpdateVRF(id, { 
        status: 'rejected', 
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'current_user', // This should be the actual user ID
        remarks
      });
    }
  };

  const filteredVRFForms = vrfForms.filter(vrf => {
    const matchesSearch = searchTerm === '' || 
      vrf.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vrf.vrf_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vrf.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vrf.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || vrf.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedVRFForms = [...filteredVRFForms].sort((a, b) => {
    let aValue: any = a[sortField as keyof VRFForm];
    let bValue: any = b[sortField as keyof VRFForm];
    
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'submitted': return <Send className="w-4 h-4" />;
      case 'under_review': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="w-8 h-8 mr-3 text-blue-600" />
              Vendor Registration Forms (VRF)
            </h1>
            <p className="text-gray-600 mt-1">Manage vendor registration and approval process</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadVRFForms}
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
              New VRF
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
                placeholder="Search VRF forms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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
            {filteredVRFForms.length} of {vrfForms.length} forms
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
                  <option value="created_at">Created Date</option>
                  <option value="vendor_name">Vendor Name</option>
                  <option value="vrf_number">VRF Number</option>
                  <option value="status">Status</option>
                  <option value="submitted_at">Submitted Date</option>
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
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setSortField('created_at');
                    setSortDirection('desc');
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

      {/* VRF Forms Table */}
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
                    VRF Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor Information
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
                {sortedVRFForms.map((vrf) => (
                  <tr key={vrf.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{vrf.vrf_number}</div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(vrf.created_at).toLocaleDateString()}
                        </div>
                        {vrf.submitted_at && (
                          <div className="text-sm text-gray-500">
                            Submitted: {new Date(vrf.submitted_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{vrf.vendor_name}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {vrf.contact_person}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {vrf.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            vrf.vendor_type === 'material' 
                              ? 'bg-blue-100 text-blue-800' 
                              : vrf.vendor_type === 'service'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {vrf.vendor_type.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">GST: {vrf.gst_number || 'N/A'}</div>
                        <div className="text-sm text-gray-500">
                          Turnover: ₹{vrf.annual_turnover?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vrf.status)}`}>
                        {getStatusIcon(vrf.status)}
                        <span className="ml-1">{vrf.status.replace('_', ' ').toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => setSelectedVRF(vrf)}
                          className="text-blue-600 hover:text-blue-900 text-xs bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        {vrf.status === 'draft' && (
                          <button
                            onClick={() => setSelectedVRF(vrf)}
                            className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-2 py-1 rounded hover:bg-green-100"
                            title="Edit VRF"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                        {vrf.status === 'draft' && (
                          <button
                            onClick={() => handleSubmitVRF(vrf.id)}
                            className="text-purple-600 hover:text-purple-900 text-xs bg-purple-50 px-2 py-1 rounded hover:bg-purple-100"
                            title="Submit for Review"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        )}
                        {(vrf.status === 'submitted' || vrf.status === 'under_review') && (
                          <>
                            <button
                              onClick={() => handleApproveVRF(vrf.id)}
                              className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-2 py-1 rounded hover:bg-green-100"
                              title="Approve VRF"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                const remarks = prompt('Enter rejection remarks:');
                                if (remarks) handleRejectVRF(vrf.id, remarks);
                              }}
                              className="text-red-600 hover:text-red-900 text-xs bg-red-50 px-2 py-1 rounded hover:bg-red-100"
                              title="Reject VRF"
                            >
                              <AlertTriangle className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedVRFForms.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No VRF forms found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {vrfForms.length === 0 ? 'Get started by creating a new VRF form.' : 'Try adjusting your search filters.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit VRF Modal */}
      {(showCreateForm || selectedVRF) && (
        <VRFFormModal
          isOpen={showCreateForm || !!selectedVRF}
          onClose={() => {
            setShowCreateForm(false);
            setSelectedVRF(null);
          }}
          vrfData={selectedVRF}
          onSave={selectedVRF ? 
            (data) => handleUpdateVRF(selectedVRF.id, data) : 
            handleCreateVRF
          }
        />
      )}
    </div>
  );
};

// VRF Form Modal Component (based on store module implementation)
interface VRFFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vrfData: VRFForm | null;
  onSave: (data: Partial<VRFForm>) => void;
}

const VRFFormModal: React.FC<VRFFormModalProps> = ({ isOpen, onClose, vrfData, onSave }) => {
  const [formData, setFormData] = useState({
    vendor_name: vrfData?.vendor_name || '',
    contact_person: vrfData?.contact_person || '',
    email: vrfData?.email || '',
    phone: vrfData?.phone || '',
    mobile: vrfData?.mobile || '',
    address: vrfData?.address || '',
    city: vrfData?.city || '',
    state: vrfData?.state || '',
    country: vrfData?.country || 'India',
    pincode: vrfData?.pincode || '',
    gst_number: vrfData?.gst_number || '',
    pan_number: vrfData?.pan_number || '',
    vendor_type: vrfData?.vendor_type || 'material' as 'material' | 'service' | 'both',
    business_nature: vrfData?.business_nature || '',
    annual_turnover: vrfData?.annual_turnover || 0,
    years_in_business: vrfData?.years_in_business || 0,
    bank_name: vrfData?.bank_name || '',
    bank_account: vrfData?.bank_account || '',
    ifsc_code: vrfData?.ifsc_code || '',
    payment_terms: vrfData?.payment_terms || '',
    credit_period: vrfData?.credit_period || 0,
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {vrfData ? 'Edit VRF Form' : 'Vendor Registration Form'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  value={formData.vendor_name}
                  onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person *
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Type *
                </label>
                <select
                  value={formData.vendor_type}
                  onChange={(e) => handleInputChange('vendor_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="material">Material Supplier</option>
                  <option value="service">Service Provider</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Business & Tax Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business & Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number
                </label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => handleInputChange('gst_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={formData.pan_number}
                  onChange={(e) => handleInputChange('pan_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Nature
                </label>
                <input
                  type="text"
                  value={formData.business_nature}
                  onChange={(e) => handleInputChange('business_nature', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years in Business
                </label>
                <input
                  type="number"
                  value={formData.years_in_business}
                  onChange={(e) => handleInputChange('years_in_business', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Turnover (₹)
                </label>
                <input
                  type="number"
                  value={formData.annual_turnover}
                  onChange={(e) => handleInputChange('annual_turnover', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Period (Days)
                </label>
                <input
                  type="number"
                  value={formData.credit_period}
                  onChange={(e) => handleInputChange('credit_period', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={formData.bank_account}
                  onChange={(e) => handleInputChange('bank_account', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.ifsc_code}
                  onChange={(e) => handleInputChange('ifsc_code', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={formData.payment_terms}
                  onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 30 days from invoice date"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {vrfData ? 'Update' : 'Save'} VRF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VRFFormManager;
