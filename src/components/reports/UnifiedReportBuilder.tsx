'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Database,
  Plus,
  X,
  Play,
  Download,
  Loader2,
  Calendar,
  BarChart3,
  Table2,
  Calculator,
  Info,
  Save,
  LineChart,
  PieChart,
  Hash,
  Settings2,
} from 'lucide-react';
import { DATA_SOURCES, DataSourceId, AGGREGATION_FUNCTIONS, AggregationFunction } from '@/lib/reports/data-sources';
import ChartPreview from './ChartPreview';
import DataTable from './DataTable';
import SaveReportDialog from './SaveReportDialog';

// ============================================================================
// TYPES
// ============================================================================

interface QueryField {
  id: string;
  field: string;
  aggregation?: AggregationFunction;
  alias?: string;
}

interface UnifiedReportBuilderProps {
  initialConfig?: Record<string, unknown>;
  onSave?: (config: Record<string, unknown>, name: string) => void;
}

// ============================================================================
// CHART TYPES
// ============================================================================

const CHART_TYPES = [
  { id: 'bar', name: 'Bar', icon: BarChart3, description: 'Vertical bars for comparison' },
  { id: 'horizontal_bar', name: 'Horizontal Bar', icon: BarChart3, description: 'Horizontal bars (good for many items)' },
  { id: 'line', name: 'Line', icon: LineChart, description: 'Trends over time' },
  { id: 'area', name: 'Area', icon: LineChart, description: 'Filled line chart' },
  { id: 'pie', name: 'Pie', icon: PieChart, description: 'Part of whole' },
  { id: 'donut', name: 'Donut', icon: PieChart, description: 'Pie with center hole' },
  { id: 'kpi_cards', name: 'KPI Cards', icon: Hash, description: 'Big numbers display' },
  { id: 'table', name: 'Table', icon: Table2, description: 'Data table view' },
];

// ============================================================================
// QUICK PRESETS
// ============================================================================

