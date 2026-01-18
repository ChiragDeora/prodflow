'use client';

import React from 'react';
import { Warehouse, Truck, ShoppingCart, Search, Filter, FileText, History, User, Package, ArrowDownCircle, ArrowUpCircle, ArrowRightCircle, DollarSign, BookOpen } from 'lucide-react';
import DispatchMemoForm from './DispatchMemoForm';
import DeliveryChallanForm from './DeliveryChallanForm';
import DispatchHistory from './DispatchHistory';
import SalesHistory from './SalesHistory';
import VendorRegistrationForm from './VendorRegistrationForm';
import MaterialIndentSlipForm from './MaterialIndentSlipForm';
import PurchaseOrderForm from './PurchaseOrderForm';
import PurchaseHistory from './PurchaseHistory';
import GRNForm from './GRNForm';
import JWAnnexureGRNForm from './JWAnnexureGRNForm';
import MISForm from './MISForm';
import FGNForm from './FGNForm';
import JobWorkChallanForm from './JobWorkChallanForm';
import OpenIndent from './OpenIndent';
import StoreHistory from './StoreHistory';
import OrderBookForm from './OrderBookForm';
import { StoreDispatchProvider, useStoreDispatch } from './StoreDispatchContext';

interface StoreDispatchModuleProps {
  // Callback to collapse sidebar when sub nav is clicked
  onSubNavClick?: () => void;
}

