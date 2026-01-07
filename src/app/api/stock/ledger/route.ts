// ============================================================================
// GET /api/stock/ledger
// Query stock ledger entries with optional filters
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getStockLedger, getItemLedgerWithBalance, getDocumentHistory } from '@/lib/stock';
import type { LocationCode, DocumentType } from '@/lib/supabase/types/stock';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  // Verify authentication
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { searchParams } = new URL(request.url);
    
    const itemCode = searchParams.get('item_code') || undefined;
    const locationCode = searchParams.get('location') as LocationCode | undefined;
    const documentType = searchParams.get('document_type') as DocumentType | undefined;
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;
    const documentId = searchParams.get('document_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const withBalance = searchParams.get('with_balance') === 'true';
    
    // If document_id is provided with document_type, return document history
    if (documentId && documentType) {
      const result = await getDocumentHistory(documentType, documentId);
      return NextResponse.json({
        success: true,
        count: result.length,
        data: result,
      }, { status: 200 });
    }
    
    // If with_balance is requested with item_code, return ledger with running balance
    if (withBalance && itemCode) {
      const result = await getItemLedgerWithBalance(
        itemCode,
        locationCode,
        fromDate,
        toDate
      );
      return NextResponse.json({
        success: true,
        count: result.length,
        data: result,
      }, { status: 200 });
    }
    
    // Otherwise, return ledger entries with filters
    const result = await getStockLedger({
      item_code: itemCode,
      location_code: locationCode,
      document_type: documentType,
      from_date: fromDate,
      to_date: toDate,
      limit,
      offset,
    });
    
    return NextResponse.json({
      success: true,
      count: result.length,
      data: result,
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching stock ledger:', error);
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


