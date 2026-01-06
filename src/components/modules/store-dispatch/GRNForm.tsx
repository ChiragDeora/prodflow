'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, Search, Link, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { grnAPI, materialIndentSlipAPI, purchaseOrderAPI, MaterialIndentSlip, MaterialIndentSlipItem, PurchaseOrder } from '../../../lib/supabase';
import PrintHeader from '../../shared/PrintHeader';
import PartyNameSelect from './PartyNameSelect';
import { useStoreDispatch, GRNItem } from './StoreDispatchContext';
import { generateDocumentNumber, FORM_CODES } from '../../../utils/formCodeUtils';

const GRNForm: React.FC = () => {
  const {
    grnFormData: formData,
    setGrnFormData: setFormData,
    updateGrnField,
    resetGrnForm,
  } = useStoreDispatch();

  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [indentSlips, setIndentSlips] = useState<MaterialIndentSlip[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedIndentSlip, setSelectedIndentSlip] = useState<MaterialIndentSlip | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [indentItems, setIndentItems] = useState<MaterialIndentSlipItem[]>([]);
  const [showIndentSearch, setShowIndentSearch] = useState(false);
  const [indentSearchTerm, setIndentSearchTerm] = useState('');
  const [showPOSearch, setShowPOSearch] = useState(false);
  const [poSearchTerm, setPOSearchTerm] = useState('');

  // Calculate totals
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [calculatedIGST, setCalculatedIGST] = useState(0);
  const [calculatedCGST, setCalculatedCGST] = useState(0);
  const [calculatedUTGST, setCalculatedUTGST] = useState(0);
  const [calculatedFinal, setCalculatedFinal] = useState(0);

  // Stock posting state
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<'NOT_SAVED' | 'SAVED' | 'POSTING' | 'POSTED' | 'ERROR'>('NOT_SAVED');
  const [stockMessage, setStockMessage] = useState<string>('');
  
  // Item type toggle: Production Materials (RM/PM) or Spare Parts (SPARE)
  const [itemTypeMode, setItemTypeMode] = useState<'production' | 'spare'>('production');

  // Generate document number
  useEffect(() => {
    const generateDocNo = async () => {
      try {
        const docNo = await generateDocumentNumber(FORM_CODES.GRN, date);
        setDocNo(docNo);
      } catch (error) {
        console.error('Error generating document number:', error);
      }
    };
    generateDocNo();
  }, [date]);

  // Fetch indent slips and purchase orders
  useEffect(() => {
    fetchIndentSlips();
    fetchPurchaseOrders();
  }, []);

  const fetchIndentSlips = async () => {
    try {
      const slips = await materialIndentSlipAPI.getAll();
      setIndentSlips(slips);
    } catch (error) {
      console.error('Error fetching indent slips:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const orders = await purchaseOrderAPI.getAll();
      setPurchaseOrders(orders);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
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
        setFormData({
          ...formData,
          partyName: indentSlip.party_name || formData.partyName,
          address: indentSlip.address || formData.address,
          state: indentSlip.state || formData.state,
          gstNo: indentSlip.gst_no || formData.gstNo,
          items: indentDetails.items.map((item, index) => ({
            id: (index + 1).toString(),
            description: item.item_name || item.description_specification || '',
            poQty: item.qty?.toString() || '',
            grnQty: '',
            rate: '',
            totalPrice: ''
          }))
        });
      }
      
      setShowIndentSearch(false);
      setIndentSearchTerm('');
    } catch (error) {
      console.error('Error fetching indent slip details:', error);
    }
  };

  const handlePOSelect = async (po: PurchaseOrder) => {
    try {
      setSelectedPO(po);
      
      // Fetch PO details with items
      const poDetails = await purchaseOrderAPI.getById(po.id);
      if (poDetails) {
        // Auto-fill form data from PO
        setFormData({
          ...formData,
          poNo: po.po_no || formData.poNo,
          poDate: po.date || formData.poDate,
          partyName: po.party_name || formData.partyName,
          address: po.address || formData.address,
          state: po.state || formData.state,
          gstNo: po.gst_no || formData.gstNo,
          items: poDetails.items.map((item, index) => ({
            id: (index + 1).toString(),
            description: item.description,
            poQty: item.qty?.toString() || '',
            grnQty: '',
            rate: (item.rate || item.unit_price)?.toString() || '',
            totalPrice: ''
          }))
        });
      }
      
      setShowPOSearch(false);
      setPOSearchTerm('');
    } catch (error) {
      console.error('Error fetching PO details:', error);
    }
  };

  // Calculate totals when items change
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => {
      const grnQty = parseFloat(item.grnQty) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + (grnQty * rate);
    }, 0);
    
    setCalculatedTotal(total);
    
    const freight = parseFloat(formData.freightOthers) || 0;
    const subtotal = total + freight;
    
    const igstPercent = parseFloat(formData.igstPercentage) || 0;
    const cgstPercent = parseFloat(formData.cgstPercentage) || 0;
    const utgstPercent = parseFloat(formData.utgstPercentage) || 0;
    
    const igst = (subtotal * igstPercent) / 100;
    const cgst = (subtotal * cgstPercent) / 100;
    const utgst = (subtotal * utgstPercent) / 100;
    
    setCalculatedIGST(igst);
    setCalculatedCGST(cgst);
    setCalculatedUTGST(utgst);
    
    const roundOff = parseFloat(formData.roundOff) || 0;
    const final = subtotal + igst + cgst + utgst + roundOff;
    
    setCalculatedFinal(final);
    
    setFormData({
      ...formData,
      totalAmount: total.toFixed(2),
      finalAmount: final.toFixed(2)
    });
  }, [formData.items, formData.freightOthers, formData.igstPercentage, formData.cgstPercentage, formData.utgstPercentage, formData.roundOff]);

  const handleInputChange = (field: keyof Omit<typeof formData, 'items'>, value: string) => {
    updateGrnField(field as any, value);
  };

  const handlePartySelect = (party: { id: string; name: string }) => {
    setFormData({
      ...formData,
      partyId: party.id,
      partyName: party.name,
    });
  };

  const handleItemChange = (id: string, field: keyof GRNItem, value: string) => {
    // Prevent editing fields fetched from PO if PO is linked
    if (selectedPO && (field === 'poQty' || field === 'description')) {
      return;
    }
    
    const newItems = formData.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-calculate total price
        if (field === 'grnQty' || field === 'rate') {
          const grnQty = parseFloat(updatedItem.grnQty) || 0;
          const rate = parseFloat(updatedItem.rate) || 0;
          updatedItem.totalPrice = (grnQty * rate).toFixed(2);
        }
        return updatedItem;
      }
      return item;
    });
    updateGrnField('items', newItems);
  };

  const addItemRow = () => {
    const newItem: GRNItem = {
      id: Date.now().toString(),
      description: '',
      poQty: '',
      grnQty: '',
      rate: '',
      totalPrice: ''
    };
    updateGrnField('items', [...formData.items, newItem]);
  };

  const removeItemRow = (id: string) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter(item => item.id !== id);
      updateGrnField('items', newItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const grnData = {
        doc_no: docNo,
        date: date,
        grn_no: formData.grnNo || undefined,
        grn_date: formData.grnDate || undefined,
        po_no: formData.poNo || undefined,
        po_date: formData.poDate || undefined,
        invoice_no: formData.invoiceNo || undefined,
        invoice_date: formData.invoiceDate || undefined,
        party_name: formData.partyName || undefined,
        address: formData.address || undefined,
        state: formData.state || undefined,
        gst_no: formData.gstNo || undefined,
        total_amount: calculatedTotal,
        freight_others: parseFloat(formData.freightOthers) || 0,
        igst_percentage: parseFloat(formData.igstPercentage) || 0,
        cgst_percentage: parseFloat(formData.cgstPercentage) || 0,
        utgst_percentage: parseFloat(formData.utgstPercentage) || 0,
        round_off: parseFloat(formData.roundOff) || 0,
        final_amount: calculatedFinal,
        amount_in_words: formData.amountInWords || undefined,
        indent_slip_id: selectedIndentSlip?.id || undefined,
        grn_type: 'NORMAL' as const
      };

      const itemsData = formData.items
        .filter(item => item.description.trim() !== '')
        .map(item => ({
          item_description: item.description,
          po_qty: item.poQty ? parseFloat(item.poQty) : undefined,
          grn_qty: item.grnQty ? parseFloat(item.grnQty) : undefined,
          rate: item.rate ? parseFloat(item.rate) : undefined,
          total_price: item.totalPrice ? parseFloat(item.totalPrice) : undefined
        }));

      // Create the GRN
      const newGRN = await grnAPI.create(grnData, itemsData);
      
      if (newGRN) {
        // Store the saved document ID for stock posting
        setSavedDocumentId(newGRN.id);
        setStockStatus('SAVED');
        setStockMessage('');
        
        alert('GRN saved successfully! Click "Post to Stock" to update inventory.');
      }
    } catch (error) {
      console.error('Error saving GRN:', error);
      alert('Error saving GRN. Please try again.');
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
      const stockResponse = await fetch(`/api/stock/post/grn/${savedDocumentId}`, {
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
    resetGrnForm();
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedIndentSlip(null);
    setSelectedPO(null);
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
          <h2 className="text-3xl font-bold text-gray-900">Good Receipt Note (GRN)</h2>
        </div>

        {/* Item Type Toggle - Production vs Spare Parts */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg print:hidden">
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm font-medium text-gray-700">Item Type:</span>
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setItemTypeMode('production')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  itemTypeMode === 'production'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Production Materials (RM/PM)
              </button>
              <button
                type="button"
                onClick={() => setItemTypeMode('spare')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                  itemTypeMode === 'spare'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Spare Parts
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            {itemTypeMode === 'production' 
              ? 'Receiving raw materials and packing materials'
              : 'Receiving spare parts and maintenance items'}
          </p>
        </div>

        {/* Material Indent Slip and PO Linking Section */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg print:hidden">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  Link to Material Indent Slip
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIndentSearch(!showIndentSearch)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                >
                  <Search className="w-4 h-4" />
                  {selectedIndentSlip ? 'Change' : 'Select'}
                </button>
              </div>
              {selectedIndentSlip && (
                <div className="bg-white p-2 rounded border border-blue-200 text-sm">
                  <p className="font-semibold text-blue-700">{selectedIndentSlip.ident_no || selectedIndentSlip.doc_no}</p>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  Link to Purchase Order
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPOSearch(!showPOSearch)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                >
                  <Search className="w-4 h-4" />
                  {selectedPO ? 'Change' : 'Select'}
                </button>
              </div>
              {selectedPO && (
                <div className="bg-white p-2 rounded border border-blue-200 text-sm">
                  <p className="font-semibold text-blue-700">{selectedPO.po_no}</p>
                </div>
              )}
            </div>
          </div>

          {showIndentSearch && (
            <div className="mt-4 bg-white p-4 rounded-lg border border-blue-200">
              <input
                type="text"
                placeholder="Search indent slips..."
                value={indentSearchTerm}
                onChange={(e) => setIndentSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              />
              <div className="max-h-40 overflow-y-auto space-y-2">
                {indentSlips
                  .filter(slip =>
                    (slip.ident_no || slip.doc_no || '').toLowerCase().includes(indentSearchTerm.toLowerCase()) ||
                    (slip.party_name || '').toLowerCase().includes(indentSearchTerm.toLowerCase())
                  )
                  .map(slip => (
                    <div
                      key={slip.id}
                      onClick={() => handleIndentSlipSelect(slip)}
                      className="p-2 border border-gray-200 rounded hover:bg-blue-50 cursor-pointer text-sm"
                    >
                      {slip.ident_no || slip.doc_no}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {showPOSearch && (
            <div className="mt-4 bg-white p-4 rounded-lg border border-blue-200">
              <input
                type="text"
                placeholder="Search purchase orders..."
                value={poSearchTerm}
                onChange={(e) => setPOSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              />
              <div className="max-h-40 overflow-y-auto space-y-2">
                {purchaseOrders
                  .filter(po =>
                    (po.po_no || '').toLowerCase().includes(poSearchTerm.toLowerCase()) ||
                    (po.party_name || '').toLowerCase().includes(poSearchTerm.toLowerCase())
                  )
                  .map(po => (
                    <div
                      key={po.id}
                      onClick={() => handlePOSelect(po)}
                      className="p-2 border border-gray-200 rounded hover:bg-blue-50 cursor-pointer text-sm"
                    >
                      {po.po_no} - {po.party_name || 'N/A'}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Party Details and GRN Details Section */}
        <div className="grid grid-cols-2 gap-6 mb-6 print:mb-4">
          {/* Left: Party Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Party Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party Name:
              </label>
              <PartyNameSelect
                value={formData.partyName}
                partyId={formData.partyId}
                onChange={handlePartySelect}
                placeholder="Select or search party..."
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

          {/* Right: GRN Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">GRN & PO Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GRN No:
              </label>
              <input
                type="text"
                value={formData.grnNo}
                onChange={(e) => handleInputChange('grnNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GRN Date:
              </label>
              <input
                type="date"
                value={formData.grnDate}
                onChange={(e) => handleInputChange('grnDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO No:
              </label>
              <input
                type="text"
                value={formData.poNo}
                onChange={(e) => handleInputChange('poNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Date:
              </label>
              <input
                type="date"
                value={formData.poDate}
                onChange={(e) => handleInputChange('poDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice No:
              </label>
              <input
                type="text"
                value={formData.invoiceNo}
                onChange={(e) => handleInputChange('invoiceNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date:
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
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
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Description</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">PO Qty</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">GRN Qty</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Rate</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Total Price</th>
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
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      readOnly={!!selectedPO}
                      className={`w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                        selectedPO ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.poQty}
                      onChange={(e) => handleItemChange(item.id, 'poQty', e.target.value)}
                      readOnly={!!selectedPO}
                      className={`w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                        selectedPO ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.grnQty}
                      onChange={(e) => handleItemChange(item.id, 'grnQty', e.target.value)}
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
                      value={item.totalPrice || '-'}
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

        {/* Summary Section */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          {/* Left: Amount in Words */}
          <div className="flex-1 mr-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount in Word :-
            </label>
            <input
              type="text"
              value={formData.amountInWords}
              onChange={(e) => handleInputChange('amountInWords', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Right: Financial Summary */}
          <div className="w-64">
            <table className="w-full border-collapse border border-gray-300">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">Total Amount</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{calculatedTotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">Freight & Others</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={formData.freightOthers}
                      onChange={(e) => handleInputChange('freightOthers', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                      step="0.01"
                      min="0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">IGST %</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={formData.igstPercentage}
                      onChange={(e) => handleInputChange('igstPercentage', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                      step="0.01"
                      min="0"
                    />
                    <div className="text-right mt-1 text-sm">{calculatedIGST.toFixed(2)}</div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">CGST %</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={formData.cgstPercentage}
                      onChange={(e) => handleInputChange('cgstPercentage', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                      step="0.01"
                      min="0"
                    />
                    <div className="text-right mt-1 text-sm">{calculatedCGST.toFixed(2)}</div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">UTGST%</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={formData.utgstPercentage}
                      onChange={(e) => handleInputChange('utgstPercentage', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                      step="0.01"
                      min="0"
                    />
                    <div className="text-right mt-1 text-sm">{calculatedUTGST.toFixed(2)}</div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">Round Off</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={formData.roundOff}
                      onChange={(e) => handleInputChange('roundOff', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                      step="0.01"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">Final Amount</td>
                  <td className="border border-gray-300 px-4 py-2 text-right font-bold">{calculatedFinal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
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

export default GRNForm;
