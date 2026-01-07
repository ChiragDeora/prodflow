// ============================================================================
// POST /api/stock/post/fg-transfer/[id]
// Posts an FG Transfer to stock ledger
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { postFgTransferToStock } from '@/lib/stock';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'FG Transfer ID is required' } },
        { status: 400 }
      );
    }
    
    // Get user from authenticated session
    const postedBy = auth.user?.username || 'system';
    
    const result = await postFgTransferToStock(id, postedBy);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error posting FG Transfer to stock:', error);
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

