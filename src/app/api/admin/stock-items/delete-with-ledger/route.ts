// ============================================================================
// ADMIN API: Delete Stock Items WITH Ledger Entries
// POST - Permanently delete stock items AND all related ledger/balance entries
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const supabase = getSupabase();
    const body = await request.json();
    
    const { item_ids } = body;
    
    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'item_ids array is required'
      }, { status: 400 });
    }
    
    const results = {
      deleted: 0,
      errors: [] as string[]
    };
    
    // Delete in order: ledger → balances → stock_items
    for (const itemId of item_ids) {
      try {
        // Step 1: Get item_code before deletion for error messages
        const { data: stockItem } = await supabase
          .from('stock_items')
          .select('item_code, item_name')
          .eq('id', itemId)
          .single();
        
        const itemCode = stockItem?.item_code || `ID:${itemId}`;
        
        // Step 2: Delete all stock_ledger entries for this item
        const { error: ledgerError, count: ledgerCount } = await supabase
          .from('stock_ledger')
          .delete()
          .eq('item_id', itemId);
        
        if (ledgerError) {
          results.errors.push(`Failed to delete ledger entries for ${itemCode}: ${ledgerError.message}`);
          continue;
        }
        
        // Step 3: Delete all stock_balances entries for this item
        const { error: balanceError, count: balanceCount } = await supabase
          .from('stock_balances')
          .delete()
          .eq('item_id', itemId);
        
        if (balanceError) {
          results.errors.push(`Failed to delete balance entries for ${itemCode}: ${balanceError.message}`);
          continue;
        }
        
        // Step 4: Delete the stock item itself
        const { error: itemError } = await supabase
          .from('stock_items')
          .delete()
          .eq('id', itemId);
        
        if (itemError) {
          results.errors.push(`Failed to delete stock item ${itemCode}: ${itemError.message}`);
          continue;
        }
        
        results.deleted++;
        console.log(`Deleted ${itemCode}: ${ledgerCount || 0} ledger entries, ${balanceCount || 0} balance entries`);
      } catch (err) {
        results.errors.push(`Error processing item ${itemId}: ${err}`);
      }
    }
    
    const hasErrors = results.errors.length > 0;
    const hasSuccess = results.deleted > 0;
    
    return NextResponse.json({
      success: hasSuccess && !hasErrors,
      partial: hasSuccess && hasErrors,
      data: results,
      message: `Deleted ${results.deleted} item(s) with all ledger and balance entries${results.errors.length > 0 ? `, ${results.errors.length} failed` : ''}`
    }, { status: hasSuccess ? 200 : 400 });
  } catch (error) {
    console.error('Error in delete with ledger:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
