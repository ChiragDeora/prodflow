'use client';

// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================
import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle,
  X, Loader2, Eye, Trash2, FileDown, Info, ChevronUp, ChevronDown
} from 'lucide-react';
import {
  machineAPI, moldAPI, scheduleAPI, rawMaterialAPI, packingMaterialAPI, lineAPI, maintenanceChecklistAPI, bomMasterAPI,
  colorLabelAPI, partyNameAPI,
  Machine, Mold, ScheduleJob, PackingMaterial, Line, MaintenanceChecklist, BOMMaster, ColorLabel, PartyName
} from '../lib/supabase';
import { useAuth } from './auth/AuthProvider';
import { removeOldPrefix, updateItemNameWithRPOrCK } from '../utils/bomCodeUtils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
interface RawMaterial {
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

interface ExcelRow {
  [key: string]: any;
}

// ============================================================================
// MULTI-SHEET SUPPORT - Sheet Configuration for Precise Data Extraction
// ============================================================================
interface SheetFieldMapping {
  // Sheet identification
  sheetName?: string | RegExp; // Exact name or regex pattern to match sheet
  sheetIndex?: number; // Optional: sheet index (0-based)
  
  // Data location - supports multiple methods
  headerRow?: number; // Row index (0-based) containing headers
  dataStartRow?: number; // Row index where data starts (after headers)
  
  // Field extraction - can be by header name OR by cell position
  fields: Array<{
    targetField: string; // Field name in output object
    headerName?: string | RegExp; // Header name pattern to match
    columnIndex?: number; // Alternative: exact column index (0-based)
    rowIndex?: number; // For fixed-position fields (e.g., metadata in specific cells)
    cellRef?: string; // Excel cell reference (e.g., "A1", "B5")
    transform?: (value: any, row: any[], sheet: XLSX.WorkSheet) => any; // Custom transformation
    required?: boolean; // Is this field required?
  }>;
  
  // Sheet-level data extraction
  extractMetadata?: (sheet: XLSX.WorkSheet, workbook: XLSX.WorkBook) => Record<string, any>;
  
  // Row validation
  validateRow?: (row: any[], rowIndex: number, allRows?: any[][]) => boolean; // Skip invalid rows
}

interface MultiSheetConfig {
  dataType: DataType;
  sheetMappings: SheetFieldMapping[];
  combineResults?: (extractedData: Map<string, any[]>, metadata: Map<string, any>) => any[];
  validateImport?: (combinedData: any[]) => { valid: boolean; errors: string[] };
}

type DataType = 'machines' | 'molds' | 'schedules' | 'raw_materials' | 'packing_materials' | 'lines' | 'maintenance_checklists' | 'bom_masters' | 'sfg_bom' | 'fg_bom' | 'local_bom' | 'dpr' | 'color_labels' | 'party_names';

interface ImportData {
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
  dpr?: any; // DPR data structure (will be defined based on your headers)
  color_labels: ColorLabel[];
  party_names: PartyName[];
}

interface ExcelFileReaderProps {
  onDataImported?: (data: ImportData) => void;
  onClose?: () => void;
  defaultDataType?: DataType;
}

// ============================================================================
// CANONICAL HEADERS (single source of truth for templates & export)
// ============================================================================
const CANONICAL_HEADERS: Record<DataType, string[]> = {
  machines: [
    'Sr. No.', 'Category', 'Make', 'Size', 'Model', 'Serial No.', 'CLM Sr. No.', 'Inj. Serial No.',
    'Mfg Date', 'Inst Date', 'Dimensions (LxBxH)', 'Name Plate', 'Capacity (Tons)',
    'Grinding Available', 'Status', 'Zone', 'Purchase Date', 'Remarks', 'Unit'
  ],
  molds: [
    'Sr.no.', 'Mold name', 'Type', 'Cavities', 'Cycle Time', 'Dwg Wt', 'Std. Wt.', 'RP wt.',
    'Dimensions', 'Mold Wt.', 'HRC Make', 'HRC Zone', 'Make', 'Start Date', 'Unit'
  ],
  schedules: [
    'Schedule ID', 'Date', 'Shift', 'Machine ID', 'Mold ID', 'Start Time', 'End Time', 'Color',
    'Expected Pieces', 'Stacks per Box', 'Pieces per Stack', 'Created By', 'Is Done', 'Approval Status'
  ],
  raw_materials: [
    'Sl.', 'Category', 'Type', 'Grade', 'Supplier', 'MFI', 'Density', 'TDS Attached', 'Remark', 'Unit'
  ],
  packing_materials: [
    'Category', 'Type', 'Item Code', 'Pack Size', 'Dimensions', 'Technical Detail', 'Brand', 'Unit'
  ],
  lines: [
    'Line no.', 'Line ID','Description', 'IM', 'Robot', 'Hoist', 'Conveyor', 'Status', 'Unit'
  ],
  maintenance_checklists: [
    'Line ID', 'Machine ID', 'Checklist Name', 'Checklist Type', 'Item ID', 'Task Description', 
    'Frequency', 'Estimated Duration (min)', 'Priority', 'Category', 'Unit'
  ],
  bom_masters: [
    'Sl', 'Item Name', 'SFG-Code', 'Pcs', 'Part Wt (gm/pcs)', 'Colour', 'HP %', 'ICP %', 'RCP %', 'LDPE %', 'GPPS %', 'MB %'
  ],
  sfg_bom: [
    'Sl', 'Item Name', 'SFG-Code', 'Pcs', 'Part Wt (gm/pcs)', 'Colour', 'HP %', 'ICP %', 'RCP %', 'LDPE %', 'GPPS %', 'MB %'
  ],
  fg_bom: [
    'Sl', 'Item Code', 'Party Name', 'Pack Size', 'SFG-1', 'SFG-1 Qty', 'SFG-2', 'SFG-2 Qty', 'CNT Code', 'CNT QTY', 'Polybag Code', 'Poly Qty', 'BOPP 1', 'Qty/Meter', 'BOPP 2', 'Qty/Meter 2'
  ],
        local_bom: [
          'Sl', 'Item Code', 'Pack Size', 'SFG-1', 'SFG-1 Qty', 'SFG-2', 'SFG-2 Qty', 'CNT Code', 'CNT QTY', 'Polybag Code', 'Poly Qty', 'BOPP 1', 'Qty/Meter', 'BOPP 2', 'Qty/Meter 2'
        ],
  dpr: [], // DPR will be configured with multi-sheet structure - headers defined in sheet mappings
  color_labels: [
    'Sr. No.', 'Color / Label'
  ],
  party_names: [
    'Sr. No.', 'Name'
  ]
};

// ============================================================================
// HEADER → DB FIELD MAPPINGS (friendly header variants supported too)
// ============================================================================
const TEMPLATE_MAPPINGS = {
  machines: {
    'Sr. No.': 'machine_id',
    'Sr. No': 'machine_id',
    'Category': 'category',
    'Make': 'make',
    'Size': 'size',
    'Model': 'model',
    'Serial No.': 'serial_no',
    'Serial No': 'serial_no',
    'CLM Sr. No.': 'clm_sr_no',
    'CLM Sr. No': 'clm_sr_no',
    'Inj. Serial No.': 'inj_serial_no',
    'Inj. Serial No': 'inj_serial_no',
    'Mfg Date': 'mfg_date',
    'Inst Date': 'install_date',
    'Install Date': 'install_date',
    'Dimensions (LxBxH)': 'dimensions',
    'Dimensions': 'dimensions',
    'Name Plate': 'nameplate_details',
    'Nameplate Details': 'nameplate_details',
    'Capacity (Tons)': 'capacity_tons',
    'Grinding Available': 'grinding_available',
    'Status': 'status',
    'Zone': 'zone',
    'Purchase Date': 'purchase_date',
    'Remarks': 'remarks',
    'Unit': 'unit'
  },
  molds: {
    'Sr.no.': 'sr_no',
    'Sr. no.': 'sr_no',
    'Mold name': 'mold_name',
    'Mold Name': 'mold_name',
    'Type': 'type',
    'Cavities': 'cavities',
    'Cavity': 'cavities',
    'Cycle Time': 'cycle_time',
    'Dwg Wt': 'dwg_wt',
    'Dwg Wt.': 'dwg_wt',
    'Std. Wt.': 'std_wt',
    'RP wt.': 'rp_wt',
    'RP Wt.': 'rp_wt',
    'Dimensions': 'dimensions',
    'Mold Wt.': 'mold_wt',
    'Mold Wt': 'mold_wt',
    'HRC Make': 'hrc_make',
    'HRC Zone': 'hrc_zone',
    'Make': 'make',
    'Start Date': 'start_date',
    'Unit': 'unit',
    // legacy
    'Item Code': 'mold_id',
    'Item Name': 'mold_name',
    'St. Wt.': 'st_wt',
    'Mold ID': 'mold_id',
    'Maker': 'maker',
    'Purchase Date': 'purchase_date',
    'Compatible Machines': 'compatible_machines'
  },
  schedules: {
    'Schedule ID': 'schedule_id',
    'Date': 'date',
    'Shift': 'shift',
    'Machine ID': 'machine_id',
    'Mold ID': 'mold_id',
    'Start Time': 'start_time',
    'End Time': 'end_time',
    'Color': 'color',
    'Expected Pieces': 'expected_pieces',
    'Stacks per Box': 'stacks_per_box',
    'Pieces per Stack': 'pieces_per_stack',
    'Created By': 'created_by',
    'Is Done': 'is_done',
    'Approval Status': 'approval_status'
  },
  raw_materials: {
    'Sl.': 'sl_no',
    'SL': 'sl_no',
    'SL.': 'sl_no',
    'Category': 'category',
    'Type': 'type',
    'Grade': 'grade',
    'Supplier': 'supplier',
    'MFI': 'mfi',
    'Density': 'density',
    'TDS Attached': 'tds_image',
    'Remark': 'remark',
    'Unit': 'unit'
  },
  packing_materials: {
    'Category': 'category',
    'Type': 'type',
    'Item Code': 'item_code',
    'Item code': 'item_code',
    'item_code': 'item_code',
    'ItemCode': 'item_code',
    'Pack Size': 'pack_size',
    'PackSize': 'pack_size',
    'Dimensions': 'dimensions',
    'Technical Detail': 'technical_detail',
    'TechnicalDetail': 'technical_detail',
    'Brand': 'brand',
    'Unit': 'unit'
  },
  lines: {
    'Line ID': 'line_id',
    'Line ID.': 'line_id',
    'Line no.': 'line_id',
    'Line no': 'line_id',
    'Line': 'line_id',

    'Description': 'description',
    'Desc': 'description',
    'IM Machine ID': 'im_machine_id',
    'IM': 'im_machine_id',
    'IM Machine': 'im_machine_id',
    'Injection Machine': 'im_machine_id',
    'Robot Machine ID': 'robot_machine_id',
    'Robot': 'robot_machine_id',
    'Robot Machine': 'robot_machine_id',
    'Conveyor Machine ID': 'conveyor_machine_id',
    'Conveyor': 'conveyor_machine_id',
    'Conveyor Machine': 'conveyor_machine_id',
    'Hoist Machine ID': 'hoist_machine_id',
    'Hoist': 'hoist_machine_id',
    'Hoist Machine': 'hoist_machine_id',
    'Status': 'status',
    'Unit': 'unit'
  },
  maintenance_checklists: {
    'Line ID': 'line_id',
    'Line ID.': 'line_id',
    'Machine ID': 'machine_id',
    'Machine ID.': 'machine_id',
    'Checklist Name': 'name',
    'Checklist Name.': 'name',
    'Checklist Type': 'checklist_type',
    'Checklist Type.': 'checklist_type',
    'Item ID': 'item_id',
    'Item ID.': 'item_id',
    'Task Description': 'task_description',
    'Task Description.': 'task_description',
    'Frequency': 'frequency',
    'Estimated Duration (min)': 'estimated_duration_minutes',
    'Estimated Duration (min).': 'estimated_duration_minutes',
    'Priority': 'priority',
    'Category': 'category',
    'Unit': 'unit'
  },
  bom_masters: {
    'Sl': 'sl_no',
    'Item Name': 'item_name',
    'SFG-Code': 'sfg_code',
    'Pcs': 'pcs',
    'Part Wt (gm/pcs)': 'part_weight_gm_pcs',
    'Colour': 'colour',
    'HP %': 'hp_percentage',
    'ICP %': 'icp_percentage',
    'RCP %': 'rcp_percentage',
    'LDPE %': 'ldpe_percentage',
    'GPPS %': 'gpps_percentage',
    'MB %': 'mb_percentage'
  },
  sfg_bom: {
    'Sl': 'sl_no',
    'Item Name': 'item_name',
    'SFG-Code': 'sfg_code',
    'Pcs': 'pcs',
    'Part Wt (gm/pcs)': 'part_weight_gm_pcs',
    'Colour': 'colour',
    'HP %': 'hp_percentage',
    'ICP %': 'icp_percentage',
    'RCP %': 'rcp_percentage',
    'LDPE %': 'ldpe_percentage',
    'GPPS %': 'gpps_percentage',
        'MB %': 'mb_percentage'
  },
  color_labels: {
    'Sr. No.': 'sr_no',
    'Sr. No': 'sr_no',
    'Sr.no.': 'sr_no',
    'Sr.no': 'sr_no',
    'Color / Label': 'color_label',
    'Color': 'color_label',
    'Color/Label': 'color_label',
    'colour': 'color_label',
    'Colour': 'color_label',
    'Name': 'color_label'
  },
  party_names: {
    'Sr. No.': 'sl_no',
    'Sr. No': 'sl_no',
    'Sr.no.': 'sl_no',
    'Sr.no': 'sl_no',
    'Name': 'name',
    'Party Name': 'name',
    'PartyName': 'name'
  },
  fg_bom: {
    'Sl': 'sl_no',
    'Item Code': 'item_code',
    'Party Name': 'party_name',
    'Pack Size': 'pack_size',
    'SFG-1': 'sfg_1',
    'SFG-1 Qty': 'sfg_1_qty',
    'SFG-2': 'sfg_2',
    'SFG-2 Qty': 'sfg_2_qty',
    'CNT Code': 'cnt_code',
    'CNT QTY': 'cnt_qty',
    'Polybag Code': 'polybag_code',
    'Poly Qty': 'poly_qty',
    'BOPP 1': 'bopp_1',
    'Qty/Meter': 'qty_meter',
    'QTY/METER': 'qty_meter',
    'BOPP 2': 'bopp_2',
    'Qty/Meter 2': 'qty_meter_2',
    'QTY/METER 2': 'qty_meter_2'
  },

    local_bom: {
    'Sl': 'sl_no',
    'Sl.': 'sl_no',
    'SL': 'sl_no',
    'SL.': 'sl_no',
    'Item Code': 'item_code',
    'ITEM CODE': 'item_code',
    'ItemCode': 'item_code',
    'Pack Size': 'pack_size',
    'PACK SIZE': 'pack_size',
    'PackSize': 'pack_size',
    'SFG-1': 'sfg_1',
    'SFG-1 Qty': 'sfg_1_qty',
    'SFG-1 QTY': 'sfg_1_qty',
    'SFG-1 Qty.': 'sfg_1_qty',
    'SFG-2': 'sfg_2',
    'SFG-2 Qty': 'sfg_2_qty',
    'SFG-2 QTY': 'sfg_2_qty',
    'SFG-2 Qty.': 'sfg_2_qty',
    'CNT Code': 'cnt_code',
    'CNT CODE': 'cnt_code',
    'CNT QTY': 'cnt_qty',
    'CNT Qty': 'cnt_qty',
    'CNT Qty.': 'cnt_qty',
    'Polybag Code': 'polybag_code',
    'POLYBAG CODE': 'polybag_code',
    'PolybagCode': 'polybag_code',
    'Poly Qty': 'poly_qty',
    'POLY QTY': 'poly_qty',
    'Poly Qty.': 'poly_qty',
    'BOPP 1': 'bopp_1',
    'BOPP1': 'bopp_1',
    'Bopp 1': 'bopp_1',
    'Qty/Meter': 'qty_meter',
    'QTY/METER': 'qty_meter',
    'Qty/Meter.': 'qty_meter',
    'Qty Meter': 'qty_meter',
    'QTY METER': 'qty_meter',
    'Quantity/Meter': 'qty_meter',
    'Quantity per Meter': 'qty_meter',
    'BOPP 2': 'bopp_2',
    'BOPP2': 'bopp_2',
    'Bopp 2': 'bopp_2',
    'Qty/Meter 2': 'qty_meter_2',
    'QTY/METER 2': 'qty_meter_2',
    'Qty/Meter 2.': 'qty_meter_2',
    'Qty Meter 2': 'qty_meter_2',
    'QTY METER 2': 'qty_meter_2',
    'Quantity/Meter 2': 'qty_meter_2',
    'Quantity per Meter 2': 'qty_meter_2'
  }
} as const;

// score header overlap to guess type
const scoreHeaders = (headers: string[]): DataType => {
  console.log('🔍 Scoring headers:', headers);
  
  // Special handling for BOM types to avoid confusion
  const bomTypes = ['fg_bom', 'local_bom', 'sfg_bom'];
  
  const scores = (Object.keys(CANONICAL_HEADERS) as DataType[]).map(t => {
    let typeScore = CANONICAL_HEADERS[t].reduce((acc, h) => {
      const hasMatch = headers.some(x => x.toLowerCase().trim() === h.toLowerCase().trim());
      if (hasMatch) {
        console.log(`🔍 Match found for ${t}: "${h}" matches "${headers.find(x => x.toLowerCase().trim() === h.toLowerCase().trim())}"`);
      }
      return acc + (hasMatch ? 1 : 0);
    }, 0);
    
    // Boost score for BOM types if they have unique identifiers
    if (bomTypes.includes(t)) {
      if (t === 'local_bom') {
        // Check for local-specific patterns
        const hasLocalPatterns = headers.some(h => 
          h.toLowerCase().includes('local') || 
          h.toLowerCase().includes('sfg-1') && h.toLowerCase().includes('sfg-2') ||
          h.toLowerCase().includes('cnt code') && h.toLowerCase().includes('cnt qty')
        );
        if (hasLocalPatterns) {
          typeScore += 10; // Strong boost for local-specific headers
          console.log(`🔍 Boosting ${t} score for local-specific patterns`);
        }
      }
      if (t === 'fg_bom') {
        // Check for fg-specific patterns
        const hasFgPatterns = headers.some(h => 
          h.toLowerCase().includes('party') || 
          h.toLowerCase().includes('party name')
        );
        if (hasFgPatterns) {
          typeScore += 10; // Strong boost for fg-specific headers
          console.log(`🔍 Boosting ${t} score for fg-specific patterns`);
        }
      }
      if (t === 'sfg_bom') {
        // Check for sfg-specific patterns
        const hasSfgPatterns = headers.some(h => 
          h.toLowerCase().includes('sfg-code') || 
          h.toLowerCase().includes('part wt') ||
          h.toLowerCase().includes('hp %')
        );
        if (hasSfgPatterns) {
          typeScore += 10; // Strong boost for sfg-specific headers
          console.log(`🔍 Boosting ${t} score for sfg-specific patterns`);
        }
      }
    }
    
    console.log(`🔍 Type ${t} score: ${typeScore}`);
    return { type: t, score: typeScore };
  });
  
  scores.sort((a, b) => b.score - a.score);
  console.log('🔍 Final scores:', scores);
  console.log('🔍 Selected type:', scores[0].type);
  
  return scores[0].type;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ExcelFileReader = ({ onDataImported, onClose, defaultDataType = 'machines' }: ExcelFileReaderProps) => {
  // Auth context
  const { user } = useAuth();
  
  // Files
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheet selection state
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [selectAllSheets, setSelectAllSheets] = useState(false);

  // Data state
  const [dataType, setDataType] = useState<DataType>(defaultDataType);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fullRows, setFullRows] = useState<ExcelRow[]>([]);         // ✅ full dataset
  const [preview, setPreview] = useState<ExcelRow[]>([]);

  const [mappedData, setMappedData] = useState<ImportData>({
    machines: [],
    molds: [],
    schedules: [],
    raw_materials: [],
    packing_materials: [],
    lines: [],
    maintenance_checklists: [],
    bom_masters: [],
    sfg_bom: [],
    fg_bom: [],
    local_bom: [],
    color_labels: [],
    party_names: []
  });

  // UI/UX
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | '' | 'info', message: string }>({ type: '', message: '' });

