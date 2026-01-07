// ============================================================================
// /api/reports/dimensions/[category]
// Get available dimensions for a category
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDimensionsForCategory, MetricCategory, ALL_DIMENSIONS } from '@/lib/reports';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ category: string }>;
}

// GET - Get dimensions for category
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { category } = await params;
    
    // Return all dimensions if category is 'all'
    if (category === 'all') {
      return NextResponse.json({
        success: true,
        data: ALL_DIMENSIONS,
        count: ALL_DIMENSIONS.length,
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
    
    const dimensions = getDimensionsForCategory(category as MetricCategory);
    
    return NextResponse.json({
      success: true,
      data: dimensions,
      count: dimensions.length,
    });
    
  } catch (error) {
    console.error('Error in GET /api/reports/dimensions/[category]:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

