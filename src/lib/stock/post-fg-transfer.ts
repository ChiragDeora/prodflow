// ============================================================================
// FG TRANSFER (FINISHED GOODS TRANSFER NOTE) STOCK POSTING
// ============================================================================
// Posts FG Transfer to stock ledger:
// - Consumes SFG items from FG_STORE
// - Consumes PM items from STORE (boxes, polybags, BOPP)
// - Consumes Labels from STORE (if IML product)
// - Creates FG items in FG_STORE
// 
// IMPORTANT: Partial packing NOT allowed - all components must be available
// ============================================================================

import { getSupabase, handleSupabaseError } from '../supabase/utils';
import type { PostingResult, FgBom } from '../supabase/types/stock';
import { StockPostingError } from '../supabase/types/stock';
import {
  getBalance,
  updateBalance,
  createLedgerEntry,
  isDocumentPosted,
  getFgBomByItemCode,
  getStockItemByCode,
  updateDocumentStockStatus,
  roundQuantity,
} from './helpers';
import { calculateLabelRequirement, IML_CONFIG, isImlProduct } from './config/iml-config';

// ============================================================================
// FG TRANSFER POSTING LOGIC
// ============================================================================

/**
 * Post FG Transfer to stock ledger
 * 
 * Stock Effects:
 * - Removes SFG items from FG_STORE (containers and lids consumed)
 * - Removes PM items from STORE (boxes, polybags, BOPP consumed)
 * - Removes Labels from STORE (if IML product)
 * - Adds FG items to FG_STORE (packed boxes created)
 * 
 * @param fgnId - UUID of the FGN to post
 * @param postedBy - Username of the user posting
 * @returns PostingResult with success status and details
 */
