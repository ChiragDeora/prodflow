// ============================================================================
// /api/production/fg-transfer-note
// GET: List all FG Transfer Notes
// POST: Create new FG Transfer Note
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllFGTransferNotes, 
  createFGTransferNote 
} from '@/lib/production/fg-transfer-note';

export async function GET() {
  try {
    const data = await getAllFGTransferNotes();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/production/fg-transfer-note:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.doc_no) {
      return NextResponse.json(
        { success: false, error: 'doc_no is required' },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of body.items) {
      if (!item.fg_code) {
        return NextResponse.json(
          { success: false, error: 'fg_code is required for all items' },
          { status: 400 }
        );
      }
      if (!item.qty_boxes || item.qty_boxes <= 0) {
        return NextResponse.json(
          { success: false, error: 'qty_boxes must be greater than 0 for all items' },
          { status: 400 }
        );
      }
    }

    const note = {
      doc_no: body.doc_no,
      date: body.date || new Date().toISOString().split('T')[0],
      from_dept: body.from_dept || '',
      to_dept: body.to_dept || '',
      transfer_date_time: body.transfer_date_time || null,
      shift_incharge: body.shift_incharge || null,
      qc_inspector: body.qc_inspector || null,
      fg_received_by: body.fg_received_by || null,
      created_by: body.created_by || 'system'
    };

    const data = await createFGTransferNote(note, body.items);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /api/production/fg-transfer-note:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

