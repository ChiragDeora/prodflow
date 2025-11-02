'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, FileText, ShoppingCart, Eye, User } from 'lucide-react';
import { vendorRegistrationAPI, materialIndentSlipAPI, purchaseOrderAPI } from '../../../lib/supabase';

interface PurchaseForm {
  id: string;
  type: 'vendor-registration' | 'material-indent' | 'purchase-order';
  customerName?: string;
  poNo?: string;
  docNo?: string;
  date: string;
  departmentName?: string;
  createdAt: string;
  [key: string]: any;
}

const PurchaseHistory: React.FC = () => {
  const [forms, setForms] = useState<PurchaseForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<PurchaseForm[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'vendor-registration' | 'material-indent' | 'purchase-order'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<PurchaseForm | null>(null);

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
        const [vendors, indentSlips, purchaseOrders] = await Promise.all([
          vendorRegistrationAPI.getAll(),
          materialIndentSlipAPI.getAll(),
          purchaseOrderAPI.getAll()
        ]);

        // Transform vendors
        const vendorForms: PurchaseForm[] = vendors.map(vendor => ({
          id: vendor.id,
          type: 'vendor-registration' as const,
          customerName: vendor.customer_name,
          date: vendor.created_at || new Date().toISOString().split('T')[0],
          customerSupplier: vendor.customer_supplier,
          createdAt: vendor.created_at || new Date().toISOString()
        }));

        // Transform indent slips
        const indentForms: PurchaseForm[] = indentSlips.map(slip => ({
          id: slip.id,
          type: 'material-indent' as const,
          docNo: slip.doc_no,
          date: slip.date,
          departmentName: slip.department_name,
          personName: slip.person_name,
          createdAt: slip.created_at || slip.date
        }));

        // Transform purchase orders
        const orderForms: PurchaseForm[] = purchaseOrders.map(order => ({
          id: order.id,
          type: 'purchase-order' as const,
          poNo: order.po_no,
          docNo: order.doc_no,
          date: order.date,
          finalAmt: order.final_amt,
          createdAt: order.created_at || order.date
        }));

        setForms([...vendorForms, ...indentForms, ...orderForms]);
      } catch (error) {
        console.error('Error loading purchase forms:', error);
        alert('Error loading purchase history. Please try again.');
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
          form.customerName?.toLowerCase().includes(term) ||
          form.poNo?.toLowerCase().includes(term) ||
          form.docNo?.toLowerCase().includes(term) ||
          form.departmentName?.toLowerCase().includes(term)
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

  const handleViewForm = (form: PurchaseForm) => {
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

  const getFormTitle = (form: PurchaseForm) => {
    switch (form.type) {
      case 'vendor-registration':
        return `Vendor Registration - ${form.customerName || 'N/A'}`;
      case 'material-indent':
        return `Material Indent Slip - ${form.docNo || 'N/A'}`;
      case 'purchase-order':
        return `Purchase Order - ${form.poNo || form.docNo || 'N/A'}`;
      default:
        return 'Purchase Form';
    }
  };

  // Group forms by type
  const vendorRegistrations = filteredForms.filter(f => f.type === 'vendor-registration');
  const materialIndents = filteredForms.filter(f => f.type === 'material-indent');
  const purchaseOrders = filteredForms.filter(f => f.type === 'purchase-order');

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
        <h2 className="text-2xl font-bold text-gray-800">Purchase History</h2>
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
              <option value="vendor-registration">Vendor Registration</option>
              <option value="material-indent">Material Indent Slip</option>
              <option value="purchase-order">Purchase Order</option>
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
              placeholder="Search by name, PO no, doc no..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredForms.length} form(s) {selectedDate ? `on ${formatDate(selectedDate)}` : selectedYear ? `in ${selectedYear}` : ''}
      </div>

      {/* Vendor Registrations Section */}
      {selectedType === 'all' || selectedType === 'vendor-registration' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Vendor Registrations ({vendorRegistrations.length})</h3>
          </div>
          {vendorRegistrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendorRegistrations.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-800">Vendor Registration</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">Name:</span> {form.customerName || 'N/A'}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(form.date || form.createdAt)}</div>
                    <div><span className="font-medium">Type:</span> {form.customerSupplier || 'N/A'}</div>
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
              No vendor registrations found
            </div>
          )}
        </div>
      ) : null}

      {/* Material Indent Slips Section */}
      {selectedType === 'all' || selectedType === 'material-indent' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-800">Material Indent Slips ({materialIndents.length})</h3>
          </div>
          {materialIndents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materialIndents.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-gray-800">Material Indent Slip</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">Doc No:</span> {form.docNo || 'N/A'}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(form.date || form.createdAt)}</div>
                    <div><span className="font-medium">Department:</span> {form.departmentName || 'N/A'}</div>
                    <div><span className="font-medium">Person:</span> {form.personName || 'N/A'}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewForm(form);
                    }}
                    className="mt-3 w-full px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No material indent slips found
            </div>
          )}
        </div>
      ) : null}

      {/* Purchase Orders Section */}
      {selectedType === 'all' || selectedType === 'purchase-order' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Purchase Orders ({purchaseOrders.length})</h3>
          </div>
          {purchaseOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchaseOrders.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-800">Purchase Order</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">PO No:</span> {form.poNo || form.docNo || 'N/A'}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(form.date || form.createdAt)}</div>
                    <div><span className="font-medium">Final Amount:</span> {form.finalAmt ? `₹${form.finalAmt}` : 'N/A'}</div>
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
              No purchase orders found
            </div>
          )}
        </div>
      ) : null}

      {/* No Results */}
      {filteredForms.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No forms found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;

