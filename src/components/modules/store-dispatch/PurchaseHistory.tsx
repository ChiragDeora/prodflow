'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, FileText, ShoppingCart, Eye } from 'lucide-react';
import { materialIndentSlipAPI, purchaseOrderAPI, MaterialIndentSlip, MaterialIndentSlipItem, PurchaseOrder, PurchaseOrderItem } from '../../../lib/supabase';
import HistoryDetailView from './HistoryDetailView';

interface PurchaseForm {
  id: string;
  type: 'material-indent' | 'purchase-order';
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
  const [selectedType, setSelectedType] = useState<'all' | 'material-indent' | 'purchase-order'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<PurchaseForm | null>(null);
  const [detailedForm, setDetailedForm] = useState<MaterialIndentSlip | PurchaseOrder | null>(null);
  const [detailedItems, setDetailedItems] = useState<MaterialIndentSlipItem[] | PurchaseOrderItem[]>([]);
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
        // Fetch all purchase-related forms in parallel (Vendor Registration moved to Commercial Master)
        const [indentSlips, purchaseOrders] = await Promise.all([
          materialIndentSlipAPI.getAll().catch(err => {
            console.warn('Error fetching material indent slips:', err);
            return [];
          }),
          purchaseOrderAPI.getAll().catch(err => {
            console.warn('Error fetching purchase orders:', err);
            return [];
          })
        ]);

        // Transform indent slips
        const indentForms: PurchaseForm[] = (indentSlips || []).map(slip => ({
          id: slip.id,
          type: 'material-indent' as const,
          docNo: slip.ident_no || slip.doc_no || '',
          date: slip.date,
          departmentName: slip.party_name || slip.department_name || '',
          personName: slip.person_name || '',
          createdAt: slip.created_at || slip.date
        }));

        // Transform purchase orders
        const orderForms: PurchaseForm[] = (purchaseOrders || []).map(order => ({
          id: order.id,
          type: 'purchase-order' as const,
          poNo: order.po_no,
          docNo: order.doc_no,
          date: order.date,
          finalAmt: order.final_amt,
          createdAt: order.created_at || order.date
        }));

        const allForms = [...indentForms, ...orderForms];
        setForms(allForms);
        
