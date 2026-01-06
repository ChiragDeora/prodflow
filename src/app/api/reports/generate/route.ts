// ============================================================================
// POST /api/reports/generate
// Generate report data from configuration
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildReportQuery, buildStockBalanceQuery, ReportConfig } from '@/lib/reports';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const config: ReportConfig = await request.json();
    
    // Validate required fields
    if (!config.dataSource) {
      return NextResponse.json(
        { success: false, error: 'dataSource is required' },
        { status: 400 }
      );
    }
    
    if (!config.metrics || config.metrics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one metric is required' },
        { status: 400 }
      );
    }
    
    // Special case for stock balance query
    if (config.dataSource === 'stock' && config.metrics.includes('stock_balance') && !config.primaryDimension?.startsWith('date_')) {
      const query = buildStockBalanceQuery(config.filters);
      
      const { data, error } = await supabase.rpc('execute_readonly_query', {
        query_text: query.sql,
        query_params: query.params,
      });
      
      if (error) {
        // Fallback to direct query if RPC doesn't exist
        const { data: directData, error: directError } = await supabase
          .from('stock_balances')
          .select(`
            item_code,
            location_code,
            current_balance,
            unit_of_measure,
            last_movement_at,
            stock_items (
              item_name,
              item_type,
              min_stock_level
            )
          `)
          .order('current_balance', { ascending: false })
          .limit(1000);
        
        if (directError) {
          console.error('Error executing stock balance query:', directError);
          return NextResponse.json(
            { success: false, error: directError.message },
            { status: 500 }
          );
        }
        
        // Transform data
        const transformedData = (directData || []).map((row: Record<string, unknown>) => ({
          item_code: row.item_code,
          location_code: row.location_code,
          current_balance: row.current_balance,
          unit_of_measure: row.unit_of_measure,
          last_movement_at: row.last_movement_at,
          item_name: (row.stock_items as Record<string, unknown>)?.item_name,
          item_type: (row.stock_items as Record<string, unknown>)?.item_type,
          min_stock_level: (row.stock_items as Record<string, unknown>)?.min_stock_level,
        }));
        
        return NextResponse.json({
          success: true,
          data: transformedData,
          count: transformedData.length,
          columns: query.columns,
        });
      }
      
      return NextResponse.json({
        success: true,
        data: data || [],
        count: (data || []).length,
        columns: query.columns,
      });
    }
    
    // Build the SQL query
    const query = buildReportQuery(config);
    
    // Execute based on data source
    let result;
    
    switch (config.dataSource) {
      case 'production':
        result = await executeProductionQuery(config);
        break;
      case 'dispatch':
        result = await executeDispatchQuery(config);
        break;
      case 'stock':
        result = await executeStockQuery(config);
        break;
      case 'procurement':
        result = await executeProcurementQuery(config);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown data source: ${config.dataSource}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data.length,
      columns: query.columns,
      sql: process.env.NODE_ENV === 'development' ? query.sql : undefined,
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// QUERY EXECUTORS
// ============================================================================

async function executeProductionQuery(config: ReportConfig) {
  // Build query for production data using Supabase
  const { from, to } = getDateRange(config.filters.dateRange);
  
  let query = supabase
    .from('dpr_production_entries')
    .select(`
      id,
      product,
      machine_no,
      line_id,
      cavity,
      ok_prod_qty,
      ok_prod_kgs,
      rej_kgs,
      lumps_kgs,
      target_qty,
      actual_qty,
      run_time,
      down_time,
      is_changeover,
      sfg_code,
      dpr_data!inner (
        id,
        date,
        shift,
        shift_incharge,
        stock_status
      )
    `)
    .eq('dpr_data.stock_status', 'POSTED');
  
  // Apply date filters
  if (from) {
    query = query.gte('dpr_data.date', from);
  }
  if (to) {
    query = query.lte('dpr_data.date', to);
  }
  
  // Apply other filters
  if (config.filters.molds && config.filters.molds.length > 0) {
    query = query.in('product', config.filters.molds);
  }
  if (config.filters.machines && config.filters.machines.length > 0) {
    query = query.in('machine_no', config.filters.machines);
  }
  if (config.filters.lines && config.filters.lines.length > 0) {
    query = query.in('line_id', config.filters.lines);
  }
  if (config.filters.shifts && config.filters.shifts.length > 0) {
    query = query.in('dpr_data.shift', config.filters.shifts);
  }
  if (config.filters.includeChangeover === false) {
    query = query.eq('is_changeover', false);
  }
  
  const { data, error } = await query.limit(5000);
  
  if (error) {
    throw new Error(`Production query failed: ${error.message}`);
  }
  
  // Aggregate data based on dimensions
  return {
    data: aggregateData(data || [], config),
  };
}

async function executeDispatchQuery(config: ReportConfig) {
  const { from, to } = getDateRange(config.filters.dateRange);
  
  let query = supabase
    .from('dispatch_memo_items')
    .select(`
      id,
      item_name,
      item_code,
      no_of_pcs,
      dispatch_memos!inner (
        id,
        date,
        party_name,
        location,
        stock_status
      )
    `)
    .eq('dispatch_memos.stock_status', 'POSTED');
  
  if (from) {
    query = query.gte('dispatch_memos.date', from);
  }
  if (to) {
    query = query.lte('dispatch_memos.date', to);
  }
  
  if (config.filters.customers && config.filters.customers.length > 0) {
    query = query.in('dispatch_memos.party_name', config.filters.customers);
  }
  
  const { data, error } = await query.limit(5000);
  
  if (error) {
    throw new Error(`Dispatch query failed: ${error.message}`);
  }
  
  return {
    data: aggregateData(data || [], config),
  };
}

async function executeStockQuery(config: ReportConfig) {
  const { from, to } = getDateRange(config.filters.dateRange);
  
  let query = supabase
    .from('stock_ledger')
    .select(`
      id,
      item_code,
      location_code,
      quantity,
      unit_of_measure,
      balance_after,
      transaction_date,
      document_type,
      movement_type,
      stock_items (
        item_name,
        item_type
      )
    `);
  
  if (from) {
    query = query.gte('transaction_date', from);
  }
  if (to) {
    query = query.lte('transaction_date', to);
  }
  
  if (config.filters.locations && config.filters.locations.length > 0) {
    query = query.in('location_code', config.filters.locations);
  }
  if (config.filters.documentTypes && config.filters.documentTypes.length > 0) {
    query = query.in('document_type', config.filters.documentTypes);
  }
  
  const { data, error } = await query.order('transaction_date', { ascending: false }).limit(5000);
  
  if (error) {
    throw new Error(`Stock query failed: ${error.message}`);
  }
  
  return {
    data: aggregateData(data || [], config),
  };
}

async function executeProcurementQuery(config: ReportConfig) {
  const { from, to } = getDateRange(config.filters.dateRange);
  
  let query = supabase
    .from('store_grn_items')
    .select(`
      id,
      item_description,
      total_qty,
      uom,
      store_grn!inner (
        id,
        grn_date,
        party_name,
        type_of_material,
        stock_status
      )
    `)
    .eq('store_grn.stock_status', 'POSTED');
  
  if (from) {
    query = query.gte('store_grn.grn_date', from);
  }
  if (to) {
    query = query.lte('store_grn.grn_date', to);
  }
  
  if (config.filters.suppliers && config.filters.suppliers.length > 0) {
    query = query.in('store_grn.party_name', config.filters.suppliers);
  }
  
  const { data, error } = await query.limit(5000);
  
  if (error) {
    throw new Error(`Procurement query failed: ${error.message}`);
  }
  
  return {
    data: aggregateData(data || [], config),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDateRange(dateRange: string | { from: string; to: string } | undefined): { from?: string; to?: string } {
  if (!dateRange) return {};
  
  if (typeof dateRange === 'object') {
    return dateRange;
  }
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  switch (dateRange) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
      return { from: yesterday, to: yesterday };
    }
    case 'last_7_days': {
      const from = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0];
      return { from, to: todayStr };
    }
    case 'last_30_days': {
      const from = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0];
      return { from, to: todayStr };
    }
    case 'last_90_days': {
      const from = new Date(today.getTime() - 90 * 86400000).toISOString().split('T')[0];
      return { from, to: todayStr };
    }
    case 'this_month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      return { from, to: todayStr };
    }
    case 'last_month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const to = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      return { from, to };
    }
    case 'this_year': {
      const from = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      return { from, to: todayStr };
    }
    default:
      return {};
  }
}

