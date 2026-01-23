// ============================================================================
// STOCK QUERY FUNCTIONS
// ============================================================================
// Functions for querying stock balances and ledger entries
// ============================================================================

import { getSupabase, handleSupabaseError } from '../supabase/utils';
import type {
  StockBalanceQuery,
  StockLedgerQuery,
  StockBalanceResult,
  StockLedgerEntry,
  LocationCode,
  ItemType,
  DocumentType,
} from '../supabase/types/stock';

// ============================================================================
// BALANCE QUERIES
// ============================================================================

/**
 * Get stock balances with optional filters
 * 
 * @param query - Query parameters for filtering
 * @returns Array of stock balance results
 */
export async function getStockBalances(
  query: StockBalanceQuery = {}
): Promise<StockBalanceResult[]> {
  const supabase = getSupabase();
  
  console.log('🔍 [getStockBalances] Query params:', query);
  
  // Use the stock_items_with_balances view for efficient querying
  let queryBuilder = supabase
    .from('stock_items_with_balances')
    .select('*');
  
  // Apply filters
  if (query.search) {
    // Use ilike for partial matching on both item_code and item_name
    queryBuilder = queryBuilder.or(`item_code.ilike.%${query.search}%,item_name.ilike.%${query.search}%`);
  } else if (query.item_code) {
    // Exact match for item_code when search is not provided
    queryBuilder = queryBuilder.eq('item_code', query.item_code);
  }
  
  if (query.item_type) {
    queryBuilder = queryBuilder.eq('item_type', query.item_type);
  }
  
  const { data, error } = await queryBuilder.order('item_code', { ascending: true });
  
  if (error) {
    console.error('❌ [getStockBalances] Database error:', error);
    handleSupabaseError(error, 'fetching stock balances');
    throw error;
  }
  
  console.log('📊 [getStockBalances] Raw data from view:', { count: data?.length, sample: data?.slice(0, 3) });
  
  if (!data || data.length === 0) {
    console.warn('⚠️ [getStockBalances] No items found in stock_items_with_balances view. This could mean:');
    console.warn('   1. No stock_items exist in the database');
    console.warn('   2. All stock_items have is_active = FALSE');
    console.warn('   3. The view query failed');
    return [];
  }
  
  // If location_code filter is specified, transform to show only that location
  // Include items that have a balance > 0 OR have a ledger entry at that location
  if (query.location_code) {
    const location = query.location_code as LocationCode;
    const lastMovementField = getLastMovementFieldForLocation(location);
    
    const filtered = data
      .filter(item => {
        // Include items that have a balance > 0 OR have a last movement timestamp
        // This ensures items with stock are shown even if last_movement_at is null
        const balance = getBalanceForLocation(item, location);
        const lastMovement = (item as any)[lastMovementField];
        return balance > 0 || (lastMovement !== null && lastMovement !== undefined);
      })
      .map(item => {
        const balance = getBalanceForLocation(item, location);
        const boxes = getBoxesForLocation(item, location);
        const totalQtyPcs = balance;
        
        return {
          id: `${item.id}-${location}`,
          item_code: item.item_code,
          item_name: item.item_name,
          item_type: item.item_type as ItemType,
          sub_category: item.sub_category,
          category: item.category,
          location_code: location,
          current_balance: balance,
          unit_of_measure: item.unit_of_measure,
          last_movement_at: getLastMovementForLocation(item, location),
          // RM-specific fields
          rm_supplier: (item as any).rm_supplier,
          // SFG-specific fields
          sfg_code: (item as any).sfg_code,
          sfg_item_name: (item as any).sfg_item_name,
          sfg_qty_pcs: (item as any)[`${location.toLowerCase().replace('_', '_')}_sfg_qty_pcs`] || undefined,
          sfg_qty_kgs: (item as any)[`${location.toLowerCase().replace('_', '_')}_sfg_qty_kgs`] || undefined,
          // PM-specific fields
          pm_dimensions: (item as any).pm_dimensions,
          pm_party_name: (item as any).pm_party_name,
          pm_color_remarks: (item as any).pm_color_remarks,
          // FG-specific fields
          fg_code: (item as any).fg_code,
          fg_color: (item as any).fg_color,
          fg_party: (item as any).fg_party,
          fg_pack_size: (item as any).fg_pack_size,
          qty_boxes: boxes,
          total_qty_pcs: totalQtyPcs,
          total_qty_ton: (item as any)[`${location.toLowerCase().replace('_', '_')}_total_qty_ton`] || undefined,
          qc_check: (item as any).qc_check,
        };
      });
    
    console.log(`📊 [getStockBalances] After filtering by location ${query.location_code}:`, {
      totalItemsInView: data.length,
      itemsWithBalance: filtered.length,
      sample: filtered.slice(0, 3)
    });
    
    return filtered;
  }
  
  // Return all locations with balances
  // Only show items in locations where they have at least one stock ledger entry
  // This prevents cluttering the view with items that have never had stock movements at a location
  const results: StockBalanceResult[] = [];
  
  // Get all balance entries to check which items have entries at which locations
  // This is more reliable than relying on last_movement_at from the view
  const { data: balanceEntries } = await supabase
    .from('stock_balances')
    .select('item_code, location_code')
    .limit(10000); // Should be enough for most cases
  
  // Create a set of item_code + location_code combinations that have balance entries
  const hasBalanceEntry = new Set<string>();
  if (balanceEntries) {
    for (const entry of balanceEntries) {
      hasBalanceEntry.add(`${entry.item_code}:${entry.location_code}`);
    }
  }
  
  for (const item of data) {
    const baseId = item.id as string;
    const storeBalance = item.store_balance || 0;
    const productionBalance = item.production_balance || 0;
    const fgStoreBalance = item.fg_store_balance || 0;
    const storeLastMovement = (item as any).store_last_movement_at;
    const productionLastMovement = (item as any).production_last_movement_at;
    const fgStoreLastMovement = (item as any).fg_store_last_movement_at;
    
    // Only add item to a location if it has at least one ledger entry at that location
    // Check last_movement_at OR if there's a balance entry in stock_balances
    // A balance entry means there are or were ledger entries for this item at this location
    
    // Add STORE balance only if there's a ledger entry
    const hasStoreEntry = storeLastMovement || hasBalanceEntry.has(`${item.item_code}:STORE`);
    if (hasStoreEntry) {
      results.push({
        id: `${baseId}-STORE`,
        item_code: item.item_code,
        item_name: item.item_name,
        item_type: item.item_type as ItemType,
        sub_category: item.sub_category,
        category: item.category,
        location_code: 'STORE',
        current_balance: storeBalance,
        unit_of_measure: item.unit_of_measure,
        last_movement_at: storeLastMovement,
        // RM-specific fields
        rm_supplier: (item as any).rm_supplier,
        // FG-specific fields
        fg_code: (item as any).fg_code,
        fg_color: (item as any).fg_color,
        fg_party: (item as any).fg_party,
        fg_pack_size: (item as any).fg_pack_size,
        qty_boxes: (item as any).store_boxes,
        total_qty_pcs: (item as any).store_total_qty_pcs,
        total_qty_ton: (item as any).store_total_qty_ton,
        qc_check: (item as any).qc_check,
      });
    }
    
    // Add PRODUCTION balance only if there's a ledger entry
    const hasProductionEntry = productionLastMovement || hasBalanceEntry.has(`${item.item_code}:PRODUCTION`);
    if (hasProductionEntry) {
      results.push({
        id: `${baseId}-PRODUCTION`,
        item_code: item.item_code,
        item_name: item.item_name,
        item_type: item.item_type as ItemType,
        sub_category: item.sub_category,
        category: item.category,
        location_code: 'PRODUCTION',
        current_balance: productionBalance,
        unit_of_measure: item.unit_of_measure,
        last_movement_at: productionLastMovement,
        // RM-specific fields
        rm_supplier: (item as any).rm_supplier,
        // FG-specific fields
        fg_code: (item as any).fg_code,
        fg_color: (item as any).fg_color,
        fg_party: (item as any).fg_party,
        fg_pack_size: (item as any).fg_pack_size,
        qty_boxes: (item as any).production_boxes,
        total_qty_pcs: (item as any).production_total_qty_pcs,
        total_qty_ton: (item as any).production_total_qty_ton,
        qc_check: (item as any).qc_check,
      });
    }
    
    // Add FG_STORE balance only if there's a ledger entry
    const hasFgStoreEntry = fgStoreLastMovement || hasBalanceEntry.has(`${item.item_code}:FG_STORE`);
    if (hasFgStoreEntry) {
      results.push({
        id: `${baseId}-FG_STORE`,
        item_code: item.item_code,
        item_name: item.item_name,
        item_type: item.item_type as ItemType,
        sub_category: item.sub_category,
        category: item.category,
        location_code: 'FG_STORE',
        current_balance: fgStoreBalance,
        unit_of_measure: item.unit_of_measure,
        last_movement_at: fgStoreLastMovement,
        // RM-specific fields
        rm_supplier: (item as any).rm_supplier,
        // FG-specific fields
        fg_code: (item as any).fg_code,
        fg_color: (item as any).fg_color,
        fg_party: (item as any).fg_party,
        fg_pack_size: (item as any).fg_pack_size,
        qty_boxes: (item as any).fg_store_boxes,
        total_qty_pcs: (item as any).fg_store_total_qty_pcs,
        total_qty_ton: (item as any).fg_store_total_qty_ton,
        qc_check: (item as any).qc_check,
      });
    }
  }
  
  console.log('📊 [getStockBalances] Final results:', {
    totalItemsInView: data.length,
    itemsWithLedgerEntries: results.length,
    byLocation: {
      STORE: results.filter(r => r.location_code === 'STORE').length,
      PRODUCTION: results.filter(r => r.location_code === 'PRODUCTION').length,
      FG_STORE: results.filter(r => r.location_code === 'FG_STORE').length,
    }
  });
  
  return results;
}

