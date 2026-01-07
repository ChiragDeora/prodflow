'use client';

import React, { useState } from 'react';
import { Save, Printer, RefreshCw } from 'lucide-react';
import { vendorRegistrationAPI } from '../../../lib/supabase';
import PrintHeader from '../../shared/PrintHeader';

interface VendorRegistrationFormData {
  customerName: string;
  address: string;
  state: string;
  stateCode: string;
  contactNo: string;
  emailId: string;
  gstNo: string;
  panNo: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  customerSupplier: 'Customer' | 'Supplier' | '';
}

const VendorRegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState<VendorRegistrationFormData>({
    customerName: '',
    address: '',
    state: '',
    stateCode: '',
    contactNo: '',
    emailId: '',
    gstNo: '',
    panNo: '',
    bankName: '',
    bankAccountNumber: '',
    ifscCode: '',
    customerSupplier: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const handleInputChange = (field: keyof VendorRegistrationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Sync all existing vendor registrations to appropriate master tables
  const handleSyncToMasters = async () => {
    setIsSyncing(true);
    try {
      // Fetch all vendor registrations
      const registrations = await vendorRegistrationAPI.getAll();
      
      let customersCreated = 0;
      let customersUpdated = 0;
      let vendorsCreated = 0;
      let vendorsUpdated = 0;
      
      for (const reg of registrations) {
        if (reg.customer_supplier === 'Customer') {
          try {
            // Check if customer already exists
            const customersResponse = await fetch('/api/masters/customers');
            const customersResult = await customersResponse.json();
            
            if (customersResult.success) {
              const existingCustomer = customersResult.data.find(
                (c: any) => c.customer_name?.toLowerCase() === reg.customer_name?.toLowerCase()
              );
              
              const customerData = {
                customer_name: reg.customer_name,
                address: reg.address,
                state: reg.state || undefined,
                state_code: reg.state_code || undefined,
                phone: reg.contact_no || undefined,
                email: reg.email_id || undefined,
                gst_number: reg.gst_no || undefined,
                pan_number: reg.pan_no || undefined,
              };
              
              if (existingCustomer) {
                await fetch(`/api/masters/customers/${existingCustomer.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(customerData),
                });
                customersUpdated++;
              } else {
                await fetch('/api/masters/customers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(customerData),
                });
                customersCreated++;
              }
            }
          } catch (error) {
            console.error('Error syncing customer:', reg.customer_name, error);
          }
        } else if (reg.customer_supplier === 'Supplier') {
          try {
            // Check if vendor already exists
            const vendorsResponse = await fetch('/api/masters/vendors');
            const vendorsResult = await vendorsResponse.json();
            
            if (vendorsResult.success) {
              const existingVendor = vendorsResult.data.find(
                (v: any) => v.vendor_name?.toLowerCase() === reg.customer_name?.toLowerCase()
              );
              
              const vendorData = {
                vendor_name: reg.customer_name,
                address: reg.address,
                state: reg.state || undefined,
                state_code: reg.state_code || undefined,
                phone: reg.contact_no || undefined,
                email: reg.email_id || undefined,
                gst_number: reg.gst_no || undefined,
                pan_number: reg.pan_no || undefined,
                bank_name: reg.bank_name || undefined,
                bank_account: reg.bank_account_number || undefined,
                ifsc_code: reg.ifsc_code || undefined,
              };
              
              if (existingVendor) {
                await fetch(`/api/masters/vendors/${existingVendor.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(vendorData),
                });
                vendorsUpdated++;
              } else {
                await fetch('/api/masters/vendors', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(vendorData),
                });
                vendorsCreated++;
              }
            }
          } catch (error) {
            console.error('Error syncing vendor:', reg.customer_name, error);
          }
        }
      }
      
      alert(`Sync completed!\nCustomers: ${customersCreated} created, ${customersUpdated} updated\nVendors: ${vendorsCreated} created, ${vendorsUpdated} updated`);
    } catch (error) {
      console.error('Error syncing to masters:', error);
      alert('Error syncing to masters. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vendorData = {
        customer_name: formData.customerName,
        address: formData.address,
        state: formData.state || undefined,
        state_code: formData.stateCode || undefined,
        contact_no: formData.contactNo || undefined,
        email_id: formData.emailId || undefined,
        gst_no: formData.gstNo || undefined,
        pan_no: formData.panNo || undefined,
        bank_name: formData.bankName || undefined,
        bank_account_number: formData.bankAccountNumber || undefined,
        ifsc_code: formData.ifscCode || undefined,
        customer_supplier: formData.customerSupplier as 'Customer' | 'Supplier' | undefined
      };

      // Save vendor registration first
      await vendorRegistrationAPI.create(vendorData);
      
      // Update customer master or vendor master based on selection
      if (formData.customerSupplier === 'Customer') {
        try {
          // Check if customer already exists by name
          const customersResponse = await fetch('/api/masters/customers');
          const customersResult = await customersResponse.json();
          
          if (customersResult.success) {
            const existingCustomer = customersResult.data.find(
              (c: any) => c.customer_name?.toLowerCase() === formData.customerName.toLowerCase()
            );
            
            const customerData = {
              customer_name: formData.customerName,
              address: formData.address,
              state: formData.state || undefined,
              state_code: formData.stateCode || undefined,
              phone: formData.contactNo || undefined,
              email: formData.emailId || undefined,
              gst_number: formData.gstNo || undefined,
              pan_number: formData.panNo || undefined,
            };
            
            if (existingCustomer) {
              // Update existing customer
              const updateResponse = await fetch(`/api/masters/customers/${existingCustomer.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData),
              });
              const updateResult = await updateResponse.json();
              if (updateResult.success) {
                console.log('✅ Customer master updated:', existingCustomer.id);
              }
            } else {
              // Create new customer
              const createResponse = await fetch('/api/masters/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData),
              });
              const createResult = await createResponse.json();
              if (createResult.success) {
                console.log('✅ Customer master created:', createResult.data.id);
              }
            }
          }
        } catch (error) {
          console.error('Error updating customer master:', error);
          // Don't fail the whole operation if master update fails
        }
      } else if (formData.customerSupplier === 'Supplier') {
        try {
          // Check if vendor already exists by name
          const vendorsResponse = await fetch('/api/masters/vendors');
          const vendorsResult = await vendorsResponse.json();
          
          if (vendorsResult.success) {
            const existingVendor = vendorsResult.data.find(
              (v: any) => v.vendor_name?.toLowerCase() === formData.customerName.toLowerCase()
            );
            
            const vendorMasterData = {
              vendor_name: formData.customerName,
              address: formData.address,
              state: formData.state || undefined,
              state_code: formData.stateCode || undefined,
              phone: formData.contactNo || undefined,
              email: formData.emailId || undefined,
              gst_number: formData.gstNo || undefined,
              pan_number: formData.panNo || undefined,
              bank_name: formData.bankName || undefined,
              bank_account: formData.bankAccountNumber || undefined,
              ifsc_code: formData.ifscCode || undefined,
            };
            
            if (existingVendor) {
              // Update existing vendor
              const updateResponse = await fetch(`/api/masters/vendors/${existingVendor.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendorMasterData),
              });
              const updateResult = await updateResponse.json();
              if (updateResult.success) {
                console.log('✅ Vendor master updated:', existingVendor.id);
              }
            } else {
              // Create new vendor
              const createResponse = await fetch('/api/masters/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendorMasterData),
              });
              const createResult = await createResponse.json();
              if (createResult.success) {
                console.log('✅ Vendor master created:', createResult.data.id);
              }
            }
          }
        } catch (error) {
          console.error('Error updating vendor master:', error);
          // Don't fail the whole operation if master update fails
        }
      }
      
      alert('Vendor Registration saved successfully!');
      
      // Reset form
      setFormData({
        customerName: '',
        address: '',
        state: '',
        stateCode: '',
        contactNo: '',
        emailId: '',
        gstNo: '',
        panNo: '',
        bankName: '',
        bankAccountNumber: '',
        ifscCode: '',
        customerSupplier: ''
      });
    } catch (error) {
      console.error('Error saving vendor registration:', error);
      alert('Error saving vendor registration. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="print:p-8">
        {/* Print Header - Only visible when printing/exporting */}
        <PrintHeader />
        
        {/* Main Title */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State :
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Dadra & Nagar Haveli and Daman & Diu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State Code :
              </label>
              <input
                type="text"
                value={formData.stateCode}
                onChange={(e) => handleInputChange('stateCode', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 26"
              />
            </div>
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
        </div>

        {/* Bank Details Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Bank Details</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name :
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank A/c No :
                </label>
                <input
                  type="text"
                  value={formData.bankAccountNumber}
                  onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC No. :
                </label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={11}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Customer/Supplier Field */}
        <div className="mt-8 pt-8 border-t border-gray-200">
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

        {/* Action Buttons */}
        <div className="flex justify-between mt-8 print:hidden">
          <button
            type="button"
            onClick={handleSyncToMasters}
            disabled={isSyncing}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync All to Masters'}
          </button>
          <div className="flex gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print / Export
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default VendorRegistrationForm;

