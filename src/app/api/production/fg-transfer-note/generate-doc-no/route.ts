// ============================================================================
// GET /api/production/fg-transfer-note/generate-doc-no
// Generates next document number for FG Transfer Note
// Uses formCodeUtils for consistent document numbering (format: 70025260001)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateDocumentNumber, FORM_CODES } from '@/utils/formCodeUtils';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const docNo = await generateDocumentNumber(FORM_CODES.FG_TRANSFER_NOTE, date);
    
    return NextResponse.json({ success: true, doc_no: docNo });
  } catch (error) {
    console.error('Error generating doc no:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

