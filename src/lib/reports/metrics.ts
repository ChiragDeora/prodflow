// ============================================================================
// REPORT METRICS DEFINITIONS
// ============================================================================
// Defines all available metrics for the report builder

export type MetricCategory = 'production' | 'store' | 'dispatch' | 'stock' | 'job-work' | 'maintenance' | 'quality' | 'masters' | 'general';

export interface MetricDefinition {
  id: string;
  displayName: string;
  category: MetricCategory[];
  calculation: string;  // SQL aggregation expression
  unit: string;
  description?: string;
  format?: 'number' | 'percent' | 'currency' | 'weight';
  decimals?: number;
}

// ============================================================================
// PRODUCTION METRICS
// ============================================================================

const productionMetrics: MetricDefinition[] = [
  {
    id: 'prod_qty',
    displayName: 'Production Qty',
    category: ['production'],
    calculation: 'SUM(ok_prod_qty)',
    unit: 'pieces',
    description: 'Total good production quantity in pieces',
    format: 'number',
    decimals: 0,
  },
  {
    id: 'prod_kg',
    displayName: 'Production Weight',
    category: ['production'],
    calculation: 'SUM(ok_prod_kgs)',
    unit: 'kg',
    description: 'Total good production weight in kilograms',
    format: 'weight',
    decimals: 2,
  },
  {
    id: 'rej_kg',
    displayName: 'Rejection Weight',
    category: ['production'],
    calculation: 'SUM(rej_kgs)',
    unit: 'kg',
    description: 'Total rejected weight in kilograms',
    format: 'weight',
    decimals: 2,
  },
  {
    id: 'rej_rate',
    displayName: 'Rejection Rate',
    category: ['production'],
    calculation: 'CASE WHEN SUM(ok_prod_kgs + rej_kgs) > 0 THEN ROUND((SUM(rej_kgs) * 100.0 / NULLIF(SUM(ok_prod_kgs + rej_kgs), 0))::numeric, 2) ELSE 0 END',
    unit: '%',
    description: 'Percentage of rejected production',
    format: 'percent',
    decimals: 2,
  },
  {
    id: 'efficiency',
    displayName: 'Efficiency',
    category: ['production'],
    calculation: 'CASE WHEN SUM(target_qty) > 0 THEN ROUND((SUM(ok_prod_qty) * 100.0 / NULLIF(SUM(target_qty), 0))::numeric, 2) ELSE 0 END',
    unit: '%',
    description: 'Production efficiency against target',
    format: 'percent',
    decimals: 2,
  },
  {
    id: 'target_qty',
    displayName: 'Target Qty',
    category: ['production'],
    calculation: 'SUM(target_qty)',
    unit: 'pieces',
    description: 'Target production quantity',
    format: 'number',
    decimals: 0,
  },
  {
    id: 'actual_qty',
    displayName: 'Actual Qty',
    category: ['production'],
    calculation: 'SUM(actual_qty)',
    unit: 'pieces',
    description: 'Actual production quantity',
    format: 'number',
    decimals: 0,
  },
  {
    id: 'run_time',
    displayName: 'Run Time',
    category: ['production'],
    calculation: 'SUM(run_time)',
    unit: 'minutes',
    description: 'Total run time in minutes',
    format: 'number',
    decimals: 0,
  },
  {
    id: 'down_time',
    displayName: 'Down Time',
    category: ['production'],
    calculation: 'SUM(down_time)',
    unit: 'minutes',
    description: 'Total downtime in minutes',
    format: 'number',
    decimals: 0,
  },
  {
    id: 'uptime_pct',
    displayName: 'Uptime %',
    category: ['production'],
    calculation: 'CASE WHEN SUM(run_time + down_time) > 0 THEN ROUND((SUM(run_time) * 100.0 / NULLIF(SUM(run_time + down_time), 0))::numeric, 2) ELSE 0 END',
    unit: '%',
    description: 'Percentage of uptime',
    format: 'percent',
    decimals: 2,
  },
  {
    id: 'lumps_kg',
    displayName: 'Lumps',
    category: ['production'],
    calculation: 'SUM(lumps_kgs)',
    unit: 'kg',
    description: 'Total lumps weight',
    format: 'weight',
    decimals: 2,
  },
];

// ============================================================================
// DISPATCH METRICS
// ============================================================================

const dispatchMetrics: MetricDefinition[] = [
  {
    id: 'dispatch_qty',
    displayName: 'Dispatch Qty',
    category: ['dispatch'],
    calculation: 'SUM(no_of_pcs)',
    unit: 'boxes',
    description: 'Total dispatched boxes/pieces',
    format: 'number',
    decimals: 0,
  },
  {
    id: 'dispatch_count',
    displayName: 'Dispatch Count',
    category: ['dispatch'],
    calculation: 'COUNT(DISTINCT dispatch_memos.id)',
    unit: 'count',
    description: 'Number of dispatch memos',
    format: 'number',
    decimals: 0,
  },
];

// ============================================================================
// STOCK METRICS
// ============================================================================

