// ============================================================================
// POST /api/stock/cancel/[documentType]/[id]
// Cancels a posted document by creating reversal entries
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cancelStockPosting, canCancelDocument } from '@/lib/stock';
import type { DocumentType } from '@/lib/supabase/types/stock';

// Valid document types for cancellation
const VALID_DOCUMENT_TYPES = [
  'GRN',
  'JW_GRN',
  'MIS',
  'DPR',
  'FG_TRANSFER',
  'DISPATCH',
  'CUSTOMER_RETURN',
  'ADJUSTMENT',
  'OPENING_BALANCE',
];

export async function POST(
  request: NextRequest,
  { params }: { params: { documentType: string; id: string } }
) {
  try {
    const { documentType, id } = params;
    
    if (!documentType || !id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Document type and ID are required' } },
        { status: 400 }
      );
    }
    
    // Validate document type
    const normalizedDocType = documentType.toUpperCase().replace(/-/g, '_') as DocumentType;
    
    if (!VALID_DOCUMENT_TYPES.includes(normalizedDocType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: `Invalid document type. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}` 
          } 
        },
        { status: 400 }
      );
    }
    
    // Check if document can be cancelled
    const canCancel = await canCancelDocument(normalizedDocType, id);
    
    if (!canCancel.canCancel) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NO_ENTRIES_FOUND', 
            message: canCancel.reason || 'Document cannot be cancelled' 
          } 
        },
        { status: 400 }
      );
    }
    
    const body = await request.json().catch(() => ({}));
    const cancelledBy = body.cancelled_by || 'system';
    
    const result = await cancelStockPosting(normalizedDocType, id, cancelledBy);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error cancelling stock posting:', error);
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

// GET endpoint to check if document can be cancelled
export async function GET(
  request: NextRequest,
  { params }: { params: { documentType: string; id: string } }
) {
  try {
    const { documentType, id } = params;
    
    if (!documentType || !id) {
      return NextResponse.json(
        { canCancel: false, reason: 'Document type and ID are required' },
        { status: 400 }
      );
    }
    
    const normalizedDocType = documentType.toUpperCase().replace(/-/g, '_') as DocumentType;
    
    if (!VALID_DOCUMENT_TYPES.includes(normalizedDocType)) {
      return NextResponse.json(
        { canCancel: false, reason: 'Invalid document type' },
        { status: 400 }
      );
    }
    
    const result = await canCancelDocument(normalizedDocType, id);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error checking cancellation status:', error);
    return NextResponse.json(
      { canCancel: false, reason: 'Error checking cancellation status' },
      { status: 500 }
    );
  }
}


