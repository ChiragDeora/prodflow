// ============================================================================
// POST /api/production/fg-transfer-note/[id]/post
// Posts FG Transfer Note to stock ledger
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StockValidationError {
  item_code: string;
  item_name: string;
  required: number;
  available: number;
  shortage: number;
  location: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'FG Transfer Note ID is required' } },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const postedBy = body.posted_by || 'system';

    // Get the FG Transfer Note with items
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

    if (note.stock_status === 'POSTED') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_POSTED', message: 'FG Transfer Note already posted' } },
        { status: 400 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('production_fg_transfer_note_items')
      .select('*')
      .eq('transfer_note_id', id);

    if (itemsError || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_ITEMS', message: 'No items found for FG Transfer Note' } },
        { status: 400 }
      );
    }

    // Validate all items have required fields
    for (const item of items) {
      if (!item.fg_code) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `Row ${item.sl_no}: FG Code is required` } },
          { status: 400 }
        );
      }
      if (!item.color) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: `Row ${item.sl_no}: Color is required` } },
          { status: 400 }
        );
      }
    }

    // Check stock availability
    // NOTE: Only check SFG items - PM materials (carton, polybag, BOPP) are allowed to go negative
    const stockErrors: StockValidationError[] = [];
    
    for (const item of items) {
      // Check SFG-1 stock in FG_STORE
      if (item.sfg1_code && item.sfg1_deduct > 0) {
        const sfg1Balance = await getStockBalance(item.sfg1_code, 'FG_STORE');
        if (sfg1Balance < item.sfg1_deduct) {
          stockErrors.push({
            item_code: item.sfg1_code,
            item_name: `SFG-1 for ${item.fg_code}`,
            required: item.sfg1_deduct,
            available: sfg1Balance,
            shortage: item.sfg1_deduct - sfg1Balance,
            location: 'FG_STORE'
          });
        }
      }

      // Check SFG-2 stock in FG_STORE
      if (item.sfg2_code && item.sfg2_deduct > 0) {
        const sfg2Balance = await getStockBalance(item.sfg2_code, 'FG_STORE');
        if (sfg2Balance < item.sfg2_deduct) {
          stockErrors.push({
            item_code: item.sfg2_code,
            item_name: `SFG-2 for ${item.fg_code}`,
            required: item.sfg2_deduct,
            available: sfg2Balance,
            shortage: item.sfg2_deduct - sfg2Balance,
            location: 'FG_STORE'
          });
        }
      }

      // PM materials (carton, polybag, BOPP) are NOT checked - allowed to go negative
      // This allows posting even if PM materials are not available in stock
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for one or more components',
          details: stockErrors
        }
      }, { status: 400 });
    }

    // Create stock movements
    let entriesCreated = 0;

    for (const item of items) {
      // Deduct SFG-1 from FG_STORE
      if (item.sfg1_code && item.sfg1_deduct > 0) {
        await createStockEntry(
          item.sfg1_code,
          'FG_STORE',
          -item.sfg1_deduct,
          'FG_TRANSFER',
          note.doc_no,
          id,
          `SFG-1 consumed for FG ${item.fg_code}`,
          postedBy
        );
        entriesCreated++;
      }

      // Deduct SFG-2 from FG_STORE
      if (item.sfg2_code && item.sfg2_deduct > 0) {
        await createStockEntry(
          item.sfg2_code,
          'FG_STORE',
          -item.sfg2_deduct,
          'FG_TRANSFER',
          note.doc_no,
          id,
          `SFG-2 consumed for FG ${item.fg_code}`,
          postedBy
        );
        entriesCreated++;
      }

      // Deduct Carton from STORE
      if (item.cnt_code && item.cnt_deduct > 0) {
        await createStockEntry(
          item.cnt_code,
          'STORE',
          -item.cnt_deduct,
          'FG_TRANSFER',
          note.doc_no,
          id,
          `Carton consumed for FG ${item.fg_code}`,
          postedBy
        );
        entriesCreated++;
      }

      // Deduct Polybag from STORE
      if (item.polybag_code && item.polybag_deduct > 0) {
        await createStockEntry(
          item.polybag_code,
          'STORE',
          -item.polybag_deduct,
          'FG_TRANSFER',
          note.doc_no,
          id,
          `Polybag consumed for FG ${item.fg_code}`,
          postedBy
        );
        entriesCreated++;
      }

      // Deduct BOPP-1 from STORE
      if (item.bopp1_code && item.bopp1_deduct > 0) {
        await createStockEntry(
          item.bopp1_code,
          'STORE',
          -item.bopp1_deduct,
          'FG_TRANSFER',
          note.doc_no,
          id,
          `BOPP-1 consumed for FG ${item.fg_code}`,
          postedBy
        );
        entriesCreated++;
      }

      // Deduct BOPP-2 from STORE
      if (item.bopp2_code && item.bopp2_deduct > 0) {
        await createStockEntry(
          item.bopp2_code,
          'STORE',
          -item.bopp2_deduct,
          'FG_TRANSFER',
          note.doc_no,
          id,
          `BOPP-2 consumed for FG ${item.fg_code}`,
          postedBy
        );
        entriesCreated++;
      }

      // Add FG to FG_STORE (with color suffix)
      const fgItemCode = item.color ? `${item.fg_code}-${item.color}` : item.fg_code;
      await createStockEntry(
        fgItemCode,
        'FG_STORE',
        item.total_qty_pcs,
        'FG_TRANSFER',
        note.doc_no,
        id,
        `FG produced: ${item.qty_boxes} boxes × ${item.pack_size} pcs`,
        postedBy
      );
      entriesCreated++;
    }

    // Update FG Transfer Note status
    await supabase
      .from('production_fg_transfer_note')
      .update({
        stock_status: 'POSTED',
        posted_at: new Date().toISOString(),
        posted_by: postedBy
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      entries_created: entriesCreated,
      message: `Successfully posted ${entriesCreated} stock entries`
    });

  } catch (error) {
    console.error('Error posting FG Transfer Note to stock:', error);
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

// Helper function to get stock balance
async function getStockBalance(itemCode: string, location: string): Promise<number> {
  const { data, error } = await supabase
    .from('stock_balances')
    .select('balance')
    .eq('item_code', itemCode)
    .eq('location', location)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.balance || 0;
}

// Helper function to create stock entry
async function createStockEntry(
  itemCode: string,
  location: string,
  quantity: number,
  transactionType: string,
  referenceNo: string,
  referenceId: string,
  remarks: string,
  createdBy: string
): Promise<void> {
  // Get current balance
  const currentBalance = await getStockBalance(itemCode, location);
  const newBalance = currentBalance + quantity;

  // Create ledger entry
  await supabase.from('stock_ledger').insert({
    item_code: itemCode,
    location: location,
    transaction_type: transactionType,
    quantity: quantity,
    balance_after: newBalance,
    reference_no: referenceNo,
    reference_id: referenceId,
    remarks: remarks,
    created_by: createdBy,
    transaction_date: new Date().toISOString()
  });

  // Update or insert balance
  const { data: existingBalance } = await supabase
    .from('stock_balances')
    .select('id')
    .eq('item_code', itemCode)
    .eq('location', location)
    .single();

  if (existingBalance) {
    await supabase
      .from('stock_balances')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('item_code', itemCode)
      .eq('location', location);
  } else {
    await supabase.from('stock_balances').insert({
      item_code: itemCode,
      location: location,
      balance: newBalance
    });
  }
}

