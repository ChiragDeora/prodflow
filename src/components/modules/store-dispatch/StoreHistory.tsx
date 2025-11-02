'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, FileText, ShoppingCart, Eye, Package } from 'lucide-react';
import { grnAPI, misAPI, fgnAPI } from '../../../lib/supabase';

interface StoreForm {
  id: string;
  type: 'grn' | 'mis' | 'fgn';
  docNo?: string;
  date: string;
  supplierName?: string;
  deptName?: string;
  fromDept?: string;
  toDept?: string;
  createdAt: string;
  [key: string]: any;
}

const StoreHistory: React.FC = () => {
  const [forms, setForms] = useState<StoreForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<StoreForm[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'grn' | 'mis' | 'fgn'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<StoreForm | null>(null);

  // Get available years from forms
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    forms.forEach(form => {
      const year = new Date(form.date || form.createdAt).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [forms]);

  useEffect(() => {
    const loadForms = async () => {
      try {
        const [grns, misses, fgns] = await Promise.all([
          grnAPI.getAll(),
          misAPI.getAll(),
          fgnAPI.getAll()
        ]);

        // Transform GRNs
        const grnForms: StoreForm[] = grns.map(grn => ({
          id: grn.id,
          type: 'grn' as const,
          docNo: grn.doc_no,
          date: grn.date,
          supplierName: grn.supplier_name,
          createdAt: grn.created_at || grn.date
        }));

        // Transform MIS
        const misForms: StoreForm[] = misses.map(mis => ({
          id: mis.id,
          type: 'mis' as const,
          docNo: mis.doc_no,
          date: mis.date,
          deptName: mis.dept_name,
          createdAt: mis.created_at || mis.date
        }));

        // Transform FGNs
        const fgnForms: StoreForm[] = fgns.map(fgn => ({
          id: fgn.id,
          type: 'fgn' as const,
          docNo: fgn.doc_no,
          date: fgn.date,
          fromDept: fgn.from_dept,
          toDept: fgn.to_dept,
          createdAt: fgn.created_at || fgn.date
        }));

        setForms([...grnForms, ...misForms, ...fgnForms]);
      } catch (error) {
        console.error('Error loading store forms:', error);
        alert('Error loading store history. Please try again.');
      }
    };

    loadForms();
  }, []);

  useEffect(() => {
    // Filter forms based on year, date, type, and search term
    let filtered = [...forms];

    // Filter by year
    if (selectedYear) {
      filtered = filtered.filter(form => {
        const formYear = new Date(form.date || form.createdAt).getFullYear();
        return formYear === selectedYear;
      });
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(form => {
        const formDate = form.date || form.createdAt.split('T')[0];
        return formDate === selectedDate;
      });
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(form => form.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(form => {
        return (
          form.supplierName?.toLowerCase().includes(term) ||
          form.deptName?.toLowerCase().includes(term) ||
          form.fromDept?.toLowerCase().includes(term) ||
          form.toDept?.toLowerCase().includes(term) ||
          form.docNo?.toLowerCase().includes(term)
        );
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();
      return dateB - dateA;
    });

    setFilteredForms(filtered);
  }, [forms, selectedYear, selectedDate, selectedType, searchTerm]);

  const handleViewForm = (form: StoreForm) => {
    setSelectedForm(form);
  };

  const handleCloseView = () => {
    setSelectedForm(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const getFormTitle = (form: StoreForm) => {
    switch (form.type) {
      case 'grn':
        return `GRN - ${form.docNo || 'N/A'}`;
      case 'mis':
        return `MIS - ${form.docNo || 'N/A'}`;
      case 'fgn':
        return `FGN - ${form.docNo || 'N/A'}`;
      default:
        return 'Store Form';
    }
  };

  // Group forms by type
  const grns = filteredForms.filter(f => f.type === 'grn');
  const misses = filteredForms.filter(f => f.type === 'mis');
  const fgns = filteredForms.filter(f => f.type === 'fgn');

  if (selectedForm) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{getFormTitle(selectedForm)}</h2>
          <button
            onClick={handleCloseView}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
        <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(selectedForm, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Store History</h2>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="grn">GRN</option>
              <option value="mis">MIS</option>
              <option value="fgn">FGN</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, doc no..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredForms.length} form(s) {selectedDate ? `on ${formatDate(selectedDate)}` : selectedYear ? `in ${selectedYear}` : ''}
      </div>

      {/* GRN Section */}
      {selectedType === 'all' || selectedType === 'grn' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">GRN - Goods Received Notes ({grns.length})</h3>
          </div>
          {grns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grns.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-800">GRN</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">Doc No:</span> {form.docNo || 'N/A'}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(form.date || form.createdAt)}</div>
                    <div><span className="font-medium">Supplier:</span> {form.supplierName || 'N/A'}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewForm(form);
                    }}
                    className="mt-3 w-full px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No GRN records found
            </div>
          )}
        </div>
      ) : null}

      {/* MIS Section */}
      {selectedType === 'all' || selectedType === 'mis' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">MIS - Material Issue Slips ({misses.length})</h3>
          </div>
          {misses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {misses.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-800">MIS</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">Doc No:</span> {form.docNo || 'N/A'}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(form.date || form.createdAt)}</div>
                    <div><span className="font-medium">Department:</span> {form.deptName || 'N/A'}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewForm(form);
                    }}
                    className="mt-3 w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No MIS records found
            </div>
          )}
        </div>
      ) : null}

      {/* FGN Section */}
      {selectedType === 'all' || selectedType === 'fgn' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">FGN - Finished Goods Transfer Notes ({fgns.length})</h3>
          </div>
          {fgns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fgns.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-800">FGN</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">Doc No:</span> {form.docNo || 'N/A'}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(form.date || form.createdAt)}</div>
                    <div><span className="font-medium">From:</span> {form.fromDept || 'N/A'}</div>
                    <div><span className="font-medium">To:</span> {form.toDept || 'N/A'}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewForm(form);
                    }}
                    className="mt-3 w-full px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No FGN records found
            </div>
          )}
        </div>
      ) : null}

      {/* No Results */}
      {filteredForms.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No forms found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default StoreHistory;

