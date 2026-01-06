// ============================================================================
// /api/reports/saved
// List and create saved reports
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - List saved reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isTemplate = searchParams.get('is_template') === 'true';
    const userId = searchParams.get('user_id');
    
    let query = supabase
      .from('saved_reports')
      .select('*')
      .order('updated_at', { ascending: false });
    
    // Filter by template status
    if (isTemplate) {
      query = query.eq('is_template', true);
    } else {
      query = query.eq('is_template', false);
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    // Filter by user
    if (userId) {
      query = query.or(`created_by.eq.${userId},is_public.eq.true`);
    }
    
    const { data, error } = await query.limit(100);
    
    if (error) {
      console.error('Error fetching saved reports:', error);
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
    console.error('Error in GET /api/reports/saved:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new saved report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Report name is required' },
        { status: 400 }
      );
    }
    
    if (!body.config_json) {
      return NextResponse.json(
        { success: false, error: 'Report configuration is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('saved_reports')
      .insert({
        name: body.name,
        description: body.description || null,
        category: body.category || 'general',
        config_json: body.config_json,
        created_by: body.created_by || null,
        is_public: body.is_public || false,
        is_template: body.is_template || false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating saved report:', error);
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
    console.error('Error in POST /api/reports/saved:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

