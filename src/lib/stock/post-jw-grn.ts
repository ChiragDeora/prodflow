// ============================================================================
// JW GRN (JOB WORK ANNEXURE GRN) STOCK POSTING
// ============================================================================
// Posts JW GRN to stock ledger - adds items to STORE location
// Same logic as GRN, just uses different source tables
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
// JW GRN POSTING LOGIC
// ============================================================================

/**
 * Post JW GRN to stock ledger
 * 
 * Stock Effect: Adds items to STORE location
 * 
 * @param jwGrnId - UUID of the JW GRN to post
 * @param postedBy - Username of the user posting
 * @returns PostingResult with success status and details
 */
export async function postJwGrnToStock(
  jwGrnId: string,
  postedBy: string
): Promise<PostingResult> {
  const supabase = getSupabase();
  const warnings: string[] = [];
  
  try {
    // Step 1: Get the JW GRN
    const { data: jwGrn, error: jwGrnError } = await supabase
      .from('store_jw_annexure_grn')
      .select('*')
      .eq('id', jwGrnId)
      .single();
    
    if (jwGrnError || !jwGrn) {
      throw new StockPostingError(
        'DOCUMENT_NOT_FOUND',
        `JW GRN with ID ${jwGrnId} not found`
      );
    }
    
    // Step 2: Check if already posted
    if (jwGrn.stock_status === 'POSTED') {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'JW GRN has already been posted to stock'
      );
    }
    
    // Double-check ledger for existing entries
    const alreadyPosted = await isDocumentPosted('JW_GRN', jwGrnId);
    if (alreadyPosted) {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'JW GRN has existing ledger entries'
      );
    }
    
    // Step 3: Get JW GRN items
    const { data: items, error: itemsError } = await supabase
      .from('store_jw_annexure_grn_items')
      .select('*')
      .eq('jw_annexure_grn_id', jwGrnId)
      .order('sr_no', { ascending: true });
    
    if (itemsError) {
      handleSupabaseError(itemsError, 'fetching JW GRN items');
      throw itemsError;
    }
    
    if (!items || items.length === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'JW GRN has no items to post'
      );
    }
    
    // Step 4: Process each item
    let entriesCreated = 0;
    const transactionDate = jwGrn.date;
    // Use doc_no as primary document number (proper format like 40025260001)
    // Include jw_no in remarks if available
    const documentNumber = jwGrn.doc_no || jwGrn.jw_no;
    
    // Debug: Check if stock_items table has any items
    const { count: stockItemsCount, error: countError } = await supabase
      .from('stock_items')
      .select('*', { count: 'exact', head: true });
    
    console.log(`[JW GRN Stock] Stock items table has ${stockItemsCount || 0} items (error: ${countError?.message || 'none'})`);
    
    // Debug: List some RM items
    const { data: sampleRmItems } = await supabase
      .from('stock_items')
      .select('item_code, item_name, item_type, sub_category')
      .eq('item_type', 'RM')
      .limit(5);
    
    console.log(`[JW GRN Stock] Sample RM items:`, sampleRmItems);
    
    for (const item of items) {
      const itemDescription = item.item_code || item.item_name || 'Unknown';
      
      // Map the item - try item_code first, then item_name
      // This handles cases where:
      // - Item Name = "HP" (RM Type) -> maps to RM with sub_category = "HP"
      // - Item Code = "HJ333MO" (grade) -> maps to stock item with that code
      // - Item Name = PM category -> maps to PM items
      let stockItem = null;
      
      console.log(`[JW GRN Stock] Mapping item: code="${item.item_code}", name="${item.item_name}"`);
      
      // First try item_code if available
      if (item.item_code) {
        stockItem = await mapItemToStockItem('jw_grn', item.item_code);
        if (stockItem) {
          console.log(`[JW GRN Stock] Mapped by item_code to: ${stockItem.item_code}`);
        }
      }
      
      // If item_code didn't work, try item_name (for RM Types like "HP" or PM categories)
      if (!stockItem && item.item_name) {
        stockItem = await mapItemToStockItem('jw_grn', item.item_name);
        if (stockItem) {
          console.log(`[JW GRN Stock] Mapped by item_name to: ${stockItem.item_code}`);
        }
      }
      
      if (!stockItem) {
        console.warn(`[JW GRN Stock] Failed to map item "${itemDescription}"`);
        warnings.push(`Could not map item "${itemDescription}" to stock item. Skipping.`);
        continue;
      }
      
      // Get quantity - use rcd_qty (received quantity) from JW GRN items
      const quantity = item.rcd_qty;
      if (!quantity || quantity <= 0) {
        warnings.push(`Item "${itemDescription}" has no received quantity. Skipping.`);
        continue;
      }
      
      // Get current balance at STORE
      const currentBalance = await getBalance(stockItem.item_code, 'STORE');
      const newBalance = roundQuantity(currentBalance + quantity);
      
      // Build detailed remarks including material info, doc_no, JW No, and party
      const remarksParts: string[] = [];
      remarksParts.push(`JW GRN from ${jwGrn.party_name || 'Job Worker'}`);
      // Always include doc_no if available for display purposes
      if (jwGrn.doc_no) {
        remarksParts.push(`Doc No: ${jwGrn.doc_no}`);
      }
      if (jwGrn.jw_no && jwGrn.jw_no !== documentNumber) {
        remarksParts.push(`JW No: ${jwGrn.jw_no}`);
      }
      if (item.item_name && item.item_name !== stockItem.item_code) {
        remarksParts.push(`Material: ${item.item_name}`);
      }
      if (item.item_code && item.item_code !== item.item_name && item.item_code !== stockItem.item_code) {
        remarksParts.push(`Grade: ${item.item_code}`);
      }
      if (jwGrn.indent_no) {
        remarksParts.push(`Indent: ${jwGrn.indent_no}`);
      }
      
      // Create ledger entry - IN at STORE
      await createLedgerEntry({
        item_id: stockItem.id,
        item_code: stockItem.item_code,
        location_code: 'STORE',
        quantity: roundQuantity(quantity),
        unit_of_measure: stockItem.unit_of_measure,
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: 'JW_GRN',
        document_id: jwGrnId,
        document_number: documentNumber,
        movement_type: 'IN',
        posted_by: postedBy,
        remarks: remarksParts.join(' | '),
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
      const stockCountInfo = stockItemsCount !== null ? `Stock items table has ${stockItemsCount} items.` : 'Could not count stock items.';
      const itemDetails = items.map(i => `${i.item_name}/${i.item_code}`).join(', ');
      throw new StockPostingError(
        'MAPPING_FAILED',
        `No items could be mapped to stock items. ${stockCountInfo} Items tried: ${itemDetails}. Warnings: ${warnings.join('; ')}`
      );
    }
    
    // Step 5: Update JW GRN status to POSTED
    await updateDocumentStockStatus('store_jw_annexure_grn', jwGrnId, 'POSTED', postedBy);
    
    return {
      success: true,
      document_type: 'JW_GRN',
      document_id: jwGrnId,
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
        document_type: 'JW_GRN',
        document_id: jwGrnId,
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

