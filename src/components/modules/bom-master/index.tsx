'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, Download, Upload, 
  Eye, Edit, Trash2, History, Settings, FileText,
  ChevronRight, ChevronDown, CheckCircle, AlertTriangle,
  Lock, Unlock, Archive, RotateCcw
} from 'lucide-react';
import { BOMMasterWithVersions, BOMVersion, BOMComponent, BOMAudit, bomMasterAPI } from '@/lib/supabase';


import ExcelFileReader from '../../ExcelFileReader';

// Utility function to format numeric values with 2 decimal places
const formatNumericValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  const numValue = Number(value);
  if (isNaN(numValue)) return '-';
  return numValue.toFixed(2);
};

interface BOMMasterProps {
  // Add any props if needed
}

const BOMMaster: React.FC<BOMMasterProps> = () => {
  const [bomMasters, setBomMasters] = useState<BOMMasterWithVersions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'SFG' | 'FG' | 'LOCAL'>('SFG');
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

  // Load BOM masters on component mount and when category changes
  useEffect(() => {
    loadBomMasters();
  }, [selectedCategory]);

  const loadBomMasters = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the category-specific API call
      const data = await bomMasterAPI.getByCategory(selectedCategory);
      
      console.log(`${selectedCategory} BOM data received:`, data?.length || 0, 'records');
      console.log('First record:', data?.[0]);
      setBomMasters(data || []);
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

  const handleExcelDataImported = (data: any) => {
    // Handle Excel import
    console.log('Excel import data:', data);
    setShowExcelReader(false);
    loadBomMasters();
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
            (bom.item_code || '')
          ].join(' ').toLowerCase();
        default:
          return '';
      }
    };
    
    const matchesSearch = getSearchFields(bom).includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bom.status === statusFilter;
    
    // Remove category filtering since data is already filtered by API
    return matchesSearch && matchesStatus;
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
                onClick={() => setSelectedCategory('SFG')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedCategory === 'SFG'
                    ? 'bg-white border border-gray-300 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                SFG
              </button>
              <button
                onClick={() => setSelectedCategory('FG')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedCategory === 'FG'
                    ? 'bg-white border border-gray-300 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                FG
              </button>
              <button
                onClick={() => setSelectedCategory('LOCAL')}
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
              onClick={loadBomMasters}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
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

      {/* BOM Masters Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading BOM masters...</span>
          </div>
        ) : sortedBomMasters.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No BOM masters found matching your criteria</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
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
                      </>
                    )}
                    {selectedCategory === 'LOCAL' && (
                      <>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                          ITEM CODE
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {(bom as any).sl_no !== null && (bom as any).sl_no !== undefined ? (bom as any).sl_no : '-'}
                      </td>
                      {selectedCategory === 'SFG' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).item_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).sfg_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).pcs !== null && (bom as any).pcs !== undefined ? formatNumericValue((bom as any).pcs) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).part_weight_gm_pcs !== null && (bom as any).part_weight_gm_pcs !== undefined ? `${formatNumericValue((bom as any).part_weight_gm_pcs)}g` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).colour || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).hp_percentage !== null && (bom as any).hp_percentage !== undefined ? `${formatNumericValue((bom as any).hp_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).icp_percentage !== null && (bom as any).icp_percentage !== undefined ? `${formatNumericValue((bom as any).icp_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).rcp_percentage !== null && (bom as any).rcp_percentage !== undefined ? `${formatNumericValue((bom as any).rcp_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).ldpe_percentage !== null && (bom as any).ldpe_percentage !== undefined ? `${formatNumericValue((bom as any).ldpe_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).gpps_percentage !== null && (bom as any).gpps_percentage !== undefined ? `${formatNumericValue((bom as any).gpps_percentage * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).mb_percentage !== null && (bom as any).mb_percentage !== undefined ? `${formatNumericValue((bom as any).mb_percentage * 100)}%` : '-'}
                          </td>
                        </>
                      )}
                      {selectedCategory === 'FG' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).item_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).party_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).pack_size || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).sfg_1 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
_                            {(bom as any).sfg_1_qty !== null && (bom as any).sfg_1_qty !== undefined ? (bom as any).sfg_1_qty : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).sfg_2 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).sfg_2_qty !== null && (bom as any).sfg_2_qty !== undefined ? (bom as any).sfg_2_qty : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).cnt_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).cnt_qty !== null && (bom as any).cnt_qty !== undefined ? (bom as any).cnt_qty : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).polybag_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).poly_qty !== null && (bom as any).poly_qty !== undefined ? (bom as any).poly_qty : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).bopp_1 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).qty_meter !== null && (bom as any).qty_meter !== undefined ? formatNumericValue((bom as any).qty_meter) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).bopp_2 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).qty_meter_2 !== null && (bom as any).qty_meter_2 !== undefined ? formatNumericValue((bom as any).qty_meter_2) : '-'}
                          </td>
                        </>
                      )}
                      {selectedCategory === 'LOCAL' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).item_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).pack_size || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).sfg_1 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).sfg_1_qty !== null && (bom as any).sfg_1_qty !== undefined ? (bom as any).sfg_1_qty : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).sfg_2 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).sfg_2_qty !== null && (bom as any).sfg_2_qty !== undefined ? (bom as any).sfg_2_qty : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).cnt_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).cnt_qty !== null && (bom as any).cnt_qty !== undefined ? (bom as any).cnt_qty : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).polybag_code || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).poly_qty !== null && (bom as any).poly_qty !== undefined ? (bom as any).poly_qty : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).bopp_1 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).qty_meter !== null && (bom as any).qty_meter !== undefined ? formatNumericValue((bom as any).qty_meter) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).bopp_2 || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(bom as any).qty_meter_2 !== null && (bom as any).qty_meter_2 !== undefined ? formatNumericValue((bom as any).qty_meter_2) : '-'}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
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
    </div>
  );
};

export default BOMMaster;
