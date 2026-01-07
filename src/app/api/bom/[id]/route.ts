import { NextRequest, NextResponse } from 'next/server';
import { bomMasterAPI, bomAuditAPI } from '@/lib/supabase';
import { verifySession } from '@/lib/auth-utils';

// GET: Get a specific BOM by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'BOM ID is required' },
        { status: 400 }
      );
    }

    const data = await bomMasterAPI.getById(id);
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'BOM not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching BOM:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BOM' },
      { status: 500 }
    );
  }
}

// PUT: Update a BOM (status change, release, archive, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'BOM ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, updatedBy, ...otherUpdates } = body;

    // Validate status if provided
    if (status && !['draft', 'released', 'archived'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be draft, released, or archived' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: any = { ...otherUpdates };
    
    if (status) {
      updates.status = status;
    }
    
    if (updatedBy) {
      updates.updated_by = updatedBy;
    }

    // Get the existing BOM for audit trail
    const existingBom = await bomMasterAPI.getById(id);
    if (!existingBom) {
      return NextResponse.json(
        { success: false, error: 'BOM not found' },
        { status: 404 }
      );
    }

    const changedBy = updatedBy || sessionData.user?.username || 'system';

    // Handle release - set released_at timestamp
    if (status === 'released') {
      updates.released_at = new Date().toISOString();
      updates.released_by = changedBy;
    }

    const data = await bomMasterAPI.update(id, updates);
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'BOM update failed' },
        { status: 500 }
      );
    }

    // Determine the table name based on the BOM type
    const tableName = existingBom.sfg_code ? 'sfg_bom' : 
                      existingBom.party_name ? 'fg_bom' : 'local_bom';

    // Create audit entry for the status change
    if (status) {
      const actionType = status === 'released' ? 'RELEASE' : 
                        status === 'archived' ? 'ARCHIVE' : 'UPDATE';
      
      await bomAuditAPI.createAuditEntry(
        tableName,
        id,
        actionType as any,
        changedBy,
        { old_status: existingBom.status, item_name: existingBom.item_name, sfg_code: existingBom.sfg_code },
        { new_status: status, released_at: updates.released_at, released_by: updates.released_by },
        `BOM ${actionType.toLowerCase()}d by ${changedBy}`
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: status === 'released' ? 'BOM released successfully' : 'BOM updated successfully'
    });
  } catch (error) {
    console.error('Error updating BOM:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update BOM' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a BOM (only if draft)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'BOM ID is required' },
        { status: 400 }
      );
    }

    // First check if BOM exists and is in draft status
    const existingBom = await bomMasterAPI.getById(id);
    
    if (!existingBom) {
      return NextResponse.json(
        { success: false, error: 'BOM not found' },
        { status: 404 }
      );
    }

    if (existingBom.status === 'released') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a released BOM. Released BOMs are immutable.' },
        { status: 400 }
      );
    }

    // For now, we'll archive instead of delete for safety
    const data = await bomMasterAPI.update(id, { 
      status: 'archived',
      created_by: sessionData.user?.username || 'system'
    });

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'BOM archived successfully'
    });
  } catch (error) {
    console.error('Error deleting BOM:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete BOM' },
      { status: 500 }
    );
  }
}
