// ============================================================================
// POST /api/production/fg-transfer-note/[id]/post
// Posts FG Transfer Note to stock ledger
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Local helpers using route's service-role supabase (getSupabase in @/lib/stock/helpers
// uses the browser client which can fail in API routes).
async function getFgBomByItemCodeLocal(
  sb: SupabaseClient,
  baseItemCode: string
): Promise<{ item_name?: string; party_name?: string } | null> {
  if (!baseItemCode) return null;
  const table = baseItemCode.startsWith('2') ? 'fg_bom' : baseItemCode.startsWith('3') ? 'local_bom' : 'fg_bom';
  const { data, error } = await sb.from(table).select('item_name, party_name').eq('item_code', baseItemCode).maybeSingle();
  if (error && error.code !== 'PGRST116') {
    console.warn(`[FG Transfer Post] getFgBom ${table} error:`, error.message);
    return null;
  }
  return data;
}

async function getOrCreatePmItemLocal(
  sb: SupabaseClient,
  itemCode: string
): Promise<{ id: number; item_code: string; unit_of_measure: string; item_type: string } | null> {
  if (!itemCode?.trim()) return null;
  const code = itemCode.trim();
  // Check stock_items first
  const { data: existing } = await sb.from('stock_items').select('id, item_code, unit_of_measure, item_type').eq('item_code', code).eq('is_active', true).single();
  if (existing) return existing;
  // Try packing_materials for name/uom
  const { data: pm } = await sb.from('packing_materials').select('category, type, unit').eq('item_code', code).limit(1).maybeSingle();
  const uom = (pm?.category ?? '').toUpperCase().includes('BOPP') ? 'METERS' : (['KG','NOS','METERS','PCS','LTR','MTR','SET'].includes((pm?.unit ?? '').toUpperCase()) ? (pm!.unit as string) : 'NOS');
  const { data: created, error } = await sb.from('stock_items').insert({
    item_code: code,
    item_name: pm ? [pm.category, pm.type].filter(Boolean).join(' ') || code : code,
    item_type: 'PM',
    category: pm?.category || 'PACKING',
    unit_of_measure: uom,
    is_active: true,
  }).select('id, item_code, unit_of_measure, item_type').single();
  if (error || !created) {
    console.warn(`[FG Transfer Post] getOrCreatePmItem failed for ${code}:`, error?.message);
    return null;
  }
  return created;
}

