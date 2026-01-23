'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightCircle,
  Package,
  MapPin,
  FileText,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Box,
  Boxes,
  Eye,
  X,
  ExternalLink,
  BarChart3,
  Layers,
  History,
} from 'lucide-react';
import { useAccessControl } from '@/lib/useAccessControl';
import { jwAnnexureGRNAPI, grnAPI, misAPI, rawMaterialAPI } from '@/lib/supabase';

// Types
interface StockLedgerEntry {
  id: string;
  item_id: string;
  item_code: string;
  location_code: string;
  quantity: number;
  unit_of_measure: string;
  balance_after: number;
  transaction_date: string;
  document_type: string;
  document_id: string;
  document_number: string;
  movement_type: 'IN' | 'OUT' | 'TRANSFER';
  posted_by: string;
  posted_at: string;
  remarks?: string;
  batch_number?: string;
  reference_number?: string;
  counterpart_location?: string;
  // Joined data from stock_items
  stock_items?: {
    item_name?: string;
    item_type?: string;
    sub_category?: string;
    category?: string;
  };
}

interface StockBalance {
  id: string;
  item_id: string;
  item_code: string;
  location_code: string;
  current_balance: number;
  unit_of_measure: string;
  last_movement_at?: string;
  item_name?: string;
  item_type?: string;
  sub_category?: string;
  category?: string;
  // RM-specific fields
  rm_supplier?: string;
  // SFG-specific fields
  sfg_code?: string;
  sfg_item_name?: string;
  sfg_qty_pcs?: number;
  sfg_qty_kgs?: number;
  // PM-specific fields
  pm_dimensions?: string;
  pm_party_name?: string;
  pm_color_remarks?: string;
  // FG-specific fields
  fg_code?: string;
  fg_color?: string;
  fg_party?: string;
  fg_pack_size?: string;
  qty_boxes?: number;
  total_qty_pcs?: number;
  total_qty_ton?: number;
  qc_check?: boolean;
}

interface StockItem {
  id: string;
  item_code: string;
  item_name: string;
  item_type: string;
  sub_category?: string;
  unit_of_measure: string;
}

interface FilterState {
  searchTerm: string;
  location: string;
  itemType: string;
  documentType: string;
  movementType: string;
  fromDate: string;
  toDate: string;
}

interface StockLedgerModuleProps {
  onSubNavClick?: () => void;
}

// Constants
const LOCATIONS = ['ALL', 'STORE', 'PRODUCTION', 'FG_STORE'];
const ITEM_TYPES = ['ALL', 'RM', 'PM', 'SFG', 'FG', 'SPARE'];
const DOCUMENT_TYPES = ['ALL', 'GRN', 'JW_GRN', 'MIS', 'DPR', 'FG_TRANSFER', 'DISPATCH', 'CUSTOMER_RETURN', 'STOCK_ADJUSTMENT'];
const MOVEMENT_TYPES = ['ALL', 'IN', 'OUT', 'TRANSFER'];

