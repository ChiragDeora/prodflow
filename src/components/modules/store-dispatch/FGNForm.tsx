'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Printer, Upload, CheckCircle, Loader2, X, Search, Package } from 'lucide-react';
import PrintHeader from '../../shared/PrintHeader';

// Types
interface BOMData {
  id: string;
  item_code: string;
  item_name?: string;
  party_name?: string;
  pack_size: string;
  sfg_1?: string;
  sfg_1_qty?: number;
  sfg_2?: string;
  sfg_2_qty?: number;
  cnt_code?: string;
  cnt_qty?: number;
  polybag_code?: string;
  poly_qty?: number;
  bopp_1?: string;
  qty_meter?: number;
  bopp_2?: string;
  qty_meter_2?: number;
  category: 'FG' | 'LOCAL';
  sfg1_int_wt?: number;
  sfg2_int_wt?: number;
}

interface FGNItem {
  id: string;
  fg_code: string;
  bom_type: 'FG' | 'LOCAL';
  item_name: string;
  party: string;
  color: string;
  qty_boxes: number;
  pack_size: number;
  total_qty_pcs: number;
  total_qty_ton: number;
  sfg1_code: string;
  sfg1_qty: number;
  sfg1_int_wt: number;
  sfg1_deduct: number;
  sfg2_code: string;
  sfg2_qty: number;
  sfg2_int_wt: number;
  sfg2_deduct: number;
  cnt_code: string;
  cnt_qty: number;
  cnt_deduct: number;
  polybag_code: string;
  polybag_qty: number;
  polybag_deduct: number;
  bopp1_code: string;
  bopp1_qty: number;
  bopp1_deduct: number;
  bopp2_code: string;
  bopp2_qty: number;
  bopp2_deduct: number;
  qc_check: boolean;
  remarks: string;
}

interface FGNFormData {
  fromDept: string;
  toDept: string;
  transferDateTime: string;
  shiftIncharge: string;
  qcInspector: string;
  fgReceivedBy: string;
  items: FGNItem[];
}

interface Color {
  id: string;
  color_label: string;
}

interface Party {
  id: string;
  name: string;
}

const createEmptyItem = (): FGNItem => ({
  id: Date.now().toString(),
  fg_code: '',
  bom_type: 'FG',
  item_name: '',
  party: '',
  color: '',
  qty_boxes: 0,
  pack_size: 0,
  total_qty_pcs: 0,
  total_qty_ton: 0,
  sfg1_code: '',
  sfg1_qty: 0,
  sfg1_int_wt: 0,
  sfg1_deduct: 0,
  sfg2_code: '',
  sfg2_qty: 0,
  sfg2_int_wt: 0,
  sfg2_deduct: 0,
  cnt_code: '',
  cnt_qty: 0,
  cnt_deduct: 0,
  polybag_code: '',
  polybag_qty: 0,
  polybag_deduct: 0,
  bopp1_code: '',
  bopp1_qty: 0,
  bopp1_deduct: 0,
  bopp2_code: '',
  bopp2_qty: 0,
  bopp2_deduct: 0,
  qc_check: false,
  remarks: ''
});

