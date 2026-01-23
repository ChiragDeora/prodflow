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
  getFgBomByItemCode,
  createStockItem,
} from './helpers';
import { getIntWtForSFG } from '../production/fg-transfer-note';
import { getBillWtForSFG } from './job-work-challan-helpers';

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
      // CORRECT VALIDATION FLOW:
      // 1. Check if FG item exists in fg_bom or local_bom master (not stock_items)
      // 2. Get sfg1, sfg2 from fg_bom or local_bom
      // 3. Get rp_bill_wt, rp_int_wt from mold_master
      // 4. Calculate KG values
      // 5. Then get/create stock item (items are created when posting to stock_ledger)
      
      if (!item.item_code) {
        const itemIdentifier = item.item_code || item.material_description || 'Unknown';
        warnings.push(`Item "${itemIdentifier}" has no item_code. Skipping.`);
        continue;
      }
      
      // Step 1: Validate item exists in BOM master (fg_bom or local_bom)
      // getFgBomByItemCode checks fg_bom if code starts with "2", local_bom if starts with "3"
      const fgBom = await getFgBomByItemCode(item.item_code);
      
      if (!fgBom) {
        const bomTable = item.item_code.startsWith('2') ? 'fg_bom' : 
                         item.item_code.startsWith('3') ? 'local_bom' : 
                         'fg_bom or local_bom';
        throw new StockPostingError(
          'VALIDATION_ERROR',
          `FG item "${item.item_code}" not found in ${bomTable} master. Items must exist in BOM master before posting.`
        );
      }
      
      // Step 2: Get sfg1 and sfg2 from BOM
      if (!fgBom.sfg_1 || !fgBom.sfg_2) {
        throw new StockPostingError(
          'VALIDATION_ERROR',
          `FG BOM for "${item.item_code}" is missing SFG components (sfg_1: ${fgBom.sfg_1 || 'missing'}, sfg_2: ${fgBom.sfg_2 || 'missing'}).`
        );
      }
      
      // Get qty_pcs for calculation
      const qtyPcs = item.qty_pcs;
      if (!qtyPcs || qtyPcs <= 0) {
        warnings.push(`Item "${item.item_code}" has no quantity in pieces. Skipping.`);
        continue;
      }
      
      // Step 3: Get rp_bill_wt and rp_int_wt from mold_master
      // Step 4: Calculate KG values
      let stockDeductionKg = item.qty; // Fallback to stored qty if calculation fails
      let billWtKg: number | null = null;
      let intWtKg: number | null = null;
      
      try {
        // Get both int_wt and bill_wt for both SFG codes
        const [sfg1IntWt, sfg2IntWt, sfg1BillWt, sfg2BillWt] = await Promise.all([
          getIntWtForSFG(fgBom.sfg_1),
          getIntWtForSFG(fgBom.sfg_2),
          getBillWtForSFG(fgBom.sfg_1),
          getBillWtForSFG(fgBom.sfg_2)
        ]);
        
        if (sfg1IntWt !== null && sfg2IntWt !== null) {
          // Calculate: Qty (Pcs) × (SFG1_rp_int_wt + SFG2_rp_int_wt) / 1000
          // int_wt is in grams, so divide by 1000 to get KG
          const sfg1WtKg = (sfg1IntWt || 0) / 1000;
          const sfg2WtKg = (sfg2IntWt || 0) / 1000;
          stockDeductionKg = qtyPcs * (sfg1WtKg + sfg2WtKg);
          intWtKg = stockDeductionKg;
          
          console.log(`[Job Work Challan] Calculated stock deduction (int_wt) for ${item.item_code}: ${qtyPcs} Pcs × (${sfg1IntWt}g + ${sfg2IntWt}g) / 1000 = ${stockDeductionKg} KG`);
        } else {
          warnings.push(
            `Could not get internal weights for ${item.item_code} (SFG1: ${fgBom.sfg_1}, SFG2: ${fgBom.sfg_2}). Using stored qty: ${item.qty} KG.`
          );
        }
        
        // Calculate bill_wt_kg for display (customer-facing weight)
        if (sfg1BillWt !== null && sfg2BillWt !== null) {
          const sfg1BillWtKg = (sfg1BillWt || 0) / 1000;
          const sfg2BillWtKg = (sfg2BillWt || 0) / 1000;
          billWtKg = qtyPcs * (sfg1BillWtKg + sfg2BillWtKg);
          
          console.log(`[Job Work Challan] Calculated bill weight for ${item.item_code}: ${qtyPcs} Pcs × (${sfg1BillWt}g + ${sfg2BillWt}g) / 1000 = ${billWtKg} KG`);
        }
      } catch (error) {
        console.error(`Error calculating weights for ${item.item_code}:`, error);
        throw new StockPostingError(
          'VALIDATION_ERROR',
          `Failed to calculate weights for ${item.item_code}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      
      // Validate that both bill_wt and int_wt are calculated (required for proper tracking)
      if (intWtKg === null || intWtKg <= 0) {
        throw new StockPostingError(
          'VALIDATION_ERROR',
          `Internal weight (int_wt) could not be calculated for ${item.item_code}. ` +
          `SFG1: ${fgBom.sfg_1}, SFG2: ${fgBom.sfg_2}. ` +
          `Please ensure mold weights are configured in mold_master.`
        );
      }
      
      if (billWtKg === null || billWtKg <= 0) {
        throw new StockPostingError(
          'VALIDATION_ERROR',
          `Bill weight (bill_wt) could not be calculated for ${item.item_code}. ` +
          `SFG1: ${fgBom.sfg_1}, SFG2: ${fgBom.sfg_2}. ` +
          `Please ensure mold weights are configured in mold_master.`
        );
      }
      
      // Step 5: Get or create stock item
      // Items are auto-created if they don't exist (similar to SFG items)
      let stockItem = await getStockItemByCode(item.item_code);
      
      if (!stockItem) {
        // Auto-create FG stock item if it doesn't exist
        // Use item name from BOM if available, otherwise use material_description
        const itemName = fgBom.item_name || item.material_description || item.item_code;
        console.log(`📦 Auto-creating FG item: ${item.item_code} (${itemName})`);
        
        stockItem = await createStockItem(
          item.item_code,
          itemName,
          'FG',
          'NOS', // FG items are tracked in pieces (NOS), not KG
          'FG'
        );
        console.log(`✅ Created FG item: ${item.item_code}`);
      }
      
      // Get current balance at FG_STORE (in pieces/NOS)
      const currentBalance = await getBalance(stockItem.item_code, 'FG_STORE');
      
      // Note: Negative stock is allowed - no validation to prevent it
      if (currentBalance < qtyPcs) {
        warnings.push(
          `Insufficient ${stockItem.item_code} at FG_STORE. Available: ${currentBalance} NOS, Required: ${qtyPcs} NOS. Stock will go negative.`
        );
      }
      
      // Calculate new balance (OUT) - using pieces, not KG
      const newBalance = roundQuantity(currentBalance - qtyPcs);
      
      // Build remarks with both bill_wt and int_wt information
      // Format: "JW Challan to [Party] - [Item] ([Qty] Pcs, Bill Wt: X.XX KG, Int Wt: Y.YY KG)"
      // This format allows the stock ledger UI to parse and display both weights separately
      let remarks = `JW Challan to ${challan.party_name || 'Job Worker'} - ${stockItem.item_name || stockItem.item_code} (${qtyPcs} Pcs`;
      
      // Add bill_wt_kg (customer-facing weight) if available
      if (billWtKg !== null) {
        remarks += `, Bill Wt: ${roundQuantity(billWtKg)} KG`;
      }
      
      // Add int_wt_kg (internal weight) if available
      if (intWtKg !== null) {
        remarks += `, Int Wt: ${roundQuantity(intWtKg)} KG`;
      }
      
      if (challan.vehicle_no) {
        remarks += `, Vehicle: ${challan.vehicle_no}`;
      }
      remarks += ')';
      
      // Create OUT ledger entry at FG_STORE
      // Post quantity in pieces (NOS), not KG
      await createLedgerEntry({
        item_id: stockItem.id,
        item_code: stockItem.item_code,
        location_code: 'FG_STORE',
        quantity: roundQuantity(-qtyPcs), // Negative for OUT - uses pieces (NOS)
        unit_of_measure: 'NOS', // FG items are tracked in pieces
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: 'JOB_WORK_CHALLAN',
        document_id: challanId,
        document_number: documentNumber,
        movement_type: 'OUT',
        posted_by: postedBy,
        remarks: remarks,
      });
      
      // Update balance cache (in NOS)
      await updateBalance(
        stockItem.id,
        stockItem.item_code,
        'FG_STORE',
        newBalance,
        'NOS' // Balance is tracked in pieces
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


