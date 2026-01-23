// ============================================================================
// STOCK LEDGER SYSTEM - Helper Functions
// ============================================================================

import { getSupabase, handleSupabaseError } from '../supabase/utils';
import type {
  StockItem,
  StockBalance,
  StockLedgerEntry,
  CreateStockLedgerEntry,
  LocationCode,
  DocumentType,
  MovementType,
  UnitOfMeasure,
  ItemType,
  StockPostingError,
  SfgBom,
  FgBom,
  StockItemMapping,
} from '../supabase/types/stock';

// ============================================================================
// BALANCE OPERATIONS
// ============================================================================

/**
 * Get current balance for an item at a location
 * Returns 0 if no balance record exists
 */
export async function getBalance(
  itemCode: string,
  locationCode: LocationCode
): Promise<number> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_balances')
    .select('current_balance')
    .eq('item_code', itemCode)
    .eq('location_code', locationCode)
    .single();
  
  if (error) {
    // PGRST116 means no rows returned - that's fine, return 0
    if (error.code === 'PGRST116') {
      return 0;
    }
    handleSupabaseError(error, 'getting stock balance');
    throw error;
  }
  
  return data?.current_balance || 0;
}

/**
 * Update balance (upsert) - creates if not exists, updates if exists
 */
export async function updateBalance(
  itemId: number,
  itemCode: string,
  locationCode: LocationCode,
  newBalance: number,
  unitOfMeasure: UnitOfMeasure
): Promise<void> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('stock_balances')
    .upsert(
      {
        item_id: itemId,
        item_code: itemCode,
        location_code: locationCode,
        current_balance: newBalance,
        unit_of_measure: unitOfMeasure,
        last_updated: new Date().toISOString(),
      },
      {
        onConflict: 'item_code,location_code',
      }
    );
  
  if (error) {
    handleSupabaseError(error, 'updating stock balance');
    throw error;
  }
}

// ============================================================================
// LEDGER OPERATIONS
// ============================================================================

/**
 * Create a ledger entry
 */
export async function createLedgerEntry(
  entry: CreateStockLedgerEntry
): Promise<StockLedgerEntry> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_ledger')
    .insert({
      item_id: entry.item_id,
      item_code: entry.item_code,
      location_code: entry.location_code,
      quantity: entry.quantity,
      unit_of_measure: entry.unit_of_measure,
      balance_after: entry.balance_after,
      transaction_date: entry.transaction_date,
      document_type: entry.document_type,
      document_id: entry.document_id,
      document_number: entry.document_number,
      movement_type: entry.movement_type,
      counterpart_location: entry.counterpart_location,
      posted_by: entry.posted_by,
      remarks: entry.remarks,
    })
    .select()
    .single();
  
  if (error) {
    // Check for duplicate key error (already posted)
    if (error.code === '23505') {
      const duplicateError = new Error(
        `This document has already been posted to stock. ` +
        `To re-post, you must first cancel the existing stock entries. ` +
        `Item: ${entry.item_code}, Location: ${entry.location_code}`
      );
      (duplicateError as any).code = 'ALREADY_POSTED';
      (duplicateError as any).details = error.details;
      throw duplicateError;
    }
    handleSupabaseError(error, 'creating ledger entry');
    throw error;
  }
  
  return data;
}

/**
 * Upsert a ledger entry - update if exists, create if not
 * Used for DPR multi-line posting where same SFG might be produced by multiple lines
 */
export async function upsertLedgerEntry(
  entry: CreateStockLedgerEntry
): Promise<StockLedgerEntry> {
  const supabase = getSupabase();
  
  // Check if entry already exists
  const { data: existing } = await supabase
    .from('stock_ledger')
    .select('*')
    .eq('document_type', entry.document_type)
    .eq('document_id', entry.document_id)
    .eq('item_code', entry.item_code)
    .eq('location_code', entry.location_code)
    .eq('movement_type', entry.movement_type)
    .single();
  
  if (existing) {
    // Update existing entry - add quantities together
    const newQuantity = roundQuantity((existing.quantity || 0) + entry.quantity);
    // Use the new balance from current entry (already calculated correctly)
    const newBalance = entry.balance_after;
    
    // Update remarks to include new line info
    const updatedRemarks = existing.remarks 
      ? `${existing.remarks}; ${entry.remarks}`
      : entry.remarks;
    
    const { data, error } = await supabase
      .from('stock_ledger')
      .update({
        quantity: newQuantity,
        balance_after: newBalance,
        remarks: updatedRemarks,
        document_number: entry.document_number, // Update to latest
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'updating ledger entry');
      throw error;
    }
    
    // Also update the balance cache (already done in post-dpr, but ensure it's updated)
    await updateBalance(
      entry.item_id,
      entry.item_code,
      entry.location_code,
      newBalance,
      entry.unit_of_measure
    );
    
    return data;
  } else {
    // Create new entry
    return createLedgerEntry(entry);
  }
}

