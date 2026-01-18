// ============================================================================
// DISPATCH (DELIVERY CHALLAN) STOCK POSTING
// ============================================================================
// Posts Dispatch to stock ledger - removes FG from FG_STORE
// ============================================================================

import { getSupabase, handleSupabaseError } from '../supabase/utils';
import type { PostingResult } from '../supabase/types/stock';
import { StockPostingError } from '../supabase/types/stock';
import {
  getBalance,
  updateBalance,
  createLedgerEntry,
  isDocumentPosted,
  getStockItemByCode,
  mapItemToStockItem,
  updateDocumentStockStatus,
  roundQuantity,
} from './helpers';

// ============================================================================
// DISPATCH POSTING LOGIC
// ============================================================================

/**
 * Post Dispatch to stock ledger
 * 
 * Stock Effect: Removes FG from FG_STORE
 * 
 * @param dispatchId - UUID of the dispatch (delivery challan) to post
 * @param postedBy - Username of the user posting
 * @returns PostingResult with success status and details
 */
export async function postDispatchToStock(
  dispatchId: string,
  postedBy: string
): Promise<PostingResult> {
  const supabase = getSupabase();
  const warnings: string[] = [];
  
  try {
    // Step 1: Get the Dispatch (Delivery Challan)
    const { data: dispatch, error: dispatchError } = await supabase
      .from('dispatch_delivery_challan')
      .select('*')
      .eq('id', dispatchId)
      .single();
    
    if (dispatchError || !dispatch) {
      throw new StockPostingError(
        'DOCUMENT_NOT_FOUND',
        `Dispatch with ID ${dispatchId} not found`
      );
    }
    
    // Step 2: Check if already posted
    if (dispatch.stock_status === 'POSTED') {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Dispatch has already been posted to stock'
      );
    }
    
    // Double-check ledger for existing entries
    const alreadyPosted = await isDocumentPosted('DISPATCH', dispatchId);
    if (alreadyPosted) {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Dispatch has existing ledger entries'
      );
    }
    
    // Step 3: Get Dispatch items
    const { data: items, error: itemsError } = await supabase
      .from('dispatch_delivery_challan_items')
      .select('*')
      .eq('challan_id', dispatchId)
      .order('sr_no', { ascending: true });
    
    if (itemsError) {
      handleSupabaseError(itemsError, 'fetching Dispatch items');
      throw itemsError;
    }
    
    if (!items || items.length === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'Dispatch has no items to post'
      );
    }
    
    // Step 4: Process each item
    let entriesCreated = 0;
    const transactionDate = dispatch.date;
    const documentNumber = dispatch.sr_no || dispatch.doc_no;
    
    for (const item of items) {
      // Map the item description to a stock item
      // Try material_description first, then try direct match
      let stockItem = await getStockItemByCode(item.material_description);
      
      if (!stockItem) {
        stockItem = await mapItemToStockItem('dispatch', item.material_description);
      }
      
      if (!stockItem) {
        warnings.push(`Could not map item "${item.material_description}" to stock item. Skipping.`);
        continue;
      }
      
      // Get quantity - qty is in boxes (not pieces)
      const quantity = item.qty;
      if (!quantity || quantity <= 0) {
        warnings.push(`Item "${item.material_description}" has no quantity. Skipping.`);
        continue;
      }
      
      // Get current balance at FG_STORE
      const currentBalance = await getBalance(stockItem.item_code, 'FG_STORE');
      
      // Check if balance is sufficient - log warning if not, but continue (negative allowed)
      if (currentBalance < quantity) {
        warnings.push(
          `Insufficient ${stockItem.item_code} at FG_STORE. Available: ${currentBalance}, Required: ${quantity}. Stock will go negative.`
        );
      }
      
      // Calculate new balance (OUT)
      const newBalance = roundQuantity(currentBalance - quantity);
      
      // Create OUT ledger entry at FG_STORE
      await createLedgerEntry({
        item_id: stockItem.id,
        item_code: stockItem.item_code,
        location_code: 'FG_STORE',
        quantity: roundQuantity(-quantity), // Negative for OUT
        unit_of_measure: stockItem.unit_of_measure,
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: 'DISPATCH',
        document_id: dispatchId,
        document_number: documentNumber,
        movement_type: 'OUT',
        posted_by: postedBy,
        remarks: `Dispatch - ${stockItem.item_name || stockItem.item_code} (${roundQuantity(quantity)} ${stockItem.unit_of_measure || 'units'}) to ${dispatch.party_name || dispatch.to_address || 'Customer'}${dispatch.vehicle_no ? `, Vehicle: ${dispatch.vehicle_no}` : ''}${dispatch.lr_no ? `, LR: ${dispatch.lr_no}` : ''}`,
      });
      
      // Update balance cache
      await updateBalance(
        stockItem.id,
        stockItem.item_code,
        'FG_STORE',
        newBalance,
        stockItem.unit_of_measure
      );
      
      entriesCreated++;
    }
    
    if (entriesCreated === 0) {
      throw new StockPostingError(
        'MAPPING_FAILED',
        'No items could be mapped to stock items. Please check item mappings.'
      );
    }
    
    // Step 5: Update Dispatch status to POSTED
    await updateDocumentStockStatus('dispatch_delivery_challan', dispatchId, 'POSTED', postedBy);
    
    return {
      success: true,
      document_type: 'DISPATCH',
      document_id: dispatchId,
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
        document_type: 'DISPATCH',
        document_id: dispatchId,
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


