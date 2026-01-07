// ============================================================================
// GET /api/production/fg-transfer-note/bom-data
// Gets all BOM data (FG + LOCAL) for FG Code selection modal
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllBOMData, getIntWtForSFG } from '@/lib/production/fg-transfer-note';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const bomData = await getAllBOMData();
    
    // Enrich with INT_WT data for SFG codes
    const enrichedData = await Promise.all(
      bomData.map(async (bom) => {
        let sfg1_int_wt = null;
        let sfg2_int_wt = null;

        if (bom.sfg_1) {
          sfg1_int_wt = await getIntWtForSFG(bom.sfg_1);
        }
        if (bom.sfg_2) {
          sfg2_int_wt = await getIntWtForSFG(bom.sfg_2);
        }

        return {
          ...bom,
          sfg1_int_wt,
          sfg2_int_wt
        };
      })
    );
    
    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error) {
    console.error('Error fetching BOM data:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

