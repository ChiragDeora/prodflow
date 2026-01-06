// ============================================================================
// ADMIN API: Stock Items Management
// GET - List all stock items
// POST - Create a new stock item
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    
    const itemType = searchParams.get('item_type');
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('include_inactive') === 'true';
    
    let query = supabase
      .from('stock_items')
      .select('*')
      .order('item_type')
      .order('item_name');
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    if (itemType) {
      query = query.eq('item_type', itemType);
    }
    
    if (search) {
      query = query.or(`item_code.ilike.%${search}%,item_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      handleSupabaseError(error, 'fetching stock items');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching stock items:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    
    const { item_code, item_name, item_type, category, sub_category, unit_of_measure, for_machine, for_mold, min_stock_level, reorder_qty } = body;
    
    // Validate required fields
    if (!item_code || !item_name || !item_type || !unit_of_measure) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: item_code, item_name, item_type, unit_of_measure'
      }, { status: 400 });
    }
    
    // Validate item_type
    if (!['RM', 'PM', 'SFG', 'FG', 'SPARE'].includes(item_type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid item_type. Must be one of: RM, PM, SFG, FG, SPARE'
      }, { status: 400 });
    }
    
    // Validate unit_of_measure
    if (!['KG', 'NOS', 'METERS', 'PCS', 'LTR', 'MTR', 'SET'].includes(unit_of_measure)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid unit_of_measure. Must be one of: KG, NOS, METERS, PCS, LTR, MTR, SET'
      }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('stock_items')
      .insert({
        item_code,
        item_name,
        item_type,
        category: category || null,
        sub_category: sub_category || null,
        unit_of_measure,
        for_machine: for_machine || null,
        for_mold: for_mold || null,
        min_stock_level: min_stock_level || 0,
        reorder_qty: reorder_qty || 0,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({
          success: false,
          error: `Stock item with code "${item_code}" already exists`
        }, { status: 409 });
      }
      handleSupabaseError(error, 'creating stock item');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: `Stock item "${item_code}" created successfully`
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating stock item:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

