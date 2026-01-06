// ============================================================================
// SPARE PARTS MASTER API - Single Item Operations
// GET - Get a single spare part
// PUT - Update a spare part
// DELETE - Soft delete a spare part
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('id', id)
      .eq('item_type', 'SPARE')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Spare part not found'
        }, { status: 404 });
      }
      handleSupabaseError(error, 'fetching spare part');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching spare part:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = await request.json();
    
    const { 
      item_name, 
      category, 
      sub_category, 
      for_machine, 
      for_mold, 
      unit_of_measure, 
      min_stock_level, 
      reorder_qty,
      is_active 
    } = body;
    
    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    
    if (item_name !== undefined) updateData.item_name = item_name;
    if (category !== undefined) updateData.category = category;
    if (sub_category !== undefined) updateData.sub_category = sub_category;
    if (for_machine !== undefined) updateData.for_machine = for_machine;
    if (for_mold !== undefined) updateData.for_mold = for_mold;
    if (unit_of_measure !== undefined) {
      // Validate unit_of_measure
      if (!['KG', 'NOS', 'METERS', 'PCS', 'LTR', 'MTR', 'SET'].includes(unit_of_measure)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid unit_of_measure. Must be one of: KG, NOS, METERS, PCS, LTR, MTR, SET'
        }, { status: 400 });
      }
      updateData.unit_of_measure = unit_of_measure;
    }
    if (min_stock_level !== undefined) updateData.min_stock_level = min_stock_level;
    if (reorder_qty !== undefined) updateData.reorder_qty = reorder_qty;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update'
      }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('stock_items')
      .update(updateData)
      .eq('id', id)
      .eq('item_type', 'SPARE')
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Spare part not found'
        }, { status: 404 });
      }
      handleSupabaseError(error, 'updating spare part');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: `Spare part updated successfully`
    });
  } catch (error) {
    console.error('Error updating spare part:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    
    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('stock_items')
      .update({ is_active: false })
      .eq('id', id)
      .eq('item_type', 'SPARE')
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Spare part not found'
        }, { status: 404 });
      }
      handleSupabaseError(error, 'deleting spare part');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Spare part "${data.item_name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting spare part:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