const StoreDispatchContent: React.FC<StoreDispatchModuleProps> = ({ onSubNavClick }) => {
  const {
    activeTab,
    setActiveTab,
    purchaseSubTab,
    setPurchaseSubTab,
    inwardSubTab,
    setInwardSubTab,
    outwardSubTab,
    setOutwardSubTab,
    salesSubTab,
    setSalesSubTab,
  } = useStoreDispatch();

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation (never print) */}
      <div className="border-b border-gray-200 bg-white app-subnav">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('purchase');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'purchase'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-5 h-5 inline mr-2" />
            Purchase
          </button>
          <button
            onClick={() => {
              setActiveTab('inward');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'inward'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowDownCircle className="w-5 h-5 inline mr-2" />
            Inward
          </button>
          <button
            onClick={() => {
              setActiveTab('outward');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'outward'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowUpCircle className="w-5 h-5 inline mr-2" />
            Outward
          </button>
          <button
            onClick={() => {
              setActiveTab('sales');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'sales'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-5 h-5 inline mr-2" />
            Sales
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'purchase' && (
          <div className="space-y-6">
            {!purchaseSubTab ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-blue-900">Purchase Management</h2>
                  <p className="text-sm text-gray-500">Material procurement and vendor management</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Material Indent Card */}
                  <div 
                    className="bg-white rounded-lg border border-blue-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setPurchaseSubTab('indent')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Material Indent</h3>
                        <p className="text-sm text-gray-500">Material Request</p>
                      </div>
                    </div>
                    <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors">
                      Create Indent
                    </button>
                  </div>

                  {/* Purchase Order Card */}
                  <div 
                    className="bg-white rounded-lg border border-blue-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setPurchaseSubTab('po')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <ShoppingCart className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Purchase Order</h3>
                        <p className="text-sm text-gray-500">Capital & Operational PO</p>
                      </div>
                    </div>
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                      Create PO
                    </button>
                  </div>

                  {/* Open Indent Card */}
                  <div 
                    className="bg-white rounded-lg border border-blue-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setPurchaseSubTab('open-indent')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                        <Package className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Open Indent</h3>
                        <p className="text-sm text-gray-500">Pending Quantities</p>
                      </div>
                    </div>
                    <button className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors">
                      View Open Indent
                    </button>
                  </div>

                  {/* History Card */}
                  <div 
                    className="bg-white rounded-lg border border-blue-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
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
                    <p className="text-sm text-gray-600 mb-4">
                      View and search all previous purchase records with filtering options.
                    </p>
                    <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                      View History
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Back bar - hide on print */}
                <div className="flex items-center mb-4 print:hidden">
                  <button
                    onClick={() => setPurchaseSubTab(null)}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    <span>←</span> Back to Purchase
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {purchaseSubTab === 'indent' && <MaterialIndentSlipForm />}
                  {purchaseSubTab === 'po' && <PurchaseOrderForm />}
                  {purchaseSubTab === 'open-indent' && <OpenIndent />}
                  {purchaseSubTab === 'history' && <PurchaseHistory />}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'inward' && (
          <div className="space-y-6">
            {!inwardSubTab ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-green-900">Inward Management</h2>
                  <p className="text-sm text-gray-500">Material receipt and goods received notes</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Normal GRN Card */}
                  <div 
                    className="bg-white rounded-lg border border-green-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setInwardSubTab('normal-grn')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                        <Package className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Normal GRN</h3>
                        <p className="text-sm text-gray-500">For In-house Materials</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Create GRN for materials received for in-house production processes. Links to Material Indent Slip.
                    </p>
                    <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                      Create Normal GRN
                    </button>
                  </div>

                  {/* JW Annexure GRN Card */}
                  <div 
                    className="bg-white rounded-lg border border-green-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setInwardSubTab('jw-annexure-grn')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <ArrowRightCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">JW Annexure GRN</h3>
                        <p className="text-sm text-gray-500">For Outsourced Job Work</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Create GRN for materials received from outsourced job work. Links to Material Indent Slip.
                    </p>
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                      Create JW Annexure GRN
                    </button>
                  </div>

                  {/* History Card */}
                  <div 
                    className="bg-white rounded-lg border border-green-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setInwardSubTab('history')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                        <History className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">History</h3>
                        <p className="text-sm text-gray-500">View past GRNs</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      View and search all previous GRN records with filtering options.
                    </p>
                    <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                      View History
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Back bar - hide on print */}
                <div className="flex items-center mb-4 print:hidden">
                  <button
                    onClick={() => setInwardSubTab(null)}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    <span>←</span> Back to Inward
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {inwardSubTab === 'normal-grn' && <GRNForm />}
                  {inwardSubTab === 'jw-annexure-grn' && <JWAnnexureGRNForm />}
                  {inwardSubTab === 'history' && <StoreHistory />}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'outward' && (
          <div className="space-y-6">
            {!outwardSubTab ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-orange-900">Outward Management</h2>
                  <p className="text-sm text-gray-500">Material dispatch and delivery management</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Issue Slip Card */}
                  <div 
                    className="bg-white rounded-lg border border-orange-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setOutwardSubTab('mis')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Issue Slip</h3>
                        <p className="text-sm text-gray-500">Issue materials to departments</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Issue materials from store to production departments.
                    </p>
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                      Create Issue Slip
                    </button>
                  </div>

                  {/* Job Work Challan Card */}
                  <div 
                    className="bg-white rounded-lg border border-orange-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setOutwardSubTab('job-work-challan')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                        <ArrowRightCircle className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Job Work Challan</h3>
                        <p className="text-sm text-gray-500">GST Compliant</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Send materials for job work with GST compliance documentation.
                    </p>
                    <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors">
                      Create Job Work Challan
                    </button>
                  </div>

                  {/* Delivery Challan Card */}
                  <div 
                    className="bg-white rounded-lg border border-orange-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setOutwardSubTab('delivery-challan-dispatch')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                        <Truck className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Delivery Challan</h3>
                        <p className="text-sm text-gray-500">Goods Dispatch</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Generate delivery challans for dispatching finished goods.
                    </p>
                    <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                      Create Delivery Challan
                    </button>
                  </div>

                  {/* History Card */}
                  <div 
                    className="bg-white rounded-lg border border-orange-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setOutwardSubTab('history')}
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
                    <p className="text-sm text-gray-600 mb-4">
                      View and search all previous outward records with filtering options.
                    </p>
                    <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                      View History
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Back bar - hide on print */}
                <div className="flex items-center mb-4 print:hidden">
                  <button
                    onClick={() => setOutwardSubTab(null)}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    <span>←</span> Back to Outward
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {outwardSubTab === 'mis' && <MISForm />}
                  {outwardSubTab === 'job-work-challan' && <JobWorkChallanForm />}
                  {outwardSubTab === 'delivery-challan-dispatch' && <DeliveryChallanForm />}
                  {outwardSubTab === 'history' && <DispatchHistory />}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-6">
            {!salesSubTab ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-purple-900">Sales Management</h2>
                  <p className="text-sm text-gray-500">Order tracking and dispatch management</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Dispatch Memo Card */}
                  <div 
                    className="bg-white rounded-lg border border-purple-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSalesSubTab('dispatch-memo')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Dispatch Memo</h3>
                        <p className="text-sm text-gray-500">Internal Memo</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Create and manage dispatch memos for internal tracking.
                    </p>
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                      Create Dispatch Memo
                    </button>
                  </div>

                  {/* Order Book Card */}
                  <div 
                    className="bg-white rounded-lg border border-purple-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSalesSubTab('order-book')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                        <BookOpen className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Order Book</h3>
                        <p className="text-sm text-gray-500">Track Customer Orders</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Track and manage customer orders with PO numbers, part codes, and delivery schedules.
                    </p>
                    <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                      Create Order Book Entry
                    </button>
                  </div>

                  {/* History Card */}
                  <div 
                    className="bg-white rounded-lg border border-purple-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSalesSubTab('history')}
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
                    <p className="text-sm text-gray-600 mb-4">
                      View and search all previous sales records with filtering options.
                    </p>
                    <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                      View History
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center mb-4">
                  <button
                    onClick={() => setSalesSubTab(null)}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    <span>←</span> Back to Sales
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {salesSubTab === 'dispatch-memo' && <DispatchMemoForm />}
                  {salesSubTab === 'order-book' && <OrderBookForm />}
                  {salesSubTab === 'history' && <SalesHistory />}
                </div>
              </>
            )}
          </div>
        )}


      </div>
    </div>
  );
};

// Main component wrapped with provider
const StoreDispatchModule: React.FC<StoreDispatchModuleProps> = ({ onSubNavClick }) => {
  return (
    <StoreDispatchProvider>
      <StoreDispatchContent onSubNavClick={onSubNavClick} />
    </StoreDispatchProvider>
  );
};

export default StoreDispatchModule;
