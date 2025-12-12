'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { misAPI } from '../../../lib/supabase';
import PrintHeader from '../../shared/PrintHeader';

interface MISItem {
  id: string;
  itemCode: string;
  itemDescription: string;
  uom: string;
  requiredQty: string;
  issueQty: string;
  remarks: string;
}

interface MISFormData {
  issueNo: string;
  issueDate: string;
  department: string;
  items: MISItem[];
}

const MISForm: React.FC = () => {
  const [formData, setFormData] = useState<MISFormData>({
    issueNo: '',
    issueDate: new Date().toISOString().split('T')[0],
    department: '',
    items: [
      { id: '1', itemCode: '', itemDescription: '', uom: '', requiredQty: '', issueQty: '', remarks: '' }
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
      return `DPPL-MIS-${year}${month}-${random}/R00`;
    };
    setDocNo(generateDocNo());
  }, [date]);

  const handleInputChange = (field: keyof Omit<MISFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof MISItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItemRow = () => {
    const newItem: MISItem = {
      id: Date.now().toString(),
      itemCode: '',
      itemDescription: '',
      uom: '',
      requiredQty: '',
      issueQty: '',
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
      const misData = {
        doc_no: docNo,
        date: date,
        dept_name: formData.department,
        issue_no: formData.issueNo,
        issue_date: formData.issueDate
      };

      const itemsData = formData.items
        .filter(item => item.itemDescription.trim() !== '' || item.itemCode.trim() !== '')
        .map(item => ({
          item_code: item.itemCode || undefined,
          description_of_material: item.itemDescription,
          uom: item.uom || undefined,
          required_qty: item.requiredQty ? parseFloat(item.requiredQty) : undefined,
          issue_qty: item.issueQty ? parseFloat(item.issueQty) : undefined,
          remarks: item.remarks || undefined
        }));

      await misAPI.create(misData, itemsData);
      alert('MIS saved successfully!');
      
      // Reset form
      setFormData({
        issueNo: '',
        issueDate: new Date().toISOString().split('T')[0],
        department: '',
        items: [{ id: '1', itemCode: '', itemDescription: '', uom: '', requiredQty: '', issueQty: '', remarks: '' }]
      });
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error saving MIS:', error);
      alert('Error saving MIS. Please try again.');
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
          <h2 className="text-3xl font-bold text-gray-900">MATERIAL ISSUE SLIP</h2>
        </div>

        {/* Issue No, Date, and Department Section */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          {/* Left: Issue No and Date */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue No. :-
              </label>
              <input
                type="text"
                value={formData.issueNo}
                onChange={(e) => handleInputChange('issueNo', e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date :-
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => handleInputChange('issueDate', e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Right: Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department :-
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
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
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">UOM</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">REQ. QTY.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">ISSUE QTY.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">REMARKS</th>
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
                      value={item.uom}
                      onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.requiredQty}
                      onChange={(e) => handleItemChange(item.id, 'requiredQty', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.issueQty}
                      onChange={(e) => handleItemChange(item.id, 'issueQty', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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

export default MISForm;