/**
 * Check if a document is already posted to stock
 */
export async function isDocumentPosted(
  documentType: DocumentType,
  documentId: string
): Promise<boolean> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_ledger')
    .select('id')
    .eq('document_type', documentType)
    .eq('document_id', documentId)
    .limit(1);
  
  if (error) {
    handleSupabaseError(error, 'checking document posted status');
    throw error;
  }
  
  return data && data.length > 0;
}

/**
 * Get all ledger entries for a document
 */
export async function getLedgerEntriesForDocument(
  documentType: DocumentType,
  documentId: string
): Promise<StockLedgerEntry[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_ledger')
    .select('*')
    .eq('document_type', documentType)
    .eq('document_id', documentId);
  
  if (error) {
    handleSupabaseError(error, 'getting ledger entries');
    throw error;
  }
  
  return data || [];
}

// ============================================================================
// STOCK ITEM OPERATIONS
// ============================================================================

/**
 * Get stock item by item code
 */
export async function getStockItemByCode(
  itemCode: string
): Promise<StockItem | null> {
  const supabase = getSupabase();
  
  console.log(`[getStockItemByCode] Looking for item_code: "${itemCode}"`);
  
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('item_code', itemCode)
    .eq('is_active', true)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      console.log(`[getStockItemByCode] Item "${itemCode}" not found`);
      return null;
    }
    handleSupabaseError(error, 'getting stock item');
    throw error;
  }
  
  console.log(`[getStockItemByCode] Found item: ${data?.item_code}`);
  return data;
}

/**
 * Get stock item by ID
 */
export async function getStockItemById(
  itemId: number
): Promise<StockItem | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('id', itemId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    handleSupabaseError(error, 'getting stock item by ID');
    throw error;
  }
  
  return data;
}

/**
 * Create a new stock item
 */
export async function createStockItem(
  itemCode: string,
  itemName: string,
  itemType: ItemType,
  unitOfMeasure: UnitOfMeasure,
  category?: string,
  subCategory?: string,
  forMachine?: string,
  forMold?: string,
  minStockLevel?: number,
  reorderQty?: number
): Promise<StockItem> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_items')
    .insert({
      item_code: itemCode,
      item_name: itemName,
      item_type: itemType,
      category: category,
      sub_category: subCategory,
      for_machine: forMachine,
      for_mold: forMold,
      min_stock_level: minStockLevel || 0,
      reorder_qty: reorderQty || 0,
      unit_of_measure: unitOfMeasure,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    handleSupabaseError(error, 'creating stock item');
    throw error;
  }
  
  return data;
}

/**
 * Get or create the REGRIND stock item
 */
export async function getOrCreateRegrindItem(): Promise<StockItem> {
  const regrindCode = 'REGRIND';
  
  let item = await getStockItemByCode(regrindCode);
  
  if (!item) {
    item = await createStockItem(
      regrindCode,
      'Regrind Material',
      'RM',
      'KG',
      'REGRIND'
    );
  }
  
  return item;
}

/**
 * Get or create an SFG stock item
 * Auto-creates the item if it doesn't exist (from sfg_bom data)
 */
export async function getOrCreateSfgItem(
  sfgCode: string,
  itemName: string
): Promise<StockItem> {
  let item = await getStockItemByCode(sfgCode);
  
  if (!item) {
    console.log(`📦 Auto-creating SFG item: ${sfgCode} (${itemName})`);
    item = await createStockItem(
      sfgCode,
      itemName,
      'SFG',
      'NOS',
      'SFG'
    );
    console.log(`✅ Created SFG item: ${sfgCode}`);
  }
  
  return item;
}

// ============================================================================
// ITEM MAPPING OPERATIONS
// ============================================================================

/**
 * Get or create RM item by type and grade
 * Looks up raw_materials by type and grade to get category and supplier,
 * then creates/returns stock item with proper format: {category}-{type}-{grade}
 * 
 * @param rmType - Raw material type (e.g., "HP", "ICP", "RCP")
 * @param grade - Raw material grade (e.g., "HJ333MO", "1750 MN")
 * @returns StockItem with item_code like "PP-HP-HJ333MO"
 */