export async function postFgTransferToStock(
  fgnId: string,
  postedBy: string
): Promise<PostingResult> {
  const supabase = getSupabase();
  const warnings: string[] = [];
  
  try {
    // Step 1: Get the FGN
    const { data: fgn, error: fgnError } = await supabase
      .from('store_fgn')
      .select('*')
      .eq('id', fgnId)
      .single();
    
    if (fgnError || !fgn) {
      throw new StockPostingError(
        'DOCUMENT_NOT_FOUND',
        `FG Transfer with ID ${fgnId} not found`
      );
    }
    
    // Step 2: Check if already posted
    if (fgn.stock_status === 'POSTED') {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'FG Transfer has already been posted to stock'
      );
    }
    
    // Double-check ledger for existing entries
    const alreadyPosted = await isDocumentPosted('FG_TRANSFER', fgnId);
    if (alreadyPosted) {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'FG Transfer has existing ledger entries'
      );
    }
    
    // Step 3: Get FGN items
    const { data: items, error: itemsError } = await supabase
      .from('store_fgn_items')
      .select('*')
      .eq('fgn_id', fgnId)
      .order('sr_no', { ascending: true });
    
    if (itemsError) {
      handleSupabaseError(itemsError, 'fetching FGN items');
      throw itemsError;
    }
    
    if (!items || items.length === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'FG Transfer has no items to post'
      );
    }
    
    // Step 4: Validate all components are available BEFORE processing
    const validationResults = await validateAllFgItems(items);
    
    if (!validationResults.isValid) {
      throw new StockPostingError(
        'PARTIAL_NOT_ALLOWED',
        `Cannot complete FG Transfer - missing components:\n${validationResults.errors.join('\n')}`
      );
    }
    
    // Step 5: Process each item
    let entriesCreated = 0;
    const transactionDate = fgn.transfer_date_time 
      ? new Date(fgn.transfer_date_time).toISOString().split('T')[0]
      : fgn.date;
    const documentNumber = fgn.transfer_no || fgn.doc_no;
    
    for (const item of items) {
      const boxes = item.no_of_boxes || 0;
      if (boxes <= 0) {
        warnings.push(`Item "${item.item_name}" has no boxes. Skipping.`);
        continue;
      }
      
      // Get FG BOM - we already validated, so this should exist
      const fgBom = await getFgBomByItemCode(item.item_name);
      if (!fgBom) {
        warnings.push(`No FG BOM found for ${item.item_name}. Skipping.`);
        continue;
      }
      
      // Check if this is an IML product
      const isIml = isImlProduct(item.item_name);
      const qcHold = item.qc_check === 'FAIL' || item.qc_status === 'QC_HOLD';
      
      // 5a: Consume SFG 1 (usually container) from FG_STORE
      if (fgBom.sfg_1 && fgBom.sfg_1_qty) {
        const consumeResult = await consumeComponent(
          fgBom.sfg_1,
          boxes * fgBom.sfg_1_qty,
          'FG_STORE',
          transactionDate,
          fgnId,
          documentNumber,
          postedBy,
          `SFG for ${item.item_name}`
        );
        entriesCreated += consumeResult.entries;
        warnings.push(...consumeResult.warnings);
      }
      
      // 5b: Consume SFG 2 (usually lid) from FG_STORE
      if (fgBom.sfg_2 && fgBom.sfg_2_qty) {
        const consumeResult = await consumeComponent(
          fgBom.sfg_2,
          boxes * fgBom.sfg_2_qty,
          'FG_STORE',
          transactionDate,
          fgnId,
          documentNumber,
          postedBy,
          `SFG for ${item.item_name}`
        );
        entriesCreated += consumeResult.entries;
        warnings.push(...consumeResult.warnings);
      }
      
      // 5c: Consume carton from STORE
      if (fgBom.cnt_code && fgBom.cnt_qty) {
        const consumeResult = await consumeComponent(
          fgBom.cnt_code,
          boxes * fgBom.cnt_qty,
          'STORE',
          transactionDate,
          fgnId,
          documentNumber,
          postedBy,
          `Carton for ${item.item_name}`
        );
        entriesCreated += consumeResult.entries;
        warnings.push(...consumeResult.warnings);
      }
      
      // 5d: Consume polybag from STORE
      if (fgBom.polybag_code && fgBom.poly_qty) {
        const consumeResult = await consumeComponent(
          fgBom.polybag_code,
          boxes * fgBom.poly_qty,
          'STORE',
          transactionDate,
          fgnId,
          documentNumber,
          postedBy,
          `Polybag for ${item.item_name}`
        );
        entriesCreated += consumeResult.entries;
        warnings.push(...consumeResult.warnings);
      }
      
      // 5e: Consume BOPP 1 from STORE
      if (fgBom.bopp_1 && fgBom.qty_meter) {
        const consumeResult = await consumeComponent(
          fgBom.bopp_1,
          boxes * fgBom.qty_meter,
          'STORE',
          transactionDate,
          fgnId,
          documentNumber,
          postedBy,
          `BOPP tape for ${item.item_name}`
        );
        entriesCreated += consumeResult.entries;
        warnings.push(...consumeResult.warnings);
      }
      
      // 5f: Consume BOPP 2 from STORE
      if (fgBom.bopp_2 && fgBom.qty_meter_2) {
        const consumeResult = await consumeComponent(
          fgBom.bopp_2,
          boxes * fgBom.qty_meter_2,
          'STORE',
          transactionDate,
          fgnId,
          documentNumber,
          postedBy,
          `BOPP tape 2 for ${item.item_name}`
        );
        entriesCreated += consumeResult.entries;
        warnings.push(...consumeResult.warnings);
      }
      
      // 5g: Consume labels from STORE (if IML product)
      if (isIml && IML_CONFIG.enabled) {
        const packSize = parseInt(fgBom.pack_size || '0') || 1;
        const labelReq = calculateLabelRequirement(item.item_name, boxes, packSize);
        
        if (labelReq.labelCode && labelReq.labelQty > 0) {
          const consumeResult = await consumeComponent(
            labelReq.labelCode,
            labelReq.labelQty,
            'STORE',
            transactionDate,
            fgnId,
            documentNumber,
            postedBy,
            `Labels for ${item.item_name}`
          );
          entriesCreated += consumeResult.entries;
          warnings.push(...consumeResult.warnings);
        }
      }
      
      // 5h: Create FG in FG_STORE
      const fgItem = await getStockItemByCode(item.item_name);
      if (!fgItem) {
        warnings.push(`FG item ${item.item_name} not found in stock_items. Skipping FG creation.`);
        continue;
      }
      
      const currentBalance = await getBalance(fgItem.item_code, 'FG_STORE');
      const newBalance = roundQuantity(currentBalance + boxes);
      
      const remarks = qcHold 
        ? `Packed FG (QC_HOLD)`
        : `Packed FG`;
      
      await createLedgerEntry({
        item_id: fgItem.id,
        item_code: fgItem.item_code,
        location_code: 'FG_STORE',
        quantity: roundQuantity(boxes),
        unit_of_measure: fgItem.unit_of_measure,
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: 'FG_TRANSFER',
        document_id: fgnId,
        document_number: documentNumber,
        movement_type: 'IN',
        posted_by: postedBy,
        remarks: remarks,
      });
      
      await updateBalance(
        fgItem.id,
        fgItem.item_code,
        'FG_STORE',
        newBalance,
        fgItem.unit_of_measure
      );
      
      entriesCreated++;
    }
    
    if (entriesCreated === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'No stock entries could be created from FG Transfer'
      );
    }
    
    // Step 6: Update FGN status to POSTED
    await updateDocumentStockStatus('store_fgn', fgnId, 'POSTED', postedBy);
    
    return {
      success: true,
      document_type: 'FG_TRANSFER',
      document_id: fgnId,
      document_number: documentNumber,
      entries_created: entriesCreated,
      posted_at: new Date().toISOString(),
      posted_by: postedBy,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
    
  } catch (error) {
    if (error instanceof StockPostingError) {
      return {
        success: false,
        document_type: 'FG_TRANSFER',
        document_id: fgnId,
        entries_created: 0,
        posted_at: new Date().toISOString(),
        posted_by: postedBy,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }
    
    // Re-throw unexpected errors
    throw error;
  }
}

