import { NextRequest, NextResponse } from 'next/server';
import { bomAuditAPI } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');
    const recordId = searchParams.get('recordId');
    const changedBy = searchParams.get('changedBy');
    const limit = parseInt(searchParams.get('limit') || '50');

    let data;
    if (tableName && recordId) {
      data = await bomAuditAPI.getAuditTrail(tableName, recordId);
    } else if (changedBy) {
      data = await bomAuditAPI.getAuditTrailByUser(changedBy);
    } else {
      data = await bomAuditAPI.getRecentActivities(limit);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching BOM audit data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BOM audit data' },
      { status: 500 }
    );
  }
}