export async function getOrCreateRmItem(
  rmType: string,
  grade: string
): Promise<StockItem | null> {
  const supabase = getSupabase();
  
  if (!rmType || !grade) {
    console.log(`[getOrCreateRmItem] Missing rmType or grade: rmType="${rmType}", grade="${grade}"`);
    return null;
  }
  
  const upperType = rmType.toUpperCase().trim();
  const trimmedGrade = grade.trim();
  
  console.log(`[getOrCreateRmItem] Looking up raw_materials: type="${upperType}", grade="${trimmedGrade}"`);
  
  // Look up raw_materials by type and grade
  const { data: rawMaterial, error: rmError } = await supabase
    .from('raw_materials')
    .select('category, type, grade, supplier')
    .eq('type', upperType)
    .eq('grade', trimmedGrade)
    .limit(1)
    .single();
  
  if (rmError || !rawMaterial) {
    console.log(`[getOrCreateRmItem] Raw material not found in raw_materials table: type="${upperType}", grade="${trimmedGrade}"`);
    return null;
  }
  
  const category = rawMaterial.category || 'PP';
  const supplier = rawMaterial.supplier || '';
  
  // Create item_code as {category}-{type}-{grade}
  const itemCode = `${category}-${upperType}-${trimmedGrade}`;
  
  console.log(`[getOrCreateRmItem] Found raw material: category="${category}", supplier="${supplier}", item_code="${itemCode}"`);
  
  // Check if stock item already exists
  let stockItem = await getStockItemByCode(itemCode);
  if (stockItem) {
    console.log(`[getOrCreateRmItem] Stock item already exists: ${itemCode}`);
    return stockItem;
  }
  
  // Create item_name as {type} {grade} or include supplier if available
  const itemName = supplier 
    ? `${category} ${upperType} ${trimmedGrade} (${supplier})`
    : `${category} ${upperType} ${trimmedGrade}`;
  
  // Create new stock item
  console.log(`[getOrCreateRmItem] Creating new stock item: ${itemCode}`);
  const { data: newItem, error: createError } = await supabase
    .from('stock_items')
    .insert({
      item_code: itemCode,
      item_name: itemName,
      item_type: 'RM',
      category: category,
      sub_category: upperType,
      unit_of_measure: 'KG',
      is_active: true,
    })
    .select()
    .single();
  
  if (createError || !newItem) {
    console.error(`[getOrCreateRmItem] Failed to create stock item:`, createError?.message);
    return null;
  }
  
  console.log(`[getOrCreateRmItem] Created stock item: ${newItem.item_code}`);
  return newItem;
}

/**
 * Get or create PM item by item_code
 * Looks up packing_materials by item_code to get category, type, and other details,
 * then creates/returns stock item if it doesn't exist
 * 
 * @param itemCode - Packing material item code (e.g., "CTN-Ro16T-GM", "CTN-Ro16")
 * @returns StockItem with the provided item_code
 */
export async function getOrCreatePmItem(
  itemCode: string
): Promise<StockItem | null> {
  const supabase = getSupabase();
  
  if (!itemCode || itemCode.trim() === '') {
    console.log(`[getOrCreatePmItem] Empty itemCode, returning null`);
    return null;
  }
  
  const trimmedCode = itemCode.trim();
  
  console.log(`[getOrCreatePmItem] Looking up packing_materials master table first: item_code="${trimmedCode}"`);
  
  // FIRST: Look up packing_materials master table by item_code
  const { data: packingMaterial, error: pmError } = await supabase
    .from('packing_materials')
    .select('category, type, item_code, pack_size, dimensions, brand, unit')
    .eq('item_code', trimmedCode)
    .limit(1)
    .single();
  
  if (pmError || !packingMaterial) {
    console.log(`[getOrCreatePmItem] Packing material not found in packing_materials master table: item_code="${trimmedCode}"`);
    return null;
  }
  
  // SECOND: Check if stock item already exists (if it was already created)
  let stockItem = await getStockItemByCode(trimmedCode);
  if (stockItem) {
    console.log(`[getOrCreatePmItem] Stock item already exists: ${trimmedCode}`);
    return stockItem;
  }
  
  const category = packingMaterial.category || 'PACKING';
  const type = packingMaterial.type || '';
  const packSize = packingMaterial.pack_size || '';
  const dimensions = packingMaterial.dimensions || '';
  const brand = packingMaterial.brand || '';
  
  // Determine unit of measure based on category
  let unitOfMeasure: UnitOfMeasure = 'NOS';
  if (category.toUpperCase().includes('BOPP')) {
    unitOfMeasure = 'METERS';
  } else if (packingMaterial.unit) {
    // Use unit from packing_materials if available
    const unitUpper = packingMaterial.unit.toUpperCase();
    if (['KG', 'NOS', 'METERS', 'PCS', 'LTR', 'MTR', 'SET'].includes(unitUpper)) {
      unitOfMeasure = unitUpper as UnitOfMeasure;
    }
  }
  
  // Create item_name from available fields
  const nameParts: string[] = [category];
  if (type) nameParts.push(type);
  if (packSize) nameParts.push(`Pack: ${packSize}`);
  if (dimensions) nameParts.push(`(${dimensions})`);
  if (brand) nameParts.push(`[${brand}]`);
  const itemName = nameParts.join(' ') || trimmedCode;
  
  console.log(`[getOrCreatePmItem] Found packing material: category="${category}", type="${type}", item_code="${trimmedCode}"`);
  
  // Create new stock item
  console.log(`[getOrCreatePmItem] Creating new stock item: ${trimmedCode}`);
  const { data: newItem, error: createError } = await supabase
    .from('stock_items')
    .insert({
      item_code: trimmedCode,
      item_name: itemName,
      item_type: 'PM',
      category: category,
      sub_category: type || undefined,
      unit_of_measure: unitOfMeasure,
      is_active: true,
    })
    .select()
    .single();
  
  if (createError || !newItem) {
    console.error(`[getOrCreatePmItem] Failed to create stock item:`, createError?.message);
    return null;
  }
  
  console.log(`[getOrCreatePmItem] Created stock item: ${newItem.item_code}`);
  return newItem;
}

