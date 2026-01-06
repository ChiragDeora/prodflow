'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Save,
  Download,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  Loader2,
  Sparkles,
} from 'lucide-react';
import MetricSelector from './MetricSelector';
import DimensionSelector from './DimensionSelector';
import FilterPanel from './FilterPanel';
import ChartTypeSelector from './ChartTypeSelector';
import ChartPreview from './ChartPreview';
import DataTable from './DataTable';
import SaveReportDialog from './SaveReportDialog';
import { ReportConfig, ReportFilter, MetricCategory, DATE_RANGE_PRESETS } from '@/lib/reports';

// ============================================================================
// TYPES
// ============================================================================

interface ReportBuilderProps {
  initialConfig?: Partial<ReportConfig>;
  onSave?: (config: ReportConfig, name: string) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ReportBuilder: React.FC<ReportBuilderProps> = ({ initialConfig, onSave }) => {
  // State
  const [dataSource, setDataSource] = useState<MetricCategory>(
    initialConfig?.dataSource as MetricCategory || 'production'
  );
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    initialConfig?.metrics || []
  );
  const [primaryDimension, setPrimaryDimension] = useState<string | undefined>(
    initialConfig?.primaryDimension
  );
  const [secondaryDimension, setSecondaryDimension] = useState<string | undefined>(
    initialConfig?.secondaryDimension
  );
  const [filters, setFilters] = useState<ReportFilter>(
    initialConfig?.filters || { dateRange: 'last_30_days' }
  );
  const [chartType, setChartType] = useState<string>(
    initialConfig?.chartType || 'bar'
  );
  const [chartOptions, setChartOptions] = useState<Record<string, unknown>>(
    initialConfig?.chartOptions || { showValues: false, showLegend: true }
  );
  
  // Data state
  const [reportData, setReportData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // Generate report
  const generateReport = useCallback(async () => {
    if (selectedMetrics.length === 0) {
      setError('Please select at least one metric');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const config: ReportConfig = {
        dataSource,
        metrics: selectedMetrics,
        primaryDimension,
        secondaryDimension,
        filters,
        chartType,
        chartOptions,
      };
      
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate report');
      }
      
      setReportData(result.data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [dataSource, selectedMetrics, primaryDimension, secondaryDimension, filters, chartType, chartOptions]);
  
  // Auto-generate when config changes
  useEffect(() => {
    if (selectedMetrics.length > 0) {
      const timeoutId = setTimeout(generateReport, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [dataSource, selectedMetrics, primaryDimension, secondaryDimension, filters]);
  
  // Handle data source change
  const handleDataSourceChange = (newSource: MetricCategory) => {
    setDataSource(newSource);
    setSelectedMetrics([]);
    setPrimaryDimension(undefined);
    setSecondaryDimension(undefined);
    setReportData(null);
  };
  
  // Get current config
  const getCurrentConfig = (): ReportConfig => ({
    dataSource,
    metrics: selectedMetrics,
    primaryDimension,
    secondaryDimension,
    filters,
    chartType,
    chartOptions,
  });
  
  // Handle save
  const handleSave = (name: string, description: string) => {
    if (onSave) {
      onSave(getCurrentConfig(), name);
    }
    setShowSaveDialog(false);
  };
  
  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;
    
    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
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
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Report Builder</h1>
            <p className="text-sm text-gray-500 mt-1">Create custom reports with any data and charts</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generateReport}
              disabled={loading || selectedMetrics.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Generate
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={selectedMetrics.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!reportData || reportData.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Configuration Panel */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* Data Source */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Data Source
              </label>
              <select
                value={dataSource}
                onChange={(e) => handleDataSourceChange(e.target.value as MetricCategory)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="production">Production</option>
                <option value="dispatch">Dispatch</option>
                <option value="stock">Stock</option>
                <option value="procurement">Procurement</option>
              </select>
            </div>
            
            {/* Metrics */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Metrics (What to Measure)
              </label>
              <MetricSelector
                category={dataSource}
                selectedMetrics={selectedMetrics}
                onChange={setSelectedMetrics}
              />
            </div>
            
            {/* Dimensions */}
            <div className="p-4 border-b border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Dimensions (How to Group)
              </label>
              <DimensionSelector
                category={dataSource}
                primaryDimension={primaryDimension}
                secondaryDimension={secondaryDimension}
                onPrimaryChange={setPrimaryDimension}
                onSecondaryChange={setSecondaryDimension}
              />
            </div>
            
            {/* Filters */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Filters
                </label>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-xs text-slate-600 hover:text-slate-800"
                >
                  {showFilters ? 'Hide' : 'Show'}
                </button>
              </div>
              {showFilters && (
                <FilterPanel
                  category={dataSource}
                  filters={filters}
                  onChange={setFilters}
                />
              )}
            </div>
            
            {/* Chart Type */}
            <div className="p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Visualization
              </label>
              <ChartTypeSelector
                selectedType={chartType}
                onChange={setChartType}
                hasPrimaryDimension={!!primaryDimension}
                hasSecondaryDimension={!!secondaryDimension}
                metricsCount={selectedMetrics.length}
              />
              
              {/* Chart Options */}
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={chartOptions.showValues as boolean}
                    onChange={(e) => setChartOptions(prev => ({ ...prev, showValues: e.target.checked }))}
                    className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                  />
                  Show values on chart
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={chartOptions.showLegend as boolean}
                    onChange={(e) => setChartOptions(prev => ({ ...prev, showLegend: e.target.checked }))}
                    className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                  />
                  Show legend
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Preview Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {/* Chart Preview */}
          <div className="flex-1 p-6 overflow-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto mb-3" />
                  <p className="text-gray-500">Generating report...</p>
                </div>
              </div>
            ) : reportData && reportData.length > 0 ? (
              <div className="space-y-6">
                {/* Chart */}
                {chartType !== 'table' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <ChartPreview
                      data={reportData}
                      chartType={chartType}
                      primaryDimension={primaryDimension}
                      secondaryDimension={secondaryDimension}
                      metrics={selectedMetrics}
                      options={chartOptions}
                    />
                  </div>
                )}
                
                {/* Data Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Data ({reportData.length} rows)</h3>
                  </div>
                  <DataTable
                    data={reportData}
                    columns={[
                      ...(primaryDimension ? [primaryDimension] : []),
                      ...(secondaryDimension ? [secondaryDimension] : []),
                      ...selectedMetrics,
                    ]}
                  />
                </div>
              </div>
            ) : selectedMetrics.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Build Your Report</h3>
                  <p className="text-gray-500 text-sm">
                    Select a data source and metrics from the panel on the left to start building your report.
                  </p>
                </div>
              </div>
            ) : (
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

export default ReportBuilder;

