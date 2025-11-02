'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { dispatchMemoAPI } from '../../../lib/supabase';

interface DispatchItem {
  id: string;
  itemName: string;
  noBox: string;
  remarks: string;
}

interface DispatchMemoFormData {
  memoNo: string;
  date: string;
  partyName: string;
  location: string;
  items: DispatchItem[];
}

const DispatchMemoForm: React.FC = () => {
  const [formData, setFormData] = useState<DispatchMemoFormData>({
    memoNo: '',
    date: new Date().toISOString().split('T')[0],
    partyName: '',
    location: '',
    items: [
      { id: '1', itemName: '', noBox: '', remarks: '' }
    ]
  });

  const [preparedBy, setPreparedBy] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [docNo, setDocNo] = useState('');

  // Generate document number on component mount or when date changes
  useEffect(() => {
    const generateDocNo = () => {
      const year = new Date(formData.date || new Date()).getFullYear();
      const month = String(new Date(formData.date || new Date()).getMonth() + 1).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      return `DPPL-COM-${year}${month}-${random}/R00`;
    };
    setDocNo(generateDocNo());
  }, [formData.date]);

  const handleInputChange = (field: keyof Omit<DispatchMemoFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof DispatchItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItemRow = () => {
    const newItem: DispatchItem = {
      id: Date.now().toString(),
      itemName: '',
      noBox: '',
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
      // Prepare memo data
      const memoData = {
        doc_no: docNo,
        memo_no: formData.memoNo,
        date: formData.date,
        party_name: formData.partyName,
        location: formData.location,
        prepared_by: preparedBy || undefined,
        checked_by: checkedBy || undefined
      };

      // Prepare items data
      const itemsData = formData.items
        .filter(item => item.itemName.trim() !== '') // Only include items with names
        .map(item => ({
          item_name: item.itemName,
          no_box: item.noBox || undefined,
          remarks: item.remarks || undefined
        }));

      // Save to database
      await dispatchMemoAPI.create(memoData, itemsData);
      alert('Dispatch Memo saved successfully!');
      
      // Reset form
      setFormData({
        memoNo: '',
        date: new Date().toISOString().split('T')[0],
        partyName: '',
        location: '',
        items: [{ id: '1', itemName: '', noBox: '', remarks: '' }]
      });
      setPreparedBy('');
      setCheckedBy('');
    } catch (error) {
      console.error('Error saving dispatch memo:', error);
      alert('Error saving dispatch memo. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-4xl mx-auto">
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
          <h2 className="text-3xl font-bold text-gray-900">DISPATCH MEMO</h2>
        </div>

        {/* Memo Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Memo No. :-
            </label>
            <input
              type="text"
              value={formData.memoNo}
              onChange={(e) => handleInputChange('memoNo', e.target.value)}
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
              Party Name :-
            </label>
            <input
              type="text"
              value={formData.partyName}
              onChange={(e) => handleInputChange('partyName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location :-
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Sr. No.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Item Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">No. Box</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Remarks</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
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
                      type="text"
                      value={item.noBox}
                      onChange={(e) => handleItemChange(item.id, 'noBox', e.target.value)}
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
                  <td className="border border-gray-300 px-4 py-2">
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
        <div className="flex justify-between items-end mt-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prepared By:
            </label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Checked by:
            </label>
            <input
              type="text"
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

export default DispatchMemoForm;