/**
 * Map document description to stock item code
 * Handles:
 * 1. Explicit mappings
 * 2. Direct item_code match
 * 3. PM item_code auto-creation (if looks like PM code like "CTN-*", looks up packing_materials)
 * 4. Direct item_name match
 * 5. RM Type match (e.g., "HP" -> find RM with sub_category = "HP")
 * 6. PM Category match (e.g., "Boxes" -> find PM with category = "Boxes")
 * 7. RM Type + Grade match (when grade is provided) -> creates {category}-{type}-{grade}
 * 
 * @param sourceTable - Source table name for mapping lookup
 * @param description - Item description (can be rmType like "HP" or item_code)
 * @param grade - Optional grade code (e.g., "HJ333MO") - when provided with rmType, creates proper item_code
 */
export async function mapItemToStockItem(
  sourceTable: string,
  description: string,
  grade?: string
): Promise<StockItem | null> {
  const supabase = getSupabase();
  
  if (!description || description.trim() === '') {
    console.log(`[mapItemToStockItem] Empty description, returning null`);
    return null;
  }
  
  console.log(`[mapItemToStockItem] Trying to map: "${description}" from ${sourceTable}`);
  
  // First check explicit mappings
  const { data: mapping, error: mappingError } = await supabase
    .from('stock_item_mappings')
    .select('stock_item_code')
    .eq('source_table', sourceTable)
    .eq('source_description', description)
    .eq('is_active', true)
    .single();
  
  if (!mappingError && mapping) {
    return getStockItemByCode(mapping.stock_item_code);
  }
  
  // If description looks like a PM item_code (e.g., CTN-Ro16T-GM),
  // check packing_materials master table FIRST before checking stock_items
  // Common PM item_code patterns: CTN-*, BOPP-*, POLY-*, etc.
  const pmPatterns = ['CTN-', 'BOPP-', 'POLY-', 'BOX-', 'CARTON-'];
  const looksLikePmCode = pmPatterns.some(pattern => description.toUpperCase().startsWith(pattern));
  
  if (looksLikePmCode) {
    console.log(`[mapItemToStockItem] Description "${description}" looks like PM item_code, checking packing_materials master first`);
    const pmItem = await getOrCreatePmItem(description);
    if (pmItem) {
      console.log(`[mapItemToStockItem] Found/created PM item from master: ${pmItem.item_code}`);
      return pmItem;
    }
    // If not found in master, continue to other lookup methods
  }
  
  // Try direct match by item_code in stock_items (fallback)
  let item = await getStockItemByCode(description);
  if (item) return item;
  
  // Try match by item_name
  const { data: itemByName, error: nameError } = await supabase
    .from('stock_items')
    .select('*')
    .eq('item_name', description)
    .eq('is_active', true)
    .single();
  
  if (!nameError && itemByName) {
    return itemByName;
  }
  
  // Try RM Type match: If description is an RM Type (HP, ICP, RCP, etc.), find RM with that sub_category
  // Common RM Types: HP, ICP, RCP, LDPE, HDPE, GPPS, MB
  const rmTypes = ['HP', 'ICP', 'RCP', 'LDPE', 'HDPE', 'GPPS', 'MB'];
  const upperDescription = description.toUpperCase().trim();
  
  // If both rmType (description) and grade are provided, use getOrCreateRmItem
  if (rmTypes.includes(upperDescription) && grade) {
    console.log(`[mapItemToStockItem] Both rmType="${upperDescription}" and grade="${grade}" provided, using getOrCreateRmItem`);
    const rmItem = await getOrCreateRmItem(upperDescription, grade);
    if (rmItem) {
      console.log(`[mapItemToStockItem] Found/created RM item: ${rmItem.item_code}`);
      return rmItem;
    }
    // If getOrCreateRmItem fails (raw_materials lookup failed), fallback to current behavior
    console.log(`[mapItemToStockItem] getOrCreateRmItem failed, falling back to standard RM behavior`);
  }
  
  if (rmTypes.includes(upperDescription)) {
    console.log(`[mapItemToStockItem] "${description}" is an RM type, trying RM-${upperDescription}`);
    // First try to find the standard RM item (e.g., "RM-HP")
    const standardRmCode = `RM-${upperDescription}`;
    let standardItem = await getStockItemByCode(standardRmCode);
    
    // If standard RM item doesn't exist, create it automatically
    if (!standardItem) {
      console.log(`[mapItemToStockItem] Standard RM not found, creating RM-${upperDescription}`);
      const { data: newItem, error: createError } = await supabase
        .from('stock_items')
        .insert({
          item_code: standardRmCode,
          item_name: upperDescription, // Just the type (e.g., "ICP", "HP") - grade will be added when specific grade is selected
          item_type: 'RM',
          category: 'PP',
          sub_category: upperDescription,
          unit_of_measure: 'KG',
          is_active: true,
        })
        .select()
        .single();
      
      if (!createError && newItem) {
        console.log(`[mapItemToStockItem] Created new stock item: ${newItem.item_code}`);
        return newItem;
      } else {
        console.error(`[mapItemToStockItem] Failed to create stock item:`, createError?.message);
      }
    } else {
      console.log(`[mapItemToStockItem] Found standard RM item: ${standardItem.item_code}`);
      return standardItem;
    }
    
    console.log(`[mapItemToStockItem] Trying sub_category match`);
    // If not found, find any RM with this sub_category
    const { data: rmItems, error: rmItemsError } = await supabase
      .from('stock_items')
      .select('*')
      .eq('item_type', 'RM')
      .eq('sub_category', upperDescription)
      .eq('is_active', true)
      .limit(1);
    
    console.log(`[mapItemToStockItem] Sub-category query result: found=${rmItems?.length || 0}, error=${rmItemsError?.message || 'none'}`);
    
    if (!rmItemsError && rmItems && rmItems.length > 0) {
      console.log(`[mapItemToStockItem] Found RM by sub_category: ${rmItems[0].item_code}`);
      return rmItems[0];
    }
  }
  
  // Try to find RM items where the description might be a grade code
  // Check if description matches a grade pattern (e.g., "HJ333MO" might be in item_code like "PP-HP-HJ333MO")
  const { data: gradeItems, error: gradeError } = await supabase
    .from('stock_items')
    .select('*')
    .eq('item_type', 'RM')
    .eq('is_active', true)
    .or(`item_code.ilike.%${description}%,item_code.eq.${description}`);
  
  if (!gradeError && gradeItems && gradeItems.length > 0) {
    // Prefer exact match first
    const exactMatch = gradeItems.find(item => item.item_code === description);
    if (exactMatch) return exactMatch;
    
    // Then try items ending with the grade (e.g., "PP-HP-HJ333MO")
    const endingMatch = gradeItems.find(item => item.item_code.endsWith(`-${description}`));
    if (endingMatch) return endingMatch;
    
    // Otherwise return first match
    return gradeItems[0];
  }
  
  // Try PM Category match: If description is a PM category, find PM items in that category
  const { data: pmItem, error: pmError } = await supabase
    .from('stock_items')
    .select('*')
    .eq('item_type', 'PM')
    .eq('category', description)
    .eq('is_active', true)
    .limit(1)
    .single();
  
  if (!pmError && pmItem) {
    return pmItem;
  }
  
  // If no exact PM category match, try to find any PM with this category
  const { data: pmItems, error: pmItemsError } = await supabase
    .from('stock_items')
    .select('*')
    .eq('item_type', 'PM')
    .eq('category', description)
    .eq('is_active', true)
    .limit(1);
  
  if (!pmItemsError && pmItems && pmItems.length > 0) {
    return pmItems[0];
  }
  
  return null;
}

