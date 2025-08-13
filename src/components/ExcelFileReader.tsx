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
  machineAPI, moldAPI, scheduleAPI, rawMaterialAPI, packingMaterialAPI,
  Machine, Mold, ScheduleJob, PackingMaterial
} from '../lib/supabase';

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

type DataType = 'machines' | 'molds' | 'schedules' | 'raw_materials' | 'packing_materials';

interface ImportData {
  machines: Machine[];
  molds: Mold[];
  schedules: ScheduleJob[];
  raw_materials: RawMaterial[];
  packing_materials: PackingMaterial[];
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
  }
} as const;

// score header overlap to guess type
const scoreHeaders = (headers: string[]): DataType => {
  const scores = (Object.keys(CANONICAL_HEADERS) as DataType[]).map(t => ({
    type: t,
    score: CANONICAL_HEADERS[t].reduce((acc, h) => acc + (headers.some(x => x.toLowerCase().trim() === h.toLowerCase().trim()) ? 1 : 0), 0)
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].type;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ExcelFileReader = ({ onDataImported, onClose, defaultDataType = 'machines' }: ExcelFileReaderProps) => {
  // Files
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    packing_materials: []
  });

  // UI/UX
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | '' | 'info', message: string }>({ type: '', message: '' });

  // Sorting
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Infer best data type from current headers
  const inferredType = useMemo(() => headers.length ? scoreHeaders(headers) : dataType, [headers, dataType]);

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
    await parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (file: File) => {
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length === 0) throw new Error('Empty sheet');

      const headerRow = (jsonData[0] as string[]).map(h => (h ?? '').toString());
      const dataRows = jsonData.slice(1);

      const rows: ExcelRow[] = dataRows.map(row => {
        const obj: ExcelRow = {};
        headerRow.forEach((h, i) => { obj[h] = row[i] ?? ''; });
        return obj;
      });

      setHeaders(headerRow);
      setFullRows(rows); // ✅ keep full dataset
      setPreview(rows.slice(0, 10));

      // First mapping uses inferred type, not current selection, to avoid garbage
      const typeToMap = scoreHeaders(headerRow);
      setDataType(typeToMap);
      await mapDataToFormat(rows, typeToMap);
      setImportStatus({ type: 'info', message: `Detected "${typeToMap.replace('_', ' ')}" format from headers.` });
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

  const mapDataToFormat = async (data: ExcelRow[], type: DataType) => {
    const mapping = TEMPLATE_MAPPINGS[type as keyof typeof TEMPLATE_MAPPINGS] as Record<string, string>;
    const availableColumns = Object.keys(data[0] || {});
    const flexibleMapping: Record<string, string> = {};

    // Build flexible header mapping
    Object.entries(mapping).forEach(([expected, dbField]) => {
      if (availableColumns.includes(expected)) flexibleMapping[expected] = dbField;
      else {
        const similar = availableColumns.find(c => c.toLowerCase().trim() === expected.toLowerCase().trim());
        if (similar) flexibleMapping[similar] = dbField;
      }
    });

    // Raw materials special
    if (type === 'raw_materials') return mapRawMaterialsData(data);
    if (type === 'packing_materials') return mapPackingMaterialsData(data);

    const mappedItems = data.map(row => {
      const mapped: any = {};

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

      // Common: unit default for these types
      if (['raw_materials', 'packing_materials', 'machines', 'molds'].includes(type)) {
        mapped.unit = mapped.unit || 'Unit 1';
      }

      return mapped;
    }).filter(item => {
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
      
        case 'schedules':
        default:
          return !!(item.schedule_id && String(item.schedule_id).trim());
      }
    });

    setMappedData(prev => ({ ...prev, [type]: mappedItems } as ImportData));
    setImportStatus({ type: '', message: '' });
  };

  // ----------------------------------------------------------------------------
  // Import
  const handleImport = async () => {
    if (mappedData[dataType].length === 0) {
      setImportStatus({ type: 'error', message: 'No valid data to import.' });
      return;
    }

    // Guard: if user forced a different type than detected & headers mismatch, warn
    if (headers.length && dataType !== inferredType) {
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
        setMappedData({ machines: [], molds: [], schedules: [], raw_materials: [], packing_materials: [] });
        setHeaders([]);
        fileInputRef.current && (fileInputRef.current.value = '');
      }, 1000);
    } catch (err) {
      console.error('Import error:', err);
      setImportStatus({ type: 'error', message: 'Error importing data. Please check the format and try again.' });
    } finally {
      setImporting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Template download (uses canonical headers)
  const downloadTemplate = () => {
    const headers = CANONICAL_HEADERS[dataType];
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
            item.zone ?? '',
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
  const currentHeaders = headers.length ? headers : CANONICAL_HEADERS[dataType];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
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
              {(['machines', 'molds', 'schedules', 'raw_materials', 'packing_materials'] as DataType[]).map(type => (
                <button
                  key={type}
                  onClick={async () => {
                    setDataType(type);
                    setSortField(''); setSortDirection('asc');
                    // Re-map from full dataset (never from preview)
                    if (file && fullRows.length > 0) {
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
            {headers.length > 0 && dataType !== inferredType && (
              <div className="mt-3 p-3 rounded-md border text-sm bg-yellow-50 text-yellow-900 border-yellow-200 flex items-start">
                <Info className="w-4 h-4 mr-2 mt-[2px]" />
                This file looks like “{inferredType.replace('_', ' ')}”. You selected “{dataType.replace('_', ' ')}”.
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
                        setMappedData({ machines: [], molds: [], schedules: [], raw_materials: [], packing_materials: [] });
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

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Parsing Excel file...</span>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && !loading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Data Preview</h3>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {mappedData[dataType].length} valid record(s) found
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
                        {currentHeaders.map(header => (
                          <th
                            key={header}
                            className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
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
                      {sortData(preview, sortField, sortDirection).slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          {currentHeaders.map(header => (
                            <td key={header} className="py-2 px-3 text-gray-600">
                              {row[header] ? String(row[header]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 5 && (
                    <p className="text-center text-gray-500 mt-3">... and {preview.length - 5} more rows</p>
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
            disabled={mappedData[dataType].length === 0 || importing}
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
    </div>
  );
};

export default ExcelFileReader;