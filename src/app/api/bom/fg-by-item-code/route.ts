import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { getFgBomByItemCode } from '@/lib/stock/helpers';

/**
 * GET /api/bom/fg-by-item-code?itemCode=xxx
 * Returns the FG BOM for the given item code using the same resolution as
 * post-job-work-challan: trims color suffix (e.g. -Black), checks fg_bom
 * for codes starting with "2" and local_bom for "3".
 * Used by Job Work Annexure Delivery Challan form for Quantity (KG) calculation.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const itemCode = request.nextUrl.searchParams.get('itemCode');
    if (!itemCode || !itemCode.trim()) {
      return NextResponse.json(
        { success: false, error: 'itemCode is required' },
        { status: 400 }
      );
    }
    const bom = await getFgBomByItemCode(itemCode.trim());
    return NextResponse.json({ success: true, data: bom });
  } catch (e) {
    console.error('Error in /api/bom/fg-by-item-code:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch FG BOM' },
      { status: 500 }
    );
  }
}
