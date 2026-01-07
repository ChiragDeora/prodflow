// ============================================================================
// REPORT QUERY BUILDER
// ============================================================================
// Builds SQL queries from report configuration

import { MetricCategory, getMetricById } from './metrics';
import { getDimensionById } from './dimensions';

// ============================================================================
// TYPES
// ============================================================================

export interface DateRangePreset {
  id: string;
  label: string;
  getValue: () => { from: string; to: string };
}

export interface ReportFilter {
  dateRange?: string | { from: string; to: string };
  molds?: string[];
  machines?: string[];
  lines?: string[];
  shifts?: ('DAY' | 'NIGHT')[];
  customers?: string[];
  suppliers?: string[];
  locations?: string[];
  itemTypes?: string[];
  documentTypes?: string[];
  includeChangeover?: boolean;
  topN?: number;
  lowStock?: boolean;
}

export interface ReportConfig {
  dataSource: MetricCategory;
  metrics: string[];
  primaryDimension?: string;
  secondaryDimension?: string;
  filters: ReportFilter;
  chartType?: string;
  chartOptions?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface QueryResult {
  sql: string;
  params: unknown[];
  columns: string[];
}

// ============================================================================
// DATE RANGE PRESETS
// ============================================================================

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: 'today',
    label: 'Today',
    getValue: () => {
      const today = new Date().toISOString().split('T')[0];
      return { from: today, to: today };
    },
  },
  {
    id: 'yesterday',
    label: 'Yesterday',
    getValue: () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      return { from: yesterday, to: yesterday };
    },
  },
  {
    id: 'last_7_days',
    label: 'Last 7 Days',
    getValue: () => {
      const today = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      return { from, to: today };
    },
  },
  {
    id: 'last_30_days',
    label: 'Last 30 Days',
    getValue: () => {
      const today = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      return { from, to: today };
    },
  },
  {
    id: 'this_week',
    label: 'This Week',
    getValue: () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff)).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      return { from: monday, to: todayStr };
    },
  },
  {
    id: 'last_week',
    label: 'Last Week',
    getValue: () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const thisMonday = new Date(today.setDate(diff));
      const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000).toISOString().split('T')[0];
      const lastSunday = new Date(thisMonday.getTime() - 86400000).toISOString().split('T')[0];
      return { from: lastMonday, to: lastSunday };
    },
  },
  {
    id: 'this_month',
    label: 'This Month',
    getValue: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      return { from: firstDay, to: todayStr };
    },
  },
  {
    id: 'last_month',
    label: 'Last Month',
    getValue: () => {
      const today = new Date();
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      return { from: firstDayLastMonth, to: lastDayLastMonth };
    },
  },
  {
    id: 'this_quarter',
    label: 'This Quarter',
    getValue: () => {
      const today = new Date();
      const quarter = Math.floor(today.getMonth() / 3);
      const firstDay = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      return { from: firstDay, to: todayStr };
    },
  },
  {
    id: 'this_year',
    label: 'This Year',
    getValue: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      return { from: firstDay, to: todayStr };
    },
  },
  {
    id: 'last_year',
    label: 'Last Year',
    getValue: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
      const lastDay = new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
      return { from: firstDay, to: lastDay };
    },
  },
  {
    id: 'last_90_days',
    label: 'Last 90 Days',
    getValue: () => {
      const today = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      return { from, to: today };
    },
  },
];

/**
 * Get date range from preset or custom range
 */
export function getDateRange(dateRange: string | { from: string; to: string } | undefined): { from?: string; to?: string } {
  if (!dateRange) return {};
  
  if (typeof dateRange === 'object') {
    return dateRange;
  }
  
  const preset = DATE_RANGE_PRESETS.find(p => p.id === dateRange);
  return preset ? preset.getValue() : {};
}

// ============================================================================
// TABLE MAPPINGS
// ============================================================================

