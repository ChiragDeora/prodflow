import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');
    const productionDate = searchParams.get('productionDate');

    console.log(`📥 GET request: lineId=${lineId}, productionDate=${productionDate}`);

    if (!lineId || !productionDate) {
      return NextResponse.json(
        { success: false, error: 'lineId and productionDate are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('daily_weight_report')
      .select('*')
      .eq('line_id', lineId)
      .eq('production_date', productionDate)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('❌ Database error fetching daily weight report:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch daily weight report' },
        { status: 500 }
      );
    }

    console.log(`📤 Returning ${data?.length || 0} records for line ${lineId} on ${productionDate}`);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error in GET /api/daily-weight-report:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    console.log('📥 Received POST request:', body);

    const {
      lineId,
      moldName,
      entryDate,
      timeSlot,
      startTime,
      endTime,
      cycleTime,
      cavityWeights,
      averageWeight,
      isChangeoverPoint,
      previousMoldName,
      notes,
      color,
      productionDate,
      submittedBy
    } = body;

    // Validate required fields
    if (!lineId || !moldName || !timeSlot || !productionDate || !submittedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate data types
    if (!startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Start time and end time are required' },
        { status: 400 }
      );
    }

    if (typeof cycleTime !== 'number' || typeof averageWeight !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Cycle time and average weight must be numbers' },
        { status: 400 }
      );
    }

    if (!Array.isArray(cavityWeights)) {
      return NextResponse.json(
        { success: false, error: 'Cavity weights must be an array' },
        { status: 400 }
      );
    }

    const reportData = {
      line_id: lineId,
      mold_name: moldName,
      entry_date: entryDate || new Date().toISOString().split('T')[0],
      time_slot: timeSlot,
      start_time: startTime,
      end_time: endTime,
      cycle_time: cycleTime,
      cavity_weights: cavityWeights,
      average_weight: averageWeight,
      is_changeover_point: isChangeoverPoint || false,
      previous_mold_name: previousMoldName || null,
      changeover_reason: null,
      changeover_timestamp: isChangeoverPoint ? new Date().toISOString() : null,
      is_submitted: true,
      submitted_by: submittedBy,
      submitted_at: new Date().toISOString(),
      notes: notes || '',
      color: color || '',
      production_date: productionDate
    };

    console.log('📤 Inserting into database:', reportData);

    const { data, error } = await supabase
      .from('daily_weight_report')
      .insert([reportData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Successfully inserted into database:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /api/daily-weight-report:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

