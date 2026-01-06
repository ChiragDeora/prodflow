// ============================================================================
// ADMIN API: Fetch all master data for stock testing
// GET - Returns RM, PM, SFG BOM, and existing stock items
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Fetch SFG BOM data
    const { data: sfgBom, error: sfgError } = await supabase
      .from('sfg_bom')
      .select('sfg_code, item_name, hp_percentage, icp_percentage, rcp_percentage, ldpe_percentage, gpps_percentage, mb_percentage')
      .order('sfg_code')
      .limit(50);
    
    if (sfgError) {
      console.error('Error fetching sfg_bom:', sfgError);
    }
    
    // Fetch Raw Materials
    const { data: rawMaterials, error: rmError } = await supabase
      .from('raw_materials')
      .select('category, type, grade, supplier')
      .order('category')
      .limit(50);
    
    if (rmError) {
      console.error('Error fetching raw_materials:', rmError);
    }
    
    // Fetch Packing Materials
    const { data: packingMaterials, error: pmError } = await supabase
      .from('packing_materials')
      .select('*')
      .limit(50);
    
    if (pmError) {
      console.error('Error fetching packing_materials:', pmError);
    }
    
    // Fetch existing stock items
    const { data: stockItems, error: siError } = await supabase
      .from('stock_items')
      .select('id, item_code, item_name, item_type, unit_of_measure, is_active')
      .order('item_type')
      .order('item_code')
      .limit(100);
    
    if (siError) {
      console.error('Error fetching stock_items:', siError);
    }
    
    // Format RM data with item codes
    const formattedRm = (rawMaterials || []).map(rm => ({
      item_code: `${rm.category}-${rm.type}-${rm.grade}`,
      item_name: `${rm.category} ${rm.type} ${rm.grade} (${rm.supplier})`,
      category: rm.category,
      sub_category: rm.type,
      supplier: rm.supplier,
      item_type: 'RM',
      unit_of_measure: 'KG'
    }));
    
    // Format SFG data
    const formattedSfg = (sfgBom || []).map(sfg => ({
      item_code: sfg.sfg_code,
      item_name: sfg.item_name,
      hp_percentage: sfg.hp_percentage,
      icp_percentage: sfg.icp_percentage,
      rcp_percentage: sfg.rcp_percentage,
      ldpe_percentage: sfg.ldpe_percentage,
      gpps_percentage: sfg.gpps_percentage,
      mb_percentage: sfg.mb_percentage,
      item_type: 'SFG',
      unit_of_measure: 'NOS'
    }));
    
    // Standard RM types for DPR posting
    const standardRmTypes = [
      { item_code: 'RM-HP', item_name: 'Raw Material - HP (Homo Polymer)', item_type: 'RM', unit_of_measure: 'KG', category: 'PP', sub_category: 'HP' },
      { item_code: 'RM-ICP', item_name: 'Raw Material - ICP (Impact Copolymer)', item_type: 'RM', unit_of_measure: 'KG', category: 'PP', sub_category: 'ICP' },
      { item_code: 'RM-RCP', item_name: 'Raw Material - RCP (Random Copolymer)', item_type: 'RM', unit_of_measure: 'KG', category: 'PP', sub_category: 'RCP' },
      { item_code: 'RM-LDPE', item_name: 'Raw Material - LDPE', item_type: 'RM', unit_of_measure: 'KG', category: 'PE', sub_category: 'LDPE' },
      { item_code: 'RM-GPPS', item_name: 'Raw Material - GPPS', item_type: 'RM', unit_of_measure: 'KG', category: 'PS', sub_category: 'GPPS' },
      { item_code: 'RM-MB', item_name: 'Raw Material - Masterbatch', item_type: 'RM', unit_of_measure: 'KG', category: 'MB', sub_category: 'MB' },
      { item_code: 'REGRIND', item_name: 'Regrind Material', item_type: 'RM', unit_of_measure: 'KG', category: 'REGRIND', sub_category: null },
    ];
    
    return NextResponse.json({
      success: true,
      data: {
        sfg_bom: formattedSfg,
        raw_materials: formattedRm,
        standard_rm_types: standardRmTypes,
        packing_materials: packingMaterials || [],
        existing_stock_items: stockItems || [],
      },
      counts: {
        sfg_bom: formattedSfg.length,
        raw_materials: formattedRm.length,
        packing_materials: (packingMaterials || []).length,
        existing_stock_items: (stockItems || []).length,
      },
      message: 'Use these item codes when adding stock items or opening stock'
    });
  } catch (error) {
    console.error('Error fetching master data:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


