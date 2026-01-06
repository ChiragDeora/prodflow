// ============================================================================
// GET /api/production/fg-transfer-note/parties
// Gets all parties from party_name_master
// ============================================================================

import { NextResponse } from 'next/server';
import { getAllParties } from '@/lib/production/fg-transfer-note';

export async function GET() {
  try {
    const parties = await getAllParties();
    return NextResponse.json({ success: true, data: parties });
  } catch (error) {
    console.error('Error fetching parties:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

