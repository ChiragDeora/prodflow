// ============================================================================
// POST /api/stock/post/customer-return/[id]
// Posts a Customer Return to stock ledger
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { postCustomerReturnToStock } from '@/lib/stock';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Customer Return ID is required' } },
        { status: 400 }
      );
    }
    
    const body = await request.json().catch(() => ({}));
    const postedBy = body.posted_by || 'system';
    
    const result = await postCustomerReturnToStock(id, postedBy);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error posting Customer Return to stock:', error);
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