/**
 * Create an item mapping
 */
export async function createItemMapping(
  sourceTable: string,
  sourceDescription: string,
  stockItemCode: string
): Promise<StockItemMapping> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stock_item_mappings')
    .insert({
      source_table: sourceTable,
      source_description: sourceDescription,
      stock_item_code: stockItemCode,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    handleSupabaseError(error, 'creating item mapping');
    throw error;
  }
  
  return data;
}

// ============================================================================
// BOM OPERATIONS
// ============================================================================

/**
 * Get SFG BOM by mold name (item_name)
 * This is the critical mapping for DPR posting
 * 
 * Tries multiple matching strategies:
 * 1. Exact match (trimmed)
 * 2. Case-insensitive match
 * 3. Returns null if not found
 */
/**
 * Normalize a product/mold name for comparison
 * - Removes all whitespace
 * - Converts to lowercase
 * - Normalizes dashes (removes all dashes for comparison)
 * This helps match names like "CK-Ro24-38-L" with "CK-Ro-24-38-L"
 */
function normalizeProductName(name: string): string {
  if (!name) return '';
  // Remove all whitespace, convert to lowercase, remove all dashes
  return name.trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
}

export async function getSfgBomByMoldName(
  moldName: string
): Promise<SfgBom | null> {
  const supabase = getSupabase();
  
  // Normalize the input: trim whitespace
  const normalizedName = moldName?.trim() || '';
  if (!normalizedName) {
    return null;
  }
  
  // Try exact match first (trimmed)
  let { data, error } = await supabase
    .from('sfg_bom')
    .select('*')
    .eq('item_name', normalizedName)
    .maybeSingle();
  
  if (data) {
    return data;
  }
  
  // If exact match fails, try case-insensitive match
  // Get all SFG BOMs and find case-insensitive match
  const { data: allBoms, error: allBomsError } = await supabase
    .from('sfg_bom')
    .select('*');
  
  if (!allBomsError && allBoms) {
    // First try case-insensitive exact match
    const caseInsensitiveMatch = allBoms.find(
      bom => bom.item_name?.trim().toLowerCase() === normalizedName.toLowerCase()
    );
    
    if (caseInsensitiveMatch) {
      console.warn(`⚠️ [getSfgBomByMoldName] Case-insensitive match found: "${normalizedName}" matched "${caseInsensitiveMatch.item_name}"`);
      return caseInsensitiveMatch;
    }
    
    // If still no match, try normalized comparison (ignoring dash variations)
    const normalizedInput = normalizeProductName(normalizedName);
    const normalizedMatch = allBoms.find(bom => {
      const normalizedBomName = normalizeProductName(bom.item_name || '');
      return normalizedBomName === normalizedInput && normalizedBomName !== '';
    });
    
    if (normalizedMatch) {
      console.warn(`⚠️ [getSfgBomByMoldName] Normalized match found: "${normalizedName}" matched "${normalizedMatch.item_name}" (dash/format variation)`);
      return normalizedMatch;
    }
  }
  
  // No match found
  return null;
}

