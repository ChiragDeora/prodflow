// ============================================================================
// GET /api/production/fg-transfer-note/colors
// Gets all colors from color_label_master
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllColors } from '@/lib/production/fg-transfer-note';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

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

