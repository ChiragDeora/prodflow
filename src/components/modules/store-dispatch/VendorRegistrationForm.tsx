'use client';

import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { vendorRegistrationAPI } from '../../../lib/supabase';

interface VendorRegistrationFormData {
  customerName: string;
  address: string;
  contactNo: string;
  emailId: string;
  gstNo: string;
  panNo: string;
  customerSupplier: 'Customer' | 'Supplier' | '';
}

const VendorRegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState<VendorRegistrationFormData>({
    customerName: '',
    address: '',
    contactNo: '',
    emailId: '',
    gstNo: '',
    panNo: '',
    customerSupplier: ''
  });

  const handleInputChange = (field: keyof VendorRegistrationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vendorData = {
        customer_name: formData.customerName,
        address: formData.address,
        contact_no: formData.contactNo || undefined,
        email_id: formData.emailId || undefined,
        gst_no: formData.gstNo || undefined,
        pan_no: formData.panNo || undefined,
        customer_supplier: formData.customerSupplier as 'Customer' | 'Supplier' | undefined
      };

      await vendorRegistrationAPI.create(vendorData);
      alert('Vendor Registration saved successfully!');
      
      // Reset form
      setFormData({
        customerName: '',
        address: '',
        contactNo: '',
        emailId: '',
        gstNo: '',
        panNo: '',
        customerSupplier: ''
      });
    } catch (error) {
      console.error('Error saving vendor registration:', error);
      alert('Error saving vendor registration. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Customer / Vendor Registration Form</h2>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name :
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address :
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact. No.:
            </label>
            <input
              type="tel"
              value={formData.contactNo}
              onChange={(e) => handleInputChange('contactNo', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email. ID :
            </label>
            <input
              type="email"
              value={formData.emailId}
              onChange={(e) => handleInputChange('emailId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST No.:
            </label>
            <input
              type="text"
              value={formData.gstNo}
              onChange={(e) => handleInputChange('gstNo', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PAN No :
            </label>
            <input
              type="text"
              value={formData.panNo}
              onChange={(e) => handleInputChange('panNo', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer/Supplier :-
            </label>
            <select
              value={formData.customerSupplier}
              onChange={(e) => handleInputChange('customerSupplier', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select...</option>
              <option value="Customer">Customer</option>
              <option value="Supplier">Supplier</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end mt-8 print:hidden">
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

export default VendorRegistrationForm;

