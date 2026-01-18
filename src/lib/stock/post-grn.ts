// ============================================================================
// GRN (GOODS RECEIPT NOTE) STOCK POSTING
// ============================================================================
// Posts GRN to stock ledger - adds items to STORE location
// ============================================================================

import { getSupabase, handleSupabaseError } from '../supabase/utils';
import type { PostingResult } from '../supabase/types/stock';
import { StockPostingError } from '../supabase/types/stock';
import {
  getBalance,
  updateBalance,
  createLedgerEntry,
  isDocumentPosted,
  mapItemToStockItem,
  updateDocumentStockStatus,
  roundQuantity,
} from './helpers';

// ============================================================================
// GRN POSTING LOGIC
// ============================================================================

/**
 * Post GRN to stock ledger
 * 
 * Stock Effect: Adds items to STORE location
 * 
 * @param grnId - UUID of the GRN to post
 * @param postedBy - Username of the user posting
 * @returns PostingResult with success status and details
 */
export async function postGrnToStock(
  grnId: string,
  postedBy: string
): Promise<PostingResult> {
  const supabase = getSupabase();
  const warnings: string[] = [];
  
  try {
    // Step 1: Get the GRN
    const { data: grn, error: grnError } = await supabase
      .from('store_grn')
      .select('*')
      .eq('id', grnId)
      .single();
    
    if (grnError || !grn) {
      throw new StockPostingError(
        'DOCUMENT_NOT_FOUND',
        `GRN with ID ${grnId} not found`
      );
    }
    
    // Step 2: Check if already posted
    if (grn.stock_status === 'POSTED') {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'GRN has already been posted to stock'
      );
    }
    
    // Double-check ledger for existing entries
    const alreadyPosted = await isDocumentPosted('GRN', grnId);
    if (alreadyPosted) {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'GRN has existing ledger entries'
      );
    }
    
    // Step 3: Get GRN items
    const { data: items, error: itemsError } = await supabase
      .from('store_grn_items')
      .select('*')
      .eq('grn_id', grnId)
      .order('sr_no', { ascending: true });
    
    if (itemsError) {
      handleSupabaseError(itemsError, 'fetching GRN items');
      throw itemsError;
    }
    
    if (!items || items.length === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'GRN has no items to post'
      );
    }
    
    // Step 4: Process each item
    let entriesCreated = 0;
    const transactionDate = grn.grn_date || grn.date;
    const documentNumber = grn.grn_no || grn.doc_no;
    
    for (const item of items) {
      // Map the item description to a stock item
      const stockItem = await mapItemToStockItem('grn', item.item_description);
      
      if (!stockItem) {
        warnings.push(`Could not map item "${item.item_description}" to stock item. Skipping.`);
        continue;
      }
      
      // Get quantity - use total_qty from GRN items
      const quantity = item.total_qty;
      if (!quantity || quantity <= 0) {
        warnings.push(`Item "${item.item_description}" has no quantity. Skipping.`);
        continue;
      }
      
      // Get current balance at STORE
      const currentBalance = await getBalance(stockItem.item_code, 'STORE');
      const newBalance = roundQuantity(currentBalance + quantity);
      
      // Create ledger entry - IN at STORE
      await createLedgerEntry({
        item_id: stockItem.id,
        item_code: stockItem.item_code,
        location_code: 'STORE',
        quantity: roundQuantity(quantity),
        unit_of_measure: stockItem.unit_of_measure,
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: 'GRN',
        document_id: grnId,
        document_number: documentNumber,
        movement_type: 'IN',
        posted_by: postedBy,
        remarks: `GRN from ${grn.supplier_name || 'Supplier'} - ${stockItem.item_name || stockItem.item_code} (${roundQuantity(quantity)} ${stockItem.unit_of_measure || 'units'})${grn.po_no ? `, PO: ${grn.po_no}` : ''}${grn.invoice_no ? `, Inv: ${grn.invoice_no}` : ''}`,
      });
      
      // Update balance cache
      await updateBalance(
        stockItem.id,
        stockItem.item_code,
        'STORE',
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
    
    // Step 5: Update GRN status to POSTED
    await updateDocumentStockStatus('store_grn', grnId, 'POSTED', postedBy);
    
    return {
      success: true,
      document_type: 'GRN',
      document_id: grnId,
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
        document_type: 'GRN',
        document_id: grnId,
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


