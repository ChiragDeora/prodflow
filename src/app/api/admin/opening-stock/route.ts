// ============================================================================
// ADMIN API: Opening Stock Management
// POST - Add opening stock balance for an item at a location
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, handleSupabaseError } from '@/lib/supabase/utils';
import { verifyAuth, unauthorized } from '@/lib/api-auth';
import { randomUUID } from 'crypto';

interface OpeningStockEntry {
  item_code: string;
  location_code: 'STORE' | 'PRODUCTION' | 'FG_STORE';
  quantity: number;
  transaction_date?: string;
  remarks?: string;
  posted_by?: string;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const supabase = getSupabase();
    const body = await request.json();
    
    const entries: OpeningStockEntry[] = Array.isArray(body) ? body : [body];
    
    if (entries.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No entries provided'
      }, { status: 400 });
    }
    
    const results: { success: string[]; errors: string[] } = { success: [], errors: [] };
    
    for (const entry of entries) {
      const { item_code, location_code, quantity, transaction_date, remarks, posted_by } = entry;
      
      // Validate required fields
      if (!item_code || !location_code || quantity === undefined || quantity === null) {
        results.errors.push(`Missing required fields for ${item_code || 'unknown item'}`);
        continue;
      }
      
      // Validate location
      if (!['STORE', 'PRODUCTION', 'FG_STORE'].includes(location_code)) {
        results.errors.push(`Invalid location "${location_code}" for ${item_code}`);
        continue;
      }
      
      // Get stock item to validate and get item_id
      const { data: stockItem, error: itemError } = await supabase
        .from('stock_items')
        .select('id, item_code, item_name, unit_of_measure')
        .eq('item_code', item_code)
        .eq('is_active', true)
        .single();
      
      if (itemError || !stockItem) {
        results.errors.push(`Stock item "${item_code}" not found or inactive`);
        continue;
      }
      
      // Use provided transaction_date or default to today
      const transactionDate = transaction_date || new Date().toISOString().split('T')[0];
      // Simplified document number format: OPEN-YYYYMMDD-ITEMCODE
      const dateStr = transactionDate.replace(/-/g, '');
      const documentNumber = `OPEN-${dateStr}-${item_code}`;
      const documentId = randomUUID(); // Generate proper UUID
      
      // Check if balance already exists - use maybeSingle to avoid error
      const { data: existingBalance, error: balanceCheckError } = await supabase
        .from('stock_balances')
        .select('*')
        .eq('item_code', item_code)
        .eq('location_code', location_code)
        .maybeSingle();
      
      if (balanceCheckError && balanceCheckError.code !== 'PGRST116') {
        results.errors.push(`Error checking balance for ${item_code}: ${balanceCheckError.message}`);
        continue;
      }
      
      const currentBalance = existingBalance?.current_balance || 0;
      const newBalance = currentBalance + quantity;
      
      // Create ledger entry for opening stock
      const { error: ledgerError } = await supabase
        .from('stock_ledger')
        .insert({
          item_id: stockItem.id,
          item_code: stockItem.item_code,
          location_code,
          quantity: Math.abs(quantity),
          unit_of_measure: stockItem.unit_of_measure,
          balance_after: newBalance,
          transaction_date: transactionDate,
          document_type: 'OPENING',
          document_id: documentId,
          document_number: documentNumber,
          movement_type: quantity >= 0 ? 'IN' : 'OUT',
          posted_by: posted_by || 'yogesh',
          remarks: remarks || `Opening stock entry for ${stockItem.item_name} - added by yogesh`
        });
      
      if (ledgerError) {
        results.errors.push(`Error creating ledger entry for ${item_code}: ${ledgerError.message}`);
        continue;
      }
      
      // Update or insert balance
      if (existingBalance) {
        const { error: updateError } = await supabase
          .from('stock_balances')
          .update({
            current_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('item_code', item_code)
          .eq('location_code', location_code);
        
        if (updateError) {
          results.errors.push(`Error updating balance for ${item_code}: ${updateError.message}`);
          continue;
        }
      } else {
        const { error: insertError } = await supabase
          .from('stock_balances')
          .insert({
            item_id: stockItem.id,
            item_code: stockItem.item_code,
            location_code,
            current_balance: newBalance,
            unit_of_measure: stockItem.unit_of_measure
          });
        
        if (insertError) {
          results.errors.push(`Error creating balance for ${item_code}: ${insertError.message}`);
          continue;
        }
      }
      
      results.success.push(`${item_code} at ${location_code}: +${quantity} (new balance: ${newBalance})`);
    }
    
    const hasErrors = results.errors.length > 0;
    const hasSuccess = results.success.length > 0;
    
    return NextResponse.json({
      success: hasSuccess && !hasErrors,
      partial: hasSuccess && hasErrors,
      data: {
        processed: results.success.length,
        failed: results.errors.length,
        successMessages: results.success,
        errorMessages: results.errors
      },
      message: hasSuccess 
        ? `Successfully added opening stock for ${results.success.length} item(s)`
        : 'Failed to add opening stock'
    }, { status: hasSuccess ? 200 : 400 });
  } catch (error) {
    console.error('Error adding opening stock:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// GET - List all opening stock entries
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const { data, error } = await supabase
      .from('stock_ledger')
      .select(`
        *,
        stock_items:item_id (
          item_name,
          item_type,
          category
        )
      `)
      .eq('document_type', 'OPENING')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      handleSupabaseError(error, 'fetching opening stock entries');
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching opening stock:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