const FGNForm: React.FC = () => {
  const [formData, setFormData] = useState<FGNFormData>({
    fromDept: '',
    toDept: '',
    transferDateTime: '',
    shiftIncharge: '',
    qcInspector: '',
    fgReceivedBy: '',
    items: [createEmptyItem()]
  });

  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal state
  const [showFGModal, setShowFGModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [bomData, setBomData] = useState<BOMData[]>([]);
  const [filteredBomData, setFilteredBomData] = useState<BOMData[]>([]);
  const [bomSearch, setBomSearch] = useState('');
  const [bomTypeFilter, setBomTypeFilter] = useState<'ALL' | 'FG' | 'LOCAL'>('ALL');
  const [partyFilter, setPartyFilter] = useState('');
  
  // Dropdown data
  const [colors, setColors] = useState<Color[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  
  // Stock posting state
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<'NOT_SAVED' | 'SAVED' | 'POSTING' | 'POSTED' | 'ERROR'>('NOT_SAVED');
  const [stockMessage, setStockMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate document number (only for new documents, not for saved ones)
  useEffect(() => {
    // Don't regenerate if document is already saved
    if (savedDocumentId) {
      return;
    }
    
    const generateDocNo = async () => {
      try {
        // Use formCodeUtils for consistent document numbering
        const { generateDocumentNumber, FORM_CODES } = await import('../../../utils/formCodeUtils');
        const docNo = await generateDocumentNumber(FORM_CODES.FG_TRANSFER_NOTE, date);
        setDocNo(docNo);
      } catch (error) {
        console.error('Error generating document number:', error);
      }
    };
    generateDocNo();
  }, [date, savedDocumentId]);

  // Fetch BOM data
  useEffect(() => {
    const fetchBomData = async () => {
      try {
        const response = await fetch('/api/production/fg-transfer-note/bom-data');
        const result = await response.json();
        if (result.success) {
          setBomData(result.data);
          setFilteredBomData(result.data);
        }
      } catch (error) {
        console.error('Error fetching BOM data:', error);
      }
    };
    fetchBomData();
  }, []);

  // Fetch colors
  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await fetch('/api/production/fg-transfer-note/colors');
        const result = await response.json();
        if (result.success) {
          setColors(result.data);
        }
      } catch (error) {
        console.error('Error fetching colors:', error);
      }
    };
    fetchColors();
  }, []);

  // Fetch parties
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const response = await fetch('/api/production/fg-transfer-note/parties');
        const result = await response.json();
        if (result.success) {
          setParties(result.data);
        }
      } catch (error) {
        console.error('Error fetching parties:', error);
      }
    };
    fetchParties();
  }, []);

  // Filter BOM data
  useEffect(() => {
    let filtered = bomData;
    
    if (bomSearch) {
      const search = bomSearch.toLowerCase();
      filtered = filtered.filter(
        b => b.item_code.toLowerCase().includes(search) || 
             (b.item_name || '').toLowerCase().includes(search) ||
             (b.party_name || '').toLowerCase().includes(search)
      );
    }
    
    if (bomTypeFilter !== 'ALL') {
      filtered = filtered.filter(b => b.category === bomTypeFilter);
    }
    
    if (partyFilter) {
      filtered = filtered.filter(b => b.party_name === partyFilter);
    }
    
    setFilteredBomData(filtered);
  }, [bomData, bomSearch, bomTypeFilter, partyFilter]);

  const handleInputChange = (field: keyof Omit<FGNFormData, 'items'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateDeductions = useCallback((item: FGNItem): FGNItem => {
    const qtyBoxes = item.qty_boxes || 0;
    return {
      ...item,
      total_qty_pcs: item.pack_size * qtyBoxes,
      total_qty_ton: ((item.sfg1_qty * item.sfg1_int_wt) + (item.sfg2_qty * item.sfg2_int_wt)) * qtyBoxes / 1000000,
      sfg1_deduct: item.sfg1_qty * qtyBoxes,
      sfg2_deduct: item.sfg2_qty * qtyBoxes,
      cnt_deduct: item.cnt_qty * qtyBoxes,
      polybag_deduct: item.polybag_qty * qtyBoxes,
      bopp1_deduct: item.bopp1_qty * qtyBoxes,
      bopp2_deduct: item.bopp2_qty * qtyBoxes
    };
  }, []);

  const handleItemChange = useCallback((index: number, field: keyof FGNItem, value: string | number | boolean) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const updatedItem = { ...newItems[index], [field]: value };
      
      // Recalculate if qty_boxes changed
      if (field === 'qty_boxes') {
        const calculated = calculateDeductions(updatedItem);
        newItems[index] = calculated;
      } else {
        newItems[index] = updatedItem;
      }
      
      return { ...prev, items: newItems };
    });
  }, [calculateDeductions]);

  const openFGModal = (index: number) => {
    setSelectedItemIndex(index);
    setShowFGModal(true);
    setBomSearch('');
    setBomTypeFilter('ALL');
    setPartyFilter('');
  };

  const selectFGCode = (bom: BOMData) => {
    if (selectedItemIndex === null) return;
    
    setFormData(prev => {
      const newItems = [...prev.items];
      const packSize = parseInt(bom.pack_size) || 0;
      
      let updatedItem: FGNItem = {
        ...newItems[selectedItemIndex],
        fg_code: bom.item_code,
        bom_type: bom.category,
        item_name: bom.item_name || '',
        party: bom.party_name || '',
        pack_size: packSize,
        sfg1_code: bom.sfg_1 || '',
        sfg1_qty: bom.sfg_1_qty || 0,
        sfg1_int_wt: bom.sfg1_int_wt || 0,
        sfg2_code: bom.sfg_2 || '',
        sfg2_qty: bom.sfg_2_qty || 0,
        sfg2_int_wt: bom.sfg2_int_wt || 0,
        cnt_code: bom.cnt_code || '',
        cnt_qty: bom.cnt_qty || 0,
        polybag_code: bom.polybag_code || '',
        polybag_qty: bom.poly_qty || 0,
        bopp1_code: bom.bopp_1 || '',
        bopp1_qty: bom.qty_meter || 0,
        bopp2_code: bom.bopp_2 || '',
        bopp2_qty: bom.qty_meter_2 || 0
      };
      
      // Recalculate deductions
      updatedItem = calculateDeductions(updatedItem);
      newItems[selectedItemIndex] = updatedItem;
      
      return { ...prev, items: newItems };
    });
    
    setShowFGModal(false);
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, createEmptyItem()]
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate items
      const validItems = formData.items.filter(item => item.fg_code && item.qty_boxes > 0);
      
      if (validItems.length === 0) {
        alert('Please add at least one item with FG Code and Qty Boxes');
        setIsLoading(false);
        return;
      }

      const payload = {
        doc_no: docNo,
        date: date,
        from_dept: formData.fromDept,
        to_dept: formData.toDept,
        transfer_date_time: formData.transferDateTime || null,
        shift_incharge: formData.shiftIncharge || null,
        qc_inspector: formData.qcInspector || null,
        fg_received_by: formData.fgReceivedBy || null,
        items: validItems.map(item => ({
          fg_code: item.fg_code,
          bom_type: item.bom_type,
          item_name: item.item_name,
          party: item.party,
          color: item.color,
          qty_boxes: item.qty_boxes,
          pack_size: item.pack_size,
          total_qty_pcs: item.total_qty_pcs,
          total_qty_ton: item.total_qty_ton,
          sfg1_code: item.sfg1_code || null,
          sfg1_qty: item.sfg1_qty || null,
          sfg1_deduct: item.sfg1_deduct || null,
          sfg1_int_wt: item.sfg1_int_wt || null,
          sfg2_code: item.sfg2_code || null,
          sfg2_qty: item.sfg2_qty || null,
          sfg2_deduct: item.sfg2_deduct || null,
          sfg2_int_wt: item.sfg2_int_wt || null,
          cnt_code: item.cnt_code || null,
          cnt_qty: item.cnt_qty || null,
          cnt_deduct: item.cnt_deduct || null,
          polybag_code: item.polybag_code || null,
          polybag_qty: item.polybag_qty || null,
          polybag_deduct: item.polybag_deduct || null,
          bopp1_code: item.bopp1_code || null,
          bopp1_qty: item.bopp1_qty || null,
          bopp1_deduct: item.bopp1_deduct || null,
          bopp2_code: item.bopp2_code || null,
          bopp2_qty: item.bopp2_qty || null,
          bopp2_deduct: item.bopp2_deduct || null,
          qc_check: item.qc_check,
          remarks: item.remarks || null
        }))
      };

      const response = await fetch('/api/production/fg-transfer-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        setSavedDocumentId(result.data.id);
        // Keep the existing doc_no (don't regenerate)
        setDocNo(result.data.doc_no);
        setStockStatus('SAVED');
        setStockMessage('');
        alert('FG Transfer Note saved successfully! Click "Post to Stock" to update inventory.');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving FG Transfer Note:', error);
      alert('Error saving FG Transfer Note. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostToStock = async () => {
    if (!savedDocumentId) {
      alert('Please save the document first before posting to stock.');
      return;
    }
    
    // Validate all items have color selected
    const itemsWithoutColor = formData.items.filter(item => item.fg_code && !item.color);
    if (itemsWithoutColor.length > 0) {
      alert('Please select a color for all items before posting to stock.');
      return;
    }
    
    setStockStatus('POSTING');
    setStockMessage('');
    
    try {
      const response = await fetch(`/api/production/fg-transfer-note/${savedDocumentId}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posted_by: 'user' })
      });

      const result = await response.json();

      if (result.success) {
        setStockStatus('POSTED');
        setStockMessage(`Stock posted successfully! (${result.entries_created || 0} entries created)`);
        alert(result.message);
      } else {
        setStockStatus('ERROR');
        if (result.error?.code === 'INSUFFICIENT_STOCK') {
          const details = result.error.details || [];
          const errorMsg = details.map((d: { item_code: string; shortage: number; location: string }) => 
            `${d.item_code}: shortage of ${d.shortage} in ${d.location}`
          ).join('\n');
          setStockMessage(`Insufficient stock:\n${errorMsg}`);
          alert(`Insufficient stock for components:\n${errorMsg}`);
        } else {
          setStockMessage(result.error?.message || 'Failed to post to stock');
          alert(`Error: ${result.error?.message}`);
        }
      }
    } catch (error) {
      console.error('Error posting to stock:', error);
      setStockStatus('ERROR');
      setStockMessage('Error posting to stock. Please try again.');
      alert('Error posting to stock. Please try again.');
    }
  };

  const handleNewForm = () => {
    setFormData({
      fromDept: '',
      toDept: '',
      transferDateTime: '',
      shiftIncharge: '',
      qcInspector: '',
      fgReceivedBy: '',
      items: [createEmptyItem()]
    });
    setDate(new Date().toISOString().split('T')[0]);
    setSavedDocumentId(null); // Reset saved document ID so new doc number is generated
    setDocNo(''); // Clear doc number so it regenerates
    setStockStatus('NOT_SAVED');
    setStockMessage('');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Get unique party names from BOM data for filter dropdown
  const uniqueParties = [...new Set(bomData.map(b => b.party_name).filter(Boolean))];

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-7xl mx-auto print:shadow-none print:rounded-none print:p-0 print:max-w-none">
      <PrintHeader docNo={docNo} date={date} />
      
      <form onSubmit={handleSubmit} className="print:p-8">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          <div className="flex items-center gap-4">
            {/* Logo removed as per requirements */}
          </div>
          <div className="text-right text-sm space-y-1">
            <div>
              <span className="font-semibold">Doc. No. :</span>{' '}
              <input
                type="text"
                value={docNo}
                readOnly
                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48 print:hidden"
              />
              <span className="hidden print:inline">{docNo}</span>
            </div>
            <div>
              <span className="font-semibold">Date :</span>{' '}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:hidden"
                required
              />
              <span className="hidden print:inline">{formatDateForDisplay(date)}</span>
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-6 print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900 print:text-2xl print:font-bold">FINISHED GOODS TRANSFER NOTE</h2>
        </div>

        {/* Transfer Information Fields */}
        <div className="grid grid-cols-3 gap-4 mb-6 print:mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Dept.</label>
            <input
              type="text"
              value={formData.fromDept}
              onChange={(e) => handleInputChange('fromDept', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Dept.</label>
            <input
              type="text"
              value={formData.toDept}
              onChange={(e) => handleInputChange('toDept', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date / Time</label>
            <input
              type="datetime-local"
              value={formData.transferDateTime}
              onChange={(e) => handleInputChange('transferDateTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 print:mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-center font-semibold w-10">SL</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold min-w-[140px]">FG Code</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold min-w-[100px]">Party</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold min-w-[100px]">Color</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-semibold w-20">Qty (boxes)</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-semibold w-28">Total Qty (pcs)</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-semibold w-24">Total Qty (ton)</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-semibold w-16">QC</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Remarks</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-semibold w-14 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-2 py-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-2 py-2">
                    <button
                      type="button"
                      onClick={() => openFGModal(index)}
                      className="w-full text-left px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 text-sm print:border-none print:p-0"
                    >
                      {item.fg_code || <span className="text-gray-400">Select FG...</span>}
                    </button>
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <select
                      value={item.party}
                      onChange={(e) => handleItemChange(index, 'party', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm print:border-none print:p-0"
                    >
                      <option value="">Select Party</option>
                      {parties.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <select
                      value={item.color}
                      onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm print:border-none print:p-0"
                    >
                      <option value="">Select Color</option>
                      {colors.map(c => (
                        <option key={c.id} value={c.color_label}>{c.color_label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.qty_boxes || ''}
                      onChange={(e) => handleItemChange(index, 'qty_boxes', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-center text-sm print:border-none print:p-0"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center bg-gray-50">
                    {item.total_qty_pcs.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center bg-gray-50">
                    {item.total_qty_ton.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.qc_check}
                      onChange={(e) => handleItemChange(index, 'qc_check', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded text-sm"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center print:hidden">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={addItemRow}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 print:hidden"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>

        {/* Footer Section */}
        <div className="grid grid-cols-3 gap-6 mt-8 print:mt-6 border-t border-gray-300 pt-4 print:pt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Incharge Name & Sign</label>
            <input
              type="text"
              value={formData.shiftIncharge}
              onChange={(e) => handleInputChange('shiftIncharge', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-8 print:mt-6 h-12 print:h-10 border-b border-gray-300"></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QC Inspector Name & Sign</label>
            <input
              type="text"
              value={formData.qcInspector}
              onChange={(e) => handleInputChange('qcInspector', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-8 print:mt-6 h-12 print:h-10 border-b border-gray-300"></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">FG Received Name & Sign</label>
            <input
              type="text"
              value={formData.fgReceivedBy}
              onChange={(e) => handleInputChange('fgReceivedBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-8 print:mt-6 h-12 print:h-10 border-b border-gray-300"></div>
          </div>
        </div>

        {/* Stock Status Message */}
        {stockMessage && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 print:hidden ${
            stockStatus === 'POSTED' ? 'bg-green-50 text-green-800 border border-green-200' :
            stockStatus === 'ERROR' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {stockStatus === 'POSTED' && <CheckCircle className="w-5 h-5" />}
            <span className="text-sm whitespace-pre-line">{stockMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6 print:hidden">
          {savedDocumentId && (
            <button
              type="button"
              onClick={handleNewForm}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              New Form
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            type="submit"
            disabled={stockStatus === 'POSTED' || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          <button
            type="button"
            onClick={handlePostToStock}
            disabled={!savedDocumentId || stockStatus === 'POSTING' || stockStatus === 'POSTED'}
            className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
              stockStatus === 'POSTED' 
                ? 'bg-green-600 text-white cursor-not-allowed'
                : !savedDocumentId
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {stockStatus === 'POSTING' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : stockStatus === 'POSTED' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {stockStatus === 'POSTED' ? 'Posted' : stockStatus === 'POSTING' ? 'Posting...' : 'Post to Stock'}
          </button>
        </div>
      </form>

      {/* FG Code Selection Modal */}
      {showFGModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Select Finished Good</h3>
              </div>
              <button
                onClick={() => setShowFGModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="px-6 py-4 border-b border-gray-200 space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by FG Code or Item Name..."
                    value={bomSearch}
                    onChange={(e) => setBomSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={bomTypeFilter}
                  onChange={(e) => setBomTypeFilter(e.target.value as 'ALL' | 'FG' | 'LOCAL')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ALL">All Types</option>
                  <option value="FG">FG Only</option>
                  <option value="LOCAL">LOCAL Only</option>
                </select>
                <select
                  value={partyFilter}
                  onChange={(e) => setPartyFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Parties</option>
                  {uniqueParties.map(party => (
                    <option key={party} value={party}>{party}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-500">
                Showing {filteredBomData.length} of {bomData.length} items
              </div>
            </div>

            {/* Modal Table */}
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">FG Code</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Item Name</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Party</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Pack Size</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">SFG-1</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">SFG-2</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBomData.map((bom) => (
                    <tr
                      key={bom.id}
                      onClick={() => selectFGCode(bom)}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <td className="border-b border-gray-100 px-4 py-3 font-medium text-blue-600">{bom.item_code}</td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-700">{bom.item_name || '-'}</td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">{bom.party_name || '-'}</td>
                      <td className="border-b border-gray-100 px-4 py-3 text-center text-gray-600">{bom.pack_size}</td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">{bom.sfg_1 || '-'}</td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">{bom.sfg_2 || '-'}</td>
                      <td className="border-b border-gray-100 px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bom.category === 'FG' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {bom.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredBomData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No matching FG codes found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowFGModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FGNForm;

