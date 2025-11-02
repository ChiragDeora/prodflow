'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { grnAPI } from '../../../lib/supabase';

interface GRNItem {
  id: string;
  itemDescription: string;
  boxBag: string;
  perBoxBagQty: string;
  totalQty: string;
  uom: string;
  remarks: string;
}

interface GRNFormData {
  supplierName: string;
  poNo: string;
  poDate: string;
  invoiceNo: string;
  invoiceDate: string;
  typeOfMaterial: 'RM' | 'PM' | 'STORE' | '';
  grnNo: string;
  grnDate: string;
  receivedBy: string;
  verifiedBy: string;
  items: GRNItem[];
}

const GRNForm: React.FC = () => {
  const [formData, setFormData] = useState<GRNFormData>({
    supplierName: '',
    poNo: '',
    poDate: '',
    invoiceNo: '',
    invoiceDate: '',
    typeOfMaterial: '',
    grnNo: '',
    grnDate: new Date().toISOString().split('T')[0],
    receivedBy: '',
    verifiedBy: '',
    items: [
      { id: '1', itemDescription: '', boxBag: '', perBoxBagQty: '', totalQty: '', uom: '', remarks: '' }
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

  const handleInputChange = (field: keyof Omit<GRNFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof GRNItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Auto-calculate total qty if per box/bag qty and box/bag are provided
          if ((field === 'boxBag' || field === 'perBoxBagQty') && updatedItem.boxBag && updatedItem.perBoxBagQty) {
            const boxes = parseFloat(updatedItem.boxBag) || 0;
            const qtyPerBox = parseFloat(updatedItem.perBoxBagQty) || 0;
            updatedItem.totalQty = (boxes * qtyPerBox).toString();
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const addItemRow = () => {
    const newItem: GRNItem = {
      id: Date.now().toString(),
      itemDescription: '',
      boxBag: '',
      perBoxBagQty: '',
      totalQty: '',
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
      const grnData = {
        doc_no: docNo,
        date: date,
        supplier_name: formData.supplierName,
        po_no: formData.poNo || undefined,
        po_date: formData.poDate || undefined,
        invoice_no: formData.invoiceNo || undefined,
        invoice_date: formData.invoiceDate || undefined,
        type_of_material: formData.typeOfMaterial as 'RM' | 'PM' | 'STORE' | undefined,
        grn_no: formData.grnNo || undefined,
        grn_date: formData.grnDate || undefined,
        received_by: formData.receivedBy || undefined,
        verified_by: formData.verifiedBy || undefined
      };

      const itemsData = formData.items
        .filter(item => item.itemDescription.trim() !== '')
        .map(item => ({
          item_description: item.itemDescription,
          box_bag: item.boxBag || undefined,
          per_box_bag_qty: item.perBoxBagQty ? parseFloat(item.perBoxBagQty) : undefined,
          total_qty: item.totalQty ? parseFloat(item.totalQty) : undefined,
          uom: item.uom || undefined,
          remarks: item.remarks || undefined
        }));

      await grnAPI.create(grnData, itemsData);
      alert('GRN saved successfully!');
      
      // Reset form
      setFormData({
        supplierName: '',
        poNo: '',
        poDate: '',
        invoiceNo: '',
        invoiceDate: '',
        typeOfMaterial: '',
        grnNo: '',
        grnDate: new Date().toISOString().split('T')[0],
        receivedBy: '',
        verifiedBy: '',
        items: [{ id: '1', itemDescription: '', boxBag: '', perBoxBagQty: '', totalQty: '', uom: '', remarks: '' }]
      });
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error saving GRN:', error);
      alert('Error saving GRN. Please try again.');
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
              <span className="font-semibold">Doc. No.:</span>{' '}
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
          <h2 className="text-3xl font-bold text-gray-900">GOODS RECEIVED NOTE (GRN)</h2>
        </div>

        {/* Supplier and Invoice Details Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name :-
            </label>
            <input
              type="text"
              value={formData.supplierName}
              onChange={(e) => handleInputChange('supplierName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO No. :-
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
              PO Date :-
            </label>
            <input
              type="date"
              value={formData.poDate}
              onChange={(e) => handleInputChange('poDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice No. :-
            </label>
            <input
              type="text"
              value={formData.invoiceNo}
              onChange={(e) => handleInputChange('invoiceNo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Date. :-
            </label>
            <input
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type of Material :-
            </label>
            <select
              value={formData.typeOfMaterial}
              onChange={(e) => handleInputChange('typeOfMaterial', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select...</option>
              <option value="RM">RM</option>
              <option value="PM">PM</option>
              <option value="STORE">STORE</option>
            </select>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-16">SR. No.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">ITEM DECRIPTION</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-24">Box / Bag</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-32">Per Box / Bag Qty.</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-32">Total Qty.</th>
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
                      value={item.itemDescription}
                      onChange={(e) => handleItemChange(item.id, 'itemDescription', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.boxBag}
                      onChange={(e) => handleItemChange(item.id, 'boxBag', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={item.perBoxBagQty}
                      onChange={(e) => handleItemChange(item.id, 'perBoxBagQty', e.target.value)}
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
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>

        {/* Footer Section */}
        <div className="grid grid-cols-2 gap-6 mt-8 border-t border-gray-300 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Received By
            </label>
            <input
              type="text"
              value={formData.receivedBy}
              onChange={(e) => handleInputChange('receivedBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verified By
            </label>
            <input
              type="text"
              value={formData.verifiedBy}
              onChange={(e) => handleInputChange('verifiedBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GRN NO. :-
            </label>
            <input
              type="text"
              value={formData.grnNo}
              onChange={(e) => handleInputChange('grnNo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DATE :-
            </label>
            <input
              type="date"
              value={formData.grnDate}
              onChange={(e) => handleInputChange('grnDate', e.target.value)}
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

export default GRNForm;

