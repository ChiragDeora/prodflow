// ============================================================================
// GET /api/stock/ledger/fg-items
// Get FG stock items with their current stock quantities at FG_STORE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/utils';
import { verifyAuth, unauthorized } from '@/lib/api-auth';
import { getBalance } from '@/lib/stock/helpers';

export async function GET(request: NextRequest) {
  // Verify authentication
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const supabase = getSupabase();
    
    // Get all FG stock items
    const { data: stockItems, error: itemsError } = await supabase
      .from('stock_items')
      .select('id, item_code, item_name, unit_of_measure')
      .eq('item_type', 'FG')
      .eq('is_active', true)
      .order('item_code', { ascending: true });
    
    if (itemsError) {
      console.error('Error fetching FG stock items:', itemsError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: itemsError.message,
          },
        },
        { status: 500 }
      );
    }
    
    // Get stock balances for each item at FG_STORE
    const itemsWithStock = await Promise.all(
      (stockItems || []).map(async (item) => {
        try {
          const balance = await getBalance(item.item_code, 'FG_STORE');
          
          // Convert balance to Pcs and Tons based on unit_of_measure
          let stockPcs = 0;
          let stockTons = 0;
          
          if (item.unit_of_measure === 'PCS' || item.unit_of_measure === 'NOS') {
            stockPcs = balance;
            stockTons = balance / 1000; // Approximate conversion (adjust as needed)
          } else if (item.unit_of_measure === 'KG') {
            stockTons = balance / 1000;
            stockPcs = balance; // If stored in kg, use as-is for Pcs (adjust conversion as needed)
          } else {
            stockPcs = balance;
            stockTons = balance;
          }
          
          return {
            item_code: item.item_code,
            item_name: item.item_name,
            unit_of_measure: item.unit_of_measure,
            stock_pcs: Math.round(stockPcs * 100) / 100,
            stock_tons: Math.round(stockTons * 1000) / 1000,
          };
        } catch (error) {
          console.error(`Error getting balance for ${item.item_code}:`, error);
          return {
            item_code: item.item_code,
            item_name: item.item_name,
            unit_of_measure: item.unit_of_measure,
            stock_pcs: 0,
            stock_tons: 0,
          };
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      count: itemsWithStock.length,
      data: itemsWithStock,
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching FG stock items:', error);
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

