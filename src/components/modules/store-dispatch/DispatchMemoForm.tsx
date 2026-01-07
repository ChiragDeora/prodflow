'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { dispatchMemoAPI } from '../../../lib/supabase';
import CustomerSelect from './CustomerSelect';
import { useStoreDispatch, DispatchItem } from './StoreDispatchContext';
import { generateDispatchMemoNumber } from '../../../utils/formCodeUtils';

const DispatchMemoForm: React.FC = () => {
  const {
    dispatchMemoFormData: formData,
    setDispatchMemoFormData: setFormData,
    updateDispatchMemoField,
    resetDispatchMemoForm,
  } = useStoreDispatch();

  const [docNo, setDocNo] = useState('');

  // Stock posting state
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<'NOT_SAVED' | 'SAVED' | 'POSTING' | 'POSTED' | 'ERROR'>('NOT_SAVED');
  const [stockMessage, setStockMessage] = useState<string>('');

  // Generate document number on component mount or when date changes
  // Dispatch Memo uses sequential numbering (1, 2, 3, 4, ...) - no form code
  useEffect(() => {
    const generateDocNo = async () => {
      try {
        const memoNo = await generateDispatchMemoNumber();
        // For dispatch memo, doc_no can be the same as memo_no or formatted differently
        // The memo_no is what gets saved and displayed
        setDocNo(memoNo);
        // Also update the memoNo in formData if it's empty
        if (!formData.memoNo) {
          updateDispatchMemoField('memoNo', memoNo);
        }
      } catch (error) {
        console.error('Error generating dispatch memo number:', error);
      }
    };
    generateDocNo();
  }, [formData.date, formData.memoNo, updateDispatchMemoField]);

  const handleInputChange = (field: keyof Omit<typeof formData, 'items'>, value: string) => {
    updateDispatchMemoField(field as any, value);
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
    });
  };

  const handleItemChange = (id: string, field: keyof DispatchItem, value: string) => {
    const newItems = formData.items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    updateDispatchMemoField('items', newItems);
  };

  const addItemRow = () => {
    const newItem: DispatchItem = {
      id: Date.now().toString(),
      itemName: '',
      noBox: '',
      remarks: ''
    };
    updateDispatchMemoField('items', [...formData.items, newItem]);
  };

  const removeItemRow = (id: string) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter(item => item.id !== id);
      updateDispatchMemoField('items', newItems);
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
        prepared_by: formData.preparedBy || undefined,
        checked_by: formData.checkedBy || undefined
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
      const newDispatch = await dispatchMemoAPI.create(memoData, itemsData);
      
      if (newDispatch) {
        setSavedDocumentId(newDispatch.id);
        setStockStatus('SAVED');
        setStockMessage('');
        alert('Dispatch Memo saved successfully! Click "Post to Stock" to update inventory.');
      }
    } catch (error) {
      console.error('Error saving dispatch memo:', error);
      alert('Error saving dispatch memo. Please try again.');
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
      const stockResponse = await fetch(`/api/stock/post/dispatch/${savedDocumentId}`, {
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
    resetDispatchMemoForm();
    setSavedDocumentId(null);
    setStockStatus('NOT_SAVED');
    setStockMessage('');
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
            <CustomerSelect
              value={formData.partyName}
              customerId={formData.partyId}
              onChange={handleCustomerSelect}
              placeholder="Select or search customer..."
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
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold print:hidden">Action</th>
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
                  <td className="border border-gray-300 px-4 py-2 print:hidden">
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

        {/* Footer Section */}
        <div className="flex justify-between items-end mt-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prepared By:
            </label>
            <input
              type="text"
              value={formData.preparedBy}
              onChange={(e) => handleInputChange('preparedBy', e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Checked by:
            </label>
            <input
              type="text"
              value={formData.checkedBy}
              onChange={(e) => handleInputChange('checkedBy', e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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

export default DispatchMemoForm;