interface StockValidationError {
  item_code: string;
  item_name: string;
  required: number;
  available: number;
  shortage: number;
  location: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'FG Transfer Note ID is required' } },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const postedBy = body.posted_by || 'system';

    // Get the FG Transfer Note with items
    const { data: note, error: noteError } = await supabase
      .from('production_fg_transfer_note')
      .select('*')
      .eq('id', id)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'FG Transfer Note not found' } },
        { status: 404 }
      );
    }

    if (note.stock_status === 'POSTED') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_POSTED', message: 'FG Transfer Note already posted' } },
        { status: 400 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('production_fg_transfer_note_items')
      .select('*')
      .eq('transfer_note_id', id);

    if (itemsError || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_ITEMS', message: 'No items found for FG Transfer Note' } },
        { status: 400 }
      );
    }

    // Validate all items have required fields
    for (const item of items) {
      if (!item.fg_code) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `Row ${item.sl_no}: FG Code is required` } },
          { status: 400 }
        );
      }
      if (!item.color) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `Row ${item.sl_no}: Color is required` } },
          { status: 400 }
        );
      }
    }

    // Check stock availability
    // NOTE: Only check SFG items - PM materials (carton, polybag, BOPP) are allowed to go negative
    const stockErrors: StockValidationError[] = [];
    
    console.log(`[FG Transfer Post] Starting stock validation for ${items.length} item(s)`);
    
    for (const item of items) {
      console.log(`[FG Transfer Post] Processing item: FG Code=${item.fg_code}, SL No=${item.sl_no}, Qty Boxes=${item.qty_boxes}`);
      
      // Check SFG-1 stock in FG_STORE
      if (item.sfg1_code && item.sfg1_deduct > 0) {
        const sfg1Balance = await getStockBalance(item.sfg1_code, 'FG_STORE');
        console.log(`[FG Transfer Post] SFG-1 Check: Code=${item.sfg1_code}, Required=${item.sfg1_deduct}, Available=${sfg1Balance}, Location=FG_STORE`);
        
        if (sfg1Balance < item.sfg1_deduct) {
          const shortage = item.sfg1_deduct - sfg1Balance;
          console.warn(`[FG Transfer Post] ❌ INSUFFICIENT SFG-1: ${item.sfg1_code} - Required: ${item.sfg1_deduct}, Available: ${sfg1Balance}, Shortage: ${shortage}`);
          stockErrors.push({
            item_code: item.sfg1_code,
            item_name: `SFG-1 for ${item.fg_code}`,
            required: item.sfg1_deduct,
            available: sfg1Balance,
            shortage: shortage,
            location: 'FG_STORE'
          });
        } else {
          console.log(`[FG Transfer Post] ✅ SFG-1 sufficient: ${item.sfg1_code}`);
        }
      } else {
        console.log(`[FG Transfer Post] SFG-1 skipped: Code=${item.sfg1_code || 'N/A'}, Deduct=${item.sfg1_deduct || 0}`);
      }

      // Check SFG-2 stock in FG_STORE
      if (item.sfg2_code && item.sfg2_deduct > 0) {
        const sfg2Balance = await getStockBalance(item.sfg2_code, 'FG_STORE');
        console.log(`[FG Transfer Post] SFG-2 Check: Code=${item.sfg2_code}, Required=${item.sfg2_deduct}, Available=${sfg2Balance}, Location=FG_STORE`);
        
        if (sfg2Balance < item.sfg2_deduct) {
          const shortage = item.sfg2_deduct - sfg2Balance;
          console.warn(`[FG Transfer Post] ❌ INSUFFICIENT SFG-2: ${item.sfg2_code} - Required: ${item.sfg2_deduct}, Available: ${sfg2Balance}, Shortage: ${shortage}`);
          stockErrors.push({
            item_code: item.sfg2_code,
            item_name: `SFG-2 for ${item.fg_code}`,
            required: item.sfg2_deduct,
            available: sfg2Balance,
            shortage: shortage,
            location: 'FG_STORE'
          });
        } else {
          console.log(`[FG Transfer Post] ✅ SFG-2 sufficient: ${item.sfg2_code}`);
        }
      } else {
        console.log(`[FG Transfer Post] SFG-2 skipped: Code=${item.sfg2_code || 'N/A'}, Deduct=${item.sfg2_deduct || 0}`);
      }

      // PM materials (carton, polybag, BOPP) are NOT checked - allowed to go negative
      // This allows posting even if PM materials are not available in stock
      console.log(`[FG Transfer Post] PM Materials (allowed to go negative): Carton=${item.cnt_code || 'N/A'} (${item.cnt_deduct || 0}), Polybag=${item.polybag_code || 'N/A'} (${item.polybag_deduct || 0}), BOPP1=${item.bopp1_code || 'N/A'} (${item.bopp1_deduct || 0}), BOPP2=${item.bopp2_code || 'N/A'} (${item.bopp2_deduct || 0})`);
    }

    if (stockErrors.length > 0) {
      console.error(`[FG Transfer Post] ❌ VALIDATION FAILED: ${stockErrors.length} component(s) have insufficient stock`);
      stockErrors.forEach((error, index) => {
        console.error(`[FG Transfer Post] Error ${index + 1}: ${error.item_code} (${error.item_name}) at ${error.location} - Required: ${error.required}, Available: ${error.available}, Shortage: ${error.shortage}`);
      });
      
      const errorSummary = stockErrors.map(e => 
        `${e.item_code} at ${e.location}: Required ${e.required}, Available ${e.available}, Shortage ${e.shortage}`
      ).join('; ');
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for one or more components',
          details: stockErrors,
          summary: errorSummary
        }
      }, { status: 400 });
    }
    
    console.log(`[FG Transfer Post] ✅ Stock validation passed - all SFG components are sufficient`);

    // Aggregate stock movements by (item_code, location) to comply with stock_ledger unique constraint:
    // UNIQUE (document_type, document_id, item_code, location_code, movement_type)
    // Multiple line items can share the same component (SFG-1, SFG-2, carton, etc.); we must create
    // one ledger entry per (item_code, location, movement_type) with summed quantities.
    type AggregatedEntry = { quantity: number; remarks: string; unitOfMeasure?: string };
    const aggregated = new Map<string, AggregatedEntry>();

    function addToAggregate(
      itemCode: string,
      location: string,
      quantity: number,
      remarks: string,
      unitOfMeasure?: string
    ) {
      const key = `${itemCode}|${location}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity += quantity;
        // Keep generic remarks for aggregated component deductions
        if (quantity < 0) existing.remarks = remarks;
      } else {
        aggregated.set(key, { quantity, remarks, unitOfMeasure });
      }
    }

    for (const item of items) {
      // Deduct SFG-1 from FG_STORE (aggregate when multiple lines use same SFG)
      if (item.sfg1_code && item.sfg1_deduct > 0) {
        addToAggregate(item.sfg1_code, 'FG_STORE', -item.sfg1_deduct, 'SFG-1 consumed for FG Transfer');
      }
      // Deduct SFG-2 from FG_STORE
      if (item.sfg2_code && item.sfg2_deduct > 0) {
        addToAggregate(item.sfg2_code, 'FG_STORE', -item.sfg2_deduct, 'SFG-2 consumed for FG Transfer');
      }
      // Deduct Carton from STORE
      if (item.cnt_code && item.cnt_deduct > 0) {
        addToAggregate(item.cnt_code, 'STORE', -item.cnt_deduct, 'Carton consumed for FG Transfer');
      }
      // Deduct Polybag from STORE
      if (item.polybag_code && item.polybag_deduct > 0) {
        addToAggregate(item.polybag_code, 'STORE', -item.polybag_deduct, 'Polybag consumed for FG Transfer');
      }
      // Deduct BOPP-1 from STORE
      if (item.bopp1_code && item.bopp1_deduct > 0) {
        addToAggregate(item.bopp1_code, 'STORE', -item.bopp1_deduct, 'BOPP-1 consumed for FG Transfer');
      }
      // Deduct BOPP-2 from STORE
      if (item.bopp2_code && item.bopp2_deduct > 0) {
        addToAggregate(item.bopp2_code, 'STORE', -item.bopp2_deduct, 'BOPP-2 consumed for FG Transfer');
      }
      // Add FG to FG_STORE (each fg_code+color is unique per line, no aggregation)
      const totalPcs = item.total_qty_pcs ?? 0;
      if (totalPcs > 0) {
        const fgItemCode = item.color ? `${item.fg_code}-${item.color}` : item.fg_code;
        const kgInfo = item.total_qty_kg && item.total_qty_kg > 0
          ? ` (Weight: ${item.total_qty_kg.toFixed(2)} KG)`
          : '';
        addToAggregate(
          fgItemCode,
          'FG_STORE',
          totalPcs,
          `FG produced: ${item.qty_boxes} boxes × ${item.pack_size} pcs${kgInfo}`,
          'NOS'
        );
      }
    }

    // Use transfer date for ledger (not posting date)
    const transactionDate =
      (note.transfer_date_time ? new Date(note.transfer_date_time).toISOString().split('T')[0] : null) ||
      note.date ||
      new Date().toISOString().split('T')[0];

    // Create one stock entry per aggregated group
    let entriesCreated = 0;
    for (const [key, entry] of aggregated) {
      if (entry.quantity === 0) continue;
      const lastPipe = key.lastIndexOf('|');
      const itemCode = lastPipe >= 0 ? key.slice(0, lastPipe) : key;
      const location = lastPipe >= 0 ? key.slice(lastPipe + 1) : 'FG_STORE';
      await createStockEntry(
        itemCode,
        location,
        entry.quantity,
        'FG_TRANSFER',
        note.doc_no ?? id,
        id,
        entry.remarks,
        postedBy,
        entry.unitOfMeasure,
        transactionDate
      );
      entriesCreated++;
    }

    // Update FG Transfer Note status
    await supabase
      .from('production_fg_transfer_note')
      .update({
        stock_status: 'POSTED',
        posted_at: new Date().toISOString(),
        posted_by: postedBy
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      entries_created: entriesCreated,
      message: `Successfully posted ${entriesCreated} stock entries`
    });

  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; details?: string; hint?: string };
    const message = typeof err?.message === 'string' ? err.message : (error instanceof Error ? error.message : 'An unexpected error occurred');
    console.error('[FG Transfer Post] Error posting to stock:', { message, code: err?.code, details: err?.details, hint: err?.hint, error });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message,
          ...(err?.code && { details: [err.details, err.hint].filter(Boolean).join(' ') }),
        },
      },
      { status: 500 }
    );
  }
}

// Helper function to verify item exists in stock_items
async function verifyItemExists(itemCode: string): Promise<{ exists: boolean; itemName?: string }> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('item_code, item_name')
    .eq('item_code', itemCode)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      console.warn(`[FG Transfer Post] ⚠️ Item "${itemCode}" NOT FOUND in stock_items table`);
      return { exists: false };
    }
    console.warn(`[FG Transfer Post] Error checking item existence for ${itemCode}:`, error?.message);
    return { exists: false };
  }

  console.log(`[FG Transfer Post] ✅ Item verified in stock_items: ${itemCode} (${data.item_name || 'N/A'})`);
  return { exists: true, itemName: data.item_name };
}

// Helper function to get stock balance
async function getStockBalance(itemCode: string, location: string): Promise<number> {
  // First verify the item exists in stock_items
  const itemCheck = await verifyItemExists(itemCode);
  if (!itemCheck.exists) {
    console.warn(`[FG Transfer Post] ⚠️ Cannot check balance - item "${itemCode}" does not exist in stock_items`);
    return 0;
  }

  // Query stock_balances with correct column names
  const { data, error } = await supabase
    .from('stock_balances')
    .select('current_balance')
    .eq('item_code', itemCode)
    .eq('location_code', location)
    .single();

  if (error) {
    // Log if it's not a "not found" error (which is expected when balance is 0)
    if (error.code !== 'PGRST116') {
      console.warn(`[FG Transfer Post] Error fetching balance for ${itemCode} at ${location}:`, error.message);
    } else {
      console.log(`[FG Transfer Post] No balance record found for ${itemCode} at ${location} - item exists but has no balance (returning 0)`);
    }
    return 0;
  }

  if (!data) {
    console.log(`[FG Transfer Post] No balance record found for ${itemCode} at ${location} - returning 0`);
    return 0;
  }

  const balance = data.current_balance || 0;
  console.log(`[FG Transfer Post] Balance query: ${itemCode} (${itemCheck.itemName || 'N/A'}) at ${location} = ${balance}`);
  return balance;
}

// Helper function to create stock entry
async function createStockEntry(
  itemCode: string,
  location: string,
  quantity: number,
  transactionType: string,
  referenceNo: string,
  referenceId: string,
  remarks: string,
  createdBy: string,
  unitOfMeasure?: string, // Optional UOM override
  transactionDate?: string // YYYY-MM-DD; uses document's transfer date when provided
): Promise<void> {
  // Get item_id from stock_items (required for stock_ledger)
  const { data: stockItemData, error: itemError } = await supabase
    .from('stock_items')
    .select('id, item_code, unit_of_measure, item_type')
    .eq('item_code', itemCode)
    .eq('is_active', true)
    .single();

  let finalStockItem = stockItemData;

  // If item doesn't exist, try to auto-create it if it's a PM or FG item
  if (itemError || !finalStockItem) {
    console.log(`[FG Transfer Post] Item "${itemCode}" not found in stock_items, checking if it can be auto-created...`);
    
    // Check if it looks like a PM item code (CTN-*, BOPP-*, POLY-*, etc.)
    const pmPatterns = ['CTN-', 'BOPP-', 'POLY-', 'POLYBAG-', 'BAG-', 'BOX-'];
    const looksLikePm = pmPatterns.some(pattern => itemCode.toUpperCase().startsWith(pattern));
    
    // Check if it's an FG item (being added to FG_STORE and has color suffix or matches FG code pattern)
    const isFgItem = location === 'FG_STORE' && (
      itemCode.includes('-') || // Has color suffix like "210110101001-Black"
      /^\d{10,}$/.test(itemCode) // Or is a 10+ digit FG code
    );
    
    if (looksLikePm) {
      console.log(`[FG Transfer Post] Item "${itemCode}" looks like PM item, attempting to auto-create...`);
      const pmItem = await getOrCreatePmItemLocal(supabase, itemCode);
      
      if (pmItem) {
        console.log(`[FG Transfer Post] ✅ Auto-created PM item: ${itemCode}`);
        finalStockItem = {
          id: pmItem.id,
          item_code: pmItem.item_code,
          unit_of_measure: pmItem.unit_of_measure,
          item_type: pmItem.item_type
        };
      } else {
        // If auto-creation failed, create a basic PM item
        console.log(`[FG Transfer Post] Auto-creation from packing_materials failed, creating basic PM item...`);
        const { data: newItem, error: createError } = await supabase
          .from('stock_items')
          .insert({
            item_code: itemCode,
            item_name: itemCode,
            item_type: 'PM',
            category: 'PACKING',
            unit_of_measure: itemCode.toUpperCase().includes('BOPP') ? 'METERS' : 'NOS',
            is_active: true,
          })
          .select('id, item_code, unit_of_measure, item_type')
          .single();
        
        if (createError || !newItem) {
          console.error(`[FG Transfer Post] ❌ Failed to create PM item "${itemCode}":`, createError?.message);
          throw new Error(`Item ${itemCode} not found in stock_items and could not be auto-created: ${createError?.message || 'Unknown error'}`);
        }
        
        console.log(`[FG Transfer Post] ✅ Created basic PM item: ${itemCode}`);
        finalStockItem = newItem;
      }
    } else if (isFgItem) {
      // Auto-create FG item
      console.log(`[FG Transfer Post] Item "${itemCode}" looks like FG item, attempting to auto-create...`);
      
      // Extract base FG code (without color suffix)
      const baseFgCode = itemCode.includes('-') ? itemCode.split('-')[0] : itemCode;
      const color = itemCode.includes('-') ? itemCode.split('-').slice(1).join('-') : null;
      
      // Look up FG BOM to get item name
      const fgBom = await getFgBomByItemCodeLocal(supabase, baseFgCode);
      let itemName: string;
      
      if (fgBom?.item_name) {
        // Check if item_name already contains the color (to avoid duplicate)
        const baseItemName = fgBom.item_name.trim();
        const colorLower = color?.toLowerCase() || '';
        const itemNameLower = baseItemName.toLowerCase();
        
        // Check if color is already in the item name
        if (color && !itemNameLower.includes(colorLower)) {
          itemName = `${baseItemName} - ${color}`;
        } else {
          itemName = baseItemName;
        }
      } else {
        itemName = color ? `${baseFgCode} - ${color}` : baseFgCode;
      }
      
      console.log(`[FG Transfer Post] Creating FG item: ${itemCode} (${itemName}) from base code: ${baseFgCode}`);
      
      const { data: newFgItem, error: createFgError } = await supabase
        .from('stock_items')
        .insert({
          item_code: itemCode,
          item_name: itemName,
          item_type: 'FG',
          category: fgBom?.party_name || 'FG',
          unit_of_measure: 'NOS',
          is_active: true,
        })
        .select('id, item_code, unit_of_measure, item_type')
        .single();
      
      if (createFgError || !newFgItem) {
        console.error(`[FG Transfer Post] ❌ Failed to create FG item "${itemCode}":`, createFgError?.message);
        throw new Error(`Item ${itemCode} not found in stock_items and could not be auto-created: ${createFgError?.message || 'Unknown error'}`);
      }
      
      console.log(`[FG Transfer Post] ✅ Auto-created FG item: ${itemCode} (${itemName})`);
      finalStockItem = newFgItem;
    } else {
      // Not a PM or FG item, throw error
      console.error(`[FG Transfer Post] ❌ Cannot create stock entry - item "${itemCode}" not found in stock_items and cannot be auto-created`);
      throw new Error(`Item ${itemCode} not found in stock_items`);
    }
  }
  
  if (!finalStockItem) {
    throw new Error(`Item ${itemCode} not found in stock_items`);
  }

  // Use provided UOM or fall back to item's default UOM
  const uom = unitOfMeasure || finalStockItem.unit_of_measure || 'NOS';
  
  // Get current balance (only for base UOM entries - PCS/NOS)
  // For KG entries, we don't update the balance since balances are tracked per item+location, not per UOM
  const shouldUpdateBalance = !unitOfMeasure || unitOfMeasure === 'NOS' || unitOfMeasure === 'PCS';
  
  let currentBalance = 0;
  let newBalance = quantity;
  
  if (shouldUpdateBalance) {
    currentBalance = await getStockBalance(itemCode, location);
    newBalance = currentBalance + quantity;
  } else {
    // For non-base UOM entries (like KG), use the current balance from base UOM
    // but don't update it - these entries are for ledger tracking only
    currentBalance = await getStockBalance(itemCode, location);
    newBalance = currentBalance; // Keep balance unchanged for KG entries
  }

  console.log(`[FG Transfer Post] Creating stock entry: ${itemCode} at ${location}, qty=${quantity} ${uom}, balance: ${currentBalance} -> ${newBalance} (updateBalance=${shouldUpdateBalance})`);
  
  // Create ledger entry with correct column names
  const { error: ledgerError } = await supabase.from('stock_ledger').insert({
    item_id: finalStockItem.id,
    item_code: itemCode,
    location_code: location,
    document_type: transactionType,
    quantity: quantity,
    unit_of_measure: uom,
    balance_after: newBalance,
    document_number: referenceNo,
    document_id: referenceId,
    remarks: remarks,
    posted_by: createdBy,
    transaction_date: transactionDate || new Date().toISOString().split('T')[0],
    movement_type: quantity >= 0 ? 'IN' : 'OUT'
  });

  if (ledgerError) {
    console.error(`[FG Transfer Post] ❌ Error creating ledger entry:`, ledgerError);
    throw ledgerError;
  }

  // Update or insert balance only for base UOM entries (PCS/NOS)
  if (shouldUpdateBalance) {
    const { data: existingBalance } = await supabase
      .from('stock_balances')
      .select('id')
      .eq('item_code', itemCode)
      .eq('location_code', location)
      .single();

    if (existingBalance) {
      const { error: updateError } = await supabase
        .from('stock_balances')
        .update({ 
          current_balance: newBalance, 
          last_updated: new Date().toISOString() 
        })
        .eq('item_code', itemCode)
        .eq('location_code', location);
      
      if (updateError) {
        console.error(`[FG Transfer Post] ❌ Error updating balance:`, updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase.from('stock_balances').insert({
        item_id: finalStockItem.id,
        item_code: itemCode,
        location_code: location,
        current_balance: newBalance,
        unit_of_measure: uom
      });
      
      if (insertError) {
        console.error(`[FG Transfer Post] ❌ Error inserting balance:`, insertError);
        throw insertError;
      }
    }
  } else {
    console.log(`[FG Transfer Post] Skipping balance update for ${uom} entry (balance tracked in base UOM only)`);
  }
  
  console.log(`[FG Transfer Post] ✅ Stock entry created successfully for ${itemCode} at ${location}`);
}

