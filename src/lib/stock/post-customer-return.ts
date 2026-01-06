// ============================================================================
// CUSTOMER RETURN STOCK POSTING
// ============================================================================
// Posts Customer Return to stock ledger - adds FG back to FG_STORE
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
  updateDocumentStockStatus,
  roundQuantity,
} from './helpers';

// ============================================================================
// CUSTOMER RETURN POSTING LOGIC
// ============================================================================

/**
 * Post Customer Return to stock ledger
 * 
 * Stock Effect: Adds FG back to FG_STORE
 * 
 * @param returnId - UUID of the customer return to post
 * @param postedBy - Username of the user posting
 * @returns PostingResult with success status and details
 */
export async function postCustomerReturnToStock(
  returnId: string,
  postedBy: string
): Promise<PostingResult> {
  const supabase = getSupabase();
  const warnings: string[] = [];
  
  try {
    // Step 1: Get the Customer Return
    const { data: customerReturn, error: returnError } = await supabase
      .from('customer_returns')
      .select('*')
      .eq('id', returnId)
      .single();
    
    if (returnError || !customerReturn) {
      throw new StockPostingError(
        'DOCUMENT_NOT_FOUND',
        `Customer Return with ID ${returnId} not found`
      );
    }
    
    // Step 2: Check if already posted
    if (customerReturn.status === 'POSTED') {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Customer Return has already been posted to stock'
      );
    }
    
    // Double-check ledger for existing entries
    const alreadyPosted = await isDocumentPosted('CUSTOMER_RETURN', returnId);
    if (alreadyPosted) {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Customer Return has existing ledger entries'
      );
    }
    
    // Step 3: Get Customer Return items
    const { data: items, error: itemsError } = await supabase
      .from('customer_return_items')
      .select('*')
      .eq('return_id', returnId);
    
    if (itemsError) {
      handleSupabaseError(itemsError, 'fetching Customer Return items');
      throw itemsError;
    }
    
    if (!items || items.length === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'Customer Return has no items to post'
      );
    }
    
    // Step 4: Process each item
    let entriesCreated = 0;
    const transactionDate = customerReturn.return_date;
    const documentNumber = customerReturn.return_no;
    
    for (const item of items) {
      // Get stock item by item_code
      const stockItem = await getStockItemByCode(item.item_code);
      
      if (!stockItem) {
        warnings.push(`Stock item not found for code "${item.item_code}". Skipping.`);
        continue;
      }
      
      // Get quantity
      const quantity = item.quantity;
      if (!quantity || quantity <= 0) {
        warnings.push(`Item "${item.item_code}" has no quantity. Skipping.`);
        continue;
      }
      
      // Get current balance at FG_STORE
      const currentBalance = await getBalance(stockItem.item_code, 'FG_STORE');
      const newBalance = roundQuantity(currentBalance + quantity);
      
      // Create IN ledger entry at FG_STORE
      await createLedgerEntry({
        item_id: stockItem.id,
        item_code: stockItem.item_code,
        location_code: 'FG_STORE',
        quantity: roundQuantity(quantity), // Positive for IN
        unit_of_measure: stockItem.unit_of_measure,
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: 'CUSTOMER_RETURN',
        document_id: returnId,
        document_number: documentNumber,
        movement_type: 'IN',
        posted_by: postedBy,
        remarks: `Return from ${customerReturn.party_name || 'Customer'}${customerReturn.reason ? ': ' + customerReturn.reason : ''}`,
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
        'No items could be processed. Please check item codes.'
      );
    }
    
    // Step 5: Update Customer Return status to POSTED
    await updateDocumentStockStatus('customer_returns', returnId, 'POSTED', postedBy);
    
    return {
      success: true,
      document_type: 'CUSTOMER_RETURN',
      document_id: returnId,
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
        document_type: 'CUSTOMER_RETURN',
        document_id: returnId,
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