/**
 * Helper to get balance for a specific location from view row
 */
function getBalanceForLocation(
  item: Record<string, unknown>,
  location: LocationCode
): number {
  switch (location) {
    case 'STORE':
      return (item.store_balance as number) || 0;
    case 'PRODUCTION':
      return (item.production_balance as number) || 0;
    case 'FG_STORE':
      return (item.fg_store_balance as number) || 0;
    default:
      return 0;
  }
}

/**
 * Helper to get last movement timestamp for a specific location from view row
 */
function getLastMovementForLocation(
  item: Record<string, unknown>,
  location: LocationCode
): string | undefined {
  if (location === 'STORE') {
    return (item.store_last_movement_at as string) || undefined;
  } else if (location === 'PRODUCTION') {
    return (item.production_last_movement_at as string) || undefined;
  } else if (location === 'FG_STORE') {
    return (item.fg_store_last_movement_at as string) || undefined;
  }
  return undefined;
}

/**
 * Helper to get the field name for last movement at a specific location
 */
function getLastMovementFieldForLocation(
  location: LocationCode
): string {
  if (location === 'STORE') {
    return 'store_last_movement_at';
  } else if (location === 'PRODUCTION') {
    return 'production_last_movement_at';
  } else if (location === 'FG_STORE') {
    return 'fg_store_last_movement_at';
  }
  return '';
}

