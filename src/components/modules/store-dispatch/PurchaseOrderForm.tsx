'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { purchaseOrderAPI } from '../../../lib/supabase';

interface PurchaseOrderItem {
  id: string;
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
}

interface PurchaseOrderFormData {
  poNo: string;
  date: string;
  to: string;
  reference: string;
  gstPercentage: number;
  amountInWords: string;
  inFavourOf: string;
  inspection: string;
  authorizedSignatory: string;
  items: PurchaseOrderItem[];
}

const PurchaseOrderForm: React.FC = () => {
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    poNo: '',
    date: new Date().toISOString().split('T')[0],
    to: '',
    reference: '',
    gstPercentage: 18,
    amountInWords: '',
    inFavourOf: '',
    inspection: '',
    authorizedSignatory: '',
    items: [
      { id: '1', description: '', qty: '', unit: '', unitPrice: '', totalPrice: '' }
    ]
  });

  const [docNo, setDocNo] = useState('');
  const [totalAmt, setTotalAmt] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [finalAmt, setFinalAmt] = useState(0);

  // Generate document number
  useEffect(() => {
    const generateDocNo = () => {
      const year = new Date(formData.date || new Date()).getFullYear();
      const month = String(new Date(formData.date || new Date()).getMonth() + 1).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      return `DPPL-COM-${year}${month}-${random}/R00`;
    };
    setDocNo(generateDocNo());
  }, [formData.date]);

  // Calculate totals when items change
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.qty) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return sum + (qty * unitPrice);
    }, 0);
    
    setTotalAmt(total);
    const gst = (total * formData.gstPercentage) / 100;
    setGstAmount(gst);
    setFinalAmt(total + gst);
  }, [formData.items, formData.gstPercentage]);

  const handleInputChange = (field: keyof Omit<PurchaseOrderFormData, 'items'>, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof PurchaseOrderItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Auto-calculate total price
          if (field === 'qty' || field === 'unitPrice') {
            const qty = parseFloat(updatedItem.qty) || 0;
            const unitPrice = parseFloat(updatedItem.unitPrice) || 0;
            updatedItem.totalPrice = (qty * unitPrice).toFixed(2);
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const addItemRow = () => {
    const newItem: PurchaseOrderItem = {
      id: Date.now().toString(),
      description: '',
      qty: '',
      unit: '',
      unitPrice: '',
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
      const orderData = {
        doc_no: docNo,
        po_no: formData.poNo,
        date: formData.date,
        to_address: formData.to,
        reference: formData.reference || undefined,
        total_amt: totalAmt,
        gst_percentage: formData.gstPercentage,
        gst_amount: gstAmount,
        final_amt: finalAmt,
        amount_in_words: formData.amountInWords || undefined,
        in_favour_of: formData.inFavourOf || undefined,
        inspection: formData.inspection || undefined,
        authorized_signatory: formData.authorizedSignatory || undefined
      };

      const itemsData = formData.items
        .filter(item => item.description.trim() !== '')
        .map(item => ({
          description: item.description,
          qty: item.qty ? parseFloat(item.qty) : undefined,
          unit: item.unit || undefined,
          unit_price: item.unitPrice ? parseFloat(item.unitPrice) : undefined,
          total_price: item.totalPrice ? parseFloat(item.totalPrice) : undefined
        }));

      await purchaseOrderAPI.create(orderData, itemsData);
      alert('Purchase Order saved successfully!');
      
      // Reset form
      setFormData({
        poNo: '',
        date: new Date().toISOString().split('T')[0],
        to: '',
        reference: '',
        gstPercentage: 18,
        amountInWords: '',
        inFavourOf: '',
        inspection: '',
        authorizedSignatory: '',
        items: [{ id: '1', description: '', qty: '', unit: '', unitPrice: '', totalPrice: '' }]
      });
      setTotalAmt(0);
      setGstAmount(0);
      setFinalAmt(0);
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
      <form onSubmit={handleSubmit} className="print:p-8">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <img
              src="/dppl_logo.png"
              alt="DEORA POLYPLAST LLP Logo"
              width={380}
              height={180}
              className="object-contain"
              onError={(e) => {
                console.error('Failed to load logo:', e);
              }}
            />
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Purchase Order (PO)</h2>
        </div>

        {/* Order Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO No :-
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
              Date :-
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To,
            </label>
            <textarea
              value={formData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference:
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => handleInputChange('reference', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-700 mb-4">
              Dear Sir, With reference to your quotation we are hereby glad to issue our Purchase Order (PO) towards purchase of below Grease cartridge from your company and would be placing a formal purchase order once other formalities are in place.
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-16">Sr. no.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Description</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-24">Qty.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-24">Unit</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-32">Unit Price</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-32">Total Price</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.totalPrice}
                      readOnly
                      className="w-full px-2 py-1 border-none bg-gray-50"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
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
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>

        {/* Summary Section */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            <table className="w-full border-collapse border border-gray-300">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">Total Amt.</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{totalAmt.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">GST {formData.gstPercentage}%</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={formData.gstPercentage}
                      onChange={(e) => handleInputChange('gstPercentage', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                      step="0.01"
                      min="0"
                    />
                    <div className="text-right mt-1">{gstAmount.toFixed(2)}</div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-semibold bg-gray-100">Final Amt.</td>
                  <td className="border border-gray-300 px-4 py-2 text-right font-bold">{finalAmt.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="mb-6">
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

        {/* Terms & Conditions Section */}
        <div className="mb-6">
          <div className="bg-green-600 text-white px-4 py-2 font-semibold mb-4">
            Other Terms & Conditions
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-semibold mb-2">1 Delivery:</div>
              <div className="text-sm text-gray-700 mb-1 font-semibold">Billing & Delivery details:</div>
              <div className="text-sm text-gray-700">
                Deora Polyplast LLP<br />
                Plot 32&33, Silver Industrial Estate,<br />
                Village Bhimpore, Nani Daman - 396 210<br />
                GSTIN - 26AATFD0618A1ZS
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2">2 Payment Terms:</div>
              <div className="text-sm text-gray-700 mb-4">
                Payment After 30 Days Of Invoice
              </div>
              <div className="font-semibold mb-2">3 In Favour of:</div>
              <input
                type="text"
                value={formData.inFavourOf}
                onChange={(e) => handleInputChange('inFavourOf', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              />
              <div className="font-semibold mb-2">4 Inspection:</div>
              <input
                type="text"
                value={formData.inspection}
                onChange={(e) => handleInputChange('inspection', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Authorization Section */}
        <div className="mt-8">
          <div className="text-sm font-medium text-gray-700 mb-2">For DEORA POLYPLAST LLP</div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authorized Signatory
            </label>
            <input
              type="text"
              value={formData.authorizedSignatory}
              onChange={(e) => handleInputChange('authorizedSignatory', e.target.value)}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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

