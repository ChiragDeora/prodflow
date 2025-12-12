'use client';

import React, { useState } from 'react';
import { 
  Users, Truck, FileText, Plus, Search, Filter, Download, Upload, 
  Eye, Edit, Trash2, History, Settings, CheckCircle,
  ChevronRight, ChevronDown, AlertTriangle, Clock,
  Lock, Unlock, Archive, RotateCcw, Building, Phone, Mail,
  MapPin, Globe, Calendar, User, Package, Send, Save
} from 'lucide-react';
import CustomerMaster from '../customer-master';
import VendorMaster from '../vendor-master';
import VendorRegistrationForm from '../store-dispatch/VendorRegistrationForm';

interface CommercialMasterProps {
  // Callback to collapse sidebar when sub nav is clicked
  onSubNavClick?: () => void;
}

const CommercialMaster: React.FC<CommercialMasterProps> = ({ onSubNavClick }) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'vendors' | 'vrf'>('customers');

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('customers');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'customers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Customer Master
          </button>
          <button
            onClick={() => {
              setActiveTab('vendors');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'vendors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-5 h-5 inline mr-2" />
            Vendor Master
          </button>
          <button
            onClick={() => {
              setActiveTab('vrf');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'vrf'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Vendor Registration
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'customers' && <CustomerMaster />}
        {activeTab === 'vendors' && <VendorMaster />}
        {activeTab === 'vrf' && <VendorRegistrationForm />}
      </div>
    </div>
  );
};

export default CommercialMaster;

