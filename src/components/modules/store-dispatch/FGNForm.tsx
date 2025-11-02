'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { fgnAPI } from '../../../lib/supabase';

interface FGNItem {
  id: string;
  itemName: string;
  noOfBoxes: string;
  qtyInBox: string;
  totalQty: string;
  receivedQty: string;
  qcCheck: string;
  remarks: string;
}

interface FGNFormData {
  fromDept: string;
  toDept: string;
  transferNo: string;
  transferDateTime: string;
  shiftInchargeNameSign: string;
  qcInspectorNameSign: string;
  fgReceivedNameSign: string;
  items: FGNItem[];
}

const FGNForm: React.FC = () => {
  const [formData, setFormData] = useState<FGNFormData>({
    fromDept: '',
    toDept: '',
    transferNo: '',
    transferDateTime: '',
    shiftInchargeNameSign: '',
    qcInspectorNameSign: '',
    fgReceivedNameSign: '',
    items: [
      { id: '1', itemName: '', noOfBoxes: '', qtyInBox: '', totalQty: '', receivedQty: '', qcCheck: '', remarks: '' }
    ]
  });

  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Generate document number
  useEffect(() => {
    const generateDocNo = () => {
      const year = new Date(date || new Date()).getFullYear();
      const month = String(new Date(date || new Date()).getMonth() + 1).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      return `DPPL-COM-${year}${month}-${random}/R00`;
    };
    setDocNo(generateDocNo());
  }, [date]);

  const handleInputChange = (field: keyof Omit<FGNFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof FGNItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Auto-calculate total qty if no of boxes and qty in box are provided
          if ((field === 'noOfBoxes' || field === 'qtyInBox') && updatedItem.noOfBoxes && updatedItem.qtyInBox) {
            const boxes = parseFloat(updatedItem.noOfBoxes) || 0;
            const qtyPerBox = parseFloat(updatedItem.qtyInBox) || 0;
            updatedItem.totalQty = (boxes * qtyPerBox).toString();
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const addItemRow = () => {
    const newItem: FGNItem = {
      id: Date.now().toString(),
      itemName: '',
      noOfBoxes: '',
      qtyInBox: '',
      totalQty: '',
      receivedQty: '',
      qcCheck: '',
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
      const fgnData = {
        doc_no: docNo,
        date: date,
        from_dept: formData.fromDept,
        to_dept: formData.toDept,
        transfer_no: formData.transferNo,
        transfer_date_time: formData.transferDateTime || undefined,
        shift_incharge_name_sign: formData.shiftInchargeNameSign || undefined,
        qc_inspector_name_sign: formData.qcInspectorNameSign || undefined,
        fg_received_name_sign: formData.fgReceivedNameSign || undefined
      };

      const itemsData = formData.items
        .filter(item => item.itemName.trim() !== '')
        .map(item => ({
          item_name: item.itemName,
          no_of_boxes: item.noOfBoxes ? parseInt(item.noOfBoxes) : undefined,
          qty_in_box: item.qtyInBox ? parseFloat(item.qtyInBox) : undefined,
          total_qty: item.totalQty ? parseFloat(item.totalQty) : undefined,
          received_qty: item.receivedQty ? parseFloat(item.receivedQty) : undefined,
          qc_check: item.qcCheck || undefined,
          remarks: item.remarks || undefined
        }));

      await fgnAPI.create(fgnData, itemsData);
      alert('FGN saved successfully!');
      
      // Reset form
      setFormData({
        fromDept: '',
        toDept: '',
        transferNo: '',
        transferDateTime: '',
        shiftInchargeNameSign: '',
        qcInspectorNameSign: '',
        fgReceivedNameSign: '',
        items: [{ id: '1', itemName: '', noOfBoxes: '', qtyInBox: '', totalQty: '', receivedQty: '', qcCheck: '', remarks: '' }]
      });
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error saving FGN:', error);
      alert('Error saving FGN. Please try again.');
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
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-b border-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">FINISHED GOODS TRANSFER NOTE</h2>
        </div>

        {/* Transfer Information Fields */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Dept. :-
            </label>
            <input
              type="text"
              value={formData.fromDept}
              onChange={(e) => handleInputChange('fromDept', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Dept. :-
            </label>
            <input
              type="text"
              value={formData.toDept}
              onChange={(e) => handleInputChange('toDept', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer No. :-
            </label>
            <input
              type="text"
              value={formData.transferNo}
              onChange={(e) => handleInputChange('transferNo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date / Time :-
            </label>
            <input
              type="datetime-local"
              value={formData.transferDateTime}
              onChange={(e) => handleInputChange('transferDateTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-16">Sr. No.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Item Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-24">No. Of Boxes</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-32">Qty. in Box</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-32">Total Qty.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-32">Received Qty.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-32">QC. Check</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Remarks.</th>
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
                      value={item.itemName}
                      onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={item.noOfBoxes}
                      onChange={(e) => handleItemChange(item.id, 'noOfBoxes', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={item.qtyInBox}
                      onChange={(e) => handleItemChange(item.id, 'qtyInBox', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.totalQty}
                      readOnly
                      className="w-full px-2 py-1 border-none bg-gray-50"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={item.receivedQty}
                      onChange={(e) => handleItemChange(item.id, 'receivedQty', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.qcCheck}
                      onChange={(e) => handleItemChange(item.id, 'qcCheck', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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

        {/* Footer Section */}
        <div className="grid grid-cols-3 gap-6 mt-8 border-t border-gray-300 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Incharge Name & Sign
            </label>
            <input
              type="text"
              value={formData.shiftInchargeNameSign}
              onChange={(e) => handleInputChange('shiftInchargeNameSign', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-8 h-12 border-b border-gray-300"></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QC. Inspector Name & Sign
            </label>
            <input
              type="text"
              value={formData.qcInspectorNameSign}
              onChange={(e) => handleInputChange('qcInspectorNameSign', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-8 h-12 border-b border-gray-300"></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              FG. Received Name & Sign
            </label>
            <input
              type="text"
              value={formData.fgReceivedNameSign}
              onChange={(e) => handleInputChange('fgReceivedNameSign', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-8 h-12 border-b border-gray-300"></div>
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

export default FGNForm;

