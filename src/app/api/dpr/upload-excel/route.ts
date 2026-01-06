// ============================================================================
// DPR EXCEL UPLOAD API
// ============================================================================
// POST: Upload Excel file and create DPR entries as reference data
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadedBy = formData.get('uploaded_by') as string || 'system';
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const createdDprs: any[] = [];
    const errors: string[] = [];
    
    // Process each sheet (assuming each sheet is a DPR)
    for (const sheetName of workbook.SheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        
        // Parse Excel data and create DPR entries
        // This is a simplified parser - you may need to adjust based on your Excel format
        for (const row of data as any[]) {
          // Extract date and shift from row or sheet name
          const reportDate = row['Date'] || row['date'] || row['Report Date'] || sheetName;
          const shift = row['Shift'] || row['shift'] || 'DAY';
          
          if (!reportDate) {
            errors.push(`Skipping row in ${sheetName}: No date found`);
            continue;
          }
          
          // Check if DPR already exists
          const { data: existing } = await supabase
            .from('dpr_data')
            .select('id')
            .eq('report_date', reportDate)
            .eq('shift', shift.toUpperCase())
            .single();
          
          if (existing) {
            errors.push(`DPR already exists for ${reportDate} - ${shift}`);
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
            continue;
          }
          
          // Create machine entries from Excel data
          // Adjust this parsing logic based on your Excel structure
          const machineEntry = {
            dpr_id: dprData.id,
            section_type: row['Section'] === 'Changeover' ? 'changeover' : 'current',
            is_changeover: row['Section'] === 'Changeover',
            machine_no: row['Machine'] || row['machine_no'] || row['Machine No'] || '',
            operator_name: row['Operator'] || row['operator_name'] || null,
            product: row['Product'] || row['product'] || row['Mold'] || null,
            cavity: row['Cavity'] || row['cavity'] || null,
            target_qty_nos: row['Target Qty'] || row['target_qty'] || null,
            actual_qty_nos: row['Actual Qty'] || row['actual_qty'] || null,
            ok_prod_qty_nos: row['OK Prod Qty'] || row['ok_prod_qty'] || null,
            ok_prod_kgs: row['OK Prod Kgs'] || row['ok_prod_kgs'] || null,
            rej_kgs: row['Rej Kgs'] || row['rej_kgs'] || null,
            run_time_mins: row['Run Time'] || row['run_time'] || null,
            down_time_min: row['Down Time'] || row['down_time'] || null,
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
            } else {
              createdDprs.push(dprData);
            }
          }
        }
      } catch (sheetError) {
        errors.push(`Error processing sheet ${sheetName}: ${sheetError instanceof Error ? sheetError.message : 'Unknown error'}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      created: createdDprs.length,
      data: createdDprs,
      errors: errors.length > 0 ? errors : undefined,
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


