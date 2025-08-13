import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Call the database function to approve the user
    const { data, error } = await supabase
      .rpc('approve_user_manually', { user_id: userId });

    if (error) {
      console.error('Error approving user:', error);
      return NextResponse.json(
        { error: 'Failed to approve user: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'User approved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in approve endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
