'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, Download, Upload, 
  Eye, Edit, Trash2, History, Settings, FileText,
  ChevronRight, ChevronDown, CheckCircle, AlertTriangle,
  Lock, Unlock, Archive, RotateCcw
} from 'lucide-react';
import type { BOMMasterWithVersions, BOMVersion, BOMComponent, BOMAudit } from '@/lib/supabase';
import { removeOldPrefix, updateItemNameWithRPOrCK } from '@/utils/bomCodeUtils';

import ExcelFileReader from '../../ExcelFileReader';
import BlockingLoadingModal from '../../ui/BlockingLoadingModal';
import BOMVersionViewer from './BOMVersionViewer';
import BOMAuditTrail from './BOMAuditTrail';

// Utility function to format numeric values with 2 decimal places
const formatNumericValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  const numValue = Number(value);
  if (isNaN(numValue)) return '-';
  return numValue.toFixed(2);
};

// Utility function to remove leading underscores from values
const cleanUnderscoreValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  return String(value).replace(/^_+/, '');
};

interface BOMMasterProps {
  // Add any props if needed
}

const BOMMaster: React.FC<BOMMasterProps> = () => {
  const [bomMasters, setBomMasters] = useState<BOMMasterWithVersions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'SFG' | 'FG' | 'LOCAL'>('SFG');
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'released' | 'archived'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<BOMMasterWithVersions | null>(null);
  const [showVersionViewer, setShowVersionViewer] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<BOMVersion | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showExcelReader, setShowExcelReader] = useState(false);
  const [auditData, setAuditData] = useState<BOMAudit[]>([]);
  const [sortField, setSortField] = useState<string>('sl_no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterByStatus, setFilterByStatus] = useState<string>('all');
  const [filterByCode, setFilterByCode] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isReleasingAll, setIsReleasingAll] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [blockingMessage, setBlockingMessage] = useState('');

  // Load BOM masters on component mount and when category changes
  useEffect(() => {
    // Clear previous data immediately when category changes to prevent stale data display
    setBomMasters([]);
    setLoading(true);
    loadBomMasters();
  }, [selectedCategory]);

  const loadBomMasters = async () => {
    try {
      setLoading(true);
      setError(null);
      // Add cache-busting timestamp to ensure fresh data
      const timestamp = Date.now();
      const response = await fetch(`/api/bom?category=${selectedCategory}&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const result = await response.json();

      if (result.success) {
        const data = (result.data || []) as BOMMasterWithVersions[];
        console.log(`${selectedCategory} BOM data received:`, data.length, 'records');
        console.log('First record:', data[0]);
        setBomMasters(data);
        setRefreshKey(prev => prev + 1); // Force table re-render with fresh data
      } else {
        console.error(`Error loading ${selectedCategory} BOM masters:`, result.error);
        setError(`Failed to load ${selectedCategory} BOM masters`);
      }
    } catch (error) {
      console.error(`Error loading ${selectedCategory} BOM masters:`, error);
      setError(`Failed to load ${selectedCategory} BOM masters`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBOM = async (bomData: any) => {
    try {
      const response = await fetch('/api/bom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bomData),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadBomMasters();
        setShowCreateForm(false);
        alert('BOM created successfully!');
      } else {
        alert(`Failed to create BOM: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating BOM:', error);
      alert('Failed to create BOM');
    }
  };

  const handleUpdateBOM = async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/bom/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadBomMasters();
        alert('BOM updated successfully!');
      } else {
        alert(`Failed to update BOM: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating BOM:', error);
      alert('Failed to update BOM');
    }
  };

  const handleViewVersions = async (bom: BOMMasterWithVersions) => {
    setSelectedBOM(bom);
    setShowVersionViewer(true);
  };

  const handleViewAuditTrail = async (bom: BOMMasterWithVersions) => {
    try {
      const response = await fetch(`/api/bom/audit?tableName=bom_master_trial&recordId=${bom.id}`);
      const result = await response.json();
      
      if (result.success) {
        setAuditData(result.data);
        setSelectedBOM(bom);
        setShowAuditTrail(true);
      } else {
        alert(`Failed to load audit trail: ${result.error}`);
      }
    } catch (error) {
      console.error('Error loading audit trail:', error);
      alert('Failed to load audit trail');
    }
  };

  const handleExcelDataImported = async (data: any) => {
    // Show blocking modal during import
    setIsImportingExcel(true);
    setBlockingMessage('Importing Excel data. Please wait...');
    
    try {
      // Handle Excel import
      console.log('Excel import data:', data);
      setShowExcelReader(false);
      await loadBomMasters();
    } finally {
      setIsImportingExcel(false);
      setBlockingMessage('');
    }
  };

  // Release all BOMs (current category or all)
  const handleReleaseAll = async (allCategories: boolean = false) => {
    const draftCount = bomMasters.filter(bom => bom.status === 'draft').length;
    
    if (draftCount === 0 && !allCategories) {
      alert(`No draft BOMs to release in ${selectedCategory} category.`);
      return;
    }
    
    const confirmMessage = allCategories
      ? 'Are you sure you want to release ALL draft BOMs across all categories (SFG, FG, LOCAL)? This will make them view-only and cannot be undone.'
      : `Are you sure you want to release all ${draftCount} draft BOMs in ${selectedCategory} category? This will make them view-only and cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setIsReleasingAll(true);
    setBlockingMessage(`Releasing ${draftCount} BOMs. Please wait...`);
    
    try {
      const response = await fetch('/api/bom/release-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: allCategories ? null : selectedCategory,
          releasedBy: 'current_user'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        await loadBomMasters();
      } else {
        alert(`Failed to release BOMs: ${result.error}`);
      }
    } catch (error) {
      console.error('Error releasing all BOMs:', error);
      alert('Failed to release BOMs');
    } finally {
      setIsReleasingAll(false);
      setBlockingMessage('');
    }
  };

  const handleSortChange = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredBomMasters = bomMasters.filter(bom => {
    // Since we're already getting the correct category from the API, we don't need to filter by category
    // const matchesCategory = bom.category === selectedCategory;
    
    // Get the appropriate search fields based on category
    const getSearchFields = (bom: any) => {
      switch (selectedCategory) {
        case 'SFG':
          return [
            (bom.item_name || ''),
            (bom.sfg_code || '')
          ].join(' ').toLowerCase();
        case 'FG':
          return [
            (bom.item_code || ''),
            (bom.party_name || '')
          ].join(' ').toLowerCase();
        case 'LOCAL':
          return [
            (bom.item_code || ''),
            (bom.item_name || '')
          ].join(' ').toLowerCase();
        default:
          return '';
      }
    };
    
    const matchesSearch = searchTerm === '' || getSearchFields(bom).includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bom.status === statusFilter;
    const matchesStatusFilter = filterByStatus === 'all' || bom.status === filterByStatus;
    const matchesCodeFilter = filterByCode === '' || getSearchFields(bom).includes(filterByCode.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesStatusFilter && matchesCodeFilter;
  });

  // Debug logging
  console.log('Total BOM masters:', bomMasters.length);
  console.log('Selected category:', selectedCategory);
  console.log('Filtered BOM masters:', filteredBomMasters.length);
  console.log('Sample filtered record:', filteredBomMasters[0]);

  const sortedBomMasters = [...filteredBomMasters].sort((a, b) => {
    let aValue: any = a[sortField as keyof BOMMasterWithVersions];
    let bValue: any = b[sortField as keyof BOMMasterWithVersions];
    
    // Handle null/undefined values
    if (aValue == null) aValue = sortField === 'sl_no' ? 0 : '';
    if (bValue == null) bValue = sortField === 'sl_no' ? 0 : '';
    
    // For numeric fields like sl_no, pcs, part_weight_gm_pcs, percentages
    if (['sl_no', 'pcs', 'part_weight_gm_pcs', 'hp_percentage', 'icp_percentage', 'rcp_percentage', 'ldpe_percentage', 'gpps_percentage', 'mb_percentage'].includes(sortField)) {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else {
      // Convert to string for text comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SFG': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'FG': return 'text-green-600 bg-green-50 border-green-200';
      case 'LOCAL': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'released': return 'text-green-600 bg-green-50 border-green-200';
      case 'archived': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Bill of Materials Master</h1>
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  setBomMasters([]); // Clear data immediately
                  setSelectedCategory('SFG');
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedCategory === 'SFG'
                    ? 'bg-white border border-gray-300 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                SFG
              </button>
              <button
                onClick={() => {
                  setBomMasters([]); // Clear data immediately
                  setSelectedCategory('FG');
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedCategory === 'FG'
                    ? 'bg-white border border-gray-300 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                FG
              </button>
              <button
                onClick={() => {
                  setBomMasters([]); // Clear data immediately
                  setSelectedCategory('LOCAL');
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedCategory === 'LOCAL'
                    ? 'bg-white border border-gray-300 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                LOCAL
              </button>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={async () => {
                setBomMasters([]); // Clear data first
                setRefreshKey(prev => prev + 1); // Increment refresh key
                await loadBomMasters();
              }}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowExcelReader(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add BOM
            </button>
            <button
              onClick={() => handleReleaseAll(false)}
              disabled={isReleasingAll || loading}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Release all draft ${selectedCategory} BOMs`}
            >
              {isReleasingAll ? (
                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              {isReleasingAll ? 'Releasing...' : `Release All ${selectedCategory}`}
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
                placeholder={`Search ${selectedCategory} BOMs...`}
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
              <option value="released">Released</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Code Filter */}
          <div className="min-w-48">
            <input
              type="text"
              placeholder="Filter by code..."
              value={filterByCode}
              onChange={(e) => setFilterByCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
            {filteredBomMasters.length} of {bomMasters.length} BOMs
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
                  <option value="sl_no">Serial Number</option>
                  <option value="item_name">Item Name</option>
                  <option value="item_code">Item Code</option>
                  <option value="created_at">Created Date</option>
                  <option value="updated_at">Updated Date</option>
                  {selectedCategory === 'SFG' && (
                    <>
                      <option value="sfg_code">SFG Code</option>
                      <option value="part_weight_gm_pcs">Part Weight</option>
                    </>
                  )}
                  {(selectedCategory === 'FG' || selectedCategory === 'LOCAL') && (
                    <>
                      <option value="party_name">Party Name</option>
                      <option value="pack_size">Pack Size</option>
                    </>
                  )}
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
                    setFilterByCode('');
                    setFilterByStatus('all');
                    setSortField('sl_no');
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

      {/* BOM Masters Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="relative mb-4">
              <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-gray-700 font-medium text-lg">Loading BOM Masters...</span>
            <span className="text-gray-500 text-sm mt-2">Please wait. Do not refresh or close this tab.</span>
          </div>
        ) : sortedBomMasters.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No BOM masters found matching your criteria</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table key={`${selectedCategory}-${refreshKey}`} className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      SL
                    </th>
                    {selectedCategory === 'SFG' && (
                      <>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                          ITEM NAME
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28 whitespace-nowrap">
                          SFG-CODE
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap">
                          PCS
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                          PART WT (GM/PCS)
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          COLOUR
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap">
                          HP %
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap">
                          ICP %
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap">
                          RCP %
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          LDPE %
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          GPPS %
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap">
                          MB %
                        </th>
                      </>
                    )}
                    {selectedCategory === 'FG' && (
                      <>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                          ITEM CODE
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                          ITEM NAME
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28 whitespace-nowrap">
                          PARTY NAME
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          PACK SIZE
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          SFG-1
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          SFG-1 QTY
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          SFG-2
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          SFG-2 QTY
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          CNT CODE
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          CNT QTY
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28 whitespace-nowrap">
                          POLYBAG CODE
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          POLY QTY
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          BOPP 1
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          QTY/METER
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          BOPP 2
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28 whitespace-nowrap">
                          QTY/METER 2
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          CBM
                        </th>
                      </>
                    )}
                    {selectedCategory === 'LOCAL' && (
                      <>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                          ITEM CODE
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                          ITEM NAME
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          PACK SIZE
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          SFG-1
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          SFG-1 QTY
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          SFG-2
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          SFG-2 QTY
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          CNT CODE
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          CNT QTY
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28 whitespace-nowrap">
                          POLYBAG CODE
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          POLY QTY
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          BOPP 1
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                          QTY/METER
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          BOPP 2
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28 whitespace-nowrap">
                          QTY/METER 2
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap">
                          CBM
                        </th>
                      </>
                    )}
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedBomMasters.map((bom) => (
                    <tr key={bom.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                        {(bom as any).sl_no !== null && (bom as any).sl_no !== undefined ? (bom as any).sl_no : '-'}
                      </td>
                      {selectedCategory === 'SFG' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(() => {
                              const itemName = (bom as any).item_name || '';
                              const sfgCode = (bom as any).sfg_code || '';
                              
                              // If item_name exists and is not empty, display it directly
                              if (itemName && itemName.trim() !== '') {
                                // Don't process it further - just display what's in the database
                                return itemName;
                              }
                              
                              // If item_name is empty, don't try to derive it from numeric codes
                              // Only use updateItemNameWithRPOrCK if sfg_code is NOT numeric
                              if (sfgCode && !/^\d{9,}$/.test(sfgCode)) {
                                // sfg_code is descriptive (like "RpRo10-C"), safe to process
                                const derived = updateItemNameWithRPOrCK('', sfgCode);
                                return derived || '-';
                              }
                              
                              // item_name is empty and sfg_code is numeric - just show empty
                              return '-';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(() => {
                              const code = (bom as any).sfg_code || '';
                              // Remove 100 prefix if present for display
                              return removeOldPrefix(code) || '-';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).pcs !== null && (bom as any).pcs !== undefined ? formatNumericValue((bom as any).pcs) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).part_weight_gm_pcs !== null && (bom as any).part_weight_gm_pcs !== undefined ? `${formatNumericValue((bom as any).part_weight_gm_pcs)}g` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).colour || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).hp_percentage !== null && (bom as any).hp_percentage !== undefined ? `${formatNumericValue((bom as any).hp_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).icp_percentage !== null && (bom as any).icp_percentage !== undefined ? `${formatNumericValue((bom as any).icp_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).rcp_percentage !== null && (bom as any).rcp_percentage !== undefined ? `${formatNumericValue((bom as any).rcp_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).ldpe_percentage !== null && (bom as any).ldpe_percentage !== undefined ? `${formatNumericValue((bom as any).ldpe_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).gpps_percentage !== null && (bom as any).gpps_percentage !== undefined ? `${formatNumericValue((bom as any).gpps_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).mb_percentage !== null && (bom as any).mb_percentage !== undefined ? `${formatNumericValue((bom as any).mb_percentage * 100)}%` : '-'}
                          </td>
                        </>
                      )}
                      {selectedCategory === 'FG' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(() => {
                              const code = (bom as any).item_code || '';
                              // Remove 200 prefix if present for display
                              return removeOldPrefix(code) || '-';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).item_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).party_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).pack_size || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(() => {
                              const sfgCode = (bom as any).sfg_1 || '';
                              // Remove 100 prefix if present for display
                              return removeOldPrefix(sfgCode) || '-';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).sfg_1_qty !== null && (bom as any).sfg_1_qty !== undefined ? 
                              cleanUnderscoreValue((bom as any).sfg_1_qty) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(() => {
                              const sfgCode = (bom as any).sfg_2 || '';
                              // Remove 100 prefix if present for display
                              return removeOldPrefix(sfgCode) || '-';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {cleanUnderscoreValue((bom as any).sfg_2_qty)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).cnt_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {cleanUnderscoreValue((bom as any).cnt_qty)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).polybag_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {cleanUnderscoreValue((bom as any).poly_qty)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).bopp_1 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).qty_meter !== null && (bom as any).qty_meter !== undefined ? formatNumericValue(cleanUnderscoreValue((bom as any).qty_meter)) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).bopp_2 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).qty_meter_2 !== null && (bom as any).qty_meter_2 !== undefined ? formatNumericValue(cleanUnderscoreValue((bom as any).qty_meter_2)) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).cbm !== null && (bom as any).cbm !== undefined ? formatNumericValue((bom as any).cbm) : '-'}
                          </td>
                        </>
                      )}
                      {selectedCategory === 'LOCAL' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(() => {
                              const code = (bom as any).item_code || '';
                              // Remove 200 prefix if present for display
                              return removeOldPrefix(code) || '-';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).item_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).pack_size || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(() => {
                              const sfgCode = (bom as any).sfg_1 || '';
                              // Remove 100 prefix if present for display
                              return removeOldPrefix(sfgCode) || '-';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).sfg_1_qty !== null && (bom as any).sfg_1_qty !== undefined ? 
                              cleanUnderscoreValue((bom as any).sfg_1_qty) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(() => {
                              const sfgCode = (bom as any).sfg_2 || '';
                              // Remove 100 prefix if present for display
                              return removeOldPrefix(sfgCode) || '-';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {cleanUnderscoreValue((bom as any).sfg_2_qty)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).cnt_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {cleanUnderscoreValue((bom as any).cnt_qty)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).polybag_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {cleanUnderscoreValue((bom as any).poly_qty)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).bopp_1 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).qty_meter !== null && (bom as any).qty_meter !== undefined ? formatNumericValue(cleanUnderscoreValue((bom as any).qty_meter)) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).bopp_2 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).qty_meter_2 !== null && (bom as any).qty_meter_2 !== undefined ? formatNumericValue(cleanUnderscoreValue((bom as any).qty_meter_2)) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {(bom as any).cbm !== null && (bom as any).cbm !== undefined ? formatNumericValue((bom as any).cbm) : '-'}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex space-x-2 justify-center">
                      <button
                        onClick={() => handleViewVersions(bom)}
                            className="text-blue-600 hover:text-blue-900 text-xs bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center"
                            title="View Versions"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                            Versions
                      </button>
                      <button
                        onClick={() => handleViewAuditTrail(bom)}
                            className="text-gray-600 hover:text-gray-900 text-xs bg-gray-50 px-2 py-1 rounded hover:bg-gray-100 flex items-center"
                            title="View Audit Trail"
                      >
                        <History className="w-3 h-3 mr-1" />
                            Audit
                      </button>
                      {bom.status === 'draft' && (
                        <button
                          onClick={() => handleUpdateBOM(bom.id, { status: 'released', updatedBy: 'current_user' })}
                              className="text-green-600 hover:text-green-900 text-xs bg-green-50 px-2 py-1 rounded hover:bg-green-100 flex items-center"
                              title="Release BOM"
                        >
                          <Unlock className="w-3 h-3 mr-1" />
                          Release
                        </button>
                      )}
                      {bom.status === 'released' && (
                        <button
                          onClick={() => handleUpdateBOM(bom.id, { status: 'archived', updatedBy: 'current_user' })}
                              className="text-gray-600 hover:text-gray-900 text-xs bg-gray-50 px-2 py-1 rounded hover:bg-gray-100 flex items-center"
                              title="Archive BOM"
                        >
                          <Archive className="w-3 h-3 mr-1" />
                          Archive
                        </button>
                      )}
                    </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
          </div>
        )}
      </div>

      {/* Modals */}






      {showExcelReader && (
        <ExcelFileReader
          onClose={() => setShowExcelReader(false)}
          onDataImported={handleExcelDataImported}
          defaultDataType="sfg_bom"
        />
      )}

      {/* BOM Version Viewer Modal */}
      {showVersionViewer && selectedBOM && (
        <BOMVersionViewer
          bom={selectedBOM}
          onClose={() => {
            setShowVersionViewer(false);
            setSelectedBOM(null);
          }}
        />
      )}

      {/* BOM Audit Trail Modal */}
      {showAuditTrail && selectedBOM && (
        <BOMAuditTrail
          bom={selectedBOM}
          auditData={auditData}
          onClose={() => {
            setShowAuditTrail(false);
            setSelectedBOM(null);
            setAuditData([]);
          }}
        />
      )}

      {/* Blocking Loading Modal for long operations (not regular loading) */}
      <BlockingLoadingModal
        isOpen={isReleasingAll || isImportingExcel}
        title={isReleasingAll ? 'Releasing BOMs...' : 'Importing Data...'}
        message={blockingMessage || 'Please wait. Do not press back or close this tab.'}
        showWarning={true}
      />
    </div>
  );
};

export default BOMMaster;
