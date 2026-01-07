'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, Search, Link } from 'lucide-react';
import { purchaseOrderAPI, materialIndentSlipAPI, MaterialIndentSlip, MaterialIndentSlipItem } from '../../../lib/supabase';
import PrintHeader from '../../shared/PrintHeader';
import CustomerSelect from './CustomerSelect';
import { useStoreDispatch, PurchaseOrderItem } from './StoreDispatchContext';
import { generateDocumentNumber, FORM_CODES } from '../../../utils/formCodeUtils';

const PurchaseOrderForm: React.FC = () => {
  const {
    purchaseOrderFormData: formData,
    setPurchaseOrderFormData: setFormData,
    updatePurchaseOrderField,
    resetPurchaseOrderForm,
  } = useStoreDispatch();

  const [docNo, setDocNo] = useState('');
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [calculatedGst, setCalculatedGst] = useState(0);
  const [calculatedFinal, setCalculatedFinal] = useState(0);
  const [indentSlips, setIndentSlips] = useState<MaterialIndentSlip[]>([]);
  const [selectedIndentSlip, setSelectedIndentSlip] = useState<MaterialIndentSlip | null>(null);
  const [indentItems, setIndentItems] = useState<MaterialIndentSlipItem[]>([]);
  const [showIndentSearch, setShowIndentSearch] = useState(false);
  const [indentSearchTerm, setIndentSearchTerm] = useState('');

  // Generate document number
  useEffect(() => {
    const generateDocNo = async () => {
      try {
        const docNo = await generateDocumentNumber(FORM_CODES.PURCHASE_ORDER, formData.poDate);
        setDocNo(docNo);
      } catch (error) {
        console.error('Error generating document number:', error);
      }
    };
    generateDocNo();
  }, [formData.poDate]);

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
        setFormData({
          ...formData,
          partyName: indentSlip.party_name || formData.partyName,
          address: indentSlip.address || formData.address,
          state: indentSlip.state || formData.state,
          gstNo: indentSlip.gst_no || formData.gstNo,
          items: indentDetails.items.map((item, index) => ({
            id: (index + 1).toString(),
            itemCode: item.item_code || '',
            description: item.item_name || item.description_specification || '',
            qty: item.qty?.toString() || '',
            unit: item.uom || '',
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

  // Calculate totals when items change
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + (qty * rate);
    }, 0);
    
    setCalculatedTotal(total);
    const gstPercent = parseFloat(formData.gstPercentage) || 0;
    const gst = (total * gstPercent) / 100;
    setCalculatedGst(gst);
    setCalculatedFinal(total + gst);
    
    setFormData({
      ...formData,
      totalAmt: total.toFixed(2),
      finalAmt: (total + gst).toFixed(2)
    });
  }, [formData.items, formData.gstPercentage]);

  const handleInputChange = (field: keyof Omit<typeof formData, 'items'>, value: string) => {
    updatePurchaseOrderField(field as any, value);
  };

  const handleCustomerSelect = (customer: { 
    id: string; 
    name: string;
    address?: string;
    state?: string;
    stateCode?: string;
    gstNumber?: string;
  }) => {
    setFormData({
      ...formData,
      partyId: customer.id,
      partyName: customer.name,
      address: customer.address || '',
      state: customer.state || '',
      gstNo: customer.gstNumber || '',
    });
  };

  const handleItemChange = (id: string, field: keyof PurchaseOrderItem, value: string) => {
    const newItems = formData.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-calculate total price
        if (field === 'qty' || field === 'rate') {
          const qty = parseFloat(updatedItem.qty) || 0;
          const rate = parseFloat(updatedItem.rate) || 0;
          updatedItem.totalPrice = (qty * rate).toFixed(2);
        }
        return updatedItem;
      }
      return item;
    });
    updatePurchaseOrderField('items', newItems);
  };

  const addItemRow = () => {
    const newItem: PurchaseOrderItem = {
      id: Date.now().toString(),
      itemCode: '',
      description: '',
      qty: '',
      unit: '',
      rate: '',
      totalPrice: ''
    };
    updatePurchaseOrderField('items', [...formData.items, newItem]);
  };

  const removeItemRow = (id: string) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter(item => item.id !== id);
      updatePurchaseOrderField('items', newItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orderData = {
        doc_no: docNo,
        po_no: formData.poNo,
        date: formData.poDate,
        ref_date: formData.refDate || undefined,
        party_name: formData.partyName || undefined,
        address: formData.address || undefined,
        state: formData.state || undefined,
        gst_no: formData.gstNo || undefined,
        reference: formData.refNo || undefined,
        po_type: formData.capitalOperational ? (formData.capitalOperational.toUpperCase() as 'CAPITAL' | 'OPERATIONAL') : undefined,
        total_amt: calculatedTotal,
        gst_percentage: parseFloat(formData.gstPercentage) || 18,
        gst_amount: calculatedGst,
        final_amt: calculatedFinal,
        amount_in_words: formData.amountInWords || undefined,
        inspection: formData.inspection || undefined,
        authorized_signatory: undefined,
        delivery_address: formData.deliveryAddress || undefined,
        delivery_terms: formData.deliveryTerms || undefined,
        payment_terms: formData.paymentTerms || undefined,
        packing_charges: formData.packingCharges || undefined,
        warranty: formData.warranty || undefined,
        other_terms: formData.otherTerms || undefined,
        indent_slip_id: selectedIndentSlip?.id || undefined
      };

      const itemsData = formData.items
        .filter(item => item.description.trim() !== '')
        .map(item => ({
          item_code: formData.capitalOperational === 'Operational' ? (item.itemCode || undefined) : undefined,
          description: item.description,
          qty: item.qty ? parseFloat(item.qty) : undefined,
          unit: item.unit || undefined,
          rate: item.rate ? parseFloat(item.rate) : undefined,
          total_price: item.totalPrice ? parseFloat(item.totalPrice) : undefined
        }));

      await purchaseOrderAPI.create(orderData, itemsData);
      alert('Purchase Order saved successfully!');
      
      // Reset form
      resetPurchaseOrderForm();
      setCalculatedTotal(0);
      setCalculatedGst(0);
      setCalculatedFinal(0);
      setSelectedIndentSlip(null);
      setIndentItems([]);
    } catch (error) {
      console.error('Error saving purchase order:', error);
      alert('Error saving purchase order. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-6xl mx-auto">
      <PrintHeader docNo={docNo} date={formData.poDate} />
      
      <form onSubmit={handleSubmit} className="print:p-8">
        {/* Main Title */}
        <div className="text-center mb-6 print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900">Purchase Order (PO)</h2>
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

        {/* Party Details and PO Details Section */}
        <div className="grid grid-cols-2 gap-6 mb-6 print:mb-4">
          {/* Left: Party Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Party Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party Name:
              </label>
              <CustomerSelect
                value={formData.partyName}
                customerId={formData.partyId}
                onChange={handleCustomerSelect}
                placeholder="Select or search customer..."
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

          {/* Right: PO Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Purchase Order Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doc. No:
              </label>
              <input
                type="text"
                value={docNo}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold text-gray-700"
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
                required
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
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ref No:
              </label>
              <input
                type="text"
                value={formData.refNo}
                onChange={(e) => handleInputChange('refNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ref Date:
              </label>
              <input
                type="date"
                value={formData.refDate}
                onChange={(e) => handleInputChange('refDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capital/Operational:
              </label>
              <select
                value={formData.capitalOperational}
                onChange={(e) => {
                  const newType = e.target.value;
                  handleInputChange('capitalOperational', newType);
                  
                  // Clear itemCode from all items when switching to Capital
                  if (newType === 'Capital') {
                    const updatedItems = formData.items.map(item => ({
                      ...item,
                      itemCode: ''
                    }));
                    updatePurchaseOrderField('items', updatedItems);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Type</option>
                <option value="Capital">Capital</option>
                <option value="Operational">Operational</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 print:mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12">Sl.</th>
                {formData.capitalOperational === 'Operational' && (
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Item Code</th>
                )}
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Description</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">Qty.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">Unit</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Rate</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Total Price</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-16 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-2 py-2 text-center">{index + 1}</td>
                  {formData.capitalOperational === 'Operational' && (
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="text"
                        value={item.itemCode}
                        onChange={(e) => handleItemChange(item.id, 'itemCode', e.target.value)}
                        className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      />
                    </td>
                  )}
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
                      value={item.qty}
                      onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">Total Amt.</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{calculatedTotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">GST %</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={formData.gstPercentage}
                      onChange={(e) => handleInputChange('gstPercentage', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                      step="0.01"
                      min="0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">GST Amount</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{calculatedGst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">Final Amt.</td>
                  <td className="border border-gray-300 px-4 py-2 text-right font-bold">{calculatedFinal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Other Terms & Conditions Section */}
        <div className="mb-6 print:mb-4">
          <div className="bg-green-600 text-white px-4 py-2 font-semibold mb-4">
            Other Terms & Conditions
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address:
                </label>
                <textarea
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Terms:
                </label>
                <input
                  type="text"
                  value={formData.deliveryTerms}
                  onChange={(e) => handleInputChange('deliveryTerms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms:
                </label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Packing Charges:
                </label>
                <input
                  type="text"
                  value={formData.packingCharges}
                  onChange={(e) => handleInputChange('packingCharges', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inspection:
                </label>
                <input
                  type="text"
                  value={formData.inspection}
                  onChange={(e) => handleInputChange('inspection', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warranty:
                </label>
                <input
                  type="text"
                  value={formData.warranty}
                  onChange={(e) => handleInputChange('warranty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other:
                </label>
                <textarea
                  value={formData.otherTerms}
                  onChange={(e) => handleInputChange('otherTerms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
                  rows={4}
                />
              </div>
            </div>
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

export default PurchaseOrderForm;
