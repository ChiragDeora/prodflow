// ============================================================================
// JOB WORK CHALLAN STOCK POSTING
// ============================================================================
// Posts Job Work Challan to stock ledger - removes FG from FG_STORE
// This is used for the final stage of finished goods (FG) stock ledger posting
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
// JOB WORK CHALLAN POSTING LOGIC
// ============================================================================

/**
 * Post Job Work Challan to stock ledger
 * 
 * Stock Effect: Removes FG from FG_STORE
 * 
 * @param challanId - UUID of the job work challan to post
 * @param postedBy - Username of the user posting
 * @returns PostingResult with success status and details
 */
export async function postJobWorkChallanToStock(
  challanId: string,
  postedBy: string
): Promise<PostingResult> {
  const supabase = getSupabase();
  const warnings: string[] = [];
  
  try {
    // Step 1: Get the Job Work Challan
    const { data: challan, error: challanError } = await supabase
      .from('store_job_work_challan')
      .select('*')
      .eq('id', challanId)
      .single();
    
    if (challanError || !challan) {
      throw new StockPostingError(
        'DOCUMENT_NOT_FOUND',
        `Job Work Challan with ID ${challanId} not found`
      );
    }
    
    // Step 2: Check if already posted
    if (challan.stock_status === 'POSTED') {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Job Work Challan has already been posted to stock'
      );
    }
    
    // Double-check ledger for existing entries
    const alreadyPosted = await isDocumentPosted('JOB_WORK_CHALLAN', challanId);
    if (alreadyPosted) {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Job Work Challan has existing ledger entries'
      );
    }
    
    // Step 3: Get Job Work Challan items
    const { data: items, error: itemsError } = await supabase
      .from('store_job_work_challan_items')
      .select('*')
      .eq('challan_id', challanId)
      .order('sr_no', { ascending: true });
    
    if (itemsError) {
      handleSupabaseError(itemsError, 'fetching Job Work Challan items');
      throw itemsError;
    }
    
    if (!items || items.length === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'Job Work Challan has no items to post'
      );
    }
    
    // Step 4: Process each item
    let entriesCreated = 0;
    const transactionDate = challan.date;
    const documentNumber = challan.doc_no || challan.sr_no;
    
    for (const item of items) {
      // Map the item to a stock item
      // Priority: item_code > material_description > mapItemToStockItem
      let stockItem = null;
      
      // First try item_code if available
      if (item.item_code) {
        stockItem = await getStockItemByCode(item.item_code);
      }
      
      // Fallback to material_description if item_code not found
      if (!stockItem && item.material_description) {
        stockItem = await getStockItemByCode(item.material_description);
      }
      
      // Last resort: try mapping
      if (!stockItem && item.material_description) {
        stockItem = await mapItemToStockItem('job_work_challan', item.material_description);
      }
      
      if (!stockItem) {
        const itemIdentifier = item.item_code || item.material_description || 'Unknown';
        warnings.push(`Could not map item "${itemIdentifier}" to stock item. Skipping.`);
        continue;
      }
      
      // Get quantity - use quantityKg (in kg) for posting
      // Convert kg to tons if needed, or use as-is based on unit_of_measure
      const quantity = item.qty; // This is in kg from the form
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
        document_type: 'JOB_WORK_CHALLAN',
        document_id: challanId,
        document_number: documentNumber,
        movement_type: 'OUT',
        posted_by: postedBy,
        remarks: `Job Work Challan to ${challan.party_name || 'Job Worker'}`,
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
    
    // Step 5: Update Job Work Challan status to POSTED
    await updateDocumentStockStatus('store_job_work_challan', challanId, 'POSTED', postedBy);
    
    return {
      success: true,
      document_type: 'JOB_WORK_CHALLAN',
      document_id: challanId,
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
        document_type: 'JOB_WORK_CHALLAN',
        document_id: challanId,
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