  // Sorting
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Infer best data type from current headers, but respect manual selection
  const inferredType = useMemo(() => {
    // If user has manually selected a type (not default 'machines'), use that
    if (dataType !== 'machines') {
      console.log(`🔍 Using manual selection for inferredType: ${dataType}`);
      return dataType;
    }
    // Otherwise, auto-detect from headers
    if (headers.length) {
      const detected = scoreHeaders(headers);
      console.log(`🔍 Auto-detected type for inferredType: ${detected}`);
      return detected;
    }
    return dataType;
  }, [headers, dataType]);

  // ----------------------------------------------------------------------------
  // Sorting helpers
  const sortData = (data: ExcelRow[], field: string, direction: 'asc' | 'desc'): ExcelRow[] => {
    if (!field) return data;
    return [...data].sort((a, b) => {
      const aValue = a[field] ?? '';
      const bValue = b[field] ?? '';
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);
      if (!isNaN(aNum) && !isNaN(bNum)) return direction === 'asc' ? aNum - bNum : bNum - aNum;
      const aStr = aValue.toString().toLowerCase();
      const bStr = bValue.toString().toLowerCase();
      return direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  };

  const handleSortChange = (field: string) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  // ----------------------------------------------------------------------------
  // File handling
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setImportStatus({ type: '', message: '' });
    setSortField(''); setSortDirection('asc');
    
    // Read workbook to get sheet names
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { 
        type: 'array',
        cellDates: false,
        cellNF: false,
        cellText: false,
        cellFormula: false,
        cellStyles: false,
        cellHTML: false
      });
      
      const sheets = workbook.SheetNames;
      setAvailableSheets(sheets);
      
      // Auto-select all sheets by default
      setSelectedSheets(new Set(sheets));
      setSelectAllSheets(true);
      
