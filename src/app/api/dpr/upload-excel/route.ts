// ============================================================================
// DPR EXCEL UPLOAD API
// ============================================================================
// POST: Upload Excel file and create DPR entries as reference data
// Tracks uploads in dpr_excel_uploads table for history and persistence
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { verifyAuth, unauthorized } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadedBy = formData.get('uploaded_by') as string || 'system';
    const description = formData.get('description') as string || null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Create Excel upload record first
    const { data: excelUpload, error: uploadError } = await supabase
      .from('dpr_excel_uploads')
      .insert([{
        file_name: file.name,
        file_size_bytes: file.size,
        uploaded_by: uploadedBy,
        uploaded_by_user_id: auth.user?.id || null,
        import_status: 'PROCESSING',
        import_started_at: new Date().toISOString(),
        total_sheets_processed: workbook.SheetNames.length,
        description: description,
        errors: [],
        warnings: []
      }])
      .select()
      .single();
    
    if (uploadError || !excelUpload) {
      console.error('Error creating Excel upload record:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to create upload record' },
        { status: 500 }
      );
    }
    
    const createdDprs: any[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalRecordsProcessed = 0;
    let recordsSuccess = 0;
    let recordsFailed = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;
    
    // Process each sheet (assuming each sheet is a DPR)
    for (const sheetName of workbook.SheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        
        // Parse Excel data and create DPR entries
        for (const row of data as any[]) {
          totalRecordsProcessed++;
          
          // Extract date and shift from row or sheet name
          const reportDate = row['Date'] || row['date'] || row['Report Date'] || sheetName;
          const shift = row['Shift'] || row['shift'] || 'DAY';
          
          if (!reportDate) {
            errors.push(`Skipping row in ${sheetName}: No date found`);
            recordsFailed++;
            continue;
          }
          
          // Track date range
          if (!minDate || reportDate < minDate) minDate = reportDate;
          if (!maxDate || reportDate > maxDate) maxDate = reportDate;
          
          // Check if DPR already exists
          const { data: existing } = await supabase
            .from('dpr_data')
            .select('id')
            .eq('report_date', reportDate)
            .eq('shift', shift.toUpperCase())
            .single();
          
          if (existing) {
            warnings.push(`DPR already exists for ${reportDate} - ${shift}`);
            
            // Track as duplicate in upload entries
            await supabase
              .from('dpr_excel_upload_entries')
              .insert([{
                excel_upload_id: excelUpload.id,
                dpr_id: existing.id,
                sheet_name: sheetName,
                row_number: totalRecordsProcessed,
                entry_status: 'DUPLICATE',
                error_message: 'DPR already exists for this date/shift'
              }]);
            
            continue;
          }
          
          // Create DPR as Excel upload (reference data)
          const { data: dprData, error: dprError } = await supabase
            .from('dpr_data')
            .insert([{
              report_date: reportDate,
              shift: shift.toUpperCase(),
              shift_incharge: row['Shift Incharge'] || row['shift_incharge'] || null,
              entry_type: 'EXCEL_UPLOAD',
              is_reference_data: true,
              excel_file_name: file.name,
              excel_upload_id: excelUpload.id,
              excel_uploaded_at: new Date().toISOString(),
              excel_uploaded_by: uploadedBy,
              stock_status: 'DRAFT', // Excel uploads cannot be posted
              approval_status: 'PENDING',
              created_by: uploadedBy,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();
          
          if (dprError || !dprData) {
            errors.push(`Error creating DPR for ${reportDate} - ${shift}: ${dprError?.message}`);
            recordsFailed++;
            continue;
          }
          
          // Create machine entries from Excel data
          const machineEntry = {
            dpr_id: dprData.id,
            section_type: row['Section'] === 'Changeover' ? 'changeover' : 'current',
            is_changeover: row['Section'] === 'Changeover',
            machine_no: row['Machine'] || row['machine_no'] || row['Machine No'] || row['M/c No'] || '',
            operator_name: row['Operator'] || row['operator_name'] || row['Opt Name'] || null,
            product: row['Product'] || row['product'] || row['Mold'] || null,
            cavity: row['Cavity'] || row['cavity'] || null,
            trg_cycle_sec: row['Trg Cycle'] || row['trg_cycle_sec'] || row['Target Cycle'] || null,
            trg_run_time_min: row['Trg Run Time'] || row['trg_run_time_min'] || row['Target Run Time'] || null,
            part_wt_gm: row['Part Wt'] || row['part_wt_gm'] || row['Part Weight'] || null,
            act_part_wt_gm: row['Act Part Wt'] || row['act_part_wt_gm'] || row['Actual Part Weight'] || null,
            act_cycle_sec: row['Act Cycle'] || row['act_cycle_sec'] || row['Actual Cycle'] || null,
            shots_start: row['Shots Start'] || row['shots_start'] || null,
            shots_end: row['Shots End'] || row['shots_end'] || null,
            target_qty_nos: row['Target Qty'] || row['target_qty'] || row['Target Qty (Nos)'] || null,
            actual_qty_nos: row['Actual Qty'] || row['actual_qty'] || row['Actual Qty (Nos)'] || null,
            ok_prod_qty_nos: row['OK Prod Qty'] || row['ok_prod_qty'] || row['Ok Prod Qty (Nos)'] || null,
            ok_prod_kgs: row['OK Prod Kgs'] || row['ok_prod_kgs'] || row['Ok Prod (Kgs)'] || null,
            ok_prod_percent: row['OK Prod %'] || row['ok_prod_percent'] || row['Ok Prod (%)'] || null,
            rej_kgs: row['Rej Kgs'] || row['rej_kgs'] || row['Rej (Kgs)'] || null,
            lumps_kgs: row['Lumps'] || row['lumps_kgs'] || row['Lumps (Kgs)'] || null,
            run_time_mins: row['Run Time'] || row['run_time'] || row['Run Time (mins)'] || null,
            down_time_min: row['Down Time'] || row['down_time'] || row['Down time (min)'] || null,
            stoppage_reason: row['Reason'] || row['stoppage_reason'] || null,
            stoppage_start: row['Start Time'] || row['stoppage_start'] || null,
            stoppage_end: row['End Time'] || row['stoppage_end'] || null,
            mould_change: row['Mould Change'] || row['mould_change'] || null,
            remark: row['Remark'] || row['remark'] || row['REMARK'] || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          if (machineEntry.machine_no && machineEntry.product) {
            const { error: machineError } = await supabase
              .from('dpr_machine_entries')
              .insert([machineEntry]);
            
            if (machineError) {
              errors.push(`Error creating machine entry for ${reportDate} - ${shift}: ${machineError.message}`);
              // Delete the DPR if machine entry fails
              await supabase.from('dpr_data').delete().eq('id', dprData.id);
              recordsFailed++;
              
              // Track failed entry
              await supabase
                .from('dpr_excel_upload_entries')
                .insert([{
                  excel_upload_id: excelUpload.id,
                  dpr_id: dprData.id,
                  sheet_name: sheetName,
                  row_number: totalRecordsProcessed,
                  entry_status: 'FAILED',
                  error_message: machineError.message
                }]);
            } else {
              createdDprs.push(dprData);
              recordsSuccess++;
              
              // Track successful entry
              await supabase
                .from('dpr_excel_upload_entries')
                .insert([{
                  excel_upload_id: excelUpload.id,
                  dpr_id: dprData.id,
                  sheet_name: sheetName,
                  row_number: totalRecordsProcessed,
                  entry_status: 'SUCCESS'
                }]);
            }
          } else {
            // Machine entry has missing required fields
            warnings.push(`Skipping row in ${sheetName}: Missing machine_no or product`);
            // Keep the DPR but mark as skipped
            await supabase
              .from('dpr_excel_upload_entries')
              .insert([{
                excel_upload_id: excelUpload.id,
                dpr_id: dprData.id,
                sheet_name: sheetName,
                row_number: totalRecordsProcessed,
                entry_status: 'SKIPPED',
                error_message: 'Missing machine_no or product'
              }]);
          }
        }
      } catch (sheetError) {
        errors.push(`Error processing sheet ${sheetName}: ${sheetError instanceof Error ? sheetError.message : 'Unknown error'}`);
      }
    }
    
    // Determine final status
    let finalStatus = 'COMPLETED';
    if (recordsFailed > 0 && recordsSuccess === 0) {
      finalStatus = 'FAILED';
    } else if (recordsFailed > 0) {
      finalStatus = 'PARTIAL';
    }
    
    // Update Excel upload record with final statistics
    await supabase
      .from('dpr_excel_uploads')
      .update({
        import_status: finalStatus,
        import_completed_at: new Date().toISOString(),
        total_records_processed: totalRecordsProcessed,
        records_imported_success: recordsSuccess,
        records_imported_failed: recordsFailed,
        data_date_from: minDate,
        data_date_to: maxDate,
        errors: errors,
        warnings: warnings,
        updated_at: new Date().toISOString()
      })
      .eq('id', excelUpload.id);
    
    return NextResponse.json({
      success: true,
      upload_id: excelUpload.id,
      created: createdDprs.length,
      data: createdDprs,
      statistics: {
        total_processed: totalRecordsProcessed,
        success: recordsSuccess,
        failed: recordsFailed,
        date_range: minDate && maxDate ? { from: minDate, to: maxDate } : null
      },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      message: `Successfully uploaded ${createdDprs.length} DPR entries from Excel`
    });
  } catch (error) {
    console.error('Error in POST /api/dpr/upload-excel:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// GET: List Excel upload history
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const { data, error, count } = await supabase
      .from('dpr_excel_uploads')
      .select('*', { count: 'exact' })
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching Excel upload history:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    });
  } catch (error) {
    console.error('Error in GET /api/dpr/upload-excel:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
