'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, FileText, Eye, BookOpen } from 'lucide-react';
import { dispatchMemoAPI, orderBookAPI, DispatchMemo, OrderBook, DispatchMemoItem, OrderBookItem } from '../../../lib/supabase';
import HistoryDetailView from './HistoryDetailView';

interface SalesForm {
  id: string;
  type: 'dispatch-memo' | 'order-book';
  docNo?: string;
  date: string;
  partyName?: string;
  poNo?: string;
  createdAt: string;
  [key: string]: any;
}

const SalesHistory: React.FC = () => {
  const [forms, setForms] = useState<SalesForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<SalesForm[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'dispatch-memo' | 'order-book'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<SalesForm | null>(null);
  const [detailedForm, setDetailedForm] = useState<DispatchMemo | OrderBook | null>(null);
  const [detailedItems, setDetailedItems] = useState<DispatchMemoItem[] | OrderBookItem[]>([]);
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
        // Fetch all sales-related forms
        const [dispatchMemos, orderBooks] = await Promise.all([
          dispatchMemoAPI.getAll().catch(err => {
            console.warn('Error fetching dispatch memos:', err);
            return [];
          }),
          orderBookAPI.getAll().catch(err => {
            console.warn('Error fetching order books:', err);
            return [];
          })
        ]);

        // Transform dispatch memos
        const memoForms: SalesForm[] = (dispatchMemos || []).map(memo => ({
          id: memo.id,
          type: 'dispatch-memo' as const,
          docNo: memo.memo_no || memo.doc_no || '',
          date: memo.date,
          partyName: memo.party_name || '',
          createdAt: memo.created_at || memo.date
        }));

        // Transform order books
        const orderForms: SalesForm[] = (orderBooks || []).map(order => ({
          id: order.id,
          type: 'order-book' as const,
          docNo: order.order_no || order.doc_no || '',
          date: order.order_date || order.date || order.created_at,
          poNo: order.po_no || '',
          partyName: order.customer_name || order.party_name || '',
          createdAt: order.created_at || order.order_date || order.date
        }));

        const allForms = [...memoForms, ...orderForms];
        setForms(allForms);
        
        if (allForms.length === 0) {
          console.log('No sales records found in database');
        }
      } catch (error) {
        console.error('Error loading sales forms:', error);
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
          form.partyName?.toLowerCase().includes(term) ||
          form.docNo?.toLowerCase().includes(term) ||
          form.poNo?.toLowerCase().includes(term)
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

  const handleViewForm = async (form: SalesForm) => {
    setSelectedForm(form);
    setLoadingDetails(true);
    setDetailedForm(null);
    setDetailedItems([]);
    
    try {
      if (form.type === 'dispatch-memo') {
        const data = await dispatchMemoAPI.getById(form.id);
        if (data) {
          setDetailedForm(data.memo);
          setDetailedItems(data.items || []);
        }
      } else if (form.type === 'order-book') {
        const data = await orderBookAPI.getById(form.id);
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

  const getFormTitle = (form: SalesForm) => {
    switch (form.type) {
      case 'dispatch-memo':
        return `Dispatch Memo - ${form.docNo || 'N/A'}`;
      case 'order-book':
        return `Order Book - ${form.docNo || 'N/A'}`;
      default:
        return 'Sales Form';
    }
  };

  // Group forms by type
  const dispatchMemos = filteredForms.filter(f => f.type === 'dispatch-memo');
  const orderBooks = filteredForms.filter(f => f.type === 'order-book');

  if (selectedForm) {
    // Prepare document info
    const documentInfo: Array<{ label: string; value: string | number | null | undefined }> = [
      { label: 'Document Number', value: detailedForm && 'doc_no' in detailedForm ? detailedForm.doc_no : (detailedForm && 'memo_no' in detailedForm ? detailedForm.memo_no : (detailedForm && 'order_no' in detailedForm ? detailedForm.order_no : selectedForm.docNo)) },
      { label: 'Date', value: formatDate(detailedForm && 'date' in detailedForm ? detailedForm.date : (detailedForm && 'order_date' in detailedForm ? detailedForm.order_date : selectedForm.date || selectedForm.createdAt)) }
    ];

    if (selectedForm.type === 'dispatch-memo' && detailedForm) {
      const memo = detailedForm as DispatchMemo;
      if (memo.party_name) documentInfo.push({ label: 'Party Name', value: memo.party_name });
      if (memo.memo_no) documentInfo.push({ label: 'Memo Number', value: memo.memo_no });
    } else if (selectedForm.type === 'order-book' && detailedForm) {
      const order = detailedForm as OrderBook;
      if (order.po_no) documentInfo.push({ label: 'PO Number', value: order.po_no });
      if (order.customer_name || order.party_name) documentInfo.push({ label: 'Customer', value: order.customer_name || order.party_name });
      if (order.order_date) documentInfo.push({ label: 'Order Date', value: formatDate(order.order_date) });
    }

    // Prepare item columns
    const itemColumns = selectedForm.type === 'dispatch-memo'
      ? [
          { key: 'sr_no', label: 'Sr. No.' },
          { key: 'material_description', label: 'Material Description' },
          { key: 'qty', label: 'Quantity' },
          { key: 'uom', label: 'UOM' },
          { key: 'remarks', label: 'Remarks', format: (v: any) => v || '-' }
        ]
      : [
          { key: 'sr_no', label: 'Sr. No.' },
          { key: 'part_code', label: 'Part Code' },
          { key: 'part_name', label: 'Part Name' },
          { key: 'qty', label: 'Quantity' },
          { key: 'delivery_date', label: 'Delivery Date', format: (v: any) => v ? formatDate(v) : 'N/A' },
          { key: 'remarks', label: 'Remarks', format: (v: any) => v || '-' }
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
        <h2 className="text-2xl font-bold text-gray-800">Sales History</h2>
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
              <option value="dispatch-memo">Dispatch Memo</option>
              <option value="order-book">Order Book</option>
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
              placeholder="Search by name, doc no, PO no..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredForms.length} form(s) {selectedDate ? `on ${formatDate(selectedDate)}` : selectedYear ? `in ${selectedYear}` : ''}
      </div>

      {/* Dispatch Memos Section */}
      {selectedType === 'all' || selectedType === 'dispatch-memo' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Dispatch Memos ({dispatchMemos.length})</h3>
          </div>
          {dispatchMemos.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                  <div className="col-span-1">Type</div>
                  <div className="col-span-2">Doc No</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-5">Party Name</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {dispatchMemos.map((form) => (
                  <div
                    key={form.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewForm(form)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-800">Memo</span>
                      </div>
                      <div className="col-span-2 text-gray-700 font-medium">{form.docNo || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{formatDate(form.date || form.createdAt)}</div>
                      <div className="col-span-5 text-gray-600">{form.partyName || 'N/A'}</div>
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
              No dispatch memos found
            </div>
          )}
        </div>
      ) : null}

      {/* Order Books Section */}
      {selectedType === 'all' || selectedType === 'order-book' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Order Books ({orderBooks.length})</h3>
          </div>
          {orderBooks.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                  <div className="col-span-1">Type</div>
                  <div className="col-span-2">Order No</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">PO No</div>
                  <div className="col-span-3">Customer</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {orderBooks.map((form) => (
                  <div
                    key={form.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewForm(form)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-800">Order</span>
                      </div>
                      <div className="col-span-2 text-gray-700 font-medium">{form.docNo || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{formatDate(form.date || form.createdAt)}</div>
                      <div className="col-span-2 text-gray-600">{form.poNo || 'N/A'}</div>
                      <div className="col-span-3 text-gray-600">{form.partyName || 'N/A'}</div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewForm(form);
                          }}
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2 text-sm inline-flex"
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
              No order books found
            </div>
          )}
        </div>
      ) : null}

      {/* No Results */}
      {filteredForms.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No forms found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;

