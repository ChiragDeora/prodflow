import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching permissions from database...');
    
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module', { ascending: true })
      .order('name', { ascending: true });

    console.log('API: Permissions query result:', { permissions, error });

    if (error) {
      console.error('API: Error fetching permissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch permissions', details: error.message },
        { status: 500 }
      );
    }

    console.log('API: Successfully fetched permissions:', permissions?.length || 0);
    return NextResponse.json({ permissions: permissions || [] });
  } catch (error) {
    console.error('API: Exception fetching permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 