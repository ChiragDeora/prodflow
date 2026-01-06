'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, FileText, Truck, Eye, Download, Package, ArrowRightCircle } from 'lucide-react';
import { deliveryChallanAPI, misAPI, jobWorkChallanAPI, DeliveryChallan, DeliveryChallanItem, MIS, MISItem, JobWorkChallan, JobWorkChallanItem } from '../../../lib/supabase';
import HistoryDetailView from './HistoryDetailView';

interface DispatchForm {
  id: string;
  type: 'delivery-challan' | 'mis' | 'job-work-challan';
  srNo?: string;
  date: string;
  partyName?: string;
  to?: string;
  deptName?: string;
  createdAt: string;
  docNo?: string;
  [key: string]: any;
}

const DispatchHistory: React.FC = () => {
  const [forms, setForms] = useState<DispatchForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<DispatchForm[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'delivery-challan' | 'mis' | 'job-work-challan'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<DispatchForm | null>(null);
  const [detailedForm, setDetailedForm] = useState<DeliveryChallan | MIS | JobWorkChallan | null>(null);
  const [detailedItems, setDetailedItems] = useState<DeliveryChallanItem[] | MISItem[] | JobWorkChallanItem[]>([]);
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
    // Load forms from database
    const loadForms = async () => {
      try {
        // Fetch all outward forms (Dispatch Memo is now in Sales section)
        const [challans, misses, jobWorkChallans] = await Promise.all([
          deliveryChallanAPI.getAll(),
          misAPI.getAll(),
          jobWorkChallanAPI.getAll()
        ]);

        // Transform challans to unified format
        const challanForms: DispatchForm[] = challans.map(challan => ({
          id: challan.id,
          type: 'delivery-challan' as const,
          srNo: challan.dc_no || challan.sr_no,
          date: challan.date,
          to: challan.party_name || challan.address || challan.to_address,
          vehicleNo: challan.vehicle_no || undefined,
          state: challan.state || undefined,
          createdAt: challan.created_at || challan.date,
          docNo: challan.doc_no
        }));

        // Transform MIS to unified format
        const misForms: DispatchForm[] = misses.map(mis => ({
          id: mis.id,
          type: 'mis' as const,
          date: mis.date,
          deptName: mis.dept_name,
          createdAt: mis.created_at || mis.date,
          docNo: mis.doc_no
        }));

        // Transform Job Work Challans to unified format
        const jobWorkForms: DispatchForm[] = jobWorkChallans.map(challan => ({
          id: challan.id,
          type: 'job-work-challan' as const,
          date: challan.date,
          partyName: challan.party_name,
          gstNo: challan.gst_no || undefined,
          vehicleNo: challan.vehicle_no || undefined,
          createdAt: challan.created_at || challan.date,
          docNo: challan.doc_no
        }));

        // Combine and set forms
        setForms([...challanForms, ...misForms, ...jobWorkForms]);
      } catch (error) {
        console.error('Error loading dispatch forms:', error);
        alert('Error loading dispatch history. Please try again.');
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
          form.srNo?.toLowerCase().includes(term) ||
          form.partyName?.toLowerCase().includes(term) ||
          form.to?.toLowerCase().includes(term) ||
          form.docNo?.toLowerCase().includes(term) ||
          form.deptName?.toLowerCase().includes(term) ||
          form.gstNo?.toLowerCase().includes(term) ||
          form.vehicleNo?.toLowerCase().includes(term)
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

  const handleViewForm = async (form: DispatchForm) => {
    setSelectedForm(form);
    setLoadingDetails(true);
    setDetailedForm(null);
    setDetailedItems([]);
    
    try {
      if (form.type === 'delivery-challan') {
        const data = await deliveryChallanAPI.getById(form.id);
        if (data) {
          setDetailedForm(data.challan);
          setDetailedItems(data.items || []);
        }
      } else if (form.type === 'mis') {
        const data = await misAPI.getById(form.id);
        if (data) {
          setDetailedForm(data.mis);
          setDetailedItems(data.items || []);
        }
      } else if (form.type === 'job-work-challan') {
        const data = await jobWorkChallanAPI.getById(form.id);
        if (data) {
          setDetailedForm(data.challan);
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

  const getFormTitle = (form: DispatchForm) => {
    if (form.type === 'delivery-challan') {
      return `Delivery Challan - ${form.srNo || form.docNo || 'N/A'}`;
    } else if (form.type === 'mis') {
      return `MIS - ${form.docNo || 'N/A'}`;
    } else if (form.type === 'job-work-challan') {
      return `Job Work Challan - ${form.docNo || 'N/A'}`;
    }
    return 'Unknown Form';
  };

  // Group forms by type
  const deliveryChallans = filteredForms.filter(f => f.type === 'delivery-challan');
  const misForms = filteredForms.filter(f => f.type === 'mis');
  const jobWorkChallans = filteredForms.filter(f => f.type === 'job-work-challan');

  if (selectedForm) {
    // Prepare document info
    const documentInfo: Array<{ label: string; value: string | number | null | undefined }> = [
      { label: 'Document Number', value: detailedForm && 'doc_no' in detailedForm ? detailedForm.doc_no : selectedForm.docNo },
      { label: 'Date', value: formatDate(detailedForm && 'date' in detailedForm ? detailedForm.date : selectedForm.date || selectedForm.createdAt) }
    ];

    if (selectedForm.type === 'delivery-challan' && detailedForm) {
      const challan = detailedForm as DeliveryChallan;
      if (challan.sr_no) documentInfo.push({ label: 'Serial Number', value: challan.sr_no });
      if (challan.to_address) documentInfo.push({ label: 'To Address', value: challan.to_address });
      if (challan.vehicle_no) documentInfo.push({ label: 'Vehicle Number', value: challan.vehicle_no });
      if (challan.state) documentInfo.push({ label: 'State', value: challan.state });
    } else if (selectedForm.type === 'mis' && detailedForm) {
      const mis = detailedForm as MIS;
      if (mis.dept_name) documentInfo.push({ label: 'Department', value: mis.dept_name });
      if (mis.memo_no) documentInfo.push({ label: 'Memo Number', value: mis.memo_no });
    } else if (selectedForm.type === 'job-work-challan' && detailedForm) {
      const challan = detailedForm as JobWorkChallan;
      if (challan.party_name) documentInfo.push({ label: 'Party Name', value: challan.party_name });
      if (challan.gst_no) documentInfo.push({ label: 'GST Number', value: challan.gst_no });
      if (challan.vehicle_no) documentInfo.push({ label: 'Vehicle Number', value: challan.vehicle_no });
    }

    // Prepare item columns
    const itemColumns = selectedForm.type === 'delivery-challan'
      ? [
          { key: 'sr_no', label: 'Sr. No.' },
          { key: 'material_description', label: 'Material Description' },
          { key: 'qty', label: 'Quantity' },
          { key: 'uom', label: 'UOM' },
          { key: 'remarks', label: 'Remarks', format: (v: any) => v || '-' }
        ]
      : selectedForm.type === 'mis'
      ? [
          { key: 'sr_no', label: 'Sr. No.' },
          { key: 'item_name', label: 'Item Name' },
          { key: 'no_box', label: 'No. Box' },
          { key: 'remarks', label: 'Remarks', format: (v: any) => v || '-' }
        ]
      : [
          { key: 'sr_no', label: 'Sr. No.' },
          { key: 'material_description', label: 'Material Description' },
          { key: 'qty', label: 'Quantity' },
          { key: 'uom', label: 'UOM' },
          { key: 'remarks', label: 'Remarks', format: (v: any) => v || '-' }
        ];

    // Determine stock status and document type for stock posting
    const stockStatus = detailedForm && 'stock_status' in detailedForm 
      ? (detailedForm as any).stock_status 
      : undefined;
    
    // Only enable stock posting for job work challan (FG stock ledger)
    const documentType = selectedForm.type === 'job-work-challan' ? 'job-work-challan' : undefined;

    return (
      <HistoryDetailView
        title={getFormTitle(selectedForm)}
        date={selectedForm.date || selectedForm.createdAt}
        onClose={handleCloseView}
        documentInfo={documentInfo}
        items={detailedItems}
        itemColumns={itemColumns}
        loading={loadingDetails}
        documentId={selectedForm.id}
        documentType={documentType}
        stockStatus={stockStatus}
        onStockPost={() => {
          // Refresh the form details after posting
          handleViewForm(selectedForm);
        }}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dispatch History</h2>
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
              <option value="mis">MIS</option>
              <option value="job-work-challan">Job Work Challan</option>
              <option value="delivery-challan">Delivery Challan</option>
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
              placeholder="Search by memo/challan no, party..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredForms.length} form(s) {selectedDate ? `on ${formatDate(selectedDate)}` : selectedYear ? `in ${selectedYear}` : ''}
      </div>

      {/* MIS Section */}
      {selectedType === 'all' || selectedType === 'mis' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">MIS ({misForms.length})</h3>
          </div>
          {misForms.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                  <div className="col-span-1">Type</div>
                  <div className="col-span-2">Doc No</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-5">Department</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {misForms.map((form) => (
                  <div
                    key={form.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewForm(form)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-800">MIS</span>
                      </div>
                      <div className="col-span-2 text-gray-700 font-medium">{form.docNo || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{formatDate(form.date || form.createdAt)}</div>
                      <div className="col-span-5 text-gray-600">{form.deptName || 'N/A'}</div>
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
              No MIS found
            </div>
          )}
        </div>
      ) : null}

      {/* Job Work Challans Section */}
      {selectedType === 'all' || selectedType === 'job-work-challan' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightCircle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-800">Job Work Challans ({jobWorkChallans.length})</h3>
          </div>
          {jobWorkChallans.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                  <div className="col-span-1">Type</div>
                  <div className="col-span-2">Doc No</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">Party</div>
                  <div className="col-span-2">GST No</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {jobWorkChallans.map((form) => (
                  <div
                    key={form.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewForm(form)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 flex items-center gap-2">
                        <ArrowRightCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-gray-800">JW</span>
                      </div>
                      <div className="col-span-2 text-gray-700 font-medium">{form.docNo || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{formatDate(form.date || form.createdAt)}</div>
                      <div className="col-span-3 text-gray-600">{form.partyName || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{form.gstNo || 'N/A'}</div>
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
              No job work challans found
            </div>
          )}
        </div>
      ) : null}

      {/* Delivery Challans Section */}
      {selectedType === 'all' || selectedType === 'delivery-challan' ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Delivery Challans ({deliveryChallans.length})</h3>
          </div>
          {deliveryChallans.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                  <div className="col-span-1">Type</div>
                  <div className="col-span-2">Sr. No</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">To</div>
                  <div className="col-span-2">Vehicle No</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {deliveryChallans.map((form) => (
                  <div
                    key={form.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewForm(form)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-green-600" />
                        <span className="text-gray-800">DC</span>
                      </div>
                      <div className="col-span-2 text-gray-700 font-medium">{form.srNo || form.docNo || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{formatDate(form.date || form.createdAt)}</div>
                      <div className="col-span-3 text-gray-600">{form.to || 'N/A'}</div>
                      <div className="col-span-2 text-gray-600">{form.vehicleNo || 'N/A'}</div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewForm(form);
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm inline-flex"
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
              No delivery challans found
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

export default DispatchHistory;