interface TableConfig {
  mainTable: string;
  joins?: string[];
  dateColumn: string;
  stockStatusColumn?: string;
}

const TABLE_CONFIGS: Partial<Record<MetricCategory, TableConfig>> = {
  production: {
    mainTable: 'dpr_production_entries',
    joins: ['LEFT JOIN dpr_data ON dpr_production_entries.dpr_id = dpr_data.id'],
    dateColumn: 'dpr_data.date',
    stockStatusColumn: 'dpr_data.stock_status',
  },
  dispatch: {
    mainTable: 'dispatch_memo_items',
    joins: ['LEFT JOIN dispatch_memos ON dispatch_memo_items.memo_id = dispatch_memos.id'],
    dateColumn: 'dispatch_memos.date',
    stockStatusColumn: 'dispatch_memos.stock_status',
  },
  stock: {
    mainTable: 'stock_ledger',
    joins: ['LEFT JOIN stock_items ON stock_ledger.item_code = stock_items.item_code'],
    dateColumn: 'stock_ledger.transaction_date',
  },
  procurement: {
    mainTable: 'store_grn_items',
    joins: ['LEFT JOIN store_grn ON store_grn_items.grn_id = store_grn.id'],
    dateColumn: 'store_grn.grn_date',
    stockStatusColumn: 'store_grn.stock_status',
  },
  maintenance: {
    mainTable: 'maintenance_tasks',
    joins: [],
    dateColumn: 'maintenance_tasks.scheduled_date',
  },
  quality: {
    mainTable: 'first_pieces_approval',
    joins: [],
    dateColumn: 'first_pieces_approval.date',
  },
};

// ============================================================================
// QUERY BUILDER
// ============================================================================

/**
 * Build SQL query from report configuration
 */
