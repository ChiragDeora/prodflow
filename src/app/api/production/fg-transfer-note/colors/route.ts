// ============================================================================
// GET /api/production/fg-transfer-note/colors
// Gets all colors from color_label_master
// ============================================================================

import { NextResponse } from 'next/server';
import { getAllColors } from '@/lib/production/fg-transfer-note';

export async function GET() {
  try {
    const colors = await getAllColors();
    return NextResponse.json({ success: true, data: colors });
  } catch (error) {
    console.error('Error fetching colors:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

