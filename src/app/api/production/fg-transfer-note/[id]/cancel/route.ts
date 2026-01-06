// ============================================================================
// POST /api/production/fg-transfer-note/[id]/cancel
// Cancels/reverses FG Transfer Note stock postings
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'FG Transfer Note ID is required' } },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const cancelledBy = body.cancelled_by || 'system';
    const reason = body.reason || 'Cancelled by user';

    // Get the FG Transfer Note
    const { data: note, error: noteError } = await supabase
      .from('production_fg_transfer_note')
      .select('*')
      .eq('id', id)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'FG Transfer Note not found' } },
        { status: 404 }
      );
    }

    if (note.stock_status !== 'POSTED') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_POSTED', message: 'FG Transfer Note is not posted' } },
        { status: 400 }
      );
    }

    // Find all stock ledger entries for this document
    const { data: ledgerEntries, error: ledgerError } = await supabase
      .from('stock_ledger')
      .select('*')
      .eq('reference_id', id)
      .eq('transaction_type', 'FG_TRANSFER');

    if (ledgerError) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to fetch ledger entries' } },
        { status: 500 }
      );
    }

    // Reverse each entry
    let entriesReversed = 0;
    
    for (const entry of ledgerEntries || []) {
      // Get current balance
      const { data: balanceData } = await supabase
        .from('stock_balances')
        .select('balance')
        .eq('item_code', entry.item_code)
        .eq('location', entry.location)
        .single();

      const currentBalance = balanceData?.balance || 0;
      const reversalQty = -entry.quantity; // Reverse the original quantity
      const newBalance = currentBalance + reversalQty;

      // Create reversal ledger entry
      await supabase.from('stock_ledger').insert({
        item_code: entry.item_code,
        location: entry.location,
        transaction_type: 'FG_TRANSFER_CANCEL',
        quantity: reversalQty,
        balance_after: newBalance,
        reference_no: note.doc_no,
        reference_id: id,
        remarks: `Cancellation: ${reason}`,
        created_by: cancelledBy,
        transaction_date: new Date().toISOString()
      });

      // Update balance
      await supabase
        .from('stock_balances')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('item_code', entry.item_code)
        .eq('location', entry.location);

      entriesReversed++;
    }

    // Update FG Transfer Note status
    await supabase
      .from('production_fg_transfer_note')
      .update({
        stock_status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      entries_reversed: entriesReversed,
      message: `Successfully cancelled FG Transfer Note. ${entriesReversed} entries reversed.`
    });

  } catch (error) {
    console.error('Error cancelling FG Transfer Note:', error);
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

