// ============================================================================
// DPR API ROUTES - SINGLE DPR OPERATIONS
// ============================================================================
// GET: Get single DPR by ID
// PUT: Update DPR
// DELETE: Delete DPR
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get single DPR with all machine entries
// Returns ALL fields from dpr_data, dpr_machine_entries, and dpr_stoppage_entries
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Select ALL fields from all related tables
    // Returns ALL fields from:
    // - dpr_data: id, report_date, shift, shift_incharge, stock_status, posted_to_stock_at, posted_to_stock_by, etc.
    // - dpr_machine_entries: ALL fields including target_qty_nos, actual_qty_nos, etc.
    // - dpr_stoppage_entries: ALL fields
    const { data, error } = await supabase
      .from('dpr_data')
      .select(`
        *,
        dpr_machine_entries (
          *,
          dpr_stoppage_entries (*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching DPR:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'DPR not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in GET /api/dpr/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update DPR
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Check if DPR exists
    const { data: existing } = await supabase
      .from('dpr_data')
      .select('id, stock_status')
      .eq('id', id)
      .single();
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'DPR not found' },
        { status: 404 }
      );
    }
    
    // Allow updates even if posted - we'll reverse old entries and post new ones
    // This ensures stock updates in real-time when DPR is edited
    
    // Update DPR header
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    // Update ALL fields from dpr_data table if provided
    if (body.shift_incharge !== undefined) updateData.shift_incharge = body.shift_incharge;
    if (body.production_manager !== undefined) updateData.production_manager = body.production_manager;
    if (body.quality_incharge !== undefined) updateData.quality_incharge = body.quality_incharge;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.stock_status !== undefined) updateData.stock_status = body.stock_status;
    if (body.posted_to_stock_at !== undefined) updateData.posted_to_stock_at = body.posted_to_stock_at;
    if (body.posted_to_stock_by !== undefined) updateData.posted_to_stock_by = body.posted_to_stock_by;
    if (body.updated_by !== undefined) updateData.updated_by = body.updated_by;
    
    const { data: updatedDpr, error: updateError } = await supabase
      .from('dpr_data')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating DPR:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }
    
    // Update machine entries if provided
    if (body.machine_entries && Array.isArray(body.machine_entries)) {
      // Delete existing machine entries
      await supabase
        .from('dpr_machine_entries')
        .delete()
        .eq('dpr_id', id);
      
      // Insert new machine entries (same logic as POST)
      const machineEntriesToInsert = body.machine_entries.flatMap((entry: any) => {
        const entries = [];
        
        // Current production - Save ALL fields from dpr_machine_entries table
        if (entry.current_production && entry.current_production.product) {
          entries.push({
            dpr_id: id,
            section_type: 'current',
            is_changeover: false,
            machine_no: entry.machine_no,
            operator_name: entry.operator_name || null,
            product: entry.current_production.product || null,
            cavity: entry.current_production.cavity || null,
            trg_cycle_sec: entry.current_production.target_cycle || entry.current_production.trg_cycle_sec || null,
            trg_run_time_min: entry.current_production.target_run_time || entry.current_production.trg_run_time_min || null,
            part_wt_gm: entry.current_production.part_weight || entry.current_production.part_wt_gm || null,
            act_part_wt_gm: entry.current_production.actual_part_weight || entry.current_production.act_part_wt_gm || null,
            act_cycle_sec: entry.current_production.actual_cycle || entry.current_production.act_cycle_sec || null,
            part_wt_check: entry.current_production.part_weight_check || entry.current_production.part_wt_check || null,
            cycle_time_check: entry.current_production.cycle_time_check || null,
            shots_start: entry.current_production.shots_start || null,
            shots_end: entry.current_production.shots_end || null,
            target_qty_nos: entry.current_production.target_qty || entry.current_production.target_qty_nos || null,
            actual_qty_nos: entry.current_production.actual_qty || entry.current_production.actual_qty_nos || null,
            ok_prod_qty_nos: entry.current_production.ok_prod_qty || entry.current_production.ok_prod_qty_nos || null,
            ok_prod_kgs: entry.current_production.ok_prod_kgs || null,
            ok_prod_percent: entry.current_production.ok_prod_percent || null,
            rej_kgs: entry.current_production.rej_kgs || null,
            lumps_kgs: entry.current_production.lumps || entry.current_production.lumps_kgs || null,
            run_time_mins: entry.current_production.run_time || entry.current_production.run_time_mins || null,
            down_time_min: entry.current_production.down_time || entry.current_production.down_time_min || null,
            stoppage_reason: entry.current_production.stoppage_reason || null,
            stoppage_start: entry.current_production.start_time ? entry.current_production.start_time.substring(0, 8) : null,
            stoppage_end: entry.current_production.end_time ? entry.current_production.end_time.substring(0, 8) : null,
            stoppage_total_min: entry.current_production.stoppage_total || entry.current_production.stoppage_total_min || null,
            mould_change: entry.current_production.mould_change || null,
            remark: entry.current_production.remark || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        // Changeover - Save ALL fields including changeover-specific fields
        if (entry.changeover && entry.changeover.product) {
          entries.push({
            dpr_id: id,
            section_type: 'changeover',
            is_changeover: true,
            machine_no: entry.machine_no,
            operator_name: entry.operator_name || null,
            product: entry.changeover.product || null,
            previous_product: entry.current_production?.product || null,
            cavity: entry.changeover.cavity || null,
            trg_cycle_sec: entry.changeover.target_cycle || entry.changeover.trg_cycle_sec || null,
            trg_run_time_min: entry.changeover.target_run_time || entry.changeover.trg_run_time_min || null,
            part_wt_gm: entry.changeover.part_weight || entry.changeover.part_wt_gm || null,
            act_part_wt_gm: entry.changeover.actual_part_weight || entry.changeover.act_part_wt_gm || null,
            act_cycle_sec: entry.changeover.actual_cycle || entry.changeover.act_cycle_sec || null,
            part_wt_check: entry.changeover.part_weight_check || entry.changeover.part_wt_check || null,
            cycle_time_check: entry.changeover.cycle_time_check || null,
            shots_start: entry.changeover.shots_start || null,
            shots_end: entry.changeover.shots_end || null,
            target_qty_nos: entry.changeover.target_qty || entry.changeover.target_qty_nos || null,
            actual_qty_nos: entry.changeover.actual_qty || entry.changeover.actual_qty_nos || null,
            ok_prod_qty_nos: entry.changeover.ok_prod_qty || entry.changeover.ok_prod_qty_nos || null,
            ok_prod_kgs: entry.changeover.ok_prod_kgs || null,
            ok_prod_percent: entry.changeover.ok_prod_percent || null,
            rej_kgs: entry.changeover.rej_kgs || null,
            lumps_kgs: entry.changeover.lumps || entry.changeover.lumps_kgs || null,
            run_time_mins: entry.changeover.run_time || entry.changeover.run_time_mins || null,
            down_time_min: entry.changeover.down_time || entry.changeover.down_time_min || null,
            changeover_start_time: entry.changeover.start_time ? entry.changeover.start_time.substring(0, 8) : null,
            changeover_end_time: entry.changeover.end_time ? entry.changeover.end_time.substring(0, 8) : null,
            changeover_reason: entry.changeover.changeover_reason || entry.changeover.remark || null,
            changeover_duration_min: entry.changeover.changeover_duration || entry.changeover.changeover_duration_min || null,
            stoppage_reason: entry.changeover.stoppage_reason || null,
            stoppage_start: entry.changeover.start_time ? entry.changeover.start_time.substring(0, 8) : null,
            stoppage_end: entry.changeover.end_time ? entry.changeover.end_time.substring(0, 8) : null,
            stoppage_total_min: entry.changeover.stoppage_total || entry.changeover.stoppage_total_min || null,
            mould_change: entry.changeover.mould_change || null,
            remark: entry.changeover.remark || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        return entries;
      });
      
      if (machineEntriesToInsert.length > 0) {
        const { error: machineError } = await supabase
          .from('dpr_machine_entries')
          .insert(machineEntriesToInsert);
        
        if (machineError) {
          console.error('Error updating machine entries:', machineError);
          return NextResponse.json(
            { success: false, error: machineError.message },
            { status: 500 }
          );
        }
      }
    }
    
    // NOTE: Auto-posting removed to prevent automatic cancellation/reversal entries
    // Stock posting should only happen when user explicitly clicks "Post to Stock" button
    // This prevents the issue where every save creates reversal entries
    // 
    // If the DPR was already posted and user wants to update stock:
    // - They should use the Cancel button first, then edit, then Post again
    // - Or we can implement an "Update Stock" feature that handles this properly
    console.log('📝 DPR updated. Stock posting is manual - use Post to Stock button when ready.');
    
    // Fetch complete updated DPR with ALL fields
    // Returns ALL fields from dpr_data and ALL fields from dpr_machine_entries
    const { data: completeDpr } = await supabase
      .from('dpr_data')
      .select(`
        *,
        dpr_machine_entries (*)
      `)
      .eq('id', id)
      .single();
    
    return NextResponse.json({
      success: true,
      data: completeDpr,
      message: 'DPR updated successfully'
    });
  } catch (error) {
    console.error('Error in PUT /api/dpr/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete DPR (only if not posted to stock)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Check if DPR exists and is not posted
    const { data: existing } = await supabase
      .from('dpr_data')
      .select('id, stock_status')
      .eq('id', id)
      .single();
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'DPR not found' },
        { status: 404 }
      );
    }
    
    if (existing.stock_status === 'POSTED') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete DPR that has been posted to stock' },
        { status: 400 }
      );
    }
    
    // Delete DPR (cascade will delete machine entries)
    const { error } = await supabase
      .from('dpr_data')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting DPR:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'DPR deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/dpr/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