const LOCATION_COLORS: Record<string, string> = {
  STORE: 'bg-blue-100 text-blue-800 border-blue-200',
  PRODUCTION: 'bg-amber-100 text-amber-800 border-amber-200',
  FG_STORE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const DOCUMENT_TYPE_INFO: Record<string, { label: string; color: string; icon: any }> = {
  GRN: { label: 'Goods Receipt', color: 'bg-green-100 text-green-800', icon: ArrowDownCircle },
  JW_GRN: { label: 'Job Work GRN', color: 'bg-teal-100 text-teal-800', icon: ArrowDownCircle },
  MIS: { label: 'Issue Slip', color: 'bg-orange-100 text-orange-800', icon: ArrowRightCircle },
  DPR: { label: 'Production', color: 'bg-purple-100 text-purple-800', icon: Package },
  FG_TRANSFER: { label: 'FG Transfer', color: 'bg-indigo-100 text-indigo-800', icon: Boxes },
  DISPATCH: { label: 'Dispatch', color: 'bg-red-100 text-red-800', icon: ArrowUpCircle },
  CUSTOMER_RETURN: { label: 'Customer Return', color: 'bg-pink-100 text-pink-800', icon: ArrowDownCircle },
  STOCK_ADJUSTMENT: { label: 'Adjustment', color: 'bg-gray-100 text-gray-800', icon: BarChart3 },
};

// Helper function to format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Tab configuration with permission mapping
const STOCK_LEDGER_TABS = [
  { id: 'movements' as const, label: 'Movement Log', resource: 'Movement Log', icon: History },
  { id: 'balances' as const, label: 'Current Stock', resource: 'Current Stock', icon: Layers },
  { id: 'analytics' as const, label: 'Analytics', resource: 'Stock Analytics', icon: BarChart3 },
];

// Main Component
const StockLedgerModule: React.FC<StockLedgerModuleProps> = ({ onSubNavClick }) => {
  const { canAccessResource, isRootAdmin } = useAccessControl();
  
  // Filter tabs based on permissions
  const accessibleTabs = useMemo(() => {
    if (isRootAdmin) return STOCK_LEDGER_TABS;
    return STOCK_LEDGER_TABS.filter(tab => canAccessResource(tab.resource));
  }, [canAccessResource, isRootAdmin]);

  const [activeTab, setActiveTab] = useState<'movements' | 'balances' | 'analytics'>(() => {
    // Default to first accessible tab
    return accessibleTabs.length > 0 ? accessibleTabs[0].id : 'movements';
  });
  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StockLedgerEntry | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    location: 'ALL',
    itemType: 'ALL',
    documentType: 'ALL',
    movementType: 'ALL',
    fromDate: '',
    toDate: '',
  });

  // Sort and filter state for Current Stock view
  const [balancesSortBy, setBalancesSortBy] = useState<'code' | 'name' | 'balance' | 'type'>('code');
  const [balancesSortOrder, setBalancesSortOrder] = useState<'asc' | 'desc'>('asc');
  const [balancesStockFilter, setBalancesStockFilter] = useState<'all' | 'withStock' | 'zero' | 'negative'>('all');

  // Fetch ledger entries - fetch all entries in batches until we get everything
  const fetchLedgerEntries = useCallback(async () => {
    setLoading(true);
    try {
      const allEntries: StockLedgerEntry[] = [];
      const batchSize = 1000; // Fetch in batches of 1000
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const params = new URLSearchParams();
        // Don't send searchTerm to API - we'll filter client-side for better flexibility
        // The API might do exact match on item_code, but we want to search in item_code, item_name, etc.
        if (filters.location !== 'ALL') params.append('location', filters.location);
        if (filters.itemType !== 'ALL') params.append('item_type', filters.itemType);
        if (filters.documentType !== 'ALL') params.append('document_type', filters.documentType);
        if (filters.fromDate) params.append('from', filters.fromDate);
        if (filters.toDate) params.append('to', filters.toDate);
        params.append('limit', batchSize.toString());
        params.append('offset', offset.toString());
        
        const response = await fetch(`/api/stock/ledger?${params.toString()}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const entries = data.data || [];
          
          if (entries.length === 0) {
            hasMore = false;
          } else {
            allEntries.push(...entries);
            offset += batchSize;
            
            // If we got fewer entries than the batch size, we've reached the end
            if (entries.length < batchSize) {
              hasMore = false;
            }
          }
        } else {
          console.error('Failed to fetch ledger entries:', response.status, response.statusText);
          hasMore = false;
        }
      }
      
      console.log(`📊 Loaded ${allEntries.length} total ledger entries`);
      // Don't filter here - all filtering is done in filteredEntries useMemo for consistency
      // This ensures what you see is what you export
      setLedgerEntries(allEntries);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      setLedgerEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.searchTerm) params.append('search', filters.searchTerm);
      if (filters.location !== 'ALL') {
        // Ensure location code matches API expectations (FG_STORE not FG STORE)
        const locationCode = filters.location === 'FG STORE' ? 'FG_STORE' : filters.location;
        params.append('location', locationCode);
      }
      if (filters.itemType !== 'ALL') params.append('item_type', filters.itemType);
      // Add date range filters for Current Stock (if API supports it)
      if (filters.fromDate) params.append('from', filters.fromDate);
      if (filters.toDate) params.append('to', filters.toDate);
      
      console.log('📊 Fetching stock balances with params:', params.toString());
      const response = await fetch(`/api/stock/balance?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Stock balances response:', { success: data.success, count: data.count, dataLength: data.data?.length });
        // API returns { success: true, count: number, data: StockBalance[] }
        setBalances(data.data || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch balances:', response.status, response.statusText, errorData);
        setBalances([]);
      }
    } catch (error) {
      console.error('❌ Error fetching balances:', error);
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const clearedFilters = {
      searchTerm: '',
      location: 'ALL',
      itemType: 'ALL',
      documentType: 'ALL',
      movementType: 'ALL',
      fromDate: '',
      toDate: '',
    };
    setFilters(clearedFilters);
    // The useEffect will automatically trigger re-fetch when filters change
  }, []);

  // Initial data fetch - only on tab change
  useEffect(() => {
    if (activeTab === 'movements') {
      fetchLedgerEntries();
    } else if (activeTab === 'balances') {
      fetchBalances();
    }
  }, [activeTab, fetchLedgerEntries, fetchBalances]);

  // Re-fetch movements when search term or date range changes (if on movements tab)
  // This ensures that when switching from balances to movements with onViewHistory,
  // the data is fetched with the updated filters including date range
  useEffect(() => {
    if (activeTab === 'movements') {
      // Small delay to ensure state updates are complete
      const timeoutId = setTimeout(() => {
        fetchLedgerEntries();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [filters.searchTerm, filters.fromDate, filters.toDate, activeTab, fetchLedgerEntries]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = ledgerEntries.filter(e => e.transaction_date === today);
    
    const totalIn = todayEntries.filter(e => e.movement_type === 'IN').reduce((sum, e) => sum + Math.abs(e.quantity), 0);
    const totalOut = todayEntries.filter(e => e.movement_type === 'OUT').reduce((sum, e) => sum + Math.abs(e.quantity), 0);
    
    const uniqueItems = new Set(ledgerEntries.map(e => e.item_code)).size;
    const negativeBalances = balances.filter(b => b.current_balance < 0).length;
    
    // Additional comprehensive stats
    const itemsWithStock = balances.filter(b => b.current_balance > 0).length;
    const zeroStock = balances.filter(b => b.current_balance === 0).length;
    const totalStockValue = balances.reduce((sum, b) => sum + b.current_balance, 0);
    
    // Movement stats (all time, not just today)
    const allIn = ledgerEntries.filter(e => e.movement_type === 'IN').reduce((sum, e) => sum + Math.abs(e.quantity), 0);
    const allOut = ledgerEntries.filter(e => e.movement_type === 'OUT').reduce((sum, e) => sum + Math.abs(e.quantity), 0);
    
    return {
      todayMovements: todayEntries.length,
      todayIn: totalIn,
      todayOut: totalOut,
      uniqueItems,
      negativeBalances,
      totalEntries: ledgerEntries.length,
      // Additional stats
      itemsWithStock,
      zeroStock,
      totalStockValue,
      allTimeIn: allIn,
      allTimeOut: allOut,
    };
  }, [ledgerEntries, balances]);

  // Filter entries - apply all filters including date range
  const filteredEntries = useMemo(() => {
    let filtered = ledgerEntries;
    
    // Apply location filter
    if (filters.location !== 'ALL') {
      filtered = filtered.filter(entry => entry.location_code === filters.location);
    }
    
    // Apply item type filter
    if (filters.itemType !== 'ALL') {
      filtered = filtered.filter(entry => entry.stock_items?.item_type === filters.itemType);
    }
    
    // Apply document type filter
    if (filters.documentType !== 'ALL') {
      filtered = filtered.filter(entry => entry.document_type === filters.documentType);
    }
    
    // Apply movement type filter
    if (filters.movementType !== 'ALL') {
      filtered = filtered.filter(entry => entry.movement_type === filters.movementType);
    }
    
    // Apply search term filter - search in multiple fields including display title
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(entry => {
        // Parse remarks to get display title (e.g., "Yellow-219220044")
        const parsedInfo = parseRemarks(entry.remarks);
        const displayTitle = formatItemDisplayTitle(entry, parsedInfo);
        
        return (
          entry.item_code?.toLowerCase().includes(searchLower) ||
          entry.stock_items?.item_name?.toLowerCase().includes(searchLower) ||
          entry.document_number?.toLowerCase().includes(searchLower) ||
          entry.posted_by?.toLowerCase().includes(searchLower) ||
          displayTitle?.toLowerCase().includes(searchLower) ||
          parsedInfo.grade?.toLowerCase().includes(searchLower) ||
          parsedInfo.material?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Apply date range filter (client-side backup in case API doesn't filter properly)
    if (filters.fromDate || filters.toDate) {
      filtered = filtered.filter(entry => {
        const entryDate = entry.transaction_date;
        if (!entryDate) return false;
        if (filters.fromDate && entryDate < filters.fromDate) return false;
        if (filters.toDate && entryDate > filters.toDate) return false;
        return true;
      });
    }
    
    return filtered;
  }, [ledgerEntries, filters]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, StockLedgerEntry[]> = {};
    filteredEntries.forEach(entry => {
      const date = entry.transaction_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEntries]);

  // Toggle item expansion
  const toggleItemExpansion = (itemCode: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemCode)) {
        newSet.delete(itemCode);
      } else {
        newSet.add(itemCode);
      }
      return newSet;
    });
  };

  // Export to CSV
  const handleExport = () => {
    if (activeTab === 'movements') {
      // Check if we have entries to export
      if (filteredEntries.length === 0) {
        alert('No movement data to export. Please adjust your filters or date range.');
        return;
      }
      
      // Export movements - use filteredEntries which already respects all filters including date range
      const csvContent = [
        ['Date', 'Item Code', 'Item Name', 'Location', 'Movement', 'Quantity', 'Unit', 'Balance After', 'Document', 'Doc Number', 'Posted By', 'Remarks'].join(','),
        ...filteredEntries.map(e => [
          e.transaction_date || '',
          e.item_code || '',
          `"${(e.stock_items?.item_name || '').replace(/"/g, '""')}"`,
          e.location_code || '',
          e.movement_type || '',
          e.quantity || 0,
          e.unit_of_measure || '',
          e.balance_after || 0,
          e.document_type || '',
          e.document_number || '',
          e.posted_by || '',
          `"${(e.remarks || '').replace(/"/g, '""')}"`,
        ].join(','))
      ].join('\n');
      
      const dateRange = filters.fromDate || filters.toDate 
        ? `_${filters.fromDate || 'all'}_to_${filters.toDate || 'all'}`
        : '';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-movements${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (activeTab === 'balances') {
      // Export current stock balances
      const csvContent = [
        ['Item Code', 'Item Name', 'Item Type', 'Category', 'Location', 'Current Balance', 'Unit', 'Last Movement'].join(','),
        ...balances.map(b => [
          b.item_code,
          `"${b.item_name || ''}"`,
          b.item_type || '',
          b.category || '',
          b.location_code,
          b.current_balance,
          b.unit_of_measure,
          b.last_movement_at || '',
        ].join(','))
      ].join('\n');
      
      const dateRange = filters.fromDate || filters.toDate 
        ? `_${filters.fromDate || 'all'}_to_${filters.toDate || 'all'}`
        : '';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-balances${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // If user has no access to any tabs, show a message
  if (accessibleTabs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Access</h3>
          <p className="text-gray-600">You don't have permission to access any Stock Ledger tabs.</p>
          <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Tab Navigation - Only shows tabs user has permission for */}
      <div className="border-b border-gray-200 bg-white app-subnav">
        <nav className="flex space-x-8 px-6">
          {accessibleTabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); onSubNavClick?.(); }}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-slate-700 text-slate-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
              
              {/* Search - Works for both tabs */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'balances' ? "Search item code or name..." : "Search item code..."}
                  value={filters.searchTerm}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, searchTerm: e.target.value }));
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Location Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Location</label>
                <div className="space-y-1">
                  {LOCATIONS.map(loc => (
                    <button
                      key={loc}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, location: loc }));
                        if (activeTab === 'balances') {
                          // Location filter is applied client-side, no need to refetch
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        filters.location === loc
                          ? 'bg-slate-100 text-slate-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {loc === 'ALL' ? 'All Locations' : loc.replace('_', ' ')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Item Type</label>
                <div className="grid grid-cols-2 gap-1">
                  {ITEM_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setFilters(prev => ({ ...prev, itemType: type }))}
                      className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                        filters.itemType === type
                          ? 'bg-slate-700 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'ALL' ? 'All' : type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort and Quick Filters for Current Stock */}
              {activeTab === 'balances' && (
                <>
                  {/* Sort */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Sort By</label>
                    <div className="space-y-2">
                      <select
                        value={balancesSortBy}
                        onChange={(e) => setBalancesSortBy(e.target.value as 'code' | 'name' | 'balance' | 'type')}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="code">Item Code</option>
                        <option value="name">Item Name</option>
                        <option value="balance">Balance</option>
                        <option value="type">Item Type</option>
                      </select>
                      <button
                        onClick={() => setBalancesSortOrder(balancesSortOrder === 'asc' ? 'desc' : 'asc')}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        title={balancesSortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                      >
                        {balancesSortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {balancesSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      </button>
                    </div>
                  </div>

                  {/* Quick Filters */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Quick Filters</label>
                    <div className="space-y-2">
                      <button
                        onClick={() => setBalancesStockFilter('all')}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                          balancesStockFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All Items
                      </button>
                      <button
                        onClick={() => setBalancesStockFilter('withStock')}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                          balancesStockFilter === 'withStock' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Items with Stock
                      </button>
                      <button
                        onClick={() => setBalancesStockFilter('zero')}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                          balancesStockFilter === 'zero' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Zero Stock
                      </button>
                      <button
                        onClick={() => setBalancesStockFilter('negative')}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                          balancesStockFilter === 'negative' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Negative Stock
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Document Type Filter */}
              {activeTab === 'movements' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Document Type</label>
                  <select
                    value={filters.documentType}
                    onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-500"
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type === 'ALL' ? 'All Documents' : DOCUMENT_TYPE_INFO[type]?.label || type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Movement Type Filter */}
              {activeTab === 'movements' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Movement Type</label>
                  <div className="flex gap-1">
                    {MOVEMENT_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => setFilters(prev => ({ ...prev, movementType: type }))}
                        className={`flex-1 px-2 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          filters.movementType === type
                            ? type === 'IN' ? 'bg-green-600 text-white'
                              : type === 'OUT' ? 'bg-red-600 text-white'
                              : type === 'TRANSFER' ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type === 'IN' && <ArrowDownCircle className="w-3 h-3" />}
                        {type === 'OUT' && <ArrowUpCircle className="w-3 h-3" />}
                        {type === 'TRANSFER' && <ArrowRightCircle className="w-3 h-3" />}
                        {type === 'ALL' ? 'All' : type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range - Show for both Movements and Current Stock */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => activeTab === 'movements' ? fetchLedgerEntries() : fetchBalances()}
                className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`p-2 rounded-lg transition-colors ${
                    showFilterPanel ? 'bg-slate-100 text-slate-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                </button>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <ArrowDownCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Stock Received Today</div>
                      <div className="font-semibold text-gray-900">{summaryStats.todayIn.toFixed(2)} units</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <ArrowUpCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Stock Issued Today</div>
                      <div className="font-semibold text-gray-900">{summaryStats.todayOut.toFixed(2)} units</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Package className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Total Movements Today</div>
                      <div className="font-semibold text-gray-900">{summaryStats.todayMovements} entries</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Box className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Items with Stock</div>
                      <div className="font-semibold text-gray-900">{summaryStats.itemsWithStock} items</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Unique Items</div>
                      <div className="font-semibold text-gray-900">{summaryStats.uniqueItems} types</div>
                    </div>
                  </div>
                  {summaryStats.negativeBalances > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">
                        {summaryStats.negativeBalances} Negative Stock
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => activeTab === 'movements' ? fetchLedgerEntries() : fetchBalances()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-row min-h-0">
            {/* Main List */}
            <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${selectedEntry ? 'w-2/3' : 'w-full'} transition-all duration-200`}>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="loader"></div>
                </div>
              ) : activeTab === 'movements' ? (
                <MovementsList
                  groupedEntries={groupedEntries}
                  selectedEntry={selectedEntry}
                  onSelectEntry={setSelectedEntry}
                />
              ) : activeTab === 'balances' ? (
                <BalancesGrid
                  balances={balances}
                  expandedItems={expandedItems}
                  onToggleExpand={toggleItemExpansion}
                  onViewHistory={(itemCode) => {
                    // Preserve existing filters (especially date range) and set search term
                    setFilters(prev => ({ ...prev, searchTerm: itemCode }));
                    setActiveTab('movements');
                    // The useEffect will automatically trigger fetchLedgerEntries when filters or tab changes
                  }}
                  filters={filters}
                  sortBy={balancesSortBy}
                  sortOrder={balancesSortOrder}
                  stockFilter={balancesStockFilter}
                  setSortBy={setBalancesSortBy}
                  setSortOrder={setBalancesSortOrder}
                />
              ) : (
                <AnalyticsView entries={ledgerEntries} balances={balances} />
              )}
            </div>

            {/* Detail Panel */}
            {selectedEntry && activeTab === 'movements' && (
              <DetailPanel
                entry={selectedEntry}
                onClose={() => setSelectedEntry(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to parse remarks for displaying in list view
const parseRemarksForList = (remarks?: string): { grade?: string; material?: string; jwNo?: string; docNo?: string } => {
  if (!remarks) return {};
  const result: { grade?: string; material?: string; jwNo?: string; docNo?: string } = {};
  
  const parts = remarks.split(' | ');
  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex > 0) {
      const key = part.substring(0, colonIndex).trim().toLowerCase();
      const value = part.substring(colonIndex + 1).trim();
      if (key === 'grade') result.grade = value;
      if (key === 'material') result.material = value;
      if (key === 'jw no') result.jwNo = value;
      if (key === 'doc no') result.docNo = value;
    }
  }
  
  return result;
};

// Helper function to extract grade from item_code for RM items
// Tries multiple strategies to find the grade
const extractGradeFromItemCode = (itemCode: string, itemName?: string, category?: string): string | null => {
  // Common category codes that should NOT be treated as grades
  const commonCategoryCodes = ['HP', 'PP', 'RM', 'PM', 'SFG', 'FG', 'STORE', 'PRODUCTION'];
  
  // Special handling for MB (Master Batch) items
  // Format: PP-MB-{COLOR}-{NUMBER} or similar
  // For MB items, we want to extract the COLOR and NUMBER together
  // Check both category and item_code for MB
  const isMB = category === 'MB' || itemCode.toUpperCase().includes('-MB-') || itemCode.toUpperCase().startsWith('MB-');
  
  if (isMB && itemCode.includes('-')) {
    const parts = itemCode.split('-');
    // Look for pattern: XX-MB-COLOR-XXXXX
    if (parts.length >= 4) {
      // Find the index of "MB" in the parts
      const mbIndex = parts.findIndex(part => part.toUpperCase() === 'MB');
      if (mbIndex >= 0 && mbIndex < parts.length - 2) {
        // The color is the part after MB
        const colorPart = parts[mbIndex + 1];
        // The number is the last part
        const numberPart = parts[parts.length - 1];
        // Make sure color is not a number and number exists
        if (colorPart && !/^\d+$/.test(colorPart) && numberPart) {
          // Capitalize first letter of color and combine with number
          const colorName = colorPart.charAt(0).toUpperCase() + colorPart.slice(1).toLowerCase();
          return `${colorName}-${numberPart}`;
        }
      }
    } else if (parts.length >= 3) {
      // Fallback: if only 3 parts (XX-MB-COLOR), just return the color
      const mbIndex = parts.findIndex(part => part.toUpperCase() === 'MB');
      if (mbIndex >= 0 && mbIndex < parts.length - 1) {
        const colorPart = parts[mbIndex + 1];
        if (colorPart && !/^\d+$/.test(colorPart)) {
          return colorPart.charAt(0).toUpperCase() + colorPart.slice(1).toLowerCase();
        }
      }
    }
  }
  
  // Special handling for HDPE and LDPE items
  // Format: PE-HDPE-{GRADE} or PE-LDPE-{GRADE} or similar
  // The grade might be in the last part or in item_name
  // Also check if item_code contains HDPE or LDPE
  const isHDPE = category === 'HDPE' || itemCode.toUpperCase().includes('HDPE');
  const isLDPE = category === 'LDPE' || itemCode.toUpperCase().includes('LDPE');
  
  if (isHDPE || isLDPE) {
    // First try item_code
    if (itemCode.includes('-')) {
      const parts = itemCode.split('-');
      // Look for pattern: XX-HDPE-GRADE or XX-LDPE-GRADE
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        // Check if last part contains a grade pattern (has numbers, like "50MA180" or "HDPE 50MA180")
        if (lastPart && /\d/.test(lastPart)) {
          // If it contains the category name, extract just the grade part
          // e.g., "HDPE 50MA180" -> "50MA180"
          // Pattern: number followed by letters/numbers (e.g., "50MA180", "16MA400")
          const gradeMatch = lastPart.match(/(\d+[A-Z0-9]+)/i);
          if (gradeMatch) {
            return gradeMatch[1];
          }
          // If no match, try to extract any alphanumeric code that looks like a grade
          const altMatch = lastPart.match(/([A-Z0-9]{4,})/i);
          if (altMatch && !['HDPE', 'LDPE'].includes(altMatch[1].toUpperCase())) {
            return altMatch[1];
          }
          return lastPart;
        }
      }
    }
    // If grade not found in item_code, try item_name
    if (itemName) {
      // Look for grade pattern in item_name (e.g., "PE HDPE HDPE 50MA180" -> "50MA180")
      // Pattern: number followed by letters/numbers
      const gradeMatch = itemName.match(/(\d+[A-Z0-9]+)/i);
      if (gradeMatch) {
        return gradeMatch[1];
      }
    }
    // If still not found, try extracting from item_code without dashes
    const gradeMatch = itemCode.match(/(\d+[A-Z0-9]+)/i);
    if (gradeMatch) {
      return gradeMatch[1];
    }
  }
  
  // Strategy 1: If item_code has format like "PP-HP-HJ333MO" or "RM-HP-HJ333MO", extract last part
  if (itemCode.includes('-')) {
    const parts = itemCode.split('-');
    // If we have 3+ parts, the last part is likely the grade
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      // Check if last part looks like a grade (has alphanumeric pattern, longer than 2 chars, not a common category code)
      if (lastPart.length > 2 && 
          /^[A-Z0-9]+$/i.test(lastPart) && 
          !commonCategoryCodes.includes(lastPart.toUpperCase())) {
        return lastPart;
      }
    }
    // If we have 2 parts like "RM-HP", the second part is likely a category, not grade
    // Don't return it - we need the actual grade, not the category
  }
  
  // Strategy 2: Look for grade pattern in item_code (alphanumeric codes like HJ333MO, ABC123, etc.)
  // Grades typically have a mix of letters and numbers, and are longer than category codes
  const gradePattern = /([A-Z]{2,}[0-9]+[A-Z0-9]*|[A-Z0-9]{4,})/i;
  const match = itemCode.match(gradePattern);
  if (match) {
    const potentialGrade = match[1];
    // Make sure it's not a common category code
    if (potentialGrade.length >= 4 && !commonCategoryCodes.includes(potentialGrade.toUpperCase())) {
      return potentialGrade;
    }
  }
  
  // Strategy 3: Check if item_name contains the grade (for RM items, item_name might be the grade)
  if (itemName && itemName.length >= 4 && !commonCategoryCodes.includes(itemName.toUpperCase())) {
    // Check if item_name looks like a grade (has numbers or is longer than typical category names)
    if (/\d/.test(itemName) || itemName.length >= 5) {
      return itemName;
    }
  }
  
  return null;
};

// Helper function to format display title for StockLedgerEntry based on item type
const formatItemDisplayTitle = (
  entry: StockLedgerEntry,
  parsedInfo: { grade?: string; material?: string; jwNo?: string; docNo?: string }
): string => {
  const itemType = entry.stock_items?.item_type;
  const itemCode = entry.item_code;
  const itemName = entry.stock_items?.item_name;
  const category = entry.stock_items?.category;

  // For RM: Show grade only (GRADE IS THE MOST IMPORTANT)
  if (itemType === 'RM') {
    // First try to get grade from remarks (most reliable - this is where we save it)
    if (parsedInfo.grade) {
      return parsedInfo.grade.trim();
    }
    // Try to extract grade from item_code (only if it looks like a real grade, not a category)
    // Pass category for MB, HDPE, LDPE items special handling
    const extractedGrade = extractGradeFromItemCode(itemCode, itemName, category);
    if (extractedGrade) {
      // For MB items, extractedGrade will be the color name with number (Black-219660103, etc.)
      const isMB = category === 'MB' || itemCode.toUpperCase().includes('-MB-') || itemCode.toUpperCase().startsWith('MB-');
      if (isMB) {
        return extractedGrade;
      }
      // For HDPE and LDPE items, extractedGrade will be the grade (50MA180, 16MA400, etc.)
      const isHDPE = category === 'HDPE' || itemCode.toUpperCase().includes('HDPE');
      const isLDPE = category === 'LDPE' || itemCode.toUpperCase().includes('LDPE');
      if (isHDPE || isLDPE) {
        return extractedGrade;
      }
      // For other RM items, check if it's a valid grade (length >= 4 and not a category code)
      if (extractedGrade.length >= 4) {
        // Make sure it's not a common category code
        const commonCategoryCodes = ['HP', 'PP', 'RM', 'PM', 'SFG', 'FG', 'STORE', 'PRODUCTION', 'HDPE', 'LDPE'];
        if (!commonCategoryCodes.includes(extractedGrade.toUpperCase())) {
          return extractedGrade;
        }
      }
    }
    // If we can't find a proper grade, show the full item_code rather than a category like "HP"
    // This helps identify that the grade is missing
    return itemCode;
  }

  // For PM: Show item code and category
  if (itemType === 'PM') {
    if (category) {
      return `${itemCode} ${category}`;
    }
    return itemCode;
  }

  // For SFG: Show item code and item name
  if (itemType === 'SFG') {
    if (itemName) {
      return `${itemCode} ${itemName}`;
    }
    return itemCode;
  }

  // For FG: Show item name - color (avoid duplicates)
  // Item code format is {fg_code}-{color}, so extract color from item_code
  if (itemType === 'FG') {
    if (itemName) {
      // Extract color from item_code (everything after the last dash)
      const lastDashIndex = itemCode.lastIndexOf('-');
      if (lastDashIndex > 0 && lastDashIndex < itemCode.length - 1) {
        const color = itemCode.substring(lastDashIndex + 1);
        // Remove color from item_name if it's already there (check for " - color" or " (color)" or just "color" at the end)
        let cleanItemName = itemName.trim();
        
        // Remove trailing " - {color}" pattern
        const dashColorPattern = new RegExp(`\\s*-\\s*${color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
        cleanItemName = cleanItemName.replace(dashColorPattern, '');
        
        // Remove trailing " ({color})" pattern
        const parenColorPattern = new RegExp(`\\s*\\(${color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*$`, 'i');
        cleanItemName = cleanItemName.replace(parenColorPattern, '');
        
        // Only add color if it's not already in the name
        const colorLower = color.toLowerCase();
        if (!cleanItemName.toLowerCase().includes(colorLower)) {
          return `${cleanItemName} - ${color}`;
        }
        return cleanItemName;
      }
      // If no color found in item_code, just show item name
      return itemName;
    }
    return itemCode;
  }

  // For other types, show item name or item code
  return itemName || itemCode;
};

// Helper function to format display title for StockBalance based on item type
const formatBalanceItemDisplayTitle = (item: StockBalance): string => {
  const itemType = item.item_type;
  const itemCode = item.item_code;
  const itemName = item.item_name;
  const category = item.category;

  // For RM: Show grade only (GRADE IS THE MOST IMPORTANT)
  if (itemType === 'RM') {
    // Try to extract grade from item_code (only if it looks like a real grade, not a category)
    // Pass category for MB, HDPE, LDPE items special handling
    const extractedGrade = extractGradeFromItemCode(itemCode, itemName, category);
    if (extractedGrade) {
      // For MB items, extractedGrade will be the color name with number (Black-219660103, etc.)
      const isMB = category === 'MB' || itemCode.toUpperCase().includes('-MB-') || itemCode.toUpperCase().startsWith('MB-');
      if (isMB) {
        return extractedGrade;
      }
      // For HDPE and LDPE items, extractedGrade will be the grade (50MA180, 16MA400, etc.)
      const isHDPE = category === 'HDPE' || itemCode.toUpperCase().includes('HDPE');
      const isLDPE = category === 'LDPE' || itemCode.toUpperCase().includes('LDPE');
      if (isHDPE || isLDPE) {
        return extractedGrade;
      }
      // For other RM items, check if it's a valid grade (length >= 4 and not a category code)
      if (extractedGrade.length >= 4) {
        // Make sure it's not a common category code
        const commonCategoryCodes = ['HP', 'PP', 'RM', 'PM', 'SFG', 'FG', 'STORE', 'PRODUCTION', 'HDPE', 'LDPE'];
        if (!commonCategoryCodes.includes(extractedGrade.toUpperCase())) {
          return extractedGrade;
        }
      }
    }
    // If we can't find a proper grade, show the full item_code rather than a category like "HP"
    return itemCode;
  }

  // For PM: Show item code and category
  if (itemType === 'PM') {
    if (category) {
      return `${itemCode} ${category}`;
    }
    return itemCode;
  }

  // For SFG: Show item code and item name
  if (itemType === 'SFG') {
    if (itemName) {
      return `${itemCode} ${itemName}`;
    }
    return itemCode;
  }

  // For FG: Show item name - color (avoid duplicates)
  // Item code format is {fg_code}-{color}, so extract color from item_code
  if (itemType === 'FG') {
    if (itemName) {
      // Extract color from item_code (everything after the last dash)
      const lastDashIndex = itemCode.lastIndexOf('-');
      if (lastDashIndex > 0 && lastDashIndex < itemCode.length - 1) {
        const color = itemCode.substring(lastDashIndex + 1);
        // Remove color from item_name if it's already there (check for " - color" or " (color)" or just "color" at the end)
        let cleanItemName = itemName.trim();
        
        // Remove trailing " - {color}" pattern
        const dashColorPattern = new RegExp(`\\s*-\\s*${color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
        cleanItemName = cleanItemName.replace(dashColorPattern, '');
        
        // Remove trailing " ({color})" pattern
        const parenColorPattern = new RegExp(`\\s*\\(${color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*$`, 'i');
        cleanItemName = cleanItemName.replace(parenColorPattern, '');
        
        // Only add color if it's not already in the name
        const colorLower = color.toLowerCase();
        if (!cleanItemName.toLowerCase().includes(colorLower)) {
          return `${cleanItemName} - ${color}`;
        }
        return cleanItemName;
      }
      // If no color found in item_code, just show item name
      return itemName;
    }
    return itemCode;
  }

  // For other types, show item name or item code
  return itemName || itemCode;
};

// Movements List Component
const MovementsList: React.FC<{
  groupedEntries: [string, StockLedgerEntry[]][];
  selectedEntry: StockLedgerEntry | null;
  onSelectEntry: (entry: StockLedgerEntry) => void;
}> = ({ groupedEntries, selectedEntry, onSelectEntry }) => {
  if (groupedEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <ScrollText className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No movements found</p>
        <p className="text-sm">Adjust filters or date range</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-6">
      {groupedEntries.map(([date, entries]) => (
        <div key={date} className="mb-6">
          {/* Date Header */}
          <div className="sticky top-0 bg-gray-50 z-10 py-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">{formatDate(date)}</span>
              </div>
              <div className="h-px flex-1 bg-gray-200"></div>
              <span className="text-sm text-gray-500">{entries.length} entries</span>
            </div>
          </div>

          {/* Entries - directly connected to date header */}
          <div className="space-y-2">
            {entries.map(entry => {
              const docInfo = DOCUMENT_TYPE_INFO[entry.document_type] || { label: entry.document_type, color: 'bg-gray-100 text-gray-800', icon: FileText };
              const DocIcon = docInfo.icon;
              
              // Parse remarks to get original item code (Grade) and other details
              const parsedInfo = parseRemarksForList(entry.remarks);
              
              // Format display title based on item type
              const displayItemCode = formatItemDisplayTitle(entry, parsedInfo);
              
              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedEntry?.id === entry.id
                      ? 'border-slate-400 ring-2 ring-slate-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Movement Indicator */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      entry.movement_type === 'IN'
                        ? 'bg-green-100'
                        : entry.movement_type === 'OUT'
                        ? 'bg-red-100'
                        : 'bg-blue-100'
                    }`}>
                      {entry.movement_type === 'IN' ? (
                        <ArrowDownCircle className="w-5 h-5 text-green-600" />
                      ) : entry.movement_type === 'OUT' ? (
                        <ArrowUpCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <ArrowRightCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {/* Show original item code (Grade) prominently */}
                            <span className="font-semibold text-gray-900">{displayItemCode}</span>
                            {entry.stock_items?.item_type && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                entry.stock_items.item_type === 'RM' ? 'bg-orange-100 text-orange-800' :
                                entry.stock_items.item_type === 'PM' ? 'bg-purple-100 text-purple-800' :
                                entry.stock_items.item_type === 'SFG' ? 'bg-blue-100 text-blue-800' :
                                entry.stock_items.item_type === 'FG' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.stock_items.item_type}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${LOCATION_COLORS[entry.location_code] || 'bg-gray-100 text-gray-700'}`}>
                              {entry.location_code.replace('_', ' ')}
                            </span>
                          </div>
                          {/* Show secondary info only for RM items (show item_code) */}
                          {entry.stock_items?.item_type === 'RM' && displayItemCode !== entry.item_code && (
                            <div className="text-sm text-gray-600 mb-1">
                              <span className="text-gray-500">{entry.item_code}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${docInfo.color}`}>
                              <DocIcon className="w-3 h-3" />
                              {docInfo.label}
                            </span>
                            {/* Show Doc No from remarks if available (more accurate), else fall back to stored document_number */}
                            <span className="font-mono">{parsedInfo.docNo || entry.document_number || '-'}</span>
                          </div>
                        </div>
                        
                        {/* Quantity */}
                        <div className="text-right">
                          {entry.stock_items?.item_type === 'FG' && entry.remarks ? (
                            // For FG items, parse remarks to show boxes, pcs, and KG
                            (() => {
                              // Parse "FG produced: 1 boxes × 300 pcs (Weight: 123.45 KG)"
                              const fgTransferMatch = entry.remarks.match(/(\d+)\s*boxes?\s*×\s*(\d+)\s*pcs/i);
                              const kgMatch = entry.remarks.match(/Weight:\s*([\d.]+)\s*KG/i);
                              if (fgTransferMatch) {
                                const boxes = parseInt(fgTransferMatch[1]) || 0;
                                const packSize = parseInt(fgTransferMatch[2]) || 0;
                                const pcs = boxes * packSize; // total_qty_pcs = boxes × pack_size
                                const kg = kgMatch ? parseFloat(kgMatch[1]) : 0;
                                return (
                                  <>
                                    <div className={`text-lg font-bold ${
                                      entry.movement_type === 'IN' ? 'text-green-600' : 
                                      entry.movement_type === 'OUT' ? 'text-red-600' : 'text-blue-600'
                                    }`}>
                                      {entry.movement_type === 'IN' ? '+' : entry.movement_type === 'OUT' ? '-' : ''} {boxes} {boxes === 1 ? 'box' : 'boxes'}
                                    </div>
                                    <div className={`text-sm font-medium ${
                                      entry.movement_type === 'IN' ? 'text-green-600' : 
                                      entry.movement_type === 'OUT' ? 'text-red-600' : 'text-blue-600'
                                    }`}>
                                      {pcs.toLocaleString()} pcs
                                    </div>
                                    {kg > 0 && (
                                      <div className={`text-xs font-medium ${
                                        entry.movement_type === 'IN' ? 'text-green-600' : 
                                        entry.movement_type === 'OUT' ? 'text-red-600' : 'text-blue-600'
                                      }`}>
                                        {kg.toFixed(2)} KG
                                      </div>
                                    )}
                                  </>
                                );
                              }
                              // Fallback to standard format if parsing fails
                              return (
                                <>
                                  <div className={`text-lg font-bold ${
                                    entry.movement_type === 'IN' ? 'text-green-600' : 
                                    entry.movement_type === 'OUT' ? 'text-red-600' : 'text-blue-600'
                                  }`}>
                                    {entry.movement_type === 'IN' ? '+' : entry.movement_type === 'OUT' ? '-' : ''}
                                    {Math.abs(entry.quantity).toFixed(2)} {entry.unit_of_measure}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Balance: <span className="font-medium text-gray-700">{entry.balance_after.toFixed(2)}</span>
                                  </div>
                                </>
                              );
                            })()
                          ) : (
                            // Standard format for non-FG items
                            <>
                              <div className={`text-lg font-bold ${
                                entry.movement_type === 'IN' ? 'text-green-600' : 
                                entry.movement_type === 'OUT' ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                {entry.movement_type === 'IN' ? '+' : entry.movement_type === 'OUT' ? '-' : ''}
                                {Math.abs(entry.quantity).toFixed(2)} {entry.unit_of_measure}
                              </div>
                              <div className="text-sm text-gray-500">
                                Balance: <span className="font-medium text-gray-700">{entry.balance_after.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Transaction source from remarks */}
                      {entry.remarks && (
                        <p className="mt-2 text-sm text-gray-500 truncate">
                          {entry.remarks.split(' | ')[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// Item Type Colors
const ITEM_TYPE_COLORS: Record<string, string> = {
  RM: 'bg-orange-100 text-orange-800 border-orange-200',
  PM: 'bg-purple-100 text-purple-800 border-purple-200',
  SFG: 'bg-blue-100 text-blue-800 border-blue-200',
  FG: 'bg-green-100 text-green-800 border-green-200',
  SPARE: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Stock Item Detail Modal
const StockItemDetailModal: React.FC<{
  item: StockBalance | null;
  onClose: () => void;
  onViewHistory: (itemCode: string) => void;
  fgBomData?: Record<string, any>;
}> = ({ item, onClose, onViewHistory, fgBomData = {} }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          item.item_type === 'RM' ? 'bg-orange-50 border-orange-100' :
          item.item_type === 'PM' ? 'bg-purple-50 border-purple-100' :
          item.item_type === 'SFG' ? 'bg-blue-50 border-blue-100' :
          'bg-green-50 border-green-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                item.item_type === 'RM' ? 'bg-orange-100' :
                item.item_type === 'PM' ? 'bg-purple-100' :
                item.item_type === 'SFG' ? 'bg-blue-100' :
                'bg-green-100'
              }`}>
                <Package className={`w-6 h-6 ${
                  item.item_type === 'RM' ? 'text-orange-600' :
                  item.item_type === 'PM' ? 'text-purple-600' :
                  item.item_type === 'SFG' ? 'text-blue-600' :
                  'text-green-600'
                }`} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {formatBalanceItemDisplayTitle(item) || 'Stock Item Details'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm text-gray-600">{item.item_code}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ITEM_TYPE_COLORS[item.item_type || 'RM']}`}>
                    {item.item_type || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Item Name / Description - Prominent (First) */}
          {formatBalanceItemDisplayTitle(item) && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Item Name / Description</div>
              <div className="text-xl font-bold text-gray-900">{formatBalanceItemDisplayTitle(item)}</div>
            </div>
          )}

          {/* Item Code */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Item Code</div>
            <div className="font-mono text-xl font-bold text-gray-900">{item.item_code}</div>
          </div>

          {/* Current Balance - Large */}
          <div className={`rounded-lg p-4 ${
            item.current_balance < 0 ? 'bg-red-50 border border-red-200' :
            item.current_balance === 0 ? 'bg-yellow-50 border border-yellow-200' :
            'bg-emerald-50 border border-emerald-200'
          }`}>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Stock Balance</div>
            {item.item_type === 'FG' && fgBomData[item.item_code] ? (
              // For FG items, show boxes, pcs, and KG
              (() => {
                const bom = fgBomData[item.item_code];
                const packSize = parseFloat(bom.pack_size || '0') || 1;
                const pcs = Math.abs(item.current_balance);
                const boxes = packSize > 0 ? Math.floor(pcs / packSize) : 0;
                
                // Calculate KG: Total Qty (KG) = Total Qty (pcs) × (SFG1_rp_int_wt + SFG2_rp_int_wt) / 1000
                let totalKg = 0;
                if (bom.sfg1_int_wt && bom.sfg2_int_wt && pcs > 0) {
                  const sfg1RpIntWt = bom.sfg1_int_wt || 0;
                  const sfg2RpIntWt = bom.sfg2_int_wt || 0;
                  totalKg = pcs * (sfg1RpIntWt + sfg2RpIntWt) / 1000;
                }
                
                return (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${
                        item.current_balance < 0 ? 'text-red-600' :
                        item.current_balance === 0 ? 'text-yellow-600' :
                        'text-emerald-600'
                      }`}>
                        {boxes} {boxes === 1 ? 'box' : 'boxes'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-semibold ${
                        item.current_balance < 0 ? 'text-red-600' :
                        item.current_balance === 0 ? 'text-yellow-600' :
                        'text-emerald-600'
                      }`}>
                        {pcs.toLocaleString()} pcs
                      </span>
                    </div>
                    {totalKg > 0 && (
                      <div className="flex items-baseline gap-2">
                        <span className={`text-xl font-semibold ${
                          item.current_balance < 0 ? 'text-red-600' :
                          item.current_balance === 0 ? 'text-yellow-600' :
                          'text-emerald-600'
                        }`}>
                          {totalKg.toFixed(2)} KG
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${
                  item.current_balance < 0 ? 'text-red-600' :
                  item.current_balance === 0 ? 'text-yellow-600' :
                  'text-emerald-600'
                }`}>
                  {item.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-gray-600">{item.unit_of_measure}</span>
              </div>
            )}
            {item.current_balance < 0 && (
              <div className="mt-2 flex items-center gap-1 text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Negative stock - requires investigation
              </div>
            )}
            {item.current_balance === 0 && (
              <div className="mt-2 flex items-center gap-1 text-yellow-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Zero stock - may need reorder
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Location</div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${LOCATION_COLORS[item.location_code]}`}>
                <MapPin className="w-4 h-4" />
                {item.location_code.replace('_', ' ')}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Movement</div>
              <div className="text-gray-900 text-sm">
                {item.last_movement_at ? formatDateTime(item.last_movement_at) : 'No movements yet'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => onViewHistory(item.item_code)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <History className="w-4 h-4" />
            View Movement History
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Balances Grid Component
const BalancesGrid: React.FC<{
  balances: StockBalance[];
  expandedItems: Set<string>;
  onToggleExpand: (itemCode: string) => void;
  onViewHistory: (itemCode: string) => void;
  filters: FilterState;
  sortBy: 'code' | 'name' | 'balance' | 'type';
  sortOrder: 'asc' | 'desc';
  stockFilter: 'all' | 'withStock' | 'zero' | 'negative';
  setSortBy: (sortBy: 'code' | 'name' | 'balance' | 'type') => void;
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
}> = ({ balances, expandedItems, onToggleExpand, onViewHistory, filters, sortBy, sortOrder, stockFilter, setSortBy, setSortOrder }) => {
  const [selectedItem, setSelectedItem] = useState<StockBalance | null>(null);
  const [fgBomData, setFgBomData] = useState<Record<string, any>>({});
  
  // Fetch FG BOM data for all FG items
  useEffect(() => {
    const fgItems = balances.filter(b => b.item_type === 'FG');
    if (fgItems.length === 0) return;
    
    fetch('/api/production/fg-transfer-note/bom-data')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const bomMap: Record<string, any> = {};
          fgItems.forEach(item => {
            // Extract FG code from item_code (format: fg_code-color)
            const lastDashIndex = item.item_code.lastIndexOf('-');
            if (lastDashIndex > 0) {
              const fgCode = item.item_code.substring(0, lastDashIndex);
              const bom = result.data.find((b: any) => b.item_code === fgCode);
              if (bom) {
                bomMap[item.item_code] = bom;
              }
            }
          });
          setFgBomData(bomMap);
        }
      })
      .catch(err => console.error('Error fetching FG BOM data:', err));
  }, [balances]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and sort balances
  const filteredAndSortedBalances = useMemo(() => {
    let filtered = balances;

    // Apply search filter from main filters
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const term = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const codeMatch = item.item_code?.toLowerCase().includes(term) || false;
        const nameMatch = item.item_name?.toLowerCase().includes(term) || false;
        return codeMatch || nameMatch;
      });
    }

    // Apply location filter
    if (filters.location !== 'ALL') {
      const locationCode = filters.location === 'FG STORE' ? 'FG_STORE' : filters.location;
      filtered = filtered.filter(item => item.location_code === locationCode);
    }

    // Apply item type filter
    if (filters.itemType !== 'ALL') {
      filtered = filtered.filter(item => item.item_type === filters.itemType);
    }

    // Apply stock filter (removed 'with_stock' as requested)
    if (stockFilter === 'withStock') {
      filtered = filtered.filter(item => item.current_balance > 0);
    } else if (stockFilter === 'zero') {
      filtered = filtered.filter(item => item.current_balance === 0);
    } else if (stockFilter === 'negative') {
      filtered = filtered.filter(item => item.current_balance < 0);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'code':
          comparison = a.item_code.localeCompare(b.item_code);
          break;
        case 'name':
          comparison = (a.item_name || a.item_code).localeCompare(b.item_name || b.item_code);
          break;
        case 'balance':
          comparison = a.current_balance - b.current_balance;
          break;
        case 'type':
          comparison = (a.item_type || '').localeCompare(b.item_type || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [balances, filters.searchTerm, filters.location, filters.itemType, sortBy, sortOrder, stockFilter]);

  // Group by location
  const groupedByLocation = useMemo(() => {
    const groups: Record<string, StockBalance[]> = { STORE: [], PRODUCTION: [], FG_STORE: [] };
    filteredAndSortedBalances.forEach(b => {
      if (groups[b.location_code]) {
        groups[b.location_code].push(b);
      }
    });
    return groups;
  }, [filteredAndSortedBalances]);

  // Calculate totals per location
  const locationTotals = useMemo(() => {
    const totals: Record<string, { count: number; totalQty: number }> = {};
    Object.entries(groupedByLocation).forEach(([loc, items]) => {
      totals[loc] = {
        count: items.length,
        totalQty: items.reduce((sum, i) => sum + i.current_balance, 0)
      };
    });
    return totals;
  }, [groupedByLocation]);

  if (balances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Layers className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No stock data</p>
        <p className="text-sm">Apply filters to view stock levels</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full min-h-0">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredAndSortedBalances.length}</span> of <span className="font-semibold">{balances.length}</span> items
          {filters.searchTerm && <span className="text-gray-500"> matching "{filters.searchTerm}"</span>}
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ScrollText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
          {Object.entries(groupedByLocation).map(([location, items]) => (
            <div key={location} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full">
              {/* Location Header */}
              <div className={`px-4 py-3 border-b flex-shrink-0 ${
                location === 'STORE' ? 'bg-blue-50 border-blue-100' :
                location === 'PRODUCTION' ? 'bg-amber-50 border-amber-100' :
                'bg-emerald-50 border-emerald-100'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${
                      location === 'STORE' ? 'text-blue-600' :
                      location === 'PRODUCTION' ? 'text-amber-600' :
                      'text-emerald-600'
                    }`} />
                    <span className="font-semibold text-gray-900">{location.replace('_', ' ')}</span>
                  </div>
                  <span className="text-sm text-gray-500">{items.length} items</span>
                </div>
                {locationTotals[location] && (
                  <div className="text-xs text-gray-500 mt-1">
                    Total: {locationTotals[location].totalQty.toLocaleString('en-IN', { minimumFractionDigits: 2 })} units
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">No items</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="p-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {/* Show item name/description first, then item code */}
                            <div className="flex items-center gap-2 mb-1">
                              {/* Show item name/description prominently first */}
                              <span className="font-semibold text-gray-900">
                                {formatBalanceItemDisplayTitle(item)}
                              </span>
                              {/* Item Type Badge */}
                              {item.item_type && (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${ITEM_TYPE_COLORS[item.item_type]}`}>
                                  {item.item_type}
                                </span>
                              )}
                              {/* Location Badge - Aligned with item type badge */}
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${LOCATION_COLORS[item.location_code] || 'bg-gray-100 text-gray-700'}`}>
                                {item.location_code.replace('_', ' ')}
                              </span>
                            </div>
                            {/* Show item code below (secondary information) */}
                            <div className="text-sm text-gray-600 font-mono">
                              {item.item_code}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.item_type === 'FG' && fgBomData[item.item_code] ? (
                              // For FG items, show boxes and pcs
                              (() => {
                                const bom = fgBomData[item.item_code];
                                const packSize = parseFloat(bom.pack_size || '0') || 1;
                                const pcs = Math.abs(item.current_balance);
                                const boxes = packSize > 0 ? Math.floor(pcs / packSize) : 0;
                                const remainingPcs = pcs % packSize;
                                return (
                                  <div className={`text-right ${item.current_balance < 0 ? 'text-red-600' : item.current_balance === 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                                    <div className="font-bold text-lg">
                                      {boxes > 0 ? `${boxes} ${boxes === 1 ? 'box' : 'boxes'}` : ''}
                                    </div>
                                    <div className="text-sm font-medium">
                                      {pcs.toLocaleString()} pcs
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className={`text-right ${item.current_balance < 0 ? 'text-red-600' : item.current_balance === 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                                <div className="font-bold text-lg">
                                  {item.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-gray-500">{item.unit_of_measure}</div>
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); onViewHistory(item.item_code); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                              title="View movement history"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <Eye className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                          </div>
                        </div>
                        {item.current_balance < 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            Negative stock
                          </div>
                        )}
                        {item.current_balance === 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600">
                            <AlertTriangle className="w-3 h-3" />
                            Out of stock
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => { setSortBy('type'); setSortOrder(sortBy === 'type' && sortOrder === 'asc' ? 'desc' : 'asc'); }}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortBy === 'type' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => { setSortBy('code'); setSortOrder(sortBy === 'code' && sortOrder === 'asc' ? 'desc' : 'asc'); }}
                >
                  <div className="flex items-center gap-1">
                    Item Code
                    {sortBy === 'code' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => { setSortBy('name'); setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc'); }}
                >
                  <div className="flex items-center gap-1">
                    Item Name
                    {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th 
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => { setSortBy('balance'); setSortOrder(sortBy === 'balance' && sortOrder === 'asc' ? 'desc' : 'asc'); }}
                >
                  <div className="flex items-center justify-end gap-1">
                    Balance
                    {sortBy === 'balance' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">UOM</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Movement</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedBalances.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedItem(item)}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ITEM_TYPE_COLORS[item.item_type || 'RM']}`}>
                      {item.item_type || '?'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{item.item_code}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {/* Show item name/description first, then item code */}
                    <div className="flex items-center gap-2 mb-1">
                      {/* Show item name/description prominently first */}
                      <span className="font-semibold">
                        {formatBalanceItemDisplayTitle(item)}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${ITEM_TYPE_COLORS[item.item_type || 'RM']}`}>
                        {item.item_type || '?'}
                      </span>
                      {/* Location Badge - Aligned with item type badge */}
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${LOCATION_COLORS[item.location_code] || 'bg-gray-100 text-gray-700'}`}>
                        {item.location_code.replace('_', ' ')}
                      </span>
                    </div>
                    {/* Show item code below (secondary information) */}
                    <div className="text-xs text-gray-600 font-mono mt-1">
                      {item.item_code}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${LOCATION_COLORS[item.location_code]}`}>
                      <MapPin className="w-3 h-3" />
                      {item.location_code.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${
                    item.current_balance < 0 ? 'text-red-600' : 
                    item.current_balance === 0 ? 'text-yellow-600' : 
                    'text-gray-900'
                  }`}>
                    {item.item_type === 'FG' && fgBomData[item.item_code] ? (
                      // For FG items, show boxes and pcs
                      (() => {
                        const bom = fgBomData[item.item_code];
                        const packSize = parseFloat(bom.pack_size || '0') || 1;
                        const pcs = Math.abs(item.current_balance);
                        const boxes = packSize > 0 ? Math.floor(pcs / packSize) : 0;
                        return (
                          <div>
                            <div>{boxes > 0 ? `${boxes} ${boxes === 1 ? 'box' : 'boxes'}` : '0 boxes'}</div>
                            <div className="text-sm font-medium">{pcs.toLocaleString()} pcs</div>
                            {item.current_balance < 0 && <AlertTriangle className="w-3 h-3 ml-1 inline" />}
                          </div>
                        );
                      })()
                    ) : (
                      <>
                        {item.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {item.current_balance < 0 && <AlertTriangle className="w-3 h-3 ml-1 inline" />}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.item_type === 'FG' ? 'pcs' : item.unit_of_measure}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.last_movement_at ? formatDateTime(item.last_movement_at) : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onViewHistory(item.item_code); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View history"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <StockItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onViewHistory={(code) => { setSelectedItem(null); onViewHistory(code); }}
        fgBomData={fgBomData}
      />
    </div>
  );
};

// Helper function to parse remarks into structured data
const parseRemarks = (remarks?: string): Record<string, string> => {
  if (!remarks) return {};
  const parsed: Record<string, string> = {};
  
  // Split by pipe delimiter and parse each part
  const parts = remarks.split(' | ');
  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex > 0) {
      const key = part.substring(0, colonIndex).trim();
      const value = part.substring(colonIndex + 1).trim();
      parsed[key] = value;
    } else {
      // First part is usually the main description (e.g., "JW GRN from Party Name")
      if (!parsed['Source']) {
        parsed['Source'] = part.trim();
      }
    }
  }
  
  return parsed;
};

// Document table mapping for fetching source documents
const DOCUMENT_TABLE_MAP: Record<string, { table: string; docNoField: string }> = {
  'JW_GRN': { table: 'store_jw_annexure_grn', docNoField: 'doc_no' },
  'GRN': { table: 'store_grn', docNoField: 'grn_no' },
  'MIS': { table: 'store_mis', docNoField: 'issue_no' },
  'DPR': { table: 'dpr_data', docNoField: 'report_date' }, // DPR uses date-shift format
  'JOB_WORK_CHALLAN': { table: 'store_job_work_challan', docNoField: 'doc_no' },
  'FG_TRANSFER': { table: 'store_fgn', docNoField: 'transfer_no' },
  'DISPATCH': { table: 'dispatch_delivery_challan', docNoField: 'sr_no' },
};

// URL mapping for viewing source documents
const DOCUMENT_VIEW_URLS: Record<string, string> = {
  'JW_GRN': '/api/store/jw-annexure-grn',
  'GRN': '/api/store/grn',
  'MIS': '/api/store/mis',
  'JOB_WORK_CHALLAN': '/api/store/job-work-challan',
  'FG_TRANSFER': '/api/store/fg-transfer',
  'DISPATCH': '/api/dispatch',
  'DPR': '/api/dpr',
};

// Detail Panel Component
const DetailPanel: React.FC<{
  entry: StockLedgerEntry;
  onClose: () => void;
}> = ({ entry, onClose }) => {
  const [sourceDocNo, setSourceDocNo] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [showSourceDoc, setShowSourceDoc] = useState(false);
  const [sourceDocData, setSourceDocData] = useState<any>(null);
  const [sourceDocItems, setSourceDocItems] = useState<any[]>([]);
  const [loadingSourceDoc, setLoadingSourceDoc] = useState(false);
  
  const docInfo = DOCUMENT_TYPE_INFO[entry.document_type] || { label: entry.document_type, color: 'bg-gray-100', icon: FileText };
  const DocIcon = docInfo.icon;
  
  // Parse remarks to extract detailed info
  const parsedRemarks = parseRemarks(entry.remarks);
  const parsedInfo = parseRemarksForList(entry.remarks);
  
  // Get item details from joined data
  const itemName = entry.stock_items?.item_name;
  const itemType = entry.stock_items?.item_type;
  const subCategory = entry.stock_items?.sub_category;
  
  // Format display title based on item type
  const displayTitle = formatItemDisplayTitle(entry, parsedInfo);
  
  // For RM items, get supplier from raw_materials based on grade
  const [supplier, setSupplier] = useState<string | null>(null);
  useEffect(() => {
    if (itemType === 'RM' && parsedInfo.grade) {
      // Fetch supplier from raw_materials table
      rawMaterialAPI.getAll()
        .then(rawMaterials => {
          // Find matching grade and get supplier
          const matched = rawMaterials.find((rm: any) => 
            rm.grade?.toLowerCase() === parsedInfo.grade?.toLowerCase()
          );
          if (matched && matched.supplier) {
            setSupplier(matched.supplier);
          }
        })
        .catch(err => console.error('Error fetching supplier:', err));
    }
  }, [itemType, parsedInfo.grade]);

  // For FG items, fetch data from source document or parse from remarks
  const [fgDetails, setFgDetails] = useState<{
    fgCode: string;
    color: string;
    itemName: string;
    party: string;
    packSize: number;
    qtyBoxes: number;
    totalQtyPcs: number;
    totalQtyKg: number;
  } | null>(null);
  
  useEffect(() => {
    if (itemType === 'FG' && entry.item_code) {
      // Extract FG code and color from item_code (format: {fg_code}-{color})
      const lastDashIndex = entry.item_code.lastIndexOf('-');
      let fgCode = entry.item_code;
      let color = '';
      
      if (lastDashIndex > 0 && lastDashIndex < entry.item_code.length - 1) {
        fgCode = entry.item_code.substring(0, lastDashIndex);
        color = entry.item_code.substring(lastDashIndex + 1);
      }
      
      // Try to get data from source document first (FG Transfer Note)
      if (entry.document_type === 'FG_TRANSFER' && entry.document_id) {
        fetch(`/api/production/fg-transfer-note/${entry.document_id}`)
          .then(res => res.json())
          .then(result => {
            if (result.success && result.data && result.items) {
              // Find matching item by FG code and color
              const item = result.items.find((i: any) => 
                i.fg_code === fgCode && i.color === color
              );
              
              if (item) {
                // All data is already calculated in FG Transfer Note
                setFgDetails({
                  fgCode,
                  color: item.color || color,
                  itemName: item.item_name || itemName || '',
                  party: item.party || '',
                  packSize: item.pack_size || 0,
                  qtyBoxes: item.qty_boxes || 0,
                  totalQtyPcs: item.total_qty_pcs || entry.quantity || 0,
                  totalQtyKg: item.total_qty_kg || (item.total_qty_ton ? item.total_qty_ton * 1000 : 0) // Convert tons to KG if needed
                });
                return;
              }
            }
            
            // If not found in source doc, parse from remarks or use BOM for pack_size
            parseFGDataFromRemarks(entry.remarks || '', fgCode, color, entry.quantity);
          })
          .catch(() => {
            // If fetch fails, parse from remarks
            parseFGDataFromRemarks(entry.remarks || '', fgCode, color, entry.quantity);
          });
      } else {
        // For opening stock or other sources, parse from remarks
        parseFGDataFromRemarks(entry.remarks || '', fgCode, color, entry.quantity);
      }
    }
    
    function parseFGDataFromRemarks(remarks: string, fgCode: string, color: string, quantity: number) {
      let party = '';
      let packSize = 0;
      let qtyBoxes = 0;
      let totalQtyKg = 0;
      
      // Parse opening stock remarks: "Bulk upload: FG Export RP-Ro10-Ex (Black) (30 boxes)"
      const boxesMatch = remarks.match(/\((\d+)\s*boxes?\)/i);
      if (boxesMatch) {
        qtyBoxes = parseInt(boxesMatch[1]) || 0;
      }
      
      // Parse FG Transfer Note remarks: "FG produced: 30 boxes × 300 pcs (Weight: 123.45 KG)"
      const fgTransferMatch = remarks.match(/(\d+)\s*boxes?\s*×\s*(\d+)\s*pcs/i);
      if (fgTransferMatch) {
        qtyBoxes = parseInt(fgTransferMatch[1]) || 0;
        packSize = parseInt(fgTransferMatch[2]) || 0;
      }
      
      // Parse KG from remarks: "Weight: 123.45 KG"
      const kgMatch = remarks.match(/Weight:\s*([\d.]+)\s*KG/i);
      if (kgMatch) {
        totalQtyKg = parseFloat(kgMatch[1]) || 0;
      }
      
      // If boxes not found in remarks, calculate from quantity and pack_size
      // Fetch pack_size from BOM (fg_bom or local_bom) if needed
      if (qtyBoxes === 0 && quantity > 0) {
        const isExport = fgCode.startsWith('2');
        
        fetch(`/api/production/fg-transfer-note/bom-data`)
          .then(res => res.json())
          .then(result => {
            if (result.success && result.data) {
              // Find matching BOM entry (only fg_bom or local_bom, never sfg_bom)
              const bom = result.data.find((b: any) => 
                b.item_code === fgCode && (b.category === 'FG' || b.category === 'LOCAL')
              );
              
              if (bom) {
                const packSizeStr = bom.pack_size || '0';
                packSize = parseFloat(packSizeStr.toString().replace(/[^0-9.]/g, '')) || 0;
                qtyBoxes = packSize > 0 ? quantity / packSize : 0;
                
                // Calculate KG from BOM if we have int_wt data
                let calculatedKg = 0;
                if (bom.sfg1_int_wt && bom.sfg2_int_wt && packSize > 0) {
                  // Formula: Total Qty (KG) = Total Qty (pcs) × (SFG1_rp_int_wt + SFG2_rp_int_wt) / 1000
                  const sfg1RpIntWt = bom.sfg1_int_wt || 0;
                  const sfg2RpIntWt = bom.sfg2_int_wt || 0;
                  calculatedKg = quantity * (sfg1RpIntWt + sfg2RpIntWt) / 1000;
                }
                
                setFgDetails({
                  fgCode,
                  color,
                  itemName: bom.item_name || itemName || '',
                  party: bom.party_name || party || '',
                  packSize,
                  qtyBoxes: Math.round(qtyBoxes * 100) / 100,
                  totalQtyPcs: quantity,
                  totalQtyKg: totalQtyKg || calculatedKg
                });
              } else {
                // BOM not found, just show what we have
                setFgDetails({
                  fgCode,
                  color,
                  itemName: itemName || '',
                  party: '',
                  packSize: 0,
                  qtyBoxes: 0,
                  totalQtyPcs: quantity,
                  totalQtyKg: totalQtyKg
                });
              }
            }
          })
          .catch(() => {
            // BOM fetch failed, show what we have
            setFgDetails({
              fgCode,
              color,
              itemName: itemName || '',
              party: '',
              packSize: 0,
              qtyBoxes: 0,
              totalQtyPcs: quantity,
              totalQtyKg: totalQtyKg
            });
          });
      } else {
        // We have boxes from remarks, set details
        setFgDetails({
          fgCode,
          color,
          itemName: itemName || '',
          party,
          packSize,
          qtyBoxes,
          totalQtyPcs: quantity,
          totalQtyKg: totalQtyKg
        });
      }
    }
  }, [itemType, entry.item_code, entry.quantity, entry.remarks, entry.document_type, entry.document_id, itemName]);
  
  // Calculate boxes from balance_after for summary card display
  const balanceBoxes = useMemo(() => {
    if (itemType === 'FG' && fgDetails && fgDetails.packSize > 0) {
      return Math.round((entry.balance_after / fgDetails.packSize) * 100) / 100;
    }
    return 0;
  }, [itemType, fgDetails, entry.balance_after]);
  
  // For RM items, show grade as item name instead of the category name
  const displayItemName = itemType === 'RM' && parsedInfo.grade 
    ? parsedInfo.grade 
    : itemName;
  
  // Fetch the correct document number from source document
  useEffect(() => {
    const fetchSourceDocNo = async () => {
      const docConfig = DOCUMENT_TABLE_MAP[entry.document_type];
      if (!docConfig || !entry.document_id) return;
      
      setLoadingDoc(true);
      try {
        const response = await fetch(`/api/stock/source-doc?table=${docConfig.table}&id=${entry.document_id}&field=${docConfig.docNoField}`);
        if (response.ok) {
          const data = await response.json();
          if (data.doc_no) {
            setSourceDocNo(data.doc_no);
          }
        }
      } catch (error) {
        console.error('Error fetching source doc:', error);
      } finally {
        setLoadingDoc(false);
      }
    };
    
    fetchSourceDocNo();
  }, [entry.document_id, entry.document_type]);
  
  // Use fetched doc_no, then Doc No from remarks, then stored document_number
  const displayDocNo = sourceDocNo || parsedRemarks['Doc No'] || entry.document_number || '-';

  // Fetch and view source document
  const handleViewSourceDocument = async () => {
    if (!entry.document_id) return;
    
    setLoadingSourceDoc(true);
    setShowSourceDoc(true);
    
    try {
      // Fetch based on document type using Supabase API functions
      if (entry.document_type === 'JW_GRN') {
        const data = await jwAnnexureGRNAPI.getById(entry.document_id);
        if (data) {
          setSourceDocData(data.grn);
          setSourceDocItems(data.items || []);
        }
      } else if (entry.document_type === 'GRN') {
        const data = await grnAPI.getById(entry.document_id);
        if (data) {
          setSourceDocData(data.grn);
          setSourceDocItems(data.items || []);
        }
      } else if (entry.document_type === 'MIS') {
        const data = await misAPI.getById(entry.document_id);
        if (data) {
          setSourceDocData(data.mis);
          setSourceDocItems(data.items || []);
        }
      } else {
        // For other document types, try to fetch from API endpoint
        let apiUrl = '';
        if (entry.document_type === 'JOB_WORK_CHALLAN') {
          apiUrl = `/api/store/job-work-challan/${entry.document_id}`;
        } else if (entry.document_type === 'FG_TRANSFER') {
          apiUrl = `/api/production/fg-transfer-note/${entry.document_id}`;
        } else {
          console.warn('Unsupported document type for viewing:', entry.document_type);
          setLoadingSourceDoc(false);
          return;
        }
        
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setSourceDocData(data.data);
            setSourceDocItems(data.items || data.data?.items || []);
          } else {
            setSourceDocData(data);
            setSourceDocItems(data.items || []);
          }
        } else {
          console.error('Failed to fetch source document');
        }
      }
    } catch (error) {
      console.error('Error fetching source document:', error);
    } finally {
      setLoadingSourceDoc(false);
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Movement Details</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Display formatted title based on item type */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg text-gray-900">{displayTitle}</span>
          {itemType && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
              itemType === 'RM' ? 'bg-orange-100 text-orange-800' :
              itemType === 'PM' ? 'bg-purple-100 text-purple-800' :
              itemType === 'SFG' ? 'bg-blue-100 text-blue-800' :
              itemType === 'FG' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {itemType}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Movement Summary */}
        <div className={`p-4 rounded-xl ${
          entry.movement_type === 'IN' ? 'bg-green-50' :
          entry.movement_type === 'OUT' ? 'bg-red-50' : 'bg-blue-50'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            {entry.movement_type === 'IN' ? (
              <ArrowDownCircle className="w-8 h-8 text-green-600" />
            ) : entry.movement_type === 'OUT' ? (
              <ArrowUpCircle className="w-8 h-8 text-red-600" />
            ) : (
              <ArrowRightCircle className="w-8 h-8 text-blue-600" />
            )}
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {entry.movement_type === 'IN' ? '+' : entry.movement_type === 'OUT' ? '-' : ''}
                {Math.abs(entry.quantity).toFixed(2)} {entry.unit_of_measure}
              </div>
              <div className="text-sm text-gray-600">
                {entry.movement_type === 'IN' ? 'Received' : entry.movement_type === 'OUT' ? 'Issued' : 'Transferred'}
              </div>
              {/* Show boxes for FG items based on movement quantity */}
              {itemType === 'FG' && fgDetails && fgDetails.qtyBoxes > 0 && (
                <div className="text-sm text-gray-700 mt-1">
                  ({fgDetails.qtyBoxes.toFixed(0)} boxes)
                </div>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Balance after: <span className="font-semibold text-gray-900">{entry.balance_after.toFixed(2)}</span>
            {/* Show boxes for FG items based on balance */}
            {itemType === 'FG' && balanceBoxes > 0 && (
              <span className="ml-2 text-gray-700">
                ({balanceBoxes.toFixed(0)} boxes)
              </span>
            )}
          </div>
        </div>

        {/* Item Information */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Item Information</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-gray-500">Item Code</span>
              <span className="font-mono font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{entry.item_code}</span>
            </div>
            {displayItemName && (
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Item Name</span>
                <span className="font-medium text-gray-900 text-right max-w-[180px]">{displayItemName}</span>
              </div>
            )}
            {itemType === 'RM' && supplier && (
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Supplier</span>
                <span className="font-medium text-gray-900 text-right max-w-[180px]">{supplier}</span>
              </div>
            )}
            {itemType && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Item Type</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ITEM_TYPE_COLORS[itemType] || 'bg-gray-100 text-gray-800'}`}>
                  {itemType}
                </span>
              </div>
            )}
            {subCategory && (
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Category</span>
                <span className="font-medium text-gray-900">{subCategory.replace('RM-', '')}</span>
              </div>
            )}
            {/* FG-specific fields */}
            {itemType === 'FG' && fgDetails && (
              <>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">FG Code</span>
                  <span className="font-mono font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{fgDetails.fgCode}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Item Name</span>
                  <span className="font-medium text-gray-900 text-right max-w-[180px]">{fgDetails.itemName}</span>
                </div>
                {fgDetails.party && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Party</span>
                    <span className="font-medium text-gray-900 text-right max-w-[180px]">{fgDetails.party}</span>
                  </div>
                )}
                {fgDetails.color && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Color</span>
                    <span className="font-medium text-gray-900 text-right max-w-[180px]">{fgDetails.color}</span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Qty (boxes)</span>
                  <span className="font-medium text-gray-900">{fgDetails.qtyBoxes.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Total Qty (pcs)</span>
                  <span className="font-medium text-gray-900">{fgDetails.totalQtyPcs.toLocaleString()}</span>
                </div>
                {fgDetails.totalQtyKg > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Total Qty (KG)</span>
                    <span className="font-medium text-gray-900">{fgDetails.totalQtyKg.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Location</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${LOCATION_COLORS[entry.location_code] || 'bg-gray-100 text-gray-700'}`}>
                {entry.location_code.replace('_', ' ')}
              </span>
            </div>
            {entry.counterpart_location && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Transfer To/From</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${LOCATION_COLORS[entry.counterpart_location] || 'bg-gray-100 text-gray-700'}`}>
                  {entry.counterpart_location.replace('_', ' ')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Unit</span>
              <span className="font-medium text-gray-900">{entry.unit_of_measure}</span>
            </div>
            {/* JOB_WORK_CHALLAN specific: Show both bill_wt and int_wt */}
            {entry.document_type === 'JOB_WORK_CHALLAN' && entry.remarks && (
              <>
                {(() => {
                  // Parse bill_wt and int_wt from remarks
                  // Format: "... (X Pcs, Bill Wt: Y.YY KG, Int Wt: Z.ZZ KG)"
                  const billWtMatch = entry.remarks.match(/Bill Wt:\s*([\d.]+)\s*KG/i);
                  const intWtMatch = entry.remarks.match(/Int Wt:\s*([\d.]+)\s*KG/i);
                  const pcsMatch = entry.remarks.match(/\((\d+)\s*Pcs/i);
                  
                  const billWt = billWtMatch ? parseFloat(billWtMatch[1]) : null;
                  const intWt = intWtMatch ? parseFloat(intWtMatch[1]) : null;
                  const pcs = pcsMatch ? parseInt(pcsMatch[1]) : null;
                  
                  return (
                    <>
                      {pcs !== null && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500">Qty (Pcs)</span>
                          <span className="font-medium text-gray-900">-{pcs.toLocaleString()}</span>
                        </div>
                      )}
                      {billWt !== null && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500">Bill Wt (KG)</span>
                          <span className="font-medium text-gray-900">{billWt.toFixed(2)}</span>
                        </div>
                      )}
                      {intWt !== null && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500">Int Wt (KG)</span>
                          <span className="font-medium text-gray-900">{intWt.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* Source Document */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Source Document</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Document Type</span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${docInfo.color}`}>
                <DocIcon className="w-3 h-3" />
                {docInfo.label}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-500">Document No.</span>
              <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {loadingDoc ? '...' : displayDocNo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction Date</span>
              <span className="font-medium text-gray-900">{formatDate(entry.transaction_date)}</span>
            </div>
          </div>
        </div>

        {/* Parsed Details from Remarks */}
        {Object.keys(parsedRemarks).length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Transaction Details</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {parsedRemarks['Source'] && (
                <div className="pb-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-900">{parsedRemarks['Source']}</span>
                </div>
              )}
              {parsedRemarks['JW No'] && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">JW No</span>
                  <span className="font-medium text-gray-900">{parsedRemarks['JW No']}</span>
                </div>
              )}
              {parsedRemarks['Material'] && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Material</span>
                  <span className="font-medium text-gray-900">{parsedRemarks['Material']}</span>
                </div>
              )}
              {parsedRemarks['Grade'] && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Grade</span>
                  <span className="font-medium text-gray-900">{parsedRemarks['Grade']}</span>
                </div>
              )}
              {parsedRemarks['Indent'] && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Indent No</span>
                  <span className="font-medium text-gray-900">{parsedRemarks['Indent']}</span>
                </div>
              )}
              {parsedRemarks['Party'] && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Party</span>
                  <span className="font-medium text-gray-900 text-right max-w-[150px]">{parsedRemarks['Party']}</span>
                </div>
              )}
              {parsedRemarks['Mold'] && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Mold</span>
                  <span className="font-medium text-gray-900">{parsedRemarks['Mold']}</span>
                </div>
              )}
              {parsedRemarks['Shift'] && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shift</span>
                  <span className="font-medium text-gray-900">{parsedRemarks['Shift']}</span>
                </div>
              )}
              {parsedRemarks['Line'] && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Line</span>
                  <span className="font-medium text-gray-900">{parsedRemarks['Line']}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Trail */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Audit Trail</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Posted By</span>
              <span className="font-medium text-gray-900">{entry.posted_by || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Posted At</span>
              <span className="font-medium text-gray-900">{entry.posted_at ? formatDateTime(entry.posted_at) : '-'}</span>
            </div>
            {entry.batch_number && (
              <div className="flex justify-between">
                <span className="text-gray-500">Batch</span>
                <span className="font-medium text-gray-900">{entry.batch_number}</span>
              </div>
            )}
            {entry.reference_number && (
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="font-medium text-gray-900">{entry.reference_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Raw Remarks (for anything not parsed) */}
        {entry.remarks && !Object.keys(parsedRemarks).length && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Remarks</h4>
            <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-3">{entry.remarks}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-200">
        <button 
          onClick={handleViewSourceDocument}
          disabled={!entry.document_id}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink className="w-4 h-4" />
          View Source Document
        </button>
      </div>

      {/* Source Document Modal */}
      {showSourceDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSourceDoc(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{docInfo.label}</h3>
                <p className="text-slate-200 text-sm">Document No: {displayDocNo}</p>
              </div>
              <button
                onClick={() => setShowSourceDoc(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingSourceDoc ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
                  <p className="mt-4 text-gray-600">Loading document...</p>
                </div>
              ) : sourceDocData ? (
                <div className="space-y-6">
                  {/* Document Information */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Document Information
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {sourceDocData.doc_no && (
                        <div>
                          <label className="text-xs text-gray-500">Document Number</label>
                          <p className="font-semibold text-gray-900">{sourceDocData.doc_no}</p>
                        </div>
                      )}
                      {sourceDocData.jw_no && (
                        <div>
                          <label className="text-xs text-gray-500">JW Number</label>
                          <p className="font-semibold text-gray-900">{sourceDocData.jw_no}</p>
                        </div>
                      )}
                      {sourceDocData.date && (
                        <div>
                          <label className="text-xs text-gray-500">Date</label>
                          <p className="font-semibold text-gray-900">{formatDate(sourceDocData.date)}</p>
                        </div>
                      )}
                      {sourceDocData.party_name && (
                        <div>
                          <label className="text-xs text-gray-500">Party Name</label>
                          <p className="font-semibold text-gray-900">{sourceDocData.party_name}</p>
                        </div>
                      )}
                      {sourceDocData.indent_no && (
                        <div>
                          <label className="text-xs text-gray-500">Indent Number</label>
                          <p className="font-semibold text-gray-900">{sourceDocData.indent_no}</p>
                        </div>
                      )}
                      {sourceDocData.challan_no && (
                        <div>
                          <label className="text-xs text-gray-500">Challan Number</label>
                          <p className="font-semibold text-gray-900">{sourceDocData.challan_no}</p>
                        </div>
                      )}
                      {sourceDocData.gst_no && (
                        <div>
                          <label className="text-xs text-gray-500">GST Number</label>
                          <p className="font-semibold text-gray-900">{sourceDocData.gst_no}</p>
                        </div>
                      )}
                      {/* Issue Slip specific fields */}
                      {sourceDocData.dept_name && (
                        <div>
                          <label className="text-xs text-gray-500">Department</label>
                          <p className="font-semibold text-gray-900">{sourceDocData.dept_name}</p>
                        </div>
                      )}
                      {sourceDocData.issue_no && (
                        <div>
                          <label className="text-xs text-gray-500">Issue Number</label>
                          <p className="font-semibold text-gray-900">{sourceDocData.issue_no}</p>
                        </div>
                      )}
                      {sourceDocData.total_value && (
                        <div>
                          <label className="text-xs text-gray-500">Total Value</label>
                          <p className="font-semibold text-gray-900">₹{Number(sourceDocData.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                      )}
                      {sourceDocData.stock_status && (
                        <div>
                          <label className="text-xs text-gray-500">Stock Status</label>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            sourceDocData.stock_status === 'POSTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sourceDocData.stock_status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  {sourceDocItems.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Items ({sourceDocItems.length})
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sr.</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                {entry.document_type === 'MIS' ? 'Store Stock' : 'Req/Indent Qty'}
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                {entry.document_type === 'MIS' ? 'Issued Stock' : 'Issue/Rcd Qty'}
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {sourceDocItems.map((item, index) => (
                              <tr key={item.id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-600">{item.sr_no || index + 1}</td>
                                <td className="px-4 py-2 text-sm font-mono text-gray-900">{item.item_code || '-'}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.item_name || item.description_of_material || '-'}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{item.uom || '-'}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">{item.indent_qty || item.required_qty || '-'}</td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">{item.rcd_qty || item.issue_qty || item.qty || '-'}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">
                                  {item.rate ? `₹${Number(item.rate).toFixed(2)}` : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                                  {item.net_value ? `₹${Number(item.net_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Could not load document details</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowSourceDoc(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Analytics View Component
const AnalyticsView: React.FC<{
  entries: StockLedgerEntry[];
  balances: StockBalance[];
}> = ({ entries, balances }) => {
  // Calculate analytics
  const analytics = useMemo(() => {
    const byDocument: Record<string, number> = {};
    const byLocation: Record<string, { in: number; out: number }> = {};
    
    entries.forEach(e => {
      byDocument[e.document_type] = (byDocument[e.document_type] || 0) + 1;
      
      if (!byLocation[e.location_code]) {
        byLocation[e.location_code] = { in: 0, out: 0 };
      }
      if (e.movement_type === 'IN') {
        byLocation[e.location_code].in += Math.abs(e.quantity);
      } else if (e.movement_type === 'OUT') {
        byLocation[e.location_code].out += Math.abs(e.quantity);
      }
    });
    
    const totalValue = balances.reduce((sum, b) => sum + b.current_balance, 0);
    const itemsWithStock = balances.filter(b => b.current_balance > 0).length;
    const zeroStock = balances.filter(b => b.current_balance === 0).length;
    const negativeStock = balances.filter(b => b.current_balance < 0).length;
    
    return { byDocument, byLocation, totalValue, itemsWithStock, zeroStock, negativeStock };
  }, [entries, balances]);

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-sm text-gray-500">Items with Stock</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{analytics.itemsWithStock}</div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Box className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-sm text-gray-500">Zero Stock</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{analytics.zeroStock}</div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-sm text-gray-500">Negative Stock</div>
          </div>
          <div className="text-2xl font-bold text-red-600">{analytics.negativeStock}</div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-500">Total Movements</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{entries.length}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Type Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Movements by Document Type</h3>
          <div className="space-y-3">
            {Object.entries(analytics.byDocument)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const docInfo = DOCUMENT_TYPE_INFO[type] || { label: type, color: 'bg-gray-100' };
                const percentage = (count / entries.length) * 100;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={`px-2 py-0.5 rounded ${docInfo.color}`}>{docInfo.label}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Location Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Location Activity</h3>
          <div className="space-y-4">
            {Object.entries(analytics.byLocation).map(([location, activity]) => (
              <div key={location} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${LOCATION_COLORS[location]}`}>
                    {location.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="text-xs text-gray-500">In</div>
                      <div className="font-semibold text-gray-900">{activity.in.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="text-xs text-gray-500">Out</div>
                      <div className="font-semibold text-gray-900">{activity.out.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockLedgerModule;

