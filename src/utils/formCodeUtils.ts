// ============================================================================
// FORM CODE UTILS
// ============================================================================
// Document number generation with form codes
// Format: FORM_CODE + YEAR + FORM_NO (e.g., 10025260001)
// ============================================================================

import { getSupabase } from '../lib/supabase/utils';

// Form codes for each document type
export const FORM_CODES = {
  MATERIAL_INDENT: '100',
  PURCHASE_ORDER: '200',
  GRN: '300',
  JW_ANNEXURE_GRN: '400',
  MIS: '500', // Material Issue Slip
  DELIVERY_CHALLAN: '600',
  FG_TRANSFER_NOTE: '700',
  JOB_WORK_CHALLAN: '800',
  // Dispatch Memo has no form code - just sequential numbers
} as const;

// Database table names for each form type
const FORM_TABLES: Record<string, string> = {
  [FORM_CODES.MATERIAL_INDENT]: 'purchase_material_indent_slip',
  [FORM_CODES.PURCHASE_ORDER]: 'purchase_purchase_order',
  [FORM_CODES.GRN]: 'store_grn',
  [FORM_CODES.JW_ANNEXURE_GRN]: 'store_jw_annexure_grn',
  [FORM_CODES.MIS]: 'store_mis',
  [FORM_CODES.DELIVERY_CHALLAN]: 'dispatch_delivery_challan',
  [FORM_CODES.FG_TRANSFER_NOTE]: 'production_fg_transfer_note',
  [FORM_CODES.JOB_WORK_CHALLAN]: 'store_job_work_challan',
};

// Column names for doc_no in each table
const DOC_NO_COLUMNS: Record<string, string> = {
  [FORM_CODES.MATERIAL_INDENT]: 'ident_no', // Material Indent uses ident_no
  [FORM_CODES.PURCHASE_ORDER]: 'doc_no',
  [FORM_CODES.GRN]: 'doc_no',
  [FORM_CODES.JW_ANNEXURE_GRN]: 'doc_no',
  [FORM_CODES.MIS]: 'doc_no',
  [FORM_CODES.DELIVERY_CHALLAN]: 'doc_no',
  [FORM_CODES.FG_TRANSFER_NOTE]: 'doc_no',
  [FORM_CODES.JOB_WORK_CHALLAN]: 'doc_no',
};

/**
 * Get the current year (can be adjusted for financial year if needed)
 * Default: Calendar year (e.g., 2025)
 * For financial year starting April: If month >= 4, year = current year, else year = current year - 1
 */
export function getFormYear(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  
  // Financial year logic: April to March (2526 = 2025-26)
  // If you want calendar year, just return year.toString()
  // For financial year format like 2526:
  if (month >= 4) {
    // April onwards: 2025 -> 2526 (25 + 26)
    const fyStart = year;
    const fyEnd = year + 1;
    return `${String(fyStart).slice(-2)}${String(fyEnd).slice(-2)}`;
  } else {
    // Jan-Mar: 2025 -> 2525 (24 + 25)
    const fyStart = year - 1;
    const fyEnd = year;
    return `${String(fyStart).slice(-2)}${String(fyEnd).slice(-2)}`;
  }
}

/**
 * Parse document number to extract form number
 * Format: FORM_CODE (3 digits) + YEAR (4 digits) + FORM_NO (4 digits)
 * Example: 10025260001 = 100 (form code) + 2526 (year) + 0001 (form no)
 */
function parseDocumentNumber(docNo: string): { formCode: string; year: string; formNo: number } | null {
  // Document number should be at least 11 characters (3 + 4 + 4)
  if (!docNo || docNo.length < 11) return null;
  
  // Extract parts: first 3 digits = form code, next 4 = year, last 4 = form no
  const formCode = docNo.substring(0, 3);
  const year = docNo.substring(3, 7);
  const formNo = parseInt(docNo.substring(7), 10);
  
  if (isNaN(formNo)) return null;
  
  return { formCode, year, formNo };
}

/**
 * Get the next form number for a given form code and year
 * Queries the database to find the highest existing form number
 */
async function getNextFormNumber(formCode: string, year: string): Promise<number> {
  const tableName = FORM_TABLES[formCode];
  const docNoColumn = DOC_NO_COLUMNS[formCode];
  
  if (!tableName || !docNoColumn) {
    console.warn(`No table/column mapping for form code ${formCode}`);
    return 1; // Start from 1 if no mapping
  }
  
  try {
    const supabase = getSupabase();
    
    // Query all documents for this form type
    const { data, error } = await supabase
      .from(tableName)
      .select(docNoColumn)
      .not(docNoColumn, 'is', null);
    
    if (error) {
      console.error(`Error fetching documents for ${tableName}:`, error);
      return 1;
    }
    
    if (!data || data.length === 0) {
      return 1; // First document
    }
    
    // Parse all document numbers and find the highest form number for this year
    let maxFormNo = 0;
    const prefix = `${formCode}${year}`; // e.g., "1002526"
    
    for (const row of data) {
      const docNo = (row as Record<string, any>)[docNoColumn];
      if (!docNo || typeof docNo !== 'string') continue;
      
      // Check if it matches our format (starts with form code + year)
      if (docNo.startsWith(prefix)) {
        const parsed = parseDocumentNumber(docNo);
        if (parsed && parsed.year === year && parsed.formCode === formCode) {
          maxFormNo = Math.max(maxFormNo, parsed.formNo);
        }
      }
    }
    
    return maxFormNo + 1;
  } catch (error) {
    console.error(`Error getting next form number for ${formCode}:`, error);
    return 1;
  }
}

/**
 * Generate document number for a form type
 * Format: FORM_CODE + YEAR + FORM_NO (e.g., 10025260001)
 * 
 * @param formCode - Form code (e.g., FORM_CODES.MATERIAL_INDENT)
 * @param date - Optional date to determine year (defaults to current date)
 * @returns Promise<string> - Generated document number
 */
export async function generateDocumentNumber(
  formCode: string,
  date?: Date | string
): Promise<string> {
  const year = getFormYear(date);
  const formNo = await getNextFormNumber(formCode, year);
  
  // Format form number as 4 digits (0001, 0002, etc.)
  const formattedFormNo = String(formNo).padStart(4, '0');
  
  // Concatenate: form code (3 digits) + year (4 digits) + form no (4 digits)
  return `${formCode}${year}${formattedFormNo}`;
}

/**
 * Generate document number for Dispatch Memo (special case - no form code)
 * Format: Just sequential number (1, 2, 3, 4, ...)
 */
export async function generateDispatchMemoNumber(): Promise<string> {
  try {
    const supabase = getSupabase();
    
    // Query all dispatch memos to find the highest memo_no
    const { data, error } = await supabase
      .from('dispatch_dispatch_memo')
      .select('memo_no')
      .not('memo_no', 'is', null)
      .order('memo_no', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching dispatch memos:', error);
      return '1';
    }
    
    if (!data || data.length === 0) {
      return '1'; // First memo
    }
    
    // Parse the highest memo_no (should be a number)
    const lastMemoNo = data[0].memo_no;
    const lastNumber = parseInt(lastMemoNo, 10);
    
    if (isNaN(lastNumber)) {
      return '1'; // If parsing fails, start from 1
    }
    
    return String(lastNumber + 1);
  } catch (error) {
    console.error('Error generating dispatch memo number:', error);
    return '1';
  }
}

