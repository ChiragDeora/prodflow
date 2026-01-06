'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, FileText, Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { jobWorkChallanAPI } from '../../../lib/supabase';
import { generateDocumentNumber, FORM_CODES } from '../../../utils/formCodeUtils';

interface JobWorkChallanItem {
  id: string;
  materialDescription: string;
  qty: string;
  uom: string;
  remarks: string;
}

interface JobWorkChallanFormData {
  srNo: string;
  date: string;
  jobworkAnnexureNo: string;
  jobworkAnnexureDate: string;
  partyName: string;
  partyAddress: string;
  gstNo: string;
  vehicleNo: string;
  lrNo: string;
  challanNo: string;
  challanDate: string;
  totalQty: string;
  preparedBy: string;
  checkedBy: string;
  authorizedSignatory: string;
  items: JobWorkChallanItem[];
}

const JobWorkChallanForm: React.FC = () => {
  const [formData, setFormData] = useState<JobWorkChallanFormData>({
    srNo: '',
    date: new Date().toISOString().split('T')[0],
    jobworkAnnexureNo: '',
    jobworkAnnexureDate: '',
    partyName: '',
    partyAddress: '',
    gstNo: '',
    vehicleNo: '',
    lrNo: '',
    challanNo: '',
    challanDate: '',
    totalQty: '',
    preparedBy: '',
    checkedBy: '',
    authorizedSignatory: '',
    items: [
      { id: '1', materialDescription: '', qty: '', uom: '', remarks: '' }
    ]
  });

  const [docNo, setDocNo] = useState('');

  // Stock posting state
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<'NOT_SAVED' | 'SAVED' | 'POSTING' | 'POSTED' | 'ERROR'>('NOT_SAVED');
  const [stockMessage, setStockMessage] = useState<string>('');

  // Generate document number
  useEffect(() => {
    const generateDocNo = async () => {
      try {
        const docNo = await generateDocumentNumber(FORM_CODES.JOB_WORK_CHALLAN, formData.date);
        setDocNo(docNo);
      } catch (error) {
        console.error('Error generating document number:', error);
      }
    };
    generateDocNo();
  }, [formData.date]);

  // Auto-calculate total quantity
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.qty) || 0);
    }, 0);
    setFormData(prev => ({ ...prev, totalQty: total.toString() }));
  }, [formData.items]);

  const handleInputChange = (field: keyof Omit<JobWorkChallanFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof JobWorkChallanItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItemRow = () => {
    const newItem: JobWorkChallanItem = {
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
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const challanData = {
        doc_no: docNo,
        sr_no: formData.srNo,
        date: formData.date,
        jobwork_annexure_no: formData.jobworkAnnexureNo || undefined,
        jobwork_annexure_date: formData.jobworkAnnexureDate || undefined,
        party_name: formData.partyName,
        party_address: formData.partyAddress || undefined,
        gst_no: formData.gstNo || undefined,
        vehicle_no: formData.vehicleNo || undefined,
        lr_no: formData.lrNo || undefined,
        challan_no: formData.challanNo || undefined,
        challan_date: formData.challanDate || undefined,
        total_qty: formData.totalQty ? parseFloat(formData.totalQty) : undefined,
        prepared_by: formData.preparedBy || undefined,
        checked_by: formData.checkedBy || undefined,
        authorized_signatory: formData.authorizedSignatory || undefined
      };

      const itemsData = formData.items
        .filter(item => item.materialDescription.trim() !== '')
        .map(item => ({
          material_description: item.materialDescription,
          qty: item.qty ? parseFloat(item.qty) : undefined,
          uom: item.uom || undefined,
          remarks: item.remarks || undefined
        }));

      const newChallan = await jobWorkChallanAPI.create(challanData, itemsData);
      
      if (newChallan) {
        setSavedDocumentId(newChallan.id);
        setStockStatus('SAVED');
        setStockMessage('');
        alert('Job Work Challan saved successfully! Click "Post to Stock" to update inventory.');
      }
    } catch (error) {
      console.error('Error saving job work challan:', error);
      alert('Error saving job work challan. Please try again.');
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
      const stockResponse = await fetch(`/api/stock/post/job-work-challan/${savedDocumentId}`, {
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
    setFormData({
      srNo: '',
      date: new Date().toISOString().split('T')[0],
      jobworkAnnexureNo: '',
      jobworkAnnexureDate: '',
      partyName: '',
      partyAddress: '',
      gstNo: '',
      vehicleNo: '',
      lrNo: '',
      challanNo: '',
      challanDate: '',
      totalQty: '',
      preparedBy: '',
      checkedBy: '',
      authorizedSignatory: '',
      items: [{ id: '1', materialDescription: '', qty: '', uom: '', remarks: '' }]
    });
    setSavedDocumentId(null);
    setStockStatus('NOT_SAVED');
    setStockMessage('');
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
              <span className="font-semibold">Doc. No.:</span>{' '}
              <span>{docNo}</span>
            </div>
            <div>
              <span className="font-semibold">Date :</span>{' '}
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="border-b border-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">JOB WORK CHALLAN</h2>
          <p className="text-sm text-gray-600 mt-2">As per GST Act 2017, Rule 55, Section 143 - Job Work Annexure-II</p>
        </div>

        {/* Basic Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sr. No. :-
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
              Job Work Annexure No. :-
            </label>
            <input
              type="text"
              value={formData.jobworkAnnexureNo}
              onChange={(e) => handleInputChange('jobworkAnnexureNo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Work Annexure Date :-
            </label>
            <input
              type="date"
              value={formData.jobworkAnnexureDate}
              onChange={(e) => handleInputChange('jobworkAnnexureDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Party Details Section */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
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
                GST No. :-
              </label>
              <input
                type="text"
                value={formData.gstNo}
                onChange={(e) => handleInputChange('gstNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party Address :-
            </label>
            <textarea
              value={formData.partyAddress}
              onChange={(e) => handleInputChange('partyAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
            />
          </div>
        </div>

        {/* Transport Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle No. :-
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
              LR No. :-
            </label>
            <input
              type="text"
              value={formData.lrNo}
              onChange={(e) => handleInputChange('lrNo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Challan No. :-
            </label>
            <input
              type="text"
              value={formData.challanNo}
              onChange={(e) => handleInputChange('challanNo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Challan Date :-
            </label>
            <input
              type="date"
              value={formData.challanDate}
              onChange={(e) => handleInputChange('challanDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-orange-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-16">SR. No.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">MATERIAL DESCRIPTION</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-32">QTY.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-24">UOM</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">REMARKS</th>
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
            className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>

        {/* Total Quantity */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-orange-800">Total Quantity:</span>
                <span className="text-xl font-bold text-orange-900">{formData.totalQty || '0'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* GST Compliance Note */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800 mb-1">GST Compliance Note</h4>
              <p className="text-sm text-yellow-700">
                This Job Work Challan is prepared as per GST Act 2017, Rule 55, Section 143. 
                It serves as documentation for materials sent for job work and ensures GST compliance 
                for outsourced manufacturing processes.
              </p>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-3 gap-6 mt-8 border-t border-gray-300 pt-4">
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

        {/* Stock Status Message */}
        {stockMessage && (
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 print:hidden ${
            stockStatus === 'POSTED' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : stockStatus === 'ERROR'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {stockStatus === 'POSTED' ? (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : stockStatus === 'ERROR' ? (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin" />
            )}
            <div className="whitespace-pre-wrap text-sm">{stockMessage}</div>
          </div>
        )}

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
          {savedDocumentId && stockStatus !== 'POSTED' && (
            <button
              type="button"
              onClick={handlePostToStock}
              disabled={stockStatus === 'POSTING'}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-400 text-white rounded-lg flex items-center gap-2"
            >
              {stockStatus === 'POSTING' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {stockStatus === 'POSTING' ? 'Posting...' : 'Post to Stock'}
            </button>
          )}
          {stockStatus === 'POSTED' && (
            <span className="px-6 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Posted to Stock
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savedDocumentId ? 'Update Job Work Challan' : 'Save Job Work Challan'}
          </button>
          {savedDocumentId && (
            <button
              type="button"
              onClick={handleNewForm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              New Form
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default JobWorkChallanForm;