/**
 * Helper to get boxes for a specific location from view row (for FG items)
 */
function getBoxesForLocation(
  item: Record<string, unknown>,
  location: LocationCode
): number | undefined {
  if (location === 'STORE') {
    return (item.store_boxes as number) || undefined;
  } else if (location === 'PRODUCTION') {
    return (item.production_boxes as number) || undefined;
  } else if (location === 'FG_STORE') {
    return (item.fg_store_boxes as number) || undefined;
  }
  return undefined;
}

/**
 * Get total balance for an item across all locations
 */
export async function getTotalBalance(itemCode: string): Promise<{
  item_code: string;
  store: number;
  production: number;
  fg_store: number;
  total: number;
}> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_items_with_balances')
    .select('item_code, store_balance, production_balance, fg_store_balance, total_balance')
    .eq('item_code', itemCode)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return {
        item_code: itemCode,
        store: 0,
        production: 0,
        fg_store: 0,
        total: 0,
      };
    }
    handleSupabaseError(error, 'fetching total balance');
    throw error;
  }
  
  return {
    item_code: itemCode,
    store: data?.store_balance || 0,
    production: data?.production_balance || 0,
    fg_store: data?.fg_store_balance || 0,
    total: data?.total_balance || 0,
  };
}

/**
 * Get stock summary by location
 */
