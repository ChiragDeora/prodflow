// ============================================================================
// ADMIN API: Single Stock Item Management
// GET - Get a single stock item
// PUT - Update a stock item
// DELETE - Deactivate a stock item
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Stock item not found' }, { status: 404 });
      }
      handleSupabaseError(error, 'fetching stock item');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching stock item:', error);
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
    const { id } = await params;
    const supabase = getSupabase();
    const body = await request.json();
    
    const { item_name, category, sub_category, unit_of_measure, is_active } = body;
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    
    if (item_name !== undefined) updateData.item_name = item_name;
    if (category !== undefined) updateData.category = category;
    if (sub_category !== undefined) updateData.sub_category = sub_category;
    if (unit_of_measure !== undefined) updateData.unit_of_measure = unit_of_measure;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const { data, error } = await supabase
      .from('stock_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'updating stock item');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Stock item updated successfully'
    });
  } catch (error) {
    console.error('Error updating stock item:', error);
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
    const { id } = await params;
    const supabase = getSupabase();
    
    // Soft delete - just set is_active to false
    const { data, error } = await supabase
      .from('stock_items')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      handleSupabaseError(error, 'deleting stock item');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Stock item deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting stock item:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