const QUICK_PRESETS = [
  // Production (DPR) presets
  {
    id: 'prod_total',
    name: 'Total Production',
    dataSource: 'production' as DataSourceId,
    fields: [{ id: '1', field: 'ok_prod_qty', aggregation: 'SUM' as AggregationFunction }],
    groupBy: [] as string[],
  },
  {
    id: 'prod_by_date',
    name: 'Production by Date',
    dataSource: 'production' as DataSourceId,
    fields: [{ id: '1', field: 'ok_prod_qty', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['date'],
  },
  {
    id: 'prod_by_shift',
    name: 'Production by Shift',
    dataSource: 'production' as DataSourceId,
    fields: [{ id: '1', field: 'ok_prod_qty', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['shift'],
  },
  {
    id: 'prod_by_line',
    name: 'Production by Line',
    dataSource: 'production' as DataSourceId,
    fields: [
      { id: '1', field: 'ok_prod_qty', aggregation: 'SUM' as AggregationFunction },
      { id: '2', field: 'rej_kgs', aggregation: 'SUM' as AggregationFunction },
    ],
    groupBy: ['line_id'],
  },
  {
    id: 'prod_by_mold',
    name: 'Production by Mold',
    dataSource: 'production' as DataSourceId,
    fields: [{ id: '1', field: 'ok_prod_qty', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['product'],
  },
  // Procurement flow presets
  {
    id: 'po_by_supplier',
    name: 'PO Value by Supplier',
    dataSource: 'purchase_order' as DataSourceId,
    fields: [{ id: '1', field: 'total_price', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['party_name'],
  },
  {
    id: 'po_by_type',
    name: 'PO by Type',
    dataSource: 'purchase_order' as DataSourceId,
    fields: [{ id: '1', field: 'total_price', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['po_type'],
  },
  {
    id: 'grn_by_supplier',
    name: 'GRN by Supplier',
    dataSource: 'grn' as DataSourceId,
    fields: [{ id: '1', field: 'total_qty', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['party_name'],
  },
  {
    id: 'mis_by_dept',
    name: 'MIS by Department',
    dataSource: 'mis' as DataSourceId,
    fields: [{ id: '1', field: 'issue_qty', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['department'],
  },
  {
    id: 'fg_transfer_total',
    name: 'FG Transfer Total',
    dataSource: 'fg_transfer' as DataSourceId,
    fields: [{ id: '1', field: 'total_qty', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['party_name'],
  },
  {
    id: 'dispatch_by_customer',
    name: 'Dispatch by Customer',
    dataSource: 'dispatch' as DataSourceId,
    fields: [{ id: '1', field: 'no_of_pcs', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['party_name'],
  },
  {
    id: 'stock_movements',
    name: 'Stock Movements',
    dataSource: 'stock' as DataSourceId,
    fields: [{ id: '1', field: 'quantity', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['document_type', 'movement_type'],
  },
  // Spare Parts presets
  {
    id: 'spare_by_category',
    name: 'Spare Parts by Category',
    dataSource: 'spare_parts' as DataSourceId,
    fields: [{ id: '1', field: 'total_balance', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['category'],
  },
  {
    id: 'spare_low_stock',
    name: 'Low Stock Spares',
    dataSource: 'spare_parts' as DataSourceId,
    fields: [
      { id: '1', field: 'total_balance', aggregation: 'SUM' as AggregationFunction },
      { id: '2', field: 'min_stock_level', aggregation: 'SUM' as AggregationFunction },
    ],
    groupBy: ['item_name', 'category'],
  },
  {
    id: 'spare_by_machine',
    name: 'Spare Parts by Machine',
    dataSource: 'spare_parts' as DataSourceId,
    fields: [{ id: '1', field: 'total_balance', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['for_machine'],
  },
  {
    id: 'spare_movements_summary',
    name: 'Spare Movements Summary',
    dataSource: 'spare_movements' as DataSourceId,
    fields: [{ id: '1', field: 'quantity', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['movement_type', 'document_type'],
  },
  // Maintenance presets
  {
    id: 'preventive_by_status',
    name: 'Preventive Tasks by Status',
    dataSource: 'preventive_maintenance' as DataSourceId,
    fields: [{ id: '1', field: 'total_cost', aggregation: 'COUNT' as AggregationFunction }],
    groupBy: ['status'],
  },
  {
    id: 'preventive_by_type',
    name: 'Preventive Tasks by Type',
    dataSource: 'preventive_maintenance' as DataSourceId,
    fields: [{ id: '1', field: 'total_cost', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['maintenance_type'],
  },
  {
    id: 'preventive_by_machine',
    name: 'Preventive Tasks by Machine',
    dataSource: 'preventive_maintenance' as DataSourceId,
    fields: [{ id: '1', field: 'actual_duration_hours', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['machine_id'],
  },
  {
    id: 'machine_breakdown_by_category',
    name: 'Machine Breakdown by Category',
    dataSource: 'machine_breakdown' as DataSourceId,
    fields: [
      { id: '1', field: 'downtime_hours', aggregation: 'SUM' as AggregationFunction },
      { id: '2', field: 'total_cost', aggregation: 'SUM' as AggregationFunction },
    ],
    groupBy: ['failure_category'],
  },
  {
    id: 'machine_breakdown_by_machine',
    name: 'Machine Breakdown by Machine',
    dataSource: 'machine_breakdown' as DataSourceId,
    fields: [{ id: '1', field: 'downtime_hours', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['machine_id'],
  },
  {
    id: 'mold_breakdown_by_mold',
    name: 'Mold Breakdown by Mold',
    dataSource: 'mold_breakdown' as DataSourceId,
    fields: [{ id: '1', field: 'downtime_hours', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['mold_id'],
  },
  {
    id: 'mold_breakdown_by_type',
    name: 'Mold Breakdown by Issue Type',
    dataSource: 'mold_breakdown' as DataSourceId,
    fields: [{ id: '1', field: 'total_cost', aggregation: 'SUM' as AggregationFunction }],
    groupBy: ['breakdown_type'],
  },
  // Quality presets
  {
    id: 'daily_weight_by_line',
    name: 'Daily Weight by Line',
    dataSource: 'daily_weight_report' as DataSourceId,
    fields: [{ id: '1', field: 'average_weight', aggregation: 'AVG' as AggregationFunction }],
    groupBy: ['line_id'],
  },
  {
    id: 'daily_weight_by_mold',
    name: 'Daily Weight by Mold',
    dataSource: 'daily_weight_report' as DataSourceId,
    fields: [{ id: '1', field: 'average_weight', aggregation: 'AVG' as AggregationFunction }],
    groupBy: ['mold_name'],
  },
  {
    id: 'fpa_by_line',
    name: 'FPA by Line',
    dataSource: 'first_pieces_approval' as DataSourceId,
    fields: [{ id: '1', field: 'no_of_cavity', aggregation: 'COUNT' as AggregationFunction }],
    groupBy: ['line_id', 'shift'],
  },
  {
    id: 'fpa_by_mold',
    name: 'FPA by Mold',
    dataSource: 'first_pieces_approval' as DataSourceId,
    fields: [{ id: '1', field: 'no_of_cavity', aggregation: 'COUNT' as AggregationFunction }],
    groupBy: ['mold_name'],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UnifiedReportBuilder: React.FC<UnifiedReportBuilderProps> = ({ initialConfig, onSave }) => {
  // State
  const [dataSource, setDataSource] = useState<DataSourceId>(
    (initialConfig?.dataSource as DataSourceId) || 'production'
  );
  const [selectedFields, setSelectedFields] = useState<QueryField[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [shifts, setShifts] = useState<('DAY' | 'NIGHT')[]>([]);
  const [chartType, setChartType] = useState<string>('bar');
  const [showValues, setShowValues] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  
  // Results state
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  
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
    setResults(null);
    setShowHelp(true);
  };

  // Add a field
  const addField = useCallback(() => {
    const newId = Date.now().toString();
    setSelectedFields(prev => [...prev, {
      id: newId,
      field: aggregatableFields[0]?.id || '',
      aggregation: 'SUM',
    }]);
    setShowHelp(false);
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

  // Apply a quick preset
  const applyPreset = useCallback((preset: typeof QUICK_PRESETS[0]) => {
    setDataSource(preset.dataSource);
    setSelectedFields(preset.fields);
    setGroupBy(preset.groupBy);
    setShowHelp(false);
  }, []);

  // Execute query
  const executeQuery = useCallback(async () => {
    if (selectedFields.length === 0) {
      setError('Please add at least one field to calculate');
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
      setShowHelp(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [dataSource, selectedFields, groupBy, dateFrom, dateTo, shifts]);

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
    a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  // Handle save
  const handleSave = (name: string) => {
    if (onSave) {
      onSave({
        dataSource,
        fields: selectedFields,
        groupBy,
        dateFrom,
        dateTo,
        shifts,
        chartType,
        showValues,
        showLegend,
      }, name);
    }
    setShowSaveDialog(false);
  };

  // Get metric names for chart
  const metricNames = useMemo(() => 
    selectedFields.map(f => f.alias || `${f.aggregation?.toLowerCase()}_${f.field}`),
    [selectedFields]
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-600" />
              Report Builder
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Query any data with flexible calculations, grouping, and visualizations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={executeQuery}
              disabled={loading || selectedFields.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Query
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={selectedFields.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={exportCSV}
              disabled={!results || results.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Configuration Panel */}
        <div className="w-[420px] bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* Quick Presets */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_PRESETS.filter(p => p.dataSource === dataSource).map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Data Source */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                1. Data Source
              </label>
              <select
                value={dataSource}
                onChange={(e) => handleDataSourceChange(e.target.value as DataSourceId)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {Object.values(DATA_SOURCES).map(ds => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">{currentDataSource.description}</p>
            </div>
            
            {/* Date Range */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                <Calendar className="inline w-3 h-3 mr-1" />
                2. Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              {/* Shift Filter (for production) */}
              {dataSource === 'production' && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1.5">Shifts</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      DAY
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      NIGHT
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            {/* Y-Axis: Fields to Calculate (Metrics) */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Calculator className="inline w-3 h-3 mr-1" />
                  3. Y-Axis / Metrics (What to Calculate)
                </label>
                <button
                  onClick={addField}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              
              {selectedFields.length === 0 ? (
                <div className="py-3 px-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-xs text-gray-500 text-center">Click "Add" to select metrics for Y-axis</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
                      <span className="text-xs text-gray-400 w-4">Y{index + 1}</span>
                      <select
                        value={field.aggregation || 'SUM'}
                        onChange={(e) => updateField(field.id, { aggregation: e.target.value as AggregationFunction })}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white"
                      >
                        {AGGREGATION_FUNCTIONS.map(agg => (
                          <option key={agg.id} value={agg.id}>{agg.name}</option>
                        ))}
                      </select>
                      <select
                        value={field.field}
                        onChange={(e) => updateField(field.id, { field: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white"
                      >
                        {aggregatableFields.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeField(field.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* X-Axis: Group By (Dimensions) */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                4. X-Axis / Group By (Dimensions)
              </label>
              <div className="flex flex-wrap gap-2">
                {groupableFields.map(field => (
                  <label
                    key={field.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                      groupBy.includes(field.id)
                        ? 'bg-emerald-600 text-white'
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
                  ? 'No X-axis grouping - will show single total value' 
                  : `X-axis: ${groupBy.join(', ')}`}
              </p>
            </div>
            
            {/* Chart Type & Options */}
            <div className="p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                <Settings2 className="inline w-3 h-3 mr-1" />
                5. Visualization
              </label>
              
              {/* Chart Type Grid */}
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {CHART_TYPES.map(type => {
                  const Icon = type.icon;
                  const isSelected = chartType === type.id;
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id)}
                      title={type.description}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${type.id === 'horizontal_bar' ? 'rotate-90' : ''}`} />
                      <span className="text-[10px] mt-1 leading-tight">{type.name}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Chart Options */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showValues}
                    onChange={(e) => setShowValues(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Show values on chart
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLegend}
                    onChange={(e) => setShowLegend(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Show legend
                </label>
              </div>
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
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                  <p className="text-gray-500">Running query...</p>
                </div>
              </div>
            ) : results && results.length > 0 ? (
              <div className="space-y-6">
                {/* Chart */}
                {chartType !== 'table' && groupBy.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-medium text-gray-900 mb-4">
                      {selectedFields.map(f => {
                        const fieldDef = aggregatableFields.find(af => af.id === f.field);
                        return `${f.aggregation} of ${fieldDef?.name || f.field}`;
                      }).join(', ')} by {groupBy.join(', ')}
                    </h3>
                    <ChartPreview
                      data={results}
                      chartType={chartType}
                      primaryDimension={groupBy[0]}
                      secondaryDimension={groupBy[1]}
                      metrics={metricNames}
                      options={{ showValues, showLegend }}
                    />
                  </div>
                )}
                
                {/* KPI Cards (no grouping) */}
                {chartType === 'kpi_cards' && groupBy.length === 0 && results.length === 1 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metricNames.map((metric, index) => {
                      const value = results[0][metric];
                      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
                      return (
                        <div
                          key={metric}
                          className="bg-white rounded-xl border border-gray-200 p-6 text-center"
                          style={{ borderTop: `4px solid ${colors[index % colors.length]}` }}
                        >
                          <div className="text-3xl font-bold text-gray-900">
                            {typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : String(value ?? '-')}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {metric.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Data Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-medium text-gray-900">Data Table ({results.length} rows)</h3>
                  </div>
                  <DataTable
                    data={results}
                    columns={Object.keys(results[0])}
                  />
                </div>
              </div>
            ) : showHelp ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-2xl">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Database className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Build Your Report</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Configure your query using the panel on the left, or use a quick preset to get started.
                  </p>
                  
                  {/* How to Test Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left mb-4">
                    <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      How to Test - Example Query
                    </h4>
                    <p className="text-sm text-slate-600 mb-3">
                      <strong>Goal:</strong> Sum of 5th Jan both shifts OK Prod Qty
                    </p>
                    <ol className="text-sm text-slate-700 space-y-2">
                      <li className="flex gap-2">
                        <span className="font-bold text-slate-500">1.</span>
                        <span><strong>Data Source:</strong> Production (DPR) - already selected</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-slate-500">2.</span>
                        <span><strong>Date From:</strong> 2026-01-05 | <strong>Date To:</strong> 2026-01-05</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-slate-500">3.</span>
                        <span><strong>Shifts:</strong> Check both DAY and NIGHT</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-slate-500">4.</span>
                        <span><strong>Y-Axis:</strong> Click "+ Add", select SUM of "OK Production Qty (Nos)"</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-slate-500">5.</span>
                        <span>Click <strong>Run Query</strong></span>
                      </li>
                    </ol>
                  </div>
                  
                  {/* Data Forms Required */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left">
                    <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Data Forms Required for Testing
                    </h4>
                    <div className="text-sm text-amber-700 space-y-2">
                      <p><strong>For Production reports:</strong> DPR (Daily Production Report) entries must be posted with stock_status = 'POSTED'</p>
                      <p><strong>For Dispatch reports:</strong> Dispatch Memos must be posted</p>
                      <p><strong>For Stock reports:</strong> Stock ledger movements from GRN, MIS, DPR, Dispatch</p>
                      <p><strong>For Procurement:</strong> GRN (Goods Receipt Notes) must be posted</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-amber-600">
                      Navigate to: <strong>Production → DPR</strong> to create/post production entries
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Table2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
                  <p className="text-gray-500 text-sm">
                    No data found for the selected filters. Try adjusting your date range or check that data has been posted.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Save Dialog */}
      {showSaveDialog && (
        <SaveReportDialog
          onSave={handleSave}
          onCancel={() => setShowSaveDialog(false)}
          category={dataSource}
        />
      )}
    </div>
  );
};

export default UnifiedReportBuilder;
