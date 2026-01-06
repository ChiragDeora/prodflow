// ============================================================================
// DPR API ROUTES
// ============================================================================
// GET: List all DPR entries
// POST: Create new DPR entry (entry_type = 'CREATE')
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List DPR entries with optional filters
// Returns ALL fields from dpr_data and ALL fields from dpr_machine_entries
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entryType = searchParams.get('entry_type'); // 'CREATE' or 'EXCEL_UPLOAD'
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const shift = searchParams.get('shift'); // 'DAY' or 'NIGHT'
    const stockStatus = searchParams.get('stock_status'); // 'DRAFT', 'POSTED', 'CANCELLED'
    
    // Select ALL fields from both dpr_data and dpr_machine_entries
    // This ensures ALL columns are fetched, including:
    // dpr_data: id, report_date, shift, shift_incharge, stock_status, posted_to_stock_at, posted_to_stock_by, 
    //           created_at, updated_at, created_by, updated_by, entry_type, is_reference_data, etc.
    // dpr_machine_entries: id, dpr_id, machine_no, operator_name, product, cavity, trg_cycle_sec, trg_run_time_min,
    //                      part_wt_gm, act_part_wt_gm, act_cycle_sec, part_wt_check, cycle_time_check,
    //                      shots_start, shots_end, target_qty_nos, actual_qty_nos, ok_prod_qty_nos, ok_prod_kgs,
    //                      ok_prod_percent, rej_kgs, lumps_kgs, run_time_mins, down_time_min, stoppage_reason,
    //                      stoppage_start, stoppage_end, stoppage_total_min, mould_change, remark, is_changeover,
    //                      changeover_start_time, changeover_end_time, changeover_duration_min, changeover_reason,
    //                      previous_product, section_type, created_at, updated_at, etc.
    let query = supabase
      .from('dpr_data')
      .select(`
        *,
        dpr_machine_entries (
          *
        )
      `)
      .order('report_date', { ascending: false })
      .order('shift', { ascending: true });
    
    if (entryType) {
      query = query.eq('entry_type', entryType);
    }
    
    if (fromDate) {
      query = query.gte('report_date', fromDate);
    }
    
    if (toDate) {
      query = query.lte('report_date', toDate);
    }
    
    if (shift) {
      query = query.eq('shift', shift);
    }
    
    if (stockStatus) {
      query = query.eq('stock_status', stockStatus);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching DPR entries:', error);
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
    console.error('Error in GET /api/dpr:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new DPR entry (CREATE mode - can be posted to stock)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      report_date,
      shift,
      shift_incharge,
      production_manager,
      quality_incharge,
      remarks,
      machine_entries, // Array of machine entry objects
      created_by,
      entry_type, // Optional: 'CREATE' or 'EXCEL_UPLOAD' (defaults to 'CREATE')
      excel_file_name // Optional: for Excel uploads
    } = body;
    
    // Validation
    if (!report_date || !shift) {
      return NextResponse.json(
        { success: false, error: 'report_date and shift are required' },
        { status: 400 }
      );
    }
    
    if (!machine_entries || !Array.isArray(machine_entries) || machine_entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one machine entry is required' },
        { status: 400 }
      );
    }
    
    // Check if DPR already exists for this date/shift
    const { data: existing } = await supabase
      .from('dpr_data')
      .select('id')
      .eq('report_date', report_date)
      .eq('shift', shift)
      .single();
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'DPR already exists for this date and shift' },
        { status: 400 }
      );
    }
    
    // Determine entry type
    const finalEntryType = entry_type === 'EXCEL_UPLOAD' ? 'EXCEL_UPLOAD' : 'CREATE';
    const isReferenceData = finalEntryType === 'EXCEL_UPLOAD';
    
    // Create DPR header - Save ALL fields from dpr_data table
    // Fields: id (auto), report_date, shift, shift_incharge, stock_status, posted_to_stock_at, 
    //         posted_to_stock_by, created_at, updated_at, created_by, updated_by, entry_type,
    //         is_reference_data, production_manager, quality_incharge, remarks, approval_status, etc.
    const dprInsertData: any = {
      report_date,
      shift,
      shift_incharge: shift_incharge || null,
      production_manager: production_manager || null,
      quality_incharge: quality_incharge || null,
      remarks: remarks || null,
      entry_type: finalEntryType,
      is_reference_data: isReferenceData,
      stock_status: 'DRAFT', // Default to DRAFT, can be updated later
      posted_to_stock_at: null, // Set when posted to stock
      posted_to_stock_by: null, // Set when posted to stock
      approval_status: 'PENDING',
      created_by: created_by || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add Excel upload fields if applicable
    if (isReferenceData && excel_file_name) {
      dprInsertData.excel_file_name = excel_file_name;
      dprInsertData.excel_uploaded_at = new Date().toISOString();
      dprInsertData.excel_uploaded_by = created_by || 'system';
    }
    
    const { data: dprData, error: dprError } = await supabase
      .from('dpr_data')
      .insert([dprInsertData])
      .select()
      .single();
    
    if (dprError || !dprData) {
      console.error('Error creating DPR:', dprError);
      return NextResponse.json(
        { success: false, error: dprError?.message || 'Failed to create DPR' },
        { status: 500 }
      );
    }
    
    // Create machine entries
    const machineEntriesToInsert = machine_entries.flatMap((entry: any) => {
      const entries = [];
      
      // Current production entry - Save ALL fields from dpr_machine_entries table
      // Fields: id (auto), dpr_id, machine_no, operator_name, product, cavity, trg_cycle_sec, trg_run_time_min,
      //         part_wt_gm, act_part_wt_gm, act_cycle_sec, part_wt_check, cycle_time_check, shots_start, shots_end,
      //         target_qty_nos, actual_qty_nos, ok_prod_qty_nos, ok_prod_kgs, ok_prod_percent, rej_kgs, lumps_kgs,
      //         run_time_mins, down_time_min, stoppage_reason, stoppage_start, stoppage_end, stoppage_total_min,
      //         mould_change, remark, is_changeover, section_type, created_at, updated_at, etc.
      if (entry.current_production && entry.current_production.product) {
        if (!entry.machine_no) {
          console.warn('Skipping entry without machine_no:', entry);
          return [];
        }
        entries.push({
          dpr_id: dprData.id,
          section_type: 'current',
          is_changeover: false,
          machine_no: entry.machine_no || 'UNKNOWN',
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
      
      // Changeover entry - Save ALL fields including changeover-specific fields
      // Additional fields: previous_product, changeover_start_time, changeover_end_time, 
      //                    changeover_duration_min, changeover_reason
      if (entry.changeover && entry.changeover.product) {
        if (!entry.machine_no) {
          console.warn('Skipping changeover entry without machine_no:', entry);
          return [];
        }
        entries.push({
          dpr_id: dprData.id,
          section_type: 'changeover',
          is_changeover: true,
          machine_no: entry.machine_no || 'UNKNOWN',
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
        console.error('Error creating machine entries:', machineError);
        // Rollback DPR creation
        await supabase.from('dpr_data').delete().eq('id', dprData.id);
        return NextResponse.json(
          { success: false, error: machineError.message },
          { status: 500 }
        );
      }
    }
    
    // NOTE: Auto-posting disabled to give users control over when stock is updated
    // Stock posting should only happen when user explicitly clicks "Post to Stock" button
    // This prevents issues with:
    // - Accidental stock entries before DPR is reviewed
    // - Reversal entries when DPR is edited multiple times
    // - Stock posting failures blocking DPR saves
    //
    // The DPR is saved in DRAFT status. User can review and then click "Post to Stock" when ready.
    // The posting process when triggered will:
    // 1. Look up SFG code from product (mold name) in sfg_bom table
    // 2. Add SFG quantity (ok_prod_qty_nos) to FG_STORE location
    // 3. Consume raw materials from PRODUCTION based on BOM percentages
    // 4. Create REGRIND from rejected material in STORE
    console.log('📝 DPR created in DRAFT status. Use Post to Stock button to post:', dprData.id);
    
    // Fetch complete DPR with machine entries
    const { data: completeDpr } = await supabase
      .from('dpr_data')
      .select(`
        *,
        dpr_machine_entries (*)
      `)
      .eq('id', dprData.id)
      .single();
    
    return NextResponse.json({
      success: true,
      data: completeDpr,
      message: 'DPR created successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/dpr:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

