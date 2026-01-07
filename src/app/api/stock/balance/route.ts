// ============================================================================
// GET /api/stock/balance
// Query stock balances with optional filters
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getStockBalances, getTotalBalance, getStockSummaryByLocation } from '@/lib/stock';
import type { LocationCode, ItemType } from '@/lib/supabase/types/stock';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  // Verify authentication
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { searchParams } = new URL(request.url);
    
    const itemCode = searchParams.get('item_code') || undefined;
    const locationCode = searchParams.get('location') as LocationCode | undefined;
    const itemType = searchParams.get('item_type') as ItemType | undefined;
    const summary = searchParams.get('summary') === 'true';
    const total = searchParams.get('total') === 'true';
    
    // If total is requested with item_code, return total balance across locations
    if (total && itemCode) {
      const result = await getTotalBalance(itemCode);
      return NextResponse.json(result, { status: 200 });
    }
    
    // If summary is requested, return summary by location
    if (summary) {
      const result = await getStockSummaryByLocation();
      return NextResponse.json(result, { status: 200 });
    }
    
    // Otherwise, return balances with filters
    console.log('📊 [API /stock/balance] Fetching balances with filters:', {
      item_code: itemCode,
      location_code: locationCode,
      item_type: itemType
    });
    
    const result = await getStockBalances({
      item_code: itemCode,
      location_code: locationCode,
      item_type: itemType,
    });
    
    console.log('📊 [API /stock/balance] Result:', {
      count: result.length,
      sample: result.slice(0, 3)
    });
    
    // If no results and item_type filter is applied, check if there are any stock items at all
    if (result.length === 0 && itemType) {
      const supabase = (await import('@/lib/supabase/utils')).getSupabase();
      const { data: stockItemsCheck, error: checkError } = await supabase
        .from('stock_items')
        .select('item_code, item_name, item_type, is_active')
        .eq('item_type', itemType)
        .eq('is_active', true)
        .limit(5);
      
      console.log('🔍 [API /stock/balance] Diagnostic - Stock items check:', {
        found: stockItemsCheck?.length || 0,
        items: stockItemsCheck,
        error: checkError
      });
      
      // Check if there are any balances at all for this item type
      const { data: balancesCheck, error: balancesError } = await supabase
        .from('stock_balances')
        .select('item_code, location_code, current_balance')
        .limit(5);
      
      console.log('🔍 [API /stock/balance] Diagnostic - Stock balances check:', {
        found: balancesCheck?.length || 0,
        balances: balancesCheck,
        error: balancesError
      });
    }
    
    return NextResponse.json({
      success: true,
      count: result.length,
      data: result,
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching stock balances:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

