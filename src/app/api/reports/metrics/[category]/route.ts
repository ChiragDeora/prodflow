// ============================================================================
// /api/reports/metrics/[category]
// Get available metrics for a category
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getMetricsForCategory, MetricCategory, ALL_METRICS } from '@/lib/reports';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ category: string }>;
}

// GET - Get metrics for category
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { category } = await params;
    
    // Return all metrics if category is 'all'
    if (category === 'all') {
      return NextResponse.json({
        success: true,
        data: ALL_METRICS,
        count: ALL_METRICS.length,
      });
    }
    
    // Validate category
    const validCategories: MetricCategory[] = ['production', 'dispatch', 'stock', 'store', 'maintenance', 'quality'];
    
    if (!validCategories.includes(category as MetricCategory)) {
      return NextResponse.json(
        { success: false, error: `Invalid category: ${category}. Valid categories are: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }
    
    const metrics = getMetricsForCategory(category as MetricCategory);
    
    return NextResponse.json({
      success: true,
      data: metrics,
      count: metrics.length,
    });
    
  } catch (error) {
    console.error('Error in GET /api/reports/metrics/[category]:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

