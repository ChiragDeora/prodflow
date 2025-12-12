'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, Search, Link } from 'lucide-react';
import { grnAPI, materialIndentSlipAPI, purchaseOrderAPI, MaterialIndentSlip, MaterialIndentSlipItem, PurchaseOrder } from '../../../lib/supabase';
import PrintHeader from '../../shared/PrintHeader';

interface GRNItem {
  id: string;
  description: string;
  poQty: string;
  grnQty: string;
  rate: string;
  totalPrice: string;
}

interface GRNFormData {
  grnNo: string;
  grnDate: string;
  poNo: string;
  poDate: string;
  invoiceNo: string;
  invoiceDate: string;
  partyName: string;
  address: string;
  state: string;
  gstNo: string;
  totalAmount: string;
  freightOthers: string;
  igstPercentage: string;
  cgstPercentage: string;
  utgstPercentage: string;
  roundOff: string;
  finalAmount: string;
  amountInWords: string;
  items: GRNItem[];
}

const GRNForm: React.FC = () => {
  const [formData, setFormData] = useState<GRNFormData>({
    grnNo: '',
    grnDate: new Date().toISOString().split('T')[0],
    poNo: '',
    poDate: '',
    invoiceNo: '',
    invoiceDate: '',
    partyName: '',
    address: '',
    state: '',
    gstNo: '',
    totalAmount: '',
    freightOthers: '',
    igstPercentage: '',
    cgstPercentage: '',
    utgstPercentage: '',
    roundOff: '',
    finalAmount: '',
    amountInWords: '',
    items: [
      { id: '1', description: '', poQty: '', grnQty: '', rate: '', totalPrice: '' }
    ]
  });

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

  // Generate document number
  useEffect(() => {
    const generateDocNo = () => {
      const year = new Date(date || new Date()).getFullYear();
      const month = String(new Date(date || new Date()).getMonth() + 1).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      return `DPPL-GRN-${year}${month}-${random}/R00`;
    };
    setDocNo(generateDocNo());
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
        setFormData(prev => ({
          ...prev,
          partyName: indentSlip.party_name || prev.partyName,
          address: indentSlip.address || prev.address,
          state: indentSlip.state || prev.state,
          gstNo: indentSlip.gst_no || prev.gstNo,
          items: indentDetails.items.map((item, index) => ({
            id: (index + 1).toString(),
            description: item.item_name || item.description_specification || '',
            poQty: item.qty?.toString() || '',
            grnQty: '',
            rate: '',
            totalPrice: ''
          }))
        }));
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
        setFormData(prev => ({
          ...prev,
          poNo: po.po_no || prev.poNo,
          poDate: po.date || prev.poDate,
          partyName: po.party_name || prev.partyName,
          address: po.address || prev.address,
          state: po.state || prev.state,
          gstNo: po.gst_no || prev.gstNo,
          items: poDetails.items.map((item, index) => ({
            id: (index + 1).toString(),
            description: item.description,
            poQty: item.qty?.toString() || '',
            grnQty: '',
            rate: (item.rate || item.unit_price)?.toString() || '',
            totalPrice: ''
          }))
        }));
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
    
    setFormData(prev => ({
      ...prev,
      totalAmount: total.toFixed(2),
      finalAmount: final.toFixed(2)
    }));
  }, [formData.items, formData.freightOthers, formData.igstPercentage, formData.cgstPercentage, formData.utgstPercentage, formData.roundOff]);

  const handleInputChange = (field: keyof Omit<GRNFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof GRNItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
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
      })
    }));
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

      await grnAPI.create(grnData, itemsData);
      alert('GRN saved successfully!');
      
      // Reset form
      setFormData({
        grnNo: '',
        grnDate: new Date().toISOString().split('T')[0],
        poNo: '',
        poDate: '',
        invoiceNo: '',
        invoiceDate: '',
        partyName: '',
        address: '',
        state: '',
        gstNo: '',
        totalAmount: '',
        freightOthers: '',
        igstPercentage: '',
        cgstPercentage: '',
        utgstPercentage: '',
        roundOff: '',
        finalAmount: '',
        amountInWords: '',
        items: [{ id: '1', description: '', poQty: '', grnQty: '', rate: '', totalPrice: '' }]
      });
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedIndentSlip(null);
      setSelectedPO(null);
      setIndentItems([]);
    } catch (error) {
      console.error('Error saving GRN:', error);
      alert('Error saving GRN. Please try again.');
    }
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
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.poQty}
                      onChange={(e) => handleItemChange(item.id, 'poQty', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6 print:hidden">
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default GRNForm;
