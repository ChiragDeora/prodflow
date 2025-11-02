'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { materialIndentSlipAPI } from '../../../lib/supabase';

interface MaterialIndentItem {
  id: string;
  descriptionSpecification: string;
  qty: string;
  uom: string;
  makeMfgRemarks: string;
}

interface MaterialIndentSlipFormData {
  departmentName: string;
  personName: string;
  srNo: string;
  date: string;
  indentDate: string;
  to: string;
  purchaseStoreIncharge: string;
  tentativeRequiredDate: string;
  deptHeadSign: string;
  storeInchSign: string;
  plantHeadSign: string;
  items: MaterialIndentItem[];
}

const MaterialIndentSlipForm: React.FC = () => {
  const [formData, setFormData] = useState<MaterialIndentSlipFormData>({
    departmentName: '',
    personName: '',
    srNo: '',
    date: new Date().toISOString().split('T')[0],
    indentDate: new Date().toISOString().split('T')[0],
    to: '',
    purchaseStoreIncharge: '',
    tentativeRequiredDate: '',
    deptHeadSign: '',
    storeInchSign: '',
    plantHeadSign: '',
    items: [
      { id: '1', descriptionSpecification: '', qty: '', uom: '', makeMfgRemarks: '' }
    ]
  });

  const [docNo, setDocNo] = useState('');

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

  const handleInputChange = (field: keyof Omit<MaterialIndentSlipFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof MaterialIndentItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItemRow = () => {
    const newItem: MaterialIndentItem = {
      id: Date.now().toString(),
      descriptionSpecification: '',
      qty: '',
      uom: '',
      makeMfgRemarks: ''
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
      const slipData = {
        doc_no: docNo,
        date: formData.date,
        department_name: formData.departmentName,
        person_name: formData.personName,
        sr_no: formData.srNo,
        indent_date: formData.indentDate,
        to_address: formData.to,
        purchase_store_incharge: formData.purchaseStoreIncharge || undefined,
        tentative_required_date: formData.tentativeRequiredDate || undefined,
        dept_head_sign: formData.deptHeadSign || undefined,
        store_inch_sign: formData.storeInchSign || undefined,
        plant_head_sign: formData.plantHeadSign || undefined
      };

      const itemsData = formData.items
        .filter(item => item.descriptionSpecification.trim() !== '')
        .map(item => ({
          description_specification: item.descriptionSpecification,
          qty: item.qty ? parseFloat(item.qty) : undefined,
          uom: item.uom || undefined,
          make_mfg_remarks: item.makeMfgRemarks || undefined
        }));

      await materialIndentSlipAPI.create(slipData, itemsData);
      alert('Material Indent Slip saved successfully!');
      
      // Reset form
      setFormData({
        departmentName: '',
        personName: '',
        srNo: '',
        date: new Date().toISOString().split('T')[0],
        indentDate: new Date().toISOString().split('T')[0],
        to: '',
        purchaseStoreIncharge: '',
        tentativeRequiredDate: '',
        deptHeadSign: '',
        storeInchSign: '',
        plantHeadSign: '',
        items: [{ id: '1', descriptionSpecification: '', qty: '', uom: '', makeMfgRemarks: '' }]
      });
    } catch (error) {
      console.error('Error saving material indent slip:', error);
      alert('Error saving material indent slip. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-5xl mx-auto">
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
          <h2 className="text-3xl font-bold text-gray-900">MATERIAL INDENT SLIP</h2>
        </div>

        {/* Request Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department Name :-
            </label>
            <input
              type="text"
              value={formData.departmentName}
              onChange={(e) => handleInputChange('departmentName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Person Name :-
            </label>
            <input
              type="text"
              value={formData.personName}
              onChange={(e) => handleInputChange('personName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
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
              Date :-
            </label>
            <input
              type="date"
              value={formData.indentDate}
              onChange={(e) => handleInputChange('indentDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* To Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To.
          </label>
          <textarea
            value={formData.to}
            onChange={(e) => handleInputChange('to', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
            required
          />
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase / Store Incharge
            </label>
            <input
              type="text"
              value={formData.purchaseStoreIncharge}
              onChange={(e) => handleInputChange('purchaseStoreIncharge', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="mt-2 text-sm text-gray-700">
            We Required the Following material. Please arrange supply the same.
          </p>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-16">Sr. No.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">DESCRIPTION / SPECIFICATION</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-24">QTY.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-24">UOM</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Make / Mfg./ Remarks</th>
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
                      value={item.descriptionSpecification}
                      onChange={(e) => handleItemChange(item.id, 'descriptionSpecification', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.qty}
                      onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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
                      value={item.makeMfgRemarks}
                      onChange={(e) => handleItemChange(item.id, 'makeMfgRemarks', e.target.value)}
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
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tentative Required Date :-
            </label>
            <input
              type="date"
              value={formData.tentativeRequiredDate}
              onChange={(e) => handleInputChange('tentativeRequiredDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-3 gap-6 mt-8 border-t border-gray-300 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dept. Head Sign.
            </label>
            <input
              type="text"
              value={formData.deptHeadSign}
              onChange={(e) => handleInputChange('deptHeadSign', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Inch. Sign.
            </label>
            <input
              type="text"
              value={formData.storeInchSign}
              onChange={(e) => handleInputChange('storeInchSign', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plant Head Sign.
            </label>
            <input
              type="text"
              value={formData.plantHeadSign}
              onChange={(e) => handleInputChange('plantHeadSign', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

export default MaterialIndentSlipForm;

