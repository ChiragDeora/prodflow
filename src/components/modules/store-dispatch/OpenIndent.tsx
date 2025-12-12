'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react';
import { materialIndentSlipAPI, grnAPI, MaterialIndentSlip, MaterialIndentSlipItem, GRN, GRNItem } from '../../../lib/supabase';

interface OpenIndentItem {
  indentSlip: MaterialIndentSlip;
  indentItem: MaterialIndentSlipItem;
  requestedQty: number;
  receivedQty: number;
  pendingQty: number;
  status: 'pending' | 'partial' | 'completed';
  lastReceived?: string;
}

const OpenIndent: React.FC = () => {
  const [openIndentItems, setOpenIndentItems] = useState<OpenIndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'completed'>('all');
  const [closingIndent, setClosingIndent] = useState<string | null>(null);

  useEffect(() => {
    fetchOpenIndentData();
  }, []);

  const fetchOpenIndentData = async () => {
    try {
      setLoading(true);
      
      // Use the new getOpenIndents API method that handles the database logic
      const openIndentsData = await materialIndentSlipAPI.getOpenIndents();
      
      const openIndentItems: OpenIndentItem[] = [];

      // Process each open indent slip
      for (const { slip, items } of openIndentsData) {
        // Process each item in the indent slip
        for (const indentItem of items) {
          const requestedQty = indentItem.qty || 0;
          const receivedQty = indentItem.received_qty || 0;
          const pendingQty = indentItem.pending_qty || 0;
          
          let status: 'pending' | 'partial' | 'completed' = 'pending';
          
          if (pendingQty === 0) {
            status = 'completed';
          } else if (receivedQty > 0) {
            status = 'partial';
          }

          // Include all items from open indents (including over-received)
          openIndentItems.push({
            indentSlip: slip,
            indentItem,
            requestedQty,
            receivedQty,
            pendingQty: Math.abs(pendingQty), // Show absolute value for display
            status,
            lastReceived: slip.updated_at
          });
        }
      }

      setOpenIndentItems(openIndentItems);
    } catch (error) {
      console.error('Error fetching open indent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualClose = async (indentId: string) => {
    try {
      setClosingIndent(indentId);
      const success = await materialIndentSlipAPI.manuallyClose(indentId);
      
      if (success) {
        // Refresh the data
        await fetchOpenIndentData();
      } else {
        console.error('Failed to close indent manually');
      }
    } catch (error) {
      console.error('Error closing indent:', error);
    } finally {
      setClosingIndent(null);
    }
  };

  const filteredItems = openIndentItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.indentItem.item_name || item.indentItem.description_specification || '').toLowerCase().includes(searchLower) ||
      (item.indentItem.item_code || '').toLowerCase().includes(searchLower) ||
      (item.indentSlip.ident_no || item.indentSlip.doc_no || '').toLowerCase().includes(searchLower) ||
      (item.indentSlip.party_name || item.indentSlip.department_name || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'pending':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressPercentage = (received: number, requested: number) => {
    return requested > 0 ? Math.min(100, (received / requested) * 100) : 0;
  };

  const totalPendingItems = filteredItems.filter(item => item.status === 'pending').length;
  const totalPartialItems = filteredItems.filter(item => item.status === 'partial').length;
  const totalCompletedItems = filteredItems.filter(item => item.status === 'completed').length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Open Indent Tracking</h2>
          <p className="text-sm text-gray-500 mt-1">Track pending material quantities from indent slips</p>
        </div>
        <button
          onClick={fetchOpenIndentData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Pending</p>
              <p className="text-2xl font-bold text-red-700">{totalPendingItems}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Partial</p>
              <p className="text-2xl font-bold text-yellow-700">{totalPartialItems}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-700">{totalCompletedItems}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-700">{filteredItems.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by item name, item code, indent no, or party name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading open indent data...</span>
        </div>
      )}

      {/* Items List */}
      {!loading && (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No open indent items found</p>
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div key={`${item.indentSlip.id}-${item.indentItem.id}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(item.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                      {/* Status indicator for indent slip */}
                      {item.indentSlip.status && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          item.indentSlip.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          item.indentSlip.status === 'CLOSED_PERFECT' ? 'bg-green-100 text-green-800 border-green-200' :
                          item.indentSlip.status === 'CLOSED_OVER_RECEIVED' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {item.indentSlip.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Manual Close Button */}
                  {item.indentSlip.status === 'OPEN' && item.status === 'pending' && (
                    <button
                      onClick={() => handleManualClose(item.indentSlip.id)}
                      disabled={closingIndent === item.indentSlip.id}
                      className="ml-4 px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {closingIndent === item.indentSlip.id ? 'Closing...' : 'Close Manually'}
                    </button>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {item.indentItem.item_name || item.indentItem.description_specification || 'N/A'}
                    {item.indentItem.item_code && (
                      <span className="text-sm text-gray-500 ml-2">({item.indentItem.item_code})</span>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Indent No:</span>
                      <p className="text-blue-600">{item.indentSlip.ident_no || item.indentSlip.doc_no || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Party Name:</span>
                      <p>{item.indentSlip.party_name || item.indentSlip.department_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Indent Date:</span>
                      <p>{new Date(item.indentSlip.indent_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">UOM:</span>
                      <p>{item.indentItem.uom || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{getProgressPercentage(item.receivedQty, item.requestedQty).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        item.status === 'completed' ? 'bg-green-500' :
                        item.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${getProgressPercentage(item.receivedQty, item.requestedQty)}%` }}
                    />
                  </div>
                </div>

                {/* Quantity Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Requested</p>
                    <p className="text-lg font-bold text-blue-700">{item.requestedQty}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Received</p>
                    <p className="text-lg font-bold text-green-700">{item.receivedQty}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Pending</p>
                    <p className="text-lg font-bold text-red-700">{item.pendingQty}</p>
                  </div>
                </div>

                {/* Last Received */}
                {item.lastReceived && (
                  <div className="mt-3 text-xs text-gray-500">
                    Last received: {new Date(item.lastReceived).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default OpenIndent;