export function buildReportQuery(config: ReportConfig): QueryResult {
  const tableConfig = TABLE_CONFIGS[config.dataSource];
  if (!tableConfig) {
    throw new Error(`Unknown data source: ${config.dataSource}`);
  }

  const selectParts: string[] = [];
  const groupByParts: string[] = [];
  const whereParts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Add dimension columns
  if (config.primaryDimension) {
    const dim = getDimensionById(config.primaryDimension);
    if (dim) {
      // Handle date dimension column name correctly
      const dateColumn = tableConfig.dateColumn;
      let columnExpr = dim.column;
      
      // Replace 'date' with actual date column for date dimensions
      if (dim.type === 'date') {
        columnExpr = dim.column.replace('DATE(date)', `DATE(${dateColumn})`)
                              .replace("DATE_TRUNC('week', date)", `DATE_TRUNC('week', ${dateColumn})`)
                              .replace("DATE_TRUNC('month', date)", `DATE_TRUNC('month', ${dateColumn})`)
                              .replace("DATE_TRUNC('quarter', date)", `DATE_TRUNC('quarter', ${dateColumn})`)
                              .replace("DATE_TRUNC('year', date)", `DATE_TRUNC('year', ${dateColumn})`);
      }
      
      selectParts.push(`${columnExpr} AS ${config.primaryDimension}`);
      groupByParts.push(columnExpr);
    }
  }

  if (config.secondaryDimension) {
    const dim = getDimensionById(config.secondaryDimension);
    if (dim) {
      const dateColumn = tableConfig.dateColumn;
      let columnExpr = dim.column;
      
      // Replace 'date' with actual date column for date dimensions
      if (dim.type === 'date') {
        columnExpr = dim.column.replace('DATE(date)', `DATE(${dateColumn})`)
                              .replace("DATE_TRUNC('week', date)", `DATE_TRUNC('week', ${dateColumn})`)
                              .replace("DATE_TRUNC('month', date)", `DATE_TRUNC('month', ${dateColumn})`)
                              .replace("DATE_TRUNC('quarter', date)", `DATE_TRUNC('quarter', ${dateColumn})`)
                              .replace("DATE_TRUNC('year', date)", `DATE_TRUNC('year', ${dateColumn})`);
      }
      
      selectParts.push(`${columnExpr} AS ${config.secondaryDimension}`);
      groupByParts.push(columnExpr);
    }
  }

  // Add metric columns
  for (const metricId of config.metrics) {
    const metric = getMetricById(metricId);
    if (metric) {
      selectParts.push(`${metric.calculation} AS ${metricId}`);
    }
  }

  // Build WHERE clause
  
  // Date range filter
  if (config.filters.dateRange) {
    const { from, to } = getDateRange(config.filters.dateRange);
    if (from) {
      whereParts.push(`${tableConfig.dateColumn} >= $${paramIndex}`);
      params.push(from);
      paramIndex++;
    }
    if (to) {
      whereParts.push(`${tableConfig.dateColumn} <= $${paramIndex}`);
      params.push(to);
      paramIndex++;
    }
  }

  // Stock status filter (only posted records)
  if (tableConfig.stockStatusColumn) {
    whereParts.push(`${tableConfig.stockStatusColumn} = 'POSTED'`);
  }

  // Category-specific filters
  if (config.dataSource === 'production') {
    if (config.filters.molds && config.filters.molds.length > 0) {
      whereParts.push(`product = ANY($${paramIndex})`);
      params.push(config.filters.molds);
      paramIndex++;
    }
    if (config.filters.machines && config.filters.machines.length > 0) {
      whereParts.push(`machine_no = ANY($${paramIndex})`);
      params.push(config.filters.machines);
      paramIndex++;
    }
    if (config.filters.lines && config.filters.lines.length > 0) {
      whereParts.push(`line_id = ANY($${paramIndex})`);
      params.push(config.filters.lines);
      paramIndex++;
    }
    if (config.filters.shifts && config.filters.shifts.length > 0) {
      whereParts.push(`shift = ANY($${paramIndex})`);
      params.push(config.filters.shifts);
      paramIndex++;
    }
    if (config.filters.includeChangeover === false) {
      whereParts.push(`is_changeover = FALSE`);
    }
  }

  if (config.dataSource === 'dispatch') {
    if (config.filters.customers && config.filters.customers.length > 0) {
      whereParts.push(`party_name = ANY($${paramIndex})`);
      params.push(config.filters.customers);
      paramIndex++;
    }
  }

  if (config.dataSource === 'procurement') {
    if (config.filters.suppliers && config.filters.suppliers.length > 0) {
      whereParts.push(`party_name = ANY($${paramIndex})`);
      params.push(config.filters.suppliers);
      paramIndex++;
    }
  }

  if (config.dataSource === 'stock') {
    if (config.filters.locations && config.filters.locations.length > 0) {
      whereParts.push(`location_code = ANY($${paramIndex})`);
      params.push(config.filters.locations);
      paramIndex++;
    }
    if (config.filters.itemTypes && config.filters.itemTypes.length > 0) {
      whereParts.push(`stock_items.item_type = ANY($${paramIndex})`);
      params.push(config.filters.itemTypes);
      paramIndex++;
    }
    if (config.filters.documentTypes && config.filters.documentTypes.length > 0) {
      whereParts.push(`document_type = ANY($${paramIndex})`);
      params.push(config.filters.documentTypes);
      paramIndex++;
    }
  }

  // Build the query
  let sql = `SELECT ${selectParts.join(', ')}
FROM ${tableConfig.mainTable}`;

  if (tableConfig.joins && tableConfig.joins.length > 0) {
    sql += `\n${tableConfig.joins.join('\n')}`;
  }

  if (whereParts.length > 0) {
    sql += `\nWHERE ${whereParts.join('\n  AND ')}`;
  }

  if (groupByParts.length > 0) {
    sql += `\nGROUP BY ${groupByParts.join(', ')}`;
  }

  // Add ORDER BY
  if (config.sortBy) {
    const order = config.sortOrder === 'asc' ? 'ASC' : 'DESC';
    sql += `\nORDER BY ${config.sortBy} ${order}`;
  } else if (config.primaryDimension) {
    const dim = getDimensionById(config.primaryDimension);
    if (dim?.type === 'date') {
      sql += `\nORDER BY ${config.primaryDimension} ASC`;
    } else if (config.metrics.length > 0) {
      sql += `\nORDER BY ${config.metrics[0]} DESC`;
    }
  }

  // Add LIMIT for topN
  if (config.filters.topN) {
    sql += `\nLIMIT ${config.filters.topN}`;
  } else {
    sql += `\nLIMIT 1000`; // Default limit
  }

  return {
    sql,
    params,
    columns: [...(config.primaryDimension ? [config.primaryDimension] : []), 
              ...(config.secondaryDimension ? [config.secondaryDimension] : []),
              ...config.metrics],
  };
}

