import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRootAdmin } from '@/lib/auth-utils';

const getSupabase = () => createClient();

// Get DPR view settings for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = getSupabase();
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can access DPR view settings' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    const { data, error } = await supabase
      .from('dpr_user_view_settings')
      .select('field_settings')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = row not found
      console.error('Error fetching DPR view settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch DPR view settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings: data?.field_settings || null,
    });
  } catch (error) {
    console.error('Admin GET DPR view settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update DPR view settings for a specific user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = getSupabase();
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can update DPR view settings' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const fieldSettings = body.settings as Record<string, boolean> | undefined;

    if (!fieldSettings || typeof fieldSettings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings payload' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('dpr_user_view_settings')
      .upsert(
        {
          user_id: userId,
          field_settings: fieldSettings,
        },
        {
          onConflict: 'user_id',
        }
      );

    if (error) {
      console.error('Error updating DPR view settings:', error);
      return NextResponse.json(
        { error: 'Failed to update DPR view settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin PUT DPR view settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


