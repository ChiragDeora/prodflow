// ============================================================================
// STOCK ADJUSTMENT POSTING
// ============================================================================
// Posts Stock Adjustment to ledger - can increase, decrease, or set opening balance
// ============================================================================

import { getSupabase, handleSupabaseError } from '../supabase/utils';
import type { PostingResult, DocumentType, MovementType } from '../supabase/types/stock';
import { StockPostingError } from '../supabase/types/stock';
import {
  getBalance,
  updateBalance,
  createLedgerEntry,
  isDocumentPosted,
  getStockItemByCode,
  updateDocumentStockStatus,
  roundQuantity,
} from './helpers';

// ============================================================================
// STOCK ADJUSTMENT POSTING LOGIC
// ============================================================================

/**
 * Post Stock Adjustment to stock ledger
 * 
 * Stock Effects (based on adjustment_type):
 * - INCREASE: Add stock (creates IN ledger entry)
 * - DECREASE: Remove stock (creates OUT ledger entry)
 * - OPENING: Initial stock when system goes live (creates IN ledger entry)
 * 
 * @param adjustmentId - UUID of the stock adjustment to post
 * @param postedBy - Username of the user posting
 * @returns PostingResult with success status and details
 */
export async function postAdjustmentToStock(
  adjustmentId: string,
  postedBy: string
): Promise<PostingResult> {
  const supabase = getSupabase();
  const warnings: string[] = [];
  
  try {
    // Step 1: Get the Stock Adjustment
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('stock_adjustments')
      .select('*')
      .eq('id', adjustmentId)
      .single();
    
    if (adjustmentError || !adjustment) {
      throw new StockPostingError(
        'DOCUMENT_NOT_FOUND',
        `Stock Adjustment with ID ${adjustmentId} not found`
      );
    }
    
    // Step 2: Check if already posted
    if (adjustment.status === 'POSTED') {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Stock Adjustment has already been posted to stock'
      );
    }
    
    // Determine document type for ledger
    const documentType: DocumentType = adjustment.adjustment_type === 'OPENING' 
      ? 'OPENING_BALANCE' 
      : 'ADJUSTMENT';
    
    // Double-check ledger for existing entries
    const alreadyPosted = await isDocumentPosted(documentType, adjustmentId);
    if (alreadyPosted) {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Stock Adjustment has existing ledger entries'
      );
    }
    
    // Step 3: Get Stock Adjustment items
    const { data: items, error: itemsError } = await supabase
      .from('stock_adjustment_items')
      .select('*')
      .eq('adjustment_id', adjustmentId);
    
    if (itemsError) {
      handleSupabaseError(itemsError, 'fetching Stock Adjustment items');
      throw itemsError;
    }
    
    if (!items || items.length === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'Stock Adjustment has no items to post'
      );
    }
    
    // Step 4: Process each item
    let entriesCreated = 0;
    const transactionDate = adjustment.adjustment_date;
    const documentNumber = adjustment.adjustment_no;
    
    // Determine movement type and quantity sign based on adjustment_type
    let movementType: MovementType;
    let quantityMultiplier: number;
    
    switch (adjustment.adjustment_type) {
      case 'INCREASE':
      case 'OPENING':
        movementType = 'IN';
        quantityMultiplier = 1;
        break;
      case 'DECREASE':
        movementType = 'OUT';
        quantityMultiplier = -1;
        break;
      default:
        throw new StockPostingError(
          'VALIDATION_ERROR',
          `Invalid adjustment type: ${adjustment.adjustment_type}`
        );
    }
    
    for (const item of items) {
      // Get stock item by item_code
      const stockItem = await getStockItemByCode(item.item_code);
      
      if (!stockItem) {
        warnings.push(`Stock item not found for code "${item.item_code}". Skipping.`);
        continue;
      }
      
      // Validate location_code
      const locationCode = item.location_code;
      if (!['STORE', 'PRODUCTION', 'FG_STORE'].includes(locationCode)) {
        warnings.push(`Invalid location "${locationCode}" for item "${item.item_code}". Skipping.`);
        continue;
      }
      
      // Get quantity (always positive in the table)
      const quantity = item.quantity;
      if (!quantity || quantity <= 0) {
        warnings.push(`Item "${item.item_code}" has no quantity. Skipping.`);
        continue;
      }
      
      // Get current balance at specified location
      const currentBalance = await getBalance(stockItem.item_code, locationCode);
      
      // Calculate new balance
      const newBalance = roundQuantity(currentBalance + (quantity * quantityMultiplier));
      
      // For DECREASE, check if balance will go negative
      if (adjustment.adjustment_type === 'DECREASE' && newBalance < 0) {
        warnings.push(
          `${stockItem.item_code} at ${locationCode} will go negative: ${newBalance}`
        );
      }
      
      // Create ledger entry
      await createLedgerEntry({
        item_id: stockItem.id,
        item_code: stockItem.item_code,
        location_code: locationCode,
        quantity: roundQuantity(quantity * quantityMultiplier),
        unit_of_measure: stockItem.unit_of_measure,
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: documentType,
        document_id: adjustmentId,
        document_number: documentNumber,
        movement_type: movementType,
        posted_by: postedBy,
        remarks: buildRemarks(adjustment.adjustment_type, adjustment.reason, item.remarks),
      });
      
      // Update balance cache
      await updateBalance(
        stockItem.id,
        stockItem.item_code,
        locationCode,
        newBalance,
        stockItem.unit_of_measure
      );
      
      entriesCreated++;
    }
    
    if (entriesCreated === 0) {
      throw new StockPostingError(
        'MAPPING_FAILED',
        'No items could be processed. Please check item codes.'
      );
    }
    
    // Step 5: Update Stock Adjustment status to POSTED
    await updateDocumentStockStatus('stock_adjustments', adjustmentId, 'POSTED', postedBy);
    
    return {
      success: true,
      document_type: documentType,
      document_id: adjustmentId,
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
        document_type: 'ADJUSTMENT',
        document_id: adjustmentId,
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

/**
 * Helper to build remarks string
 */
function buildRemarks(
  adjustmentType: string,
  headerReason?: string,
  itemRemark?: string
): string {
  const parts: string[] = [];
  
  switch (adjustmentType) {
    case 'INCREASE':
      parts.push('Stock Increase');
      break;
    case 'DECREASE':
      parts.push('Stock Decrease');
      break;
    case 'OPENING':
      parts.push('Opening Balance');
      break;
  }
  
  if (headerReason) {
    parts.push(headerReason);
  }
  
  if (itemRemark) {
    parts.push(itemRemark);
  }
  
  return parts.join(' - ');
}


