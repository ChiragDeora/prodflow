// ============================================================================
// ISSUE SLIP (MATERIAL ISSUE SLIP) STOCK POSTING
// ============================================================================
// Posts Issue Slip to stock ledger:
// - Removes items from STORE location (OUT movement)
// - Adds items to PRODUCTION location (IN movement)
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
// ISSUE SLIP POSTING LOGIC
// ============================================================================

/**
 * Post Issue Slip to stock ledger
 * 
 * Stock Effect:
 * - Removes items from STORE location (OUT)
 * - Adds items to PRODUCTION location (IN)
 * 
 * @param misId - UUID of the Issue Slip to post
 * @param postedBy - Username of the user posting
 * @returns PostingResult with success status and details
 */
export async function postMisToStock(
  misId: string,
  postedBy: string
): Promise<PostingResult> {
  const supabase = getSupabase();
  const warnings: string[] = [];
  
  try {
    // Step 1: Get the Issue Slip
    const { data: mis, error: misError } = await supabase
      .from('store_mis')
      .select('*')
      .eq('id', misId)
      .single();
    
    if (misError || !mis) {
      throw new StockPostingError(
        'DOCUMENT_NOT_FOUND',
        `Issue Slip with ID ${misId} not found`
      );
    }
    
    // Step 2: Check if already posted
    if (mis.stock_status === 'POSTED') {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Issue Slip has already been posted to stock'
      );
    }
    
    // Double-check ledger for existing entries
    const alreadyPosted = await isDocumentPosted('MIS', misId);
    if (alreadyPosted) {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'Issue Slip has existing ledger entries'
      );
    }
    
    // Step 3: Get Issue Slip items
    const { data: items, error: itemsError } = await supabase
      .from('store_mis_items')
      .select('*')
      .eq('mis_id', misId)
      .order('sr_no', { ascending: true });
    
    if (itemsError) {
      handleSupabaseError(itemsError, 'fetching Issue Slip items');
      throw itemsError;
    }
    
    if (!items || items.length === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'Issue Slip has no items to post'
      );
    }
    
    // Step 4: Process each item
    let entriesCreated = 0;
    const transactionDate = mis.issue_date || mis.date;
    const documentNumber = mis.issue_no || mis.doc_no;
    
    for (const item of items) {
      // Map the item description to a stock item
      const stockItem = await mapItemToStockItem('mis', item.description_of_material);
      
      if (!stockItem) {
        warnings.push(`Could not map item "${item.description_of_material}" to stock item. Skipping.`);
        continue;
      }
      
      // Get quantity - use issue_qty from MIS items
      const quantity = item.issue_qty;
      if (!quantity || quantity <= 0) {
        warnings.push(`Item "${item.description_of_material}" has no issue quantity. Skipping.`);
        continue;
      }
      
      // Extract grade from remarks if present (format: "Grade: {grade}" or "grade: {grade}")
      let grade: string | undefined;
      if (item.remarks) {
        const gradeMatch = item.remarks.match(/grade:\s*([^|]+)/i);
        if (gradeMatch) {
          grade = gradeMatch[1].trim();
        }
      }
      
      // Get current balance at STORE
      const storeBalance = await getBalance(stockItem.item_code, 'STORE');
      
      // Check if balance is sufficient - log warning if not, but continue (negative allowed)
      if (storeBalance < quantity) {
        warnings.push(
          `Insufficient ${stockItem.item_code} at STORE. Available: ${storeBalance}, Required: ${quantity}. Stock will go negative.`
        );
      }
      
      // Calculate new STORE balance (OUT)
      const newStoreBalance = roundQuantity(storeBalance - quantity);
      
      // Build remarks with grade for RM items
      const remarksParts: string[] = [];
      remarksParts.push(`Issue to ${mis.dept_name || 'Production'} - ${stockItem.item_name || stockItem.item_code} (${roundQuantity(quantity)} ${stockItem.unit_of_measure || 'units'})`);
      if (grade) {
        remarksParts.push(`Grade: ${grade}`);
      }
      if (mis.issued_to) {
        remarksParts.push(`Issued to: ${mis.issued_to}`);
      }
      if (mis.purpose) {
        remarksParts.push(`Purpose: ${mis.purpose}`);
      }
      
      // Create OUT ledger entry at STORE
      await createLedgerEntry({
        item_id: stockItem.id,
        item_code: stockItem.item_code,
        location_code: 'STORE',
        quantity: roundQuantity(-quantity), // Negative for OUT
        unit_of_measure: stockItem.unit_of_measure,
        balance_after: newStoreBalance,
        transaction_date: transactionDate,
        document_type: 'MIS',
        document_id: misId,
        document_number: documentNumber,
        movement_type: 'OUT',
        counterpart_location: 'PRODUCTION',
        posted_by: postedBy,
        remarks: remarksParts.join(' | '),
      });
      
      // Update STORE balance cache
      await updateBalance(
        stockItem.id,
        stockItem.item_code,
        'STORE',
        newStoreBalance,
        stockItem.unit_of_measure
      );
      
      // Get current balance at PRODUCTION
      const productionBalance = await getBalance(stockItem.item_code, 'PRODUCTION');
      const newProductionBalance = roundQuantity(productionBalance + quantity);
      
      // Build remarks for IN entry with grade
      const inRemarksParts: string[] = [];
      inRemarksParts.push(`Received from STORE - ${stockItem.item_name || stockItem.item_code} (${roundQuantity(quantity)} ${stockItem.unit_of_measure || 'units'}) for ${mis.dept_name || 'Production'}`);
      if (grade) {
        inRemarksParts.push(`Grade: ${grade}`);
      }
      if (mis.issued_to) {
        inRemarksParts.push(`Issued to: ${mis.issued_to}`);
      }
      
      // Create IN ledger entry at PRODUCTION
      await createLedgerEntry({
        item_id: stockItem.id,
        item_code: stockItem.item_code,
        location_code: 'PRODUCTION',
        quantity: roundQuantity(quantity), // Positive for IN
        unit_of_measure: stockItem.unit_of_measure,
        balance_after: newProductionBalance,
        transaction_date: transactionDate,
        document_type: 'MIS',
        document_id: misId,
        document_number: documentNumber,
        movement_type: 'IN',
        counterpart_location: 'STORE',
        posted_by: postedBy,
        remarks: inRemarksParts.join(' | '),
      });
      
      // Update PRODUCTION balance cache
      await updateBalance(
        stockItem.id,
        stockItem.item_code,
        'PRODUCTION',
        newProductionBalance,
        stockItem.unit_of_measure
      );
      
      // Count as 2 entries (OUT and IN)
      entriesCreated += 2;
    }
    
    if (entriesCreated === 0) {
      throw new StockPostingError(
        'MAPPING_FAILED',
        'No items could be mapped to stock items. Please check item mappings.'
      );
    }
    
    // Step 5: Update Issue Slip status to POSTED
    await updateDocumentStockStatus('store_mis', misId, 'POSTED', postedBy);
    
    return {
      success: true,
      document_type: 'MIS',
      document_id: misId,
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
        document_type: 'MIS',
        document_id: misId,
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


