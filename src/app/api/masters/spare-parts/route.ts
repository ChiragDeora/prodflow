// ============================================================================
// SPARE PARTS MASTER API
// GET - List all spare parts
// POST - Create a new spare part
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const forMachine = searchParams.get('for_machine');
    const forMold = searchParams.get('for_mold');
    const lowStockOnly = searchParams.get('low_stock') === 'true';
    
    let query = supabase
      .from('stock_items')
      .select('*')
      .eq('item_type', 'SPARE')
      .order('category')
      .order('item_name');
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (forMachine) {
      query = query.eq('for_machine', forMachine);
    }
    
    if (forMold) {
      query = query.eq('for_mold', forMold);
    }
    
    if (search) {
      query = query.or(`item_code.ilike.%${search}%,item_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      handleSupabaseError(error, 'fetching spare parts');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    // If low stock filter is enabled, fetch balances and filter
    let filteredData = data || [];
    
    if (lowStockOnly) {
      // Get stock balances for all spare parts
      const itemCodes = filteredData.map(item => item.item_code);
      
      if (itemCodes.length > 0) {
        const { data: balances, error: balanceError } = await supabase
          .from('stock_balances')
          .select('item_code, current_balance')
          .in('item_code', itemCodes);
        
        if (!balanceError && balances) {
          // Create a map of item_code to total balance
          const balanceMap: Record<string, number> = {};
          balances.forEach(b => {
            balanceMap[b.item_code] = (balanceMap[b.item_code] || 0) + (b.current_balance || 0);
          });
          
          // Filter to only items below min stock level
          filteredData = filteredData.filter(item => {
            const totalBalance = balanceMap[item.item_code] || 0;
            const minLevel = item.min_stock_level || 0;
            return minLevel > 0 && totalBalance < minLevel;
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: filteredData,
      count: filteredData.length
    });
  } catch (error) {
    console.error('Error fetching spare parts:', error);
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
    
    const { 
      item_name, 
      category, 
      sub_category, 
      for_machine, 
      for_mold, 
      unit_of_measure, 
      min_stock_level, 
      reorder_qty,
      description 
    } = body;
    
    // Validate required fields
    if (!item_name || !category || !unit_of_measure) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: item_name, category, unit_of_measure'
      }, { status: 400 });
    }
    
    // Generate item code using the database function
    let item_code: string;
    const { data: codeResult, error: codeError } = await supabase
      .rpc('generate_spare_part_code', { p_category: category });
    
    if (codeError) {
      // Fallback to manual code generation
      console.error('Error generating code with RPC, using fallback:', codeError);
      
      // Get count of existing items in this category
      const { count } = await supabase
        .from('stock_items')
        .select('*', { count: 'exact', head: true })
        .eq('item_type', 'SPARE')
        .ilike('item_code', `SPARE-${category.slice(0, 3).toUpperCase()}-%`);
      
      const sequence = String((count || 0) + 1).padStart(3, '0');
      item_code = `SPARE-${category.slice(0, 3).toUpperCase()}-${sequence}`;
    } else {
      item_code = codeResult;
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
        item_type: 'SPARE',
        category,
        sub_category: sub_category || null,
        for_machine: for_machine || null,
        for_mold: for_mold || null,
        unit_of_measure,
        min_stock_level: min_stock_level || 0,
        reorder_qty: reorder_qty || 0,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          success: false,
          error: `Spare part with code "${item_code}" already exists`
        }, { status: 409 });
      }
      handleSupabaseError(error, 'creating spare part');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: `Spare part "${item_name}" created with code ${item_code}`
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating spare part:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