// Type for nested record with dpr_data
interface ProductionEntry {
  id?: string;
  product?: string;
  machine_no?: string;
  line_id?: string;
  ok_prod_qty?: number;
  ok_prod_kgs?: number;
  rej_kgs?: number;
  lumps_kgs?: number;
  target_qty?: number;
  actual_qty?: number;
  run_time?: number;
  down_time?: number;
  sfg_code?: string;
  is_changeover?: boolean;
  dpr_data?: {
    date?: string;
    shift?: string;
    shift_incharge?: string;
  };
  dispatch_memos?: {
    date?: string;
    party_name?: string;
  };
  store_grn?: {
    grn_date?: string;
    party_name?: string;
  };
  stock_items?: {
    item_type?: string;
  };
  [key: string]: unknown;
}

function aggregateData(rawData: ProductionEntry[], config: ReportConfig): Record<string, unknown>[] {
  if (!config.primaryDimension && !config.secondaryDimension) {
    // Return totals only
    return [calculateTotals(rawData, config.metrics)];
  }
  
  // Group by dimensions
  const groups = new Map<string, ProductionEntry[]>();
  
  for (const row of rawData) {
    const key = getDimensionKey(row, config);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }
  
  // Calculate aggregates for each group
  const result: Record<string, unknown>[] = [];
  
  for (const [key, rows] of groups) {
    const aggregated = calculateTotals(rows, config.metrics);
    
    // Add dimension values
    if (config.primaryDimension) {
      aggregated[config.primaryDimension] = getDimensionValue(rows[0], config.primaryDimension, config.dataSource);
    }
    if (config.secondaryDimension) {
      aggregated[config.secondaryDimension] = getDimensionValue(rows[0], config.secondaryDimension, config.dataSource);
    }
    
    result.push(aggregated);
  }
  
  // Sort results
  if (config.primaryDimension) {
    const dim = config.primaryDimension;
    const isDate = dim.startsWith('date_');
    
    result.sort((a, b) => {
      if (isDate) {
        return String(a[dim] || '').localeCompare(String(b[dim] || ''));
      }
      // Sort by first metric descending for non-date dimensions
      const metric = config.metrics[0];
      return (Number(b[metric]) || 0) - (Number(a[metric]) || 0);
    });
  }
  
  // Apply topN limit
  if (config.filters.topN) {
    return result.slice(0, config.filters.topN);
  }
  
  return result;
}

