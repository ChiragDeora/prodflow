import { NextRequest, NextResponse } from 'next/server';
import { bomMasterAPI } from '@/lib/supabase';
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
    const category = searchParams.get('category') as 'SFG' | 'FG' | 'LOCAL' | null;
    const productCode = searchParams.get('productCode');

    let data;
    if (category) {
      data = await bomMasterAPI.getByCategory(category);
    } else if (productCode) {
      data = await bomMasterAPI.getByProductCode(productCode);
    } else {
      data = await bomMasterAPI.getAll();
    }

    // Prevent caching - always return fresh data
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching BOM masters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BOM masters' },
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
    const { productCode, productName, category, description, createdBy } = body;

    if (!productCode || !productName || !category || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const data = await bomMasterAPI.createNewLineage(
      productCode,
      productName,
      category,
      description || '',
      createdBy
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating BOM master:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create BOM master' },
      { status: 500 }
    );
  }
}
