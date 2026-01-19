// ============================================================================
// ADMIN API: Bulk Opening Stock Upload
// POST - Validate and upload bulk opening stock for RM, PM, SFG
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';
import { verifyAuth, unauthorized } from '@/lib/api-auth';
import { randomUUID } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface RMUploadItem {
  category: string;    // PP, PE, etc.
  type: string;        // HP, ICP, RCP, LDPE, HDPE, MB
  grade: string;       // HJ333MO, 3650 MN, etc.
  supplier?: string;  // Brand/supplier name
  quantity: number;
  status?: 'matched' | 'not_in_master' | 'error';
  master_id?: string;
  stock_item_code?: string;
  message?: string;
}

interface PMUploadItem {
  category: string;     // Boxes, BOPP, Polybags
  type: string;         // Local, Export
  item_code: string;    // CTN-Ro10-GM, Poly-4x22, etc.
  pack_size?: string;
  dimensions?: string;
  brand?: string;
  quantity: number;
  unit?: string;
  status?: 'matched' | 'not_in_master' | 'error';
  master_id?: string;
  stock_item_code?: string;
  message?: string;
}

interface SFGUploadItem {
  item_name: string;    // RP-Ro10-C, CK-Ro24-C, etc.
  sfg_code: string;     // 110110001, 110220001, etc.
  quantity: number;
  status?: 'matched' | 'not_in_master' | 'error';
  master_id?: string;
  stock_item_code?: string;
  message?: string;
}

interface BulkUploadPayload {
  action: 'validate' | 'upload';
  rm_items?: RMUploadItem[];
  pm_items?: PMUploadItem[];
  sfg_items?: SFGUploadItem[];
  location_code?: 'STORE' | 'PRODUCTION' | 'FG_STORE';
  remarks?: string;
}

interface ValidationResult {
  rm: {
    matched: RMUploadItem[];
    not_in_master: RMUploadItem[];
    total: number;
  };
  pm: {
    matched: PMUploadItem[];
    not_in_master: PMUploadItem[];
    total: number;
  };
  sfg: {
    matched: SFGUploadItem[];
    not_in_master: SFGUploadItem[];
    total: number;
  };
}

