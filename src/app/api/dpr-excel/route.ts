// ============================================================================
// DPR EXCEL DATA API ROUTES
// ============================================================================
// GET: List DPR entries from Excel imports
// POST: Create new DPR entry from Excel import (saves to dpr_excel_data table)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List Excel DPR entries with optional filters
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const shift = searchParams.get('shift');
    const uploadId = searchParams.get('upload_id');
    
    let query = supabase
      .from('dpr_excel_data')
      .select(`
        *,
        dpr_excel_machine_entries (*)
      `)
      .order('report_date', { ascending: false })
      .order('shift', { ascending: true });
    
    if (fromDate) {
      query = query.gte('report_date', fromDate);
    }
    
    if (toDate) {
      query = query.lte('report_date', toDate);
    }
    
    if (shift) {
      query = query.eq('shift', shift);
    }
    
    if (uploadId) {
      query = query.eq('excel_upload_id', uploadId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching Excel DPR entries:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error in GET /api/dpr-excel:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new Excel DPR entry
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const body = await request.json();
    const {
      report_date,
      shift,
      shift_incharge,
      production_manager,
      quality_incharge,
      remarks,
      machine_entries,
      created_by,
      excel_upload_id,
      excel_file_name,
      excel_sheet_name,
      excel_row_number
    } = body;
    
    // Validation
    if (!report_date || !shift) {
      return NextResponse.json(
        { success: false, error: 'report_date and shift are required' },
        { status: 400 }
      );
    }
    
    // Check if Excel DPR already exists for this date/shift/upload
    if (excel_upload_id) {
      const { data: existing } = await supabase
        .from('dpr_excel_data')
        .select('id')
        .eq('report_date', report_date)
        .eq('shift', shift)
        .eq('excel_upload_id', excel_upload_id)
        .single();
      
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Excel DPR already exists for this date, shift, and upload' },
          { status: 400 }
        );
      }
    }
    
    // Create Excel DPR header
    const { data: dprData, error: dprError } = await supabase
      .from('dpr_excel_data')
      .insert([{
        report_date,
        shift,
        shift_incharge: shift_incharge || null,
        production_manager: production_manager || null,
        quality_incharge: quality_incharge || null,
        remarks: remarks || null,
        excel_upload_id: excel_upload_id || null,
        excel_file_name: excel_file_name || null,
        excel_sheet_name: excel_sheet_name || null,
        excel_row_number: excel_row_number || null,
        created_by: created_by || 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (dprError || !dprData) {
      console.error('Error creating Excel DPR:', dprError);
      return NextResponse.json(
        { success: false, error: dprError?.message || 'Failed to create Excel DPR' },
        { status: 500 }
      );
    }
    
    // Create machine entries if provided
    if (machine_entries && Array.isArray(machine_entries) && machine_entries.length > 0) {
      const machineEntriesToInsert = machine_entries.flatMap((entry: any) => {
        const entries = [];
        
        // Current production entry
        if (entry.current_production && entry.current_production.product) {
          if (!entry.machine_no) {
            console.warn('Skipping entry without machine_no:', entry);
            return [];
          }
          entries.push({
            dpr_excel_id: dprData.id,
            section_type: 'current',
            is_changeover: false,
            machine_no: entry.machine_no || 'UNKNOWN',
            operator_name: entry.operator_name || null,
            product: entry.current_production.product || null,
            cavity: entry.current_production.cavity || null,
            trg_cycle_sec: entry.current_production.trg_cycle_sec || null,
            trg_run_time_min: entry.current_production.trg_run_time_min || null,
            part_wt_gm: entry.current_production.part_wt_gm || null,
            act_part_wt_gm: entry.current_production.act_part_wt_gm || null,
            act_cycle_sec: entry.current_production.act_cycle_sec || null,
            part_wt_check: entry.current_production.part_wt_check || null,
            cycle_time_check: entry.current_production.cycle_time_check || null,
            shots_start: entry.current_production.shots_start || null,
            shots_end: entry.current_production.shots_end || null,
            target_qty_nos: entry.current_production.target_qty_nos || null,
            actual_qty_nos: entry.current_production.actual_qty_nos || null,
            ok_prod_qty_nos: entry.current_production.ok_prod_qty_nos || null,
            ok_prod_kgs: entry.current_production.ok_prod_kgs || null,
            ok_prod_percent: entry.current_production.ok_prod_percent || null,
            rej_kgs: entry.current_production.rej_kgs || null,
            lumps_kgs: entry.current_production.lumps_kgs || null,
            run_time_mins: entry.current_production.run_time_mins || null,
            down_time_min: entry.current_production.down_time_min || null,
            stoppage_reason: entry.current_production.stoppage_reason || null,
            stoppage_start: entry.current_production.stoppage_start || null,
            stoppage_end: entry.current_production.stoppage_end || null,
            stoppage_total_min: entry.current_production.stoppage_total_min || null,
            mould_change: entry.current_production.mould_change || null,
            remark: entry.current_production.remark || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        // Changeover entry
        if (entry.changeover && entry.changeover.product) {
          if (!entry.machine_no) {
            console.warn('Skipping changeover entry without machine_no:', entry);
            return [];
          }
          entries.push({
            dpr_excel_id: dprData.id,
            section_type: 'changeover',
            is_changeover: true,
            machine_no: entry.machine_no || 'UNKNOWN',
            operator_name: entry.operator_name || null,
            product: entry.changeover.product || null,
            previous_product: entry.current_production?.product || null,
            cavity: entry.changeover.cavity || null,
            trg_cycle_sec: entry.changeover.trg_cycle_sec || null,
            trg_run_time_min: entry.changeover.trg_run_time_min || null,
            part_wt_gm: entry.changeover.part_wt_gm || null,
            act_part_wt_gm: entry.changeover.act_part_wt_gm || null,
            act_cycle_sec: entry.changeover.act_cycle_sec || null,
            part_wt_check: entry.changeover.part_wt_check || null,
            cycle_time_check: entry.changeover.cycle_time_check || null,
            shots_start: entry.changeover.shots_start || null,
            shots_end: entry.changeover.shots_end || null,
            target_qty_nos: entry.changeover.target_qty_nos || null,
            actual_qty_nos: entry.changeover.actual_qty_nos || null,
            ok_prod_qty_nos: entry.changeover.ok_prod_qty_nos || null,
            ok_prod_kgs: entry.changeover.ok_prod_kgs || null,
            ok_prod_percent: entry.changeover.ok_prod_percent || null,
            rej_kgs: entry.changeover.rej_kgs || null,
            lumps_kgs: entry.changeover.lumps_kgs || null,
            run_time_mins: entry.changeover.run_time_mins || null,
            down_time_min: entry.changeover.down_time_min || null,
            changeover_start_time: entry.changeover.changeover_start_time || null,
            changeover_end_time: entry.changeover.changeover_end_time || null,
            changeover_duration_min: entry.changeover.changeover_duration_min || null,
            changeover_reason: entry.changeover.changeover_reason || entry.changeover.remark || null,
            stoppage_reason: entry.changeover.stoppage_reason || null,
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
          .from('dpr_excel_machine_entries')
          .insert(machineEntriesToInsert);
        
        if (machineError) {
          console.error('Error creating Excel machine entries:', machineError);
          // Rollback DPR creation
          await supabase.from('dpr_excel_data').delete().eq('id', dprData.id);
          return NextResponse.json(
            { success: false, error: machineError.message },
            { status: 500 }
          );
        }
      }
    }
    
    // Fetch complete DPR with machine entries
    const { data: completeDpr } = await supabase
      .from('dpr_excel_data')
      .select(`
        *,
        dpr_excel_machine_entries (*)
      `)
      .eq('id', dprData.id)
      .single();
    
    return NextResponse.json({
      success: true,
      data: completeDpr,
      message: 'Excel DPR created successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/dpr-excel:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

