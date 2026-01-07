'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Database,
  Plus,
  X,
  Play,
  Download,
  Loader2,
  ChevronDown,
  Calendar,
  Filter,
  BarChart3,
  Table2,
  Calculator,
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { DATA_SOURCES, DataSourceId, AGGREGATION_FUNCTIONS, AggregationFunction } from '@/lib/reports/data-sources';
import ChartPreview from './ChartPreview';
import DataTable from './DataTable';

// ============================================================================
// TYPES
// ============================================================================

interface QueryField {
  id: string;
  field: string;
  aggregation?: AggregationFunction;
  alias?: string;
}

interface QueryFilter {
  id: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: string;
}

interface QuickQueryPreset {
  id: string;
  name: string;
  description: string;
  dataSource: DataSourceId;
  fields: QueryField[];
  groupBy?: string[];
  icon: string;
}

// ============================================================================
// QUICK QUERY PRESETS
// ============================================================================

const QUICK_PRESETS: QuickQueryPreset[] = [
  {
    id: 'prod_sum_date',
    name: 'Production Sum by Date',
    description: 'Total OK production qty for selected dates',
    dataSource: 'production',
    fields: [
      { id: '1', field: 'ok_prod_qty', aggregation: 'SUM', alias: 'total_ok_qty' },
      { id: '2', field: 'ok_prod_kgs', aggregation: 'SUM', alias: 'total_ok_kgs' },
    ],
    groupBy: ['date'],
    icon: '📊',
  },
  {
    id: 'prod_by_shift',
    name: 'Production by Shift',
    description: 'Compare DAY vs NIGHT shift production',
    dataSource: 'production',
    fields: [
      { id: '1', field: 'ok_prod_qty', aggregation: 'SUM', alias: 'total_ok_qty' },
      { id: '2', field: 'rej_kgs', aggregation: 'SUM', alias: 'total_rej_kgs' },
    ],
    groupBy: ['shift'],
    icon: '🌓',
  },
  {
    id: 'prod_by_line',
    name: 'Production by Line',
    description: 'Line-wise production summary',
    dataSource: 'production',
    fields: [
      { id: '1', field: 'ok_prod_qty', aggregation: 'SUM', alias: 'total_ok_qty' },
      { id: '2', field: 'ok_prod_kgs', aggregation: 'SUM', alias: 'total_ok_kgs' },
      { id: '3', field: 'rej_kgs', aggregation: 'SUM', alias: 'total_rej_kgs' },
    ],
    groupBy: ['line_id'],
    icon: '🏭',
  },
  {
    id: 'prod_by_mold',
    name: 'Production by Mold',
    description: 'Mold-wise production summary',
    dataSource: 'production',
    fields: [
      { id: '1', field: 'ok_prod_qty', aggregation: 'SUM', alias: 'total_ok_qty' },
      { id: '2', field: 'ok_prod_kgs', aggregation: 'SUM', alias: 'total_ok_kgs' },
    ],
    groupBy: ['product'],
    icon: '🔧',
  },
  {
    id: 'dispatch_by_customer',
    name: 'Dispatch by Customer',
    description: 'Customer-wise dispatch summary',
    dataSource: 'dispatch',
    fields: [
      { id: '1', field: 'no_of_pcs', aggregation: 'SUM', alias: 'total_pieces' },
      { id: '2', field: 'no_of_pcs', aggregation: 'COUNT', alias: 'dispatch_count' },
    ],
    groupBy: ['party_name'],
    icon: '📦',
  },
  {
    id: 'stock_movements',
    name: 'Stock Movements',
    description: 'IN/OUT stock movements summary',
    dataSource: 'stock',
    fields: [
      { id: '1', field: 'quantity', aggregation: 'SUM', alias: 'total_qty' },
      { id: '2', field: 'quantity', aggregation: 'COUNT', alias: 'movement_count' },
    ],
    groupBy: ['movement_type'],
    icon: '📊',
  },
  {
    id: 'grn_by_supplier',
    name: 'GRN by Supplier',
    description: 'Supplier-wise GRN summary',
    dataSource: 'grn',
    fields: [
      { id: '1', field: 'total_qty', aggregation: 'SUM', alias: 'total_qty' },
      { id: '2', field: 'total_price', aggregation: 'SUM', alias: 'total_value' },
    ],
    groupBy: ['party_name'],
    icon: '🛒',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DataExplorer: React.FC = () => {
  // State
  const [dataSource, setDataSource] = useState<DataSourceId>('production');
  const [selectedFields, setSelectedFields] = useState<QueryField[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [shifts, setShifts] = useState<('DAY' | 'NIGHT')[]>([]);
  
  // Results state
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [showHelp, setShowHelp] = useState(false);
  
  // Get current data source config
  const currentDataSource = useMemo(() => DATA_SOURCES[dataSource], [dataSource]);
  const aggregatableFields = useMemo(() => 
    currentDataSource.fields.filter(f => f.aggregatable), 
    [currentDataSource]
  );
  const groupableFields = useMemo(() => 
    currentDataSource.fields.filter(f => f.type === 'text' || f.type === 'date'),
    [currentDataSource]
  );

  // Handle data source change
  const handleDataSourceChange = (newSource: DataSourceId) => {
    setDataSource(newSource);
    setSelectedFields([]);
    setGroupBy([]);
    setFilters([]);
    setResults(null);
  };

  // Add a field
  const addField = useCallback(() => {
    const newId = Date.now().toString();
    setSelectedFields(prev => [...prev, {
      id: newId,
      field: aggregatableFields[0]?.id || '',
      aggregation: 'SUM',
    }]);
  }, [aggregatableFields]);

  // Update a field
  const updateField = useCallback((id: string, updates: Partial<QueryField>) => {
    setSelectedFields(prev => 
      prev.map(f => f.id === id ? { ...f, ...updates } : f)
    );
  }, []);

  // Remove a field
  const removeField = useCallback((id: string) => {
    setSelectedFields(prev => prev.filter(f => f.id !== id));
  }, []);

  // Add a filter
  const addFilter = useCallback(() => {
    const newId = Date.now().toString();
    setFilters(prev => [...prev, {
      id: newId,
      field: currentDataSource.fields[0]?.id || '',
      operator: 'eq',
      value: '',
    }]);
  }, [currentDataSource.fields]);

  // Update a filter
  const updateFilter = useCallback((id: string, updates: Partial<QueryFilter>) => {
    setFilters(prev => 
      prev.map(f => f.id === id ? { ...f, ...updates } : f)
    );
  }, []);

  // Remove a filter
  const removeFilter = useCallback((id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  }, []);

  // Apply a quick preset
  const applyPreset = useCallback((preset: QuickQueryPreset) => {
    setDataSource(preset.dataSource);
    setSelectedFields(preset.fields);
    setGroupBy(preset.groupBy || []);
    setFilters([]);
  }, []);

  // Execute query
  const executeQuery = useCallback(async () => {
    if (selectedFields.length === 0) {
      setError('Please select at least one field');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reports/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSource,
          select: selectedFields.map(f => ({
            field: f.field,
            aggregation: f.aggregation,
            alias: f.alias || `${f.aggregation?.toLowerCase() || ''}_${f.field}`,
          })),
          groupBy: groupBy.length > 0 ? groupBy : undefined,
          filters: filters.filter(f => f.value).map(f => ({
            field: f.field,
            operator: f.operator,
            value: f.value,
          })),
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          shifts: shifts.length > 0 ? shifts : undefined,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Query failed');
      }
      
      setResults(result.data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [dataSource, selectedFields, groupBy, filters, dateFrom, dateTo, shifts]);

  // Export to CSV
  const exportCSV = useCallback(() => {
    if (!results || results.length === 0) return;
    
    const headers = Object.keys(results[0]);
    const csvContent = [
      headers.join(','),
      ...results.map(row => 
        headers.map(h => {
          const val = row[h];
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`;
          }
          return val;
        }).join(',')
      ),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-600" />
              Data Explorer
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Query any data from the system with flexible aggregations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="Help"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={executeQuery}
              disabled={loading || selectedFields.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Query
            </button>
            <button
              onClick={exportCSV}
              disabled={!results || results.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>
      
      {/* Help Panel */}
      {showHelp && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">How to use Data Explorer</h3>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>• <strong>Select a data source</strong> - Choose which module's data you want to query</li>
                <li>• <strong>Add fields</strong> - Pick which metrics to calculate (SUM, COUNT, AVG, etc.)</li>
                <li>• <strong>Group by</strong> - Choose how to group your data (by date, shift, line, etc.)</li>
                <li>• <strong>Filter</strong> - Set date range and other filters to narrow results</li>
                <li>• <strong>Example:</strong> To get "sum of 5th Jan both shifts OK prod qty", select Production source, add SUM of ok_prod_qty, set date to 5th Jan, and select both shifts</li>
              </ul>
            </div>
            <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-blue-100 rounded">
              <X className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Configuration Panel */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* Quick Presets */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PRESETS.filter(p => p.dataSource === dataSource).map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-lg">{preset.icon}</span>
                    <div className="mt-1 text-xs font-medium text-gray-900 line-clamp-1">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Data Source */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Data Source
              </label>
              <select
                value={dataSource}
                onChange={(e) => handleDataSourceChange(e.target.value as DataSourceId)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                {Object.values(DATA_SOURCES).map(ds => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">{currentDataSource.description}</p>
            </div>
            
            {/* Date Range */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <Calendar className="inline w-3 h-3 mr-1" />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm"
                  />
                </div>
              </div>
              
              {/* Shift Filter (for production) */}
              {dataSource === 'production' && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Shifts</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={shifts.includes('DAY')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setShifts(prev => [...prev, 'DAY']);
                          } else {
                            setShifts(prev => prev.filter(s => s !== 'DAY'));
                          }
                        }}
                        className="rounded border-gray-300 text-slate-600"
                      />
                      DAY
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={shifts.includes('NIGHT')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setShifts(prev => [...prev, 'NIGHT']);
                          } else {
                            setShifts(prev => prev.filter(s => s !== 'NIGHT'));
                          }
                        }}
                        className="rounded border-gray-300 text-slate-600"
                      />
                      NIGHT
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            {/* Fields to Calculate */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Calculator className="inline w-3 h-3 mr-1" />
                  Fields to Calculate
                </label>
                <button
                  onClick={addField}
                  className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              
              {selectedFields.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">Click "Add" to select fields</p>
              ) : (
                <div className="space-y-2">
                  {selectedFields.map(field => (
                    <div key={field.id} className="flex gap-2 items-center">
                      <select
                        value={field.aggregation || ''}
                        onChange={(e) => updateField(field.id, { aggregation: e.target.value as AggregationFunction })}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded-md text-xs"
                      >
                        {AGGREGATION_FUNCTIONS.map(agg => (
                          <option key={agg.id} value={agg.id}>{agg.name}</option>
                        ))}
                      </select>
                      <select
                        value={field.field}
                        onChange={(e) => updateField(field.id, { field: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs"
                      >
                        {aggregatableFields.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeField(field.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Group By */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Group Results By
              </label>
              <div className="flex flex-wrap gap-2">
                {groupableFields.map(field => (
                  <label
                    key={field.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                      groupBy.includes(field.id)
                        ? 'bg-slate-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={groupBy.includes(field.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupBy(prev => [...prev, field.id]);
                        } else {
                          setGroupBy(prev => prev.filter(g => g !== field.id));
                        }
                      }}
                      className="sr-only"
                    />
                    {field.name}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {groupBy.length === 0 
                  ? 'No grouping - will return total across all data' 
                  : `Grouping by: ${groupBy.join(', ')}`}
              </p>
            </div>
            
            {/* Additional Filters */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Filter className="inline w-3 h-3 mr-1" />
                  Additional Filters
                </label>
                <button
                  onClick={addFilter}
                  className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              
              {filters.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No additional filters</p>
              ) : (
                <div className="space-y-2">
                  {filters.map(filter => (
                    <div key={filter.id} className="flex gap-2 items-center">
                      <select
                        value={filter.field}
                        onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs"
                      >
                        {currentDataSource.fields.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value as QueryFilter['operator'] })}
                        className="w-16 px-2 py-1.5 border border-gray-200 rounded-md text-xs"
                      >
                        <option value="eq">=</option>
                        <option value="neq">≠</option>
                        <option value="gt">&gt;</option>
                        <option value="gte">≥</option>
                        <option value="lt">&lt;</option>
                        <option value="lte">≤</option>
                        <option value="like">~</option>
                      </select>
                      <input
                        type="text"
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Value..."
                        className="w-24 px-2 py-1.5 border border-gray-200 rounded-md text-xs"
                      />
                      <button
                        onClick={() => removeFilter(filter.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Results Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {/* Results */}
          <div className="flex-1 p-6 overflow-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto mb-3" />
                  <p className="text-gray-500">Running query...</p>
                </div>
              </div>
            ) : results && results.length > 0 ? (
              <div className="space-y-4">
                {/* View Toggle */}
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Results ({results.length} rows)</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-slate-100 text-slate-800' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <Table2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('chart')}
                      className={`p-2 rounded-lg ${viewMode === 'chart' ? 'bg-slate-100 text-slate-800' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Results Content */}
                {viewMode === 'table' ? (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <DataTable
                      data={results}
                      columns={Object.keys(results[0])}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <ChartPreview
                      data={results}
                      chartType="bar"
                      primaryDimension={groupBy[0]}
                      metrics={selectedFields.map(f => f.alias || `${f.aggregation?.toLowerCase()}_${f.field}`)}
                      options={{ showValues: true, showLegend: true }}
                    />
                  </div>
                )}
              </div>
            ) : results && results.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Table2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data</h3>
                  <p className="text-gray-500 text-sm">
                    No data found for the selected filters. Try adjusting your criteria.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Database className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Build Your Query</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Select a data source, add fields to calculate, and run your query to explore data.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                    <h4 className="font-medium text-amber-800 mb-2">Example: Sum of 5th Jan Both Shifts OK Prod Qty</h4>
                    <ol className="text-sm text-amber-700 space-y-1">
                      <li>1. Select "Production (DPR)" data source</li>
                      <li>2. Add field: SUM of "OK Production Qty (Nos)"</li>
                      <li>3. Set date From: 2026-01-05, To: 2026-01-05</li>
                      <li>4. Check both DAY and NIGHT shifts</li>
                      <li>5. Click "Run Query"</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExplorer;

