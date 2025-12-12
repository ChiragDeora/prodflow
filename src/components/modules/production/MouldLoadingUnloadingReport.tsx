'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, Upload, 
  Eye, Edit, Trash2, History, Settings, CheckCircle,
  ChevronRight, ChevronDown, AlertTriangle, Clock,
  Lock, Unlock, Archive, RotateCcw, Building, Phone, Mail,
  MapPin, Globe, Calendar, User, Package, Send, Save,
  Wrench, Cog, X
} from 'lucide-react';
import { lineAPI } from '../../../lib/supabase';

interface Line {
  line_id: string;
  line_name: string;
  description?: string;
  im_machine_id?: string;
  robot_machine_id?: string;
  conveyor_machine_id?: string;
  hoist_machine_id?: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  unit: string;
  created_at: string;
  updated_at: string;
}

interface MouldReport {
  id: string;
  doc_no: string;
  report_date: string;
  line_no: string;
  unloading_mould_name: string;
  unloading_start_time: string;
  loading_mould_name: string;
  first_shot_start_time: string;
  total_time_lost_for_change: string;
  mould_change_done_by: string;
  report_verified_by: string;
  verified_at: string | null;
  status: 'draft' | 'completed' | 'verified';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Procedure {
  id: string;
  sr_no: number;
  procedure_text: string;
  tick_yes_no: boolean | null;
  remarks: string;
}

interface MouldReportWithProcedures extends MouldReport {
  unloading_procedures: Procedure[];
  loading_procedures: Procedure[];
}

const MouldLoadingUnloadingReport: React.FC = () => {
  const [reports, setReports] = useState<MouldReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'completed' | 'verified'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MouldReportWithProcedures | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('report_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Form state
  const [formData, setFormData] = useState({
    doc_no: 'DPPL-PRD-004/R00',
    report_date: new Date().toISOString().split('T')[0],
    line_no: '',
    unloading_mould_name: '',
    unloading_start_time: '',
    loading_mould_name: '',
    first_shot_start_time: '',
    total_time_lost_for_change: '',
    mould_change_done_by: '',
    report_verified_by: ''
  });
  
  const [unloadingProcedures, setUnloadingProcedures] = useState<Procedure[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState<Procedure[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);

  // Load reports and lines on component mount
  useEffect(() => {
    loadReports();
    loadLines();
  }, []);

  const loadLines = async () => {
    setLinesLoading(true);
    try {
      const linesData = await lineAPI.getAll();
      // Show all lines, sorted by line_id to ensure consistent ordering
      setLines(linesData.sort((a, b) => a.line_id.localeCompare(b.line_id)));
    } catch (error) {
      console.error('Error loading lines:', error);
      setError('Failed to load production lines');
    } finally {
      setLinesLoading(false);
    }
  };

  // Initialize default procedures when creating new report
  useEffect(() => {
    if (showCreateForm && !selectedReport) {
      initializeDefaultProcedures();
    } else if (selectedReport) {
      loadReportData(selectedReport);
    }
  }, [showCreateForm, selectedReport]);

  const initializeDefaultProcedures = () => {
    const defaultUnloadingProcedures: Procedure[] = [
      { id: '1', sr_no: 1, procedure_text: 'Keep The Mould Ready near the machine which is to be load', tick_yes_no: null, remarks: '' },
      { id: '2', sr_no: 2, procedure_text: 'Collect Last sample of Running Mould', tick_yes_no: null, remarks: '' },
      { id: '3', sr_no: 3, procedure_text: 'Shut Down the chiller line valves & then run Mould For 7 to 8 Shorts.', tick_yes_no: null, remarks: '' },
      { id: '4', sr_no: 4, procedure_text: 'Apply Anticorrosion Spray in mould.', tick_yes_no: null, remarks: '' },
      { id: '5', sr_no: 5, procedure_text: 'Remove water & Air lines from Mould.', tick_yes_no: null, remarks: '' },
      { id: '6', sr_no: 6, procedure_text: 'Put Lock Patti on Mould', tick_yes_no: null, remarks: '' },
      { id: '7', sr_no: 7, procedure_text: 'Unload the mould.', tick_yes_no: null, remarks: '' },
      { id: '8', sr_no: 8, procedure_text: 'Clean the Water lines for mould by applying air.', tick_yes_no: null, remarks: '' },
      { id: '9', sr_no: 9, procedure_text: 'Shift the hot runner controller to keep proper place.', tick_yes_no: null, remarks: '' },
      { id: '10', sr_no: 10, procedure_text: 'If mention any Problem observed in mould during this run.', tick_yes_no: null, remarks: '' }
    ];

    const defaultLoadingProcedures: Procedure[] = [
      { id: '1', sr_no: 1, procedure_text: 'Check Before loading the mould - HRS, Lock patti, locating ring, water & air Nipples', tick_yes_no: null, remarks: '' },
      { id: '2', sr_no: 2, procedure_text: 'Load the mould & clamp it properly.', tick_yes_no: null, remarks: '' },
      { id: '3', sr_no: 3, procedure_text: 'Remove Lock Patti & Crane.', tick_yes_no: null, remarks: '' },
      { id: '4', sr_no: 4, procedure_text: 'Open the Mould', tick_yes_no: null, remarks: '' },
      { id: '5', sr_no: 5, procedure_text: 'Do the water & air line Connections.', tick_yes_no: null, remarks: '' },
      { id: '6', sr_no: 6, procedure_text: 'Check air ejector operations.', tick_yes_no: null, remarks: '' },
      { id: '7', sr_no: 7, procedure_text: 'Connect HRS as per Mould No.', tick_yes_no: null, remarks: '' },
      { id: '8', sr_no: 8, procedure_text: 'Clean the mould properly.', tick_yes_no: null, remarks: '' },
      { id: '9', sr_no: 9, procedure_text: 'Do the auto tonnage setting of mould.', tick_yes_no: null, remarks: '' },
      { id: '10', sr_no: 10, procedure_text: 'Set the parameters or Load from machine mould data sheet.', tick_yes_no: null, remarks: '' },
      { id: '11', sr_no: 11, procedure_text: 'Start the production.', tick_yes_no: null, remarks: '' },
      { id: '12', sr_no: 12, procedure_text: 'Collect the first of sample of the mould', tick_yes_no: null, remarks: '' },
      { id: '13', sr_no: 13, procedure_text: 'If mention any problem observed during loading & starting of mould.', tick_yes_no: null, remarks: '' }
    ];

    setUnloadingProcedures(defaultUnloadingProcedures);
    setLoadingProcedures(defaultLoadingProcedures);
  };

  const loadReportData = (report: MouldReportWithProcedures) => {
    setFormData({
      doc_no: report.doc_no,
      report_date: report.report_date,
      line_no: report.line_no || '',
      unloading_mould_name: report.unloading_mould_name || '',
      unloading_start_time: report.unloading_start_time || '',
      loading_mould_name: report.loading_mould_name || '',
      first_shot_start_time: report.first_shot_start_time || '',
      total_time_lost_for_change: report.total_time_lost_for_change || '',
      mould_change_done_by: report.mould_change_done_by || '',
      report_verified_by: report.report_verified_by || ''
    });
    setUnloadingProcedures(report.unloading_procedures || []);
    setLoadingProcedures(report.loading_procedures || []);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProcedureChange = (type: 'unloading' | 'loading', procedureId: string, field: 'tick_yes_no' | 'remarks', value: boolean | string) => {
    const setProcedures = type === 'unloading' ? setUnloadingProcedures : setLoadingProcedures;
    
    setProcedures(prev => prev.map(proc => 
      proc.id === procedureId 
        ? { ...proc, [field]: value }
        : proc
    ));
  };

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/production/mould-reports');
      const result = await response.json();
      
      if (result.success) {
        setReports(result.data || []);
      } else {
        setError(result.error || 'Failed to load reports');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (reportData: Partial<MouldReport>) => {
    try {
      const response = await fetch('/api/production/mould-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadReports();
        setShowCreateForm(false);
        alert('Report created successfully!');
      } else {
        alert(`Failed to create report: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Failed to create report');
    }
  };

  const handleUpdateReport = async (id: string, updates: Partial<MouldReport>) => {
    try {
      const response = await fetch(`/api/production/mould-reports/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadReports();
        setSelectedReport(null);
        alert('Report updated successfully!');
      } else {
        alert(`Failed to update report: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    }
  };

  const handleSubmitForm = async () => {
    setFormLoading(true);
    try {
      const reportPayload = {
        ...formData,
        unloading_procedures: unloadingProcedures,
        loading_procedures: loadingProcedures,
        created_by: 'current_user' // This should come from auth context
      };

      if (selectedReport) {
        // Update existing report
        await handleUpdateReport(selectedReport.id, reportPayload);
        setSelectedReport(null);
        setShowCreateForm(false);
      } else {
        // Create new report
        await handleCreateReport(reportPayload);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Failed to submit report');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      doc_no: 'DPPL-PRD-004/R00',
      report_date: new Date().toISOString().split('T')[0],
      line_no: '',
      unloading_mould_name: '',
      unloading_start_time: '',
      loading_mould_name: '',
      first_shot_start_time: '',
      total_time_lost_for_change: '',
      mould_change_done_by: '',
      report_verified_by: ''
    });
    setUnloadingProcedures([]);
    setLoadingProcedures([]);
    setShowCreateForm(false);
    setSelectedReport(null);
  };

  const handleViewReport = async (report: MouldReport) => {
    try {
      const response = await fetch(`/api/production/mould-reports/${report.id}`);
      const result = await response.json();
      
      if (result.success) {
        setSelectedReport(result.data);
      } else {
        alert(`Failed to load report details: ${result.error}`);
      }
    } catch (error) {
      console.error('Error loading report details:', error);
      alert('Failed to load report details');
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.line_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.unloading_mould_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.loading_mould_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.mould_change_done_by?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    let aValue: any = a[sortField as keyof MouldReport];
    let bValue: any = b[sortField as keyof MouldReport];
    
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'verified': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'verified': return <Lock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Cog className="w-8 h-8 mr-3 text-blue-600" />
              Mould Loading & Unloading Reports
            </h1>
            <p className="text-gray-600 mt-1">Track mould changeover procedures and timings</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadReports}
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
              New Report
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
                placeholder="Search reports..."
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
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="verified">Verified</option>
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
            {filteredReports.length} of {reports.length} reports
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
                  <option value="report_date">Report Date</option>
                  <option value="machine_no">Machine Number</option>
                  <option value="status">Status</option>
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
                    setSortField('report_date');
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

      {/* Reports Table */}
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
                    Report Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Line & Moulds
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timing & Personnel
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
                {sortedReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{report.doc_no}</div>
                        <div className="text-sm text-gray-500">
                          Date: {new Date(report.report_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Line: {report.line_no}</div>
                        <div className="text-sm text-gray-500">
                          Unload: {report.unloading_mould_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Load: {report.loading_mould_name || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          Change by: {report.mould_change_done_by || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Time Lost: {report.total_time_lost_for_change || 'N/A'}
                        </div>
                        {report.report_verified_by && (
                          <div className="text-sm text-gray-500">
                            Verified by: {report.report_verified_by}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        <span className="ml-1">{report.status.toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="text-blue-600 hover:text-blue-900 text-xs bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        {report.status === 'draft' && (
                          <button
                            onClick={() => handleViewReport(report)}
                            className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-2 py-1 rounded hover:bg-green-100"
                            title="Edit Report"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedReports.length === 0 && (
              <div className="text-center py-12">
                <Cog className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {reports.length === 0 ? 'Get started by creating a new report.' : 'Try adjusting your search filters.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Report Modal */}
      {(showCreateForm || selectedReport) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  <Cog className="w-6 h-6 mr-2" />
              {selectedReport ? 'View/Edit Report' : 'Create New Report'}
            </h2>
                <p className="text-blue-100 mt-1">Mould Loading & Unloading Report Form</p>
            </div>
              <button
                onClick={resetForm}
                className="text-white hover:text-blue-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form className="space-y-8">
                {/* Basic Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Document No.
                      </label>
                      <input
                        type="text"
                        value={formData.doc_no}
                        onChange={(e) => handleInputChange('doc_no', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Report Date *
                      </label>
                      <input
                        type="date"
                        value={formData.report_date}
                        onChange={(e) => handleInputChange('report_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Production Line *
                      </label>
                      <select
                        value={formData.line_no}
                        onChange={(e) => handleInputChange('line_no', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={linesLoading}
                      >
                        <option value="">
                          {linesLoading ? 'Loading lines...' : 'Select production line'}
                        </option>
                        {lines.map((line) => (
                          <option key={line.line_id} value={line.line_id}>
                            {line.line_name || line.line_id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Mould Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-green-600" />
                    Mould Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Unloading Section */}
                    <div className="border-r border-gray-200 pr-6">
                      <h4 className="font-medium text-gray-800 mb-3 text-red-600">Unloading Mould</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mould Name
                          </label>
                          <input
                            type="text"
                            value={formData.unloading_mould_name}
                            onChange={(e) => handleInputChange('unloading_mould_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter unloading mould name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unloading Start Time
                          </label>
                          <input
                            type="time"
                            value={formData.unloading_start_time}
                            onChange={(e) => handleInputChange('unloading_start_time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Loading Section */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3 text-green-600">Loading Mould</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mould Name
                          </label>
                          <input
                            type="text"
                            value={formData.loading_mould_name}
                            onChange={(e) => handleInputChange('loading_mould_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter loading mould name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Time of First Shot Mould Start
                          </label>
                          <input
                            type="time"
                            value={formData.first_shot_start_time}
                            onChange={(e) => handleInputChange('first_shot_start_time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Time Lost for Mould Change
                      </label>
                      <input
                        type="text"
                        value={formData.total_time_lost_for_change}
                        onChange={(e) => handleInputChange('total_time_lost_for_change', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 2 hours 30 minutes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mould Change Done By
                      </label>
                      <input
                        type="text"
                        value={formData.mould_change_done_by}
                        onChange={(e) => handleInputChange('mould_change_done_by', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter operator name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Report Verified By
                      </label>
                      <input
                        type="text"
                        value={formData.report_verified_by}
                        onChange={(e) => handleInputChange('report_verified_by', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter supervisor name"
                      />
                    </div>
                  </div>
                </div>

                {/* Procedures Checklist */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Unloading Procedures */}
                  <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                      <Unlock className="w-5 h-5 mr-2" />
                      Unloading Procedures
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-red-200">
                            <th className="text-left py-2 px-2 font-medium text-red-700 w-12">Sr. No.</th>
                            <th className="text-left py-2 px-2 font-medium text-red-700">Procedure</th>
                            <th className="text-center py-2 px-2 font-medium text-red-700 w-20">Tick Yes/No</th>
                            <th className="text-left py-2 px-2 font-medium text-red-700 w-32">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unloadingProcedures.map((procedure) => (
                            <tr key={procedure.id} className="border-b border-red-100">
                              <td className="py-3 px-2 text-center font-medium">{procedure.sr_no}</td>
                              <td className="py-3 px-2 text-gray-800">{procedure.procedure_text}</td>
                              <td className="py-3 px-2 text-center">
                                <div className="flex justify-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleProcedureChange('unloading', procedure.id, 'tick_yes_no', true)}
                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                      procedure.tick_yes_no === true 
                                        ? 'bg-green-500 border-green-500 text-white' 
                                        : 'border-gray-300 hover:border-green-400'
                                    }`}
                                  >
                                    {procedure.tick_yes_no === true && <CheckCircle className="w-4 h-4" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleProcedureChange('unloading', procedure.id, 'tick_yes_no', false)}
                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                      procedure.tick_yes_no === false 
                                        ? 'bg-red-500 border-red-500 text-white' 
                                        : 'border-gray-300 hover:border-red-400'
                                    }`}
                                  >
                                    {procedure.tick_yes_no === false && <X className="w-4 h-4" />}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <input
                                  type="text"
                                  value={procedure.remarks || ''}
                                  onChange={(e) => handleProcedureChange('unloading', procedure.id, 'remarks', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Add remarks"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Loading Procedures */}
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                      <Lock className="w-5 h-5 mr-2" />
                      Loading Procedures
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-green-200">
                            <th className="text-left py-2 px-2 font-medium text-green-700 w-12">Sr. No.</th>
                            <th className="text-left py-2 px-2 font-medium text-green-700">Procedure</th>
                            <th className="text-center py-2 px-2 font-medium text-green-700 w-20">Tick Yes/No</th>
                            <th className="text-left py-2 px-2 font-medium text-green-700 w-32">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingProcedures.map((procedure) => (
                            <tr key={procedure.id} className="border-b border-green-100">
                              <td className="py-3 px-2 text-center font-medium">{procedure.sr_no}</td>
                              <td className="py-3 px-2 text-gray-800">{procedure.procedure_text}</td>
                              <td className="py-3 px-2 text-center">
                                <div className="flex justify-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleProcedureChange('loading', procedure.id, 'tick_yes_no', true)}
                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                      procedure.tick_yes_no === true 
                                        ? 'bg-green-500 border-green-500 text-white' 
                                        : 'border-gray-300 hover:border-green-400'
                                    }`}
                                  >
                                    {procedure.tick_yes_no === true && <CheckCircle className="w-4 h-4" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleProcedureChange('loading', procedure.id, 'tick_yes_no', false)}
                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                      procedure.tick_yes_no === false 
                                        ? 'bg-red-500 border-red-500 text-white' 
                                        : 'border-gray-300 hover:border-red-400'
                                    }`}
                                  >
                                    {procedure.tick_yes_no === false && <X className="w-4 h-4" />}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <input
                                  type="text"
                                  value={procedure.remarks || ''}
                                  onChange={(e) => handleProcedureChange('loading', procedure.id, 'remarks', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Add remarks"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                * Required fields
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                  type="button"
                  onClick={handleSubmitForm}
                  disabled={formLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {formLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {selectedReport ? 'Update Report' : 'Create Report'}
                    </>
                  )}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MouldLoadingUnloadingReport;

