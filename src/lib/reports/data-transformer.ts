// ============================================================================
// DATA TRANSFORMER
// ============================================================================
// Transforms query results into chart-friendly formats

// ============================================================================
// TYPES
// ============================================================================

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ScatterDataPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ScatterChartData {
  datasets: {
    label: string;
    data: ScatterDataPoint[];
    backgroundColor?: string;
  }[];
}

export interface TableData {
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface KpiData {
  label: string;
  value: number;
  unit: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
}

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#A855F7', // Purple
];

export const CHART_COLORS_LIGHT = [
  '#DBEAFE', // Blue light
  '#D1FAE5', // Emerald light
  '#FEF3C7', // Amber light
  '#FEE2E2', // Red light
  '#EDE9FE', // Violet light
  '#FCE7F3', // Pink light
  '#CFFAFE', // Cyan light
  '#ECFCCB', // Lime light
  '#FFEDD5', // Orange light
  '#E0E7FF', // Indigo light
  '#CCFBF1', // Teal light
  '#F3E8FF', // Purple light
];

// ============================================================================
// TRANSFORMERS
// ============================================================================

/**
 * Transform query results for bar/line charts with single dimension
 */
export function transformForSingleDimension(
  rows: Record<string, unknown>[],
  dimensionKey: string,
  metricKeys: string[]
): ChartData {
  const labels = rows.map(row => formatLabel(row[dimensionKey]));
  
  const datasets: ChartDataset[] = metricKeys.map((metricKey, index) => ({
    label: metricKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    data: rows.map(row => Number(row[metricKey]) || 0),
    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
    borderColor: CHART_COLORS[index % CHART_COLORS.length],
    borderWidth: 2,
    tension: 0.3,
  }));
  
  return { labels, datasets };
}

/**
 * Transform query results for grouped bar charts with two dimensions
 */
export function transformForGroupedDimension(
  rows: Record<string, unknown>[],
  primaryDimension: string,
  secondaryDimension: string,
  metricKey: string
): ChartData {
  // Get unique values for each dimension
  const primaryValues = [...new Set(rows.map(row => String(row[primaryDimension])))];
  const secondaryValues = [...new Set(rows.map(row => String(row[secondaryDimension])))];
  
  // Create a lookup map
  const dataMap = new Map<string, number>();
  rows.forEach(row => {
    const key = `${row[primaryDimension]}|${row[secondaryDimension]}`;
    dataMap.set(key, Number(row[metricKey]) || 0);
  });
  
  // Build datasets for each secondary dimension value
  const datasets: ChartDataset[] = secondaryValues.map((secondaryValue, index) => ({
    label: formatLabel(secondaryValue),
    data: primaryValues.map(primaryValue => {
      const key = `${primaryValue}|${secondaryValue}`;
      return dataMap.get(key) || 0;
    }),
    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
    borderColor: CHART_COLORS[index % CHART_COLORS.length],
    borderWidth: 1,
  }));
  
  return {
    labels: primaryValues.map(v => formatLabel(v)),
    datasets,
  };
}

/**
 * Transform query results for pie/donut charts
 */
