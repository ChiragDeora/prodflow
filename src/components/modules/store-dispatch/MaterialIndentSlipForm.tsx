'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { materialIndentSlipAPI } from '../../../lib/supabase';
import PrintHeader from '../../shared/PrintHeader';

interface MaterialIndentItem {
  id: string;
  itemCode: string;
  itemName: string;
  dimension: string;
  packSize: string;
  qty: string;
  uom: string;
  partyName: string;
  colorRemarks: string;
}

interface MaterialIndentSlipFormData {
  identNo: string;
  indentDate: string;
  tentativeDate: string;
  partyName: string;
  address: string;
  state: string;
  gstNo: string;
  deptHeadSign: string;
  storeInchSign: string;
  plantHeadSign: string;
  items: MaterialIndentItem[];
}

const MaterialIndentSlipForm: React.FC = () => {
  const [formData, setFormData] = useState<MaterialIndentSlipFormData>({
    identNo: '',
    indentDate: new Date().toISOString().split('T')[0],
    tentativeDate: '',
    partyName: '',
    address: '',
    state: '',
    gstNo: '',
    deptHeadSign: '',
    storeInchSign: '',
    plantHeadSign: '',
    items: [
      { id: '1', itemCode: '', itemName: '', dimension: '', packSize: '', qty: '', uom: '', partyName: '', colorRemarks: '' }
    ]
  });

  // Generate indent number
  useEffect(() => {
    const generateIdentNo = () => {
      const year = new Date(formData.indentDate || new Date()).getFullYear();
      const month = String(new Date(formData.indentDate || new Date()).getMonth() + 1).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      return `IND-${year}${month}-${random}`;
    };
    if (!formData.identNo) {
      setFormData(prev => ({ ...prev, identNo: generateIdentNo() }));
    }
  }, [formData.indentDate]);

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
      itemCode: '',
      itemName: '',
      dimension: '',
      packSize: '',
      qty: '',
      uom: '',
      partyName: '',
      colorRemarks: ''
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
        ident_no: formData.identNo,
        date: new Date().toISOString().split('T')[0],
        indent_date: formData.indentDate,
        tentative_required_date: formData.tentativeDate || undefined,
        party_name: formData.partyName || undefined,
        address: formData.address || undefined,
        state: formData.state || undefined,
        gst_no: formData.gstNo || undefined,
        dept_head_sign: formData.deptHeadSign || undefined,
        store_inch_sign: formData.storeInchSign || undefined,
        plant_head_sign: formData.plantHeadSign || undefined
      };

      const itemsData = formData.items
        .filter(item => item.itemName.trim() !== '' || item.itemCode.trim() !== '')
        .map(item => ({
          item_code: item.itemCode || undefined,
          item_name: item.itemName || undefined,
          dimension: item.dimension || undefined,
          pack_size: item.packSize || undefined,
          qty: item.qty ? parseFloat(item.qty) : undefined,
          uom: item.uom || undefined,
          party_name: item.partyName || undefined,
          color_remarks: item.colorRemarks || undefined
        }));

      await materialIndentSlipAPI.create(slipData, itemsData);
      alert('Material Indent Slip saved successfully!');
      
      // Reset form
      setFormData({
        identNo: '',
        indentDate: new Date().toISOString().split('T')[0],
        tentativeDate: '',
        partyName: '',
        address: '',
        state: '',
        gstNo: '',
        deptHeadSign: '',
        storeInchSign: '',
        plantHeadSign: '',
        items: [{ id: '1', itemCode: '', itemName: '', dimension: '', packSize: '', qty: '', uom: '', partyName: '', colorRemarks: '' }]
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
    <div className="bg-white rounded-lg shadow p-8 max-w-6xl mx-auto">
      <PrintHeader docNo={formData.identNo} date={formData.indentDate} />
      
      <form onSubmit={handleSubmit} className="print:p-8">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          <div className="flex items-center gap-4">
            <img
              src="/dppl_comapct_logo.jpeg"
              alt="DEORA POLYPLAST LLP Logo"
              width={180}
              height={90}
              className="object-contain print:hidden"
              onError={(e) => {
                console.error('Failed to load logo:', e);
              }}
            />
          </div>
          <div className="text-right text-sm space-y-1">
            <div>
              <span className="font-semibold">Ident No:</span>{' '}
              <input
                type="text"
                value={formData.identNo}
                onChange={(e) => handleInputChange('identNo', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
                required
              />
            </div>
            <div>
              <span className="font-semibold">Indent Date:</span>{' '}
              <input
                type="date"
                value={formData.indentDate}
                onChange={(e) => handleInputChange('indentDate', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <span className="font-semibold">Tentative Date:</span>{' '}
              <input
                type="date"
                value={formData.tentativeDate}
                onChange={(e) => handleInputChange('tentativeDate', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-6 print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900">MATERIAL INDENT SLIP</h2>
        </div>

        {/* Party Details Section */}
        <div className="mb-6 print:mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party Name:
              </label>
              <input
                type="text"
                value={formData.partyName}
                onChange={(e) => handleInputChange('partyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
            <div className="col-span-2">
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

        {/* Items Table */}
        <div className="mb-6 print:mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12">Sl.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Item Code</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Item Name</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Dimension</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Pack Size</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">Qty.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">UOM</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Party Name</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Color / Remarks</th>
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
                      value={item.itemName}
                      onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.dimension}
                      onChange={(e) => handleItemChange(item.id, 'dimension', e.target.value)}
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
                      value={item.qty}
                      onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
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
                      value={item.partyName}
                      onChange={(e) => handleItemChange(item.id, 'partyName', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.colorRemarks}
                      onChange={(e) => handleItemChange(item.id, 'colorRemarks', e.target.value)}
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

        {/* Signature Section */}
        <div className="grid grid-cols-3 gap-6 mt-8 border-t border-gray-300 pt-4 print:mt-6">
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
