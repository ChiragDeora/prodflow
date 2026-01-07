// ============================================================================
// /api/reports/filters/[category]
// Get filter options for a category
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ category: string }>;
}

// GET - Get filter options
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { category } = await params;
    
    let filters: Record<string, unknown[]> = {};
    
    switch (category) {
      case 'production':
        filters = await getProductionFilters();
        break;
      case 'dispatch':
        filters = await getDispatchFilters();
        break;
      case 'stock':
        filters = await getStockFilters();
        break;
      case 'procurement':
        filters = await getProcurementFilters();
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown category: ${category}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      data: filters,
    });
    
  } catch (error) {
    console.error('Error in GET /api/reports/filters/[category]:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

async function getProductionFilters(): Promise<Record<string, unknown[]>> {
  // Get unique molds
  const { data: moldData } = await supabase
    .from('dpr_production_entries')
    .select('product')
    .not('product', 'is', null)
    .limit(500);
  
  const molds = [...new Set((moldData || []).map(d => d.product))].filter(Boolean).sort();
  
  // Get unique machines
  const { data: machineData } = await supabase
    .from('dpr_production_entries')
    .select('machine_no')
    .not('machine_no', 'is', null)
    .limit(500);
  
  const machines = [...new Set((machineData || []).map(d => d.machine_no))].filter(Boolean).sort();
  
  // Get unique lines
  const { data: lineData } = await supabase
    .from('dpr_production_entries')
    .select('line_id')
    .not('line_id', 'is', null)
    .limit(500);
  
  const lines = [...new Set((lineData || []).map(d => d.line_id))].filter(Boolean).sort();
  
  return {
    molds,
    machines,
    lines,
    shifts: ['DAY', 'NIGHT'],
  };
}

async function getDispatchFilters(): Promise<Record<string, unknown[]>> {
  // Get unique customers
  const { data: customerData } = await supabase
    .from('dispatch_memos')
    .select('party_name')
    .not('party_name', 'is', null)
    .limit(500);
  
  const customers = [...new Set((customerData || []).map(d => d.party_name))].filter(Boolean).sort();
  
  // Get unique FG codes
  const { data: fgData } = await supabase
    .from('dispatch_memo_items')
    .select('item_code')
    .not('item_code', 'is', null)
    .limit(500);
  
  const fgCodes = [...new Set((fgData || []).map(d => d.item_code))].filter(Boolean).sort();
  
  return {
    customers,
    fgCodes,
  };
}

async function getStockFilters(): Promise<Record<string, unknown[]>> {
  // Get unique locations
  const { data: locationData } = await supabase
    .from('stock_balances')
    .select('location_code')
    .limit(100);
  
  const locations = [...new Set((locationData || []).map(d => d.location_code))].filter(Boolean).sort();
  
  // Get unique item types
  const { data: typeData } = await supabase
    .from('stock_items')
    .select('item_type')
    .limit(100);
  
  const itemTypes = [...new Set((typeData || []).map(d => d.item_type))].filter(Boolean).sort();
  
  // Get document types
  const documentTypes = [
    'GRN',
    'JW_GRN',
    'MIS',
    'DPR',
    'FG_TRANSFER',
    'DISPATCH',
    'CUSTOMER_RETURN',
    'STOCK_ADJUSTMENT',
  ];
  
  return {
    locations,
    itemTypes,
    documentTypes,
    movementTypes: ['IN', 'OUT'],
  };
}

async function getProcurementFilters(): Promise<Record<string, unknown[]>> {
  // Get unique suppliers
  const { data: supplierData } = await supabase
    .from('store_grn')
    .select('party_name')
    .not('party_name', 'is', null)
    .limit(500);
  
  const suppliers = [...new Set((supplierData || []).map(d => d.party_name))].filter(Boolean).sort();
  
  // Get material types
  const materialTypes = ['RM', 'PM', 'STORE'];
  
  return {
    suppliers,
    materialTypes,
  };
}