// ============================================================================
// POST - Validate or Upload Bulk Opening Stock
// ============================================================================

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const supabase = getSupabase();
    const body: BulkUploadPayload = await request.json();
    const { action, rm_items = [], pm_items = [], sfg_items = [], location_code = 'STORE', remarks } = body;

    if (action === 'validate') {
      // ====================================================================
      // VALIDATION MODE - Check items against masters
      // ====================================================================
      
      const result: ValidationResult = {
        rm: { matched: [], not_in_master: [], total: rm_items.length },
        pm: { matched: [], not_in_master: [], total: pm_items.length },
        sfg: { matched: [], not_in_master: [], total: sfg_items.length },
      };

      // --- Validate Raw Materials ---
      if (rm_items.length > 0) {
        const { data: rmMaster } = await supabase
          .from('raw_materials')
          .select('id, category, type, grade, supplier');
        
        for (const item of rm_items) {
          // Match by category + type + grade (case-insensitive)
          const match = rmMaster?.find(rm => 
            rm.category?.toLowerCase() === item.category?.toLowerCase() &&
            rm.type?.toLowerCase() === item.type?.toLowerCase() &&
            rm.grade?.toLowerCase() === item.grade?.toLowerCase()
          );
          
          if (match) {
            // Generate stock item code based on category, type, and grade
            // This ensures different grades create separate stock items
            const stockItemCode = generateRMStockCode(item.category, item.type, item.grade);
            result.rm.matched.push({
              ...item,
              status: 'matched',
              master_id: match.id,
              stock_item_code: stockItemCode,
              supplier: match.supplier || item.supplier, // Include supplier from master or item
              message: `Matched to ${match.category} ${match.type} ${match.grade}${match.supplier ? ` (${match.supplier})` : ''}`
            });
          } else {
            result.rm.not_in_master.push({
              ...item,
              status: 'not_in_master',
              message: `Not found: ${item.category} ${item.type} ${item.grade}`
            });
          }
        }
      }

      // --- Validate Packing Materials ---
      if (pm_items.length > 0) {
        const { data: pmMaster } = await supabase
          .from('packing_materials')
          .select('id, category, type, item_code, pack_size, dimensions, brand, unit');
        
        for (const item of pm_items) {
          // Match by item_code (case-insensitive)
          const match = pmMaster?.find(pm => 
            pm.item_code?.toLowerCase() === item.item_code?.toLowerCase()
          );
          
          if (match) {
            result.pm.matched.push({
              ...item,
              status: 'matched',
              master_id: match.id,
              stock_item_code: item.item_code, // PM uses item_code directly
              message: `Matched to ${match.category} ${match.item_code}`
            });
          } else {
            result.pm.not_in_master.push({
              ...item,
              status: 'not_in_master',
              message: `Not found: ${item.item_code}`
            });
          }
        }
      }

      // --- Validate SFG BOM ---
      if (sfg_items.length > 0) {
        const { data: sfgMaster } = await supabase
          .from('sfg_bom')
          .select('id, item_name, sfg_code');
        
        for (const item of sfg_items) {
          // Match by sfg_code
          const match = sfgMaster?.find(sfg => 
            sfg.sfg_code === item.sfg_code
          );
          
          if (match) {
            result.sfg.matched.push({
              ...item,
              status: 'matched',
              master_id: match.id,
              stock_item_code: item.sfg_code, // SFG uses sfg_code directly
              message: `Matched to ${match.item_name} (${match.sfg_code})`
            });
          } else {
            result.sfg.not_in_master.push({
              ...item,
              status: 'not_in_master',
              message: `Not found: ${item.sfg_code} (${item.item_name})`
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        action: 'validate',
        data: result,
        summary: {
          rm: { matched: result.rm.matched.length, not_matched: result.rm.not_in_master.length },
          pm: { matched: result.pm.matched.length, not_matched: result.pm.not_in_master.length },
          sfg: { matched: result.sfg.matched.length, not_matched: result.sfg.not_in_master.length },
        }
      });
    }

    if (action === 'upload') {
      // ====================================================================
      // UPLOAD MODE - Create stock items and opening stock entries
      // ====================================================================
      
      const results = {
        stock_items_created: 0,
        opening_stock_added: 0,
        errors: [] as string[],
        details: [] as string[]
      };

      // Determine the correct location based on item type
      const getLocationForItemType = (itemType: string, defaultLocation: string): string => {
        // RM goes to STORE, SFG goes to FG_STORE, PM goes to STORE
        if (itemType === 'SFG') return 'FG_STORE';
        return defaultLocation || 'STORE';
      };

      // --- Process Raw Materials ---
      for (const item of rm_items) {
        if (item.status !== 'matched') continue;
        
        try {
          // Generate stock item code with category, type, and grade to ensure uniqueness
          const stockItemCode = item.stock_item_code || generateRMStockCode(item.category, item.type, item.grade);
          
          // Create item name with category, type, grade, and supplier/brand if available
          // Format: "Category Type Grade (Supplier)" or "Category Type Grade"
          const supplierPart = item.supplier ? ` (${item.supplier})` : '';
          const stockItemName = `${item.category} ${item.type} ${item.grade}${supplierPart}`;
          
          const locationForRM = getLocationForItemType('RM', location_code);
          
          // Check/create stock item - use maybeSingle to avoid error on no match
          let { data: stockItem } = await supabase
            .from('stock_items')
            .select('id, item_code')
            .eq('item_code', stockItemCode)
            .maybeSingle();
          
          if (!stockItem) {
            const { data: newItem, error: createError } = await supabase
              .from('stock_items')
              .insert({
                item_code: stockItemCode,
                item_name: stockItemName,
                item_type: 'RM',
                category: item.category,
                sub_category: item.type, // Store type in sub_category
                unit_of_measure: 'KG',
                is_active: true
              })
              .select()
              .single();
            
            if (createError || !newItem) {
              results.errors.push(`Failed to create stock item for ${stockItemCode}: ${createError?.message || 'Unknown error'}`);
              continue;
            }
            stockItem = newItem;
            results.stock_items_created++;
          }
          
          if (!stockItem) {
            results.errors.push(`Stock item not found for ${stockItemCode}`);
            continue;
          }
          
          // Add opening stock with detailed remarks including grade and brand
          const remarksText = remarks || `Bulk upload: ${item.category} ${item.type} ${item.grade}${item.supplier ? ` (Brand: ${item.supplier})` : ''}`;
          const openingResult = await addOpeningStock(
            supabase, 
            stockItem.id, 
            stockItemCode, 
            locationForRM, 
            item.quantity, 
            'KG',
            remarksText
          );
          
          if (openingResult.success) {
            results.opening_stock_added++;
            results.details.push(`RM ${stockItemCode}: +${item.quantity} KG`);
          } else {
            results.errors.push(`Failed to add opening stock for ${stockItemCode}: ${openingResult.error}`);
          }
        } catch (err) {
          results.errors.push(`Error processing RM ${item.type} ${item.grade}: ${err}`);
        }
      }

      // --- Process Packing Materials ---
      for (const item of pm_items) {
        if (item.status !== 'matched') continue;
        
        try {
          const stockItemCode = item.item_code;
          const stockItemName = `${item.category} - ${item.item_code}`;
          const uom = getPMUnitOfMeasure(item.category);
          const locationForPM = getLocationForItemType('PM', location_code);
          
          // Check/create stock item - use maybeSingle to avoid error on no match
          let { data: stockItem } = await supabase
            .from('stock_items')
            .select('id, item_code')
            .eq('item_code', stockItemCode)
            .maybeSingle();
          
          if (!stockItem) {
            const { data: newItem, error: createError } = await supabase
              .from('stock_items')
              .insert({
                item_code: stockItemCode,
                item_name: stockItemName,
                item_type: 'PM',
                category: item.category,
                sub_category: item.type,
                unit_of_measure: uom,
                is_active: true
              })
              .select()
              .single();
            
            if (createError || !newItem) {
              results.errors.push(`Failed to create stock item for ${stockItemCode}: ${createError?.message || 'Unknown error'}`);
              continue;
            }
            stockItem = newItem;
            results.stock_items_created++;
          }
          
          if (!stockItem) {
            results.errors.push(`Stock item not found for ${stockItemCode}`);
            continue;
          }
          
          // Add opening stock
          const openingResult = await addOpeningStock(
            supabase, 
            stockItem.id, 
            stockItemCode, 
            locationForPM, 
            item.quantity, 
            uom,
            remarks || `Bulk upload: ${item.category} ${item.item_code}`
          );
          
          if (openingResult.success) {
            results.opening_stock_added++;
            results.details.push(`PM ${stockItemCode}: +${item.quantity} ${uom}`);
          } else {
            results.errors.push(`Failed to add opening stock for ${stockItemCode}: ${openingResult.error}`);
          }
        } catch (err) {
          results.errors.push(`Error processing PM ${item.item_code}: ${err}`);
        }
      }

      // --- Process SFG Items ---
      for (const item of sfg_items) {
        if (item.status !== 'matched') continue;
        
        try {
          const stockItemCode = item.sfg_code;
          const stockItemName = item.item_name;
          const locationForSFG = getLocationForItemType('SFG', location_code);
          
          // Check/create stock item - use maybeSingle to avoid error on no match
          let { data: stockItem } = await supabase
            .from('stock_items')
            .select('id, item_code')
            .eq('item_code', stockItemCode)
            .maybeSingle();
          
          if (!stockItem) {
            const { data: newItem, error: createError } = await supabase
              .from('stock_items')
              .insert({
                item_code: stockItemCode,
                item_name: stockItemName,
                item_type: 'SFG',
                unit_of_measure: 'NOS',
                is_active: true
              })
              .select()
              .single();
            
            if (createError || !newItem) {
              results.errors.push(`Failed to create stock item for ${stockItemCode}: ${createError?.message || 'Unknown error'}`);
              continue;
            }
            stockItem = newItem;
            results.stock_items_created++;
          }
          
          if (!stockItem) {
            results.errors.push(`Stock item not found for ${stockItemCode}`);
            continue;
          }
          
          // Add opening stock
          const openingResult = await addOpeningStock(
            supabase, 
            stockItem.id, 
            stockItemCode, 
            locationForSFG, 
            item.quantity, 
            'NOS',
            remarks || `Bulk upload: ${item.item_name}`
          );
          
          if (openingResult.success) {
            results.opening_stock_added++;
            results.details.push(`SFG ${stockItemCode}: +${item.quantity} NOS`);
          } else {
            results.errors.push(`Failed to add opening stock for ${stockItemCode}: ${openingResult.error}`);
          }
        } catch (err) {
          results.errors.push(`Error processing SFG ${item.sfg_code}: ${err}`);
        }
      }

      return NextResponse.json({
        success: results.errors.length === 0,
        partial: results.errors.length > 0 && results.opening_stock_added > 0,
        action: 'upload',
        data: results,
        message: `Created ${results.stock_items_created} stock items, added opening stock for ${results.opening_stock_added} items`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "validate" or "upload"'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in bulk opening stock:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// ============================================================================
// GET - Fetch master data for mapping reference
// ============================================================================

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const supabase = getSupabase();

    // Fetch all master data for reference
    const [rmResult, pmResult, sfgResult] = await Promise.all([
      supabase.from('raw_materials').select('id, category, type, grade, supplier').order('category'),
      supabase.from('packing_materials').select('id, category, type, item_code, pack_size, dimensions, brand, unit').order('category'),
      supabase.from('sfg_bom').select('id, item_name, sfg_code').order('sfg_code'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        raw_materials: rmResult.data || [],
        packing_materials: pmResult.data || [],
        sfg_bom: sfgResult.data || [],
      },
      counts: {
        raw_materials: rmResult.data?.length || 0,
        packing_materials: pmResult.data?.length || 0,
        sfg_bom: sfgResult.data?.length || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching master data:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateRMStockCode(category: string, type: string, grade: string): string {
  // Generate stock code in format: category-type-grade (e.g., PP-RCP-HJ333MO)
  // This ensures different grades of the same type create separate stock items
  const cleanCategory = (category || '').trim().toUpperCase();
  const cleanType = (type || '').trim().toUpperCase();
  const cleanGrade = (grade || '').trim();
  
  if (!cleanCategory || !cleanType || !cleanGrade) {
    // Fallback to old format if data is missing
    const typeMap: Record<string, string> = {
      'HP': 'RM-HP',
      'ICP': 'RM-ICP',
      'RCP': 'RM-RCP',
      'LDPE': 'RM-LDPE',
      'HDPE': 'RM-HDPE',
      'GPPS': 'RM-GPPS',
      'MB': 'RM-MB',
      'BLACK': 'RM-MB',
      'WHITE': 'RM-MB',
      'BEIGE': 'RM-MB',
      'YELLOW': 'RM-MB',
    };
    return typeMap[cleanType] || `RM-${cleanType}`;
  }
  
  // Format: category-type-grade (e.g., PP-RCP-HJ333MO)
  return `${cleanCategory}-${cleanType}-${cleanGrade}`;
}

function getPMUnitOfMeasure(category: string): 'NOS' | 'METERS' | 'KG' {
  const cat = category.toLowerCase();
  if (cat.includes('bopp')) return 'METERS';
  return 'NOS'; // Boxes, Polybags are in NOS
}

async function addOpeningStock(
  supabase: ReturnType<typeof getSupabase>,
  itemId: number,
  itemCode: string,
  locationCode: string,
  quantity: number,
  uom: string,
  remarks: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transactionDate = new Date().toISOString().split('T')[0];
    // Simplified document number format: OPEN-YYYYMMDD-ITEMCODE
    const dateStr = transactionDate.replace(/-/g, '');
    const documentNumber = `OPEN-${dateStr}-${itemCode}`;
    // Generate a proper UUID for document_id (required by database)
    const documentId = randomUUID();
    
    // Check existing balance - use maybeSingle to avoid error
    const { data: existingBalance } = await supabase
      .from('stock_balances')
      .select('current_balance')
      .eq('item_code', itemCode)
      .eq('location_code', locationCode)
      .maybeSingle();
    
    const currentBalance = existingBalance?.current_balance || 0;
    const newBalance = currentBalance + quantity;
    
    // Create ledger entry
    const { error: ledgerError } = await supabase
      .from('stock_ledger')
      .insert({
        item_id: itemId,
        item_code: itemCode,
        location_code: locationCode,
        quantity: Math.abs(quantity),
        unit_of_measure: uom,
        balance_after: newBalance,
        transaction_date: transactionDate,
        document_type: 'OPENING',
        document_id: documentId,
        document_number: documentNumber,
        movement_type: 'IN',
        posted_by: 'yogesh',
        remarks: remarks
      });
    
    if (ledgerError) {
      return { success: false, error: ledgerError.message };
    }
    
    // Update or insert balance
    if (existingBalance) {
      await supabase
        .from('stock_balances')
        .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
        .eq('item_code', itemCode)
        .eq('location_code', locationCode);
    } else {
      await supabase
        .from('stock_balances')
        .insert({
          item_id: itemId,
          item_code: itemCode,
          location_code: locationCode,
          current_balance: newBalance,
          unit_of_measure: uom
        });
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
