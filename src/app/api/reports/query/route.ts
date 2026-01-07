// ============================================================================
// POST /api/reports/query
// Flexible Data Query API - Execute custom queries on any data source
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, unauthorized } from '@/lib/api-auth';
import { DATA_SOURCES, DataSourceId, AggregationFunction } from '@/lib/reports/data-sources';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// TYPES
// ============================================================================

interface QueryField {
  field: string;
  aggregation?: AggregationFunction;
  alias?: string;
}

interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'between';
  value: unknown;
  value2?: unknown; // For 'between' operator
}

interface QueryRequest {
  dataSource: DataSourceId;
  select: QueryField[];
  filters?: QueryFilter[];
  groupBy?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  // Convenience date filters
  dateFrom?: string;
  dateTo?: string;
  shifts?: ('DAY' | 'NIGHT')[];
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const body: QueryRequest = await request.json();
    
    // Validate data source
    const dataSource = DATA_SOURCES[body.dataSource];
    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: `Invalid data source: ${body.dataSource}` },
        { status: 400 }
      );
    }
    
    // Validate select fields
    if (!body.select || body.select.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one field must be selected' },
        { status: 400 }
      );
    }

    // Build the query
    const query = buildFlexibleQuery(body, dataSource);
    
    // Execute using Supabase RPC or direct query
    const { data, error } = await supabase.rpc('execute_readonly_query', {
      query_text: query.sql,
      query_params: query.params,
    });
    
    if (error) {
      // Fallback to simple query for common cases
      const result = await executeSimpleQuery(body, dataSource);
      return NextResponse.json({
        success: true,
        data: result.data,
        count: result.data.length,
        query: process.env.NODE_ENV === 'development' ? query.sql : undefined,
      });
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: (data || []).length,
      query: process.env.NODE_ENV === 'development' ? query.sql : undefined,
    });
    
  } catch (error) {
    console.error('Error executing query:', error);
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
// QUERY BUILDER
// ============================================================================

function buildFlexibleQuery(
  request: QueryRequest,
  dataSource: typeof DATA_SOURCES[DataSourceId]
): { sql: string; params: unknown[] } {
  const selectParts: string[] = [];
  const whereParts: string[] = [];
  const groupByParts: string[] = [];
  const orderByParts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Build SELECT clause
  for (const field of request.select) {
    const fieldDef = dataSource.fields.find(f => f.id === field.field);
    if (!fieldDef) continue;
    
    const column = fieldDef.column;
    const alias = field.alias || field.field;
    
    if (field.aggregation) {
      if (field.aggregation === 'COUNT_DISTINCT') {
        selectParts.push(`COUNT(DISTINCT ${column}) AS ${alias}`);
      } else {
        selectParts.push(`${field.aggregation}(${column}) AS ${alias}`);
      }
    } else {
      selectParts.push(`${column} AS ${alias}`);
      // Non-aggregated fields need to be in GROUP BY if there are aggregations
      if (request.select.some(f => f.aggregation)) {
        groupByParts.push(column);
      }
    }
  }

  // Add explicit GROUP BY fields
  if (request.groupBy) {
    for (const fieldId of request.groupBy) {
      const fieldDef = dataSource.fields.find(f => f.id === fieldId);
      if (fieldDef && !groupByParts.includes(fieldDef.column)) {
        selectParts.push(`${fieldDef.column} AS ${fieldId}`);
        groupByParts.push(fieldDef.column);
      }
    }
  }

  // Build WHERE clause - Stock status filter
  if (dataSource.stockStatusColumn) {
    whereParts.push(`${dataSource.stockStatusColumn} = 'POSTED'`);
  }

  // Date range filters
  if (request.dateFrom) {
    whereParts.push(`${dataSource.dateColumn} >= $${paramIndex}`);
    params.push(request.dateFrom);
    paramIndex++;
  }
  if (request.dateTo) {
    whereParts.push(`${dataSource.dateColumn} <= $${paramIndex}`);
    params.push(request.dateTo);
    paramIndex++;
  }

  // Shift filter (production specific)
  if (request.shifts && request.shifts.length > 0 && request.dataSource === 'production') {
    whereParts.push(`dpr_data.shift = ANY($${paramIndex})`);
    params.push(request.shifts);
    paramIndex++;
  }

  // Custom filters
  if (request.filters) {
    for (const filter of request.filters) {
      const fieldDef = dataSource.fields.find(f => f.id === filter.field);
      if (!fieldDef) continue;
      
      const column = fieldDef.column;
      
      switch (filter.operator) {
        case 'eq':
          whereParts.push(`${column} = $${paramIndex}`);
          params.push(filter.value);
          paramIndex++;
          break;
        case 'neq':
          whereParts.push(`${column} != $${paramIndex}`);
          params.push(filter.value);
          paramIndex++;
          break;
        case 'gt':
          whereParts.push(`${column} > $${paramIndex}`);
          params.push(filter.value);
          paramIndex++;
          break;
        case 'gte':
          whereParts.push(`${column} >= $${paramIndex}`);
          params.push(filter.value);
          paramIndex++;
          break;
        case 'lt':
          whereParts.push(`${column} < $${paramIndex}`);
          params.push(filter.value);
          paramIndex++;
          break;
        case 'lte':
          whereParts.push(`${column} <= $${paramIndex}`);
          params.push(filter.value);
          paramIndex++;
          break;
        case 'in':
          whereParts.push(`${column} = ANY($${paramIndex})`);
          params.push(filter.value);
          paramIndex++;
          break;
        case 'like':
          whereParts.push(`${column} ILIKE $${paramIndex}`);
          params.push(`%${filter.value}%`);
          paramIndex++;
          break;
        case 'between':
          whereParts.push(`${column} BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
          params.push(filter.value, filter.value2);
          paramIndex += 2;
          break;
      }
    }
  }

  // Build ORDER BY clause
  if (request.orderBy) {
    for (const order of request.orderBy) {
      const fieldDef = dataSource.fields.find(f => f.id === order.field);
      if (fieldDef) {
        orderByParts.push(`${order.field} ${order.direction.toUpperCase()}`);
      }
    }
  }

  // Assemble the query
  let sql = `SELECT ${selectParts.join(', ')}\nFROM ${dataSource.mainTable}`;
  
  if (dataSource.joins.length > 0) {
    sql += `\n${dataSource.joins.join('\n')}`;
  }
  
  if (whereParts.length > 0) {
    sql += `\nWHERE ${whereParts.join('\n  AND ')}`;
  }
  
  if (groupByParts.length > 0) {
    sql += `\nGROUP BY ${groupByParts.join(', ')}`;
  }
  
  if (orderByParts.length > 0) {
    sql += `\nORDER BY ${orderByParts.join(', ')}`;
  }
  
  sql += `\nLIMIT ${request.limit || 1000}`;
  
  return { sql, params };
}

// ============================================================================
// SIMPLE QUERY EXECUTOR (Fallback using Supabase client)
// ============================================================================

async function executeSimpleQuery(
  request: QueryRequest,
  dataSource: typeof DATA_SOURCES[DataSourceId]
): Promise<{ data: Record<string, unknown>[] }> {
  
  // For production data source
  if (request.dataSource === 'production') {
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
    if (request.dateFrom) {
      query = query.gte('dpr_data.date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('dpr_data.date', request.dateTo);
    }
    
    // Apply shift filter
    if (request.shifts && request.shifts.length > 0) {
      query = query.in('dpr_data.shift', request.shifts);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    // Aggregate the data based on request
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }
  
  // For dispatch data source
  if (request.dataSource === 'dispatch') {
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
    
    if (request.dateFrom) {
      query = query.gte('dispatch_memos.date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('dispatch_memos.date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }
  
  // For stock data source
  if (request.dataSource === 'stock') {
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
    
    if (request.dateFrom) {
      query = query.gte('transaction_date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('transaction_date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For GRN data source (procurement)
  if (request.dataSource === 'grn') {
    let query = supabase
      .from('store_grn_items')
      .select(`
        id,
        item_description,
        total_qty,
        total_price,
        rate,
        uom,
        store_grn!inner (
          id,
          grn_no,
          grn_date,
          party_name,
          type_of_material,
          stock_status
        )
      `)
      .eq('store_grn.stock_status', 'POSTED');
    
    if (request.dateFrom) {
      query = query.gte('store_grn.grn_date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('store_grn.grn_date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For JW Annexure GRN data source
  if (request.dataSource === 'jw_grn') {
    let query = supabase
      .from('store_jw_annexure_grn_items')
      .select(`
        id,
        item_code,
        item_name,
        indent_qty,
        rcd_qty,
        rate,
        net_value,
        store_jw_annexure_grn!inner (
          id,
          doc_no,
          date,
          party_name,
          stock_status
        )
      `)
      .eq('store_jw_annexure_grn.stock_status', 'POSTED');
    
    if (request.dateFrom) {
      query = query.gte('store_jw_annexure_grn.date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('store_jw_annexure_grn.date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Material Issue Slip (MIS) data source
  if (request.dataSource === 'mis') {
    let query = supabase
      .from('store_mis_items')
      .select(`
        id,
        item_code,
        item_description,
        issue_qty,
        uom,
        store_mis!inner (
          id,
          doc_no,
          date,
          dept_name,
          stock_status
        )
      `)
      .eq('store_mis.stock_status', 'POSTED');
    
    if (request.dateFrom) {
      query = query.gte('store_mis.date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('store_mis.date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For FG Transfer data source
  if (request.dataSource === 'fg_transfer') {
    let query = supabase
      .from('production_fg_transfer_note')
      .select(`
        id,
        doc_no,
        date,
        from_dept,
        to_dept,
        party_name,
        total_qty,
        total_boxes,
        stock_status
      `)
      .eq('stock_status', 'POSTED');
    
    if (request.dateFrom) {
      query = query.gte('date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Delivery Challan (Dispatch) data source
  if (request.dataSource === 'delivery_challan') {
    let query = supabase
      .from('dispatch_delivery_challan_items')
      .select(`
        id,
        item_code,
        item_description,
        hsn_code,
        pack_size,
        box_no,
        no_of_pcs,
        uom,
        value,
        dispatch_delivery_challan!inner (
          id,
          doc_no,
          date,
          party_name,
          address,
          gst_no,
          dc_no,
          dc_date,
          po_no,
          vehicle_no,
          lr_no,
          returnable,
          state,
          stock_status
        )
      `)
      .eq('dispatch_delivery_challan.stock_status', 'POSTED');
    
    if (request.dateFrom) {
      query = query.gte('dispatch_delivery_challan.date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('dispatch_delivery_challan.date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Job Work Challan (Outward to Job Worker) data source
  if (request.dataSource === 'job_work_challan') {
    let query = supabase
      .from('store_job_work_challan_items')
      .select(`
        id,
        item_code,
        item_name,
        material_description,
        qty,
        qty_pcs,
        uom,
        remarks,
        store_job_work_challan!inner (
          id,
          doc_no,
          sr_no,
          date,
          party_name,
          party_address,
          gst_no,
          vehicle_no,
          lr_no,
          challan_no,
          challan_date,
          total_qty,
          stock_status
        )
      `)
      .eq('store_job_work_challan.stock_status', 'POSTED');
    
    if (request.dateFrom) {
      query = query.gte('store_job_work_challan.date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('store_job_work_challan.date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Spare Parts Master (with stock levels) data source
  if (request.dataSource === 'spare_parts') {
    const { data, error } = await supabase
      .from('spare_parts_with_stock')
      .select(`
        id,
        item_code,
        item_name,
        category,
        sub_category,
        for_machine,
        for_mold,
        unit_of_measure,
        min_stock_level,
        reorder_qty,
        store_balance,
        production_balance,
        total_balance,
        is_low_stock
      `)
      .limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Spare Parts Movements data source
  if (request.dataSource === 'spare_movements') {
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
        document_no,
        movement_type,
        stock_items!inner (
          item_name,
          item_type,
          category,
          for_machine,
          for_mold
        )
      `)
      .eq('stock_items.item_type', 'SPARE');
    
    if (request.dateFrom) {
      query = query.gte('transaction_date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('transaction_date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Material Indent data source
  if (request.dataSource === 'material_indent') {
    let query = supabase
      .from('purchase_material_indent_slip_items')
      .select(`
        id,
        item_code,
        item_name,
        indent_qty,
        pending_qty,
        received_qty,
        uom,
        purchase_material_indent_slip!inner (
          id,
          ident_no,
          date,
          party_name,
          status
        )
      `);
    
    if (request.dateFrom) {
      query = query.gte('purchase_material_indent_slip.date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('purchase_material_indent_slip.date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Purchase Order data source
  if (request.dataSource === 'purchase_order') {
    let query = supabase
      .from('purchase_purchase_order_items')
      .select(`
        id,
        description,
        item_code,
        qty,
        unit,
        unit_price,
        rate,
        total_price,
        purchase_purchase_order!inner (
          id,
          po_no,
          doc_no,
          date,
          party_name,
          po_type,
          total_amt,
          gst_amount,
          final_amt
        )
      `);
    
    if (request.dateFrom) {
      query = query.gte('purchase_purchase_order.date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('purchase_purchase_order.date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Preventive Maintenance data source
  if (request.dataSource === 'preventive_maintenance') {
    let query = supabase
      .from('preventive_maintenance_tasks')
      .select(`*`);
    
    if (request.dateFrom) {
      query = query.gte('due_date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('due_date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Maintenance Schedules data source
  if (request.dataSource === 'maintenance_schedules') {
    let query = supabase
      .from('preventive_maintenance_schedules')
      .select(`*`);
    
    if (request.dateFrom) {
      query = query.gte('start_date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('start_date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Machine Breakdown data source
  if (request.dataSource === 'machine_breakdown') {
    let query = supabase
      .from('breakdown_maintenance_tasks')
      .select(`*`);
    
    if (request.dateFrom) {
      query = query.gte('reported_at', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('reported_at', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Mold Breakdown data source
  if (request.dataSource === 'mold_breakdown') {
    let query = supabase
      .from('mold_breakdown_maintenance_tasks')
      .select(`*`);
    
    if (request.dateFrom) {
      query = query.gte('reported_at', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('reported_at', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For Daily Weight Report data source
  if (request.dataSource === 'daily_weight_report') {
    let query = supabase
      .from('daily_weight_report')
      .select(`*`);
    
    if (request.dateFrom) {
      query = query.gte('production_date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('production_date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }

  // For First Pieces Approval data source
  if (request.dataSource === 'first_pieces_approval') {
    let query = supabase
      .from('first_pieces_approval')
      .select(`*`);
    
    if (request.dateFrom) {
      query = query.gte('production_date', request.dateFrom);
    }
    if (request.dateTo) {
      query = query.lte('production_date', request.dateTo);
    }
    
    const { data, error } = await query.limit(request.limit || 5000);
    
    if (error) throw new Error(error.message);
    
    return { data: aggregateResults((data || []) as RawDataRow[], request) };
  }
  
  return { data: [] };
}

// ============================================================================
// AGGREGATION HELPER
// ============================================================================

// Raw data row type - all nested relationships can be arrays or objects depending on Supabase query
type NestedOrArray<T> = T | T[];

interface RawDataRow {
  [key: string]: unknown;
  dpr_data?: NestedOrArray<{
    date?: string;
    shift?: string;
    shift_incharge?: string;
  }>;
  dispatch_memos?: NestedOrArray<{
    date?: string;
    party_name?: string;
  }>;
  store_grn?: NestedOrArray<{
    grn_no?: string;
    grn_date?: string;
    party_name?: string;
    type_of_material?: string;
  }>;
  store_jw_annexure_grn?: NestedOrArray<{
    doc_no?: string;
    date?: string;
    party_name?: string;
  }>;
  store_mis?: NestedOrArray<{
    doc_no?: string;
    date?: string;
    dept_name?: string;
  }>;
  dispatch_delivery_challan?: NestedOrArray<{
    doc_no?: string;
    date?: string;
    party_name?: string;
    dc_no?: string;
    dc_date?: string;
    po_no?: string;
    vehicle_no?: string;
    state?: string;
    returnable?: boolean;
  }>;
  store_job_work_challan?: NestedOrArray<{
    doc_no?: string;
    date?: string;
    party_name?: string;
    vehicle_no?: string;
    challan_no?: string;
    challan_date?: string;
  }>;
  purchase_material_indent_slip?: NestedOrArray<{
    ident_no?: string;
    date?: string;
    party_name?: string;
    status?: string;
  }>;
  purchase_purchase_order?: NestedOrArray<{
    po_no?: string;
    doc_no?: string;
    date?: string;
    party_name?: string;
    po_type?: string;
    total_amt?: number;
    final_amt?: number;
  }>;
  stock_items?: NestedOrArray<{
    item_name?: string;
    item_type?: string;
    category?: string;
    for_machine?: string;
    for_mold?: string;
  }>;
}

function aggregateResults(
  rawData: RawDataRow[],
  request: QueryRequest
): Record<string, unknown>[] {
  // If no aggregation needed, return raw data
  const hasAggregation = request.select.some(f => f.aggregation);
  if (!hasAggregation && !request.groupBy?.length) {
    // Just return transformed raw data
    return rawData.map(row => {
      const result: Record<string, unknown> = {};
      for (const field of request.select) {
        result[field.alias || field.field] = getFieldValue(row, field.field, request.dataSource);
      }
      return result;
    });
  }
  
  // Group the data
  const groups = new Map<string, RawDataRow[]>();
  
  for (const row of rawData) {
    const groupKey = request.groupBy?.map(fieldId => 
      String(getFieldValue(row, fieldId, request.dataSource))
    ).join('|') || 'all';
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(row);
  }
  
  // Calculate aggregates for each group
  const results: Record<string, unknown>[] = [];
  
  for (const [, rows] of groups) {
    const result: Record<string, unknown> = {};
    
    // Add group by values
    if (request.groupBy) {
      for (const fieldId of request.groupBy) {
        result[fieldId] = getFieldValue(rows[0], fieldId, request.dataSource);
      }
    }
    
    // Calculate aggregations
    for (const field of request.select) {
      if (field.aggregation) {
        const values = rows.map(row => {
          const val = getFieldValue(row, field.field, request.dataSource);
          return typeof val === 'number' ? val : Number(val) || 0;
        });
        
        const alias = field.alias || field.field;
        
        switch (field.aggregation) {
          case 'SUM':
            result[alias] = values.reduce((sum, v) => sum + v, 0);
            break;
          case 'COUNT':
            result[alias] = values.length;
            break;
          case 'AVG':
            result[alias] = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
            break;
          case 'MIN':
            result[alias] = Math.min(...values);
            break;
          case 'MAX':
            result[alias] = Math.max(...values);
            break;
          case 'COUNT_DISTINCT':
            result[alias] = new Set(values).size;
            break;
        }
      }
    }
    
    results.push(result);
  }
  
  return results;
}

// Helper to get first element if array, otherwise return as-is
function unwrapNested<T>(value: T | T[] | undefined): T | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getFieldValue(row: RawDataRow, fieldId: string, dataSource: DataSourceId): unknown {
  // Handle nested fields for different data sources
  if (dataSource === 'production') {
    const dprData = unwrapNested(row.dpr_data);
    switch (fieldId) {
      case 'shift': return dprData?.shift;
      case 'shift_incharge': return dprData?.shift_incharge;
      case 'date': return dprData?.date;
      default: return row[fieldId];
    }
  }
  
  if (dataSource === 'dispatch') {
    const dispatchMemos = unwrapNested(row.dispatch_memos);
    switch (fieldId) {
      case 'party_name': return dispatchMemos?.party_name;
      case 'date': return dispatchMemos?.date;
      default: return row[fieldId];
    }
  }
  
  if (dataSource === 'stock' || dataSource === 'spare_movements') {
    const stockItems = unwrapNested(row.stock_items);
    switch (fieldId) {
      case 'item_name': return stockItems?.item_name;
      case 'item_type': return stockItems?.item_type;
      case 'category': return stockItems?.category;
      case 'for_machine': return stockItems?.for_machine;
      case 'for_mold': return stockItems?.for_mold;
      default: return row[fieldId];
    }
  }
  
  if (dataSource === 'grn') {
    const storeGrn = unwrapNested(row.store_grn);
    switch (fieldId) {
      case 'party_name': return storeGrn?.party_name;
      case 'grn_no': return storeGrn?.grn_no;
      case 'type_of_material': return storeGrn?.type_of_material;
      case 'date': return storeGrn?.grn_date;
      default: return row[fieldId];
    }
  }

  if (dataSource === 'jw_grn') {
    const jwGrn = unwrapNested(row.store_jw_annexure_grn);
    switch (fieldId) {
      case 'party_name': return jwGrn?.party_name;
      case 'doc_no': return jwGrn?.doc_no;
      case 'date': return jwGrn?.date;
      default: return row[fieldId];
    }
  }

  if (dataSource === 'mis') {
    const storeMis = unwrapNested(row.store_mis);
    switch (fieldId) {
      case 'department': return storeMis?.dept_name;
      case 'doc_no': return storeMis?.doc_no;
      case 'date': return storeMis?.date;
      default: return row[fieldId];
    }
  }

  if (dataSource === 'delivery_challan') {
    const dc = unwrapNested(row.dispatch_delivery_challan);
    switch (fieldId) {
      case 'party_name': return dc?.party_name;
      case 'doc_no': return dc?.doc_no;
      case 'dc_no': return dc?.dc_no;
      case 'dc_date': return dc?.dc_date;
      case 'date': return dc?.date;
      case 'po_no': return dc?.po_no;
      case 'vehicle_no': return dc?.vehicle_no;
      case 'state': return dc?.state;
      case 'returnable': return dc?.returnable;
      default: return row[fieldId];
    }
  }

  if (dataSource === 'job_work_challan') {
    const jwc = unwrapNested(row.store_job_work_challan);
    switch (fieldId) {
      case 'party_name': return jwc?.party_name;
      case 'doc_no': return jwc?.doc_no;
      case 'date': return jwc?.date;
      case 'vehicle_no': return jwc?.vehicle_no;
      case 'challan_no': return jwc?.challan_no;
      case 'challan_date': return jwc?.challan_date;
      default: return row[fieldId];
    }
  }

  if (dataSource === 'material_indent') {
    const indent = unwrapNested(row.purchase_material_indent_slip);
    switch (fieldId) {
      case 'party_name': return indent?.party_name;
      case 'ident_no': return indent?.ident_no;
      case 'status': return indent?.status;
      case 'date': return indent?.date;
      default: return row[fieldId];
    }
  }

  if (dataSource === 'purchase_order') {
    const po = unwrapNested(row.purchase_purchase_order);
    switch (fieldId) {
      case 'party_name': return po?.party_name;
      case 'po_no': return po?.po_no;
      case 'po_type': return po?.po_type;
      case 'total_amt': return po?.total_amt;
      case 'final_amt': return po?.final_amt;
      case 'date': return po?.date;
      default: return row[fieldId];
    }
  }

  // For spare_parts, fg_transfer - direct mapping
  return row[fieldId];
}

