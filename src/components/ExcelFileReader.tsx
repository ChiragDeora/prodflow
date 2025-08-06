'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, 
  X, Loader2, Table, Eye, Trash2, Plus, FileDown, Info,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { machineAPI, moldAPI, scheduleAPI, rawMaterialAPI, packingMaterialAPI, Machine, Mold, ScheduleJob, PackingMaterial } from '../lib/supabase';

// Raw Material interface
interface RawMaterial {
  id?: string; // Optional since database auto-generates UUID
  sl_no: number;
  category: string; // PP, PE, etc.
  type: string; // HP, ICP, RCP, LDPE, MB, etc.
  grade: string; // HJ333MO, 1750 MN, etc.
  supplier: string; // Borouge, IOCL, Basell, etc.
  mfi: number | null; // Melt Flow Index
  density: number | null; // Density in g/cm³
  tds_image?: string; // Base64 encoded TDS image or URL
  remark?: string; // Additional remarks
  created_at?: string;
  updated_at?: string;
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

const ExcelFileReader: React.FC<ExcelFileReaderProps> = ({ onDataImported, onClose, defaultDataType = 'machines' }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ExcelRow[]>([]);
  const [dataType, setDataType] = useState<DataType>(defaultDataType);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappedData, setMappedData] = useState<ImportData>({ machines: [], molds: [], schedules: [], raw_materials: [], packing_materials: [] });
  const [showPreview, setShowPreview] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sorting function
  const sortData = (data: ExcelRow[], field: string, direction: 'asc' | 'desc'): ExcelRow[] => {
    return [...data].sort((a, b) => {
      const aValue = a[field] || '';
      const bValue = b[field] || '';
      
      // Handle numeric values
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Handle string values
      const aStr = aValue.toString().toLowerCase();
      const bStr = bValue.toString().toLowerCase();
      
      if (direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  };

  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Template column mappings
  const templateMappings = {
    machines: {
      'Sr. No.': 'machine_id',
      'Sr. No': 'machine_id', // Fallback without period
      'Category': 'category',
      'Make': 'make',
      'Size': 'size',
      'Model': 'model',
      'Serial No.': 'serial_no',
      'Serial No': 'serial_no', // Fallback without period
      'CLM Sr. No.': 'clm_sr_no',
      'CLM Sr. No': 'clm_sr_no', // Fallback without period
      'Inj. Serial No.': 'inj_serial_no',
      'Inj. Serial No': 'inj_serial_no', // Fallback without period
      'Mfg Date': 'mfg_date',
      'Inst Date': 'install_date',
      'Dimensions (LxBxH)': 'dimensions',
      'Dimensions': 'dimensions', // Fallback without parentheses
      'Name Plate': 'nameplate_details',
      'Nameplate Details': 'nameplate_details',
      'Capacity (Tons)': 'capacity_tons',
      'Type': 'type', // Legacy support
      'Grinding Available': 'grinding_available',
      'Install Date': 'install_date', // Alternative for Inst Date
      'Status': 'status',
      'Zone': 'zone',
      'Purchase Date': 'purchase_date',
      'Remarks': 'remarks',
      'Unit': 'unit'
    },
    molds: {
      // Excel headers from the actual file
      'Sr.no.': 'sr_no',
      'Sr. no.': 'sr_no', // Alternative spelling
      'Mold name': 'mold_name',
      'Mold Name': 'mold_name', // Alternative capitalization
      'Type': 'type',
      'Cavity': 'cavities', // Map to cavities (plural) for database
      'Cavities': 'cavities', // Alternative mapping
      'Cycle Time': 'cycle_time',
      'Dwg Wt': 'dwg_wt',
      'Dwg Wt.': 'dwg_wt', // With period
      'Std. Wt.': 'std_wt',
      'RP wt.': 'rp_wt',
      'RP Wt.': 'rp_wt', // Alternative capitalization
      'Dimensions': 'dimensions',
      'Mold Wt.': 'mold_wt',
      'Mold Wt': 'mold_wt', // Without period
      'HRC Make': 'hrc_make',
      'HRC Zone': 'hrc_zone',
      'Make': 'make',
      'Start Date': 'start_date',
      'Unit': 'unit',
      // Legacy mappings for backward compatibility
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
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportStatus({ type: '', message: '' });
      setSortField('');
      setSortDirection('asc');
      parseExcelFile(selectedFile);
    }
  };

  // Parse Excel file
  const parseExcelFile = async (file: File) => {
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length > 0) {
        const headerRow = jsonData[0] as string[];
        const dataRows = jsonData.slice(1) as any[][];
        
        setHeaders(headerRow);
        
        // Convert to objects
        const rowObjects = dataRows.map(row => {
          const obj: ExcelRow = {};
          headerRow.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
        
        // Special preview handling for raw materials
        if (dataType === 'raw_materials') {
          const processedData = processRawMaterialsPreview(rowObjects);
          setPreview(processedData.slice(0, 10)); // Show first 10 processed rows
        } else {
          setPreview(rowObjects.slice(0, 10)); // Show first 10 rows for preview
        }
        
        mapDataToFormat(rowObjects, dataType);
      }
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setImportStatus({ type: 'error', message: 'Error parsing Excel file. Please check the format.' });
    }
    setLoading(false);
  };

  // Process raw materials preview to show only valid data rows
  const processRawMaterialsPreview = (data: ExcelRow[]): ExcelRow[] => {
    const processedData: ExcelRow[] = [];
    
    data.forEach(row => {
      const slValue = row['Sl.'] || row['Sl'] || row['SL'] || row['SL.'] || '';
      const typeValue = row['Type'] || '';
      
      // Check if this is a category header (contains parentheses and no numeric SL)
      const isCategoryHeader = typeValue && 
        (typeValue.includes('(') && typeValue.includes(')')) && 
        (!slValue || isNaN(Number(slValue)));
      
      // Only include valid data rows (not category headers)
      if (!isCategoryHeader && slValue && !isNaN(Number(slValue))) {
        processedData.push(row);
      }
    });
    
    return processedData;
  };

  // Map Excel data to our data format
  const mapDataToFormat = (data: ExcelRow[], type: DataType) => {
    const mapping = templateMappings[type];
    const availableColumns = Object.keys(data[0] || {});
    
    console.log('Mapping data for type:', type);
    console.log('Available columns in Excel:', availableColumns);
    console.log('Expected mapping:', mapping);
    
    // Special handling for raw materials with category headers
    if (type === 'raw_materials') {
      return mapRawMaterialsData(data, availableColumns);
    }
    
    // Special handling for packing materials
    if (type === 'packing_materials') {
      return mapPackingMaterialsData(data, availableColumns);
    }
    
    // Create a flexible mapping that handles column name variations
    const flexibleMapping: { [key: string]: string } = {};
    
    Object.entries(mapping).forEach(([expectedColumn, dbColumn]) => {
      // Try exact match first
      if (availableColumns.includes(expectedColumn)) {
        flexibleMapping[expectedColumn] = dbColumn;
      } else {
        // Try to find a similar column (case insensitive, trimmed)
        const similarColumn = availableColumns.find(col => 
          col.toLowerCase().trim() === expectedColumn.toLowerCase().trim()
        );
        if (similarColumn) {
          flexibleMapping[similarColumn] = dbColumn;
          console.log(`Using flexible mapping: "${similarColumn}" -> ${dbColumn} (expected: "${expectedColumn}")`);
        }
      }
    });
    
    console.log('Final mapping to use:', flexibleMapping);
    
    const mappedItems = data.map(row => {
      const mapped: any = {};
      
      Object.entries(flexibleMapping).forEach(([excelColumn, dbColumn]) => {
        let value = row[excelColumn];
        
        // Debug logging for each mapping
        if (row === data[0]) { // Only log for first row to avoid spam
          console.log(`Mapping: ${excelColumn} -> ${dbColumn}, value:`, value);
        }
        
        // Type conversions
        if (type === 'machines') {
          if (dbColumn === 'size' || dbColumn === 'capacity_tons') value = parseInt(value) || 0;
          if (dbColumn === 'grinding_available') value = value === true || value === 'true' || value === 'TRUE' || value === 1;
          
          // Convert Excel dates to ISO format for date fields
          if ((dbColumn === 'mfg_date' || dbColumn === 'install_date') && value) {
            if (typeof value === 'number') {
              try {
                const date = XLSX.SSF.parse_date_code(value);
                value = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
              } catch (error) {
                console.warn(`Failed to parse Excel date ${value} for field ${dbColumn}:`, error);
                value = null; // Set to null if parsing fails
              }
            } else if (typeof value === 'string') {
              // If it's already a string, try to parse it as a date
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  value = date.toISOString().split('T')[0];
                }
              } catch (error) {
                console.warn(`Failed to parse date string ${value} for field ${dbColumn}:`, error);
                value = null;
              }
            }
          }
        }
        
        if (type === 'molds') {
          // Handle numeric fields - convert empty strings to null
          if (['cavity', 'cycle_time', 'dwg_wt', 'std_wt', 'rp_wt', 'mold_wt', 'st_wt'].includes(dbColumn)) {
            if (value === '' || value === null || value === undefined) {
              value = null;
            } else {
              value = parseFloat(value) || null;
            }
          }
          
          // Handle sr_no as string (not numeric)
          if (dbColumn === 'sr_no') {
            if (value === '' || value === null || value === undefined) {
              value = null;
            } else {
              // Keep sr_no as string, don't convert to number
              value = value.toString();
            }
          }
          
          // Handle integer fields
          if (dbColumn === 'cavities') {
            if (value === '' || value === null || value === undefined) {
              value = 1; // Default to 1 cavity since it's NOT NULL
            } else {
              value = parseInt(value) || 1;
            }
          }
          
          // Handle date fields - convert empty strings to null
          if (['purchase_date', 'start_date'].includes(dbColumn)) {
            if (value === '' || value === null || value === undefined) {
              value = null;
            } else if (typeof value === 'number') {
              // Convert Excel date number to ISO date string
              try {
                const date = XLSX.SSF.parse_date_code(value);
                value = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
              } catch (error) {
                console.warn(`Failed to parse Excel date ${value} for field ${dbColumn}:`, error);
                value = null;
              }
            } else if (typeof value === 'string') {
              // If it's already a string, try to parse it as a date
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  value = date.toISOString().split('T')[0];
                } else {
                  value = null;
                }
              } catch (error) {
                console.warn(`Failed to parse date string ${value} for field ${dbColumn}:`, error);
                value = null;
              }
            }
          }
          
          if (dbColumn === 'compatible_machines') {
            value = typeof value === 'string' ? value.split(',').map(s => s.trim()) : [];
          }
        }
        
        if (type === 'schedules') {
          if (dbColumn === 'expected_pieces' || dbColumn === 'stacks_per_box' || dbColumn === 'pieces_per_stack') {
            value = parseInt(value) || 0;
          }
          if (dbColumn === 'is_done') value = value === true || value === 'true' || value === 'TRUE' || value === 1;
          if (dbColumn === 'date' && value) {
            // Convert Excel date to ISO format
            if (typeof value === 'number') {
              const date = XLSX.SSF.parse_date_code(value);
              value = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            }
          }
        }
        
        mapped[dbColumn] = value;
      });
      
      // Set default values
      if (type === 'schedules') {
        mapped.done_timestamp = null;
        mapped.approved_by = null;
        mapped.approval_status = mapped.approval_status || 'pending';
      }
      
              // Set default values for machines
        if (type === 'machines') {
          // Handle serial number parsing based on category
          if (mapped.serial_no && typeof mapped.serial_no === 'string') {
            if (mapped.category === 'IM') {
              // For IM category: Parse CLM/Inj format
              const serialParts = mapped.serial_no.split('/');
              if (serialParts.length === 2) {
                // Format: "CLM_SERIAL/INJ_SERIAL"
                mapped.clm_sr_no = serialParts[0].trim();
                mapped.inj_serial_no = serialParts[1].trim();
              } else {
                // Single serial number for IM - treat as CLM serial
                mapped.clm_sr_no = mapped.serial_no.trim();
                mapped.inj_serial_no = '';
              }
            } else {
              // For non-IM categories (Robot, Aux, Utility): Single serial number
              mapped.clm_sr_no = mapped.serial_no.trim();
              mapped.inj_serial_no = '';
            }
          }
          
          // Handle category field (prefer category over type)
          if (mapped.category) {
            mapped.type = mapped.category;
          } else if (!mapped.type) {
            mapped.type = 'Injection Molding Machine'; // Default fallback
          }
          
          // Set default values
          mapped.capacity_tons = mapped.capacity_tons || mapped.size || 0;
          mapped.grinding_available = mapped.grinding_available || false;
          mapped.install_date = mapped.install_date || new Date().toISOString().split('T')[0];
          mapped.status = mapped.status || 'Active';
          mapped.zone = mapped.zone || 'Zone A';
          
          // Set purchase_date to install_date if available, otherwise use current date
          mapped.purchase_date = mapped.install_date || new Date().toISOString().split('T')[0];
          
          // Set default unit
          mapped.unit = mapped.unit || 'Unit 1';
          
          // Debug logging for date processing
          if (type === 'machines') {
            console.log(`Machine ${mapped.machine_id}: mfg_date=${mapped.mfg_date}, purchase_date=${mapped.purchase_date}, install_date=${mapped.install_date}, category=${mapped.category}, type=${mapped.type}`);
          }
          mapped.remarks = mapped.remarks || '';
        }
      
      // Set default values for molds
      if (type === 'molds') {
        // Generate mold_id from sr_no if available, otherwise use mold_name
        if (mapped.sr_no && !mapped.mold_id) {
          mapped.mold_id = `MOLD-${mapped.sr_no}`;
        } else if (mapped.mold_name && !mapped.mold_id) {
          mapped.mold_id = mapped.mold_name.replace(/\s+/g, '-').toUpperCase();
        }
        

        
        mapped.purchase_date = mapped.purchase_date || new Date().toISOString().split('T')[0];
        mapped.compatible_machines = mapped.compatible_machines || [];
        mapped.maker = mapped.maker || mapped.make || 'Unknown';
        
        // Set default unit
        mapped.unit = mapped.unit || 'Unit 1';
      }
      
      // Set default values for all types
      if ((type as DataType) === 'raw_materials' || (type as DataType) === 'packing_materials' || (type as DataType) === 'machines' || (type as DataType) === 'molds') {
        mapped.unit = mapped.unit || 'Unit 1';
      }
      
      return mapped;
    }).filter(item => {
      // Filter out empty rows - be more lenient with validation
      let requiredField: string;
      let hasRequiredField: boolean;
      
      switch (type as DataType) {
        case 'machines':
          requiredField = 'machine_id';
          hasRequiredField = item[requiredField] && item[requiredField].toString().trim() !== '';
          break;
        case 'molds':
          // For molds, check for either sr_no (new format) or mold_id (legacy format)
          requiredField = 'sr_no';
          hasRequiredField = (item[requiredField] && item[requiredField].toString().trim() !== '') ||
                            (item['mold_id'] && item['mold_id'].toString().trim() !== '') ||
                            (item['mold_name'] && item['mold_name'].toString().trim() !== '');
          break;
        case 'raw_materials':
          requiredField = 'sl_no';
          hasRequiredField = item[requiredField] && item[requiredField].toString().trim() !== '';
          break;
        case 'packing_materials':
          requiredField = 'item_code';
          hasRequiredField = item[requiredField] && item[requiredField].toString().trim() !== '';
          break;
        default:
          requiredField = 'schedule_id';
          hasRequiredField = item[requiredField] && item[requiredField].toString().trim() !== '';
          break;
      }
      
      // Debug logging
      if (!hasRequiredField) {
        console.log('Filtered out item:', item, 'Missing required field for type:', type);
      }
      
      return hasRequiredField;
    });
    
