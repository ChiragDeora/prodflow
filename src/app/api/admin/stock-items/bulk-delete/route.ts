// ============================================================================
// ADMIN API: Bulk Hard Delete Stock Items
// POST - Permanently delete stock items and related data
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
    
    const { item_ids, hard_delete = false } = body;
    
    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'item_ids array is required'
      }, { status: 400 });
    }
    
    const results = {
      soft_deleted: 0,
      hard_deleted: 0,
      errors: [] as string[]
    };
    
    if (hard_delete) {
      // HARD DELETE - Only delete stock_items (NOT ledger entries)
      // Note: This will fail if items have ledger entries due to foreign key constraints
      // Use the separate ledger cleanup script if you need to delete ledger entries first
      
      for (const itemId of item_ids) {
        try {
          // Check if item has ledger entries
          const { data: ledgerCheck } = await supabase
            .from('stock_ledger')
            .select('id')
            .eq('item_id', itemId)
            .limit(1);
          
          if (ledgerCheck && ledgerCheck.length > 0) {
            results.errors.push(`Cannot delete item ${itemId}: Has ${ledgerCheck.length}+ ledger entries. Use ledger cleanup script first.`);
            continue;
          }
          
          // Delete stock_balances (safe to delete)
          await supabase
            .from('stock_balances')
            .delete()
            .eq('item_id', itemId);
          
          // Delete the stock item
          const { error: itemError } = await supabase
            .from('stock_items')
            .delete()
            .eq('id', itemId);
          
          if (itemError) {
            results.errors.push(`Failed to delete stock item ${itemId}: ${itemError.message}`);
            continue;
          }
          
          results.hard_deleted++;
        } catch (err) {
          results.errors.push(`Error processing item ${itemId}: ${err}`);
        }
      }
    } else {
      // SOFT DELETE - Just set is_active to false
      const { data, error } = await supabase
        .from('stock_items')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .in('id', item_ids)
        .select();
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
      
      results.soft_deleted = data?.length || 0;
    }
    
    const hasErrors = results.errors.length > 0;
    const hasSuccess = results.soft_deleted > 0 || results.hard_deleted > 0;
    
    return NextResponse.json({
      success: hasSuccess && !hasErrors,
      partial: hasSuccess && hasErrors,
      data: results,
      message: hard_delete
        ? `Hard deleted ${results.hard_deleted} item(s)${results.errors.length > 0 ? `, ${results.errors.length} failed` : ''}`
        : `Soft deleted ${results.soft_deleted} item(s)`
    }, { status: hasSuccess ? 200 : 400 });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
