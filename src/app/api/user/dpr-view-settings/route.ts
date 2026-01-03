import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifySession } from '@/lib/auth-utils';

const getSupabase = () => createClient();

// Returns DPR view settings for the currently authenticated user.
// Used by the Production DPR module to decide which metrics/columns
// to display on the dashboard.
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const sessionData = await verifySession(request);

    if (!sessionData || !sessionData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = sessionData.user.id;

    const { data, error } = await supabase
      .from('dpr_user_view_settings')
      .select('field_settings')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching DPR view settings for user:', error);
      return NextResponse.json(
        { error: 'Failed to fetch DPR view settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings: data?.field_settings || null,
    });
  } catch (error) {
    console.error('User DPR view settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