    console.log(`Mapped ${mappedItems.length} items for ${type}:`, mappedItems);
    
    setMappedData(prev => ({
      ...prev,
      [type]: mappedItems
    }));
  };

  // Special function to handle raw materials with category headers
  const mapRawMaterialsData = (data: ExcelRow[], availableColumns: string[]) => {
    console.log('Processing raw materials data with category detection...');
    
    const mappedItems: RawMaterial[] = [];
    let currentCategory = 'PP'; // Default category
    
    data.forEach((row, index) => {
      const slValue = row['Sl.'] || row['Sl'] || row['SL'] || row['SL.'] || '';
      const categoryValue = row['Category'] || currentCategory;
      const typeValue = row['Type'] || '';
      const gradeValue = row['Grade'] || '';
      const supplierValue = row['Supplier'] || '';
      const mfiValue = row['MFI'] || '';
      const densityValue = row['Density'] || '';
      const tdsValue = row['TDS Attached'] || '';
      const remarkValue = row['Remark'] || '';
      
      // Check if this is a category header (contains parentheses and no numeric SL)
      const isCategoryHeader = typeValue && 
        (typeValue.includes('(') && typeValue.includes(')')) && 
        (!slValue || isNaN(Number(slValue)));
      
      if (isCategoryHeader) {
        // This is a category header like "Homopolymer (HP)"
        currentCategory = typeValue;
        console.log(`Found category: ${currentCategory}`);
        return; // Skip category headers in final data
      }
      
      // Check if this is a valid data row (has SL number and type)
      const hasValidSl = slValue && !isNaN(Number(slValue));
      const hasValidType = typeValue && typeValue.trim() !== '';
      
      if (hasValidSl && hasValidType) {
        const mapped: RawMaterial = {
          sl_no: Number(slValue),
          category: categoryValue,
          type: typeValue.trim(),
          grade: gradeValue,
          supplier: supplierValue,
          mfi: mfiValue ? Number(mfiValue) : null,
          density: densityValue ? Number(densityValue) : null,
          tds_image: tdsValue || undefined,
          remark: remarkValue || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        mappedItems.push(mapped);
        console.log(`Mapped raw material: ${mapped.category}-${mapped.type} - ${mapped.grade}`);
      } else {
        console.log(`Skipping invalid row:`, row);
      }
    });
    
    console.log(`Mapped ${mappedItems.length} raw materials items:`, mappedItems);
    
    setMappedData(prev => ({
      ...prev,
      raw_materials: mappedItems
    }));
  };

  // Special function to handle packing materials
  const mapPackingMaterialsData = (data: ExcelRow[], availableColumns: string[]) => {
    console.log('Processing packing materials data...');
    console.log('Available columns:', availableColumns);
    
    const mappedItems: PackingMaterial[] = [];
    
    data.forEach((row, index) => {
      console.log(`Processing row ${index}:`, row);
      
      const categoryValue = row['Category'] || '';
      const typeValue = row['Type'] || '';
      const itemCodeValue = row['Item Code'] || row['ItemCode'] || row['Item code'] || row['item_code'] || row['Item Code.'] || '';
      const packSizeValue = row['Pack Size'] || row['PackSize'] || '';
      const dimensionsValue = row['Dimensions'] || '';
      const technicalDetailValue = row['Technical Detail'] || row['TechnicalDetail'] || '';
      const brandValue = row['Brand'] || '';
      
      console.log(`Row ${index} values:`, {
        category: categoryValue,
        type: typeValue,
        itemCode: itemCodeValue,
        packSize: packSizeValue,
        dimensions: dimensionsValue,
        technicalDetail: technicalDetailValue,
        brand: brandValue
      });
      console.log(`Row ${index} raw data:`, row);
      
      // Check if row has any meaningful data (not just "-" or empty)
      const hasAnyValue = [categoryValue, typeValue, itemCodeValue, packSizeValue, brandValue].some(
        value => value && value.trim() !== '' && value.trim() !== '-'
      );
      
      // Accept any row that has at least one meaningful value
      if (hasAnyValue) {
        // Generate a meaningful item code if none provided
        let finalItemCode = itemCodeValue.trim();
        if (!finalItemCode) {
          // Try to create a meaningful code from category and type
          const categoryPrefix = categoryValue.trim().substring(0, 3).toUpperCase();
          const typePrefix = typeValue.trim().substring(0, 2).toUpperCase();
          if (categoryPrefix && typePrefix) {
            finalItemCode = `${categoryPrefix}-${typePrefix}-${index + 1}`;
          } else {
            finalItemCode = `ITEM-${index + 1}`;
          }
        }
        
        const mapped: PackingMaterial = {
          category: categoryValue.trim() || 'Unknown',
          type: typeValue.trim() || 'Unknown',
          item_code: finalItemCode,
          pack_size: packSizeValue || '-',
          dimensions: dimensionsValue || '-',
          technical_detail: technicalDetailValue || '-',
          brand: brandValue || '-',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        mappedItems.push(mapped);
        console.log(`✅ Mapped packing material: ${mapped.category}-${mapped.type} - ${mapped.item_code}`);
      } else {
        console.log(`❌ Skipping empty row ${index}:`, row);
      }
    });
    
    console.log(`Mapped ${mappedItems.length} packing materials items:`, mappedItems);
    
    setMappedData(prev => ({
      ...prev,
      packing_materials: mappedItems
    }));
  };

  // Import data to Supabase
  const handleImport = async () => {
    if (mappedData[dataType].length === 0) {
      setImportStatus({ type: 'error', message: 'No valid data to import' });
      return;
    }

    setImporting(true);
    try {
      let result;
      let newRecords: any[] = [];
      let duplicateCount = 0;
      
      // Check for duplicates and filter new records
      switch (dataType) {
        case 'machines':
          const existingMachines = await machineAPI.getAll();
          const existingIds = existingMachines.map(m => m.machine_id);
          const existingCombos = existingMachines.map(m => 
            `${m.make || ''}-${m.model || ''}-${m.inj_serial_no || ''}`
          );
          
          newRecords = mappedData.machines.filter(machine => {
            const isDuplicateById = existingIds.includes(machine.machine_id);
            
            // Only check combo for machines with meaningful data (not empty fields)
            const hasMeaningfulData = machine.make && machine.model && machine.inj_serial_no;
            const machineCombo = `${machine.make || ''}-${machine.model || ''}-${machine.inj_serial_no || ''}`;
            const isDuplicateByCombo = hasMeaningfulData && existingCombos.includes(machineCombo);
            
            console.log(`Checking machine ${machine.machine_id}:`);
            console.log(`  - Machine combo: "${machineCombo}"`);
            console.log(`  - Has meaningful data: ${hasMeaningfulData}`);
            console.log(`  - Duplicate by ID: ${isDuplicateById}`);
            console.log(`  - Duplicate by combo: ${isDuplicateByCombo}`);
            
            if (isDuplicateById) {
              duplicateCount++;
              console.log(`❌ Skipping duplicate machine: ${machine.machine_id} - ID already exists`);
              return false;
            }
            
            if (isDuplicateByCombo) {
              duplicateCount++;
              console.log(`❌ Skipping duplicate machine: ${machine.machine_id} - Combo already exists`);
              return false;
            }
            
            console.log(`✅ Will import machine: ${machine.machine_id}`);
            return true;
          });
          
          if (newRecords.length > 0) {
            result = await machineAPI.bulkCreate(newRecords);
          } else {
            result = [];
          }
          break;
          
        case 'molds':
          const existingMolds = await moldAPI.getAll();
          const existingMoldIds = existingMolds.map(m => m.mold_id);
          
          newRecords = mappedData.molds.filter(mold => {
            if (existingMoldIds.includes(mold.mold_id)) {
              duplicateCount++;
              console.log(`Skipping duplicate mold: ${mold.mold_id}`);
              return false;
            }
            return true;
          });
          
          if (newRecords.length > 0) {
            console.log('About to send mold data to database:', newRecords);
            result = await moldAPI.bulkCreate(newRecords);
          } else {
            result = [];
          }
          break;
          
        case 'schedules':
          const existingSchedules = await scheduleAPI.getAll();
          const existingScheduleCombos = existingSchedules.map(s => 
            `${s.machine_id}-${s.mold_id}-${s.start_time}`
          );
          
          newRecords = mappedData.schedules.filter(schedule => {
            const combo = `${schedule.machine_id}-${schedule.mold_id}-${schedule.start_time}`;
            if (existingScheduleCombos.includes(combo)) {
              duplicateCount++;
              console.log(`Skipping duplicate schedule: ${combo}`);
              return false;
            }
            return true;
          });
          
          if (newRecords.length > 0) {
            result = await scheduleAPI.bulkCreate(newRecords);
          } else {
            result = [];
          }
          break;

        case 'raw_materials':
          const existingRawMaterials = await rawMaterialAPI.getAll();
          const existingRawMaterialCombos = existingRawMaterials.map((rm: RawMaterial) => 
            `${rm.type}-${rm.grade}-${rm.supplier}` // Use type-grade-supplier combo for uniqueness
          );
          
          newRecords = mappedData.raw_materials.filter(rawMaterial => {
            const combo = `${rawMaterial.type}-${rawMaterial.grade}-${rawMaterial.supplier}`;
            if (existingRawMaterialCombos.includes(combo)) {
              duplicateCount++;
              console.log(`Skipping duplicate raw material: ${rawMaterial.type} - ${rawMaterial.grade} - ${rawMaterial.supplier}`);
              return false;
            }
            return true;
          });
          
          if (newRecords.length > 0) {
            try {
              result = await rawMaterialAPI.bulkCreate(newRecords);
              console.log(`Successfully imported ${newRecords.length} raw materials`);
            } catch (error) {
              console.error('Error importing raw materials:', error);
              // If there are still duplicates, try importing one by one
              const successfulImports: RawMaterial[] = [];
              for (const record of newRecords) {
                try {
                  const created = await rawMaterialAPI.create(record);
                  if (created) {
                    successfulImports.push(created);
                  }
                } catch (createError) {
                  console.log(`Failed to import: ${record.type} - ${record.grade} - ${record.supplier}`, createError);
                  duplicateCount++;
                }
              }
              result = successfulImports;
              console.log(`Imported ${successfulImports.length} out of ${newRecords.length} raw materials`);
            }
          } else {
            result = [];
          }
          break;

        case 'packing_materials':
          const existingPackingMaterials = await packingMaterialAPI.getAll();
          const existingPackingMaterialItemCodes = existingPackingMaterials.map(p => p.item_code);
          
          newRecords = mappedData.packing_materials.filter(packingMaterial => {
            if (existingPackingMaterialItemCodes.includes(packingMaterial.item_code)) {
              duplicateCount++;
              console.log(`Skipping duplicate packing material: ${packingMaterial.item_code}`);
              return false;
            }
            console.log(`Will import packing material: ${packingMaterial.item_code}`);
            return true;
          });
          
          if (newRecords.length > 0) {
            result = await packingMaterialAPI.bulkCreate(newRecords);
          } else {
            result = [];
          }
          break;
      }
      
      // Show detailed import summary
      let message = '';
      const totalRecords = mappedData[dataType].length;
      
      if (newRecords.length > 0) {
        message = `✅ Successfully imported ${newRecords.length} new ${dataType} records!`;
      }
      if (duplicateCount > 0) {
        message += newRecords.length > 0 ? 
          `\n⚠️ Skipped ${duplicateCount} duplicate records.` :
          `ℹ️ No new records imported. All ${duplicateCount} records already exist.`;
      }
      if (totalRecords === 0) {
        message = 'No valid records found in the Excel file.';
      }
      
      setImportStatus({ 
        type: newRecords.length > 0 ? 'success' : '', 
        message: message
      });
      
      // Callback to parent component
      if (onDataImported) {
        onDataImported(mappedData);
      }
      
      // Clear the form
      setTimeout(() => {
        setFile(null);
        setPreview([]);
        setMappedData({ machines: [], molds: [], schedules: [], raw_materials: [], packing_materials: [] });
        setHeaders([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
      
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({ type: 'error', message: 'Error importing data. Please check the format and try again.' });
    }
    setImporting(false);
  };

  // Download template
  const downloadTemplate = () => {
    let headers: string[] = [];
    
    if (dataType === 'machines') {
      // Comprehensive machine master headers
      headers = [
        'Sr. No.',
        'Category',
        'Make',
        'Size',
        'Model',
        'Serial No.',
        'Mfg Date',
        'Inst Date',
        'Dimensions (LxBxH)',
        'Name Plate',
        'Status',
        'Actions'
      ];
    } else {
      const templateData = templateMappings[dataType];
      headers = Object.keys(templateData);
    }
    
    // Sample data
    let sampleRows: any[] = [];
    
    if (dataType === 'machines') {
      sampleRows = [
        ['JSW-1', 'IM', 'JSW', '280T', 'J-280-ADS', '22182C929929/22182GH62H62', '2022', 'Feb-22', '6555 x 1764 x 2060', 'JSW J-280 ADS Series', 'Active', ''],
        ['HAIT-1', 'IM', 'Haitain', '380T', 'MA3800H/1280PRO', 'NA/202429038011428', '2024', 'May-24', '7383 x 1955 x 2157', 'Haitain MA3800H Series', 'Active', ''],
        ['WITT-1', 'Robot', 'Wittmaan', 'P&P', 'W808-1543', '8EH0001543', '2022', 'Feb-22', '', 'Wittmaan W808 Series', 'Active', ''],
        ['SWTK-1', 'Robot', 'Switek', 'IML-S', 'SW833-19', '009642', '2023', 'Jun-23', '', 'Switek SW833 Series', 'Active', ''],
        ['CONY-1', 'Aux', 'Wittmaan', '', '', '', '', 'Feb-22', '', 'Wittmaan Conveyor', 'Active', '']
      ];
    } else if (dataType === 'molds') {
      sampleRows = [
        ['MOLD-001', 'Container Base 500ml', 'Injection Mold', 8, 30.5, 150.0, '01 Zone', 'Toolcraft Inc'],
        ['MOLD-002', 'Bottle Cap Standard', 'Injection Mold', 16, 25.0, 80.0, '02 Zone', 'Precision Molds']
      ];
    } else if (dataType === 'schedules') {
      sampleRows = [
        ['S001', '2025-06-22', 'Day', 'IMM-01', 'M001', '08:00', '12:00', 'Blue', 2400, 10, 50, 'John Doe', false, 'pending'],
        ['S002', '2025-06-22', 'Day', 'IMM-01', 'M003', '13:00', '18:00', 'Red', 3000, 12, 60, 'John Doe', false, 'pending']
      ];
    } else if (dataType === 'raw_materials') {
      sampleRows = [
        ['1', 'Resin', 'ABS', 'Supplier A', 100, 1.05],
        ['2', 'Hardener', 'Epoxy', 'Supplier B', 50, 1.20]
      ];
    } else if (dataType === 'packing_materials') {
      sampleRows = [
        ['Boxes', 'Export', 'CTN-Ro16', '150', '6555 x 1764 x 2060', 'Technical specifications for export boxes', 'Regular'],
        ['Boxes', 'Local', 'CTN-Ro16', '800', '7383 x 1955 x 2157', 'Technical specifications for local boxes', 'Gesa'],
        ['PolyBags', 'Standard', 'PB-500ml', '1000', '200 x 300 x 0.05', 'Food grade polyethylene bags', 'Premium']
      ];
    }
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `${dataType}_template.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
          {/* Data Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Data Type</label>
            <div className="flex space-x-4">
              {(['machines', 'molds', 'schedules', 'raw_materials', 'packing_materials'] as DataType[]).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setDataType(type);
                    setSortField('');
                    setSortDirection('asc');
                    if (file && preview.length > 0) {
                      mapDataToFormat(preview, type);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg border ${
                    dataType === type 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Template Download */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
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

          {/* File Upload */}
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
                        setMappedData({ machines: [], molds: [], schedules: [], raw_materials: [], packing_materials: [] });
                        if (fileInputRef.current) fileInputRef.current.value = '';
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
                    {mappedData[dataType].length} valid records found
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
                        {headers.map(header => (
                          <th 
                            key={header} 
                            className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSortChange(header)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{header}</span>
                              <div className="flex flex-col">
                                {sortField === header ? (
                                  sortDirection === 'asc' ? (
                                    <ChevronUp className="w-3 h-3 text-blue-600" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 text-blue-600" />
                                  )
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
                      {sortData(preview, sortField, sortDirection).slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          {headers.map(header => (
                            <td key={header} className="py-2 px-3 text-gray-600">
                              {row[header] ? row[header].toString() : '-'}
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

          {/* Status Messages */}
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