        if (allForms.length === 0) {
          console.log('No purchase records found in database');
        }
      } catch (error) {
        console.error('Error loading purchase forms:', error);
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
          form.poNo?.toLowerCase().includes(term) ||
          form.docNo?.toLowerCase().includes(term) ||
          form.departmentName?.toLowerCase().includes(term) ||
          form.personName?.toLowerCase().includes(term)
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

  const handleViewForm = async (form: PurchaseForm) => {
    setSelectedForm(form);
    setLoadingDetails(true);
    setDetailedForm(null);
    setDetailedItems([]);
    
    try {
      if (form.type === 'material-indent') {
        const data = await materialIndentSlipAPI.getById(form.id);
        if (data) {
          setDetailedForm(data.slip);
          setDetailedItems(data.items || []);
        }
      } else if (form.type === 'purchase-order') {
        const data = await purchaseOrderAPI.getById(form.id);
        if (data) {
          setDetailedForm(data.order);
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

  const getFormTitle = (form: PurchaseForm) => {
    switch (form.type) {
      case 'material-indent':
        return `Material Indent Slip - ${form.docNo || 'N/A'}`;
      case 'purchase-order':
        return `Purchase Order - ${form.poNo || form.docNo || 'N/A'}`;
      default:
        return 'Purchase Form';
    }
  };

  // Group forms by type
  const materialIndents = filteredForms.filter(f => f.type === 'material-indent');
  const purchaseOrders = filteredForms.filter(f => f.type === 'purchase-order');

  if (selectedForm) {
    // Prepare document info
    const documentInfo: Array<{ label: string; value: string | number | null | undefined }> = [
      { label: 'Document Number', value: detailedForm && 'doc_no' in detailedForm ? detailedForm.doc_no : (detailedForm && 'ident_no' in detailedForm ? detailedForm.ident_no : selectedForm.docNo) },
      { label: 'Date', value: formatDate(detailedForm && 'date' in detailedForm ? detailedForm.date : selectedForm.date || selectedForm.createdAt) }
    ];

    if (selectedForm.type === 'material-indent' && detailedForm) {
      const slip = detailedForm as MaterialIndentSlip;
      if (slip.party_name) documentInfo.push({ label: 'Party Name', value: slip.party_name });
      if (slip.address) documentInfo.push({ label: 'Address', value: slip.address });
      if (slip.state) documentInfo.push({ label: 'State', value: slip.state });
      if (slip.gst_no) documentInfo.push({ label: 'GST Number', value: slip.gst_no });
      if (slip.indent_date) documentInfo.push({ label: 'Indent Date', value: formatDate(slip.indent_date) });
    } else if (selectedForm.type === 'purchase-order' && detailedForm) {
      const order = detailedForm as PurchaseOrder;
      if (order.po_no) documentInfo.push({ label: 'PO Number', value: order.po_no });
      if (order.party_name) documentInfo.push({ label: 'Party Name', value: order.party_name });
      if (order.gst_no) documentInfo.push({ label: 'GST Number', value: order.gst_no });
      if (order.po_type) documentInfo.push({ label: 'Type', value: order.po_type === 'CAPITAL' ? 'Capital' : order.po_type === 'OPERATIONAL' ? 'Operational' : order.po_type });
      if (order.final_amt) documentInfo.push({ label: 'Final Amount', value: `₹${order.final_amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` });
    }

    // Prepare item columns
    const itemColumns = selectedForm.type === 'material-indent'
      ? [
          { key: 'sr_no', label: 'Sr. No.' },
          { key: 'item_code', label: 'Item Code' },
          { key: 'item_name', label: 'Item Name' },
          { key: 'qty', label: 'Quantity' },
          { key: 'uom', label: 'UOM' },
          { key: 'color_remarks', label: 'Color/Remarks' }
        ]
      : [
          { key: 'sr_no', label: 'Sr. No.' },
          { key: 'item_code', label: 'Item Code' },
          { key: 'description', label: 'Description' },
          { key: 'qty', label: 'Quantity' },
          { key: 'unit', label: 'Unit' },
          { key: 'rate', label: 'Rate', format: (v: any) => v ? `₹${v}` : 'N/A' },
          { key: 'total_price', label: 'Total Price', format: (v: any) => v ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A' }
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

      {/* Material Indent Slips Section */}
      {selectedType === 'all' || selectedType === 'material-indent' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-800">Material Indent Slips ({materialIndents.length})</h3>
          </div>
          {materialIndents.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                  <div className="col-span-1">Type</div>
                  <div className="col-span-2">Doc No</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">Department</div>
                  <div className="col-span-2">Person</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {materialIndents.map((form) => (
                  <div
                    key={form.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewForm(form)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-600" />
                        <span className="text-gray-800">Indent</span>
                      </div>
                      <div className="col-span-2 text-gray-700 font-medium">{form.docNo || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{formatDate(form.date || form.createdAt)}</div>
                      <div className="col-span-3 text-gray-600">{form.departmentName || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{form.personName || 'N/A'}</div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewForm(form);
                          }}
                          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center justify-center gap-2 text-sm inline-flex"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                  <div className="col-span-1">Type</div>
                  <div className="col-span-2">PO No</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">Final Amount</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {purchaseOrders.map((form) => (
                  <div
                    key={form.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewForm(form)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-800">PO</span>
                      </div>
                      <div className="col-span-2 text-gray-700 font-medium">{form.poNo || form.docNo || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{formatDate(form.date || form.createdAt)}</div>
                      <div className="col-span-3 text-gray-600">{form.finalAmt ? `₹${form.finalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}</div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewForm(form);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 text-sm inline-flex"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

