'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { deliveryChallanAPI } from '../../../lib/supabase';
import PrintHeader from '../../shared/PrintHeader';
import CustomerSelect from './CustomerSelect';
import { useStoreDispatch, DeliveryChallanItem } from './StoreDispatchContext';
import { generateDocumentNumber, FORM_CODES } from '../../../utils/formCodeUtils';

const DeliveryChallanForm: React.FC = () => {
  const {
    deliveryChallanFormData: formData,
    setDeliveryChallanFormData: setFormData,
    updateDeliveryChallanField,
    resetDeliveryChallanForm,
  } = useStoreDispatch();

  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Generate document number
  useEffect(() => {
    const generateDocNo = async () => {
      try {
        const docNo = await generateDocumentNumber(FORM_CODES.DELIVERY_CHALLAN, date);
        setDocNo(docNo);
      } catch (error) {
        console.error('Error generating document number:', error);
      }
    };
    generateDocNo();
  }, [date]);

  const handleInputChange = (field: keyof Omit<typeof formData, 'items'>, value: string | boolean) => {
    updateDeliveryChallanField(field as any, value as any);
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

  const handleItemChange = (id: string, field: keyof DeliveryChallanItem, value: string) => {
    const newItems = formData.items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    updateDeliveryChallanField('items', newItems);
  };

  const addItemRow = () => {
    const newItem: DeliveryChallanItem = {
      id: Date.now().toString(),
      itemCode: '',
      itemDescription: '',
      hsnCode: '',
      uom: '',
      packSize: '',
      boxNo: '',
      noOfPcs: '',
      value: ''
    };
    updateDeliveryChallanField('items', [...formData.items, newItem]);
  };

  const removeItemRow = (id: string) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter(item => item.id !== id);
      updateDeliveryChallanField('items', newItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const challanData = {
        doc_no: docNo,
        date: date,
        sr_no: formData.dcNo || undefined, // Serial number
        dc_no: formData.dcNo || undefined,
        dc_date: formData.dcDate || undefined,
        po_no: formData.poNo || undefined,
        vehicle_no: formData.vehicleNo || undefined,
        lr_no: formData.lrNo || undefined,
        returnable: formData.returnable,
        party_name: formData.partyName || undefined,
        address: formData.address || undefined,
        to_address: formData.address || undefined, // Copy address to to_address
        state: formData.state || undefined,
        gst_no: formData.gstNo || undefined
      };

      const itemsData = formData.items
        .filter(item => item.itemDescription.trim() !== '' || item.itemCode.trim() !== '')
        .map(item => ({
          material_description: item.itemDescription, // Required field
          qty: item.noOfPcs ? parseFloat(item.noOfPcs) : undefined,
          uom: item.uom || undefined,
          remarks: item.hsnCode ? `HSN: ${item.hsnCode}` : undefined
        }));

      await deliveryChallanAPI.create(challanData, itemsData);
      alert('Delivery Challan saved successfully!');
      
      // Reset form
      resetDeliveryChallanForm();
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error saving delivery challan:', error);
      alert('Error saving delivery challan. Please try again.');
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
          <h2 className="text-3xl font-bold text-gray-900">Delivery Challan</h2>
        </div>

        {/* Party Details and Challan Details Section */}
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

          {/* Right: Challan Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Challan Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                D.C. No. :-
              </label>
              <input
                type="text"
                value={formData.dcNo}
                onChange={(e) => handleInputChange('dcNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                D.C. Date :-
              </label>
              <input
                type="date"
                value={formData.dcDate}
                onChange={(e) => handleInputChange('dcDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO. No. :-
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
                Vehicle No :-
              </label>
              <input
                type="text"
                value={formData.vehicleNo}
                onChange={(e) => handleInputChange('vehicleNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="flex items-center gap-2 pt-2">
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

        {/* Items Table */}
        <div className="mb-6 print:mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12">Sl.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Item Code</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Item Description</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">HSN Code</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">UOM</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Pack Size</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Box No</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">No of Pcs</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Value</th>
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
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.itemDescription}
                      onChange={(e) => handleItemChange(item.id, 'itemDescription', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.hsnCode}
                      onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.uom}
                      onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.packSize}
                      onChange={(e) => handleItemChange(item.id, 'packSize', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.boxNo}
                      onChange={(e) => handleItemChange(item.id, 'boxNo', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.noOfPcs}
                      onChange={(e) => handleItemChange(item.id, 'noOfPcs', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.value}
                      onChange={(e) => handleItemChange(item.id, 'value', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
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
