// ============================================================================
// DPR (DAILY PRODUCTION REPORT) STOCK POSTING - MOST COMPLEX
// ============================================================================
// Posts DPR to stock ledger with THREE effects:
// 1. Consumes raw materials from PRODUCTION location
// 2. Creates semi-finished goods (SFG) in FG_STORE location
// 3. Creates regrind from rejected material in STORE location
// ============================================================================

import { getSupabase, handleSupabaseError } from '../supabase/utils';
import type { 
  PostingResult, 
  DprAggregatedProduction,
  DprProductionEntry,
} from '../supabase/types/stock';
import { StockPostingError } from '../supabase/types/stock';
import {
  getBalance,
  updateBalance,
  createLedgerEntry,
  isDocumentPosted,
  getSfgBomByMoldName,
  getStockItemByCode,
  getOrCreateRegrindItem,
  getOrCreateSfgItem,
  updateDocumentStockStatus,
  roundQuantity,
  consumeRmFifo,
} from './helpers';

// ============================================================================
// RM TYPE MAPPING
// ============================================================================

/**
 * Maps BOM percentage field names to RM sub_category values
 */
const RM_TYPE_MAPPING: Record<string, string> = {
  hp_percentage: 'HP',
  icp_percentage: 'ICP',
  rcp_percentage: 'RCP',
  ldpe_percentage: 'LDPE',
  gpps_percentage: 'GPPS',
  mb_percentage: 'MB',
};

// ============================================================================
// DPR POSTING LOGIC
// ============================================================================

/**
 * Post DPR to stock ledger
 * 
 * Stock Effects:
 * 1. Consumes RM from PRODUCTION (based on BOM percentages)
 *    - Total consumption = ok_prod_kgs + rej_kgs
 * 2. Creates SFG in FG_STORE (quantity = ok_prod_qty_nos)
 * 3. Creates REGRIND in STORE (quantity = rej_kgs)
 * 
 * @param dprId - UUID of the DPR to post
 * @param postedBy - Username of the user posting
 * @returns PostingResult with success status and details
 */
