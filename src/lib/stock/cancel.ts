// ============================================================================
// STOCK CANCELLATION LOGIC
// ============================================================================
// Handles cancellation of posted documents by creating reversal entries
// ============================================================================

import { getSupabase, handleSupabaseError } from '../supabase/utils';
import type { 
  CancellationResult, 
  DocumentType, 
  MovementType,
  StockLedgerEntry,
} from '../supabase/types/stock';
import { StockPostingError } from '../supabase/types/stock';
import {
  getBalance,
  updateBalance,
  createLedgerEntry,
  getLedgerEntriesForDocument,
  getStockItemById,
  updateDocumentStockStatus,
  roundQuantity,
} from './helpers';

// ============================================================================
// DOCUMENT TYPE TO TABLE MAPPING
// ============================================================================

const DOCUMENT_TABLE_MAPPING: Record<string, string> = {
  'GRN': 'store_grn',
  'JW_GRN': 'store_jw_annexure_grn',
  'MIS': 'store_mis',
  'DPR': 'dpr_data',
  'FG_TRANSFER': 'store_fgn',
  'DISPATCH': 'dispatch_delivery_challan',
  'CUSTOMER_RETURN': 'customer_returns',
  'ADJUSTMENT': 'stock_adjustments',
  'OPENING_BALANCE': 'stock_adjustments',
};

// ============================================================================
// CANCELLATION LOGIC
// ============================================================================

/**
 * Cancel a posted document by creating reversal entries
 * 
 * Process:
 * 1. Find all ledger entries for this document
 * 2. If no entries found, return error
 * 3. For each entry, create a reversal entry with opposite quantity
 * 4. Update document status to CANCELLED
 * 
 * @param documentType - Type of document to cancel
 * @param documentId - UUID of the document
 * @param cancelledBy - Username of the user cancelling
 * @returns CancellationResult with success status and details
 */
export async function cancelStockPosting(
  documentType: DocumentType,
  documentId: string,
  cancelledBy: string
): Promise<CancellationResult> {
  const supabase = getSupabase();
  
  try {
    // Step 1: Get all ledger entries for this document
    const entries = await getLedgerEntriesForDocument(documentType, documentId);
    
    if (entries.length === 0) {
      throw new StockPostingError(
        'NO_ENTRIES_FOUND',
        'Document was not posted to stock - no ledger entries found'
      );
    }
    
    // Step 2: Get the cancel document type
    const cancelDocType = getCancelDocumentType(documentType);
    
    // Step 3: Process each entry and create reversal
    let entriesReversed = 0;
    const transactionDate = new Date().toISOString().split('T')[0];
    
    for (const entry of entries) {
      // Get the stock item
      const stockItem = await getStockItemById(entry.item_id);
      if (!stockItem) {
        console.warn(`Stock item ${entry.item_id} not found during cancellation`);
        continue;
      }
      
      // Calculate reversal quantity (opposite sign)
      const reversalQuantity = roundQuantity(-entry.quantity);
      
      // Get current balance
      const currentBalance = await getBalance(entry.item_code, entry.location_code);
      
      // Calculate new balance after reversal
      const newBalance = roundQuantity(currentBalance + reversalQuantity);
      
      // Determine reversed movement type (opposite of original)
      const reversedMovementType: MovementType = entry.movement_type === 'IN' ? 'OUT' : 'IN';
      
      // Create reversal ledger entry
      await createLedgerEntry({
        item_id: entry.item_id,
        item_code: entry.item_code,
        location_code: entry.location_code,
        quantity: reversalQuantity,
        unit_of_measure: entry.unit_of_measure,
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: cancelDocType,
        document_id: documentId,
        document_number: entry.document_number ? `${entry.document_number}-CANCEL` : undefined,
        movement_type: reversedMovementType,
        counterpart_location: entry.counterpart_location,
        posted_by: cancelledBy,
        remarks: `Reversal of ${documentType} #${entry.document_number || documentId}`,
      });
      
      // Update balance cache
      await updateBalance(
        entry.item_id,
        entry.item_code,
        entry.location_code,
        newBalance,
        entry.unit_of_measure
      );
      
      entriesReversed++;
    }
    
    // Step 4: Update document status to CANCELLED
    const tableName = DOCUMENT_TABLE_MAPPING[documentType];
    if (tableName) {
      try {
        await updateDocumentStockStatus(tableName, documentId, 'CANCELLED', cancelledBy);
      } catch (err) {
        console.warn(`Could not update document status for ${tableName}:`, err);
        // Continue even if status update fails - ledger entries are already reversed
      }
    }
    
    return {
      success: true,
      document_type: documentType,
      document_id: documentId,
      entries_reversed: entriesReversed,
      cancelled_at: new Date().toISOString(),
      cancelled_by: cancelledBy,
    };
    
  } catch (error) {
    if (error instanceof StockPostingError) {
      return {
        success: false,
        document_type: documentType,
        document_id: documentId,
        entries_reversed: 0,
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
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
 * Get the cancellation document type
 */
function getCancelDocumentType(documentType: DocumentType): DocumentType {
  switch (documentType) {
    case 'GRN':
      return 'GRN_CANCEL';
    case 'JW_GRN':
      return 'JW_GRN_CANCEL';
    case 'MIS':
      return 'MIS_CANCEL';
    case 'DPR':
      return 'DPR_CANCEL';
    case 'FG_TRANSFER':
      return 'FG_TRANSFER_CANCEL';
    case 'DISPATCH':
      return 'DISPATCH_CANCEL';
    case 'CUSTOMER_RETURN':
      return 'CUSTOMER_RETURN_CANCEL';
    case 'ADJUSTMENT':
      return 'ADJUSTMENT_CANCEL';
    case 'OPENING_BALANCE':
      return 'OPENING_BALANCE_CANCEL';
    default:
      return `${documentType}_CANCEL` as DocumentType;
  }
}

/**
 * Check if a document can be cancelled
 * (i.e., has been posted to stock)
 */
export async function canCancelDocument(
  documentType: DocumentType,
  documentId: string
): Promise<{ canCancel: boolean; reason?: string }> {
  const entries = await getLedgerEntriesForDocument(documentType, documentId);
  
  if (entries.length === 0) {
    return {
      canCancel: false,
      reason: 'Document has not been posted to stock',
    };
  }
  
  // Check if already cancelled
  const cancelDocType = getCancelDocumentType(documentType);
  const cancelEntries = await getLedgerEntriesForDocument(cancelDocType, documentId);
  
  if (cancelEntries.length > 0) {
    return {
      canCancel: false,
      reason: 'Document has already been cancelled',
    };
  }
  
  return { canCancel: true };
}


