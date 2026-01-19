// ============================================================================
// ADMIN API: Clean Stock Ledger Entries
// POST - Delete stock ledger entries (separate from stock items deletion)
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
    
    const { 
      item_ids, 
      item_codes, 
      document_types, 
      date_from, 
      date_to,
      delete_all = false 
    } = body;
    
    if (delete_all) {
      // NUCLEAR OPTION - Delete all ledger entries
      const { error } = await supabase
        .from('stock_ledger')
        .delete()
        .neq('id', 0); // Delete all (neq id 0 means all records)
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'All stock ledger entries deleted',
        deleted_count: 'all'
      });
    }
    
    let query = supabase.from('stock_ledger').delete();
    
    // Build query based on filters
    if (item_ids && item_ids.length > 0) {
      query = query.in('item_id', item_ids);
    }
    
    if (item_codes && item_codes.length > 0) {
      query = query.in('item_code', item_codes);
    }
    
    if (document_types && document_types.length > 0) {
      query = query.in('document_type', document_types);
    }
    
    if (date_from) {
      query = query.gte('transaction_date', date_from);
    }
    
    if (date_to) {
      query = query.lte('transaction_date', date_to);
    }
    
    const { error, count } = await query;
    
    if (error) {
      handleSupabaseError(error, 'cleaning stock ledger');
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Deleted ledger entries`,
      deleted_count: count || 'unknown'
    });
  } catch (error) {
    console.error('Error cleaning stock ledger:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// GET - Preview what will be deleted
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    
    const item_ids = searchParams.get('item_ids')?.split(',').map(Number);
    const item_codes = searchParams.get('item_codes')?.split(',');
    const document_types = searchParams.get('document_types')?.split(',');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    
    let query = supabase
      .from('stock_ledger')
      .select('id, item_code, document_type, transaction_date, quantity', { count: 'exact' });
    
    if (item_ids && item_ids.length > 0) {
      query = query.in('item_id', item_ids);
    }
    
    if (item_codes && item_codes.length > 0) {
      query = query.in('item_code', item_codes);
    }
    
    if (document_types && document_types.length > 0) {
      query = query.in('document_type', document_types);
    }
    
    if (date_from) {
      query = query.gte('transaction_date', date_from);
    }
    
    if (date_to) {
      query = query.lte('transaction_date', date_to);
    }
    
    const { data, error, count } = await query.limit(100);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      count: count || 0,
      preview: data || [],
      message: `Found ${count || 0} entries matching criteria`
    });
  } catch (error) {
    console.error('Error previewing stock ledger:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
