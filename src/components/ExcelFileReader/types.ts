import * as XLSX from 'xlsx';
import { 
  Machine, 
  Mold, 
  ScheduleJob, 
  PackingMaterial, 
  Line, 
  MaintenanceChecklist, 
  BOMMaster,
  ColorLabel,
  PartyName
} from '../../lib/supabase';

export interface RawMaterial {
  id?: string;
  sl_no: number;
  category: string;
  type: string;
  grade: string;
  supplier: string;
  mfi: number | null;
  density: number | null;
  tds_image?: string;
  remark?: string;
  created_at?: string;
  updated_at?: string;
  unit?: string;
}

export interface ExcelRow {
  [key: string]: any;
}

// Multi-sheet support configuration
export interface SheetFieldMapping {
  sheetName?: string | RegExp;
  sheetIndex?: number;
  headerRow?: number;
  dataStartRow?: number;
  fields: Array<{
    targetField: string;
    headerName?: string | RegExp;
    columnIndex?: number;
    rowIndex?: number;
    cellRef?: string;
    transform?: (value: any, row: any[], sheet: XLSX.WorkSheet) => any;
    required?: boolean;
  }>;
  extractMetadata?: (sheet: XLSX.WorkSheet, workbook: XLSX.WorkBook) => Record<string, any>;
  validateRow?: (row: any[], rowIndex: number, allRows?: any[][]) => boolean;
}

export interface MultiSheetConfig {
  dataType: DataType;
  sheetMappings: SheetFieldMapping[];
  combineResults?: (extractedData: Map<string, any[]>, metadata: Map<string, any>) => any[];
  validateImport?: (combinedData: any[]) => { valid: boolean; errors: string[] };
}

export type DataType = 
  | 'machines' 
  | 'molds' 
  | 'schedules' 
  | 'raw_materials' 
  | 'packing_materials' 
  | 'lines' 
  | 'maintenance_checklists' 
  | 'bom_masters' 
  | 'sfg_bom' 
  | 'fg_bom' 
  | 'local_bom' 
  | 'dpr' 
  | 'color_labels' 
  | 'party_names';

export interface ImportData {
  machines: Machine[];
  molds: Mold[];
  schedules: ScheduleJob[];
  raw_materials: RawMaterial[];
  packing_materials: PackingMaterial[];
  lines: Line[];
  maintenance_checklists: MaintenanceChecklist[];
  bom_masters: BOMMaster[];
  sfg_bom: any[];
  fg_bom: any[];
  local_bom: any[];
  dpr?: any;
  color_labels: ColorLabel[];
  party_names: PartyName[];
}

export interface ExcelFileReaderProps {
  onDataImported?: (data: ImportData) => void;
  onClose?: () => void;
  defaultDataType?: DataType;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  message: string;
  count?: number;
}