const stockMetrics: MetricDefinition[] = [
  {
    id: 'stock_balance',
    displayName: 'Stock Balance',
    category: ['stock'],
    calculation: 'SUM(current_balance)',
    unit: 'units',
    description: 'Current stock balance',
    format: 'number',
    decimals: 2,
  },
  {
    id: 'stock_in',
    displayName: 'Stock In',
    category: ['stock'],
    calculation: "SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE 0 END)",
    unit: 'units',
    description: 'Total stock received',
    format: 'number',
    decimals: 2,
  },
  {
    id: 'stock_out',
    displayName: 'Stock Out',
    category: ['stock'],
    calculation: "SUM(CASE WHEN movement_type = 'OUT' THEN ABS(quantity) ELSE 0 END)",
    unit: 'units',
    description: 'Total stock issued',
    format: 'number',
    decimals: 2,
  },
  {
    id: 'stock_movements',
    displayName: 'Stock Movements',
    category: ['stock'],
    calculation: 'COUNT(*)',
    unit: 'count',
    description: 'Number of stock movements',
    format: 'number',
    decimals: 0,
  },
];

// ============================================================================
// PROCUREMENT METRICS
// ============================================================================

const procurementMetrics: MetricDefinition[] = [
  {
    id: 'grn_qty',
    displayName: 'GRN Qty',
    category: ['procurement'],
    calculation: 'SUM(total_qty)',
    unit: 'units',
    description: 'Total quantity received',
    format: 'number',
    decimals: 2,
  },
  {
    id: 'grn_value',
    displayName: 'GRN Value',
    category: ['procurement'],
    calculation: 'SUM(total_price)',
    unit: '₹',
    description: 'Total value of goods received',
    format: 'currency',
    decimals: 2,
  },
  {
    id: 'grn_count',
    displayName: 'GRN Count',
    category: ['procurement'],
    calculation: 'COUNT(DISTINCT store_grn.id)',
    unit: 'count',
    description: 'Number of GRNs',
    format: 'number',
    decimals: 0,
  },
];

// ============================================================================
// MATERIAL ISSUE METRICS
// ============================================================================

const materialIssueMetrics: MetricDefinition[] = [
  {
    id: 'issue_qty',
    displayName: 'Issue Qty',
    category: ['stock'],
    calculation: 'SUM(issue_qty)',
    unit: 'units',
    description: 'Total quantity issued',
    format: 'number',
    decimals: 2,
  },
  {
    id: 'mis_count',
    displayName: 'MIS Count',
    category: ['stock'],
    calculation: 'COUNT(DISTINCT store_mis.id)',
    unit: 'count',
    description: 'Number of material issue slips',
    format: 'number',
    decimals: 0,
  },
];

// ============================================================================
// FG TRANSFER METRICS
// ============================================================================

const fgTransferMetrics: MetricDefinition[] = [
  {
    id: 'fg_transfer_qty',
    displayName: 'FG Transfer Qty',
    category: ['production', 'stock'],
    calculation: 'SUM(total_qty)',
    unit: 'pieces',
    description: 'Total FG quantity transferred',
    format: 'number',
    decimals: 0,
  },
  {
    id: 'fg_transfer_count',
    displayName: 'FG Transfer Count',
    category: ['production', 'stock'],
    calculation: 'COUNT(DISTINCT production_fg_transfer_note.id)',
    unit: 'count',
    description: 'Number of FG transfers',
    format: 'number',
    decimals: 0,
  },
];

// ============================================================================
// GENERIC METRICS
// ============================================================================

const genericMetrics: MetricDefinition[] = [
  {
    id: 'record_count',
    displayName: 'Record Count',
    category: ['production', 'dispatch', 'stock', 'procurement'],
    calculation: 'COUNT(*)',
    unit: 'count',
    description: 'Total number of records',
    format: 'number',
    decimals: 0,
  },
];

// ============================================================================
// ALL METRICS
// ============================================================================

export const ALL_METRICS: MetricDefinition[] = [
  ...productionMetrics,
  ...dispatchMetrics,
  ...stockMetrics,
  ...procurementMetrics,
  ...materialIssueMetrics,
  ...fgTransferMetrics,
  ...genericMetrics,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get metrics available for a specific category
 */
export function getMetricsForCategory(category: MetricCategory): MetricDefinition[] {
  return ALL_METRICS.filter(m => m.category.includes(category));
}

/**
 * Get a specific metric by ID
 */
export function getMetricById(id: string): MetricDefinition | undefined {
  return ALL_METRICS.find(m => m.id === id);
}

/**
 * Format metric value for display
 */
export function formatMetricValue(value: number | null | undefined, metric: MetricDefinition): string {
  if (value === null || value === undefined) return '-';
  
  const decimals = metric.decimals ?? 2;
  
  switch (metric.format) {
    case 'currency':
      return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    case 'percent':
      return `${value.toFixed(decimals)}%`;
    case 'weight':
      return `${value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} kg`;
    case 'number':
    default:
      return value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
}

