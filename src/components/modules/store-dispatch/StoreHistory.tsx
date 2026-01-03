'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, FileText, Eye, Package, ArrowRightCircle, X, Printer, Download } from 'lucide-react';
import { grnAPI, jwAnnexureGRNAPI, GRN, JWAnnexureGRN, GRNItem, JWAnnexureGRNItem } from '../../../lib/supabase';
import HistoryDetailView from './HistoryDetailView';

interface StoreForm {
  id: string;
  type: 'normal-grn' | 'jw-annexure-grn';
  docNo?: string;
  date: string;
  supplierName?: string;
  grnType?: string;
  createdAt: string;
  [key: string]: any;
}

const StoreHistory: React.FC = () => {
  const [forms, setForms] = useState<StoreForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<StoreForm[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'normal-grn' | 'jw-annexure-grn'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<StoreForm | null>(null);
  const [detailedForm, setDetailedForm] = useState<GRN | JWAnnexureGRN | null>(null);
  const [detailedItems, setDetailedItems] = useState<GRNItem[] | JWAnnexureGRNItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
        // Fetch all GRNs (both Normal and JW Annexure) from separate tables
        const [grns, jwGrns] = await Promise.all([
          grnAPI.getAll().catch(err => {
            console.warn('Error fetching GRNs:', err);
            return [];
          }),
          jwAnnexureGRNAPI.getAll().catch(err => {
            console.warn('Error fetching JW Annexure GRNs:', err);
            return [];
          })
        ]);

        // Transform normal GRNs
        const normalGrnForms: StoreForm[] = (grns || [])
          .map(grn => ({
            id: grn.id,
            type: 'normal-grn' as const,
            docNo: grn.doc_no,
            date: grn.date,
            supplierName: grn.party_name || grn.supplier_name || '',
            grnType: 'NORMAL',
            createdAt: grn.created_at || grn.date
          }));

        // Transform JW Annexure GRNs
        const jwGrnForms: StoreForm[] = (jwGrns || [])
          .map(grn => ({
            id: grn.id,
            type: 'jw-annexure-grn' as const,
            docNo: grn.doc_no,
            date: grn.date,
            supplierName: grn.party_name || '',
            grnType: 'JW_ANNEXURE',
            createdAt: grn.created_at || grn.date
          }));

        const allForms = [...normalGrnForms, ...jwGrnForms];
        setForms(allForms);
        
        if (allForms.length === 0) {
          console.log('No GRN records found in database');
        }
      } catch (error) {
        console.error('Error loading store forms:', error);
        // Don't show alert if it's just empty data
        if (error && typeof error === 'object' && 'message' in error) {
          console.error('Error details:', error);
        }
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

  const handleViewForm = async (form: StoreForm) => {
    setSelectedForm(form);
    setLoadingDetails(true);
    setDetailedForm(null);
    setDetailedItems([]);
    
    try {
      if (form.type === 'normal-grn') {
        const data = await grnAPI.getById(form.id);
        if (data) {
          setDetailedForm(data.grn);
          setDetailedItems(data.items || []);
        }
      } else if (form.type === 'jw-annexure-grn') {
        const data = await jwAnnexureGRNAPI.getById(form.id);
        if (data) {
          setDetailedForm(data.grn);
          setDetailedItems(data.items || []);
        }
      }
    } catch (error) {
      console.error('Error loading form details:', error);
    } finally {
      setLoadingDetails(false);
    }
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
      case 'normal-grn':
        return `Normal GRN - ${form.docNo || 'N/A'}`;
      case 'jw-annexure-grn':
        return `JW Annexure GRN - ${form.docNo || 'N/A'}`;
      default:
        return 'GRN Form';
    }
  };

  // Group forms by type
  const normalGrns = filteredForms.filter(f => f.type === 'normal-grn');
  const jwGrns = filteredForms.filter(f => f.type === 'jw-annexure-grn');

  if (selectedForm) {
    // Prepare document info
    const documentInfo: Array<{ label: string; value: string | number | null | undefined }> = [
      { label: 'Document Number', value: detailedForm?.doc_no || selectedForm.docNo },
      { label: 'Date', value: formatDate(detailedForm?.date || selectedForm.date || selectedForm.createdAt) }
    ];

    if (selectedForm.type === 'normal-grn' && detailedForm) {
      const grn = detailedForm as GRN;
      if (grn.supplier_name) documentInfo.push({ label: 'Supplier', value: grn.supplier_name });
      if (grn.po_no) documentInfo.push({ label: 'PO Number', value: grn.po_no });
      if (grn.grn_no) documentInfo.push({ label: 'GRN Number', value: grn.grn_no });
    } else if (selectedForm.type === 'jw-annexure-grn' && detailedForm) {
      const jwGrn = detailedForm as JWAnnexureGRN;
      if (jwGrn.party_name) documentInfo.push({ label: 'Party Name', value: jwGrn.party_name });
      if (jwGrn.jw_no) documentInfo.push({ label: 'JW Number', value: jwGrn.jw_no });
      if (jwGrn.indent_no) documentInfo.push({ label: 'Indent Number', value: jwGrn.indent_no });
      if (jwGrn.challan_no) documentInfo.push({ label: 'Challan Number', value: jwGrn.challan_no });
      if (jwGrn.gst_no) documentInfo.push({ label: 'GST Number', value: jwGrn.gst_no });
      if (jwGrn.total_value) documentInfo.push({ 
        label: 'Total Value', 
        value: `₹${jwGrn.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
      });
    }

    // Prepare item columns
    const itemColumns = selectedForm.type === 'normal-grn' 
      ? [
          { key: 'sr_no', label: 'Sr. No.' },
          { key: 'item_description', label: 'Item Description' },
          { key: 'total_qty', label: 'Quantity', format: (v: any) => v || 'N/A' },
          { key: 'uom', label: 'UOM' },
          { key: 'remarks', label: 'Remarks', format: (v: any) => v || '-' }
        ]
      : [
          { key: 'sr_no', label: 'Sr. No.' },
          { key: 'item_code', label: 'Item Code' },
          { key: 'item_name', label: 'Item Name' },
          { key: 'indent_qty', label: 'Indent Qty' },
          { key: 'rcd_qty', label: 'Received Qty' },
          { key: 'rate', label: 'Rate', format: (v: any) => v ? `₹${v}` : 'N/A' },
          { key: 'net_value', label: 'Net Value', format: (v: any) => v ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A' }
        ];

    return (
      <HistoryDetailView
        title={getFormTitle(selectedForm)}
        date={selectedForm.date || selectedForm.createdAt}
        onClose={handleCloseView}
        documentInfo={documentInfo}
        items={detailedItems}
        itemColumns={itemColumns}
        loading={loadingDetails}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inward History</h2>
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
              <option value="normal-grn">Normal GRN</option>
              <option value="jw-annexure-grn">JW Annexure GRN</option>
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

      {/* Normal GRN Section */}
      {selectedType === 'all' || selectedType === 'normal-grn' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Normal GRN ({normalGrns.length})</h3>
          </div>
          {normalGrns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {normalGrns.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-800">Normal GRN</span>
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
              No Normal GRN records found
            </div>
          )}
        </div>
      ) : null}

      {/* JW Annexure GRN Section */}
      {selectedType === 'all' || selectedType === 'jw-annexure-grn' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">JW Annexure GRN ({jwGrns.length})</h3>
          </div>
          {jwGrns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jwGrns.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ArrowRightCircle className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-800">JW Annexure GRN</span>
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
              No JW Annexure GRN records found
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

