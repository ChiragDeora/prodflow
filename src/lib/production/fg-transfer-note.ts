// ============================================================================
// FG TRANSFER NOTE HELPER FUNCTIONS
// ============================================================================
// Helper functions for production FG Transfer Note operations
// ============================================================================

import { getSupabase } from '../supabase/utils';

// Get Supabase client (uses client-side client for browser, server client for server)
const getSupabaseClient = () => getSupabase();

// Types
export interface FGTransferNote {
  id: string;
  doc_no: string;
  date: string;
  from_dept: string;
  to_dept: string;
  transfer_date_time?: string;
  shift_incharge?: string;
  qc_inspector?: string;
  fg_received_by?: string;
  stock_status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  posted_at?: string;
  posted_by?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface FGTransferNoteItem {
  id: string;
  transfer_note_id: string;
  sl_no: number;
  fg_code: string;
  bom_type: 'FG' | 'LOCAL';
  item_name?: string;
  party?: string;
  color?: string;
  qty_boxes: number;
  pack_size: number;
  total_qty_pcs: number;
  total_qty_ton?: number;
  sfg1_code?: string;
  sfg1_qty?: number;
  sfg1_deduct?: number;
  sfg1_int_wt?: number;
  sfg2_code?: string;
  sfg2_qty?: number;
  sfg2_deduct?: number;
  sfg2_int_wt?: number;
  cnt_code?: string;
  cnt_qty?: number;
  cnt_deduct?: number;
  polybag_code?: string;
  polybag_qty?: number;
  polybag_deduct?: number;
  bopp1_code?: string;
  bopp1_qty?: number;
  bopp1_deduct?: number;
  bopp2_code?: string;
  bopp2_qty?: number;
  bopp2_deduct?: number;
  qc_check: boolean;
  remarks?: string;
  created_at: string;
}

export interface BOMData {
  id: string;
  item_code: string;
  item_name?: string;
  party_name?: string;
  pack_size: string;
  sfg_1?: string;
  sfg_1_qty?: number;
  sfg_2?: string;
  sfg_2_qty?: number;
  cnt_code?: string;
  cnt_qty?: number;
  polybag_code?: string;
  poly_qty?: number;
  bopp_1?: string;
  qty_meter?: number;
  bopp_2?: string;
  qty_meter_2?: number;
  category: 'FG' | 'LOCAL';
}

// ============================================================================
// GET ALL FG TRANSFER NOTES
// ============================================================================
export async function getAllFGTransferNotes(): Promise<FGTransferNote[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('production_fg_transfer_note')
    .select('*')
    .order('date', { ascending: false })
    .order('doc_no', { ascending: false });

  if (error) {
    console.error('Error fetching FG Transfer Notes:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// GET FG TRANSFER NOTE BY ID WITH ITEMS
// ============================================================================
export async function getFGTransferNoteById(id: string): Promise<{ note: FGTransferNote; items: FGTransferNoteItem[] } | null> {
  const supabase = getSupabaseClient();
  const { data: note, error: noteError } = await supabase
    .from('production_fg_transfer_note')
    .select('*')
    .eq('id', id)
    .single();

  if (noteError) {
    console.error('Error fetching FG Transfer Note:', noteError);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('production_fg_transfer_note_items')
    .select('*')
    .eq('transfer_note_id', id)
    .order('sl_no', { ascending: true });

  if (itemsError) {
    console.error('Error fetching FG Transfer Note items:', itemsError);
    return null;
  }

  return { note, items: items || [] };
}

// ============================================================================
// CREATE FG TRANSFER NOTE
// ============================================================================
export async function createFGTransferNote(
  note: Omit<FGTransferNote, 'id' | 'created_at' | 'updated_at' | 'stock_status' | 'posted_at' | 'posted_by'>,
  items: Omit<FGTransferNoteItem, 'id' | 'transfer_note_id' | 'created_at'>[]
): Promise<FGTransferNote> {
  // Create the header
  const supabase = getSupabaseClient();
  const { data: newNote, error: noteError } = await supabase
    .from('production_fg_transfer_note')
    .insert([{ ...note, stock_status: 'DRAFT' }])
    .select()
    .single();

  if (noteError) {
    console.error('Error creating FG Transfer Note:', noteError);
    throw noteError;
  }

  // Create items
  if (items.length > 0) {
    const itemsToInsert = items.map((item, index) => ({
      ...item,
      transfer_note_id: newNote.id,
      sl_no: index + 1
    }));

    const { error: itemsError } = await supabase
      .from('production_fg_transfer_note_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Rollback header
      await supabase.from('production_fg_transfer_note').delete().eq('id', newNote.id);
      console.error('Error creating FG Transfer Note items:', itemsError);
      throw itemsError;
    }
  }

  return newNote;
}

// ============================================================================
// UPDATE FG TRANSFER NOTE
// ============================================================================
export async function updateFGTransferNote(
  id: string,
  note: Partial<FGTransferNote>,
  items?: Omit<FGTransferNoteItem, 'id' | 'transfer_note_id' | 'created_at'>[]
): Promise<FGTransferNote> {
  // Check if already posted
  const supabase = getSupabaseClient();
  const { data: existing } = await supabase
    .from('production_fg_transfer_note')
    .select('stock_status')
    .eq('id', id)
    .single();

  if (existing?.stock_status === 'POSTED') {
    throw new Error('Cannot update a posted FG Transfer Note');
  }

  // Update header
  const { data: updatedNote, error: noteError } = await supabase
    .from('production_fg_transfer_note')
    .update({ ...note, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (noteError) {
    console.error('Error updating FG Transfer Note:', noteError);
    throw noteError;
  }

  // Update items if provided
  if (items !== undefined) {
    // Delete existing items
    await supabase.from('production_fg_transfer_note_items').delete().eq('transfer_note_id', id);

    // Insert new items
    if (items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        ...item,
        transfer_note_id: id,
        sl_no: index + 1
      }));

      const { error: itemsError } = await supabase
        .from('production_fg_transfer_note_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error updating FG Transfer Note items:', itemsError);
        throw itemsError;
      }
    }
  }

  return updatedNote;
}

// ============================================================================
// DELETE FG TRANSFER NOTE
// ============================================================================
export async function deleteFGTransferNote(id: string): Promise<void> {
  // Check if already posted
  const supabase = getSupabaseClient();
  const { data: existing } = await supabase
    .from('production_fg_transfer_note')
    .select('stock_status')
    .eq('id', id)
    .single();

  if (existing?.stock_status === 'POSTED') {
    throw new Error('Cannot delete a posted FG Transfer Note');
  }

  const { error } = await supabase
    .from('production_fg_transfer_note')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting FG Transfer Note:', error);
    throw error;
  }
}

// ============================================================================
// GET ALL BOM DATA (FG + LOCAL)
// ============================================================================
export async function getAllBOMData(): Promise<BOMData[]> {
  // Fetch FG BOM
  const supabase = getSupabaseClient();
  const { data: fgData, error: fgError } = await supabase
    .from('fg_bom_with_versions')
    .select('*');

  if (fgError) {
    console.error('Error fetching FG BOM:', fgError);
    throw fgError;
  }

  // Fetch LOCAL BOM
  const { data: localData, error: localError } = await supabase
    .from('local_bom_with_versions')
    .select('*');

  if (localError) {
    console.error('Error fetching LOCAL BOM:', localError);
    throw localError;
  }

  // Combine and return
  const combined: BOMData[] = [
    ...(fgData || []).map((item: BOMData) => ({ ...item, category: 'FG' as const })),
    ...(localData || []).map((item: BOMData) => ({ ...item, category: 'LOCAL' as const }))
  ];

  return combined;
}

// ============================================================================
// GET INT_WT FROM MOLD MASTER VIA SFG BOM
// ============================================================================
// Normalize mold name for comparison (handles case, dashes, spacing variations)
function normalizeMoldName(name: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
}

export async function getIntWtForSFG(sfgCode: string): Promise<number | null> {
  if (!sfgCode) return null;

  // Get item_name (mold name) from sfg_bom
  const supabase = getSupabaseClient();
  const { data: sfgData, error: sfgError } = await supabase
    .from('sfg_bom')
    .select('item_name')
    .eq('sfg_code', sfgCode)
    .single();

  if (sfgError || !sfgData?.item_name) {
    console.error(`SFG ${sfgCode} not found in sfg_bom`);
    return null;
  }

  const moldNameFromSfg = sfgData.item_name.trim();
  
  // Try exact match first
  let { data: moldData, error: moldError } = await supabase
    .from('molds')
    .select('int_wt, mold_name')
    .eq('mold_name', moldNameFromSfg)
    .maybeSingle();

  if (!moldError && moldData?.int_wt !== undefined) {
    return moldData.int_wt;
  }

  // If exact match fails, try case-insensitive match
  const { data: allMolds, error: allMoldsError } = await supabase
    .from('molds')
    .select('int_wt, mold_name');

  if (!allMoldsError && allMolds) {
    // Try case-insensitive exact match
    const caseInsensitiveMatch = allMolds.find(
      mold => mold.mold_name?.trim().toLowerCase() === moldNameFromSfg.toLowerCase()
    );
    
    if (caseInsensitiveMatch?.int_wt !== undefined) {
      console.warn(`⚠️ [getIntWtForSFG] Case-insensitive match found: "${moldNameFromSfg}" matched "${caseInsensitiveMatch.mold_name}"`);
      return caseInsensitiveMatch.int_wt;
    }
    
    // Try normalized match (handles dash/format variations)
    const normalizedSfgName = normalizeMoldName(moldNameFromSfg);
    const normalizedMatch = allMolds.find(mold => {
      const normalizedMoldName = normalizeMoldName(mold.mold_name || '');
      return normalizedMoldName === normalizedSfgName && normalizedMoldName !== '';
    });
    
    if (normalizedMatch?.int_wt !== undefined) {
      console.warn(`⚠️ [getIntWtForSFG] Normalized match found: "${moldNameFromSfg}" matched "${normalizedMatch.mold_name}" (dash/format variation)`);
      return normalizedMatch.int_wt;
    }
  }

  // No match found
  console.error(`Mold ${moldNameFromSfg} not found in molds (tried exact, case-insensitive, and normalized matching)`);
  return null;
}

// ============================================================================
// GET ALL COLORS FROM COLOR_LABEL_MASTER
// ============================================================================
export async function getAllColors(): Promise<{ id: string; color_label: string }[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('color_label_master')
    .select('id, color_label')
    .order('sr_no', { ascending: true });

  if (error) {
    console.error('Error fetching colors:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// GET ALL PARTIES FROM PARTY_NAME_MASTER
// ============================================================================
export async function getAllParties(): Promise<{ id: string; name: string }[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('party_name_master')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching parties:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// GENERATE NEXT DOC NUMBER
// ============================================================================
// Note: This function is kept for backward compatibility but should use
// formCodeUtils.generateDocumentNumber instead
export async function generateNextDocNo(date: string): Promise<string> {
  // Import here to avoid circular dependency
  const { generateDocumentNumber, FORM_CODES } = await import('../../utils/formCodeUtils');
  return generateDocumentNumber(FORM_CODES.FG_TRANSFER_NOTE, date);
}

// ============================================================================
// CALCULATE TOTAL QTY IN TONS
// ============================================================================
export function calculateTotalQtyTon(
  sfg1Qty: number | undefined,
  sfg1IntWt: number | undefined,
  sfg2Qty: number | undefined,
  sfg2IntWt: number | undefined,
  qtyBoxes: number
): number {
  const sfg1Weight = (sfg1Qty || 0) * (sfg1IntWt || 0);
  const sfg2Weight = (sfg2Qty || 0) * (sfg2IntWt || 0);
  const totalGrams = (sfg1Weight + sfg2Weight) * qtyBoxes;
  return totalGrams / 1000000; // Convert grams to tons
}

