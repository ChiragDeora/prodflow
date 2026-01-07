// ============================================================================
// /api/reports/favorites
// List and add favorites
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - List user's favorites
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('report_favorites')
      .select(`
        id,
        report_id,
        created_at,
        saved_reports (
          id,
          name,
          description,
          category,
          config_json,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching favorites:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: (data || []).length,
    });
    
  } catch (error) {
    console.error('Error in GET /api/reports/favorites:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Add favorite
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const body = await request.json();
    
    if (!body.report_id || !body.user_id) {
      return NextResponse.json(
        { success: false, error: 'report_id and user_id are required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('report_favorites')
      .insert({
        report_id: body.report_id,
        user_id: body.user_id,
      })
      .select()
      .single();
    
    if (error) {
      // Check for duplicate
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Report is already in favorites' },
          { status: 409 }
        );
      }
      console.error('Error adding favorite:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error in POST /api/reports/favorites:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

