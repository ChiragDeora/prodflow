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
  transaction_date?: string;
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
    const { action, rm_items = [], pm_items = [], sfg_items = [], location_code = 'STORE', transaction_date, remarks } = body;

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
          // Normalize Excel data for comparison (whitespace-tolerant)
          const normalizedItem = {
            category: normalizeString(item.category),
            type: normalizeString(item.type),
            grade: normalizeString(item.grade)
          };
          
          // Match by category + type + grade (exact category match required)
          // PP must match PP, PE must match PE - they are NOT interchangeable
          const match = rmMaster?.find(rm => {
            const normalizedMaster = {
              category: normalizeString(rm.category),
              type: normalizeString(rm.type),
              grade: normalizeString(rm.grade)
            };
            
            // All three must match exactly (after normalization)
            return normalizedMaster.category === normalizedItem.category &&
                   normalizedMaster.type === normalizedItem.type &&
                   normalizedMaster.grade === normalizedItem.grade;
          });
          
          // If no match found, try a more flexible search and log for debugging
          if (!match) {
            // Try to find similar items for debugging
            const similarItems = rmMaster?.filter(rm => {
              const normalizedMaster = {
                category: normalizeString(rm.category),
                type: normalizeString(rm.type),
                grade: normalizeString(rm.grade)
              };
              // Find items with same type
              return normalizedMaster.type === normalizedItem.type;
            }) || [];
            
            console.log(`[Bulk Opening Stock] No match found for:`, {
              excel: `${item.category} | ${item.type} | ${item.grade}`,
              excelNormalized: `${normalizedItem.category} | ${normalizedItem.type} | ${normalizedItem.grade}`,
              similarItemsFound: similarItems.length,
              similarItems: similarItems.slice(0, 5).map(rm => ({
                category: rm.category,
                type: rm.type,
                grade: rm.grade,
                normalized: `${normalizeString(rm.category)} | ${normalizeString(rm.type)} | ${normalizeString(rm.grade)}`
              }))
            });
          }
          
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
          // Match by item_code (case-insensitive and whitespace-tolerant)
          const match = pmMaster?.find(pm => 
            stringsMatch(pm.item_code, item.item_code)
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
          // Validate that category, type, and grade are all provided
          // This ensures each grade gets its own unique stock item code
          // Without grade, all HP items would share the same stock (e.g., RM-HP)
          if (!item.category || !item.type || !item.grade) {
            const missingFields = [
              !item.category && 'category',
              !item.type && 'type',
              !item.grade && 'grade'
            ].filter(Boolean).join(', ');
            results.errors.push(`Missing required fields for RM item (${missingFields}): category="${item.category || 'MISSING'}", type="${item.type || 'MISSING'}", grade="${item.grade || 'MISSING'}". All three fields are required to create a unique stock item for each grade.`);
            continue;
          }
          
          // Generate stock item code with category, type, and grade to ensure uniqueness
          // This will create codes like PP-HP-HJ333MO, ensuring each grade has its own stock
          const stockItemCode = item.stock_item_code || generateRMStockCode(item.category, item.type, item.grade);
          
          // Verify the generated code is specific (not generic fallback like RM-HP)
          // Generic codes cause all items of the same type to share stock
          if (stockItemCode.startsWith('RM-') && !stockItemCode.includes(item.grade.trim())) {
            results.errors.push(`Failed to generate specific stock code for ${item.category} ${item.type} ${item.grade}. Generated generic code: ${stockItemCode} (this would cause all ${item.type} items to share the same stock). Please ensure category, type, and grade are all provided in the Excel file.`);
            continue;
          }
          
          console.log(`[Bulk Opening Stock] Processing RM: ${item.category} ${item.type} ${item.grade} -> Stock Code: ${stockItemCode}, Quantity: ${item.quantity}`);
          
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
            remarksText,
            transaction_date
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
            remarks || `Bulk upload: ${item.category} ${item.item_code}`,
            transaction_date
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
            remarks || `Bulk upload: ${item.item_name}`,
            transaction_date
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

/**
 * Normalize a string for comparison by:
 * - Trimming whitespace
 * - Converting to lowercase
 * - Removing ALL whitespace (spaces, tabs, etc.) for comparison
 * This handles cases where Excel has "HDPE 50 MA 180" but master has "HDPE50MA180"
 */
function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ''); // Remove ALL whitespace for comparison
}

/**
 * Compare two strings with whitespace normalization
 */
function stringsMatch(str1: string | null | undefined, str2: string | null | undefined): boolean {
  return normalizeString(str1) === normalizeString(str2);
}

function generateRMStockCode(category: string, type: string, grade: string): string {
  // Generate stock code in format: category-type-grade (e.g., PP-RCP-HJ333MO)
  // This ensures different grades of the same type create separate stock items
  const cleanCategory = (category || '').trim().toUpperCase();
  const cleanType = (type || '').trim().toUpperCase();
  const cleanGrade = (grade || '').trim();
  
  // CRITICAL: For bulk opening stock, we MUST have all three fields to create unique stock items
  // Without grade, all items of the same type would share the same stock (e.g., all HP items)
  if (!cleanCategory || !cleanType || !cleanGrade) {
    // Fallback to old format if data is missing (for backward compatibility only)
    // WARNING: This creates generic codes that will cause all items of the same type to share stock
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
    // Log warning about fallback usage
    console.warn(`[generateRMStockCode] Using fallback generic code. Missing fields - category: ${cleanCategory || 'MISSING'}, type: ${cleanType || 'MISSING'}, grade: ${cleanGrade || 'MISSING'}`);
    return typeMap[cleanType] || `RM-${cleanType}`;
  }
  
  // Format: category-type-grade (e.g., PP-HP-HJ333MO)
  // This ensures each grade gets its own unique stock item and stock balance
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
  remarks: string,
  transactionDate?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use provided transaction_date or default to today
    const transactionDateValue = transactionDate || new Date().toISOString().split('T')[0];
    // Simplified document number format: OPEN-YYYYMMDD-ITEMCODE
    const dateStr = transactionDateValue.replace(/-/g, '');
    const documentNumber = `OPEN-${dateStr}-${itemCode}`;
    // Generate a proper UUID for document_id (required by database)
    const documentId = randomUUID();
    
    // Check existing balance - use maybeSingle to avoid error
    // CRITICAL: This query must use the specific item_code (e.g., PP-HP-HJ333MO)
    // to ensure each grade gets its own stock balance, not a shared generic code
    const { data: existingBalance, error: balanceError } = await supabase
      .from('stock_balances')
      .select('current_balance, item_code')
      .eq('item_code', itemCode)
      .eq('location_code', locationCode)
      .maybeSingle();
    
    if (balanceError && balanceError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine (new item)
      return { success: false, error: `Error checking balance: ${balanceError.message}` };
    }
    
    // Verify we're updating the correct item_code (if balance exists)
    if (existingBalance && existingBalance.item_code !== itemCode) {
      return { success: false, error: `Item code mismatch: expected ${itemCode}, found ${existingBalance.item_code}` };
    }
    
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
        transaction_date: transactionDateValue,
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