/**
 * Get FG BOM by item code
 * Checks fg_bom if item code starts with "2", local_bom if it starts with "3"
 * Trims color suffix (e.g., "-Black") from item code before lookup since BOM master doesn't include colors
 */
export async function getFgBomByItemCode(
  itemCode: string
): Promise<FgBom | null> {
  const supabase = getSupabase();
  
  if (!itemCode) {
    return null;
  }
  
  // Trim color suffix (e.g., "210110101001-Black" -> "210110101001")
  // Color suffix is typically in format "-{Color}" after the base item code
  const baseItemCode = itemCode.includes('-') ? itemCode.split('-')[0] : itemCode;
  
  // Determine which table to check based on item code prefix
  const tableName = baseItemCode.startsWith('2') ? 'fg_bom' : 
                    baseItemCode.startsWith('3') ? 'local_bom' : 
                    'fg_bom'; // Default to fg_bom if no match
  
  // First try exact match (in case some BOMs do have color suffix)
  let { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('item_code', itemCode)
    .maybeSingle();
  
  if (data) {
    return data;
  }
  
  // If exact match fails, try with trimmed color suffix
  if (baseItemCode !== itemCode) {
    ({ data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('item_code', baseItemCode)
      .maybeSingle());
    
    if (data) {
      return data;
    }
  }
  
  if (error && error.code !== 'PGRST116') {
    handleSupabaseError(error, `getting ${tableName}`);
    throw error;
  }
  
  return null;
}

// ============================================================================
// RAW MATERIAL CONSUMPTION (FIFO)
// ============================================================================

/**
 * Get RM items of a specific type at a location
 * Used for FIFO consumption
 */
export async function getRmItemsByType(
  rmType: string,
  locationCode: LocationCode
): Promise<{ item: StockItem; balance: number }[]> {
  const supabase = getSupabase();
  
  // Get stock items matching the RM type
  const { data: items, error: itemsError } = await supabase
    .from('stock_items')
    .select('*')
    .eq('item_type', 'RM')
    .eq('sub_category', rmType)
    .eq('is_active', true);
  
  if (itemsError) {
    handleSupabaseError(itemsError, 'getting RM items by type');
    throw itemsError;
  }
  
  if (!items || items.length === 0) {
    return [];
  }
  
  // Get balances for these items at the location
  const result: { item: StockItem; balance: number }[] = [];
  
  for (const item of items) {
    const balance = await getBalance(item.item_code, locationCode);
    if (balance > 0) {
      result.push({ item, balance });
    }
  }
  
  // Sort: Prioritize specific grade items (PP-HP-HJ333MO) over generic ones (RM-HP)
  // Then by earliest created (FIFO) within each group
  result.sort((a, b) => {
    const aIsGeneric = a.item.item_code.startsWith('RM-');
    const bIsGeneric = b.item.item_code.startsWith('RM-');
    
    // Specific grade items come first
    if (aIsGeneric && !bIsGeneric) return 1;
    if (!aIsGeneric && bIsGeneric) return -1;
    
    // Within same group, sort by earliest created (FIFO)
    const dateA = new Date(a.item.created_at || 0);
    const dateB = new Date(b.item.created_at || 0);
    return dateA.getTime() - dateB.getTime();
  });
  
  return result;
}

/**
 * Consume raw material using FIFO
 * Returns ledger entries created and warnings
 */
export async function consumeRmFifo(
  rmType: string,
  requiredQty: number,
  locationCode: LocationCode,
  transactionDate: string,
  documentType: DocumentType,
  documentId: string,
  documentNumber: string | undefined,
  postedBy: string
): Promise<{ entries: StockLedgerEntry[]; warnings: string[] }> {
  const entries: StockLedgerEntry[] = [];
  const warnings: string[] = [];
  
  let remainingQty = requiredQty;
  
  // Get available RM items of this type (sorted by FIFO)
  const rmItems = await getRmItemsByType(rmType, locationCode);
  
  if (rmItems.length === 0) {
    warnings.push(`No ${rmType} raw material found at ${locationCode}. Stock will go negative.`);
  }
  
  // Try to consume from available items
  for (const { item, balance } of rmItems) {
    if (remainingQty <= 0) break;
    
    const qtyToDeduct = Math.min(balance, remainingQty);
    const currentBalance = await getBalance(item.item_code, locationCode);
    const newBalance = currentBalance - qtyToDeduct;
    
    // Create OUT ledger entry
    const entry = await createLedgerEntry({
      item_id: item.id,
      item_code: item.item_code,
      location_code: locationCode,
      quantity: -qtyToDeduct,
      unit_of_measure: item.unit_of_measure,
      balance_after: newBalance,
      transaction_date: transactionDate,
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      movement_type: 'OUT',
      posted_by: postedBy,
      remarks: `RM Consumption - ${item.item_name || item.item_code} (${roundQuantity(qtyToDeduct)} ${item.unit_of_measure || 'Kgs'}), Type: ${rmType}, Doc: ${documentNumber || documentId}`,
    });
    
    entries.push(entry);
    
    // Update balance
    await updateBalance(
      item.id,
      item.item_code,
      locationCode,
      newBalance,
      item.unit_of_measure
    );
    
    remainingQty -= qtyToDeduct;
  }
  
  // If still remaining, make the first available item go negative
  if (remainingQty > 0) {
    warnings.push(`Insufficient ${rmType} at ${locationCode}. Required: ${requiredQty}, Creating negative balance.`);
    
    // Find or create an RM item of this type to go negative
    let targetItem: StockItem | null = null;
    
    if (rmItems.length > 0) {
      targetItem = rmItems[0].item;
    } else {
      // Try to find any RM of this type
      const supabase = getSupabase();
      const { data } = await supabase
        .from('stock_items')
        .select('*')
        .eq('item_type', 'RM')
        .eq('sub_category', rmType)
        .eq('is_active', true)
        .limit(1)
        .single();
      
      targetItem = data;
    }
    
    if (targetItem) {
      const currentBalance = await getBalance(targetItem.item_code, locationCode);
      const newBalance = currentBalance - remainingQty;
      
      const entry = await createLedgerEntry({
        item_id: targetItem.id,
        item_code: targetItem.item_code,
        location_code: locationCode,
        quantity: -remainingQty,
        unit_of_measure: targetItem.unit_of_measure,
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: documentType,
        document_id: documentId,
        document_number: documentNumber,
        movement_type: 'OUT',
        posted_by: postedBy,
        remarks: `RM Consumption - ${targetItem.item_name || targetItem.item_code} (${roundQuantity(remainingQty)} ${targetItem.unit_of_measure || 'Kgs'}), Type: ${rmType}, Doc: ${documentNumber || documentId} [NEGATIVE BALANCE]`,
      });
      
      entries.push(entry);
      
      await updateBalance(
        targetItem.id,
        targetItem.item_code,
        locationCode,
        newBalance,
        targetItem.unit_of_measure
      );
    } else {
      warnings.push(`Could not find any ${rmType} item to deduct from.`);
    }
  }
  
  return { entries, warnings };
}

// ============================================================================
// DOCUMENT STATUS OPERATIONS
// ============================================================================

/**
 * Update document stock status
 */
export async function updateDocumentStockStatus(
  tableName: string,
  documentId: string,
  status: 'DRAFT' | 'POSTED' | 'CANCELLED',
  postedBy?: string
): Promise<void> {
  const supabase = getSupabase();
  
  const updateData: Record<string, unknown> = {
    stock_status: status,
  };
  
  if (status === 'POSTED' && postedBy) {
    updateData.posted_to_stock_at = new Date().toISOString();
    updateData.posted_to_stock_by = postedBy;
  }
  
  const { error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', documentId);
  
  if (error) {
    handleSupabaseError(error, `updating ${tableName} stock status`);
    throw error;
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that all required components are available for FG Transfer
 * 
 * NOTE: PM materials (carton, polybag, BOPP) are NOT validated - they are allowed to go negative
 * Only SFG items are validated to ensure they are available before posting
 */
export async function validateFgTransferComponents(
  fgCode: string,
  boxes: number
): Promise<{
  isValid: boolean;
  components: {
    itemCode: string;
    itemName: string;
    location: LocationCode;
    required: number;
    available: number;
    unit: UnitOfMeasure;
  }[];
  missingComponents: string[];
}> {
  const components: {
    itemCode: string;
    itemName: string;
    location: LocationCode;
    required: number;
    available: number;
    unit: UnitOfMeasure;
  }[] = [];
  const missingComponents: string[] = [];
  
  // Get FG BOM
  const fgBom = await getFgBomByItemCode(fgCode);
  if (!fgBom) {
    return {
      isValid: false,
      components: [],
      missingComponents: [`FG BOM not found for ${fgCode}`],
    };
  }
  
  // Check SFG 1 (usually container)
  if (fgBom.sfg_1 && fgBom.sfg_1_qty) {
    const required = boxes * fgBom.sfg_1_qty;
    const available = await getBalance(fgBom.sfg_1, 'FG_STORE');
    components.push({
      itemCode: fgBom.sfg_1,
      itemName: `SFG 1: ${fgBom.sfg_1}`,
      location: 'FG_STORE',
      required,
      available,
      unit: 'NOS',
    });
    if (available < required) {
      missingComponents.push(`${fgBom.sfg_1}: Required ${required}, Available ${available}`);
    }
  }
  
  // Check SFG 2 (usually lid)
  if (fgBom.sfg_2 && fgBom.sfg_2_qty) {
    const required = boxes * fgBom.sfg_2_qty;
    const available = await getBalance(fgBom.sfg_2, 'FG_STORE');
    components.push({
      itemCode: fgBom.sfg_2,
      itemName: `SFG 2: ${fgBom.sfg_2}`,
      location: 'FG_STORE',
      required,
      available,
      unit: 'NOS',
    });
    if (available < required) {
      missingComponents.push(`${fgBom.sfg_2}: Required ${required}, Available ${available}`);
    }
  }
  
  // PM materials (carton, polybag, BOPP) are NOT checked - allowed to go negative
  // This allows posting even if PM materials are not available in stock
  // - Carton (fgBom.cnt_code)
  // - Polybag (fgBom.polybag_code)
  // - BOPP 1 (fgBom.bopp_1)
  // - BOPP 2 (fgBom.bopp_2)
  
  return {
    isValid: missingComponents.length === 0,
    components,
    missingComponents,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Round to 4 decimal places
 */
export function roundQuantity(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Format error message with code
 */
export function formatStockError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): { code: string; message: string; details?: Record<string, unknown> } {
  return { code, message, details };
}