// ============================================================================
// STOCK BALANCE QUERY (Special Case)
// ============================================================================

/**
 * Build query for current stock balances
 */
export function buildStockBalanceQuery(filters: ReportFilter): QueryResult {
  const whereParts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.locations && filters.locations.length > 0) {
    whereParts.push(`sb.location_code = ANY($${paramIndex})`);
    params.push(filters.locations);
    paramIndex++;
  }

  if (filters.itemTypes && filters.itemTypes.length > 0) {
    whereParts.push(`si.item_type = ANY($${paramIndex})`);
    params.push(filters.itemTypes);
    paramIndex++;
  }

  if (filters.lowStock) {
    whereParts.push(`sb.current_balance < COALESCE(si.min_stock_level, 0)`);
  }

  let sql = `
SELECT 
  sb.item_code,
  si.item_name,
  si.item_type,
  sb.location_code,
  sb.current_balance,
  sb.unit_of_measure,
  si.min_stock_level,
  sb.last_movement_at
FROM stock_balances sb
LEFT JOIN stock_items si ON sb.item_code = si.item_code
`;

  if (whereParts.length > 0) {
    sql += `WHERE ${whereParts.join('\n  AND ')}`;
  }

  sql += `\nORDER BY sb.current_balance DESC\nLIMIT 1000`;

  return {
    sql,
    params,
    columns: ['item_code', 'item_name', 'item_type', 'location_code', 'current_balance', 'unit_of_measure', 'min_stock_level'],
  };
}

// ============================================================================
// QUICK STATS QUERIES
// ============================================================================

/**
 * Get today's quick stats query
 */
export function buildQuickStatsQuery(): string {
  const today = new Date().toISOString().split('T')[0];
  
  return `
WITH prod_stats AS (
  SELECT 
    COALESCE(SUM(ok_prod_qty), 0) as prod_qty,
    CASE WHEN SUM(ok_prod_kgs + rej_kgs) > 0 
         THEN ROUND((SUM(rej_kgs) * 100.0 / SUM(ok_prod_kgs + rej_kgs))::numeric, 2)
         ELSE 0 END as rej_rate
  FROM dpr_production_entries pe
  JOIN dpr_data d ON pe.dpr_id = d.id
  WHERE d.date = '${today}' AND d.stock_status = 'POSTED'
),
dispatch_stats AS (
  SELECT COUNT(DISTINCT dm.id) as dispatch_count
  FROM dispatch_memos dm
  WHERE dm.date = '${today}' AND dm.stock_status = 'POSTED'
),
grn_stats AS (
  SELECT COALESCE(SUM(gi.total_price), 0) as grn_value
  FROM store_grn_items gi
  JOIN store_grn g ON gi.grn_id = g.id
  WHERE g.grn_date = '${today}' AND g.stock_status = 'POSTED'
)
SELECT 
  prod_stats.prod_qty,
  prod_stats.rej_rate,
  dispatch_stats.dispatch_count,
  grn_stats.grn_value
FROM prod_stats, dispatch_stats, grn_stats;
`;
}

