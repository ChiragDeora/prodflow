'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  X,
  RefreshCw,
  ChevronDown,
  Package,
  Settings,
  Filter
} from 'lucide-react';
import { 
  SPARE_CATEGORIES, 
  SPARE_UNITS,
  getSpareCategoryKeys,
  getSpareCategoryLabel,
  getSpareSubCategories,
  formatSubCategory,
  SpareCategory
} from '../../../lib/constants/spare-categories';

// Types
interface SparePart {
  id: number;
  item_code: string;
  item_name: string;
  item_type: 'SPARE';
  category: string;
  sub_category?: string;
  for_machine?: string;
  for_mold?: string;
  unit_of_measure: string;
  min_stock_level: number;
  reorder_qty: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface StockBalance {
  item_code: string;
  current_balance: number;
  location_code: string;
}

interface SparePartFormData {
  item_name: string;
  category: string;
  sub_category: string;
  for_machine: string;
  for_mold: string;
  unit_of_measure: string;
  min_stock_level: string;
  reorder_qty: string;
}

interface SparePartsMasterProps {
  machines?: { id: string; machine_id: string }[];
  molds?: { id: string; mold_id: string }[];
}

const SparePartsMaster: React.FC<SparePartsMasterProps> = ({ machines = [], molds = [] }) => {
  // State
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [stockBalances, setStockBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [formData, setFormData] = useState<SparePartFormData>({
    item_name: '',
    category: 'BEARING',
    sub_category: '',
    for_machine: '',
    for_mold: '',
    unit_of_measure: 'PCS',
    min_stock_level: '0',
    reorder_qty: '0'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch spare parts
  const fetchSpareParts = async () => {
    setLoading(true);
    try {
      const url = categoryFilter !== 'ALL' 
        ? `/api/masters/spare-parts?category=${categoryFilter}`
        : '/api/masters/spare-parts';
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setSpareParts(result.data || []);
        
        // Fetch stock balances for all spare parts
        if (result.data && result.data.length > 0) {
          const itemCodes = result.data.map((sp: SparePart) => sp.item_code);
          await fetchStockBalances(itemCodes);
        }
      } else {
        setError(result.error || 'Failed to fetch spare parts');
      }
    } catch (err) {
      console.error('Error fetching spare parts:', err);
      setError('Failed to fetch spare parts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stock balances
  const fetchStockBalances = async (itemCodes: string[]) => {
    try {
      const balanceMap: Record<string, number> = {};
      
      // Fetch balances for each item
      for (const itemCode of itemCodes) {
        const response = await fetch(`/api/stock/balance?item_code=${encodeURIComponent(itemCode)}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          // Sum up balances across all locations
          const total = result.data.reduce((sum: number, b: StockBalance) => sum + (b.current_balance || 0), 0);
          balanceMap[itemCode] = total;
        } else {
          balanceMap[itemCode] = 0;
        }
      }
      
      setStockBalances(balanceMap);
    } catch (err) {
      console.error('Error fetching stock balances:', err);
    }
  };

  useEffect(() => {
    fetchSpareParts();
  }, [categoryFilter]);

  // Filter spare parts
  const filteredParts = useMemo(() => {
    return spareParts.filter(part => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          part.item_code.toLowerCase().includes(search) ||
          part.item_name.toLowerCase().includes(search) ||
          (part.category && part.category.toLowerCase().includes(search))
        );
      }
      return true;
    });
  }, [spareParts, searchTerm]);

  // Handle form input change
  const handleInputChange = (field: keyof SparePartFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset sub_category when category changes
      if (field === 'category') {
        newData.sub_category = '';
      }
      
      return newData;
    });
  };

  // Open add modal
  const handleAdd = () => {
    setEditingPart(null);
    setFormData({
      item_name: '',
      category: 'BEARING',
      sub_category: '',
      for_machine: '',
      for_mold: '',
      unit_of_measure: 'PCS',
      min_stock_level: '0',
      reorder_qty: '0'
    });
    setShowModal(true);
    setError(null);
  };

  // Open edit modal
  const handleEdit = (part: SparePart) => {
    setEditingPart(part);
    setFormData({
      item_name: part.item_name,
      category: part.category || 'OTHER',
      sub_category: part.sub_category || '',
      for_machine: part.for_machine || '',
      for_mold: part.for_mold || '',
      unit_of_measure: part.unit_of_measure || 'PCS',
      min_stock_level: String(part.min_stock_level || 0),
      reorder_qty: String(part.reorder_qty || 0)
    });
    setShowModal(true);
    setError(null);
  };

  // Handle delete
  const handleDelete = async (part: SparePart) => {
    if (!confirm(`Are you sure you want to delete "${part.item_name}"?`)) return;
    
    try {
      const response = await fetch(`/api/masters/spare-parts/${part.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        fetchSpareParts();
      } else {
        alert(result.error || 'Failed to delete spare part');
      }
    } catch (err) {
      console.error('Error deleting spare part:', err);
      alert('Failed to delete spare part');
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const url = editingPart 
        ? `/api/masters/spare-parts/${editingPart.id}`
        : '/api/masters/spare-parts';
      
      const method = editingPart ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: formData.item_name,
          category: formData.category,
          sub_category: formData.sub_category || null,
          for_machine: formData.for_machine || null,
          for_mold: formData.for_mold || null,
          unit_of_measure: formData.unit_of_measure,
          min_stock_level: parseFloat(formData.min_stock_level) || 0,
          reorder_qty: parseFloat(formData.reorder_qty) || 0
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowModal(false);
        fetchSpareParts();
      } else {
        setError(result.error || 'Failed to save spare part');
      }
    } catch (err) {
      console.error('Error saving spare part:', err);
      setError('Failed to save spare part');
    } finally {
      setSubmitting(false);
    }
  };

  // Get current stock for a part
  const getCurrentStock = (itemCode: string): number => {
    return stockBalances[itemCode] || 0;
  };

  // Check if part is low stock
  const isLowStock = (part: SparePart): boolean => {
    if (!part.min_stock_level || part.min_stock_level <= 0) return false;
    return getCurrentStock(part.item_code) < part.min_stock_level;
  };

  // Get subcategories for current category
  const currentSubCategories = formData.category 
    ? getSpareSubCategories(formData.category as SpareCategory)
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Wrench className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-800">Spare Parts Master</h2>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={fetchSpareParts}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Spare Part
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {getSpareCategoryKeys().map(cat => (
                <option key={cat} value={cat}>{getSpareCategoryLabel(cat)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No spare parts found</p>
            <p className="text-sm">Add a new spare part or adjust your search filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub-Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParts.map(part => {
                  const currentStock = getCurrentStock(part.item_code);
                  const lowStock = isLowStock(part);
                  
                  return (
                    <tr key={part.id} className={`hover:bg-gray-50 ${lowStock ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {part.item_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{part.item_name}</span>
                          {lowStock && (
                            <AlertTriangle className="w-4 h-4 text-red-500" title="Low Stock" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getSpareCategoryLabel(part.category as SpareCategory)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.sub_category ? formatSubCategory(part.sub_category) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.for_machine || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.for_mold || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.unit_of_measure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.min_stock_level || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`font-bold ${lowStock ? 'text-red-600' : currentStock === 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {currentStock.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(part)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(part)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingPart ? 'Edit Spare Part' : 'Add New Spare Part'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={(e) => handleInputChange('item_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter spare part name..."
                  required
                />
              </div>

              {/* Category and Sub-category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {getSpareCategoryKeys().map(cat => (
                      <option key={cat} value={cat}>{getSpareCategoryLabel(cat)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub-Category
                  </label>
                  <select
                    value={formData.sub_category}
                    onChange={(e) => handleInputChange('sub_category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select sub-category...</option>
                    {currentSubCategories.map(subCat => (
                      <option key={subCat} value={subCat}>{formatSubCategory(subCat)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Machine and Mold */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    For Machine
                  </label>
                  {machines.length > 0 ? (
                    <select
                      value={formData.for_machine}
                      onChange={(e) => handleInputChange('for_machine', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All / Not Specific</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.machine_id}>{m.machine_id}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.for_machine}
                      onChange={(e) => handleInputChange('for_machine', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter machine ID (optional)"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    For Mold
                  </label>
                  {molds.length > 0 ? (
                    <select
                      value={formData.for_mold}
                      onChange={(e) => handleInputChange('for_mold', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All / Not Specific</option>
                      {molds.map(m => (
                        <option key={m.id} value={m.mold_id}>{m.mold_id}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.for_mold}
                      onChange={(e) => handleInputChange('for_mold', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter mold ID (optional)"
                    />
                  )}
                </div>
              </div>

              {/* UOM */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit of Measure <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.unit_of_measure}
                  onChange={(e) => handleInputChange('unit_of_measure', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {SPARE_UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              {/* Min Stock and Reorder Qty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => handleInputChange('min_stock_level', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.001"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this level</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.reorder_qty}
                    onChange={(e) => handleInputChange('reorder_qty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.001"
                  />
                  <p className="text-xs text-gray-500 mt-1">Suggested quantity to reorder</p>
                </div>
              </div>

              {/* Item Code Preview (for new items) */}
              {!editingPart && formData.category && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Item Code (auto-generated)</div>
                  <div className="font-mono text-lg font-medium text-gray-900">
                    SPARE-{formData.category.slice(0, 3).toUpperCase()}-XXX
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={submitting}
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingPart ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SparePartsMaster;