      // If only one sheet, proceed with parsing
      if (sheets.length === 1) {
        await parseExcelFile(selectedFile);
      } else {
        // For multi-sheet files, wait for user to confirm sheet selection
        // Don't parse yet - let user choose sheets first
        setLoading(false);
      }
    } catch (err) {
      console.error('Error reading file:', err);
      setImportStatus({ type: 'error', message: 'Error reading file. Please try again.' });
    }
  };

  // Handle sheet selection changes
  const handleSheetToggle = (sheetName: string) => {
    const newSelected = new Set(selectedSheets);
    if (newSelected.has(sheetName)) {
      newSelected.delete(sheetName);
    } else {
      newSelected.add(sheetName);
    }
    setSelectedSheets(newSelected);
    setSelectAllSheets(newSelected.size === availableSheets.length);
  };

  // Handle "Select All" toggle
  const handleSelectAllToggle = () => {
    if (selectAllSheets) {
      setSelectedSheets(new Set());
      setSelectAllSheets(false);
    } else {
      setSelectedSheets(new Set(availableSheets));
      setSelectAllSheets(true);
    }
  };

  // Parse file with selected sheets
  const handleParseWithSelectedSheets = async () => {
    if (!file || selectedSheets.size === 0) {
      setImportStatus({ type: 'error', message: 'Please select at least one sheet to import.' });
      return;
    }
    await parseExcelFile(file);
  };

  // ============================================================================
  // MULTI-SHEET PARSING ENGINE - Zero Loss Data Extraction
  // ============================================================================
  const parseMultiSheetWorkbook = async (
    workbook: XLSX.WorkBook, 
    config: MultiSheetConfig
  ): Promise<{ data: any[]; metadata: Map<string, any>; errors: string[] }> => {
    const extractedData = new Map<string, any[]>();
    const metadata = new Map<string, any>();
    const errors: string[] = [];

    console.log('📊 Starting multi-sheet parsing for:', config.dataType);
    console.log('📊 Available sheets:', workbook.SheetNames);

    // Process each sheet mapping
    for (const mapping of config.sheetMappings) {
      try {
        // Find matching sheet
        let targetSheet: XLSX.WorkSheet | null = null;
        let sheetName = '';

        if (mapping.sheetIndex !== undefined) {
          // Match by index
          if (mapping.sheetIndex < workbook.SheetNames.length) {
            sheetName = workbook.SheetNames[mapping.sheetIndex];
            targetSheet = workbook.Sheets[sheetName];
          } else {
            errors.push(`Sheet index ${mapping.sheetIndex} out of range (total: ${workbook.SheetNames.length})`);
            continue;
          }
        } else if (mapping.sheetName) {
          // Match by name or regex
          if (mapping.sheetName instanceof RegExp) {
            const match = workbook.SheetNames.find(name => mapping.sheetName instanceof RegExp && mapping.sheetName.test(name));
            if (match) {
              sheetName = match;
              targetSheet = workbook.Sheets[match];
            }
          } else {
            // Exact match (case-insensitive)
            const match = workbook.SheetNames.find(name => name.toLowerCase() === String(mapping.sheetName).toLowerCase());
            if (match) {
              sheetName = match;
              targetSheet = workbook.Sheets[match];
            }
          }
        }

        if (!targetSheet) {
          errors.push(`Sheet not found: ${mapping.sheetName || `index ${mapping.sheetIndex}`}`);
          continue;
        }

        console.log(`📄 Processing sheet: "${sheetName}"`);

        // Extract metadata if specified
        if (mapping.extractMetadata) {
          const meta = mapping.extractMetadata(targetSheet, workbook);
          metadata.set(sheetName, meta);
          console.log(`📋 Extracted metadata from ${sheetName}:`, meta);
        }

        // Read sheet data (both raw and formatted)
        // For DPR sheets, extract data from unmerged cells
        const rawData = XLSX.utils.sheet_to_json(targetSheet, { 
          header: 1, 
          raw: true, 
          defval: null
        }) as any[][];

        const textData = XLSX.utils.sheet_to_json(targetSheet, { 
          header: 1, 
          raw: false, 
          defval: null
        }) as any[][];
        
        // Direct worksheet access for cell values
        const worksheetCells = targetSheet;

        // Determine header row and data start row
        const headerRowIdx = mapping.headerRow ?? 0;
        let dataStartIdx = mapping.dataStartRow ?? (headerRowIdx + 1);
        
        // Special handling for DPR: Check if header row (rows 6-7) actually contains data
        // Sometimes the first machine's data is in the header row
        if (mapping.headerRow === 6 && rawData.length > 7) {
          const headerRowData = rawData[6] || [];
          const headerRow2Data = rawData[7] || [];
          // Check if row 6 has a machine number (it's actually data, not headers)
          if (headerRowData.length > 0) {
            const firstCell = String(headerRowData[0] || '').trim();
            if (parseMachineNumber(firstCell)) {
              // Row 6 contains actual data, not headers - adjust data start
              dataStartIdx = 6; // Start from row 6 instead of 8
              console.log(`⚠️ Detected data in header row - adjusting dataStartIdx to ${dataStartIdx} for sheet ${sheetName}`);
            }
          }
        }

        if (headerRowIdx >= rawData.length) {
          errors.push(`Sheet "${sheetName}": Header row ${headerRowIdx} doesn't exist`);
          continue;
        }

        // Extract headers - for DPR, headers are in rows 6 and 7
        // BUT: Sometimes row 6-7 contain actual data, not headers
        // Check if row 6 has a machine number - if so, it's data, not headers
        let actualHeaderRowIdx = headerRowIdx;
        let actualDataStartIdx = dataStartIdx;
        let headers: string[] = [];
        
        if (headerRowIdx === 6 && rawData.length > 7) {
          const row6FirstCell = String(rawData[6]?.[0] || '').trim();
          const row7FirstCell = String(rawData[7]?.[0] || '').trim();
          
          // Check if row 6 or row 7 has machine numbers (they're data, not headers)
          const row6IsData = parseMachineNumber(row6FirstCell);
          const row7IsData = parseMachineNumber(row7FirstCell);
          
          // If row 6 has a machine number, it's actually data, headers are in row 5
          if (row6IsData) {
            // Row 6 is data, so headers must be in row 5 (or earlier)
            actualHeaderRowIdx = 5;
            actualDataStartIdx = 6; // Data starts at row 6
            console.log(`⚠️ Row 6 contains data (${row6FirstCell}), not headers. Adjusting header row to ${actualHeaderRowIdx}, data start to ${actualDataStartIdx}`);
            
            // Extract headers from row 5 (or use default header names)
            if (rawData.length > 5) {
              const headerRow = (rawData[5] || []).map((h, idx) => {
                const textH = textData[5]?.[idx];
            return String(textH !== null && textH !== undefined ? textH : h ?? '').trim();
          });
              headers = headerRow;
            } else {
              // Use default column names if no header row found
              headers = Array(26).fill('').map((_, i) => {
                const col = String.fromCharCode(65 + i); // A, B, C, etc.
                return `Column ${col}`;
              });
            }
          } else if (row7IsData) {
            // Row 7 contains data (IMM-01, etc.), so row 6 has the actual headers
            console.log(`⚠️ Row 7 contains data (${row7FirstCell}), using row 6 headers only`);
            
            // Get merged cell ranges from worksheet
            const mergedRanges = targetSheet['!merges'] || [];
            
            // Extract row 6 headers (with merged cell values spread)
            const row6HeadersOnly: string[] = [];
            const maxCols = Math.max(
              rawData[6]?.length || 0,
              rawData[7]?.length || 0,
              26
            );
            
            // Initialize all columns
            for (let col = 0; col < maxCols; col++) {
              row6HeadersOnly[col] = '';
            }
            
            // Process merged cells for row 6
            mergedRanges.forEach((merge: any) => {
              const startRow = merge.s.r;
              const endRow = merge.e.r;
              const startCol = merge.s.c;
              const endCol = merge.e.c;
              
              // Only process merges that include row 6 (index 6)
              if (startRow <= 6 && endRow >= 6) {
                const cellRef = XLSX.utils.encode_cell({ r: startRow, c: startCol });
                const cell = targetSheet[cellRef];
                const cellValue = cell ? (cell.w || cell.v || '') : '';
                const headerValue = String(cellValue).trim();
                
                // Spread the header value across all columns in the merge
                for (let col = startCol; col <= endCol && col < maxCols; col++) {
                  if (!row6HeadersOnly[col] || row6HeadersOnly[col] === '') {
                    row6HeadersOnly[col] = headerValue;
                  }
                }
              }
            });
            
            // Fill in any remaining cells from row 6 (non-merged cells)
            if (rawData[6]) {
              rawData[6].forEach((cell, col) => {
                if (col < maxCols && (!row6HeadersOnly[col] || row6HeadersOnly[col] === '')) {
                  const textH = textData[6]?.[col];
                  const value = String(textH !== null && textH !== undefined ? textH : cell ?? '').trim();
                  if (value) {
                    row6HeadersOnly[col] = value;
                  }
                }
              });
            }
            
            headers = row6HeadersOnly;
            // Data starts at row 7 (index 7) since row 7 contains the first machine's data
            actualDataStartIdx = 7;
            console.log(`📋 Using row 6 headers (row 7 is data):`, headers.slice(0, 26));
          } else {
            // Normal case: row 6-7 are headers with merged cells
            // Structure:
            // - A6-I6: Merged header, row 7 has individual sub-headers
            // - J6-K6: Merged "No of Shots", row 7 has "Start" and "End"
            // - L6-T6: Merged header, row 7 has individual sub-headers
            // - U6-X6: Merged "Stoppage Time", row 7 has "Reason", "Start Time", "End Time", "Total Time"
            // - Y6-Z6: Merged headers (Mould change, REMARK)
            
            // Get merged cell ranges from worksheet
            const mergedRanges = targetSheet['!merges'] || [];
            
            // Extract row 6 headers (with merged cell values spread)
            const row6Headers: string[] = [];
            const maxCols = Math.max(
              rawData[6]?.length || 0,
              rawData[7]?.length || 0,
              textData[6]?.length || 0,
              textData[7]?.length || 0,
              26 // At least 26 columns (A-Z)
            );
            
            // Initialize all columns
            for (let col = 0; col < maxCols; col++) {
              row6Headers[col] = '';
            }
            
            // Process merged cells for row 6
            mergedRanges.forEach((merge: any) => {
              const startRow = merge.s.r; // Start row (0-based)
              const endRow = merge.e.r;   // End row
              const startCol = merge.s.c; // Start column (0-based)
              const endCol = merge.e.c;   // End column
              
              // Only process merges that include row 6 (index 6)
              if (startRow <= 6 && endRow >= 6) {
                // Get the value from the top-left cell of the merge
                const cellRef = XLSX.utils.encode_cell({ r: startRow, c: startCol });
                const cell = targetSheet[cellRef];
                const cellValue = cell ? (cell.w || cell.v || '') : '';
                const headerValue = String(cellValue).trim();
                
                // Spread the header value across all columns in the merge
                for (let col = startCol; col <= endCol && col < maxCols; col++) {
                  if (!row6Headers[col] || row6Headers[col] === '') {
                    row6Headers[col] = headerValue;
                  }
                }
              }
            });
            
            // Fill in any remaining cells from row 6 (non-merged cells)
            if (rawData[6]) {
              rawData[6].forEach((cell, col) => {
                if (col < maxCols && (!row6Headers[col] || row6Headers[col] === '')) {
                  const textH = textData[6]?.[col];
                  const value = String(textH !== null && textH !== undefined ? textH : cell ?? '').trim();
                  if (value) {
                    row6Headers[col] = value;
                  }
                }
              });
            }
            
            // Extract row 7 sub-headers
            const row7Headers: string[] = [];
            if (rawData.length > 7 && rawData[7]) {
              rawData[7].forEach((cell, col) => {
                if (col < maxCols) {
                  const textH = textData[7]?.[col];
                  const value = String(textH !== null && textH !== undefined ? textH : cell ?? '').trim();
                  row7Headers[col] = value;
                }
              });
            }
            
            // Combine headers: Use row 7 sub-headers as primary (they're the actual column names)
            // BUT: Row 7 might contain DATA for the first machine, not headers
            // Check if row 7 contains data (machine number pattern) vs headers (text labels)
            headers = Array(maxCols).fill('').map((_, col) => {
              const row7Header = row7Headers[col] || '';
              const row6Header = row6Headers[col] || '';
              
              // Check if row 7 cell contains a machine number (it's data, not a header)
              const isRow7Data = /(IMM|MM)[-\s]?\d+/i.test(row7Header);
              
              // If row 7 has data (machine number), use row 6 header instead
              if (isRow7Data && row6Header) {
                return row6Header;
              }
              
              // For columns J-K (No of Shots) and U-X (Stoppage Time), combine main + sub-header for clarity
              if (row7Header && row6Header && row6Header !== row7Header && !isRow7Data) {
                // J-K: "No of Shots" + "Start"/"End" -> "No of Shots Start" / "No of Shots End"
                if (col >= 9 && col <= 10) {
                  return `${row6Header} ${row7Header}`.trim();
                }
                // U-X: "Stoppage Time" + "Reason"/"Start Time"/etc -> "Stoppage Time Reason" / etc
                if (col >= 20 && col <= 23) {
                  return `${row6Header} ${row7Header}`.trim();
                }
              }
              
              // For all other columns, use row 7 sub-header if it's not data (it's the actual column name)
              // Examples: M/c No., Product, Target Qty, etc.
              if (row7Header && !isRow7Data) {
                return row7Header;
              }
              
              // Fallback to row 6 header if row 7 is empty or contains data
              return row6Header;
            });
            
            console.log(`📋 Row 6 merged headers:`, row6Headers.slice(0, 26));
            console.log(`📋 Row 7 sub-headers:`, row7Headers.slice(0, 26));
          }
        } else {
          // Standard header extraction
          const headerRow1 = (rawData[headerRowIdx] || []).map((h, idx) => {
            const textH = textData[headerRowIdx]?.[idx];
            return String(textH !== null && textH !== undefined ? textH : h ?? '').trim();
          });
          headers = headerRow1;
        }

        console.log(`📋 Headers from ${sheetName} (row ${actualHeaderRowIdx}):`, headers);
        console.log(`📊 Data will start from row index ${actualDataStartIdx}`);

        // Build column index map for header-based fields
        const headerIndexMap = new Map<string, number>();
        headers.forEach((header, idx) => {
          if (header) {
            headerIndexMap.set(header.toLowerCase(), idx);
            // Also add variations
            headerIndexMap.set(header.toLowerCase().trim(), idx);
          }
        });

        // Extract field data
        const extractedRows: any[] = [];
        let shiftTotalRow: any = null;
        let achievementRow: any = null;

        // Use the adjusted data start index
        const finalDataStartIdx = actualDataStartIdx !== undefined ? actualDataStartIdx : dataStartIdx;
        
        for (let rowIdx = finalDataStartIdx; rowIdx < rawData.length; rowIdx++) {
          const rawRow = rawData[rowIdx] || [];
          const textRowData = textData[rowIdx] || [];
          
          // Skip empty rows
          if (rawRow.every(cell => cell === null || cell === undefined || cell === '')) {
            continue;
          }

          // Check if this is a SHIFT TOTAL or Achievement row BEFORE validation
          const firstCell = String(textRowData[0] ?? rawRow[0] ?? '').trim();
          const isShiftTotal = firstCell.toUpperCase().includes('SHIFT TOTAL') || firstCell.toUpperCase() === 'SHIFT TOTAL';
          const isAchievement = firstCell.toUpperCase().includes('ACHIEVEMENT') || firstCell.toUpperCase() === 'ACHIEVEMENT';
          
          // Handle SHIFT TOTAL and Achievement rows separately (extract before validation)
          if (isShiftTotal || isAchievement) {
            // Extract all production data using same column structure as machine rows
            // Headers are in same position, so use column indices
            const summaryRowData: any = {
              type: isShiftTotal ? 'shiftTotal' : 'achievement',
              label: firstCell,
              // Extract using same column indices as machine data fields
              targetQty: parseFloat(textRowData[11] ?? rawRow[11] ?? 0) || 0, // Column L (Target Qty)
              actualQty: parseFloat(textRowData[12] ?? rawRow[12] ?? 0) || 0, // Column M (Actual Qty)
              okProdQty: parseFloat(textRowData[13] ?? rawRow[13] ?? 0) || 0, // Column N (Ok Prod Qty)
              okProdKgs: parseFloat(textRowData[14] ?? rawRow[14] ?? 0) || 0, // Column O (Ok Prod Kgs)
              okProdPercent: parseFloat(textRowData[15] ?? rawRow[15] ?? 0) || 0, // Column P (Ok Prod %)
              rejKgs: parseFloat(textRowData[16] ?? rawRow[16] ?? 0) || 0, // Column Q (Rej Kgs)
              lumps: parseFloat(textRowData[17] ?? rawRow[17] ?? 0) || 0, // Column R (lumps)
              runTime: parseFloat(textRowData[18] ?? rawRow[18] ?? 0) || 0, // Column S (Run Time)
              downTime: parseFloat(textRowData[19] ?? rawRow[19] ?? 0) || 0, // Column T (Down time)
              totalTime: parseFloat(textRowData[23] ?? rawRow[23] ?? 0) || 0, // Column X (Total Time in Stoppage section)
            };
            
            if (isShiftTotal) {
              shiftTotalRow = summaryRowData;
              console.log(`✅ Extracted SHIFT TOTAL from row ${rowIdx + 1} in sheet ${sheetName}:`, summaryRowData);
              console.log(`🔍 Total Time raw value from column X (index 23):`, textRowData[23] ?? rawRow[23], 'parsed:', summaryRowData.totalTime);
                } else {
              achievementRow = summaryRowData;
              console.log(`✅ Extracted Achievement from row ${rowIdx + 1} in sheet ${sheetName}:`, summaryRowData);
              console.log(`🔍 Achievement Target Qty:`, summaryRowData.targetQty);
            }
            continue; // Skip normal processing for summary rows
          }

          // Validate row if validator provided
          if (mapping.validateRow && !mapping.validateRow(rawRow, rowIdx, rawData)) {
            continue;
          }

          const rowData: any = {};

          // Simple extraction: Get machine number and operator from current row
          // Column A (index 0): Machine number
          const machineNoRaw = textRowData[0] ?? rawRow[0] ?? '';
          if (machineNoRaw) {
            // Clean up machine number - just use as is, normalize format
            let machineNo = String(machineNoRaw).trim();
            // Normalize common formats: IMM-01, IMM 01, IMM01 -> IMM-01
            machineNo = machineNo.replace(/\s+/g, '-').replace(/(IMM|MM)(\d)/i, '$1-$2');
            rowData.machineNo = machineNo;
                  } else {
            // If no machine number in current row, check previous row (for changeover rows)
            if (rowIdx > 8 && rawData[rowIdx - 1]) {
              const prevMachineNoRaw = textData[rowIdx - 1]?.[0] ?? rawData[rowIdx - 1]?.[0] ?? '';
              if (prevMachineNoRaw) {
                let machineNo = String(prevMachineNoRaw).trim();
                machineNo = machineNo.replace(/\s+/g, '-').replace(/(IMM|MM)(\d)/i, '$1-$2');
                rowData.machineNo = machineNo;
              }
            }
          }
          
          // Column B (index 1): Operator name
          const operatorName = String(textRowData[1] ?? rawRow[1] ?? '').trim();
              if (operatorName && operatorName !== '' && operatorName !== '0' && !/^\d+$/.test(operatorName)) {
                rowData.operatorName = operatorName;
          } else if (rowIdx > 7 && rawData[rowIdx - 1]) {
            // Check previous row for operator
            const prevOperatorName = String(textData[rowIdx - 1]?.[1] ?? rawData[rowIdx - 1]?.[1] ?? '').trim();
            if (prevOperatorName && prevOperatorName !== '' && prevOperatorName !== '0' && !/^\d+$/.test(prevOperatorName)) {
              rowData.operatorName = prevOperatorName;
            }
          }

          // Extract each field
          for (const field of mapping.fields) {
            try {
              let value: any = null;

              // Method 1: Cell reference (e.g., "A1")
              if (field.cellRef) {
                const cell = targetSheet[field.cellRef];
                if (cell) {
                  value = cell.v ?? cell.w ?? null;
                }
              }
              // Method 2: Fixed row/column position (for metadata)
              else if (field.rowIndex !== undefined && field.columnIndex !== undefined) {
                if (field.rowIndex < rawData.length) {
                  const cellRow = rawData[field.rowIndex];
                  if (field.columnIndex < cellRow.length) {
                    value = textData[field.rowIndex]?.[field.columnIndex] ?? cellRow[field.columnIndex] ?? null;
                  }
                }
              }
              // Method 3: Header name match
              else if (field.headerName) {
                let colIdx: number | undefined;

                if (field.headerName instanceof RegExp) {
                  // Regex match
                  colIdx = headers.findIndex(h => field.headerName instanceof RegExp && field.headerName.test(h));
                } else {
                  // Exact or case-insensitive match
                  const searchHeader = String(field.headerName).toLowerCase().trim();
                  colIdx = headerIndexMap.get(searchHeader);
                  // Also try direct match
                  if (colIdx === undefined) {
                    colIdx = headers.findIndex(h => h.toLowerCase().trim() === searchHeader);
                  }
                }

                if (colIdx !== undefined && colIdx >= 0 && colIdx < rawRow.length) {
                  // Prefer text version, fallback to raw
                  value = textRowData[colIdx] ?? rawRow[colIdx] ?? null;
                } else {
                  // Debug: log when header not found
                  if (rowIdx < 50 && field.targetField !== 'machineNo' && field.targetField !== 'operatorName') {
                    console.log(`⚠️ Header not found for field "${field.targetField}" in row ${rowIdx + 1}. Looking for:`, field.headerName);
                  }
                }
              }
              // Method 4: Column index
              else if (field.columnIndex !== undefined) {
                if (field.columnIndex < rawRow.length) {
                  value = textRowData[field.columnIndex] ?? rawRow[field.columnIndex] ?? null;
                }
              }

              // Apply transformation if provided
              if (value !== null && value !== undefined && field.transform) {
                value = field.transform(value, rawRow, targetSheet);
              }

              // Handle required fields
              if (field.required && (value === null || value === undefined || value === '')) {
                errors.push(`Sheet "${sheetName}", Row ${rowIdx + 1}: Required field "${field.targetField}" is missing`);
                continue;
              }

              rowData[field.targetField] = value;
            } catch (err) {
              errors.push(`Sheet "${sheetName}", Row ${rowIdx + 1}, Field "${field.targetField}": ${err}`);
            }
          }

          // Only add row if it has at least one non-null value
          // For DPR, ensure we have machine number before adding
          const hasValidData = Object.values(rowData).some(v => v !== null && v !== undefined && v !== '');
          const hasMachineNo = isValidMachineNumber(rowData.machineNo);
          
          if (hasValidData && hasMachineNo) {
            extractedRows.push(rowData);
            // Debug: log sample of extracted data for first few rows
            if (rowIdx < 15) {
              console.log(`✅ Added row ${rowIdx + 1} for machine ${rowData.machineNo}:`, {
                product: rowData.product,
                shotsStart: rowData.shotsStart,
                shotsEnd: rowData.shotsEnd,
                targetQty: rowData.targetQty,
                actualQty: rowData.actualQty,
                okProdQty: rowData.okProdQty,
                runTime: rowData.runTime,
                downTime: rowData.downTime
              });
            } else {
            console.log(`✅ Added row ${rowIdx + 1} for machine ${rowData.machineNo} from sheet ${sheetName}`);
            }
          } else if (hasValidData && !hasMachineNo) {
            // Try to get machine number from previous rows (for changeover rows)
            if (rowIdx >= 8) {
              // Look back up to 3 rows to find machine number
              for (let lookBack = 1; lookBack <= 3 && lookBack <= rowIdx - 8; lookBack++) {
                const prevRowIdx = rowIdx - lookBack;
                const prevRow = rawData[prevRowIdx];
                const prevTextRow = textData[prevRowIdx];
                
                if (prevRow && prevRow.length > 0) {
                  const machineNoRaw = prevTextRow?.[0] ?? prevRow[0] ?? null;
                  const parsedMachineNo = parseMachineNumber(machineNoRaw);
                  if (parsedMachineNo) {
                    rowData.machineNo = parsedMachineNo;
                    extractedRows.push(rowData);
                    console.log(`✅ Added row ${rowIdx + 1} for machine ${rowData.machineNo} (extracted from previous row ${prevRowIdx + 1}) from sheet ${sheetName}`);
                    break;
                  }
                }
              }
              
              if (!rowData.machineNo) {
                const rawMachineValue = textRowData[0] ?? rawRow[0] ?? '';
                const product = textRowData[2] ?? rawRow[2] ?? '';
                console.log(`⚠️ Row ${rowIdx + 1} has data but no valid machine number. Raw machine value: "${rawMachineValue}", Product: "${product}", Row data keys:`, Object.keys(rowData).filter(k => rowData[k] !== null && rowData[k] !== undefined && rowData[k] !== ''));
              }
            } else {
              console.log(`⚠️ Row ${rowIdx + 1} has data but no valid machine number (row < 8). Row data keys:`, Object.keys(rowData));
            }
          }
        }

        console.log(`✅ Extracted ${extractedRows.length} rows from sheet "${sheetName}"`);
        extractedData.set(sheetName, extractedRows);
        
        // Store shift total and achievement separately with sheet name as key
        if (shiftTotalRow) {
          extractedData.set(`${sheetName}_shiftTotal`, [shiftTotalRow]);
          console.log(`✅ Stored SHIFT TOTAL for sheet ${sheetName}`);
        }
        if (achievementRow) {
          extractedData.set(`${sheetName}_achievement`, [achievementRow]);
          console.log(`✅ Stored Achievement for sheet ${sheetName}`);
        }
      } catch (err) {
        errors.push(`Error processing sheet mapping: ${err}`);
        console.error(`❌ Error processing sheet:`, err);
      }
    }

    // Combine results using custom function or default
    let combinedData: any[] = [];
    if (config.combineResults) {
      combinedData = config.combineResults(extractedData, metadata);
    } else {
      // Default: flatten all sheets into single array
      extractedData.forEach((rows, sheetName) => {
        rows.forEach(row => {
          combinedData.push({ ...row, _sheetName: sheetName });
        });
      });
    }

    // Validate combined data if validator provided
    if (config.validateImport) {
      const validation = config.validateImport(combinedData);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    console.log(`📊 Multi-sheet parsing complete: ${combinedData.length} records, ${errors.length} errors`);
    return { data: combinedData, metadata, errors };
  };

  // ============================================================================
  // HELPER FUNCTIONS FOR MACHINE NUMBER PARSING
  // ============================================================================
  // Helper function to parse and normalize machine numbers
  // Handles formats like: IMM-02, IMM-03, IMM-11, MM-01, MM-02, MM 05, IMM 02, IMM02, imm-02, etc.
  const parseMachineNumber = (value: any): string | null => {
    if (!value) return null;
    const str = String(value).trim();
    if (!str) return null;
    
    // Match IMM or MM followed by optional separator (- or space) and digits
    // Pattern: (IMM|MM) (case insensitive) + optional separator + optional leading zeros + digits
    const match = str.match(/(IMM|MM)[-\s]?0*(\d+)/i);
    if (match) {
      const prefix = match[1].toUpperCase(); // IMM or MM
      const num = parseInt(match[2], 10);
      if (!isNaN(num) && num > 0) {
        // Normalize to PREFIX-XX format (with leading zero for numbers < 10)
        return num < 10 ? `${prefix}-0${num}` : `${prefix}-${num}`;
      }
    }
    
    // If no match, return original string if it looks like a machine number
    if (/(IMM|MM)/i.test(str)) {
      return str.toUpperCase();
    }
    
    return null;
  };

  // Helper function to check if a string is a valid machine number
  const isValidMachineNumber = (value: any): boolean => {
    const parsed = parseMachineNumber(value);
    return parsed !== null && /^(IMM|MM)-\d{1,}$/i.test(parsed);
  };

  // Helper function to compare machine numbers (normalized)
  const compareMachineNumbers = (machine1: any, machine2: any): boolean => {
    const parsed1 = parseMachineNumber(machine1);
    const parsed2 = parseMachineNumber(machine2);
    return parsed1 !== null && parsed2 !== null && parsed1 === parsed2;
  };

  // ============================================================================
  // DPR MULTI-SHEET CONFIGURATION - Zero Loss Data Extraction
  // ============================================================================
  const getDPRMultiSheetConfig = (workbook: XLSX.WorkBook): MultiSheetConfig => {
    // Find summary sheet
    const summarySheetName = workbook.SheetNames.find(name => 
      name.toLowerCase() === 'summary'
    ) || workbook.SheetNames.find(name => 
      name.toLowerCase().includes('summary')
    ) || workbook.SheetNames[0];

    // Find all machine sheets (1a, 1b, 2a, 2b, etc.)
    const machineSheets = workbook.SheetNames.filter(name => /^\d+[ab]$/i.test(name.trim()));

    const sheetMappings: SheetFieldMapping[] = [];

    // 1. SUMMARY SHEET - Extract metadata (date, shift, shift incharge)
    sheetMappings.push({
      sheetName: summarySheetName,
      headerRow: undefined,
      dataStartRow: undefined,
      fields: [
        // Date from B4
        {
          targetField: 'date',
          cellRef: 'B4',
          transform: (value: any) => {
            if (!value) return null;
            // Handle Excel date serial or date object
            if (typeof value === 'number') {
              try {
                const d = XLSX.SSF.parse_date_code(value);
                return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
              } catch {
                const date = new Date((value - 25569) * 86400000);
                return date.toISOString().split('T')[0];
              }
            }
            if (value instanceof Date) {
              return value.toISOString().split('T')[0];
            }
            // Parse string dates (DD-MMM-YY format)
            const str = String(value).trim();
            const ddmmyyMatch = str.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{2,4})$/i);
            if (ddmmyyMatch) {
              const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const monthIndex = monthNames.findIndex(m => ddmmyyMatch[2].toLowerCase().startsWith(m));
              if (monthIndex >= 0) {
                let year = parseInt(ddmmyyMatch[3]);
                if (year < 100) year = 2000 + year;
                return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${ddmmyyMatch[1].padStart(2, '0')}`;
              }
            }
            return String(value);
          }
        },
        // Shift from N4
        {
          targetField: 'shift',
          cellRef: 'N4',
          transform: (value: any) => String(value || '').trim().toUpperCase()
        },
        // Shift Incharge from W4
        {
          targetField: 'shiftIncharge',
          cellRef: 'W4',
          transform: (value: any) => String(value || 'CHANDAN/DHIRAJ').trim()
        }
      ],
      extractMetadata: (sheet: XLSX.WorkSheet) => {
        const dateCell = sheet['B4'];
        const shiftCell = sheet['N4'];
        const inchargeCell = sheet['W4'];
        
        let date: string | null = null;
        if (dateCell) {
          const val = dateCell.v ?? dateCell.w ?? null;
          if (typeof val === 'number') {
            try {
              const d = XLSX.SSF.parse_date_code(val);
              date = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
            } catch {
              const dateObj = new Date((val - 25569) * 86400000);
              date = dateObj.toISOString().split('T')[0];
            }
          } else if (val instanceof Date) {
            date = val.toISOString().split('T')[0];
          } else if (val) {
            date = String(val);
          }
        }
        
        return {
          date: date,
          shift: shiftCell ? String(shiftCell.v ?? shiftCell.w ?? '').trim().toUpperCase() : 'DAY',
          shiftIncharge: inchargeCell ? String(inchargeCell.v ?? inchargeCell.w ?? 'CHANDAN/DHIRAJ').trim() : 'CHANDAN/DHIRAJ'
        };
      }
    });

    // 2. MACHINE SHEETS - Extract production data for each machine
    // Each machine sheet (1a, 1b, etc.) has the same structure
    // 'a' = DAY shift data, 'b' = NIGHT shift data
    machineSheets.forEach(sheetName => {
      const match = sheetName.match(/^(\d+)([ab])$/i);
      if (!match) return;
      
      const machineNum = parseInt(match[1]);
      const sheetType = match[2].toLowerCase(); // 'a' = DAY shift, 'b' = NIGHT shift
      
      sheetMappings.push({
        sheetName: sheetName,
        headerRow: 6, // Headers in rows 6-7
        dataStartRow: 8, // Data starts at row 8
        fields: [
          // Machine number from column A
          // Extracted from current row or previous row for changeover rows
          {
            targetField: 'machineNo',
            columnIndex: 0, // Column A
            transform: (value: any) => {
              // Simple: just return the value as-is, normalize format
              const str = String(value || '').trim();
              if (!str) return '';
              // Normalize: IMM 01 -> IMM-01, IMM01 -> IMM-01
              return str.replace(/\s+/g, '-').replace(/(IMM|MM)(\d)/i, '$1-$2');
            },
            required: false // Not required at field level - we extract it from current or previous row
          },
          // Operator name from column B
          {
            targetField: 'operatorName',
            columnIndex: 1, // Column B
            transform: (value: any) => String(value || '').trim()
          },
          // Product from column C
          {
            targetField: 'product',
            headerName: 'Product',
            transform: (value: any) => String(value || '').trim()
          },
          // Cavity from column D
          {
            targetField: 'cavity',
            headerName: 'Cavity',
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : num;
            }
          },
          // Target Cycle (sec) from column E
          {
            targetField: 'targetCycle',
            headerName: /Trg Cycle/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : num;
            }
          },
          // Target Run Time (min) from column F
          {
            targetField: 'targetRunTime',
            headerName: /Trg Run Time/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 720 : num; // Default 720 minutes
            }
          },
          // Part Weight (gm) from column G
          {
            targetField: 'partWeight',
            headerName: /Part Wt/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : num;
            }
          },
          // Actual Part Weight (gm) from column H
          {
            targetField: 'actualPartWeight',
            headerName: /Act part wt/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : num;
            }
          },
          // Actual Cycle (sec) from column I
          {
            targetField: 'actualCycle',
            headerName: /Act Cycle/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : num;
            }
          },
          // No of Shots - Start from column J
          {
            targetField: 'shotsStart',
            columnIndex: 9, // Column J (0-based, so J = 9)
            transform: (value: any, rawRow: any[]) => {
              console.log('🔍 shotsStart raw value from column J (index 9):', value, 'type:', typeof value);
              if (!value || value === '' || value === '-') return 0;
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num);
            }
          },
          // No of Shots - End from column K
          {
            targetField: 'shotsEnd',
            columnIndex: 10, // Column K (0-based, so K = 10)
            transform: (value: any, rawRow: any[]) => {
              console.log('🔍 shotsEnd raw value from column K (index 10):', value, 'type:', typeof value);
              if (!value || value === '' || value === '-') return 0;
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num);
            }
          },
          // Target Qty (Nos) from column L
          {
            targetField: 'targetQty',
            headerName: /Target Qty/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num);
            }
          },
          // Actual Qty (Nos) from column M
          {
            targetField: 'actualQty',
            headerName: /Actual Qty/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num);
            }
          },
          // Ok Prod Qty (Nos) from column N
          {
            targetField: 'okProdQty',
            headerName: /Ok Prod Qty/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num);
            }
          },
          // Ok Prod (Kgs) from column O
          {
            targetField: 'okProdKgs',
            headerName: /Ok Prod \(Kgs\)/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num * 100) / 100; // Round to 2 decimal places
            }
          },
          // Ok Prod (%) from column P
          {
            targetField: 'okProdPercent',
            headerName: /Ok Prod \(%\)/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num);
            }
          },
          // Rej (Kgs) from column Q
          {
            targetField: 'rejKgs',
            headerName: /Rej \(Kgs\)/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num * 100) / 100; // Round to 2 decimal places
            }
          },
          // lumps (KG) from column R (usually empty)
          {
            targetField: 'lumps',
            headerName: /lumps/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : num;
            }
          },
          // Run Time (mins) from column S
          {
            targetField: 'runTime',
            headerName: /Run Time \(mins\)/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num);
            }
          },
          // Down time (min) from column T
          {
            targetField: 'downTime',
            headerName: /Down time \(min\)/i,
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(Math.abs(num)); // Standard rounding and abs to handle negative values
            }
          },
          // Stoppage Time - Reason, Start, End, Total from columns U-X
          {
            targetField: 'stoppageReason',
            columnIndex: 20, // Column U (approximate)
            transform: (value: any) => String(value || '').trim()
          },
          {
            targetField: 'stoppageStartTime',
            columnIndex: 21, // Column V
            transform: (value: any) => {
              // Excel stores times as decimal fractions of a day (e.g., 0.5138 = 12:20)
              // Convert to HH:MM format
              if (!value || value === '') return '';
              const num = parseFloat(value);
              if (isNaN(num)) return String(value).trim();
              
              // If value is between 0 and 1, it's an Excel time decimal
              if (num > 0 && num < 1) {
                const totalMinutes = Math.round(num * 24 * 60);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              }
              return String(value).trim();
            }
          },
          {
            targetField: 'stoppageEndTime',
            columnIndex: 22, // Column W
            transform: (value: any) => {
              // Excel stores times as decimal fractions of a day (e.g., 0.5743 = 13:47)
              // Convert to HH:MM format
              if (!value || value === '') return '';
              const num = parseFloat(value);
              if (isNaN(num)) return String(value).trim();
              
              // If value is between 0 and 1, it's an Excel time decimal
              if (num > 0 && num < 1) {
                const totalMinutes = Math.round(num * 24 * 60);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              }
              return String(value).trim();
            }
          },
          {
            targetField: 'stoppageTotalTime',
            columnIndex: 23, // Column X
            transform: (value: any) => {
              const num = parseFloat(value);
              return isNaN(num) ? 0 : Math.round(num);
            }
          },
          // Mould change from column Y
          {
            targetField: 'mouldChange',
            headerName: /Mould change/i,
            transform: (value: any) => String(value || '').trim()
          },
          // REMARK from column Z
          {
            targetField: 'remark',
            headerName: /REMARK/i,
            transform: (value: any) => String(value || '').trim()
          }
        ],
        // Simple row validation: accept rows with machine numbers or data
        validateRow: (row: any[], rowIndex: number, allRows?: any[][]) => {
          // Skip header rows (rows 0-6)
          // Row 7 might be the first data row, so check if it has a machine number
          if (rowIndex < 7) return false;
          
          // Row 7 might be data (first machine row) - check if it has machine number
          if (rowIndex === 7) {
            const firstCell = String(row[0] || '').trim();
            const hasMachineNo = /(IMM|MM)[-\s]?\d+/i.test(firstCell);
            if (hasMachineNo) return true; // Accept row 7 if it has machine number
            return false; // Reject row 7 if no machine number (it's a header row)
          }
          
          // Skip empty rows
          if (!row || row.length === 0) return false;
          if (row.every(cell => cell === null || cell === undefined || cell === '')) return false;
          
          // Check if this is a summary row
          const firstCell = String(row[0] || '').trim().toUpperCase();
          if (firstCell.includes('SHIFT TOTAL') || 
              firstCell.includes('ACHIEVEMENT') ||
              firstCell.includes('PREPARED BY') ||
              firstCell === '') {
              return false;
          }
          
          // Accept if has machine number pattern (IMM-01, MM-05, etc.) OR any data
          const hasMachineNo = /(IMM|MM)[-\s]?\d+/i.test(firstCell);
          
          // If has machine number, always accept it (even if no numeric data - user wants ALL data)
          if (hasMachineNo) return true;
          
          // Otherwise check for any numeric data
          const hasNumericData = row.slice(2).some(cell => {
                      const val = String(cell || '').trim();
            if (!val || val === '' || val === '-' || val === '0' || val === '0.00') return false;
            const num = parseFloat(val);
            return !isNaN(num) && num !== 0;
          });
          
          return hasNumericData;
        }
      });
    });

    return {
      dataType: 'dpr',
      sheetMappings,
      combineResults: (extractedData: Map<string, any[]>, metadata: Map<string, any>) => {
        // Get metadata from summary sheet
        const summaryMeta = metadata.get(summarySheetName) || {};
        
        // Group machine sheets by machine number and type (a/b)
        const machineGroups = new Map<number, { a?: any, b?: any, operatorName?: string }>();
        
        extractedData.forEach((rows, sheetName) => {
          const match = sheetName.match(/^(\d+)([ab])$/i);
          if (!match) return;
          
          const machineNum = parseInt(match[1]);
          const type = match[2].toLowerCase() as 'a' | 'b';
          
          console.log(`📊 Processing sheet ${sheetName}: ${rows.length} rows extracted`);
          
          // For each machine in this sheet, group by machine number
          // Each sheet might have multiple machines
          // When same machine appears twice, first = currentProduction, second = changeover
          const sheetMachineMap = new Map<number, any>();
          
          rows.forEach((row, idx) => {
            if (!row.machineNo) {
              console.log(`⚠️ Row ${idx} in ${sheetName} has no machineNo`);
              return;
            }
            
            // Simple extraction: get machine number from row.machineNo
            // Extract numeric part from formats like: IMM-01, IMM-1, IMM 01, IMM01, MM-01, etc.
            if (!row.machineNo) {
              console.log(`⚠️ Row has no machine number`);
              return;
            }
            
            const machineNoStr = String(row.machineNo).trim();
            // Extract digits from machine number (matches IMM-01, IMM-1, MM-05, etc.)
            const machineNoMatch = machineNoStr.match(/(\d+)/);
            if (!machineNoMatch) {
              console.log(`⚠️ Could not extract number from machine number: ${machineNoStr}`);
              return;
            }
            
            const rowMachineNum = parseInt(machineNoMatch[1], 10);
            
            // Group rows by machine number within this sheet
            if (!sheetMachineMap.has(rowMachineNum)) {
              sheetMachineMap.set(rowMachineNum, { rows: [] });
            }
            
            const machineData = sheetMachineMap.get(rowMachineNum);
            // Store all rows for this machine (to detect changeover)
            machineData.rows.push(row);
            
            // Store operator name if available
            if (row.operatorName && !machineData.operatorName) {
              machineData.operatorName = row.operatorName;
            }
          });
          
          // Debug: log machines with their row counts
          console.log(`📊 Sheet ${sheetName} machine row counts:`, 
            Array.from(sheetMachineMap.entries()).map(([num, data]) => 
              `IMM-${num.toString().padStart(2, '0')}: ${data.rows.length} row(s)`
            ).join(', ')
          );
          
          // Now process each machine's rows to separate currentProduction and changeover
          sheetMachineMap.forEach((machineData, rowMachineNum) => {
            const rows = machineData.rows;
            
            if (rows.length === 0) return;
            
            // First row = current production
            const firstRow = rows[0];
            // Second row (if exists and has product) = changeover
            const secondRow = rows.length > 1 && rows[1].product ? rows[1] : null;
            
            // Debug logging for machines with multiple rows
            if (rows.length > 1) {
              console.log(`🔄 Machine ${rowMachineNum} has ${rows.length} rows (potential changeover):`, {
                firstProduct: firstRow.product,
                secondProduct: rows[1]?.product || 'no product',
                firstRowData: { targetQty: firstRow.targetQty, actualQty: firstRow.actualQty, okProdQty: firstRow.okProdQty },
                secondRowData: rows[1] ? { targetQty: rows[1].targetQty, actualQty: rows[1].actualQty, okProdQty: rows[1].okProdQty } : 'no data'
              });
            }
            
            // Store data by shift type (a = DAY shift, b = NIGHT shift)
            if (type === 'a') {
              // Current production from first row
              machineData.a = { ...firstRow };
              
              // If there's a second row with product, it's a changeover
              if (secondRow && secondRow.product) {
                // Store changeover data separately
                machineData.aChangeover = { ...secondRow };
                
                // Merge product names: "OriginalProduct / ChangeoverProduct"
                const originalProduct = firstRow.product || '';
                const changeoverProduct = secondRow.product || '';
                console.log(`🔄 Merging products for IMM-${rowMachineNum.toString().padStart(2, '0')}: "${originalProduct}" + "${changeoverProduct}"`);
                if (originalProduct && changeoverProduct && originalProduct !== changeoverProduct) {
                  machineData.a.product = `${originalProduct} / ${changeoverProduct}`;
                  console.log(`✅ Merged product name: "${machineData.a.product}"`);
                }
              }
            } else {
              // Current production from first row
              machineData.b = { ...firstRow };
              
              // If there's a second row with product, it's a changeover
              if (secondRow && secondRow.product) {
                // Store changeover data separately
                machineData.bChangeover = { ...secondRow };
                
                // Merge product names: "OriginalProduct / ChangeoverProduct"
                const originalProduct = firstRow.product || '';
                const changeoverProduct = secondRow.product || '';
                if (originalProduct && changeoverProduct && originalProduct !== changeoverProduct) {
                  machineData.b.product = `${originalProduct} / ${changeoverProduct}`;
                }
              }
            }
          });
          
          // Now add each machine from this sheet to the global groups
          sheetMachineMap.forEach((machineData, rowMachineNum) => {
            if (!machineGroups.has(rowMachineNum)) {
              machineGroups.set(rowMachineNum, {});
            }
            
            const group = machineGroups.get(rowMachineNum)!;
            
            // Merge data from this sheet into the group
            if (machineData.a) {
                group.a = machineData.a;
                  }
            if (machineData.aChangeover) {
              (group as any).aChangeover = machineData.aChangeover;
            }
            
            if (machineData.b) {
                group.b = machineData.b;
                  }
            if (machineData.bChangeover) {
              (group as any).bChangeover = machineData.bChangeover;
            }
            
            if (machineData.operatorName && !group.operatorName) {
              group.operatorName = machineData.operatorName;
            }
          });
          
          console.log(`📊 Sheet ${sheetName}: Processed ${sheetMachineMap.size} machines`);
        });
        
        console.log(`📊 Total machine groups after processing all sheets: ${machineGroups.size}`);
        
        // Extract SHIFT TOTAL and Achievement separately for DAY (a sheets) and NIGHT (b sheets)
        let dayShiftTotalData: any = null;
        let dayAchievementData: any = null;
        let nightShiftTotalData: any = null;
        let nightAchievementData: any = null;
        
        extractedData.forEach((rows, key) => {
          // Check if this is from an 'a' sheet (DAY) or 'b' sheet (NIGHT)
          const isDaySheet = key.match(/^\d+a_/i);
          const isNightSheet = key.match(/^\d+b_/i);
          
          if (key.endsWith('_shiftTotal') && rows.length > 0) {
            if (isDaySheet) {
              dayShiftTotalData = rows[0];
              console.log(`✅ Found DAY SHIFT TOTAL data from ${key}:`, dayShiftTotalData);
            } else if (isNightSheet) {
              nightShiftTotalData = rows[0];
              console.log(`✅ Found NIGHT SHIFT TOTAL data from ${key}:`, nightShiftTotalData);
            }
          }
          if (key.endsWith('_achievement') && rows.length > 0) {
            if (isDaySheet) {
              dayAchievementData = rows[0];
              console.log(`✅ Found DAY Achievement data from ${key}:`, dayAchievementData);
            } else if (isNightSheet) {
              nightAchievementData = rows[0];
              console.log(`✅ Found NIGHT Achievement data from ${key}:`, nightAchievementData);
            }
          }
        });
        
        // Create separate machine lists for DAY and NIGHT shifts
        const dayMachines: any[] = [];
        const nightMachines: any[] = [];
        machineGroups.forEach((group, machineNum) => {
          // Include all machines (no skipping)
          const machineNo = machineNum < 10 ? `IMM-0${machineNum}` : `IMM-${machineNum}`;
          
          // Create DAY shift machine entry if 'a' data exists
          if (group.a) {
            const currentProd = {
              product: group.a.product || '',
              cavity: group.a.cavity || 0,
              targetCycle: group.a.targetCycle || 0,
              targetRunTime: group.a.targetRunTime || 720,
              partWeight: group.a.partWeight || 0,
              actualPartWeight: group.a.actualPartWeight || 0,
              actualCycle: group.a.actualCycle || 0,
              shotsStart: group.a.shotsStart || 0,
              shotsEnd: group.a.shotsEnd || 0,
              targetQty: group.a.targetQty || 0,
              actualQty: group.a.actualQty || 0,
              okProdQty: group.a.okProdQty || 0,
              okProdKgs: group.a.okProdKgs || 0,
              okProdPercent: group.a.okProdPercent || 0,
              rejKgs: group.a.rejKgs || 0,
              runTime: group.a.runTime || 0,
              downTime: group.a.downTime || 0,
              stoppageReason: group.a.stoppageReason || '',
              startTime: String(group.a.stoppageStartTime || ''),
              endTime: String(group.a.stoppageEndTime || ''),
              totalTime: group.a.stoppageTotalTime || 0,
              mouldChange: group.a.mouldChange || '',
              remark: group.a.remark || ''
            };
            
            // Changeover for DAY = second row from same 'a' sheet
            const changeoverRow = (group as any).aChangeover;
            const changeover = changeoverRow ? {
              product: changeoverRow.product || '',
              cavity: changeoverRow.cavity || 0,
              targetCycle: changeoverRow.targetCycle || 0,
              targetRunTime: changeoverRow.targetRunTime || 0,
              partWeight: changeoverRow.partWeight || 0,
              actualPartWeight: changeoverRow.actualPartWeight || 0,
              actualCycle: changeoverRow.actualCycle || 0,
              shotsStart: changeoverRow.shotsStart || 0,
              shotsEnd: changeoverRow.shotsEnd || 0,
              targetQty: changeoverRow.targetQty || 0,
              actualQty: changeoverRow.actualQty || 0,
              okProdQty: changeoverRow.okProdQty || 0,
              okProdKgs: changeoverRow.okProdKgs || 0,
              okProdPercent: changeoverRow.okProdPercent || 0,
              rejKgs: changeoverRow.rejKgs || 0,
              runTime: changeoverRow.runTime || 0,
              downTime: changeoverRow.downTime || 0,
              stoppageReason: changeoverRow.stoppageReason || '',
              startTime: String(changeoverRow.stoppageStartTime || ''),
              endTime: String(changeoverRow.stoppageEndTime || ''),
              totalTime: changeoverRow.stoppageTotalTime || 0,
              mouldChange: changeoverRow.mouldChange || '',
              remark: changeoverRow.remark || ''
            } : {
              product: '', cavity: 0, targetCycle: 0, targetRunTime: 0,
              partWeight: 0, actualPartWeight: 0, actualCycle: 0,
              shotsStart: 0, shotsEnd: 0,
              targetQty: 0, actualQty: 0, okProdQty: 0, okProdKgs: 0, okProdPercent: 0,
              rejKgs: 0, runTime: 0, downTime: 0, stoppageReason: '',
              startTime: '', endTime: '', totalTime: 0, mouldChange: '', remark: ''
            };
            
            dayMachines.push({
              machineNo,
              operatorName: group.operatorName || `Operator ${machineNum}`,
              currentProduction: currentProd,
              changeover: changeover
            });
          }
          
          // Create NIGHT shift machine entry if 'b' data exists
          if (group.b) {
            const currentProd = {
              product: group.b.product || '',
              cavity: group.b.cavity || 0,
              targetCycle: group.b.targetCycle || 0,
              targetRunTime: group.b.targetRunTime || 720,
              partWeight: group.b.partWeight || 0,
              actualPartWeight: group.b.actualPartWeight || 0,
              actualCycle: group.b.actualCycle || 0,
              shotsStart: group.b.shotsStart || 0,
              shotsEnd: group.b.shotsEnd || 0,
              targetQty: group.b.targetQty || 0,
              actualQty: group.b.actualQty || 0,
              okProdQty: group.b.okProdQty || 0,
              okProdKgs: group.b.okProdKgs || 0,
              okProdPercent: group.b.okProdPercent || 0,
              rejKgs: group.b.rejKgs || 0,
              runTime: group.b.runTime || 0,
              downTime: group.b.downTime || 0,
              stoppageReason: group.b.stoppageReason || '',
              startTime: String(group.b.stoppageStartTime || ''),
              endTime: String(group.b.stoppageEndTime || ''),
              totalTime: group.b.stoppageTotalTime || 0,
              mouldChange: group.b.mouldChange || '',
              remark: group.b.remark || ''
            };
            
            // Changeover for NIGHT = second row from same 'b' sheet
            const changeoverRow = (group as any).bChangeover;
            const changeover = changeoverRow ? {
              product: changeoverRow.product || '',
              cavity: changeoverRow.cavity || 0,
              targetCycle: changeoverRow.targetCycle || 0,
              targetRunTime: changeoverRow.targetRunTime || 0,
              partWeight: changeoverRow.partWeight || 0,
              actualPartWeight: changeoverRow.actualPartWeight || 0,
              actualCycle: changeoverRow.actualCycle || 0,
              shotsStart: changeoverRow.shotsStart || 0,
              shotsEnd: changeoverRow.shotsEnd || 0,
              targetQty: changeoverRow.targetQty || 0,
              actualQty: changeoverRow.actualQty || 0,
              okProdQty: changeoverRow.okProdQty || 0,
              okProdKgs: changeoverRow.okProdKgs || 0,
              okProdPercent: changeoverRow.okProdPercent || 0,
              rejKgs: changeoverRow.rejKgs || 0,
              runTime: changeoverRow.runTime || 0,
              downTime: changeoverRow.downTime || 0,
              stoppageReason: changeoverRow.stoppageReason || '',
              startTime: String(changeoverRow.stoppageStartTime || ''),
              endTime: String(changeoverRow.stoppageEndTime || ''),
              totalTime: changeoverRow.stoppageTotalTime || 0,
              mouldChange: changeoverRow.mouldChange || '',
              remark: changeoverRow.remark || ''
            } : {
              product: '', cavity: 0, targetCycle: 0, targetRunTime: 0,
              partWeight: 0, actualPartWeight: 0, actualCycle: 0,
              shotsStart: 0, shotsEnd: 0,
              targetQty: 0, actualQty: 0, okProdQty: 0, okProdKgs: 0, okProdPercent: 0,
              rejKgs: 0, runTime: 0, downTime: 0, stoppageReason: '',
              startTime: '', endTime: '', totalTime: 0, mouldChange: '', remark: ''
            };
            
            nightMachines.push({
              machineNo,
              operatorName: group.operatorName || `Operator ${machineNum}`,
              currentProduction: currentProd,
              changeover: changeover
            });
          }
        });
        
        // Return separate DPR objects for DAY and NIGHT shifts
        const results: any[] = [];
        
        // Add DAY shift DPR if we have day machines
        if (dayMachines.length > 0) {
          results.push({
            date: summaryMeta.date || new Date().toISOString().split('T')[0],
            shift: 'DAY',
            shiftIncharge: summaryMeta.shiftIncharge || 'CHANDAN/DHIRAJ',
            machines: dayMachines.sort((a, b) => {
              const numA = parseInt(a.machineNo.replace(/^(IMM|MM)-/, ''));
              const numB = parseInt(b.machineNo.replace(/^(IMM|MM)-/, ''));
              return numA - numB;
            }),
            shiftTotal: dayShiftTotalData || null,
            achievement: dayAchievementData || null
          });
        }
        
        // Add NIGHT shift DPR if we have night machines
        if (nightMachines.length > 0) {
          results.push({
            date: summaryMeta.date || new Date().toISOString().split('T')[0],
            shift: 'NIGHT',
            shiftIncharge: summaryMeta.shiftIncharge || 'CHANDAN/DHIRAJ',
            machines: nightMachines.sort((a, b) => {
              const numA = parseInt(a.machineNo.replace(/^(IMM|MM)-/, ''));
              const numB = parseInt(b.machineNo.replace(/^(IMM|MM)-/, ''));
              return numA - numB;
            }),
            shiftTotal: nightShiftTotalData || null,
            achievement: nightAchievementData || null
          });
        }
        
        return results;
      }
    };
  };

  // Transform extracted DPR results to final structure with summary calculation
  const transformDPRResults = (data: any[], metadata: Map<string, any>): any => {
    if (data.length === 0) return null;
    
    // Process all DPR objects (DAY and NIGHT shifts)
    const transformedResults = data.map(dprData => {
      // Use SHIFT TOTAL from Excel if available (exact snapshot), otherwise calculate from machine data
      const machines = dprData.machines || [];
    let summary: any;
    
    if (dprData.shiftTotal) {
      // Use SHIFT TOTAL data from Excel (exact snapshot)
      // Apply rounding and percentage conversion
      const rawDownTime = dprData.shiftTotal.downTime || 0;
      const rawOkProdPercent = dprData.shiftTotal.okProdPercent || 0;
      
      summary = {
        targetQty: dprData.shiftTotal.targetQty || 0,
        actualQty: dprData.shiftTotal.actualQty || 0,
        okProdQty: dprData.shiftTotal.okProdQty || 0,
        okProdKgs: dprData.shiftTotal.okProdKgs || 0,
        // Convert to percentage (multiply by 100) and round off
        okProdPercent: Math.round(rawOkProdPercent * 100),
        rejKgs: dprData.shiftTotal.rejKgs || 0,
        lumps: dprData.shiftTotal.lumps || 0,
        runTime: dprData.shiftTotal.runTime || 0,
        // Round up downtime to nearest whole number
        downTime: Math.ceil(rawDownTime)
      };
      console.log(`✅ Using SHIFT TOTAL from Excel (exact snapshot):`, summary);
    } else {
      // Fallback: Calculate summary from machine data
    const targetQty = machines.reduce((sum: number, m: any) => 
      sum + (m.currentProduction?.targetQty || 0) + (m.changeover?.targetQty || 0), 0);
    const actualQty = machines.reduce((sum: number, m: any) => 
      sum + (m.currentProduction?.actualQty || 0) + (m.changeover?.actualQty || 0), 0);
    const okProdQty = machines.reduce((sum: number, m: any) => 
      sum + (m.currentProduction?.okProdQty || 0) + (m.changeover?.okProdQty || 0), 0);
    const okProdKgs = machines.reduce((sum: number, m: any) => 
      sum + (m.currentProduction?.okProdKgs || 0) + (m.changeover?.okProdKgs || 0), 0);
    const rejKgs = machines.reduce((sum: number, m: any) => 
      sum + (m.currentProduction?.rejKgs || 0) + (m.changeover?.rejKgs || 0), 0);
    const runTime = machines.reduce((sum: number, m: any) => 
      sum + (m.currentProduction?.runTime || 0) + (m.changeover?.runTime || 0), 0);
    const downTime = machines.reduce((sum: number, m: any) => 
      sum + (m.currentProduction?.downTime || 0) + (m.changeover?.downTime || 0), 0);
    
      summary = {
        targetQty,
        actualQty,
        okProdQty,
        okProdKgs,
        okProdPercent: actualQty > 0 ? (okProdQty / actualQty * 100) : 0,
        rejKgs,
        runTime,
        downTime
      };
      console.log(`⚠️ SHIFT TOTAL not found, calculated from machine data:`, summary);
    }
    
      return {
        id: `${dprData.date}-${dprData.shift}-${Date.now()}`,
        date: dprData.date,
        shift: dprData.shift,
        shiftIncharge: dprData.shiftIncharge,
        machines: dprData.machines,
        summary: summary,
        shiftTotal: dprData.shiftTotal || null,
        achievement: dprData.achievement || null
      };
    });
    
    // Return array of transformed DPR objects (DAY and NIGHT)
    return transformedResults;
  };

  const parseExcelFile = async (file: File) => {
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { 
        type: 'array',
        cellDates: false,
        cellNF: false,
        cellText: false,
        cellFormula: false,
        cellStyles: false,
        cellHTML: false
      });

      // Filter workbook to only include selected sheets
      if (selectedSheets.size > 0 && selectedSheets.size < workbook.SheetNames.length) {
        // Create a filtered workbook with only selected sheets
        const filteredWorkbook: XLSX.WorkBook = {
          SheetNames: workbook.SheetNames.filter(name => selectedSheets.has(name)),
          Sheets: {} as { [sheet: string]: XLSX.WorkSheet }
        };
        workbook.SheetNames.forEach(name => {
          if (selectedSheets.has(name)) {
            filteredWorkbook.Sheets[name] = workbook.Sheets[name];
          }
        });
        // Use filtered workbook
        Object.assign(workbook, filteredWorkbook);
      }

      // Check if this is a multi-sheet data type (e.g., DPR)
      // If DPR type or workbook has multiple sheets that match DPR pattern, use multi-sheet parser
      if (dataType === 'dpr' || (workbook.SheetNames.length > 1 && /summary|^\d+[ab]$/i.test(workbook.SheetNames.join('|')))) {
        const dprConfig = getDPRMultiSheetConfig(workbook);
        const result = await parseMultiSheetWorkbook(workbook, dprConfig);
        
        if (result.errors.length > 0) {
          console.warn('⚠️ DPR parsing errors:', result.errors);
          setImportStatus({ 
            type: 'error', 
            message: `Found ${result.errors.length} errors. Check console for details.` 
          });
        }
        
        if (result.data.length > 0) {
          // Transform to DPR structure (returns array of DPR objects for DAY and NIGHT)
          const dprDataArray = transformDPRResults(result.data, result.metadata);
          
          if (dprDataArray && dprDataArray.length > 0) {
            // Store all DPR objects (DAY and NIGHT)
            setMappedData(prev => ({ ...prev, dpr: dprDataArray }));
            
            const shiftsInfo = dprDataArray.map((d: any) => `${d.shift} (${d.machines?.length || 0} machines)`).join(', ');
            setImportStatus({ 
              type: 'success', 
              message: `✅ Parsed DPR: ${shiftsInfo}, Date: ${dprDataArray[0].date}` 
            });
          } else {
            setImportStatus({ type: 'error', message: 'No DPR data extracted. Check sheet structure.' });
          }
        } else {
          setImportStatus({ type: 'error', message: 'No DPR data extracted. Check sheet structure.' });
        }
        
        setLoading(false);
        return;
      }

      // For single-sheet files, use the first (or only) selected sheet
      const sheetName = workbook.SheetNames.find(name => selectedSheets.size === 0 || selectedSheets.has(name)) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: true,
        defval: ''
      }) as any[][];

      // Try alternative approach: read as text first to preserve formatting
      const jsonDataAsText = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        defval: ''
      }) as any[][];
      
      console.log('🔍 Raw Excel data (raw=true):', jsonData.slice(0, 3));
      console.log('🔍 Text Excel data (raw=false):', jsonDataAsText.slice(0, 3));
      
      // Use the text version for qty_meter fields to preserve decimal formatting
      const finalData = jsonData.map((row, rowIdx) => {
        if (rowIdx === 0) return row; // Keep headers as is
        
        return row.map((cell, colIdx) => {
          const header = jsonData[0][colIdx];
          if (header === 'Qty/Meter' || header === 'Qty/Meter 2' || 
              header === 'QTY/METER' || header === 'QTY/METER 2' ||
              header === 'Qty/Meter.' || header === 'Qty/Meter 2.' ||
              header === 'Qty Meter' || header === 'Qty Meter 2' ||
              header === 'QTY METER' || header === 'QTY METER 2' ||
              header === 'Quantity/Meter' || header === 'Quantity/Meter 2' ||
              header === 'Quantity per Meter' || header === 'Quantity per Meter 2') {
            // Use text version for qty_meter fields
            const textValue = jsonDataAsText[rowIdx]?.[colIdx];
            console.log(`🔍 Qty/Meter field "${header}": raw=${cell}, text=${textValue}`);
            return textValue !== undefined ? textValue : cell;
          }
          return cell;
        });
      });
      
      console.log('🔍 Raw Excel data:', finalData.slice(0, 3));
      
              // Debug: Check specific qty_meter values in the raw data
        if (finalData.length > 1) {
          const headers = finalData[0];
          const qtyMeterIndices: number[] = [];
          headers.forEach((header, idx) => {
            if (header === 'Qty/Meter' || header === 'Qty/Meter 2' || 
                header === 'QTY/METER' || header === 'QTY/METER 2' ||
                header === 'Qty/Meter.' || header === 'Qty/Meter 2.' ||
                header === 'Qty Meter' || header === 'Qty Meter 2' ||
                header === 'QTY METER' || header === 'QTY METER 2' ||
                header === 'Quantity/Meter' || header === 'Quantity/Meter 2' ||
                header === 'Quantity per Meter' || header === 'Quantity per Meter 2') {
              qtyMeterIndices.push(idx);
            }
          });
          if (qtyMeterIndices.length > 0) {
            console.log('🔍 Found qty_meter column at index:', qtyMeterIndices);
            console.log('🔍 Sample qty_meter values from raw data:');
            finalData.slice(1, 4).forEach((row, idx) => {
              if (row[qtyMeterIndices[0]] !== undefined) {
                console.log(`🔍 Row ${idx + 1}: "${row[qtyMeterIndices[0]]}" (Type: ${typeof row[qtyMeterIndices[0]]})`);
              }
            });
          }
        }
      
      // Debug: Check worksheet properties and cell contents
      console.log('🔍 Worksheet properties:', {
        '!ref': worksheet['!ref'],
        '!cols': worksheet['!cols'],
        '!rows': worksheet['!rows']
      });
      
      // Debug: Check specific cell contents for qty_meter columns
      if (worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        console.log('🔍 Worksheet range:', range);
        
        // Find qty_meter columns
        const headers = finalData[0];
        const qtyMeterIndices: number[] = [];
        headers.forEach((header, idx) => {
          if (header === 'Qty/Meter' || header === 'Qty/Meter 2' || 
              header === 'QTY/METER' || header === 'QTY/METER 2' ||
              header === 'Qty/Meter.' || header === 'Qty/Meter 2.' ||
              header === 'Qty Meter' || header === 'Qty Meter 2' ||
              header === 'QTY METER' || header === 'QTY METER 2' ||
              header === 'Quantity/Meter' || header === 'Quantity/Meter 2' ||
              header === 'Quantity per Meter' || header === 'Quantity per Meter 2') {
            qtyMeterIndices.push(idx);
          }
        });
        
        console.log('🔍 Qty/Meter column indices:', qtyMeterIndices);
        
        // Check a few cells in qty_meter columns
        qtyMeterIndices.forEach(colIdx => {
          for (let row = range.s.r + 1; row <= Math.min(range.e.r, range.s.r + 3); row++) {
            const cellAddress = XLSX.utils.encode_cell({r: row, c: colIdx});
            const cell = worksheet[cellAddress];
            if (cell) {
              console.log(`🔍 Cell ${cellAddress} (${headers[colIdx]}):`, {
                value: cell.v,
                type: cell.t,
                format: cell.z,
                raw: cell
              });
            }
          }
        });
      }

      if (finalData.length === 0) throw new Error('Empty sheet');

      const headerRow = (finalData[0] as string[]).map(h => (h ?? '').toString());
      const dataRows = finalData.slice(1);

      const rows: ExcelRow[] = dataRows.map(row => {
        const obj: ExcelRow = {};
        headerRow.forEach((h, i) => { 
          let value = row[i] ?? '';
          
          // Special handling for qty_meter fields to preserve decimals
          if (h === 'Qty/Meter' || h === 'Qty/Meter 2' || 
              h === 'QTY/METER' || h === 'QTY/METER 2' ||
              h === 'Qty/Meter.' || h === 'Qty/Meter 2.' ||
              h === 'Qty Meter' || h === 'Qty Meter 2' ||
              h === 'QTY METER' || h === 'QTY METER 2' ||
              h === 'Quantity/Meter' || h === 'Quantity/Meter 2' ||
              h === 'Quantity per Meter' || h === 'Quantity per Meter 2') {
            console.log(`🔍 Raw Excel value for ${h}:`, row[i], 'Type:', typeof row[i], 'Raw:', row[i]);
            
            // Force conversion to preserve decimal precision
            if (value !== '' && value !== null && value !== undefined) {
              // Convert to string first, then parse to preserve decimals
              const strValue = String(value);
              console.log(`🔍 String conversion: "${row[i]}" -> "${strValue}"`);
              
              // Try to extract decimal places from the string representation
              const decimalMatch = strValue.match(/\.(\d+)/);
              if (decimalMatch) {
                console.log(`🔍 Found decimal places: ${decimalMatch[1]}`);
                const parsed = parseFloat(strValue);
                if (!isNaN(parsed)) {
                  value = parsed;
                  console.log(`🔍 Final parsed value:`, value, 'Type:', typeof value);
                }
              } else {
                // No decimal places found, but still try to parse
                const parsed = parseFloat(strValue);
                if (!isNaN(parsed)) {
                  value = parsed;
                  console.log(`🔍 No decimals found, parsed as:`, value, 'Type:', typeof value);
                }
              }
            }
            
            // Additional debugging: Check if the original value had decimal places
            if (typeof row[i] === 'number') {
              console.log(`🔍 Original number value: ${row[i]}, has decimals: ${row[i] % 1 !== 0}`);
            }
          }
          
          obj[h] = value;
        });
        return obj;
      });

      setHeaders(headerRow);
      setFullRows(rows); // ✅ keep full dataset
      setPreview(rows.slice(0, 10));

      // Use user's manual selection if available, otherwise auto-detect
      let typeToMap: DataType;
      if (dataType !== 'machines') { // If user has manually selected a type
        typeToMap = dataType;
        console.log(`🔍 Using user's manual selection: ${typeToMap}`);
      } else {
        typeToMap = scoreHeaders(headerRow);
        setDataType(typeToMap);
        console.log(`🔍 Auto-detected type: ${typeToMap}`);
      }
      
      await mapDataToFormat(rows, typeToMap);
      setImportStatus({ type: 'info', message: `Using "${typeToMap.replace('_', ' ')}" format.` });
    } catch (err) {
      console.error(err);
      setImportStatus({ type: 'error', message: 'Error parsing Excel file. Please check the format.' });
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Data processors
  const processRawMaterialsPreview = (data: ExcelRow[]): ExcelRow[] => {
    const processed: ExcelRow[] = [];
    data.forEach(row => {
      const slValue = row['Sl.'] ?? row['Sl'] ?? row['SL'] ?? row['SL.'] ?? '';
      const typeValue = row['Type'] ?? '';
      const isCategoryHeader = typeValue && (typeValue.includes('(') && typeValue.includes(')')) && (!slValue || isNaN(Number(slValue)));
      if (!isCategoryHeader && slValue && !isNaN(Number(slValue))) processed.push(row);
    });
    return processed;
  };

  const mapRawMaterialsData = (data: ExcelRow[]) => {
    const mapped: RawMaterial[] = [];
    let currentCategory = 'PP';

    data.forEach(row => {
      const slValue = row['Sl.'] ?? row['Sl'] ?? row['SL'] ?? row['SL.'] ?? '';
      const categoryValue = (row['Category'] ?? currentCategory) as string;
      const typeValue = row['Type'] ?? '';
      const gradeValue = row['Grade'] ?? '';
      const supplierValue = row['Supplier'] ?? '';
      const mfiValue = row['MFI'] ?? '';
      const densityValue = row['Density'] ?? '';
      const tdsValue = row['TDS Attached'] ?? '';
      const remarkValue = row['Remark'] ?? '';
      const unitValue = row['Unit'] ?? 'Unit 1';

      const isCategoryHeader = typeValue && (typeValue.includes('(') && typeValue.includes(')')) && (!slValue || isNaN(Number(slValue)));
      if (isCategoryHeader) { currentCategory = typeValue; return; }

      const hasValidSl = slValue && !isNaN(Number(slValue));
      const hasValidType = typeValue && typeValue.toString().trim() !== '';
      if (!hasValidSl || !hasValidType) return;

      mapped.push({
        sl_no: Number(slValue),
        category: categoryValue,
        type: String(typeValue).trim(),
        grade: String(gradeValue),
        supplier: String(supplierValue),
        mfi: mfiValue ? Number(mfiValue) : null,
        density: densityValue ? Number(densityValue) : null,
        tds_image: tdsValue || undefined,
        remark: remarkValue || undefined,
        unit: unitValue || 'Unit 1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    setMappedData(prev => ({ ...prev, raw_materials: mapped }));
  };

  const mapPackingMaterialsData = (data: ExcelRow[]) => {
    const mapped: PackingMaterial[] = [];
    data.forEach((row, index) => {
      const category = String(row['Category'] ?? '').trim();
      const type = String(row['Type'] ?? '').trim();
      const itemCode =
        String(row['Item Code'] ?? row['ItemCode'] ?? row['Item code'] ?? row['item_code'] ?? '').trim();
      const packSize = String(row['Pack Size'] ?? row['PackSize'] ?? '').trim();
      const dimensions = String(row['Dimensions'] ?? '').trim();
      const technicalDetail = String(row['Technical Detail'] ?? row['TechnicalDetail'] ?? '').trim();
      const brand = String(row['Brand'] ?? '').trim();
      const unit = String(row['Unit'] ?? 'Unit 1').trim();

      const hasAnyValue = [category, type, itemCode, packSize, brand].some(v => v && v !== '-');
      if (!hasAnyValue) return;

      const finalCode = itemCode || `${(category || 'UNK').slice(0, 3).toUpperCase()}-${(type || 'UN').slice(0, 2).toUpperCase()}-${index + 1}`;

      mapped.push({
        category: category || 'Unknown',
        type: type || 'Unknown',
        item_code: finalCode,
        pack_size: packSize || '-',
        dimensions: dimensions || '-',
        technical_detail: technicalDetail || '-',
        brand: brand || '-',
        unit: unit || 'Unit 1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
    setMappedData(prev => ({ ...prev, packing_materials: mapped }));
  };

  const mapColorLabelsData = (data: ExcelRow[]) => {
    const mapped: ColorLabel[] = [];
    console.log('🔍 mapColorLabelsData called with data:', data);
    if (data.length > 0) {
      console.log('🔍 First row keys:', Object.keys(data[0] || {}));
      console.log('🔍 First row values:', data[0]);
    }
    
    // Header patterns to skip
    const headerPatterns = [
      'sr. no.', 'sr no', 'sr.no.', 'srno', 'serial no', 'serial number',
      'color', 'colour', 'name', 'color name', 'color/label', 'color / label',
      'hex code', 'description'
    ];
    
    data.forEach((row, index) => {
      // Extract sr_no and color_label from row
      const allKeys = Object.keys(row);
      let srNo: number | null = null;
      let colorValue = '';
      
      // Find Sr. No. column
      for (const key of allKeys) {
        const lowerKey = key.toLowerCase().trim();
        if (lowerKey === 'sr. no.' || lowerKey === 'sr no' || 
            lowerKey === 'sr.no.' || lowerKey === 'srno' ||
            lowerKey === 'serial no' || lowerKey === 'serial number') {
          const srNoValue = row[key];
          if (srNoValue !== null && srNoValue !== undefined && srNoValue !== '') {
            const parsed = parseInt(String(srNoValue), 10);
            if (!isNaN(parsed)) {
              srNo = parsed;
            }
          }
          break;
        }
      }
      
      // Find Color / Label column
      for (const key of allKeys) {
        const lowerKey = key.toLowerCase().trim();
        if (lowerKey === 'color / label' || lowerKey === 'color/label' || 
            lowerKey === 'color' || lowerKey === 'colour' || 
            lowerKey === 'color name') {
          colorValue = row[key];
          break;
        }
      }
      
      // If no exact match for color, try to find any non-empty value
      if (!colorValue || String(colorValue).trim() === '') {
        for (const key of allKeys) {
          const value = row[key];
          const valueStr = String(value || '').trim();
          const lowerKey = key.toLowerCase().trim();
          
          // Skip if it's a header pattern or sr_no column
          if (valueStr && 
              !headerPatterns.includes(valueStr.toLowerCase()) &&
              !headerPatterns.includes(lowerKey) &&
              !valueStr.match(/^\d+$/) &&
              lowerKey !== 'sr. no.' && lowerKey !== 'sr no' &&
              lowerKey !== 'sr.no.' && lowerKey !== 'srno') {
            colorValue = value;
            break;
          }
        }
      }
      
      console.log(`🔍 Row ${index}:`, row, 'Sr. No.:', srNo, 'Color value:', colorValue);
      
      // Skip if empty or if it looks like a header row
      const colorStr = String(colorValue || '').trim();
      const lowerColorStr = colorStr.toLowerCase();
      
      if (!colorStr || 
          colorStr === '' || 
          headerPatterns.includes(lowerColorStr) ||
          lowerColorStr.startsWith('sr') ||
          lowerColorStr.match(/^sr\.?\s*no/i)) {
        return;
      }

      // If sr_no is not provided, calculate based on actual data rows (not including skipped rows)
      // Count how many valid rows we've processed so far (excluding skipped header rows)
      const validRowIndex = mapped.length;
      const finalSrNo = srNo !== null ? srNo : validRowIndex + 1;

      mapped.push({
        id: '', // Will be generated by database
        sr_no: finalSrNo,
        color_label: colorStr,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as ColorLabel);
    });
    
    console.log('🔍 Mapped color labels:', mapped, 'Total:', mapped.length);
    setMappedData(prev => ({ ...prev, color_labels: mapped }));
  };

  const mapPartyNamesData = (data: ExcelRow[]) => {
    const mapped: PartyName[] = [];
    console.log('🔍 mapPartyNamesData called with data:', data);
    if (data.length > 0) {
      console.log('🔍 First row keys:', Object.keys(data[0] || {}));
      console.log('🔍 First row values:', data[0]);
    }
    
    // Header patterns to skip
    const headerPatterns = [
      'sr. no.', 'sr no', 'sr.no.', 'srno', 'serial no', 'serial number',
      'name', 'party name', 'party', 'party name master'
    ];
    
    // Serial number column patterns to explicitly exclude
    const srNoPatterns = [
      'sr. no.', 'sr no', 'sr.no.', 'srno', 'serial no', 'serial number'
    ];
    
    data.forEach((row, index) => {
      // Extract name from row - explicitly exclude serial number column
      const allKeys = Object.keys(row);
      let nameValue = '';
      
      // Strategy: Find the column that contains text (not numbers) and is not a serial number column
      // Based on console logs: {Party Name: 1, "": 'Easy'} - empty key has names, "Party Name" has numbers
      
      // PRIORITY 1: Check empty key column first (this is where the actual names are)
      // Based on console: {Party Name: 1, "": 'Easy'} - empty key "" has the names
      const emptyKeyValue = row[''];
      if (emptyKeyValue !== undefined && emptyKeyValue !== null && emptyKeyValue !== '') {
        const emptyValueStr = String(emptyKeyValue).trim();
        // Use empty column if it's not a number and not a header
        if (emptyValueStr && 
            !emptyValueStr.match(/^\d+$/) && 
            emptyValueStr.toLowerCase() !== 'name' &&
            emptyValueStr.toLowerCase() !== 'sr. no.') {
          nameValue = emptyKeyValue;
          console.log(`✅ Row ${index}: Using empty column value: "${nameValue}"`);
        } else {
          console.log(`⚠️ Row ${index}: Empty column value rejected: "${emptyValueStr}" (is number or header)`);
        }
      } else {
        console.log(`⚠️ Row ${index}: No empty column value found`);
      }
      
      // PRIORITY 2: If empty column didn't work, try named columns (but ONLY if value is NOT a number)
      // IMPORTANT: Only check other columns if we don't have a valid nameValue yet
      if (!nameValue || String(nameValue).trim() === '' || String(nameValue).trim().match(/^\d+$/)) {
        for (const key of allKeys) {
          if (key === '') continue; // Already checked
          
          const lowerKey = key.toLowerCase().trim();
          const isSrNoColumn = srNoPatterns.some(pattern => lowerKey === pattern);
          
          // Skip serial number columns
          if (isSrNoColumn) {
            continue;
          }
          
          const value = row[key];
          const valueStr = String(value || '').trim();
          
          // For "name" or "party name" columns, ONLY use if value is NOT a number
          if (lowerKey === 'name' || lowerKey === 'party name' || lowerKey === 'partyname') {
            if (valueStr && !valueStr.match(/^\d+$/) && valueStr.toLowerCase() !== 'sr. no.' && valueStr.toLowerCase() !== 'name') {
              nameValue = value;
              console.log(`✅ Row ${index}: Using "${key}" column value: "${nameValue}"`);
              break;
            }
          }
        }
      }
      
      // PRIORITY 3: Last resort - find any column with text (not numbers)
      if (!nameValue || String(nameValue).trim() === '' || String(nameValue).trim().match(/^\d+$/)) {
        for (const key of allKeys) {
          if (key === '') continue; // Already checked
          
          const lowerKey = key.toLowerCase().trim();
          const isSrNoColumn = srNoPatterns.some(pattern => lowerKey === pattern);
          
          // Skip serial number columns
          if (isSrNoColumn) {
            continue;
          }
          
          const value = row[key];
          const valueStr = String(value || '').trim();
          
          // Use this value if it's text (not a number) and not a header
          if (valueStr && 
              !valueStr.match(/^\d+$/) &&
              !headerPatterns.includes(valueStr.toLowerCase()) &&
              valueStr.toLowerCase() !== 'name' &&
              valueStr.toLowerCase() !== 'party name' &&
              valueStr.toLowerCase() !== 'sr. no.' &&
              lowerKey !== 'sr. no.' &&
              lowerKey !== 'name' &&
              lowerKey !== 'party name') {
            nameValue = value;
            console.log(`✅ Row ${index}: Using fallback column "${key}": "${nameValue}"`);
            break;
          }
        }
      }
      
      console.log(`🔍 Row ${index}:`, row, 'Final name value found:', nameValue);
      console.log(`🔍 Row ${index}: All keys:`, allKeys, 'Empty key value:', row['']);
      
      // Skip if empty or if it looks like a header row
      const nameStr = String(nameValue || '').trim();
      const lowerNameStr = nameStr.toLowerCase();
      
      // Final validation - skip if it's a number, header, or empty
      if (!nameStr || 
          nameStr === '' || 
          headerPatterns.includes(lowerNameStr) ||
          lowerNameStr.startsWith('sr') ||
          lowerNameStr.match(/^sr\.?\s*no/i) ||
          nameStr.match(/^\d+$/)) { // Skip if it's just a number
        console.log(`⏭️ Skipping row ${index}: invalid name value "${nameStr}" (empty, header, or number)`);
        return;
      }
      
      console.log(`✅ Row ${index}: Valid name found: "${nameStr}"`);

      mapped.push({
        id: '', // Will be generated by database
        name: nameStr,
        code: undefined,
        address: undefined,
        contact_person: undefined,
        phone: undefined,
        email: undefined,
        gstin: undefined,
        description: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as PartyName);
    });
    
    console.log('🔍 Mapped party names:', mapped, 'Total:', mapped.length);
    setMappedData(prev => ({ ...prev, party_names: mapped }));
  };

  const mapDataToFormat = async (data: ExcelRow[], type: DataType) => {
    const mapping = TEMPLATE_MAPPINGS[type as keyof typeof TEMPLATE_MAPPINGS] as Record<string, string>;
    const availableColumns = Object.keys(data[0] || {});
    const flexibleMapping: Record<string, string> = {};

    console.log('🔍 Mapping data for type:', type);
    console.log('🔍 Available columns:', availableColumns);
    console.log('🔍 Template mapping:', mapping);

    // Build flexible header mapping
    Object.entries(mapping).forEach(([expected, dbField]) => {
      if (availableColumns.includes(expected)) flexibleMapping[expected] = dbField;
      else {
        const similar = availableColumns.find(c => c.toLowerCase().trim() === expected.toLowerCase().trim());
        if (similar) flexibleMapping[similar] = dbField;
      }
    });

    console.log('🔍 Flexible mapping:', flexibleMapping);

    // Raw materials special
    if (type === 'raw_materials') return mapRawMaterialsData(data);
    if (type === 'packing_materials') return mapPackingMaterialsData(data);
    if (type === 'color_labels') {
      console.log('🔍 Calling mapColorLabelsData with', data.length, 'rows');
      return mapColorLabelsData(data);
    }
    if (type === 'party_names') {
      console.log('🔍 Calling mapPartyNamesData with', data.length, 'rows');
      return mapPartyNamesData(data);
    }

    const mappedItems = data.map((row, index) => {
      const mapped: any = {};
      
      if (index < 3) { // Only log first 3 rows to avoid spam
        console.log(`🔍 Processing row ${index}:`, row);
      }

      Object.entries(flexibleMapping).forEach(([excelCol, dbCol]) => {
        let value = row[excelCol];

        // Machines
        if (type === 'machines') {
          if (dbCol === 'size' || dbCol === 'capacity_tons') value = value === '' ? 0 : parseInt(value);
          if (dbCol === 'grinding_available') value = value === true || String(value).toLowerCase() === 'true' || value === 1;
          if ((dbCol === 'mfg_date' || dbCol === 'install_date' || dbCol === 'purchase_date') && value) {
            if (typeof value === 'number') {
              try {
                const d = XLSX.SSF.parse_date_code(value);
                value = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
              } catch { value = null; }
            } else {
              const dt = new Date(value);
              value = isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
            }
          }
        }

        // Molds
        if (type === 'molds') {
          if (['cycle_time', 'dwg_wt', 'std_wt', 'rp_wt', 'mold_wt', 'st_wt'].includes(dbCol)) {
            value = value === '' || value === null || value === undefined ? null : (parseFloat(value) || null);
          }
          if (dbCol === 'sr_no') value = (value ?? '').toString() || null;
          if (dbCol === 'cavities') value = value === '' || value === null || value === undefined ? 1 : (parseInt(value) || 1);
          if (['purchase_date', 'start_date'].includes(dbCol)) {
            if (!value) value = null;
            else if (typeof value === 'number') {
              try {
                const d = XLSX.SSF.parse_date_code(value);
                value = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
              } catch { value = null; }
            } else {
              const dt = new Date(value);
              value = isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
            }
          }
          if (dbCol === 'compatible_machines') value = typeof value === 'string' ? value.split(',').map(s => s.trim()) : [];
        }

        // Schedules
        if (type === 'schedules') {
          if (['expected_pieces', 'stacks_per_box', 'pieces_per_stack'].includes(dbCol)) value = parseInt(value) || 0;
          if (dbCol === 'is_done') value = value === true || String(value).toLowerCase() === 'true' || value === 1;
          if (dbCol === 'date' && value && typeof value === 'number') {
            const d = XLSX.SSF.parse_date_code(value);
            value = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
          }
        }



        // FG BOM quantity fields need numeric conversion with precision handling
        if (type === 'fg_bom') {
          console.log('🔍 FG BOM ROW DATA:', row);
          console.log('🔍 FG BOM HEADERS:', Object.keys(row));
          console.log('🔍 FG BOM MAPPING:', flexibleMapping);
          
          if (['qty_meter', 'qty_meter_2', 'sfg_1_qty', 'sfg_2_qty', 'cnt_qty', 'poly_qty'].includes(dbCol)) {
            console.log('🔍 Processing field:', dbCol, 'Excel value:', value, 'Type:', typeof value);
            if (value === '' || value === null || value === undefined) {
              value = null;
            } else {
              const parsed = parseFloat(value);
              if (isNaN(parsed)) {
                value = null;
              } else {
                // Limit to exactly 2 decimal places without rounding
                value = Math.floor(parsed * 100) / 100;
              }
            }
            console.log('🔍 After precision conversion:', value, 'Type:', typeof value);
          }
        }

        // LOCAL BOM quantity fields need numeric conversion with precision handling
        if (type === 'local_bom') {
          console.log('🔍 LOCAL BOM ROW DATA:', row);
          console.log('🔍 LOCAL BOM HEADERS:', Object.keys(row));
          console.log('🔍 LOCAL BOM MAPPING:', flexibleMapping);
          
          if (['qty_meter', 'qty_meter_2', 'sfg_1_qty', 'sfg_2_qty', 'cnt_qty', 'poly_qty'].includes(dbCol)) {
            console.log('🔍 Processing field:', dbCol, 'Excel value:', value, 'Type:', typeof value);
            if (value === '' || value === null || value === undefined) {
              value = null;
            } else {
              const parsed = parseFloat(value);
              if (isNaN(parsed)) {
                value = null;
              } else {
                // Limit to exactly 2 decimal places without rounding
                value = Math.floor(parsed * 100) / 100;
              }
            }
            console.log('🔍 After precision conversion:', value, 'Type:', typeof value);
          }
        }

        // SFG BOM: Remove 100 prefix from codes and update item names
        if (type === 'sfg_bom') {
          if (dbCol === 'sfg_code' && value) {
            value = removeOldPrefix(String(value));
          }
        }

        // FG BOM: Remove 200 prefix from codes and update item names
        if (type === 'fg_bom') {
          if (dbCol === 'item_code' && value) {
            value = removeOldPrefix(String(value));
          }
          if (dbCol === 'item_code' && value) {
            // Note: FG BOM doesn't have item_name field, but we can update party_name if needed
            // For now, we just remove the prefix from item_code
          }
        }

        // LOCAL BOM: Remove 200 prefix from codes
        if (type === 'local_bom') {
          if (dbCol === 'item_code' && value) {
            value = removeOldPrefix(String(value));
          }
        }

        mapped[dbCol] = value;
      });

      // Post-processing defaults
      if (type === 'schedules') {
        mapped.done_timestamp = null;
        mapped.approved_by = null;
        mapped.approval_status = mapped.approval_status || 'pending';
      }

      if (type === 'machines') {
        if (mapped.serial_no && typeof mapped.serial_no === 'string') {
          if (mapped.category === 'IM') {
            const parts = mapped.serial_no.split('/');
            if (parts.length === 2) {
              mapped.clm_sr_no = parts[0].trim();
              mapped.inj_serial_no = parts[1].trim();
            } else {
              mapped.clm_sr_no = mapped.serial_no.trim();
              mapped.inj_serial_no = '';
            }
          } else {
            mapped.clm_sr_no = mapped.serial_no.trim();
            mapped.inj_serial_no = '';
          }
        }
        if (mapped.category) mapped.type = mapped.category;
        else if (!mapped.type) mapped.type = 'Injection Molding Machine';

        mapped.capacity_tons = mapped.capacity_tons || mapped.size || 0;
        mapped.grinding_available = !!mapped.grinding_available;
        mapped.install_date = mapped.install_date || null;
        mapped.status = mapped.status || 'Active';
        mapped.zone = mapped.zone || '';
        mapped.purchase_date = mapped.purchase_date || mapped.install_date || null;
        mapped.unit = mapped.unit || 'Unit 1';
        mapped.remarks = mapped.remarks || '';
      }

      if (type === 'molds') {
        if (mapped.sr_no && !mapped.mold_id) mapped.mold_id = `MOLD-${mapped.sr_no}`;
        else if (mapped.mold_name && !mapped.mold_id) mapped.mold_id = String(mapped.mold_name).replace(/\s+/g, '-').toUpperCase();
        mapped.purchase_date = mapped.purchase_date || null;
        mapped.compatible_machines = mapped.compatible_machines || [];
        mapped.maker = mapped.maker || mapped.make || 'Unknown';
        mapped.unit = mapped.unit || 'Unit 1';
      }

      if (type === 'lines') {
        // Set defaults
        mapped.status = mapped.status || 'Active';
        mapped.unit = mapped.unit || 'Unit 1';
        mapped.description = mapped.description || `Production ${mapped.line_id}`;
      }

      // Common: unit default for these types
      if (['raw_materials', 'packing_materials', 'machines', 'molds', 'lines'].includes(type)) {
        mapped.unit = mapped.unit || 'Unit 1';
      }

      // Post-process BOM codes: Remove prefixes and update item names
      if (type === 'sfg_bom') {
        // Remove 100 prefix from sfg_code if present
        if (mapped.sfg_code) {
          mapped.sfg_code = removeOldPrefix(String(mapped.sfg_code));
        }
        // Update item_name: Remove 100 prefix and ensure RP/CK is displayed
        if (mapped.item_name) {
          const sfgCode = mapped.sfg_code ? String(mapped.sfg_code) : '';
          mapped.item_name = updateItemNameWithRPOrCK(String(mapped.item_name), sfgCode);
        }
      }

      if (type === 'fg_bom') {
        // Remove 200 prefix from item_code if present
        if (mapped.item_code) {
          mapped.item_code = removeOldPrefix(String(mapped.item_code));
        }
      }

      if (type === 'local_bom') {
        // Remove 200 prefix from item_code if present
        if (mapped.item_code) {
          mapped.item_code = removeOldPrefix(String(mapped.item_code));
        }
      }

      return mapped;
    });

    console.log('🔍 Mapped items before filtering:', mappedItems.slice(0, 3));

    const filteredItems = mappedItems.filter(item => {
      // Required field check by type
      switch (type as DataType) {
        case 'machines':
          return !!(item.machine_id && String(item.machine_id).trim());
      
        case 'molds':
          return !!(
            (item.sr_no && String(item.sr_no).trim()) ||
            (item.mold_id && String(item.mold_id).trim()) ||
            (item.mold_name && String(item.mold_name).trim())
          );
      
        case 'raw_materials':
          return !!(item.sl_no && String(item.sl_no).trim());
      
        case 'packing_materials':
          return !!(item.item_code && String(item.item_code).trim());
      
        case 'lines':
          return !!(item.line_id && String(item.line_id).trim());
      
        case 'bom_masters':
          return !!(item.sfg_code && String(item.sfg_code).trim());
      
        case 'fg_bom':
          return !!(item.sl_no && item.item_code && String(item.sl_no).trim() && String(item.item_code).trim());
      
        case 'local_bom':
          return !!(item.sl_no && item.item_code && String(item.sl_no).trim() && String(item.item_code).trim());
      
        case 'sfg_bom':
          return !!(item.sl_no && item.sfg_code && String(item.sl_no).trim() && String(item.sfg_code).trim());
      
        case 'color_labels':
          return !!(item.color_label && String(item.color_label).trim());
      
        case 'party_names':
          return !!(item.name && String(item.name).trim());
      
        case 'schedules':
        default:
          return !!(item.schedule_id && String(item.schedule_id).trim());
      }
    });

    console.log('🔍 Filtered items:', filteredItems.slice(0, 3));
    console.log('🔍 Total items after filtering:', filteredItems.length);

    setMappedData(prev => {
      const newMappedData = { ...prev, [type]: filteredItems } as ImportData;
          console.log('🔍 Setting mapped data for', type, ':', filteredItems.length, 'items');
    console.log('🔍 Sample filtered items:', filteredItems.slice(0, 3));
    console.log('🔍 New mapped data state:', newMappedData);
    return newMappedData;
    });
    setImportStatus({ type: '', message: '' });
  };

  // ----------------------------------------------------------------------------
  // Import
  const handleImport = async () => {
    // For DPR, check if dpr object exists
    if (dataType === 'dpr') {
      if (!mappedData.dpr) {
        setImportStatus({ type: 'error', message: 'No valid DPR data to import.' });
        return;
      }
    } else {
      // For other types, check array length
      if (!Array.isArray(mappedData[dataType]) || mappedData[dataType].length === 0) {
        setImportStatus({ type: 'error', message: 'No valid data to import.' });
        return;
      }
    }

    // Guard: if user forced a different type than detected & headers mismatch, warn
    // But only if the user hasn't manually selected a type (i.e., still using default 'machines')
    if (headers.length && dataType !== inferredType && dataType === 'machines') {
      setImportStatus({
        type: 'error',
        message: `This file looks like "${inferredType.replace('_', ' ')}". Switch to that type or upload a matching template for "${dataType.replace('_', ' ')}".`
      });
      return;
    }

    setImporting(true);
    try {
      let result: any[] = [];
      let duplicateCount = 0;

      switch (dataType) {
        case 'machines': {
          const existing = await machineAPI.getAll();
          const existingIds = new Set(existing.map(m => m.machine_id));
          const existingCombos = new Set(existing.map(m => `${m.make || ''}-${m.model || ''}-${m.inj_serial_no || ''}`));
          const toCreate = mappedData.machines.filter(m => {
            const byId = existingIds.has(m.machine_id);
            const hasComboBits = !!(m.make && m.model && m.inj_serial_no);
            const combo = `${m.make || ''}-${m.model || ''}-${m.inj_serial_no || ''}`;
            const byCombo = hasComboBits && existingCombos.has(combo);
            if (byId || byCombo) { duplicateCount++; return false; }
            return true;
          });
          result = toCreate.length ? await machineAPI.bulkCreate(toCreate) : [];
          break;
        }
        case 'molds': {
          const existing = await moldAPI.getAll();
          const toCreate: any[] = [];
          const toUpdate: any[] = [];
          mappedData.molds.forEach(m => {
            const hit = existing.find(e => e.sr_no === m.sr_no);
            if (hit) {
              const { mold_id, ...rest } = m;
              toUpdate.push({ mold_id: hit.mold_id, ...rest });
            } else {
              toCreate.push(m);
            }
          });
          result = toCreate.length ? await moldAPI.bulkCreate(toCreate) : [];
          for (const u of toUpdate) {
            try { await moldAPI.update(u.mold_id, u); } catch { /* noop; already logged upstream if needed */ }
          }
          break;
        }
        case 'schedules': {
          const existing = await scheduleAPI.getAll();
          const existingCombos = new Set(existing.map(s => `${s.machine_id}-${s.mold_id}-${s.start_time}`));
          const toCreate = mappedData.schedules.filter(s => {
            const combo = `${s.machine_id}-${s.mold_id}-${s.start_time}`;
            const dup = existingCombos.has(combo);
            if (dup) { duplicateCount++; return false; }
            return true;
          });
          result = toCreate.length ? await scheduleAPI.bulkCreate(toCreate) : [];
          break;
        }
        case 'raw_materials': {
          const existing = await rawMaterialAPI.getAll();
          const existingCombos = new Set(existing.map((rm: RawMaterial) => `${rm.type}-${rm.grade}-${rm.supplier}`));
          const toCreate = mappedData.raw_materials.filter(rm => {
            const combo = `${rm.type}-${rm.grade}-${rm.supplier}`;
            if (existingCombos.has(combo)) { duplicateCount++; return false; }
            return true;
          });

          if (toCreate.length) {
            try {
              result = await rawMaterialAPI.bulkCreate(toCreate);
            } catch {
              // fallback 1-by-1 to salvage partial success
              const successes: RawMaterial[] = [];
              for (const rec of toCreate) {
                try { const created = await rawMaterialAPI.create(rec); if (created) successes.push(created); }
                catch { duplicateCount++; }
              }
              result = successes;
            }
          } else result = [];
          break;
        }
        case 'packing_materials': {
          const existing = await packingMaterialAPI.getAll();
          const existingCodes = new Set(existing.map(p => p.item_code));
          const toCreate = mappedData.packing_materials.filter(p => {
            if (existingCodes.has(p.item_code)) { duplicateCount++; return false; }
            return true;
          });
          result = toCreate.length ? await packingMaterialAPI.bulkCreate(toCreate) : [];
          break;
        }
        case 'color_labels': {
          const existing = await colorLabelAPI.getAll();
          const existingSrNos = new Set(existing.map(c => c.sr_no));
          const existingLabels = new Set(existing.map(c => c.color_label.toLowerCase()));
          const toCreate = mappedData.color_labels.filter(c => {
            // Check for duplicate by sr_no or color_label
            if (c.sr_no && existingSrNos.has(c.sr_no)) { duplicateCount++; return false; }
            if (c.color_label && existingLabels.has(c.color_label.toLowerCase())) { duplicateCount++; return false; }
            return true;
          });
          // Create one by one since there's no bulkCreate
          const successes: ColorLabel[] = [];
          for (const item of toCreate) {
            try {
              const created = await colorLabelAPI.create(item);
              if (created) successes.push(created);
            } catch (err) {
              console.error('Error creating color/label:', err);
              duplicateCount++;
            }
          }
          result = successes;
          break;
        }
        case 'party_names': {
          console.log('🔍 Starting party names import, mapped data:', mappedData.party_names);
          if (!mappedData.party_names || mappedData.party_names.length === 0) {
            throw new Error('No party names data found to import. Please check your Excel file format.');
          }
          const existing = await partyNameAPI.getAll();
          const existingNames = new Set(existing.map(p => p.name.toLowerCase()));
          const toCreate = mappedData.party_names.filter(p => {
            if (!p.name || String(p.name).trim() === '') {
              console.warn('Skipping party name with empty name:', p);
              return false;
            }
            if (existingNames.has(p.name.toLowerCase())) { 
              duplicateCount++; 
              return false; 
            }
            return true;
          });
          console.log(`🔍 Found ${toCreate.length} party names to create (${duplicateCount} duplicates skipped)`);
          
          // Create one by one since there's no bulkCreate
          const successes: PartyName[] = [];
          const errors: string[] = [];
          for (const item of toCreate) {
            try {
              console.log('🔍 Creating party name:', item);
              const created = await partyNameAPI.create(item);
              if (created) {
                successes.push(created);
                console.log('✅ Successfully created:', created.name);
              } else {
                errors.push(`Failed to create: ${item.name}`);
              }
            } catch (err: any) {
              console.error('❌ Error creating party name:', err);
              const errorMsg = err?.message || err?.code || 'Unknown error';
              errors.push(`${item.name}: ${errorMsg}`);
              duplicateCount++;
            }
          }
          result = successes;
          
          if (errors.length > 0) {
            console.error('❌ Import errors:', errors);
            setImportStatus({ 
              type: 'error', 
              message: `Imported ${successes.length} party names. ${errors.length} failed: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}` 
            });
          }
          
          // Trigger refresh event
          window.dispatchEvent(new CustomEvent('refreshPartyNames'));
          break;
        }
        case 'lines': {
          const existing = await lineAPI.getAll();
          const existingIds = new Set(existing.map(l => l.line_id));
          
          // Get all existing machines to validate references and categories
          const existingMachines = await machineAPI.getAll();
          const existingMachineIds = new Set(existingMachines.map(m => m.machine_id));
          
          // Create a map of machine_id to category for validation
          const machineCategories = new Map();
          existingMachines.forEach(machine => {
            machineCategories.set(machine.machine_id, machine.category);
          });
          
          const toCreate = mappedData.lines.filter(l => {
            if (existingIds.has(l.line_id)) { duplicateCount++; return false; }
            return true;
          }).map(line => {
            // Validate and set machine references
            const validatedLine = { ...line };
            
            // Keep line_id as provided in Excel (no forced formatting)
            // Set description if not provided
            if (!validatedLine.description && validatedLine.line_id) {
              validatedLine.description = validatedLine.line_id;
            }
            
            // Validate machine assignments - accept any valid machine ID
            const machineFields = ['im_machine_id', 'robot_machine_id', 'conveyor_machine_id', 'hoist_machine_id'];
            
            machineFields.forEach(field => {
              const machineId = (validatedLine as any)[field];
              if (machineId && machineId !== 'EMPTY' && machineId.trim() !== '') {
                // Only check if machine exists, don't enforce category restrictions
                if (!existingMachineIds.has(machineId)) {
                  console.warn(`Machine ${machineId} not found in database for field ${field}`);
                  (validatedLine as any)[field] = undefined;
                }
              }
            });
            
            return validatedLine;
          });
          
          // Import lines
          result = toCreate.length ? await lineAPI.bulkCreate(toCreate) : [];
          break;
        }
        case 'maintenance_checklists': {
          const existing = await maintenanceChecklistAPI.getAll();
          const existingNames = new Set(existing.map(c => `${c.name}-${c.line_id || c.machine_id}`));
          
          // Group the Excel data by checklist name and line/machine
          const checklistGroups = new Map();
          
          mappedData.maintenance_checklists?.forEach((row: any) => {
            const key = `${row.name}-${row.line_id || row.machine_id}`;
            if (!checklistGroups.has(key)) {
              checklistGroups.set(key, {
                name: row.name,
                description: row.name,
                checklist_type: row.checklist_type || 'general',
                line_id: row.line_id || null,
                machine_id: row.machine_id || null,
                unit: row.unit || 'Unit 1',
                items: [],
                estimated_duration_minutes: row.estimated_duration_minutes || 30
              });
            }
            
            // Add task item to the checklist
            if (row.task_description) {
              checklistGroups.get(key).items.push({
                id: row.item_id || `item_${checklistGroups.get(key).items.length + 1}`,
                task: row.task_description,
                completed: false,
                frequency: row.frequency || 'daily',
                priority: row.priority || 'medium',
                category: row.category || 'general'
              });
            }
          });
          
          const toCreate = Array.from(checklistGroups.values()).filter(checklist => {
            const key = `${checklist.name}-${checklist.line_id || checklist.machine_id}`;
            if (existingNames.has(key)) { duplicateCount++; return false; }
            return true;
          });
          
          result = toCreate.length ? await maintenanceChecklistAPI.bulkCreate(toCreate) : [];
          
          // Update machine line assignments dynamically
          if (result.length > 0) {
            const machineUpdates: Array<{machine_id: string, line: string}> = [];
            
            for (const line of result) {
              // Use the actual line_id from the line master
              const lineAssignment = line.line_id;
              
              // Update all machines assigned to this line (any type)
              const machineFields = [
                'im_machine_id',
                'robot_machine_id', 
                'conveyor_machine_id',
                'hoist_machine_id'
              ];
              
              machineFields.forEach(field => {
                const machineId = (line as any)[field];
                if (machineId && machineId !== 'EMPTY' && machineId.trim() !== '') {
                  machineUpdates.push({
                    machine_id: machineId,
                    line: lineAssignment
                  });
                  console.log(`Assigning machine ${machineId} to line ${lineAssignment} via ${field}`);
                }
              });
            }
            
            // Bulk update machines with line assignments
            if (machineUpdates.length > 0) {
              console.log(`Attempting to update ${machineUpdates.length} machines with line assignments...`);
              
              for (const update of machineUpdates) {
                try {
                  // First check if the machine exists
                  const existingMachine = await machineAPI.getById(update.machine_id);
                  if (!existingMachine) {
                    console.warn(`Machine ${update.machine_id} not found in database, skipping line assignment`);
                    continue;
                  }
                  
                  await machineAPI.update(update.machine_id, { line: update.line });
                  console.log(`✅ Successfully updated machine ${update.machine_id} with line ${update.line}`);
                } catch (error) {
                  console.warn(`Failed to update machine ${update.machine_id} with line ${update.line}:`, error);
                }
              }
            }
          }
          
          break;
        }
        case 'bom_masters': {
          // For backward compatibility, treat as SFG BOM
          const existing = await bomMasterAPI.getByCategory('SFG');
          const existingCodes = new Set(existing.map(b => b.sfg_code));
          const toCreate = mappedData.bom_masters.filter(b => {
            const code = b.sfg_code;
            if (existingCodes.has(code)) { duplicateCount++; return false; }
            return true;
          });
          
          // Create SFG BOM masters one by one
          const createdBOMs = [];
          for (const bom of toCreate) {
            try {
              const bomData = {
                status: 'draft' as const,
                created_by: user?.username || 'excel_import',
                // Common fields
                sl_no: bom.sl_no || 0,
                // SFG-specific fields
                item_name: bom.item_name || '',
                sfg_code: bom.sfg_code || '',
                pcs: bom.pcs || 0,
                part_weight_gm_pcs: bom.part_weight_gm_pcs || 0,
                colour: bom.colour || '',
                hp_percentage: bom.hp_percentage || 0,
                icp_percentage: bom.icp_percentage || 0,
                rcp_percentage: bom.rcp_percentage || 0,
                ldpe_percentage: bom.ldpe_percentage || 0,
                gpps_percentage: bom.gpps_percentage || 0,
                mb_percentage: bom.mb_percentage || 0
              };
              const created = await bomMasterAPI.create(bomData);
              if (created) createdBOMs.push(created);
            } catch (error) {
              console.warn('Failed to create SFG BOM master:', bom.sfg_code, error);
              duplicateCount++;
            }
          }
          result = createdBOMs;
          break;
        }
        case 'sfg_bom': {
          // Import SFG BOM data
          const existing = await bomMasterAPI.getByCategory('SFG');
          const existingCodes = new Set(existing.map(b => b.sfg_code));
          const toCreate = mappedData.sfg_bom.filter(b => {
            const code = b.sfg_code;
            if (existingCodes.has(code)) { duplicateCount++; return false; }
            return true;
          });
          
          // Create SFG BOM masters one by one
          const createdBOMs = [];
          for (const bom of toCreate) {
            try {
              const bomData = {
                status: 'draft' as const,
                created_by: user?.username || 'excel_import',
                // Common fields
                sl_no: bom.sl_no || 0,
                // SFG-specific fields
                item_name: bom.item_name || '',
                sfg_code: bom.sfg_code || '',
                pcs: bom.pcs || 0,
                part_weight_gm_pcs: bom.part_weight_gm_pcs || 0,
                colour: bom.colour || '',
                hp_percentage: bom.hp_percentage || 0,
                icp_percentage: bom.icp_percentage || 0,
                rcp_percentage: bom.rcp_percentage || 0,
                ldpe_percentage: bom.ldpe_percentage || 0,
                gpps_percentage: bom.gpps_percentage || 0,
                mb_percentage: bom.mb_percentage || 0
              };
              const created = await bomMasterAPI.create(bomData);
              if (created) createdBOMs.push(created);
            } catch (error) {
              console.warn('Failed to create SFG BOM master:', bom.sfg_code, error);
              duplicateCount++;
            }
          }
          result = createdBOMs;
          break;
        }

        case 'fg_bom': {
          // Import FG BOM data
          const existing = await bomMasterAPI.getByCategory('FG');
          const existingCodes = new Set(existing.map(b => b.item_code));
          const toCreate = mappedData.fg_bom.filter(b => {
            const code = b.item_code;
            if (existingCodes.has(code)) { duplicateCount++; return false; }
            return true;
          });
          
          // Create FG BOM masters one by one
          const createdBOMs = [];
          for (const bom of toCreate) {
            try {
              const bomData = {
                status: 'draft' as const,
                created_by: user?.username || 'excel_import',
                // Common fields
                sl_no: bom.sl_no || 0,
                // FG-specific fields
                item_code: bom.item_code || '',
                party_name: bom.party_name || '',
                pack_size: bom.pack_size || '',
                sfg_1: bom.sfg_1 || '',
                sfg_1_qty: bom.sfg_1_qty || 0,
                sfg_2: bom.sfg_2 || '',
                sfg_2_qty: bom.sfg_2_qty || 0,
                cnt_code: bom.cnt_code || '',
                cnt_qty: bom.cnt_qty || 0,
                polybag_code: bom.polybag_code || '',
                poly_qty: bom.poly_qty || 0,
                bopp_1: bom.bopp_1 || '',
                qty_meter: bom.qty_meter ?? 0,
                bopp_2: bom.bopp_2 || '',
                qty_meter_2: bom.qty_meter_2 ?? 0
              };
              const created = await bomMasterAPI.create(bomData);
              if (created) createdBOMs.push(created);
            } catch (error) {
              console.warn('Failed to create FG BOM master:', bom.item_code, error);
              duplicateCount++;
            }
          }
          result = createdBOMs;
          break;
        }

        case 'local_bom': {
          // Import LOCAL BOM data
          const existing = await bomMasterAPI.getByCategory('LOCAL');
          const existingCodes = new Set(existing.map(b => b.item_code));
          const toCreate = mappedData.local_bom.filter(b => {
            const code = b.item_code;
            if (existingCodes.has(code)) { duplicateCount++; return false; }
            return true;
          });
          
          // Create LOCAL BOM masters one by one
          const createdBOMs = [];
          for (const bom of toCreate) {
            try {
              const bomData = {
                status: 'draft' as const,
                created_by: user?.username || 'excel_import',
                // Common fields
                sl_no: bom.sl_no || 0,
                // LOCAL-specific fields
                item_code: bom.item_code || '',
                pack_size: bom.pack_size || '',
                sfg_1: bom.sfg_1 || '',
                sfg_1_qty: bom.sfg_1_qty || 0,
                sfg_2: bom.sfg_2 || '',
                sfg_2_qty: bom.sfg_2_qty || 0,
                cnt_code: bom.cnt_code || '',
                cnt_qty: bom.cnt_qty || 0,
                polybag_code: bom.polybag_code || '',
                poly_qty: bom.poly_qty || 0,
                bopp_1: bom.bopp_1 || '',
                qty_meter: bom.qty_meter ?? 0,
                bopp_2: bom.bopp_2 || '',
                qty_meter_2: bom.qty_meter_2 ?? 0
              };
              const created = await bomMasterAPI.create(bomData);
              if (created) createdBOMs.push(created);
            } catch (error) {
              console.warn('Failed to create LOCAL BOM master:', bom.item_code, error);
              duplicateCount++;
            }
          }
          result = createdBOMs;
          break;
        }
      }

      const newRecords = result?.length || 0;
      const total = mappedData[dataType].length;
      let message = '';
      if (newRecords > 0) message = `✅ Imported ${newRecords} new ${dataType.replace('_', ' ')} record(s).`;
      if (duplicateCount > 0) message += (message ? ' ' : '') + `⚠️ Skipped ${duplicateCount} duplicate(s).`;
      if (!newRecords && !duplicateCount) message = `ℹ️ No changes detected.`;
      setImportStatus({ type: newRecords ? 'success' : 'info', message });

      onDataImported?.(mappedData);

      // Reset file input for next import
      setTimeout(() => {
        setFile(null);
        setPreview([]);
        setFullRows([]);
        setMappedData({ machines: [], molds: [], schedules: [], raw_materials: [], packing_materials: [], lines: [], maintenance_checklists: [], bom_masters: [], sfg_bom: [], fg_bom: [], local_bom: [], color_labels: [], party_names: [] });
        setHeaders([]);
        fileInputRef.current && (fileInputRef.current.value = '');
      }, 1000);
    } catch (err: any) {
      console.error('Import error:', err);
      const errorMessage = err?.message || err?.code || 'Unknown error occurred';
      setImportStatus({ 
        type: 'error', 
        message: `Error importing data: ${errorMessage}. Please check the format and try again.` 
      });
    } finally {
      setImporting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Template download (uses canonical headers)
  const downloadTemplate = () => {
    const headers = CANONICAL_HEADERS[dataType] || [];
    const sampleRows: any[] = (() => {
      switch (dataType) {
        case 'machines':
          return [
            ['JSW-1', 'IM', 'JSW', '280', 'J-280-ADS', '22182C929929/22182GH62H62', '2022-01-01', '2022-02-01', '6555 x 1764 x 2060', 'JSW J-280 ADS Series', '280', 'No', 'Active', 'Zone A', '2022-02-01', '—', 'Unit 1'],
            ['HAIT-1', 'IM', 'Haitian', '380', 'MA3800H/1280PRO', 'NA/202429038011428', '2024-01-01', '2024-05-15', '7383 x 1955 x 2157', 'Haitian MA3800H', '380', 'Yes', 'Active', 'Zone B', '2024-05-15', '—', 'Unit 1']
          ].map(r => {
            // pad to header length (19)
            while (r.length < headers.length) r.splice(6, 0, ''); // ensure CLM/Inj columns alignment
            return r;
          });
        case 'molds':
          return [
            ['001', 'Container Base 500ml', 'Injection Mold', 8, 30.5, 150, 120, 110, '400x300x200', 450, 'Make-A', 'Zone-01', 'Toolcraft', '2023-03-01', 'Unit 1'],
            ['002', 'Bottle Cap Standard', 'Injection Mold', 16, 25, 80, 70, 65, '200x120x80', 120, 'Make-B', 'Zone-02', 'Precision', '2023-06-01', 'Unit 1']
          ];
        case 'schedules':
          return [
            ['S001', '2025-06-22', 'Day', 'IMM-01', 'M001', '08:00', '12:00', 'Blue', 2400, 10, 50, 'John Doe', 'No', 'pending'],
            ['S002', '2025-06-22', 'Night', 'IMM-02', 'M002', '13:00', '18:00', 'Red', 3000, 12, 60, 'Jane Roe', 'No', 'pending']
          ];
        case 'raw_materials':
          return [
            ['1', 'PP', 'HP', 'HJ333MO', 'Borouge', '35', '0.90', '', '—', 'Unit 1'],
            ['2', 'PP', 'ICP', 'B120', 'IOCL', '20', '0.91', '', '—', 'Unit 1']
          ];
        case 'packing_materials':
          return [
            ['Boxes', 'Export', 'CTN-RO16', '150', '6555 x 1764 x 2060', '5-ply corrugated', 'Regular', 'Unit 1'],
            ['PolyBags', 'Standard', 'PB-500ML', '1000', '200 x 300 x 0.05', 'Food grade PE', 'Premium', 'Unit 1']
          ];  
        case 'lines':
          return [
            ['1', 'TOYO-1', 'WITT-1', 'Hoist-1', 'CONY-1', 'Active', 'Unit 1'],
            ['2', 'JSW-1', 'WITT-2', 'Hoist-2', 'CONY-2', 'Active', 'Unit 1']
          ];
        case 'maintenance_checklists':
          return [
            ['Daily', 'Machine Check', 'Check oil levels', 'High', 'Every 8 hours', 'Active'],
            ['Weekly', 'Safety Check', 'Inspect safety guards', 'Medium', 'Every Monday', 'Active']
          ];
        case 'bom_masters':
        case 'sfg_bom':
          return [
            [1, 'Sample SFG Item 1', 'SFG-001', 100, 25.5, 'Red', 20, 15, 10, 30, 20, 5],
            [2, 'Sample SFG Item 2', 'SFG-002', 50, 18.2, 'Blue', 25, 12, 8, 35, 15, 5],
            [3, 'Sample SFG Item 3', 'SFG-003', 75, 32.1, 'Green', 18, 20, 12, 25, 20, 5]
          ];

        case 'fg_bom':
          return [
            [1, 'FG-001', 'Party A', '500ml', 'SFG-001', 2, 'SFG-002', 1, 'CNT-001', 100, 'PB-500ML', 1000, 'BOPP-001', 1.20, 'BOPP-002', 0.80],
            [2, 'FG-002', 'Party B', '1L', 'SFG-003', 3, 'SFG-001', 1, 'CNT-002', 50, 'PB-1L', 500, 'BOPP-003', 1.50, 'BOPP-004', 0.90]
          ];

        case 'local_bom':
          return [
            [1, 'LOCAL-001', '250ml', 'SFG-001', 1, 'SFG-002', 0.5, 'CNT-003', 200, 'PB-250ML', 2000, 'BOPP-005', 25, 'BOPP-006', 15],
            [2, 'LOCAL-002', '100ml', 'SFG-003', 0.5, 'SFG-001', 0.25, 'CNT-004', 500, 'PB-100ML', 5000, 'BOPP-007', 10, 'BOPP-008', 5]
          ];
        case 'color_labels':
          return [];
        case 'party_names':
          return [];
        default:
          return [];
      }
    })();

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${dataType}_template.xlsx`);
  };

  // ----------------------------------------------------------------------------
  // Export all (uses canonical headers)
  const exportAllData = async () => {
    setLoading(true);
    try {
      const headers = CANONICAL_HEADERS[dataType];
      let data: any[] = [];

      switch (dataType) {
        case 'machines': {
          const rows = await machineAPI.getAll();
          data = rows.map(item => ([
            item.machine_id ?? '',
            item.category ?? item.type ?? '',
            item.make ?? '',
            item.capacity_tons ?? item.size ?? '',
            item.model ?? '',
            item.serial_no ?? '',
            item.clm_sr_no ?? '',
            item.inj_serial_no ?? '',
            item.mfg_date ?? '',
            item.install_date ?? '',
            item.dimensions ?? '',
            item.nameplate_details ?? '',
            item.capacity_tons ?? '',
            item.grinding_available ? 'Yes' : 'No',
            item.status ?? '',
            item.line ?? '',
            item.purchase_date ?? '',
            item.remarks ?? '',
            item.unit ?? ''
          ]));
          break;
        }
        case 'molds': {
          const rows = await moldAPI.getAll();
          data = rows.map(item => ([
            item.sr_no ?? '',
            item.mold_name ?? '',
            item.type ?? '',
            item.cavities ?? '',
            item.cycle_time ?? '',
            item.dwg_wt ?? '',
            item.std_wt ?? '',
            item.rp_wt ?? '',
            item.dimensions ?? '',
            item.mold_wt ?? '',
            item.hrc_make ?? '',
            item.hrc_zone ?? '',
            item.make ?? item.maker ?? '',
            item.start_date ?? '',
            item.unit ?? ''
          ]));
          break;
        }
        case 'schedules': {
          const rows = await scheduleAPI.getAll();
          data = rows.map(item => ([
            item.schedule_id ?? '',
            item.date ?? '',
            item.shift ?? '',
            item.machine_id ?? '',
            item.mold_id ?? '',
            item.start_time ?? '',
            item.end_time ?? '',
            item.color ?? '',
            item.expected_pieces ?? '',
            item.stacks_per_box ?? '',
            item.pieces_per_stack ?? '',
            item.created_by ?? '',
            item.is_done ? 'Yes' : 'No',
            item.approval_status ?? ''
          ]));
          break;
        }
        case 'raw_materials': {
          const rows = await rawMaterialAPI.getAll();
          data = rows.map((item: RawMaterial) => ([
            item.sl_no ?? '',
            item.category ?? '',
            item.type ?? '',
            item.grade ?? '',
            item.supplier ?? '',
            item.mfi ?? '',
            item.density ?? '',
            item.tds_image ? 'Yes' : 'No',
            item.remark ?? '',
            item.unit ?? ''
          ]));
          break;
        }
        case 'packing_materials': {
          const rows = await packingMaterialAPI.getAll();
          data = rows.map(item => ([
            item.category ?? '',
            item.type ?? '',
            item.item_code ?? '',
            item.pack_size ?? '',
            item.dimensions ?? '',
            item.technical_detail ?? '',
            item.brand ?? '',
            item.unit ?? ''
          ]));
          break;
        }
        case 'bom_masters':
        case 'sfg_bom': {
          const rows = await bomMasterAPI.getAll();
          data = rows.map(item => ([
            item.sl_no ?? 0, // Sl
            item.item_name ?? '', // Item Name
            item.sfg_code ?? '', // SFG-Code
            item.pcs ?? 0, // Pcs
            item.part_weight_gm_pcs ?? 0, // Part Wt (gm/pcs)
            item.colour ?? '', // Colour
            item.hp_percentage ?? 0, // HP %
            item.icp_percentage ?? 0, // ICP %
            item.rcp_percentage ?? 0, // RCP %
            item.ldpe_percentage ?? 0, // LDPE %
            item.gpps_percentage ?? 0, // GPPS %
            item.mb_percentage ?? 0  // MB %
          ]));
          break;
        }

        case 'color_labels': {
          const rows = await colorLabelAPI.getAll();
          data = rows.map((item) => ([
            item.sr_no ?? '', // Sr. No.
            item.color_label ?? '' // Color / Label
          ]));
          break;
        }
        case 'party_names': {
          const rows = await partyNameAPI.getAll();
          data = rows.map((item, index) => ([
            index + 1, // Sr. No.
            item.name ?? '' // Name
          ]));
          break;
        }
        case 'fg_bom': {
          const rows = await bomMasterAPI.getByCategory('FG');
          data = rows.map(item => ([
            item.sl_no ?? '',
            item.item_code ?? '',
            item.party_name ?? '',
            item.pack_size ?? '',
            item.sfg_1 ?? '',
            item.sfg_1_qty ?? '',
            item.sfg_2 ?? '',
            item.sfg_2_qty ?? '',
            item.cnt_code ?? '',
            item.cnt_qty ?? '',
            item.polybag_code ?? '',
            item.poly_qty ?? '',
            item.bopp_1 ?? '',
            item.qty_meter ?? '',
            item.bopp_2 ?? '',
            item.qty_meter_2 ?? ''
          ]));
          break;
        }

        case 'local_bom': {
          const rows = await bomMasterAPI.getByCategory('LOCAL');
          data = rows.map(item => ([
            item.sl_no ?? '',
            item.item_code ?? '',
            item.pack_size ?? '',
            item.sfg_1 ?? '',
            item.sfg_1_qty ?? '',
            item.sfg_2 ?? '',
            item.sfg_2_qty ?? '',
            item.cnt_code ?? '',
            item.cnt_qty ?? '',
            item.polybag_code ?? '',
            item.poly_qty ?? '',
            item.bopp_1 ?? '',
            item.qty_meter ?? '',
            item.bopp_2 ?? '',
            item.qty_meter_2 ?? ''
          ]));
          break;
        }
      }

      if (data.length === 0) {
        setImportStatus({ type: 'error', message: `No ${dataType.replace('_', ' ')} data found to export.` });
        return;
      }

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, dataType.charAt(0).toUpperCase() + dataType.slice(1));
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${dataType}_export_${timestamp}.xlsx`;
      saveAs(blob, filename);

      setImportStatus({ type: 'success', message: `✅ Exported ${data.length} ${dataType.replace('_', ' ')} record(s) to ${filename}` });
    } catch (err) {
      console.error('Export error:', err);
      setImportStatus({ type: 'error', message: 'Error exporting data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Render
  // For DPR, currentHeaders should be empty or use a different approach since DPR has a custom structure
  const currentHeaders = dataType === 'dpr' 
    ? [] 
    : (headers.length ? headers : CANONICAL_HEADERS[dataType] || []);
  
  // Check if data exists - DPR is an object, other types are arrays
  const hasData = dataType === 'dpr' 
    ? !!mappedData.dpr 
    : (Array.isArray(mappedData[dataType]) && mappedData[dataType].length > 0);
  
  const dataLength = dataType === 'dpr' 
    ? (mappedData.dpr ? 1 : 0)
    : (Array.isArray(mappedData[dataType]) ? mappedData[dataType].length : 0);
  
  // Debug: Log current state
  console.log('🔍 Current dataType:', dataType);
  console.log('🔍 Current mappedData:', mappedData);
  console.log('🔍 mappedData[dataType]:', mappedData[dataType]);
  if (dataType === 'dpr') {
    console.log('🔍 DPR data:', mappedData.dpr);
  } else {
    console.log('🔍 mappedData[dataType] length:', dataLength);
    if (dataLength > 0) {
      console.log('🔍 First mapped item:', mappedData[dataType][0]);
      console.log('🔍 First item qty_meter:', mappedData[dataType][0]?.qty_meter);
      console.log('🔍 First item qty_meter_2:', mappedData[dataType][0]?.qty_meter_2);
    }
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Excel Data Import</h2>
            <p className="text-gray-600">Upload Excel files to populate your database</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Type selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Data Type</label>
            <div className="flex flex-wrap gap-3">
              {(['machines', 'molds', 'schedules', 'raw_materials', 'packing_materials', 'lines', 'bom_masters', 'sfg_bom', 'fg_bom', 'local_bom', 'color_labels', 'party_names'] as DataType[]).map(type => (
                <button
                  key={type}
                  onClick={async () => {
                    console.log('🔍 Data type changed from', dataType, 'to', type);
                    setDataType(type);
                    setSortField(''); setSortDirection('asc');
                    // Re-map from full dataset (never from preview)
                    if (file && fullRows.length > 0) {
                      console.log('🔍 Re-mapping data for new type:', type);
                      await mapDataToFormat(fullRows, type);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg border ${
                    dataType === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type.replace('_', ' ').replace(/\b\w/g, s => s.toUpperCase())}
                </button>
              ))}
            </div>

            {/* Warn if mismatch between selection and detected headers */}
            {/* But only if the user hasn't manually selected a type (i.e., still using default 'machines') */}
            {headers.length > 0 && dataType !== inferredType && dataType === 'machines' && (
              <div className="mt-3 p-3 rounded-md border text-sm bg-yellow-50 text-yellow-900 border-yellow-200 flex items-start">
                <Info className="w-4 h-4 mr-2 mt-[2px]" />
                This file looks like "{inferredType.replace('_', ' ')}". You selected "{dataType.replace('_', ' ')}".
                Import may skip most rows. Switch types or upload a matching template.
              </div>
            )}
          </div>

          {/* Export + Template */}
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-900">Export All Data</h3>
                  <p className="text-sm text-green-700">Download all current {dataType.replace('_', ' ')} to edit offline</p>
                </div>
                <button
                  onClick={exportAllData}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {loading ? 'Exporting...' : 'Export All Data'}
                </button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">Download Template</h3>
                  <p className="text-sm text-blue-700">Get the Excel template with correct column headers</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Excel File</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                {!file ? (
                  <>
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Choose an Excel file to upload</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 mx-auto"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileSpreadsheet className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview([]);
                        setFullRows([]);
                        setAvailableSheets([]);
                        setSelectedSheets(new Set());
                        setSelectAllSheets(false);
                        setMappedData({ machines: [], molds: [], schedules: [], raw_materials: [], packing_materials: [], lines: [], maintenance_checklists: [], bom_masters: [], sfg_bom: [], fg_bom: [], local_bom: [], color_labels: [], party_names: [] });
                        fileInputRef.current && (fileInputRef.current.value = '');
                        setHeaders([]);
                        setImportStatus({ type: '', message: '' });
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sheet Selection UI - Show when file has multiple sheets */}
          {file && availableSheets.length > 1 && (
            <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-blue-900">Select Sheets to Import</h3>
                  <p className="text-sm text-blue-700">Choose which sheets to import from this workbook</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSelectAllToggle}
                    className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    {selectAllSheets ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={handleParseWithSelectedSheets}
                    disabled={selectedSheets.size === 0 || loading}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Parse Selected Sheets ({selectedSheets.size})
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
                {availableSheets.map((sheetName) => {
                  const isSelected = selectedSheets.has(sheetName);
                  const isSummary = /summary/i.test(sheetName);
                  const isMachine = /^\d+[ab]$/i.test(sheetName);
                  
                  return (
                    <label
                      key={sheetName}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-100 border-blue-500'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSheetToggle(sheetName)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 truncate">{sheetName}</span>
                          {isSummary && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Summary</span>
                          )}
                          {isMachine && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Machine</span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              
              {selectedSheets.size === 0 && (
                <p className="mt-3 text-sm text-red-600">
                  ⚠️ Please select at least one sheet to import.
                </p>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Parsing Excel file...</span>
            </div>
          )}

          {/* Preview */}
          {hasData && !loading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Data Preview</h3>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {dataType === 'dpr' 
                      ? 'DPR data loaded'
                      : `${dataLength} valid record(s) found`}
                  </span>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center px-3 py-1 bg-gray-100 text-gray-900 rounded text-sm hover:bg-gray-200"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </button>
                </div>
              </div>

              {showPreview && (
                <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {currentHeaders.map((header, index) => (
                          <th
                            key={`${header}-${index}`}
                            className="text-center py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSortChange(header)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{header}</span>
                              <div className="flex flex-col">
                                {sortField === header ? (
                                  sortDirection === 'asc'
                                    ? <ChevronUp className="w-3 h-3 text-blue-600" />
                                    : <ChevronDown className="w-3 h-3 text-blue-600" />
                                ) : (
                                  <div className="flex flex-col">
                                    <ChevronUp className="w-3 h-3 text-gray-300" />
                                    <ChevronDown className="w-3 h-3 text-gray-300" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataType === 'dpr' ? (
                        <tr>
                          <td colSpan={10} className="py-4 text-center text-gray-700">
                            <div className="space-y-2">
                              <p className="font-medium">DPR Data Imported Successfully</p>
                              {mappedData.dpr && (
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>Date: {mappedData.dpr.date}</p>
                                  <p>Shift: {mappedData.dpr.shift}</p>
                                  <p>Shift Incharge: {mappedData.dpr.shiftIncharge}</p>
                                  <p>Machines: {mappedData.dpr.machines?.length || 0}</p>
                                </div>
                              )}
                              <p className="text-xs text-gray-500 mt-2">Click "Import Data" to save this DPR.</p>
                            </div>
                          </td>
                        </tr>
                      ) : dataLength > 0 ? (
                        mappedData[dataType].slice(0, 5).map((row: any, idx: number) => {
                          // Debug: Log the row data being displayed
                          if (idx === 0) {
                            console.log('🔍 Preview table - First row data:', row);
                            console.log('🔍 Preview table - Current headers:', currentHeaders);
                            console.log('🔍 Preview table - Current dataType:', dataType);
                          }
                          return (
                            <tr key={idx} className="border-b border-gray-100">
                              {currentHeaders.map((header, index) => {
                                // Find the corresponding database field for this header
                                const mapping = TEMPLATE_MAPPINGS[dataType as keyof typeof TEMPLATE_MAPPINGS];
                                const dbField = mapping?.[header as keyof typeof mapping];
                                const value = dbField ? (row as any)[dbField] : null;
                                return (
                                  <td key={`${header}-${index}`} className="py-2 px-3 text-gray-600">
                                    {value !== null && value !== undefined ? String(value) : '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={currentHeaders.length} className="py-4 text-center text-gray-500">
                            No valid data to display
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {dataType !== 'dpr' && dataLength > 5 && (
                    <p className="text-center text-gray-500 mt-3">... and {dataLength - 5} more rows</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status */}
          {importStatus.message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              importStatus.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : importStatus.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {importStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-3" />
              ) : importStatus.type === 'error' ? (
                <AlertCircle className="w-5 h-5 mr-3" />
              ) : (
                <Info className="w-5 h-5 mr-3" />
              )}
              {importStatus.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!hasData || importing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </>
            )}
          </button>
      </div>
    </div>
  );
};

export default ExcelFileReader;