export async function getStockSummaryByLocation(): Promise<{
  location_code: string;
  location_name: string;
  item_type: string;
  item_count: number;
  total_quantity: number;
}[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_summary_by_location')
    .select('*');
  
  if (error) {
    handleSupabaseError(error, 'fetching stock summary');
    throw error;
  }
  
  return data || [];
}

// ============================================================================
// LEDGER QUERIES
// ============================================================================

/**
 * Get stock ledger entries with optional filters
 * 
 * @param query - Query parameters for filtering
 * @returns Array of stock ledger entries
 */
export async function getStockLedger(
  query: StockLedgerQuery = {}
): Promise<StockLedgerEntry[]> {
  const supabase = getSupabase();
  
  let queryBuilder = supabase
    .from('stock_ledger')
    .select(`
      *,
      stock_items (
        item_name,
        item_type,
        sub_category,
        category
      )
    `);
  
  // Apply filters
  if (query.item_code) {
    queryBuilder = queryBuilder.eq('item_code', query.item_code);
  }
  
  if (query.location_code) {
    queryBuilder = queryBuilder.eq('location_code', query.location_code);
  }
  
  // Note: item_type filter needs to be applied after fetching because
  // Supabase doesn't support filtering on joined tables directly
  // We'll filter in the API route after getting results
  
  if (query.document_type) {
    queryBuilder = queryBuilder.eq('document_type', query.document_type);
  }
  
  if (query.from_date) {
    queryBuilder = queryBuilder.gte('transaction_date', query.from_date);
  }
  
  if (query.to_date) {
    queryBuilder = queryBuilder.lte('transaction_date', query.to_date);
  }
  
  // Apply pagination
  if (query.limit) {
    queryBuilder = queryBuilder.limit(query.limit);
  }
  
  if (query.offset) {
    queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 100) - 1);
  }
  
  // Order by most recent first
  queryBuilder = queryBuilder.order('posted_at', { ascending: false });
  
  const { data, error } = await queryBuilder;
  
  if (error) {
    handleSupabaseError(error, 'fetching stock ledger');
    throw error;
  }
  
  return data || [];
}

/**
 * Get ledger entries for a specific item with running balance
 */
export async function getItemLedgerWithBalance(
  itemCode: string,
  locationCode?: LocationCode,
  fromDate?: string,
  toDate?: string
): Promise<{
  entry: StockLedgerEntry;
  item_name?: string;
}[]> {
  const supabase = getSupabase();
  
  let queryBuilder = supabase
    .from('stock_ledger_recent')
    .select('*')
    .eq('item_code', itemCode);
  
  if (locationCode) {
    queryBuilder = queryBuilder.eq('location_code', locationCode);
  }
  
  if (fromDate) {
    queryBuilder = queryBuilder.gte('transaction_date', fromDate);
  }
  
  if (toDate) {
    queryBuilder = queryBuilder.lte('transaction_date', toDate);
  }
  
  queryBuilder = queryBuilder.order('posted_at', { ascending: true });
  
  const { data, error } = await queryBuilder;
  
  if (error) {
    handleSupabaseError(error, 'fetching item ledger');
    throw error;
  }
  
  return (data || []).map(entry => ({
    entry: entry as StockLedgerEntry,
    item_name: entry.item_name,
  }));
}

