'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, Search, Link, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { jwAnnexureGRNAPI, materialIndentSlipAPI, MaterialIndentSlip, MaterialIndentSlipItem } from '../../../lib/supabase';
import PrintHeader from '../../shared/PrintHeader';
import { generateDocumentNumber, FORM_CODES } from '../../../utils/formCodeUtils';

interface JWAnnexureGRNItem {
  id: string;
  itemCode: string;
  itemName: string;
  indentQty: string;
  rcdQty: string;
  rate: string;
  netValue: string;
}

interface JWAnnexureGRNFormData {
  jwNo: string;
  jwDate: string;
  indentNo: string;
  indentDate: string;
  challanNo: string;
  challanDate: string;
  partyName: string;
  address: string;
  state: string;
  gstNo: string;
  totalValue: string;
  items: JWAnnexureGRNItem[];
}

const JWAnnexureGRNForm: React.FC = () => {
  const [formData, setFormData] = useState<JWAnnexureGRNFormData>({
    jwNo: '',
    jwDate: new Date().toISOString().split('T')[0],
    indentNo: '',
    indentDate: '',
    challanNo: '',
    challanDate: '',
    partyName: '',
    address: '',
    state: '',
    gstNo: '',
    totalValue: '',
    items: [
      { id: '1', itemCode: '', itemName: '', indentQty: '', rcdQty: '', rate: '', netValue: '' }
    ]
  });

  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [indentSlips, setIndentSlips] = useState<MaterialIndentSlip[]>([]);
  const [selectedIndentSlip, setSelectedIndentSlip] = useState<MaterialIndentSlip | null>(null);
  const [indentItems, setIndentItems] = useState<MaterialIndentSlipItem[]>([]);
  const [showIndentSearch, setShowIndentSearch] = useState(false);
  const [indentSearchTerm, setIndentSearchTerm] = useState('');
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  
  // Stock posting state
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<'NOT_SAVED' | 'SAVED' | 'POSTING' | 'POSTED' | 'ERROR'>('NOT_SAVED');
  const [stockMessage, setStockMessage] = useState<string>('');

  // Generate document number
  useEffect(() => {
    const generateDocNo = async () => {
      try {
        const docNo = await generateDocumentNumber(FORM_CODES.JW_ANNEXURE_GRN, date);
        setDocNo(docNo);
      } catch (error) {
        console.error('Error generating document number:', error);
      }
    };
    generateDocNo();
  }, [date]);

  // Fetch indent slips
  useEffect(() => {
    fetchIndentSlips();
  }, []);

  const fetchIndentSlips = async () => {
    try {
      const slips = await materialIndentSlipAPI.getAll();
      setIndentSlips(slips);
    } catch (error) {
      console.error('Error fetching indent slips:', error);
    }
  };

  const handleIndentSlipSelect = async (indentSlip: MaterialIndentSlip) => {
    try {
      setSelectedIndentSlip(indentSlip);
      
      // Fetch indent slip details with items
      const indentDetails = await materialIndentSlipAPI.getById(indentSlip.id);
      if (indentDetails) {
        setIndentItems(indentDetails.items);
        
        // Auto-fill form data from indent slip
        setFormData(prev => ({
          ...prev,
          indentNo: indentSlip.ident_no || indentSlip.doc_no || '',
          indentDate: indentSlip.indent_date || '',
          partyName: indentSlip.party_name || prev.partyName,
          address: indentSlip.address || prev.address,
          state: indentSlip.state || prev.state,
          gstNo: indentSlip.gst_no || prev.gstNo,
          items: indentDetails.items.map((item, index) => ({
            id: (index + 1).toString(),
            itemCode: item.item_code || '',
            itemName: item.item_name || item.description_specification || '',
            indentQty: item.qty?.toString() || '',
            rcdQty: '',
            rate: '',
            netValue: ''
          }))
        }));
      }
      
      setShowIndentSearch(false);
      setIndentSearchTerm('');
    } catch (error) {
      console.error('Error fetching indent slip details:', error);
    }
  };

  // Calculate totals when items change
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => {
      const netValue = parseFloat(item.netValue) || 0;
      return sum + netValue;
    }, 0);
    
    setCalculatedTotal(total);
    setFormData(prev => ({
      ...prev,
      totalValue: total.toFixed(2)
    }));
  }, [formData.items]);

  const handleInputChange = (field: keyof Omit<JWAnnexureGRNFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof JWAnnexureGRNItem, value: string) => {
    // Prevent editing fields fetched from indent slip if indent slip is linked
    if (selectedIndentSlip && (field === 'indentQty' || field === 'itemCode' || field === 'itemName')) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Auto-calculate net value
          if (field === 'rcdQty' || field === 'rate') {
            const rcdQty = parseFloat(updatedItem.rcdQty) || 0;
            const rate = parseFloat(updatedItem.rate) || 0;
            updatedItem.netValue = (rcdQty * rate).toFixed(2);
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const addItemRow = () => {
    const newItem: JWAnnexureGRNItem = {
      id: Date.now().toString(),
      itemCode: '',
      itemName: '',
      indentQty: '',
      rcdQty: '',
      rate: '',
      netValue: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItemRow = (id: string) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const grnData = {
        doc_no: docNo,
        date: date,
        jw_no: formData.jwNo || undefined,
        jw_date: formData.jwDate || undefined,
        indent_no: formData.indentNo || undefined,
        indent_date: formData.indentDate || undefined,
        challan_no: formData.challanNo || undefined,
        challan_date: formData.challanDate || undefined,
        party_name: formData.partyName || undefined,
        address: formData.address || undefined,
        state: formData.state || undefined,
        gst_no: formData.gstNo || undefined,
        total_value: calculatedTotal,
        indent_slip_id: selectedIndentSlip?.id || undefined
      };

      const itemsData = formData.items
        .filter(item => item.itemName.trim() !== '' || item.itemCode.trim() !== '')
        .map(item => ({
          item_code: item.itemCode || undefined,
          item_name: item.itemName || undefined,
          indent_qty: item.indentQty ? parseFloat(item.indentQty) : undefined,
          rcd_qty: item.rcdQty ? parseFloat(item.rcdQty) : undefined,
          rate: item.rate ? parseFloat(item.rate) : undefined,
          net_value: item.netValue ? parseFloat(item.netValue) : undefined
        }));

      // Create the JW Annexure GRN
      const newGRN = await jwAnnexureGRNAPI.create(grnData, itemsData);
      
      // Store the saved document ID for stock posting
      setSavedDocumentId(newGRN.id);
      setStockStatus('SAVED');
      setStockMessage('');
      
      alert('JW Annexure GRN saved successfully! Click "Post to Stock" to update inventory.');
    } catch (error) {
      console.error('Error saving JW Annexure GRN:', error);
      alert('Error saving JW Annexure GRN. Please try again.');
    }
  };

  const handlePostToStock = async () => {
    if (!savedDocumentId) {
      alert('Please save the document first before posting to stock.');
      return;
    }
    
    setStockStatus('POSTING');
    setStockMessage('');
    
    try {
      const stockResponse = await fetch(`/api/stock/post/jw-grn/${savedDocumentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posted_by: 'user' })
      });
      
      const stockResult = await stockResponse.json();
      
      if (stockResult.success) {
        setStockStatus('POSTED');
        let message = `Stock posted successfully! (${stockResult.entries_created || 0} entries created)`;
        if (stockResult.warnings && stockResult.warnings.length > 0) {
          message += `\nWarnings: ${stockResult.warnings.join(', ')}`;
        }
        setStockMessage(message);
        alert(message);
      } else {
        setStockStatus('ERROR');
        const errorMsg = stockResult.error?.message || 'Unknown error';
        setStockMessage(`Failed: ${errorMsg}. Items must exist in Stock Items master.`);
        alert(`Stock posting failed: ${errorMsg}\n\nNote: Items must exist in Stock Items master for posting to work.`);
      }
    } catch (error) {
      console.error('Error posting to stock:', error);
      setStockStatus('ERROR');
      setStockMessage('Error posting to stock. Please try again.');
      alert('Error posting to stock. Please try again.');
    }
  };

  const handleNewForm = () => {
    // Reset form for a new entry
    setFormData({
      jwNo: '',
      jwDate: new Date().toISOString().split('T')[0],
      indentNo: '',
      indentDate: '',
      challanNo: '',
      challanDate: '',
      partyName: '',
      address: '',
      state: '',
      gstNo: '',
      totalValue: '',
      items: [{ id: '1', itemCode: '', itemName: '', indentQty: '', rcdQty: '', rate: '', netValue: '' }]
    });
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedIndentSlip(null);
    setIndentItems([]);
    setSavedDocumentId(null);
    setStockStatus('NOT_SAVED');
    setStockMessage('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-6xl mx-auto">
      <PrintHeader docNo={docNo} date={date} />
      
      <form onSubmit={handleSubmit} className="print:p-8">
        {/* Main Title */}
        <div className="text-center mb-6 print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900">Job Work Challan</h2>
        </div>

        {/* Material Indent Slip Linking Section */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              <Link className="w-5 h-5" />
              Link to Material Indent Slip
            </h3>
            <button
              type="button"
              onClick={() => setShowIndentSearch(!showIndentSearch)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {selectedIndentSlip ? 'Change Indent' : 'Select Indent'}
            </button>
          </div>

          {selectedIndentSlip && (
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Indent No:</span>
                  <p className="font-semibold text-blue-700">{selectedIndentSlip.ident_no || selectedIndentSlip.doc_no}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Party Name:</span>
                  <p className="text-gray-900">{selectedIndentSlip.party_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Date:</span>
                  <p className="text-gray-900">{new Date(selectedIndentSlip.indent_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {showIndentSearch && (
            <div className="mt-4 bg-white p-4 rounded-lg border border-blue-200">
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search indent slips by indent no, party name..."
                  value={indentSearchTerm}
                  onChange={(e) => setIndentSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {indentSlips
                  .filter(slip =>
                    (slip.ident_no || slip.doc_no || '').toLowerCase().includes(indentSearchTerm.toLowerCase()) ||
                    (slip.party_name || '').toLowerCase().includes(indentSearchTerm.toLowerCase())
                  )
                  .map(slip => (
                    <div
                      key={slip.id}
                      onClick={() => handleIndentSlipSelect(slip)}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-blue-700">{slip.ident_no || slip.doc_no}</p>
                          <p className="text-sm text-gray-600">{slip.party_name || 'N/A'}</p>
                        </div>
                        <p className="text-xs text-gray-500">{new Date(slip.indent_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Party Details and JW & Challan Details Section */}
        <div className="grid grid-cols-2 gap-6 mb-6 print:mb-4">
          {/* Left: Party Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Party Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party Name:
              </label>
              <input
                type="text"
                value={formData.partyName}
                onChange={(e) => handleInputChange('partyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address:
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State:
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST No:
                </label>
                <input
                  type="text"
                  value={formData.gstNo}
                  onChange={(e) => handleInputChange('gstNo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Right: JW & Challan Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">JW & Challan Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JW No:
              </label>
              <input
                type="text"
                value={formData.jwNo}
                onChange={(e) => handleInputChange('jwNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JW Date:
              </label>
              <input
                type="date"
                value={formData.jwDate}
                onChange={(e) => handleInputChange('jwDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indent No:
              </label>
              <input
                type="text"
                value={formData.indentNo}
                onChange={(e) => handleInputChange('indentNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indent Date:
              </label>
              <input
                type="date"
                value={formData.indentDate}
                onChange={(e) => handleInputChange('indentDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Challan No:
              </label>
              <input
                type="text"
                value={formData.challanNo}
                onChange={(e) => handleInputChange('challanNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Challan Date:
              </label>
              <input
                type="date"
                value={formData.challanDate}
                onChange={(e) => handleInputChange('challanDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 print:mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12">Sl.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Item Code</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Item Name</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">Indent Qty.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">Rcd. Qty.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Rate</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Net Value</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-16 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-2 py-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.itemCode}
                      onChange={(e) => handleItemChange(item.id, 'itemCode', e.target.value)}
                      readOnly={!!selectedIndentSlip}
                      className={`w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                        selectedIndentSlip ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                      readOnly={!!selectedIndentSlip}
                      className={`w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                        selectedIndentSlip ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.indentQty}
                      onChange={(e) => handleItemChange(item.id, 'indentQty', e.target.value)}
                      readOnly={!!selectedIndentSlip}
                      className={`w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                        selectedIndentSlip ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.rcdQty}
                      onChange={(e) => handleItemChange(item.id, 'rcdQty', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.netValue || '-'}
                      readOnly
                      className="w-full px-2 py-1 border-none bg-gray-50"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center print:hidden">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="border border-gray-300 px-4 py-2 font-semibold text-right bg-gray-100">
                  Total Value
                </td>
                <td className="border border-gray-300 px-4 py-2 font-bold text-right bg-gray-100">
                  {calculatedTotal.toFixed(2)}
                </td>
                <td className="border border-gray-300 print:hidden"></td>
              </tr>
            </tfoot>
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

        {/* Stock Status Message */}
        {stockMessage && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            stockStatus === 'POSTED' ? 'bg-green-50 text-green-800 border border-green-200' :
            stockStatus === 'ERROR' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {stockStatus === 'POSTED' && <CheckCircle className="w-5 h-5" />}
            <span className="text-sm">{stockMessage}</span>
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
            disabled={stockStatus === 'POSTED'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
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
    </div>
  );
};

export default JWAnnexureGRNForm;