// ============================================================================
// HELPER: VALIDATE ALL FG ITEMS
// ============================================================================

interface FgnItem {
  item_name: string;
  no_of_boxes?: number;
  qc_check?: string;
  qc_status?: string;
}

/**
 * Validates that all components are available for all FG items
 * Returns validation result with any errors
 */
async function validateAllFgItems(
  items: FgnItem[]
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Aggregate component requirements across all items
  const requirements: Map<string, { 
    location: 'STORE' | 'FG_STORE'; 
    required: number; 
    name: string;
  }> = new Map();
  
  for (const item of items) {
    const boxes = item.no_of_boxes || 0;
    if (boxes <= 0) continue;
    
    const fgBom = await getFgBomByItemCode(item.item_name);
    if (!fgBom) {
      errors.push(`No FG BOM found for: ${item.item_name}`);
      continue;
    }
    
    // Add SFG 1 requirement
    if (fgBom.sfg_1 && fgBom.sfg_1_qty) {
      addRequirement(requirements, fgBom.sfg_1, 'FG_STORE', boxes * fgBom.sfg_1_qty, `SFG 1: ${fgBom.sfg_1}`);
    }
    
    // Add SFG 2 requirement
    if (fgBom.sfg_2 && fgBom.sfg_2_qty) {
      addRequirement(requirements, fgBom.sfg_2, 'FG_STORE', boxes * fgBom.sfg_2_qty, `SFG 2: ${fgBom.sfg_2}`);
    }
    
    // Add carton requirement
    if (fgBom.cnt_code && fgBom.cnt_qty) {
      addRequirement(requirements, fgBom.cnt_code, 'STORE', boxes * fgBom.cnt_qty, `Carton: ${fgBom.cnt_code}`);
    }
    
    // Add polybag requirement
    if (fgBom.polybag_code && fgBom.poly_qty) {
      addRequirement(requirements, fgBom.polybag_code, 'STORE', boxes * fgBom.poly_qty, `Polybag: ${fgBom.polybag_code}`);
    }
    
    // Add BOPP 1 requirement
    if (fgBom.bopp_1 && fgBom.qty_meter) {
      addRequirement(requirements, fgBom.bopp_1, 'STORE', boxes * fgBom.qty_meter, `BOPP 1: ${fgBom.bopp_1}`);
    }
    
    // Add BOPP 2 requirement
    if (fgBom.bopp_2 && fgBom.qty_meter_2) {
      addRequirement(requirements, fgBom.bopp_2, 'STORE', boxes * fgBom.qty_meter_2, `BOPP 2: ${fgBom.bopp_2}`);
    }
    
    // Add label requirement (if IML)
    if (isImlProduct(item.item_name) && IML_CONFIG.enabled) {
      const packSize = parseInt(fgBom.pack_size || '0') || 1;
      const labelReq = calculateLabelRequirement(item.item_name, boxes, packSize);
      
      if (labelReq.labelCode && labelReq.labelQty > 0) {
        addRequirement(requirements, labelReq.labelCode, 'STORE', labelReq.labelQty, `Label: ${labelReq.labelCode}`);
      }
    }
  }
  
  // Check availability of all requirements
  for (const [itemCode, req] of requirements) {
    const available = await getBalance(itemCode, req.location);
    
    if (available < req.required) {
      errors.push(`${req.name} at ${req.location}: Required ${req.required}, Available ${available}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper to add/update requirement in map
 */
function addRequirement(
  map: Map<string, { location: 'STORE' | 'FG_STORE'; required: number; name: string }>,
  itemCode: string,
  location: 'STORE' | 'FG_STORE',
  quantity: number,
  name: string
): void {
  const existing = map.get(itemCode);
  if (existing) {
    existing.required += quantity;
  } else {
    map.set(itemCode, { location, required: quantity, name });
  }
}

// ============================================================================
// HELPER: CONSUME COMPONENT
// ============================================================================

/**
 * Consumes a component from stock
 * Creates OUT ledger entry and updates balance
 */
async function consumeComponent(
  itemCode: string,
  quantity: number,
  location: 'STORE' | 'FG_STORE',
  transactionDate: string,
  documentId: string,
  documentNumber: string,
  postedBy: string,
  remarks: string
): Promise<{ entries: number; warnings: string[] }> {
  const warnings: string[] = [];
  
  const stockItem = await getStockItemByCode(itemCode);
  if (!stockItem) {
    warnings.push(`Component ${itemCode} not found in stock_items. Skipping.`);
    return { entries: 0, warnings };
  }
  
  const currentBalance = await getBalance(itemCode, location);
  const newBalance = roundQuantity(currentBalance - quantity);
  
  if (newBalance < 0) {
    warnings.push(`${itemCode} at ${location} will go negative: ${newBalance}`);
  }
  
  await createLedgerEntry({
    item_id: stockItem.id,
    item_code: stockItem.item_code,
    location_code: location,
    quantity: roundQuantity(-quantity), // Negative for OUT
    unit_of_measure: stockItem.unit_of_measure,
    balance_after: newBalance,
    transaction_date: transactionDate,
    document_type: 'FG_TRANSFER',
    document_id: documentId,
    document_number: documentNumber,
    movement_type: 'OUT',
    posted_by: postedBy,
    remarks: remarks,
  });
  
  await updateBalance(
    stockItem.id,
    stockItem.item_code,
    location,
    newBalance,
    stockItem.unit_of_measure
  );
  
  return { entries: 1, warnings };
}

