// ============================================================================
// JOB WORK CHALLAN HELPER FUNCTIONS
// ============================================================================
// Shared utility functions for Job Work Challan operations
// Used by both frontend (form) and backend (posting) code
// ============================================================================

import { getSupabase } from '../supabase/utils';

// Helper function to normalize mold name for matching
function normalizeMoldName(name: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
}

/**
 * Get rp_bill_wt (bill weight) for SFG code
 * Used for customer-facing weight calculations in challan
 */
export async function getBillWtForSFG(sfgCode: string): Promise<number | null> {
  if (!sfgCode) return null;

  // Get item_name (mold name) from sfg_bom
  const supabase = getSupabase();
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
    .select('rp_bill_wt, mold_name')
    .eq('mold_name', moldNameFromSfg)
    .maybeSingle();

  if (!moldError && moldData?.rp_bill_wt !== undefined) {
    return moldData.rp_bill_wt;
  }

  // If exact match fails, try case-insensitive match
  const { data: allMolds, error: allMoldsError } = await supabase
    .from('molds')
    .select('rp_bill_wt, mold_name');

  if (!allMoldsError && allMolds) {
    // Try case-insensitive exact match
    const caseInsensitiveMatch = allMolds.find(
      (mold: any) => mold.mold_name?.trim().toLowerCase() === moldNameFromSfg.toLowerCase()
    );
    
    if (caseInsensitiveMatch?.rp_bill_wt !== undefined) {
      console.warn(`⚠️ [getBillWtForSFG] Case-insensitive match found: "${moldNameFromSfg}" matched "${caseInsensitiveMatch.mold_name}"`);
      return caseInsensitiveMatch.rp_bill_wt;
    }
    
    // Try normalized match (handles dash/format variations)
    const normalizedSfgName = normalizeMoldName(moldNameFromSfg);
    const normalizedMatch = allMolds.find((mold: any) => {
      const normalizedMoldName = normalizeMoldName(mold.mold_name || '');
      return normalizedMoldName === normalizedSfgName && normalizedMoldName !== '';
    });
    
    if (normalizedMatch?.rp_bill_wt !== undefined) {
      console.warn(`⚠️ [getBillWtForSFG] Normalized match found: "${moldNameFromSfg}" matched "${normalizedMatch.mold_name}" (dash/format variation)`);
      return normalizedMatch.rp_bill_wt;
    }
  }

  // No match found
  console.error(`Mold ${moldNameFromSfg} not found in molds (tried exact, case-insensitive, and normalized matching)`);
  return null;
}
