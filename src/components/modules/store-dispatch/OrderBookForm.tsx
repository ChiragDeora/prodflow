'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { orderBookAPI } from '../../../lib/supabase';
import UOMSelect from '../../shared/UOMSelect';

interface OrderBookItem {
  id: string;
  partCode: string;
  partName: string;
  description: string;
  quantity: string;
  deliveredQty: string;
  pendingQty: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  deliverySchedule: string;
  status: string;
  remarks: string;
}

interface OrderBookFormData {
  poNumber: string;
  orderDate: string;
  customerName: string;
  customerAddress: string;
  customerContact: string;
  customerEmail: string;
  deliveryDate: string;
  status: string;
  gstPercentage: number;
  paymentTerms: string;
  deliveryTerms: string;
  remarks: string;
  items: OrderBookItem[];
}

const OrderBookForm: React.FC = () => {
  const [formData, setFormData] = useState<OrderBookFormData>({
    poNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    customerName: '',
    customerAddress: '',
    customerContact: '',
    customerEmail: '',
    deliveryDate: '',
    status: 'Pending',
    gstPercentage: 18,
    paymentTerms: '',
    deliveryTerms: '',
    remarks: '',
    items: [
      { 
        id: '1', 
        partCode: '', 
        partName: '', 
        description: '', 
        quantity: '', 
        deliveredQty: '',
        pendingQty: '',
        unit: '', 
        unitPrice: '', 
        totalPrice: '', 
        deliverySchedule: '',
        status: 'Pending',
        remarks: '' 
      }
    ]
  });

  const [docNo, setDocNo] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  // Generate document number
  useEffect(() => {
    const generateDocNo = () => {
      const year = new Date(formData.orderDate || new Date()).getFullYear();
      const month = String(new Date(formData.orderDate || new Date()).getMonth() + 1).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      return `DPPL-SO-${year}${month}-${random}/R00`;
    };
    setDocNo(generateDocNo());
  }, [formData.orderDate]);

  // Calculate totals when items change
  useEffect(() => {
    let total = 0;
    formData.items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const itemTotal = qty * price;
      total += itemTotal;
    });
    setTotalAmount(total);
    
    const gst = (total * formData.gstPercentage) / 100;
    setGstAmount(gst);
    setFinalAmount(total + gst);
  }, [formData.items, formData.gstPercentage]);

  const handleInputChange = (field: keyof Omit<OrderBookFormData, 'items'>, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof OrderBookItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate total price
          if (field === 'quantity' || field === 'unitPrice') {
            const qty = parseFloat(updatedItem.quantity) || 0;
            const price = parseFloat(updatedItem.unitPrice) || 0;
            updatedItem.totalPrice = (qty * price).toFixed(2);
          }
          
          // Auto-calculate pending quantity
          if (field === 'quantity' || field === 'deliveredQty') {
            const qty = parseFloat(updatedItem.quantity) || 0;
            const delivered = parseFloat(updatedItem.deliveredQty) || 0;
            updatedItem.pendingQty = (qty - delivered).toFixed(2);
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const addItemRow = () => {
    const newItem: OrderBookItem = {
      id: Date.now().toString(),
      partCode: '',
      partName: '',
      description: '',
      quantity: '',
      deliveredQty: '',
      pendingQty: '',
      unit: '',
      unitPrice: '',
      totalPrice: '',
      deliverySchedule: '',
      status: 'Pending',
      remarks: ''
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
      // Prepare order data
      const orderData = {
        doc_no: docNo,
        po_number: formData.poNumber,
        order_date: formData.orderDate,
        customer_name: formData.customerName,
        customer_address: formData.customerAddress || undefined,
        customer_contact: formData.customerContact || undefined,
        customer_email: formData.customerEmail || undefined,
        delivery_date: formData.deliveryDate || undefined,
        status: formData.status,
        total_amount: totalAmount,
        gst_percentage: formData.gstPercentage,
        gst_amount: gstAmount,
        final_amount: finalAmount,
        payment_terms: formData.paymentTerms || undefined,
        delivery_terms: formData.deliveryTerms || undefined,
        remarks: formData.remarks || undefined
      };

      // Prepare items data
      const itemsData = formData.items
        .filter(item => item.partCode.trim() !== '') // Only include items with part codes
        .map(item => ({
          part_code: item.partCode,
          part_name: item.partName || undefined,
          description: item.description || undefined,
          quantity: parseFloat(item.quantity) || 0,
          delivered_qty: item.deliveredQty ? parseFloat(item.deliveredQty) : 0,
          pending_qty: item.pendingQty ? parseFloat(item.pendingQty) : parseFloat(item.quantity) || 0,
          unit: item.unit || undefined,
          unit_price: item.unitPrice ? parseFloat(item.unitPrice) : undefined,
          total_price: item.totalPrice ? parseFloat(item.totalPrice) : undefined,
          delivery_schedule: item.deliverySchedule || undefined,
          status: item.status || 'Pending',
          remarks: item.remarks || undefined
        }));

      // Save to database
      await orderBookAPI.create(orderData, itemsData);
      alert('Order Book entry saved successfully!');
      
      // Reset form
      setFormData({
        poNumber: '',
        orderDate: new Date().toISOString().split('T')[0],
        customerName: '',
        customerAddress: '',
        customerContact: '',
        customerEmail: '',
        deliveryDate: '',
        status: 'Pending',
        gstPercentage: 18,
        paymentTerms: '',
        deliveryTerms: '',
        remarks: '',
        items: [
          { 
            id: '1', 
            partCode: '', 
            partName: '', 
            description: '', 
            quantity: '', 
            deliveredQty: '',
            pendingQty: '',
            unit: '', 
            unitPrice: '', 
            totalPrice: '', 
            deliverySchedule: '',
            status: 'Pending',
            remarks: '' 
          }
        ]
      });
      setTotalAmount(0);
      setGstAmount(0);
      setFinalAmount(0);
    } catch (error) {
      console.error('Error saving order book:', error);
      alert('Error saving order book. Please try again.');
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
          <div className="text-right text-sm">
            <div className="mb-1">
              <span className="font-semibold">Doc. No. :</span>{' '}
              <span>{docNo}</span>
            </div>
            <div>
              <span className="font-semibold">Date :</span>{' '}
              <span>{new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">ORDER BOOK</h2>
        </div>

        {/* Order Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.poNumber}
              onChange={(e) => handleInputChange('poNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.orderDate}
              onChange={(e) => handleInputChange('orderDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Address
            </label>
            <textarea
              value={formData.customerAddress}
              onChange={(e) => handleInputChange('customerAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Contact
            </label>
            <input
              type="text"
              value={formData.customerContact}
              onChange={(e) => handleInputChange('customerContact', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Email
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Date
            </label>
            <input
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Percentage (%)
            </label>
            <input
              type="number"
              value={formData.gstPercentage}
              onChange={(e) => handleInputChange('gstPercentage', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              min="0"
              max="100"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Terms
            </label>
            <input
              type="text"
              value={formData.paymentTerms}
              onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Terms
            </label>
            <input
              type="text"
              value={formData.deliveryTerms}
              onChange={(e) => handleInputChange('deliveryTerms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={2}
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[60px]">Sr. No.</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[120px]">Part Code <span className="text-red-500">*</span></th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[120px]">Part Name</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[150px]">Description</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[100px]">Quantity <span className="text-red-500">*</span></th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[110px]">Delivered Qty</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[110px]">Pending Qty</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[80px] bg-blue-50">Unit</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[100px]">Unit Price</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[100px]">Total Price</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[140px]">Delivery Schedule</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[120px] bg-green-50">Status</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[150px]">Remarks</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[70px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-3 text-center font-medium">{index + 1}</td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="text"
                      value={item.partCode}
                      onChange={(e) => handleItemChange(item.id, 'partCode', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="text"
                      value={item.partName}
                      onChange={(e) => handleItemChange(item.id, 'partName', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium text-gray-900"
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="number"
                      value={item.deliveredQty}
                      onChange={(e) => handleItemChange(item.id, 'deliveredQty', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium text-gray-900"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="text"
                      value={item.pendingQty || '0.00'}
                      readOnly
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 font-semibold text-gray-900"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3 bg-blue-50">
                    <UOMSelect
                      value={item.unit}
                      onChange={(value) => handleItemChange(item.id, 'unit', value)}
                      className="w-full px-3 py-2 text-sm border border-blue-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium text-gray-900"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="text"
                      value={item.totalPrice || '0.00'}
                      readOnly
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 font-semibold text-gray-900"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="date"
                      value={item.deliverySchedule}
                      onChange={(e) => handleItemChange(item.id, 'deliverySchedule', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3 bg-green-50">
                    <select
                      value={item.status}
                      onChange={(e) => handleItemChange(item.id, 'status', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-green-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Production">In Production</option>
                      <option value="Completed">Completed</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                  <td className="border border-gray-300 px-3 py-3">
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-3 text-center">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(item.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-5 h-5" />
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
            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>

        {/* Summary Section */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Subtotal:</span>
              <span>{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">GST ({formData.gstPercentage}%):</span>
              <span>{gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Amount:</span>
              <span>{finalAmount.toFixed(2)}</span>
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
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderBookForm;

