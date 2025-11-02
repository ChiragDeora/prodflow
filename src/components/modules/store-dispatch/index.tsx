'use client';

import React, { useState } from 'react';
import { Warehouse, Truck, ShoppingCart, Search, Filter, FileText, History, User, Package } from 'lucide-react';
import DispatchMemoForm from './DispatchMemoForm';
import DeliveryChallanForm from './DeliveryChallanForm';
import DispatchHistory from './DispatchHistory';
import VendorRegistrationForm from './VendorRegistrationForm';
import MaterialIndentSlipForm from './MaterialIndentSlipForm';
import PurchaseOrderForm from './PurchaseOrderForm';
import PurchaseHistory from './PurchaseHistory';
import GRNForm from './GRNForm';
import MISForm from './MISForm';
import FGNForm from './FGNForm';
import StoreHistory from './StoreHistory';

interface StoreDispatchModuleProps {
  // Add any props if needed
}

const StoreDispatchModule: React.FC<StoreDispatchModuleProps> = () => {
  const [activeTab, setActiveTab] = useState('store');
  const [storeSubTab, setStoreSubTab] = useState<'grn' | 'mis' | 'fgn' | 'history' | null>(null);
  const [dispatchSubTab, setDispatchSubTab] = useState<'memo' | 'challan' | 'history' | null>(null);
  const [purchaseSubTab, setPurchaseSubTab] = useState<'vrf' | 'indent' | 'po' | 'history' | null>(null);

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('store')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'store'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Warehouse className="w-5 h-5 inline mr-2" />
            Store
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'dispatch'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-5 h-5 inline mr-2" />
            Dispatch
          </button>
          <button
            onClick={() => setActiveTab('purchase')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'purchase'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-5 h-5 inline mr-2" />
            Purchase
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'store' && (
          <div className="space-y-6">
            {!storeSubTab ? (
              <>
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Store</h2>
                </div>

                {/* Store Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* GRN Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setStoreSubTab('grn')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                        <Package className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">GRN</h3>
                        <p className="text-sm text-gray-500">Goods Received Note</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Receipt Document</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setStoreSubTab('grn');
                      }}
                      className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create GRN
                    </button>
                  </div>

                  {/* MIS Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setStoreSubTab('mis')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">MIS</h3>
                        <p className="text-sm text-gray-500">Material Issue Slip</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Issue Document</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setStoreSubTab('mis');
                      }}
                      className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create MIS
                    </button>
                  </div>

                  {/* FGN Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setStoreSubTab('fgn')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                        <ShoppingCart className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">FGN</h3>
                        <p className="text-sm text-gray-500">Finished Goods Transfer Note</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Transfer Document</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setStoreSubTab('fgn');
                      }}
                      className="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Create FGN
                    </button>
                  </div>

                  {/* History Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setStoreSubTab('history')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                        <History className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">History</h3>
                        <p className="text-sm text-gray-500">View past records</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Records:</span>
                        <span className="font-medium">All Forms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Filter:</span>
                        <span className="font-medium">By Date/Year</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setStoreSubTab('history');
                      }}
                      className="w-full mt-4 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      View History
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Back Button */}
                <div className="flex items-center mb-4">
                  <button
                    onClick={() => setStoreSubTab(null)}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    <span>←</span> Back to Store
                  </button>
                </div>
                {/* Store Content */}
                <div className="flex-1 overflow-auto">
                  {storeSubTab === 'grn' && <GRNForm />}
                  {storeSubTab === 'mis' && <MISForm />}
                  {storeSubTab === 'fgn' && <FGNForm />}
                  {storeSubTab === 'history' && <StoreHistory />}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'dispatch' && (
          <div className="space-y-6">
            {!dispatchSubTab ? (
              <>
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Dispatch</h2>
                </div>

                {/* Dispatch Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Dispatch Memo Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setDispatchSubTab('memo')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Dispatch Memo</h3>
                        <p className="text-sm text-gray-500">Create and manage dispatch memos</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Internal Memo</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Purpose:</span>
                        <span className="font-medium">Dispatch Tracking</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDispatchSubTab('memo');
                      }}
                      className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Dispatch Memo
                    </button>
                  </div>

                  {/* Delivery Challan Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setDispatchSubTab('challan')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                        <Truck className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Delivery Challan</h3>
                        <p className="text-sm text-gray-500">Generate delivery challans for goods</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Delivery Document</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Purpose:</span>
                        <span className="font-medium">Goods Dispatch</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDispatchSubTab('challan');
                      }}
                      className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create Delivery Challan
                    </button>
                  </div>

                  {/* History Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setDispatchSubTab('history')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                        <History className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">History</h3>
                        <p className="text-sm text-gray-500">View past dispatch records</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Records:</span>
                        <span className="font-medium">All Forms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Filter:</span>
                        <span className="font-medium">By Date/Year</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDispatchSubTab('history');
                      }}
                      className="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      View History
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Back Button */}
                <div className="flex items-center mb-4">
                  <button
                    onClick={() => setDispatchSubTab(null)}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    <span>←</span> Back to Dispatch
                  </button>
                </div>
                {/* Dispatch Content */}
                <div className="flex-1 overflow-auto">
                  {dispatchSubTab === 'memo' && <DispatchMemoForm />}
                  {dispatchSubTab === 'challan' && <DeliveryChallanForm />}
                  {dispatchSubTab === 'history' && <DispatchHistory />}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'purchase' && (
          <div className="space-y-6">
            {!purchaseSubTab ? (
              <>
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Purchase</h2>
                </div>

                {/* Purchase Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Vendor Registration Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setPurchaseSubTab('vrf')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                        <User className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">VRF</h3>
                        <p className="text-sm text-gray-500">Vendor Registration</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Registration</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPurchaseSubTab('vrf');
                      }}
                      className="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Create VRF
                    </button>
                  </div>

                  {/* Material Indent Slip Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setPurchaseSubTab('indent')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Material Indent</h3>
                        <p className="text-sm text-gray-500">Material Indent Slip</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Material Request</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPurchaseSubTab('indent');
                      }}
                      className="w-full mt-4 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Create Indent
                    </button>
                  </div>

                  {/* Purchase Order Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setPurchaseSubTab('po')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <ShoppingCart className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Purchase Order</h3>
                        <p className="text-sm text-gray-500">Create Purchase Order</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">PO Document</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPurchaseSubTab('po');
                      }}
                      className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create PO
                    </button>
                  </div>

                  {/* History Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setPurchaseSubTab('history')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                        <History className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">History</h3>
                        <p className="text-sm text-gray-500">View past records</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Records:</span>
                        <span className="font-medium">All Forms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Filter:</span>
                        <span className="font-medium">By Date/Year</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPurchaseSubTab('history');
                      }}
                      className="w-full mt-4 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      View History
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Back Button */}
                <div className="flex items-center mb-4">
                  <button
                    onClick={() => setPurchaseSubTab(null)}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    <span>←</span> Back to Purchase
                  </button>
                </div>
                {/* Purchase Content */}
                <div className="flex-1 overflow-auto">
                  {purchaseSubTab === 'vrf' && <VendorRegistrationForm />}
                  {purchaseSubTab === 'indent' && <MaterialIndentSlipForm />}
                  {purchaseSubTab === 'po' && <PurchaseOrderForm />}
                  {purchaseSubTab === 'history' && <PurchaseHistory />}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreDispatchModule;