function getDimensionKey(row: ProductionEntry, config: ReportConfig): string {
  const parts: string[] = [];
  
  if (config.primaryDimension) {
    parts.push(String(getDimensionValue(row, config.primaryDimension, config.dataSource)));
  }
  if (config.secondaryDimension) {
    parts.push(String(getDimensionValue(row, config.secondaryDimension, config.dataSource)));
  }
  
  return parts.join('|');
}

function getDimensionValue(row: ProductionEntry, dimension: string, dataSource: string): unknown {
  // Handle nested data
  const dprData = row.dpr_data;
  const dispatchMemo = row.dispatch_memos;
  const grn = row.store_grn;
  const stockItem = row.stock_items;
  
  // Get the date based on data source
  let date: string | undefined;
  if (dataSource === 'production' && dprData) {
    date = dprData.date;
  } else if (dataSource === 'dispatch' && dispatchMemo) {
    date = dispatchMemo.date;
  } else if (dataSource === 'procurement' && grn) {
    date = grn.grn_date;
  } else if (dataSource === 'stock') {
    date = row.transaction_date as string | undefined;
  }
  
  switch (dimension) {
    case 'date_day':
      return date ? date.split('T')[0] : 'Unknown';
    case 'date_week':
      if (!date) return 'Unknown';
      const d = new Date(date);
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay() + 1);
      return startOfWeek.toISOString().split('T')[0];
    case 'date_month':
      return date ? date.substring(0, 7) : 'Unknown';
    case 'date_year':
      return date ? date.substring(0, 4) : 'Unknown';
    case 'mold':
      return row.product || 'Unknown';
    case 'machine':
      return row.machine_no || 'Unknown';
    case 'line':
      return row.line_id || 'Unknown';
    case 'shift':
      return dprData?.shift || 'Unknown';
    case 'customer':
      return dispatchMemo?.party_name || 'Unknown';
    case 'supplier':
      return grn?.party_name || 'Unknown';
    case 'location':
      return row.location_code || 'Unknown';
    case 'item_type':
      return stockItem?.item_type || 'Unknown';
    case 'document_type':
      return row.document_type || 'Unknown';
    case 'movement_type':
      return row.movement_type || 'Unknown';
    case 'sfg_code':
      return row.sfg_code || 'Unknown';
    case 'is_changeover':
      return row.is_changeover ? 'Changeover' : 'Regular';
    default:
      return row[dimension] || 'Unknown';
  }
}