export function transformForPieChart(
  rows: Record<string, unknown>[],
  dimensionKey: string,
  metricKey: string
): ChartData {
  const labels = rows.map(row => formatLabel(row[dimensionKey]));
  const data = rows.map(row => Number(row[metricKey]) || 0);
  
  return {
    labels,
    datasets: [{
      label: metricKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      data,
      backgroundColor: CHART_COLORS.slice(0, labels.length),
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };
}

/**
 * Transform query results for scatter plot
 */
export function transformForScatterPlot(
  rows: Record<string, unknown>[],
  xMetric: string,
  yMetric: string,
  labelKey?: string
): ScatterChartData {
  const data: ScatterDataPoint[] = rows.map(row => ({
    x: Number(row[xMetric]) || 0,
    y: Number(row[yMetric]) || 0,
    label: labelKey ? String(row[labelKey]) : undefined,
  }));
  
  return {
    datasets: [{
      label: `${xMetric} vs ${yMetric}`,
      data,
      backgroundColor: CHART_COLORS[0],
    }],
  };
}

/**
 * Transform query results for data table
 */
export function transformForTable(
  rows: Record<string, unknown>[],
  columns: string[]
): TableData {
  return {
    headers: columns.map(col => col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
    rows,
  };
}

/**
 * Transform single value result for KPI card
 */
export function transformForKpi(
  row: Record<string, unknown>,
  metricKey: string,
  label: string,
  unit: string,
  previousValue?: number
): KpiData {
  const value = Number(row[metricKey]) || 0;
  
  let change: number | undefined;
  let changeType: 'increase' | 'decrease' | undefined;
  
  if (previousValue !== undefined && previousValue !== 0) {
    change = ((value - previousValue) / previousValue) * 100;
    changeType = change >= 0 ? 'increase' : 'decrease';
  }
  
  return {
    label,
    value,
    unit,
    change: change !== undefined ? Math.abs(change) : undefined,
    changeType,
  };
}

/**
 * Transform query results for heatmap
 */
export function transformForHeatmap(
  rows: Record<string, unknown>[],
  xDimension: string,
  yDimension: string,
  metricKey: string
): { x: string[]; y: string[]; data: number[][] } {
  const xValues = [...new Set(rows.map(row => String(row[xDimension])))];
  const yValues = [...new Set(rows.map(row => String(row[yDimension])))];
  
  // Create lookup map
  const dataMap = new Map<string, number>();
  rows.forEach(row => {
    const key = `${row[xDimension]}|${row[yDimension]}`;
    dataMap.set(key, Number(row[metricKey]) || 0);
  });
  
  // Build 2D data array
  const data = yValues.map(y => 
    xValues.map(x => {
      const key = `${x}|${y}`;
      return dataMap.get(key) || 0;
    })
  );
  
  return {
    x: xValues.map(v => formatLabel(v)),
    y: yValues.map(v => formatLabel(v)),
    data,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format label for display
 */
function formatLabel(value: unknown): string {
  if (value === null || value === undefined) return 'Unknown';
  
  // Handle date values
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    const date = new Date(value);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  
  return String(value);
}

/**
 * Determine best transformation based on config
 */
export function autoTransform(
  rows: Record<string, unknown>[],
  primaryDimension: string | undefined,
  secondaryDimension: string | undefined,
  metrics: string[],
  chartType: string
): ChartData | ScatterChartData | TableData | null {
  if (!rows || rows.length === 0) return null;
  
  switch (chartType) {
    case 'table':
      return transformForTable(rows, [
        ...(primaryDimension ? [primaryDimension] : []),
        ...(secondaryDimension ? [secondaryDimension] : []),
        ...metrics,
      ]);
      
    case 'pie':
    case 'donut':
      if (primaryDimension && metrics.length > 0) {
        return transformForPieChart(rows, primaryDimension, metrics[0]);
      }
      break;
      
    case 'scatter':
      if (metrics.length >= 2) {
        return transformForScatterPlot(rows, metrics[0], metrics[1], primaryDimension);
      }
      break;
      
    case 'grouped_bar':
    case 'stacked_bar':
    case 'multi_line':
      if (primaryDimension && secondaryDimension && metrics.length > 0) {
        return transformForGroupedDimension(rows, primaryDimension, secondaryDimension, metrics[0]);
      }
      break;
      
    case 'bar':
    case 'horizontal_bar':
    case 'line':
    case 'area':
    default:
      if (primaryDimension) {
        return transformForSingleDimension(rows, primaryDimension, metrics);
      }
      break;
  }
  
  // Fallback to table
  return transformForTable(rows, Object.keys(rows[0] || {}));
}

/**
 * Calculate summary statistics from rows
 */
export function calculateSummary(rows: Record<string, unknown>[], metricKey: string): {
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
} {
  const values = rows.map(row => Number(row[metricKey]) || 0);
  const total = values.reduce((sum, v) => sum + v, 0);
  
  return {
    total,
    average: values.length > 0 ? total / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
    count: values.length,
  };
}

