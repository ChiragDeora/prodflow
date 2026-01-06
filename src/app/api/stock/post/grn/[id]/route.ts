// ============================================================================
// POST /api/stock/post/grn/[id]
// Posts a GRN to stock ledger
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { postGrnToStock } from '@/lib/stock';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'GRN ID is required' } },
        { status: 400 }
      );
    }
    
    // Get user from request (you may need to adjust based on your auth system)
    const body = await request.json().catch(() => ({}));
    const postedBy = body.posted_by || 'system';
    
    const result = await postGrnToStock(id, postedBy);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error posting GRN to stock:', error);
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