function calculateTotals(rows: ProductionEntry[], metrics: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const metric of metrics) {
    switch (metric) {
      case 'prod_qty':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.ok_prod_qty) || 0), 0);
        break;
      case 'prod_kg':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.ok_prod_kgs) || 0), 0);
        break;
      case 'rej_kg':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.rej_kgs) || 0), 0);
        break;
      case 'rej_rate': {
        const totalOk = rows.reduce((sum, r) => sum + (Number(r.ok_prod_kgs) || 0), 0);
        const totalRej = rows.reduce((sum, r) => sum + (Number(r.rej_kgs) || 0), 0);
        const total = totalOk + totalRej;
        result[metric] = total > 0 ? Math.round((totalRej / total) * 10000) / 100 : 0;
        break;
      }
      case 'efficiency': {
        const actual = rows.reduce((sum, r) => sum + (Number(r.ok_prod_qty) || 0), 0);
        const target = rows.reduce((sum, r) => sum + (Number(r.target_qty) || 0), 0);
        result[metric] = target > 0 ? Math.round((actual / target) * 10000) / 100 : 0;
        break;
      }
      case 'target_qty':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.target_qty) || 0), 0);
        break;
      case 'actual_qty':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.actual_qty) || 0), 0);
        break;
      case 'run_time':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.run_time) || 0), 0);
        break;
      case 'down_time':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.down_time) || 0), 0);
        break;
      case 'uptime_pct': {
        const runTime = rows.reduce((sum, r) => sum + (Number(r.run_time) || 0), 0);
        const downTime = rows.reduce((sum, r) => sum + (Number(r.down_time) || 0), 0);
        const total = runTime + downTime;
        result[metric] = total > 0 ? Math.round((runTime / total) * 10000) / 100 : 0;
        break;
      }
      case 'lumps_kg':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.lumps_kgs) || 0), 0);
        break;
      case 'dispatch_qty':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.no_of_pcs) || 0), 0);
        break;
      case 'dispatch_count':
        result[metric] = new Set(rows.map(r => (r.dispatch_memos as { id?: string })?.id)).size;
        break;
      case 'stock_in':
        result[metric] = rows
          .filter(r => r.movement_type === 'IN')
          .reduce((sum, r) => sum + Math.abs(Number(r.quantity) || 0), 0);
        break;
      case 'stock_out':
        result[metric] = rows
          .filter(r => r.movement_type === 'OUT')
          .reduce((sum, r) => sum + Math.abs(Number(r.quantity) || 0), 0);
        break;
      case 'stock_movements':
        result[metric] = rows.length;
        break;
      case 'grn_qty':
        result[metric] = rows.reduce((sum, r) => sum + (Number(r.total_qty) || 0), 0);
        break;
      case 'grn_count':
        result[metric] = new Set(rows.map(r => (r.store_grn as { id?: string })?.id)).size;
        break;
      case 'record_count':
        result[metric] = rows.length;
        break;
      default:
        result[metric] = 0;
    }
  }
  
  return result;
}

