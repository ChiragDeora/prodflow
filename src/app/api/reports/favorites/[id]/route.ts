// ============================================================================
// /api/reports/favorites/[id]
// Delete favorite
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE - Remove favorite
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    // id can be the favorite id or the report_id
    let query = supabase.from('report_favorites').delete();
    
    // If it looks like a UUID, treat as report_id with user_id
    if (id.includes('-') && userId) {
      query = query.eq('report_id', id).eq('user_id', userId);
    } else {
      // Otherwise treat as favorite id
      query = query.eq('id', id);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Error deleting favorite:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Favorite removed successfully',
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/reports/favorites/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