/**
 * Get document posting history
 */
export async function getDocumentHistory(
  documentType: DocumentType,
  documentId: string
): Promise<StockLedgerEntry[]> {
  const supabase = getSupabase();
  
  // Get entries for both original posting and cancellation
  const { data, error } = await supabase
    .from('stock_ledger')
    .select('*')
    .eq('document_id', documentId)
    .in('document_type', [documentType, `${documentType}_CANCEL`])
    .order('posted_at', { ascending: true });
  
  if (error) {
    handleSupabaseError(error, 'fetching document history');
    throw error;
  }
  
  return data || [];
}

// ============================================================================
// STOCK ITEM QUERIES
// ============================================================================

/**
 * Get all stock items with optional filters
 */
export async function getStockItems(
  itemType?: ItemType,
  category?: string,
  includeInactive: boolean = false
): Promise<{
  id: number;
  item_code: string;
  item_name: string;
  item_type: ItemType;
  category?: string;
  sub_category?: string;
  unit_of_measure: string;
  is_active: boolean;
}[]> {
  const supabase = getSupabase();
  
  let queryBuilder = supabase
    .from('stock_items')
    .select('*');
  
  if (!includeInactive) {
    queryBuilder = queryBuilder.eq('is_active', true);
  }
  
  if (itemType) {
    queryBuilder = queryBuilder.eq('item_type', itemType);
  }
  
  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }
  
  queryBuilder = queryBuilder.order('item_type').order('item_code');
  
  const { data, error } = await queryBuilder;
  
  if (error) {
    handleSupabaseError(error, 'fetching stock items');
    throw error;
  }
  
  return data || [];
}

/**
 * Search stock items by code or name
 */
export async function searchStockItems(
  searchTerm: string,
  limit: number = 20
): Promise<{
  id: number;
  item_code: string;
  item_name: string;
  item_type: ItemType;
  unit_of_measure: string;
}[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_items')
    .select('id, item_code, item_name, item_type, unit_of_measure')
    .eq('is_active', true)
    .or(`item_code.ilike.%${searchTerm}%,item_name.ilike.%${searchTerm}%`)
    .limit(limit);
  
  if (error) {
    handleSupabaseError(error, 'searching stock items');
    throw error;
  }
  
  return data || [];
}

// ============================================================================
// VALIDATION QUERIES
// ============================================================================

/**
 * Verify stock balance integrity
 * Compares cached balance with calculated sum from ledger
 */
export async function verifyBalanceIntegrity(
  itemCode: string,
  locationCode: LocationCode
): Promise<{
  isValid: boolean;
  cachedBalance: number;
  calculatedBalance: number;
  difference: number;
}> {
  const supabase = getSupabase();
  
  // Get cached balance
  const { data: cacheData, error: cacheError } = await supabase
    .from('stock_balances')
    .select('current_balance')
    .eq('item_code', itemCode)
    .eq('location_code', locationCode)
    .single();
  
  const cachedBalance = cacheData?.current_balance || 0;
  
  // Calculate from ledger
  const { data: ledgerData, error: ledgerError } = await supabase
    .from('stock_ledger')
    .select('quantity')
    .eq('item_code', itemCode)
    .eq('location_code', locationCode);
  
  if (ledgerError) {
    handleSupabaseError(ledgerError, 'fetching ledger for verification');
    throw ledgerError;
  }
  
  const calculatedBalance = (ledgerData || []).reduce(
    (sum, entry) => sum + (entry.quantity || 0),
    0
  );
  
  const difference = Math.abs(cachedBalance - calculatedBalance);
  
  return {
    isValid: difference < 0.0001, // Allow tiny floating point differences
    cachedBalance,
    calculatedBalance,
    difference,
  };
}

