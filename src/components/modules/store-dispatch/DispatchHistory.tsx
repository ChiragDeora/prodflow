'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, FileText, Truck, Eye, Download, Package, ArrowRightCircle } from 'lucide-react';
import { deliveryChallanAPI, misAPI, jobWorkChallanAPI } from '../../../lib/supabase';

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

  const handleViewForm = (form: DispatchForm) => {
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {misForms.map((form) => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobWorkChallans.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ArrowRightCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-gray-800">Job Work Challan</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">Doc No:</span> {form.docNo || 'N/A'}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(form.date || form.createdAt)}</div>
                    <div><span className="font-medium">Party:</span> {form.partyName || 'N/A'}</div>
                    <div><span className="font-medium">GST No:</span> {form.gstNo || 'N/A'}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveryChallans.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewForm(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-800">Delivery Challan</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><span className="font-medium">Sr. No:</span> {form.srNo || form.docNo || 'N/A'}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(form.date || form.createdAt)}</div>
                    <div><span className="font-medium">To:</span> {form.to || 'N/A'}</div>
                    <div><span className="font-medium">Vehicle No:</span> {form.vehicleNo || 'N/A'}</div>
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