export async function postDprToStock(
  dprId: string,
  postedBy: string
): Promise<PostingResult> {
  const supabase = getSupabase();
  const warnings: string[] = [];
  
  try {
    // Step 1: Get the DPR
    const { data: dpr, error: dprError } = await supabase
      .from('dpr_data')
      .select('*')
      .eq('id', dprId)
      .single();
    
    if (dprError || !dpr) {
      throw new StockPostingError(
        'DOCUMENT_NOT_FOUND',
        `DPR with ID ${dprId} not found`
      );
    }
    
    // Step 2: Check if already posted
    if (dpr.stock_status === 'POSTED') {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'DPR has already been posted to stock'
      );
    }
    
    // Double-check ledger for existing entries
    const alreadyPosted = await isDocumentPosted('DPR', dprId);
    if (alreadyPosted) {
      throw new StockPostingError(
        'ALREADY_POSTED',
        'DPR has existing ledger entries'
      );
    }
    
    // Step 3: Get all production entries for this DPR
    // Both current production and changeover entries are processed the same way
    // Fetching ALL fields including: ok_prod_qty_nos, ok_prod_kgs, rej_kgs, product (mold name)
    const { data: entries, error: entriesError } = await supabase
      .from('dpr_machine_entries')
      .select('*')
      .eq('dpr_id', dprId)
      .order('created_at', { ascending: true });
    
    if (entriesError) {
      handleSupabaseError(entriesError, 'fetching DPR production entries');
      throw entriesError;
    }
    
    if (!entries || entries.length === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'DPR has no production entries to post'
      );
    }
    
    console.log('📦 [postDprToStock] Fetched DPR entries:', {
      count: entries.length,
      entries: entries.map(e => ({
        id: e.id,
        machine_no: e.machine_no,
        product: e.product,
        ok_prod_qty_nos: e.ok_prod_qty_nos,
        ok_prod_kgs: e.ok_prod_kgs,
        rej_kgs: e.rej_kgs,
        section_type: e.section_type
      }))
    });
    
    // Step 4: Aggregate production by SFG code
    // This groups entries by mold name, looks up SFG code from sfg_bom table,
    // and sums: ok_prod_qty_nos (for SFG), ok_prod_kgs + rej_kgs (for RM consumption)
    const aggregatedProduction = await aggregateProductionBySfg(entries as DprProductionEntry[]);
    
    console.log('📦 [postDprToStock] Aggregated production by SFG:', {
      count: aggregatedProduction.length,
      aggregated: aggregatedProduction.map(agg => ({
        sfg_code: agg.sfg_code,
        mold_name: agg.mold_name,
        total_pieces: agg.total_pieces, // From ok_prod_qty_nos
        total_good_kgs: agg.total_good_kgs, // From ok_prod_kgs
        total_rej_kgs: agg.total_rej_kgs, // From rej_kgs
        total_consumption: agg.total_good_kgs + agg.total_rej_kgs, // For RM consumption
        bom_percentages: agg.bom
      }))
    });
    
    if (aggregatedProduction.length === 0) {
      throw new StockPostingError(
        'BOM_NOT_FOUND',
        'No valid production entries with BOM mappings found'
      );
    }
    
    // Step 4b: Check for skipped entries (missing BOM mappings) - fail fast
    // Get unique products from entries
    const uniqueProducts = [...new Set(entries.map(e => e.product?.trim()).filter(Boolean))];
    const processedProducts = [...new Set(aggregatedProduction.map(a => a.mold_name))];
    const skippedProducts = uniqueProducts.filter(p => !processedProducts.includes(p));
    
    if (skippedProducts.length > 0) {
      // Get all available BOM item names to suggest similar matches
      const { data: allBoms } = await supabase
        .from('sfg_bom')
        .select('item_name')
        .order('item_name');
      
      const availableNames = (allBoms || []).map(b => b.item_name).filter(Boolean);
      
      // Find similar matches for each skipped product
      const suggestions = skippedProducts.map(skipped => {
        const similar = availableNames.filter(name => 
          name.toLowerCase().includes(skipped.toLowerCase()) || 
          skipped.toLowerCase().includes(name.toLowerCase())
        );
        return similar.length > 0 
          ? `${skipped} (similar: ${similar.slice(0, 3).join(', ')})`
          : skipped;
      });
      
      throw new StockPostingError(
        'BOM_NOT_FOUND',
        `Missing BOM mappings for: ${suggestions.join(', ')}. Please check product names match BOM Master exactly or add missing BOM entries.`
      );
    }
    
    // Step 5: Process aggregated production
    let entriesCreated = 0;
    const transactionDate = dpr.report_date;
    const documentNumber = `DPR-${dpr.report_date}-${dpr.shift}`;
    
    console.log(`📦 [postDprToStock] Processing ${aggregatedProduction.length} aggregated SFG entries`);
    
    // Step 5a: Aggregate RM consumption across ALL entries first
    // This prevents duplicate ledger entries when multiple SFGs consume the same RM type
    const aggregatedRmConsumption: Map<string, number> = new Map();
    let totalRegrindKgs = 0;
    
    for (const aggProd of aggregatedProduction) {
      const totalConsumption = roundQuantity(aggProd.total_good_kgs + aggProd.total_rej_kgs);
      
      if (totalConsumption > 0) {
        // Aggregate RM consumption by type
        for (const [percentField, rmType] of Object.entries(RM_TYPE_MAPPING)) {
          const percentage = aggProd.bom[percentField as keyof typeof aggProd.bom] || 0;
          
          if (percentage > 0) {
            const rmConsumption = roundQuantity(totalConsumption * percentage);
            
            if (rmConsumption > 0) {
              const current = aggregatedRmConsumption.get(rmType) || 0;
              aggregatedRmConsumption.set(rmType, roundQuantity(current + rmConsumption));
            }
          }
        }
      }
      
      // Aggregate regrind
      if (aggProd.total_rej_kgs > 0) {
        totalRegrindKgs = roundQuantity(totalRegrindKgs + aggProd.total_rej_kgs);
      }
    }
    
    // Step 5b: Process aggregated RM consumption (once per RM type)
    console.log(`📦 [postDprToStock] Processing aggregated RM consumption:`, 
      Array.from(aggregatedRmConsumption.entries()).map(([type, qty]) => `${type}: ${qty} kg`).join(', ')
    );
    
    for (const [rmType, totalConsumption] of aggregatedRmConsumption.entries()) {
      if (totalConsumption > 0) {
        console.log(`  → Consuming ${totalConsumption} kg of ${rmType} from PRODUCTION`);
        
        try {
          const result = await consumeRmFifo(
            rmType,
            totalConsumption,
            'PRODUCTION',
            transactionDate,
            'DPR',
            dprId,
            documentNumber,
            postedBy
          );
          
          entriesCreated += result.entries.length;
          warnings.push(...result.warnings);
        } catch (rmError) {
          const errorMsg = `Error consuming ${rmType}: ${rmError instanceof Error ? rmError.message : String(rmError)}`;
          console.error(`❌ [postDprToStock]`, errorMsg, rmError);
          warnings.push(errorMsg);
          // Continue processing other RM types even if one fails
        }
      }
    }
    
    // Step 5c: Process each aggregated SFG (create SFG stock entries)
    for (let i = 0; i < aggregatedProduction.length; i++) {
      const aggProd = aggregatedProduction[i];
      console.log(`📦 [postDprToStock] Processing aggregated entry ${i + 1}/${aggregatedProduction.length}: ${aggProd.sfg_code} (${aggProd.mold_name})`);
      
      try {
      
        // Create SFG in FG_STORE
        // Auto-creates the SFG item if it doesn't exist
        if (aggProd.total_pieces > 0) {
        console.log(`📦 Creating SFG stock for ${aggProd.sfg_code} (${aggProd.mold_name}): ${aggProd.total_pieces} pcs`);
        
        // Get or create the SFG item (auto-creates if missing)
        const sfgItem = await getOrCreateSfgItem(aggProd.sfg_code, aggProd.mold_name);
        
        const currentBalance = await getBalance(aggProd.sfg_code, 'FG_STORE');
        const newBalance = roundQuantity(currentBalance + aggProd.total_pieces);
        
        console.log(`✅ Updating SFG balance: ${currentBalance} + ${aggProd.total_pieces} = ${newBalance}`);
        
        await createLedgerEntry({
          item_id: sfgItem.id,
          item_code: sfgItem.item_code,
          location_code: 'FG_STORE',
          quantity: roundQuantity(aggProd.total_pieces),
          unit_of_measure: sfgItem.unit_of_measure,
          balance_after: newBalance,
          transaction_date: transactionDate,
          document_type: 'DPR',
          document_id: dprId,
          document_number: documentNumber,
          movement_type: 'IN',
          posted_by: postedBy,
          remarks: `SFG Production - ${sfgItem.item_name || sfgItem.item_code} (${aggProd.total_pieces} pcs) from Mold: ${aggProd.mold_name}, Shift: ${dpr.shift || 'N/A'}, Lines: ${aggProd.line_ids.join(', ') || 'N/A'}`,
        });
        
        await updateBalance(
          sfgItem.id,
          sfgItem.item_code,
          'FG_STORE',
          newBalance,
          sfgItem.unit_of_measure
        );
        
          entriesCreated++;
        }
        
        console.log(`✅ [postDprToStock] Completed processing aggregated entry ${i + 1}/${aggregatedProduction.length}: ${aggProd.sfg_code}`);
      } catch (entryError) {
        const errorMsg = `Error processing aggregated entry ${i + 1}/${aggregatedProduction.length} (${aggProd.sfg_code}/${aggProd.mold_name}): ${entryError instanceof Error ? entryError.message : String(entryError)}`;
        console.error(`❌ [postDprToStock]`, errorMsg, entryError);
        warnings.push(errorMsg);
        // Continue processing other entries even if one fails
        // This ensures all processable entries are posted
      }
    }
    
    // Step 5d: Create aggregated REGRIND in STORE (once for all entries)
    if (totalRegrindKgs > 0) {
      console.log(`📦 [postDprToStock] Creating aggregated REGRIND: ${totalRegrindKgs} kg`);
      
      try {
        const regrindItem = await getOrCreateRegrindItem();
        
        const currentBalance = await getBalance(regrindItem.item_code, 'STORE');
        const newBalance = roundQuantity(currentBalance + totalRegrindKgs);
        
        // Build remarks with all mold names that contributed regrind
        const moldNames = aggregatedProduction
          .filter(agg => agg.total_rej_kgs > 0)
          .map(agg => agg.mold_name)
          .join(', ');
        
        await createLedgerEntry({
          item_id: regrindItem.id,
          item_code: regrindItem.item_code,
          location_code: 'STORE',
          quantity: roundQuantity(totalRegrindKgs),
          unit_of_measure: regrindItem.unit_of_measure,
          balance_after: newBalance,
          transaction_date: transactionDate,
          document_type: 'DPR',
          document_id: dprId,
          document_number: documentNumber,
          movement_type: 'IN',
          posted_by: postedBy,
          remarks: `Regrind from rejection (${roundQuantity(totalRegrindKgs)} ${regrindItem.unit_of_measure || 'Kgs'}) from Molds: ${moldNames}, Shift: ${dpr.shift || 'N/A'}`,
        });
        
        await updateBalance(
          regrindItem.id,
          regrindItem.item_code,
          'STORE',
          newBalance,
          regrindItem.unit_of_measure
        );
        
        entriesCreated++;
      } catch (regrindError) {
        const errorMsg = `Error creating regrind: ${regrindError instanceof Error ? regrindError.message : String(regrindError)}`;
        console.error(`❌ [postDprToStock]`, errorMsg, regrindError);
        warnings.push(errorMsg);
      }
    }
    
    console.log(`📦 [postDprToStock] Total entries created: ${entriesCreated}`);
    
    if (entriesCreated === 0) {
      throw new StockPostingError(
        'VALIDATION_ERROR',
        'No stock entries could be created from DPR'
      );
    }
    
    // Step 6: Update DPR status to POSTED
    await updateDocumentStockStatus('dpr_data', dprId, 'POSTED', postedBy);
    
    return {
      success: true,
      document_type: 'DPR',
      document_id: dprId,
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
        document_type: 'DPR',
        document_id: dprId,
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
// HELPER: AGGREGATE PRODUCTION BY SFG
// ============================================================================

/**
 * Aggregates DPR production entries by SFG code
 * 
 * Groups all production entries (both current and changeover) that produce
 * the same SFG, summing up:
 * - ok_prod_qty_nos (total pieces)
 * - ok_prod_kgs (total good kgs)
 * - rej_kgs (total rejected kgs)
 * 
 * @param entries - DPR production entries
 * @returns Array of aggregated production data per SFG
 */
async function aggregateProductionBySfg(
  entries: DprProductionEntry[]
): Promise<DprAggregatedProduction[]> {
  const aggregated: Map<string, DprAggregatedProduction> = new Map();
  const errors: string[] = [];
  
  console.log(`📊 [aggregateProductionBySfg] Processing ${entries.length} entries`);
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    console.log(`📊 [aggregateProductionBySfg] Processing entry ${i + 1}/${entries.length}: machine=${entry.machine_no}, product=${entry.product}`);
    
    // Skip entries with no product (mold name)
    if (!entry.product) {
      console.warn(`⚠️ [aggregateProductionBySfg] Entry ${i + 1} has no product, skipping`);
      continue;
    }
    
    // Look up SFG BOM by mold name (product field contains mold name like "RPRo16T-C")
    // This gets: sfg_code (e.g., "110110001") and RM percentages (hp_percentage, icp_percentage, etc.)
    const sfgBom = await getSfgBomByMoldName(entry.product);
    
    if (!sfgBom) {
      const errorMsg = `No BOM mapping found for mold: ${entry.product}`;
      errors.push(errorMsg);
      console.error(`❌ [aggregateProductionBySfg] Entry ${i + 1}:`, errorMsg);
      continue;
    }
    
    const sfgCode = sfgBom.sfg_code;
    
    // Validate that sfg_code is present and non-empty
    if (!sfgCode || sfgCode.trim() === '') {
      const errorMsg = `BOM for mold "${entry.product}" has empty sfg_code. Please update the BOM Master.`;
      errors.push(errorMsg);
      console.error(`❌ [aggregateProductionBySfg] Entry ${i + 1}:`, errorMsg);
      continue;
    }
    console.log(`✅ [aggregateProductionBySfg] Entry ${i + 1}: Found BOM for mold ${entry.product}:`, {
      sfg_code: sfgCode,
      rm_percentages: {
        hp: sfgBom.hp_percentage,
        icp: sfgBom.icp_percentage,
        rcp: sfgBom.rcp_percentage,
        ldpe: sfgBom.ldpe_percentage,
        gpps: sfgBom.gpps_percentage,
        mb: sfgBom.mb_percentage
      }
    });
    
    // Get or create aggregated entry for this SFG
    let agg = aggregated.get(sfgCode);
    
    if (!agg) {
      agg = {
        sfg_code: sfgCode,
        mold_name: entry.product,
        total_pieces: 0,
        total_good_kgs: 0,
        total_rej_kgs: 0,
        line_ids: [],
        bom: {
          hp_percentage: sfgBom.hp_percentage || 0,
          icp_percentage: sfgBom.icp_percentage || 0,
          rcp_percentage: sfgBom.rcp_percentage || 0,
          ldpe_percentage: sfgBom.ldpe_percentage || 0,
          gpps_percentage: sfgBom.gpps_percentage || 0,
          mb_percentage: sfgBom.mb_percentage || 0,
        },
      };
      aggregated.set(sfgCode, agg);
    }
    
    // Add to totals
    // Using the correct fields from DPR:
    // - ok_prod_qty_nos → total_pieces (for SFG quantity in FG_STORE)
    // - ok_prod_kgs → total_good_kgs (for RM consumption calculation)
    // - rej_kgs → total_rej_kgs (for RM consumption + REGRIND creation)
    const okProdQty = entry.ok_prod_qty_nos || 0;
    const okProdKgs = entry.ok_prod_kgs || 0;
    const rejKgs = entry.rej_kgs || 0;
    
    console.log(`📊 [aggregateProductionBySfg] Adding entry for ${entry.product}:`, {
      ok_prod_qty_nos: okProdQty,
      ok_prod_kgs: okProdKgs,
      rej_kgs: rejKgs,
      sfg_code: sfgCode,
      line_id: entry.machine_no
    });
    
    agg.total_pieces += okProdQty;
    agg.total_good_kgs += okProdKgs;
    agg.total_rej_kgs += rejKgs;
    
    // Track line IDs that produced this SFG
    if (entry.machine_no && !agg.line_ids.includes(entry.machine_no)) {
      agg.line_ids.push(entry.machine_no);
    }
    
    console.log(`✅ [aggregateProductionBySfg] Entry ${i + 1} processed successfully. Aggregated totals for ${sfgCode}: pieces=${agg.total_pieces}, good_kgs=${agg.total_good_kgs}, rej_kgs=${agg.total_rej_kgs}`);
  }
  
  console.log(`📊 [aggregateProductionBySfg] Completed processing. Aggregated ${aggregated.size} unique SFG codes from ${entries.length} entries. Errors: ${errors.length}`);
  
  // If we have errors and no valid entries, throw
  if (aggregated.size === 0 && errors.length > 0) {
    throw new StockPostingError(
      'BOM_NOT_FOUND',
      errors.join('; ')
    );
  }
  
  return Array.from(aggregated.values());
}

