'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { deliveryChallanAPI } from '../../../lib/supabase';

interface DeliveryItem {
  id: string;
  materialDescription: string;
  qty: string;
  uom: string;
  remarks: string;
}

interface DeliveryChallanFormData {
  srNo: string;
  date: string;
  vehicleNo: string;
  lrNo: string;
  returnable: boolean;
  to: string;
  state: string;
  items: DeliveryItem[];
  totalQty: string;
  receivedBy: string;
  preparedBy: string;
  checkedBy: string;
  authorizedSignatory: string;
}

const DeliveryChallanForm: React.FC = () => {
  const [formData, setFormData] = useState<DeliveryChallanFormData>({
    srNo: '',
    date: new Date().toISOString().split('T')[0],
    vehicleNo: '',
    lrNo: '',
    returnable: false,
    to: '',
    state: '',
    items: [
      { id: '1', materialDescription: '', qty: '', uom: '', remarks: '' }
    ],
    totalQty: '',
    receivedBy: '',
    preparedBy: '',
    checkedBy: '',
    authorizedSignatory: ''
  });

  const [docNo, setDocNo] = useState('');

  // Generate document number on component mount or when date changes
  useEffect(() => {
    const generateDocNo = () => {
      const year = new Date(formData.date || new Date()).getFullYear();
      const month = String(new Date(formData.date || new Date()).getMonth() + 1).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      return `DC-${year}${month}-${random}`;
    };
    setDocNo(generateDocNo());
  }, [formData.date]);

  const handleInputChange = (field: keyof DeliveryChallanFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof DeliveryItem, value: string) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      );
      
      // Calculate total quantity when qty changes
      let updatedTotalQty = prev.totalQty;
      if (field === 'qty') {
        const total = updatedItems.reduce((sum: number, item) => {
          return sum + (parseFloat(item.qty) || 0);
        }, 0);
        updatedTotalQty = total.toString();
      }
      
      return {
        ...prev,
        items: updatedItems,
        totalQty: updatedTotalQty
      };
    });
  };

  const addItemRow = () => {
    const newItem: DeliveryItem = {
      id: Date.now().toString(),
      materialDescription: '',
      qty: '',
      uom: '',
      remarks: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItemRow = (id: string) => {
    if (formData.items.length > 1) {
      setFormData(prev => {
        const newItems = prev.items.filter(item => item.id !== id);
        // Recalculate total
        const total = newItems.reduce((sum: number, item) => {
          return sum + (parseFloat(item.qty) || 0);
        }, 0);
        return {
          ...prev,
          items: newItems,
          totalQty: total.toString()
        };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepare challan data
      const challanData = {
        doc_no: docNo,
        sr_no: formData.srNo,
        date: formData.date,
        vehicle_no: formData.vehicleNo || undefined,
        lr_no: formData.lrNo || undefined,
        returnable: formData.returnable,
        to_address: formData.to,
        state: formData.state || undefined,
        total_qty: formData.totalQty ? parseFloat(formData.totalQty) : undefined,
        received_by: formData.receivedBy || undefined,
        prepared_by: formData.preparedBy || undefined,
        checked_by: formData.checkedBy || undefined,
        authorized_signatory: formData.authorizedSignatory || undefined
      };

      // Prepare items data
      const itemsData = formData.items
        .filter(item => item.materialDescription.trim() !== '') // Only include items with descriptions
        .map(item => ({
          material_description: item.materialDescription,
          qty: item.qty ? parseFloat(item.qty) : undefined,
          uom: item.uom || undefined,
          remarks: item.remarks || undefined
        }));

      // Save to database
      await deliveryChallanAPI.create(challanData, itemsData);
      alert('Delivery Challan saved successfully!');
      
      // Reset form
      setFormData({
        srNo: '',
        date: new Date().toISOString().split('T')[0],
        vehicleNo: '',
        lrNo: '',
        returnable: false,
        to: '',
        state: '',
        items: [{ id: '1', materialDescription: '', qty: '', uom: '', remarks: '' }],
        totalQty: '',
        receivedBy: '',
        preparedBy: '',
        checkedBy: '',
        authorizedSignatory: ''
      });
    } catch (error) {
      console.error('Error saving delivery challan:', error);
      alert('Error saving delivery challan. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-5xl mx-auto">
      <form onSubmit={handleSubmit} className="print:p-8">
        {/* Header Section */}
        <div className="text-center mb-4">
          {/* Company Logo */}
          <div className="flex items-center justify-center gap-4 mb-2">
            <img
              src="/dppl_logo.png"
              alt="DEORA POLYPLAST LLP Logo"
              width={380}
              height={80}
              className="object-contain"
              onError={(e) => {
                console.error('Failed to load logo:', e);
              }}
            />
          </div>
          
          {/* Factory Address */}
          <div className="text-sm text-gray-700 mb-3">
            <div>Factory Address:- Plot no 32 & 33 Silver Industrial Estate, Village Bhimpore, Nani daman -396 210</div>
            <div className="flex justify-center gap-6 mt-2">
              <span>Email : <input type="email" className="border-b border-gray-300 focus:outline-none focus:border-blue-500 px-2" /></span>
              <span>Mob. No. :- <input type="tel" className="border-b border-gray-300 focus:outline-none focus:border-blue-500 px-2" /></span>
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">DELIVERY CHALLAN</h2>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Left Side - Recipient Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TO,
              </label>
              <textarea
                value={formData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                placeholder="Enter recipient name and address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State :-
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Right Side - Challan Details */}
          <div className="border-2 border-gray-300 p-4 rounded-lg">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sr. No :
                </label>
                <input
                  type="text"
                  value={formData.srNo}
                  onChange={(e) => handleInputChange('srNo', e.target.value)}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle No :-
                </label>
                <input
                  type="text"
                  value={formData.vehicleNo}
                  onChange={(e) => handleInputChange('vehicleNo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lr No.:-
                </label>
                <input
                  type="text"
                  value={formData.lrNo}
                  onChange={(e) => handleInputChange('lrNo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.returnable}
                  onChange={(e) => handleInputChange('returnable', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Returnable / Non Returnable
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-16">Sr. No.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Material Description</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-24">Qty.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-24">UOM</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Remarks</th>
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
                      value={item.materialDescription}
                      onChange={(e) => handleItemChange(item.id, 'materialDescription', e.target.value)}
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
                      value={item.uom}
                      onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      placeholder="kg/pcs/etc"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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

        {/* Total Qty */}
        <div className="mb-6">
          <label className="inline-block text-sm font-medium text-gray-700 mr-4">
            Total Qty.:
          </label>
          <input
            type="text"
            value={formData.totalQty}
            readOnly
            className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold w-32"
          />
        </div>

        {/* Footer Section */}
        <div className="grid grid-cols-2 gap-8 mt-8">
          {/* Left - Received By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Received By :-
            </label>
            <textarea
              value={formData.receivedBy}
              onChange={(e) => handleInputChange('receivedBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
              placeholder="Signature and name"
            />
          </div>

          {/* Right - Company Authorization */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-4">For Deora Polyplast LLP</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prepared By
                </label>
                <input
                  type="text"
                  value={formData.preparedBy}
                  onChange={(e) => handleInputChange('preparedBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Checked By
                </label>
                <input
                  type="text"
                  value={formData.checkedBy}
                  onChange={(e) => handleInputChange('checkedBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authorized Signatory
                </label>
                <input
                  type="text"
                  value={formData.authorizedSignatory}
                  onChange={(e) => handleInputChange('authorizedSignatory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

export default DeliveryChallanForm;

