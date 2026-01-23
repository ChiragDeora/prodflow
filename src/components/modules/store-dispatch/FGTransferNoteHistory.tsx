'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, FileText, Eye, Package, ArrowRightCircle, X } from 'lucide-react';
import { getAllFGTransferNotes, getFGTransferNoteById, FGTransferNote, FGTransferNoteItem } from '../../../lib/production/fg-transfer-note';
import HistoryDetailView from './HistoryDetailView';

interface FGTransferNoteForm {
  id: string;
  docNo: string;
  date: string;
  fromDept: string;
  toDept: string;
  createdAt: string;
  stockStatus: string;
  [key: string]: any;
}

const FGTransferNoteHistory: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [forms, setForms] = useState<FGTransferNoteForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<FGTransferNoteForm[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<FGTransferNoteForm | null>(null);
  const [detailedForm, setDetailedForm] = useState<FGTransferNote | null>(null);
  const [detailedItems, setDetailedItems] = useState<FGTransferNoteItem[]>([]);
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
        const notes = await getAllFGTransferNotes();
        
        const transformedForms: FGTransferNoteForm[] = (notes || [])
          .map(note => ({
            id: note.id,
            docNo: note.doc_no,
            date: note.date,
            fromDept: note.from_dept || '',
            toDept: note.to_dept || '',
            stockStatus: note.stock_status || 'DRAFT',
            createdAt: note.created_at || note.date
          }));

        setForms(transformedForms);
      } catch (error) {
        console.error('Error loading FG Transfer Notes:', error);
      }
    };

    loadForms();
  }, []);

  useEffect(() => {
    // Filter forms based on year, date, and search term
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

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(form => {
        return (
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
  }, [forms, selectedYear, selectedDate, searchTerm]);

  const handleViewForm = async (form: FGTransferNoteForm) => {
    setSelectedForm(form);
    setLoadingDetails(true);
    setDetailedForm(null);
    setDetailedItems([]);
    
    try {
      const data = await getFGTransferNoteById(form.id);
      if (data) {
        setDetailedForm(data.note);
        setDetailedItems(data.items || []);
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

  if (selectedForm) {
    // Prepare document info
    const documentInfo: Array<{ label: string; value: string | number | null | undefined }> = [
      { label: 'Document Number', value: detailedForm?.doc_no || selectedForm.docNo },
      { label: 'Date', value: formatDate(detailedForm?.date || selectedForm.date || selectedForm.createdAt) },
      { label: 'From Dept', value: detailedForm?.from_dept || selectedForm.fromDept },
      { label: 'To Dept', value: detailedForm?.to_dept || selectedForm.toDept },
      { label: 'Transfer Date/Time', value: detailedForm?.transfer_date_time || 'N/A' },
      { label: 'Shift Incharge', value: detailedForm?.shift_incharge || 'N/A' },
      { label: 'QC Inspector', value: detailedForm?.qc_inspector || 'N/A' },
      { label: 'FG Received By', value: detailedForm?.fg_received_by || 'N/A' },
      { label: 'Stock Status', value: detailedForm?.stock_status || selectedForm.stockStatus }
    ];

    // Prepare item columns
    const itemColumns = [
      { key: 'sl_no', label: 'SL. NO.' },
      { key: 'fg_code', label: 'FG CODE' },
      { key: 'item_name', label: 'ITEM NAME' },
      { key: 'party', label: 'PARTY' },
      { key: 'color', label: 'COLOR' },
      { key: 'qty_boxes', label: 'QTY (BOXES)' },
      { key: 'total_qty_pcs', label: 'TOTAL QTY (PCS)' },
      { key: 'total_qty_kg', label: 'TOTAL QTY (KG)' },
      { key: 'qc_check', label: 'QC' },
      { key: 'remarks', label: 'REMARKS' }
    ];

    return (
      <HistoryDetailView
        title={`FG Transfer Note - ${selectedForm.docNo || 'N/A'}`}
        date={detailedForm?.date || selectedForm.date || selectedForm.createdAt}
        onClose={handleCloseView}
        documentInfo={documentInfo}
        items={detailedItems}
        itemColumns={itemColumns}
        loading={loadingDetails}
        documentId={selectedForm.id}
        documentType="fg-transfer-note"
        stockStatus={detailedForm?.stock_status || selectedForm.stockStatus}
        onStockPost={() => {
          // Refresh the form list after posting
          handleCloseView();
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">FG Transfer Note History</h2>
          <p className="text-sm text-gray-500 mt-1">View past FG Transfer Notes</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Back to Form
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Search className="w-4 h-4 inline mr-1" />
            Search
          </label>
          <input
            type="text"
            placeholder="Search by doc no, from dept, to dept..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Results */}
      {filteredForms.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Doc No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">From Dept</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">To Dept</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredForms.map((form) => (
                  <tr
                    key={form.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewForm(form)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">{form.docNo}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(form.date || form.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{form.fromDept || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{form.toDept || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        form.stockStatus === 'POSTED' 
                          ? 'bg-green-100 text-green-800' 
                          : form.stockStatus === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {form.stockStatus || 'DRAFT'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No FG Transfer Notes found</p>
        </div>
      )}
    </div>
  );
};

export default FGTransferNoteHistory;
