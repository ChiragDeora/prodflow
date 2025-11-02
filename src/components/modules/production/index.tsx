'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Factory, 
  Calendar, 
  BarChart3, 
  Settings, 
  Users, 
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  Upload,
  Download,
  Target,
  Zap,
  Award,
  Activity,
  TrendingDown,
  Minus
} from 'lucide-react';
import ExcelFileReader from '../../ExcelFileReader';

interface ProductionModuleProps {
  // Add any props if needed
}

// DPR Data Interface
interface DPRData {
  id: string;
  date: string;
  shift: string;
  shiftIncharge: string;
  machines: MachineData[];
  summary: SummaryData;
}

interface MachineData {
  machineNo: string;
  operatorName: string;
  currentProduction: ProductionRun;
  changeover: ProductionRun;
}

interface ProductionRun {
  product: string;
  cavity: number;
  targetCycle: number;
  targetRunTime: number;
  partWeight: number;
  actualPartWeight: number;
  actualCycle: number;
  targetQty: number;
  actualQty: number;
  okProdQty: number;
  okProdKgs: number;
  okProdPercent: number;
  rejKgs: number;
  runTime: number;
  downTime: number;
  stoppageReason: string;
  startTime: string;
  endTime: string;
  totalTime: number;
  mouldChange: string;
  remark: string;
}

interface SummaryData {
  targetQty: number;
  actualQty: number;
  okProdQty: number;
  okProdKgs: number;
  okProdPercent: number;
  rejKgs: number;
  runTime: number;
  downTime: number;
}

const ProductionModule: React.FC<ProductionModuleProps> = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [showExcelReader, setShowExcelReader] = useState(false);
  const [dprData, setDprData] = useState<DPRData[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Excel Import Handler - Handles 63 sheets structure
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      console.log('Importing Excel file:', file.name);
      
      // Read Excel file using XLSX - match ExcelFileReader approach
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { 
        type: 'array',
        cellDates: false,
        cellNF: false,
        cellText: true, // Enable to get formatted text values (e.g., "01-Aug-25" instead of serial number)
        cellFormula: false,
        cellStyles: false,
        cellHTML: false
      });

      console.log('📊 Excel sheets found:', workbook.SheetNames);
      console.log('📊 Total sheets:', workbook.SheetNames.length);

      // Find summary sheet only for extracting date, shift, and shift incharge
      const summarySheetName = workbook.SheetNames.find(name => 
        name.toLowerCase() === 'summary'
      ) || workbook.SheetNames.find(name => 
        name.toLowerCase().includes('summary')
      ) || workbook.SheetNames[0];
      
      console.log('📊 Using summary sheet for metadata:', summarySheetName);
      const summarySheet = workbook.Sheets[summarySheetName];
      
      // Group and parse machine sheets (1a, 1b, 2a, 2b, etc.)
      const machineSheets = workbook.SheetNames.filter(name => {
        const isMachineSheet = /^\d+[ab]$/i.test(name.trim());
        const isNotSummary = name.toLowerCase() !== 'summary' && !name.toLowerCase().includes('summary');
        return isMachineSheet && isNotSummary;
      });
      
      // Extract date and shift from summary sheet FIRST (before parsing machines)
      console.log('📅 Extracting date and shift from summary sheet...');
      const extractedDate = extractDateFromSheet(summarySheet);
      const extractedShift = extractShiftFromSheet(summarySheet);
      const shiftIncharge = extractShiftIncharge(summarySheet) || 'CHANDAN/DHIRAJ';
      
      console.log('📅 Extracted date:', extractedDate, '(original selected:', selectedDate, ')');
      console.log('📅 Extracted shift:', extractedShift, '(original selected:', selectedShift, ')');
      console.log('📅 Shift incharge:', shiftIncharge);

      // Use extracted date/shift if available, otherwise use selected
      const finalDate = extractedDate || selectedDate;
      const finalShift = (extractedShift as 'DAY' | 'NIGHT') || selectedShift;

      // Update date and shift pickers to match imported data
      setSelectedDate(finalDate);
      setSelectedShift(finalShift);
      
      console.log('📅 Final date being used:', finalDate);
      console.log('📅 Final shift being used:', finalShift);

      console.log('📊 Machine sheets found:', machineSheets.length, machineSheets.slice(0, 10));
      const machines = groupAndParseMachineSheets(machineSheets, workbook);
      console.log('📊 Parsed machines:', machines.length);

      // Always calculate summary from machine data (source of truth)
      const targetQty = machines.reduce((sum, m) => 
        sum + (m.currentProduction.targetQty || 0) + (m.changeover.targetQty || 0), 0);
      const actualQty = machines.reduce((sum, m) => 
        sum + (m.currentProduction.actualQty || 0) + (m.changeover.actualQty || 0), 0);
      const okProdQty = machines.reduce((sum, m) => 
        sum + (m.currentProduction.okProdQty || 0) + (m.changeover.okProdQty || 0), 0);
      const okProdKgs = machines.reduce((sum, m) => 
        sum + (m.currentProduction.okProdKgs || 0) + (m.changeover.okProdKgs || 0), 0);
      const rejKgs = machines.reduce((sum, m) => 
        sum + (m.currentProduction.rejKgs || 0) + (m.changeover.rejKgs || 0), 0);
      const runTime = machines.reduce((sum, m) => 
        sum + (m.currentProduction.runTime || 0) + (m.changeover.runTime || 0), 0);
      const downTime = machines.reduce((sum, m) => 
        sum + (m.currentProduction.downTime || 0) + (m.changeover.downTime || 0), 0);
      
      const finalSummary: SummaryData = {
        targetQty,
        actualQty,
        okProdQty,
        okProdKgs,
        okProdPercent: actualQty > 0 ? (okProdQty / actualQty * 100) : 0,
        rejKgs,
        runTime,
        downTime
      };

      console.log(`📊 Calculated summary from ${machines.length} machines:`);
      console.log(`📊 Target: ${targetQty.toLocaleString()}, Actual: ${actualQty.toLocaleString()}, OK: ${okProdQty.toLocaleString()}, OK Kgs: ${okProdKgs.toFixed(2)}`);

      const importedData: DPRData = {
        id: `${finalDate}-${finalShift}-${Date.now()}`,
        date: finalDate,
        shift: finalShift,
        shiftIncharge,
        machines,
        summary: finalSummary
      };

      // Validate that we actually got some data
      if (machines.length === 0) {
        throw new Error(`No machine data found in Excel file. Found ${machineSheets.length} machine sheets but could not parse any machines. Please check the sheet names match the pattern (1a, 1b, 2a, 2b, etc.)`);
      }

      // Check if any machines have actual data
      const machinesWithData = machines.filter(m => 
        m.currentProduction.product || m.currentProduction.targetQty > 0 || m.changeover.product || m.changeover.targetQty > 0
      );

      if (machinesWithData.length === 0) {
        console.warn('⚠️ No machines have any production data. This might indicate a parsing issue.');
      }

      // Check if data for this date+shift already exists and replace it
      setDprData(prev => {
        const filtered = prev.filter(dpr => !(dpr.date === finalDate && dpr.shift === finalShift));
        return [...filtered, importedData];
      });

      const successMessage = `Excel file imported successfully!\n\nImported:\n- ${machines.length} machines\n- ${machinesWithData.length} machines with data\n- Date: ${new Date(finalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\n- Shift: ${finalShift}\n- Summary calculated from machine data: Target=${targetQty.toLocaleString()}, Actual=${actualQty.toLocaleString()}, OK=${okProdQty.toLocaleString()}\n\nPlease check the browser console for detailed parsing logs.`;
      alert(successMessage);
    } catch (error) {
      console.error('❌ Error importing Excel file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Error importing Excel file:\n\n${errorMessage}\n\nPlease check:\n1. File has a "summary" sheet\n2. Machine sheets follow naming pattern (1a, 1b, 2a, 2b, etc.)\n3. Check browser console for detailed error logs`);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Helper function to extract date from summary sheet
  const extractDateFromSheet = (sheet: XLSX.WorkSheet): string | null => {
    if (!sheet) return null;
    
    // First, try to get formatted cell text (e.g., "01-Aug-25")
    const jsonDataFormatted = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
    
    // Also get raw values (might be date serial numbers)
    const jsonDataRaw = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    
    console.log('🔍 Extracting date from summary sheet...');
    console.log('📋 First 10 rows (formatted):', jsonDataFormatted.slice(0, 10));
    console.log('📋 First 10 rows (raw):', jsonDataRaw.slice(0, 10));
    
    // Search for date patterns in the sheet (more specific search)
    for (let i = 0; i < jsonDataFormatted.length && i < 30; i++) {
      const rowFormatted = jsonDataFormatted[i];
      const rowRaw = jsonDataRaw[i];
      if (!rowFormatted || !rowRaw) continue;
      
      for (let j = 0; j < rowFormatted.length && j < 30; j++) {
        const cellValue = String(rowFormatted[j] || '').trim();
        
        // Look for "DATE:" or "DATE:-" pattern (case insensitive, with optional hyphen)
        const dateLabelPattern = /^date\s*:?\s*-?$/i;
        if (dateLabelPattern.test(cellValue)) {
          console.log(`✅ Found DATE label at row ${i}, col ${j}: "${cellValue}"`);
          
          // Try to get both formatted and raw values from adjacent cell
          const cellIndex = j + 1;
          
          // Priority 1: Check cell immediately to the right (most common)
          if (cellIndex < rowFormatted.length) {
            const formattedValue = rowFormatted[cellIndex];
            const rawValue = rowRaw[cellIndex];
            
            console.log(`📅 Cell C${i+1}${String.fromCharCode(65 + cellIndex)} formatted: "${formattedValue}", raw: ${rawValue} (type: ${typeof rawValue})`);
            
            // Try formatted value first (e.g., "01-Aug-25" or "01/08/2025")
            if (formattedValue !== null && formattedValue !== undefined && formattedValue !== '') {
              const dateValue = parseExcelDate(formattedValue);
              if (dateValue) {
                console.log(`✅ Parsed date from formatted value: "${formattedValue}" -> "${dateValue}"`);
                return dateValue;
              }
            }
            
            // Try raw value (might be Excel date serial number or string)
            if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
              const dateValue = parseExcelDate(rawValue);
              if (dateValue) {
                console.log(`✅ Parsed date from raw value: ${rawValue} -> "${dateValue}"`);
                return dateValue;
              }
            }
          }
          
          // Priority 2: Check next row same column
          if (i + 1 < jsonDataFormatted.length && jsonDataFormatted[i + 1] && jsonDataRaw[i + 1]) {
            const formattedValue = jsonDataFormatted[i + 1][j];
            const rawValue = jsonDataRaw[i + 1][j];
            
            if (formattedValue !== null && formattedValue !== undefined && formattedValue !== '') {
              const dateValue = parseExcelDate(formattedValue);
              if (dateValue) {
                console.log(`✅ Found date in next row (formatted): "${formattedValue}" -> "${dateValue}"`);
                return dateValue;
              }
            }
            
            if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
              const dateValue = parseExcelDate(rawValue);
              if (dateValue) {
                console.log(`✅ Found date in next row (raw): ${rawValue} -> "${dateValue}"`);
                return dateValue;
              }
            }
          }
          
          console.log(`⚠️ Found DATE label but couldn't parse adjacent date values`);
        }
      }
    }
    
    console.log('⚠️ Could not find DATE label in summary sheet');
    return null;
  };

  // Helper function to parse Excel date value to YYYY-MM-DD format
  const parseExcelDate = (value: any): string | null => {
    if (!value && value !== 0) return null;
    
    console.log(`📅 parseExcelDate called with value:`, value, `type:`, typeof value);
    
    // If it's already a date object
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      const result = `${year}-${month}-${day}`;
      console.log(`✅ Parsed Date object to:`, result);
      return result;
    }
    
    // If it's a string, try to parse common date formats FIRST (before treating as number)
    const strValue = String(value).trim();
    
    // Try DD-MMM-YY or DD-MMM-YYYY FIRST (e.g., "01-Aug-25" or "01-Aug-2025")
    // This should match "01-Aug-25", "1-Aug-25", "01-Aug-2025", etc.
    const ddmmyyMatch = strValue.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{2,4})$/i);
    if (ddmmyyMatch) {
      const day = ddmmyyMatch[1].padStart(2, '0');
      const monthName = ddmmyyMatch[2];
      const yearStr = ddmmyyMatch[3];
      
      console.log(`📅 Matched DD-MMM-YY format: day=${day}, month=${monthName}, year=${yearStr}`);
      
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = monthNames.findIndex(m => monthName.toLowerCase().startsWith(m.toLowerCase()));
      if (monthIndex >= 0) {
        const month = String(monthIndex + 1).padStart(2, '0');
        let year = parseInt(yearStr);
        // For 2-digit years, assume 20XX for years 00-99 (so 25 = 2025, not 1925)
        if (year < 100) {
          year = 2000 + year; // Always interpret 2-digit years as 2000s (25 = 2025, not 1925)
        }
        const result = `${year}-${month}-${day}`;
        console.log(`✅ Parsed DD-MMM-YY format to:`, result);
        return result;
      }
      console.log(`⚠️ Could not match month name:`, monthName);
    }
    
    // Try DD/MM/YYYY or DD-MM-YYYY format (e.g., "01/08/2025" = 1st August 2025)
    // IMPORTANT: This must come before MM/DD/YYYY to prioritize DD/MM format
    const ddmmyyyyMatch = strValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, '0');
      const month = ddmmyyyyMatch[2].padStart(2, '0');
      const year = ddmmyyyyMatch[3];
      
      // Validate: month should be 01-12, day should be 01-31
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        const result = `${year}-${month}-${day}`;
        console.log(`✅ Parsed DD/MM/YYYY format: "${strValue}" -> "${result}"`);
        return result;
      }
    }
    
    // Try MM/DD/YYYY format as fallback (e.g., "08/01/2025" = August 1st 2025)
    const mmddyyyyMatch = strValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (mmddyyyyMatch) {
      const month = mmddyyyyMatch[1].padStart(2, '0');
      const day = mmddyyyyMatch[2].padStart(2, '0');
      const year = mmddyyyyMatch[3];
      
      // Only use this if the first value is <= 12 (could be month)
      // and second value is > 12 (definitely not a month)
      const firstNum = parseInt(month);
      const secondNum = parseInt(day);
      if (firstNum <= 12 && secondNum > 12) {
        const result = `${year}-${month}-${day}`;
        console.log(`✅ Parsed MM/DD/YYYY format (fallback): "${strValue}" -> "${result}"`);
        return result;
      }
    }
    
    // If it's a number (Excel date serial number) - only check if string parsing failed
    if (typeof value === 'number' && !isNaN(value)) {
      // Excel dates start from 1900-01-01, but Excel incorrectly treats 1900 as a leap year
      // Excel date serial: 1 = Jan 1, 1900
      // For modern dates (2025), serial numbers are around 45800+ (Aug 1, 2025 ≈ 45883)
      // If the number is very small (< 100), it's likely not a date serial
      if (value > 1 && value < 1000000) {
        // Excel date serial conversion:
        // Excel serial 1 = Jan 1, 1900
        // JavaScript Date epoch = Jan 1, 1970 (Unix epoch)
        // Excel serial for Jan 1, 1970 = 25569
        // Formula: Date = (ExcelSerial - 25569) * 86400000 milliseconds
        // But Excel incorrectly treats 1900 as a leap year (it wasn't), so for dates after Feb 29, 1900,
        // we subtract 1 from the serial number
        let adjustedSerial = value;
        if (value > 59) { // Feb 29, 1900 would be serial 60
          adjustedSerial = value - 1; // Account for Excel's incorrect leap year
        }
        const date = new Date((adjustedSerial - 25569) * 86400000);
        
        // Verify the date is reasonable (between 1900 and 2100)
        const year = date.getFullYear();
        if (year >= 1900 && year <= 2100) {
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const result = `${year}-${month}-${day}`;
          console.log(`✅ Parsed Excel serial number (${value}) to:`, result);
          return result;
        } else {
          console.log(`⚠️ Excel serial ${value} produced invalid year: ${year}`);
        }
      } else {
        console.log(`⚠️ Number ${value} is likely not a valid Excel date serial (should be 1-1000000)`);
      }
    }
    
    // Try YYYY-MM-DD format
    const yyyymmddMatch = strValue.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (yyyymmddMatch) {
      const year = yyyymmddMatch[1];
      const month = yyyymmddMatch[2].padStart(2, '0');
      const day = yyyymmddMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Try native Date parsing (as last resort - may have incorrect interpretations)
    const parsedDate = new Date(strValue);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return null;
  };

  // Helper function to extract shift (DAY/NIGHT) from summary sheet
  const extractShiftFromSheet = (sheet: XLSX.WorkSheet): string | null => {
    if (!sheet) return null;
    
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    
    console.log('🔍 Extracting shift from summary sheet...');
    
    // Search for shift patterns in the sheet
    for (let i = 0; i < jsonData.length && i < 30; i++) {
      const row = jsonData[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length && j < 30; j++) {
        const cellValue = String(row[j] || '').trim();
        const cellValueLower = cellValue.toLowerCase();
        
        // Look for "SHIFT" or "Shift" pattern (case insensitive)
        // Match "Shift", "SHIFT:", "Shift:", etc.
        if (cellValueLower.includes('shift')) {
          console.log(`✅ Found SHIFT label at row ${i}, col ${j}: "${cellValue}"`);
          
          // Priority 1: Check cell immediately to the right (most common)
          if (j + 1 < row.length && row[j + 1] !== null && row[j + 1] !== undefined && row[j + 1] !== '') {
            const shiftValue = String(row[j + 1]).trim().toUpperCase();
            if (shiftValue === 'DAY' || shiftValue === 'NIGHT') {
              console.log(`✅ Found shift in adjacent cell (right): "${row[j + 1]}" -> "${shiftValue}"`);
              return shiftValue;
            }
          }
          
          // Priority 2: Check next row same column
          if (i + 1 < jsonData.length && jsonData[i + 1] && jsonData[i + 1][j] !== null && jsonData[i + 1][j] !== undefined && jsonData[i + 1][j] !== '') {
            const shiftValue = String(jsonData[i + 1][j]).trim().toUpperCase();
            if (shiftValue === 'DAY' || shiftValue === 'NIGHT') {
              console.log(`✅ Found shift in next row: "${jsonData[i + 1][j]}" -> "${shiftValue}"`);
              return shiftValue;
            }
          }
          
          // Priority 3: Check cell two positions to the right
          if (j + 2 < row.length && row[j + 2] !== null && row[j + 2] !== undefined && row[j + 2] !== '') {
            const shiftValue = String(row[j + 2]).trim().toUpperCase();
            if (shiftValue === 'DAY' || shiftValue === 'NIGHT') {
              console.log(`✅ Found shift two cells to the right: "${row[j + 2]}" -> "${shiftValue}"`);
              return shiftValue;
            }
          }
          
          console.log(`⚠️ Found SHIFT label but couldn't find DAY/NIGHT in adjacent cells`);
        }
        
        // Check if cell directly contains DAY or NIGHT (as fallback)
        const upperValue = cellValue.toUpperCase();
        if (upperValue === 'DAY' || upperValue === 'NIGHT') {
          // Verify it's likely a shift value (check nearby cells for "shift" keyword)
          for (let checkRow = Math.max(0, i - 1); checkRow <= Math.min(jsonData.length - 1, i + 1); checkRow++) {
            for (let checkCol = Math.max(0, j - 2); checkCol <= Math.min(row.length - 1, j + 2); checkCol++) {
              const checkValue = String(jsonData[checkRow]?.[checkCol] || '').toLowerCase();
              if (checkValue.includes('shift')) {
                console.log(`✅ Found shift value "${upperValue}" near SHIFT label`);
                return upperValue;
              }
            }
          }
        }
      }
    }
    
    console.log('⚠️ Could not find SHIFT label in summary sheet');
    return null;
  };

  // Helper function to extract shift incharge from summary sheet
  const extractShiftIncharge = (sheet: XLSX.WorkSheet): string | null => {
    if (!sheet) return null;
    
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    for (let row = 0; row <= range.e.r && row < 20; row++) {
      for (let col = 0; col <= range.e.c && col < 20; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        if (cell && cell.v) {
          const cellValue = String(cell.v).toLowerCase();
          if (cellValue.includes('shift') && cellValue.includes('incharge')) {
            // Try to find value in adjacent cells
            const nextCell = sheet[XLSX.utils.encode_cell({ r: row, c: col + 1 })];
            if (nextCell && nextCell.v) {
              return String(nextCell.v).trim();
            }
          }
        }
      }
    }
    return null;
  };

  // Helper function to parse summary sheet
  const parseSummarySheet = (sheet: XLSX.WorkSheet, workbook: XLSX.WorkBook): SummaryData => {
    const defaultSummary: SummaryData = {
      targetQty: 0,
      actualQty: 0,
      okProdQty: 0,
      okProdKgs: 0,
      okProdPercent: 0,
      rejKgs: 0,
      runTime: 0,
      downTime: 0
    };

    if (!sheet) {
      console.log('⚠️ Summary sheet is null or undefined');
      return defaultSummary;
    }

    // Convert sheet to JSON array for easier parsing - use both raw and text
    const jsonDataRaw = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    const jsonDataText = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
    
    // Combine - prefer numbers from raw, strings from text
    const jsonData = jsonDataRaw.map((row, rowIdx) => 
      row.map((cell, colIdx) => {
        const textCell = jsonDataText[rowIdx]?.[colIdx];
        if (typeof cell === 'number') return cell;
        if (textCell !== undefined && textCell !== null && textCell !== '') return textCell;
        return cell;
      })
    );
    
    console.log('📊 Summary sheet data preview:', jsonData.slice(0, 10));
    
    // Try to find summary values by searching for headers and their corresponding values
    const summary: SummaryData = { ...defaultSummary };

    // Search for summary values - look in first 30 rows
    for (let i = 0; i < Math.min(30, jsonData.length); i++) {
      const row = jsonData[i] || [];
      for (let j = 0; j < row.length; j++) {
        const cellValue = String(row[j] || '').toLowerCase().trim();
        
        if (cellValue.includes('target') && cellValue.includes('qty')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.targetQty = value;
            console.log(`✅ Found targetQty: ${value}`);
          }
        } else if (cellValue.includes('actual') && cellValue.includes('qty') && !cellValue.includes('ok')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.actualQty = value;
            console.log(`✅ Found actualQty: ${value}`);
          }
        } else if (cellValue.includes('ok prod qty') || cellValue.includes('ok prod. qty')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.okProdQty = value;
            console.log(`✅ Found okProdQty: ${value}`);
          }
        } else if (cellValue.includes('ok prod') && (cellValue.includes('kg') || cellValue.includes('kgs')) && !cellValue.includes('%')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.okProdKgs = value;
            console.log(`✅ Found okProdKgs: ${value}`);
          }
        } else if (cellValue.includes('ok prod') && cellValue.includes('%')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.okProdPercent = value;
            console.log(`✅ Found okProdPercent: ${value}`);
          }
        } else if (cellValue.includes('rej') && (cellValue.includes('kg') || cellValue.includes('kgs'))) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null) {
            summary.rejKgs = value;
            console.log(`✅ Found rejKgs: ${value}`);
          }
        } else if (cellValue.includes('run time') && !cellValue.includes('down')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.runTime = value;
            console.log(`✅ Found runTime: ${value}`);
          }
        } else if (cellValue.includes('down time') || cellValue.includes('downtime')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null) {
            summary.downTime = value;
            console.log(`✅ Found downTime: ${value}`);
          }
        }
      }
    }

    console.log('📊 Parsed summary data:', summary);
    return summary;
  };

  // Helper to parse number value from adjacent cells
  const parseNumberValue = (data: any[][], row: number, col: number): number | null => {
    // Try right cell first
    if (col + 1 < data[row].length) {
      const value = data[row][col + 1];
      if (value !== null && value !== undefined && value !== '') {
        const num = parseFloat(String(value).replace(/,/g, ''));
        if (!isNaN(num)) return num;
      }
    }
    // Try below cell
    if (row + 1 < data.length && col < data[row + 1].length) {
      const value = data[row + 1][col];
      if (value !== null && value !== undefined && value !== '') {
        const num = parseFloat(String(value).replace(/,/g, ''));
        if (!isNaN(num)) return num;
      }
    }
    return null;
  };

  // Helper function to parse a single production run from sheet data
  // Understands: 2-row headers, merged cells, empty spacer rows, 4-row machine blocks
  const parseProductionRun = (sheetData: any[][], sheetName?: string): ProductionRun => {
    // Default empty production run
    const defaultRun: ProductionRun = {
      product: '',
      cavity: 0,
      targetCycle: 0,
      targetRunTime: 0,
      partWeight: 0,
      actualPartWeight: 0,
      actualCycle: 0,
      targetQty: 0,
      actualQty: 0,
      okProdQty: 0,
      okProdKgs: 0,
      okProdPercent: 0,
      rejKgs: 0,
      runTime: 0,
      downTime: 0,
      stoppageReason: '',
      startTime: '',
      endTime: '',
      totalTime: 0,
      mouldChange: '',
      remark: ''
    };

    if (!sheetData || sheetData.length === 0) {
      console.log(`⚠️ Sheet ${sheetName || 'unknown'} has no data`);
      return defaultRun;
    }

    console.log(`📄 Parsing sheet ${sheetName || 'unknown'}, total rows: ${sheetData.length}`);

    // STEP 1: Find the SECOND header row (the one with actual column names)
    // The first header row has parent headers like "Production Data", second row has "Target Qty (Nos)", etc.
    let headerRowIndex = -1;
    let headerRow: any[] = [];
    let firstHeaderRowIndex = -1;
    
    // Look for both header rows
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
      const row = sheetData[i] || [];
      if (row.length === 0) continue;
      
      const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
      
      // Skip title and metadata rows
      if (rowText.includes('daily production report') || 
          rowText.includes('date:-') || 
          rowText.includes('shift incharge')) {
        continue;
      }
      
      // Look for first header row (parent headers like "Production Data", "No of Shots")
      if (rowText.includes('production data') || rowText.includes('no of shots')) {
        firstHeaderRowIndex = i;
        console.log(`📄 Found first header row (parent headers) at index ${i}`);
        continue;
      }
      
      // Look for second header row (actual column names)
      // This row should have specific column headers in individual cells
      const headerKeywords = [
        'product', 'cavity', 'm/c no', 'm/c', 'machine no', 'machine', 'opt name', 'operator',
        'target qty', 'target', 'actual qty', 'actual', 
        'ok prod qty', 'ok prod', 'ok', 'production qty',
        'run time', 'runtime', 'down time', 'downtime', 'down',
        'trg cycle', 'target cycle', 'trg', 'act cycle', 'actual cycle', 'act',
        'part wt', 'part weight', 'weight',
        'start', 'end', 'time',
        'rej', 'rejection', 'remark', 'remarks',
        'mould', 'mold', 'change'
      ];
      
      let keywordMatches = 0;
      let distinctKeywords = new Set<string>();
      
      // Check each cell individually for header keywords
      for (let j = 0; j < row.length && j < 30; j++) {
        const cellText = String(row[j] || '').toLowerCase().trim();
        if (!cellText) continue;
        
        for (const keyword of headerKeywords) {
          if (cellText.includes(keyword)) {
            distinctKeywords.add(keyword);
          }
        }
      }
      
      keywordMatches = distinctKeywords.size;
      
      // If we found the first header row, the next row with headers is likely the second header row
      if (firstHeaderRowIndex >= 0 && i === firstHeaderRowIndex + 1) {
        // Second header row should have column headers - lower threshold since we know where it should be
        if (keywordMatches >= 3 && row.length >= 10) {
          headerRowIndex = i;
          headerRow = row;
          console.log(`✅ Found second header row (column headers) at index ${i} (${keywordMatches} headers, ${row.length} columns)`);
          console.log(`📄 Header row:`, row.slice(0, 15).map(c => String(c || '').substring(0, 25)));
          break;
        } else {
          console.log(`📄 Row ${i} is after first header row but doesn't have enough headers (${keywordMatches} keywords, ${row.length} columns)`);
          console.log(`📄 Row ${i} sample:`, row.slice(0, 10).map(c => String(c || '').substring(0, 30)));
        }
      } else if (firstHeaderRowIndex >= 0 && i > firstHeaderRowIndex + 1 && i <= firstHeaderRowIndex + 3) {
        // If row 6 didn't work, try rows 7-8 as fallback
        if (keywordMatches >= 4 && row.length >= 15) {
          headerRowIndex = i;
          headerRow = row;
          console.log(`✅ Found second header row (column headers) at index ${i} - fallback (${keywordMatches} headers, ${row.length} columns)`);
          console.log(`📄 Header row:`, row.slice(0, 15).map(c => String(c || '').substring(0, 25)));
          break;
        }
      } else if (firstHeaderRowIndex < 0) {
        // If we didn't find first header row, but this row has many headers, use it
        if (keywordMatches >= 6 && row.length >= 15) {
          headerRowIndex = i;
          headerRow = row;
          console.log(`✅ Found header row at index ${i} (${keywordMatches} headers, ${row.length} columns)`);
          console.log(`📄 Header row:`, row.slice(0, 15).map(c => String(c || '').substring(0, 25)));
          break;
        }
      }
    }

    if (headerRowIndex === -1 || headerRow.length === 0) {
      console.log(`⚠️ Could not find header row in sheet ${sheetName}`);
      console.log(`📄 First 10 rows for debugging:`);
      for (let i = 0; i < Math.min(10, sheetData.length); i++) {
        const row = sheetData[i] || [];
        console.log(`  Row ${i}:`, row.slice(0, 10).map(c => String(c || '').substring(0, 30)));
      }
      return defaultRun;
    }

    // STEP 2: Find the FIRST DATA ROW (first row with machine number like "IMM-01")
    // Data rows start after headers and contain machine numbers in first column
    // Skip empty spacer rows (row 2, 4 of each 4-row block)
    let dataRowIndex = -1;
    let dataRow: any[] = [];
    
    // Search for rows starting with machine number pattern (IMM-01, IMM-02, etc.)
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 15, sheetData.length); i++) {
      const candidateRow = sheetData[i] || [];
      if (candidateRow.length === 0) continue;
      
      const firstCell = String(candidateRow[0] || '').trim();
      
      // Check if this row starts with a machine number (IMM-01, IMM-1, etc.)
      // Also check if second cell might be empty (since M/c No. and Opt Name are merged)
      const isMachineRow = /^IMM-?\d+/i.test(firstCell);
      
      if (isMachineRow) {
        // This is a data row - first row of a machine's 4-row block
        dataRowIndex = i;
        dataRow = candidateRow;
        console.log(`✅ Found data row at index ${i} (machine: ${firstCell})`);
        console.log(`📄 Data row sample:`, candidateRow.slice(0, 15).map(c => {
          const val = String(c || '');
          return val.length > 20 ? val.substring(0, 20) + '...' : val;
        }));
        break;
      }
    }

    if (dataRowIndex === -1 || dataRow.length === 0) {
      console.log(`⚠️ No data row found after headers in sheet ${sheetName}`);
      console.log(`📄 Checked rows ${headerRowIndex + 1} to ${Math.min(headerRowIndex + 14, sheetData.length - 1)}`);
      console.log(`📄 Sample rows after header:`);
      for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 10, sheetData.length); i++) {
        const row = sheetData[i] || [];
        const firstCell = String(row[0] || '').trim();
        console.log(`  Row ${i}: [0]="${firstCell.substring(0, 20)}" ... (${row.filter(c => c !== null && c !== undefined && c !== '').length} non-empty)`);
      }
      return defaultRun;
    }

    console.log(`📄 Using data row at index ${dataRowIndex} for parsing`);

    // Helper to get column index by header name with fuzzy matching
    // Falls back to fixed column positions if headers not found (based on DPR structure)
    const getColIndex = (headerPatterns: string[]): number => {
      // First, try to find by header name
      for (let i = 0; i < headerRow.length; i++) {
        const cellValue = headerRow[i];
        if (!cellValue) continue;
        const header = String(cellValue).toLowerCase().trim();
        for (const pattern of headerPatterns) {
          const patternLower = pattern.toLowerCase();
          // Exact match or contains pattern
          if (header === patternLower || header.includes(patternLower)) {
            console.log(`✅ Found "${pattern}" at column ${i} (header: "${header}")`);
            return i;
          }
        }
      }
      
      // Fallback: Use fixed column positions based on DPR structure
      // Column mapping: 0=M/c No, 1=Opt Name, 2=Product, 3=Cavity, 4=Trg Cycle, 5=Trg Run Time,
      // 6=Part Wt, 7=Act Part Wt, 8=Act Cycle, 9=Start, 10=End, 11=Target Qty, 12=Actual Qty,
      // 13=Ok Prod Qty, 14=Ok Prod Kgs, 15=Ok Prod %, 16=Rej Kgs, 17=Run Time, 18=Down Time,
      // 19=Reason, 20=Start Time, 21=End Time, 22=Total Time, 23=Mould Change, 24=Remark
      const fixedPositions: Record<string, number> = {
        'product': 2,
        'cavity': 3,
        'trg cycle': 4, 'target cycle': 4, 'trg. cycle': 4,
        'trg run time': 5, 'target run time': 5, 'trg run': 5,
        'part wt': 6, 'part weight': 6, 'part wt.': 6, 'part wt (gm)': 6,
        'act part wt': 7, 'actual part weight': 7, 'act part wt.': 7, 'act part wt (gm)': 7,
        'act cycle': 8, 'actual cycle': 8, 'act cycle (sec)': 8,
        'start time': 9, 'start': 9,
        'end time': 10, 'end': 10,
        'target qty': 11, 'target quantity': 11, 'target qty (nos)': 11,
        'actual qty': 12, 'actual quantity': 12, 'actual qty (nos)': 12,
        'ok prod qty': 13, 'ok production qty': 13, 'ok prod qty (nos)': 13,
        'ok prod (kgs)': 14, 'ok prod': 14, 'ok production (kgs)': 14,
        'ok prod (%)': 15, 'ok prod %': 15, 'ok prod percent': 15,
        'rej (kgs)': 16, 'rej': 16, 'rejection (kgs)': 16,
        'run time (mins)': 17, 'run time': 17, 'run time (minutes)': 17,
        'down time (min)': 18, 'down time': 18, 'downtime': 18,
        'reason': 19, 'stoppage': 19, 'stoppage reason': 19,
        'total time (min)': 22, 'total time': 22,
        'mould change': 23, 'mold change': 23, 'mould': 23,
        'remark': 24, 'remarks': 24
      };
      
      // Try to match pattern to fixed position
      for (const pattern of headerPatterns) {
        const patternLower = pattern.toLowerCase().trim();
        // Check exact match first
        if (fixedPositions.hasOwnProperty(patternLower)) {
          const fixedPos = fixedPositions[patternLower];
          console.log(`✅ Using fixed position ${fixedPos} for "${pattern}" (header not found, using DPR structure fallback)`);
          return fixedPos;
        }
        // Also check if any fixed position key contains this pattern (for partial matches)
        for (const [key, pos] of Object.entries(fixedPositions)) {
          if (key.includes(patternLower) || patternLower.includes(key)) {
            console.log(`✅ Using fixed position ${pos} for "${pattern}" (matched with "${key}", using DPR structure fallback)`);
            return pos;
          }
        }
      }
      
      console.log(`⚠️ Could not find column for patterns: ${headerPatterns.join(', ')} (tried header matching and fixed positions)`);
      console.log(`📊 Available fixed positions:`, Object.keys(fixedPositions).slice(0, 10).join(', '), '...');
      return -1;
    };

    const getValue = (patterns: string[], defaultValue: any = ''): any => {
      const colIndex = getColIndex(patterns);
      if (colIndex < 0) return defaultValue;
      
      // Check the data row first
      let value = dataRow[colIndex];
      
      // If empty, check if this is a merged cell - look at next row (might be in row 2 of the 2-row block)
      // Merged cells like Product, Cavity, etc. span 2 rows, so value might be in row 1
      // But since we're already at row 1, if it's empty, check if it's in row 2 or if it's part of a larger merge
      if ((value === '' || value === null || value === undefined) && dataRowIndex + 1 < sheetData.length) {
        const nextRow = sheetData[dataRowIndex + 1] || [];
        if (nextRow[colIndex] !== undefined && nextRow[colIndex] !== null && nextRow[colIndex] !== '') {
          value = nextRow[colIndex];
          console.log(`📊 Found merged cell value for ${patterns[0]} in next row: ${value}`);
        }
      }
      
      // Return empty string if value is empty, otherwise return the value
      if (value === '' || value === null || value === undefined) {
        return defaultValue;
      }
      
      console.log(`📊 Extracted ${patterns[0]}: "${value}" (type: ${typeof value})`);
      return value;
    };

    const getNumberValue = (patterns: string[], defaultValue: number = 0): number => {
      const value = getValue(patterns, null);
      if (value === null || value === undefined || value === '') {
        return defaultValue;
      }
      
      if (typeof value === 'number') {
        return value;
      }
      
      if (typeof value === 'string') {
        // Remove commas, percentage signs, parentheses for negative numbers
        let cleaned = value.replace(/,/g, '').replace(/%/g, '').trim();
        // Handle values in parentheses (negative)
        if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
          cleaned = '-' + cleaned.slice(1, -1);
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? defaultValue : num;
      }
      
      return defaultValue;
    };

    const parsedData: ProductionRun = {
      product: String(getValue(['product'], '')),
      cavity: getNumberValue(['cavity'], 0),
      targetCycle: getNumberValue(['trg cycle', 'target cycle', 'trg. cycle'], 0),
      targetRunTime: getNumberValue(['trg run time', 'target run time', 'trg run'], 0),
      partWeight: getNumberValue(['part wt', 'part weight', 'part wt.', 'part wt (gm)'], 0),
      actualPartWeight: getNumberValue(['act part wt', 'actual part weight', 'act part wt.', 'act part wt (gm)'], 0),
      actualCycle: getNumberValue(['act cycle', 'actual cycle', 'act cycle (sec)'], 0),
      targetQty: getNumberValue(['target qty', 'target quantity', 'target qty (nos)'], 0),
      actualQty: getNumberValue(['actual qty', 'actual quantity', 'actual qty (nos)'], 0),
      okProdQty: getNumberValue(['ok prod qty', 'ok production qty', 'ok prod qty (nos)'], 0),
      okProdKgs: getNumberValue(['ok prod (kgs)', 'ok prod', 'ok production (kgs)'], 0),
      okProdPercent: getNumberValue(['ok prod (%)', 'ok prod %', 'ok prod percent'], 0),
      rejKgs: getNumberValue(['rej (kgs)', 'rej', 'rejection (kgs)'], 0),
      runTime: getNumberValue(['run time (mins)', 'run time', 'run time (minutes)'], 0),
      downTime: getNumberValue(['down time (min)', 'down time', 'downtime'], 0),
      stoppageReason: String(getValue(['reason', 'stoppage', 'stoppage reason'], '')),
      startTime: String(getValue(['start time', 'start'], '')),
      endTime: String(getValue(['end time', 'end'], '')),
      totalTime: getNumberValue(['total time (min)', 'total time'], 0),
      mouldChange: String(getValue(['mould change', 'mold change', 'mould'], '')),
      remark: String(getValue(['remark', 'remarks', 'remarks'], ''))
    };

    console.log(`✅ Parsed data from ${sheetName}:`, {
      product: parsedData.product,
      targetQty: parsedData.targetQty,
      actualQty: parsedData.actualQty,
      okProdQty: parsedData.okProdQty
    });

    return parsedData;
  };

  // Helper function to group and parse machine sheets
  const groupAndParseMachineSheets = (sheetNames: string[], workbook: XLSX.WorkBook): MachineData[] => {
    const machines: MachineData[] = [];
    
    // Group sheets by machine number (1a+1b, 2a+2b, etc.)
    const machineGroups = new Map<number, { a?: string; b?: string }>();
    
    sheetNames.forEach(sheetName => {
      const match = sheetName.match(/^(\d+)([ab])$/i);
      if (match) {
        const machineNum = parseInt(match[1]);
        const type = match[2].toLowerCase() as 'a' | 'b';
        
        if (!machineGroups.has(machineNum)) {
          machineGroups.set(machineNum, {});
        }
        machineGroups.get(machineNum)![type] = sheetName;
      }
    });

    // Parse each machine group (skip machines 9 and 10 as per user's clarification)
    machineGroups.forEach((sheets, machineNum) => {
      // Skip machines 9 and 10
      if (machineNum === 9 || machineNum === 10) {
        console.log(`⚠️ Skipping machine ${machineNum} (machines 9 and 10 are not used)`);
        return;
      }
      
      const machineNo = machineNum < 10 ? `IMM-0${machineNum}` : `IMM-${machineNum}`;
      
      // Parse sheet "a" for current production
      let currentProduction: ProductionRun = {
        product: '',
        cavity: 0,
        targetCycle: 0,
        targetRunTime: 0,
        partWeight: 0,
        actualPartWeight: 0,
        actualCycle: 0,
        targetQty: 0,
        actualQty: 0,
        okProdQty: 0,
        okProdKgs: 0,
        okProdPercent: 0,
        rejKgs: 0,
        runTime: 0,
        downTime: 0,
        stoppageReason: '',
        startTime: '',
        endTime: '',
        totalTime: 0,
        mouldChange: '',
        remark: ''
      };

      // Parse sheet "b" for changeover
      let changeover: ProductionRun = {
        product: '',
        cavity: 0,
        targetCycle: 0,
        targetRunTime: 0,
        partWeight: 0,
        actualPartWeight: 0,
        actualCycle: 0,
        targetQty: 0,
        actualQty: 0,
        okProdQty: 0,
        okProdKgs: 0,
        okProdPercent: 0,
        rejKgs: 0,
        runTime: 0,
        downTime: 0,
        stoppageReason: '',
        startTime: '',
        endTime: '',
        totalTime: 0,
        mouldChange: '',
        remark: ''
      };

      let operatorName = '';

      if (sheets.a) {
        console.log(`📄 Processing sheet ${sheets.a} for machine ${machineNum}`);
        const sheetA = workbook.Sheets[sheets.a];
        
        // Read both raw and text versions for better data handling
        const jsonDataARaw = XLSX.utils.sheet_to_json(sheetA, { header: 1, raw: true }) as any[][];
        const jsonDataAText = XLSX.utils.sheet_to_json(sheetA, { header: 1, raw: false }) as any[][];
        
        // Combine both - prefer text for strings, raw for numbers
        // This helps with merged cells - values appear in first cell of merge
        const jsonDataA = jsonDataARaw.map((row, rowIdx) => 
          row.map((cell, colIdx) => {
            // Use text version if available and raw is not a number
            const textCell = jsonDataAText[rowIdx]?.[colIdx];
            if (typeof cell !== 'number' && textCell !== undefined && textCell !== null && textCell !== '') {
              return textCell;
            }
            return cell;
          })
        );
        
        // Also access worksheet directly to handle merged cells better
        // For merged cells, XLSX stores value in top-left cell only
        const fillMergedCells = (data: any[][]): any[][] => {
          const filled = data.map(row => [...row]); // Deep copy
          // Access sheet range to understand merged cells
          const range = XLSX.utils.decode_range(sheetA['!ref'] || 'A1');
          
          // For each row, if a cell is empty but previous row same column has value (might be merged vertically)
          // We'll handle this in getValue function instead for better accuracy
          return filled;
        };
        
        const jsonDataAFilled = fillMergedCells(jsonDataA);
        
        console.log(`📄 Sheet ${sheets.a} data preview:`, jsonDataAFilled.slice(0, 5));
        currentProduction = parseProductionRun(jsonDataAFilled, sheets.a);
        // Extract operator name from sheet
        operatorName = extractOperatorName(jsonDataAFilled) || '';
        console.log(`📄 Extracted operator from ${sheets.a}:`, operatorName);
      }

      if (sheets.b) {
        console.log(`📄 Processing sheet ${sheets.b} for machine ${machineNum}`);
        const sheetB = workbook.Sheets[sheets.b];
        
        // Read both raw and text versions for better data handling
        const jsonDataBRaw = XLSX.utils.sheet_to_json(sheetB, { header: 1, raw: true }) as any[][];
        const jsonDataBText = XLSX.utils.sheet_to_json(sheetB, { header: 1, raw: false }) as any[][];
        
        // Combine both - prefer text for strings, raw for numbers
        // This helps with merged cells - values appear in first cell of merge
        const jsonDataB = jsonDataBRaw.map((row, rowIdx) => 
          row.map((cell, colIdx) => {
            // Use text version if available and raw is not a number
            const textCell = jsonDataBText[rowIdx]?.[colIdx];
            if (typeof cell !== 'number' && textCell !== undefined && textCell !== null && textCell !== '') {
              return textCell;
            }
            return cell;
          })
        );
        
        // Handle merged cells (same approach as sheet A)
        const fillMergedCells = (data: any[][]): any[][] => {
          const filled = data.map(row => [...row]); // Deep copy
          return filled;
        };
        
        const jsonDataBFilled = fillMergedCells(jsonDataB);
        
        console.log(`📄 Sheet ${sheets.b} data preview:`, jsonDataBFilled.slice(0, 5));
        changeover = parseProductionRun(jsonDataBFilled, sheets.b);
        // Use operator name from sheet b if not found in sheet a
        if (!operatorName) {
          operatorName = extractOperatorName(jsonDataBFilled) || '';
          console.log(`📄 Extracted operator from ${sheets.b}:`, operatorName);
        }
      }

      machines.push({
        machineNo,
        operatorName: operatorName || `Operator ${machineNum}`,
        currentProduction,
        changeover
      });
    });

    return machines.sort((a, b) => {
      const numA = parseInt(a.machineNo.replace('IMM-', ''));
      const numB = parseInt(b.machineNo.replace('IMM-', ''));
      return numA - numB;
    });
  };

  // Helper to extract operator name from sheet data
  // Operator name is in "Opt Name" column (usually column 1), merged across 4 rows for each machine
  const extractOperatorName = (sheetData: any[][]): string | null => {
    if (!sheetData || sheetData.length === 0) return null;
    
    // Find header row first
    let headerRowIndex = -1;
    let headerRow: any[] = [];
    
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
      const row = sheetData[i] || [];
      const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
      
      if (rowText.includes('daily production report') || rowText.includes('date:-')) {
        continue;
      }
      
      // Look for row with header keywords
      if (rowText.includes('product') && rowText.includes('opt name') && row.length >= 15) {
        headerRowIndex = i;
        headerRow = row;
        break;
      }
    }
    
    if (headerRowIndex < 0 || headerRow.length === 0) {
      console.log('⚠️ Could not find header row for operator extraction.');
      return null;
    }
    
    // Find "Opt Name" column (usually column index 1)
    const optNameColIndex = headerRow.findIndex((cell: any) => {
      const header = String(cell || '').toLowerCase().trim();
      return header.includes('opt name') || header.includes('operator name');
    });
    
    // If not found, assume it's column 1 (second column after M/c No.)
    const operatorColIndex = optNameColIndex >= 0 ? optNameColIndex : 1;
    
    // Find first data row (machine row starting with IMM-)
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 15, sheetData.length); i++) {
      const row = sheetData[i] || [];
      const firstCell = String(row[0] || '').trim();
      
      if (/^IMM-?\d+/i.test(firstCell)) {
        // Found machine row - operator name should be in column operatorColIndex
        // Since it's merged, it should be in this row (first row of 4-row block)
        let value = row[operatorColIndex];
        
        // If empty, check next row (might be in row 2 due to merging)
        if ((!value || String(value).trim() === '') && i + 1 < sheetData.length) {
          value = sheetData[i + 1]?.[operatorColIndex];
        }
        
        if (value && String(value).trim() !== '') {
          const operatorName = String(value).trim();
          console.log(`✅ Extracted operator name: "${operatorName}" from column ${operatorColIndex}, row ${i}`);
          return operatorName;
        }
      }
    }

    console.log('⚠️ Could not extract operator name - no machine row found or operator name is empty.');
    return null;
  };

  // Get current DPR data for selected date and shift
  const getCurrentDPRData = (): DPRData | null => {
    return dprData.find(dpr => dpr.date === selectedDate && dpr.shift === selectedShift) || null;
  };

  // Export to Excel
  const handleExcelExport = () => {
    const currentData = getCurrentDPRData();
    if (!currentData) {
      alert('No data available for the selected date.');
      return;
    }

    // This would generate and download an Excel file
    console.log('Exporting to Excel:', currentData);
    alert('Excel export functionality will be implemented with xlsx library.');
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Daily Production Report',
      icon: Factory,
      description: 'Daily production report and key metrics'
    },
    {
      id: 'schedule',
      label: 'Production Schedule',
      icon: Calendar,
      description: 'Daily and weekly production planning'
    },
    {
      id: 'analytics',
      label: 'Production Analytics',
      icon: BarChart3,
      description: 'Performance metrics and reporting'
    },
    {
      id: 'resources',
      label: 'Resource Management',
      icon: Users,
      description: 'Manage production resources and capacity'
    },
    {
      id: 'settings',
      label: 'Production Settings',
      icon: Settings,
      description: 'Configure production parameters'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Daily Production Report Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              {/* Header Controls */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="date-picker" className="text-sm font-medium text-gray-700">
                      Select Date:
                    </label>
                    <input
                      id="date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="shift-picker" className="text-sm font-medium text-gray-700">
                      Select Shift:
                    </label>
                    <select
                      id="shift-picker"
                      value={selectedShift}
                      onChange={(e) => setSelectedShift(e.target.value as 'DAY' | 'NIGHT')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DAY">DAY</option>
                      <option value="NIGHT">NIGHT</option>
                    </select>
                  </div>
                  {getCurrentDPRData() && (
                    <div className="text-sm text-gray-600">
                      <span className="ml-4"><strong>Shift Incharge:</strong> {getCurrentDPRData()?.shiftIncharge || 'N/A'}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Import Excel */}
                  <button
                    onClick={() => setShowExcelReader(true)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </button>
                  
                  {/* Export Excel */}
                  <button
                    onClick={handleExcelExport}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </button>
                </div>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">DAILY PRODUCTION REPORT (DPR)</h1>
                <div className="text-lg text-gray-600">
                  <strong>DATE:</strong> {new Date(selectedDate).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })} | <strong>SHIFT:</strong> {selectedShift}
                </div>
              </div>

              {/* Main DPR Table */}
              {getCurrentDPRData() ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-xs">
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-gray-100">
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">M/c No.</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Opt Name</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Product</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Cavity</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Trg Cycle (sec)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Trg Run Time (min)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Part Wt (gm)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Act part wt (gm)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Act Cycle (sec)</th>
                      <th colSpan={2} className="border border-gray-300 p-2 text-center font-bold">No of Shots</th>
                      <th colSpan={6} className="border border-gray-300 p-2 text-center font-bold">Production Data</th>
                      <th colSpan={2} className="border border-gray-300 p-2 text-center font-bold">Run Time</th>
                      <th colSpan={5} className="border border-gray-300 p-2 text-center font-bold">Stoppage Time and Remarks</th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-1 text-center font-bold">Start</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">End</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Target Qty (Nos)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Actual Qty (Nos)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Ok Prod Qty (Nos)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Ok Prod (Kgs)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Ok Prod (%)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Rej (Kgs)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Run Time (mins)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Down time (min)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Reason</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Start Time</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">End Time</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Total Time (min)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Mould change</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">REMARK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentDPRData()?.machines.map((machine, index) => {
                      // Check if there's a REAL changeover - only show changeover rows (3-4) if:
                      // 1. The changeover.product exists AND is DIFFERENT from currentProduction.product
                      // 2. AND there's actual changeover data (quantities, times, etc.)
                      // This means a different mold/product was run after the initial one
                      const currentProduct = machine.currentProduction.product?.trim() || '';
                      const changeoverProduct = machine.changeover.product?.trim() || '';
                      
                      // Check if product is different
                      const hasDifferentProduct = changeoverProduct !== '' && 
                                                  changeoverProduct !== currentProduct;
                      
                      // Check if there's actual changeover data (not just empty/default values)
                      const hasChangeoverData = machine.changeover.targetQty > 0 || 
                                                machine.changeover.actualQty > 0 || 
                                                machine.changeover.okProdQty > 0 ||
                                                machine.changeover.runTime > 0 ||
                                                (machine.changeover.stoppageReason && machine.changeover.stoppageReason.trim() !== '') ||
                                                (machine.changeover.mouldChange && machine.changeover.mouldChange.trim() !== '') ||
                                                (machine.changeover.remark && machine.changeover.remark.trim() !== '');
                      
                      // Changeover exists ONLY if product is different AND there's actual data
                      // Don't show changeover rows if product is same, empty, or no data exists
                      const hasChangeover = hasDifferentProduct && hasChangeoverData;
                      const totalRows = hasChangeover ? 4 : 2; // 2 rows for current only, 4 rows if changeover exists with DIFFERENT product AND data
                      
                      return (
                        <React.Fragment key={machine.machineNo}>
                          {/* Row 1: Current Production - First Row */}
                          <tr>
                            <td rowSpan={totalRows} className="border border-gray-300 p-2 text-center font-bold bg-blue-50">
                              {machine.machineNo}
                            </td>
                            <td rowSpan={totalRows} className="border border-gray-300 p-2 text-center">
                              {machine.operatorName}
                            </td>
                            <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.product}
                            </td>
                            <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.cavity.toFixed(2)}
                            </td>
                            <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetCycle.toFixed(2)}
                            </td>
                            <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetRunTime.toFixed(2)}
                            </td>
                            <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.partWeight.toFixed(2)}
                            </td>
                            <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.actualPartWeight.toFixed(2)}
                            </td>
                            <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.actualCycle.toFixed(2)}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.startTime && machine.currentProduction.startTime.toString() !== '0' && machine.currentProduction.startTime !== ''
                                ? (typeof machine.currentProduction.startTime === 'number' 
                                    ? Math.round(machine.currentProduction.startTime).toLocaleString() 
                                    : machine.currentProduction.startTime)
                                : ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.endTime && machine.currentProduction.endTime.toString() !== '0' && machine.currentProduction.endTime !== ''
                                ? (typeof machine.currentProduction.endTime === 'number' 
                                    ? Math.round(machine.currentProduction.endTime).toLocaleString() 
                                    : machine.currentProduction.endTime)
                                : ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetQty % 1 === 0 
                                ? machine.currentProduction.targetQty.toLocaleString() 
                                : machine.currentProduction.targetQty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {Math.round(machine.currentProduction.actualQty).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 p-2 text-center bg-yellow-200 font-bold">
                              {Math.round(machine.currentProduction.okProdQty).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.okProdKgs.toFixed(2)}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetQty > 0 
                                ? Math.round((machine.currentProduction.okProdQty / machine.currentProduction.targetQty) * 100)
                                : Math.round(machine.currentProduction.okProdPercent)}%
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.rejKgs.toFixed(2)}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {Math.round(machine.currentProduction.runTime)}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              ({machine.currentProduction.downTime.toFixed(2)})
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.stoppageReason}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.startTime}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.endTime}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.totalTime > 0 ? machine.currentProduction.totalTime.toFixed(2) : ''}
                            </td>
                            <td className={`border border-gray-300 p-2 text-center ${machine.currentProduction.mouldChange ? 'bg-green-200' : ''}`}>
                              {machine.currentProduction.mouldChange}
                            </td>
                            <td className={`border border-gray-300 p-2 text-center ${machine.currentProduction.remark ? 'bg-green-200' : ''}`}>
                              {machine.currentProduction.remark}
                            </td>
                          </tr>
                          {/* Row 2: Current Production - Second Row (Empty) */}
                          <tr>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                            <td className="border border-gray-300 p-2 text-center"></td>
                          </tr>
                          {/* Row 3 & 4: Changeover - Show if there's any changeover data */}
                          {hasChangeover && (
                            <>
                              {/* Row 3: Changeover - First Row */}
                              <tr>
                                <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.product}
                                </td>
                                <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.cavity.toFixed(2)}
                                </td>
                                <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.targetCycle.toFixed(2)}
                                </td>
                                <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.targetRunTime.toFixed(2)}
                                </td>
                                <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.partWeight.toFixed(2)}
                                </td>
                                <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.actualPartWeight.toFixed(2)}
                                </td>
                                <td rowSpan={2} className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.actualCycle.toFixed(2)}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.startTime && machine.changeover.startTime.toString() !== '0' && machine.changeover.startTime !== ''
                                    ? (typeof machine.changeover.startTime === 'number' 
                                        ? Math.round(machine.changeover.startTime).toLocaleString() 
                                        : machine.changeover.startTime)
                                    : ''}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.endTime && machine.changeover.endTime.toString() !== '0' && machine.changeover.endTime !== ''
                                    ? (typeof machine.changeover.endTime === 'number' 
                                        ? Math.round(machine.changeover.endTime).toLocaleString() 
                                        : machine.changeover.endTime)
                                    : ''}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.targetQty % 1 === 0 
                                    ? machine.changeover.targetQty.toLocaleString() 
                                    : machine.changeover.targetQty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {Math.round(machine.changeover.actualQty).toLocaleString()}
                                </td>
                                <td className="border border-gray-300 p-2 text-center bg-yellow-200 font-bold">
                                  {Math.round(machine.changeover.okProdQty).toLocaleString()}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.okProdKgs.toFixed(2)}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.targetQty > 0 
                                    ? Math.round((machine.changeover.okProdQty / machine.changeover.targetQty) * 100)
                                    : Math.round(machine.changeover.okProdPercent)}%
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.rejKgs.toFixed(2)}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {Math.round(machine.changeover.runTime)}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  ({machine.changeover.downTime.toFixed(2)})
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.stoppageReason}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.startTime}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.endTime}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.totalTime > 0 ? machine.changeover.totalTime.toFixed(2) : ''}
                                </td>
                                <td className={`border border-gray-300 p-2 text-center ${machine.changeover.mouldChange ? 'bg-green-200' : ''}`}>
                                  {machine.changeover.mouldChange}
                                </td>
                                <td className={`border border-gray-300 p-2 text-center ${machine.changeover.remark ? 'bg-green-200' : ''}`}>
                                  {machine.changeover.remark}
                                </td>
                              </tr>
                              {/* Row 4: Changeover - Second Row (Empty) */}
                              <tr>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                                <td className="border border-gray-300 p-2 text-center"></td>
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-600 mb-4">
                    No DPR data found for <strong>{new Date(selectedDate).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}</strong> - <strong>{selectedShift}</strong> shift
                  </p>
                  <p className="text-sm text-gray-500">
                    Please import an Excel file to view production data.
                  </p>
                </div>
              )}

              {/* Shift Total Section - Enhanced */}
              {(() => {
                const currentData = getCurrentDPRData();
                if (!currentData) return null;
                return (
              <div className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border-2 border-gray-300 shadow-lg">
                <div className="flex items-center justify-center mb-6">
                  <Target className="w-6 h-6 mr-2 text-blue-600" />
                  <h3 className="text-2xl font-bold text-gray-900">SHIFT TOTAL</h3>
                </div>
                
                {/* Primary Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Target Quantity */}
                  <div className="bg-white p-5 rounded-lg border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Target className="w-5 h-5 text-blue-600" />
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">TARGET</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">Target Qty (Nos)</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.summary.targetQty.toLocaleString()}</p>
                  </div>

                  {/* Actual Quantity */}
                  <div className="bg-white p-5 rounded-lg border-2 border-purple-200 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="w-5 h-5 text-purple-600" />
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">ACTUAL</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">Actual Qty (Nos)</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.summary.actualQty.toLocaleString()}</p>
                    <div className="mt-2 flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${(currentData.summary.actualQty / currentData.summary.targetQty * 100)}%` }}></div>
                      </div>
                      <span className="text-xs font-semibold text-purple-600">{Math.round(currentData.summary.actualQty / currentData.summary.targetQty * 100)}%</span>
                    </div>
                  </div>

                  {/* OK Production Quantity - Highlighted */}
                  <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-5 rounded-lg border-2 border-yellow-400 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Award className="w-5 h-5 text-yellow-700" />
                      <span className="text-xs bg-yellow-300 text-yellow-900 px-2 py-1 rounded font-bold">KEY METRIC</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1 font-medium">Ok Prod Qty (Nos)</p>
                    <p className="text-3xl font-bold text-yellow-900">{currentData.summary.okProdQty.toLocaleString()}</p>
                    <div className="mt-2 flex items-center text-xs">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-gray-700 font-medium">{Math.round(currentData.summary.okProdQty / currentData.summary.actualQty * 100 * 10) / 10}% of Actual</span>
                    </div>
                  </div>

                  {/* OK Production in Kgs */}
                  <div className="bg-white p-5 rounded-lg border-2 border-green-200 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Package className="w-5 h-5 text-green-600" />
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">WEIGHT</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">Ok Prod (Kgs)</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.summary.okProdKgs.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">kg</p>
                  </div>
                </div>

                {/* Secondary Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* OK Production Percentage */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-300 shadow-sm">
                    <div className="flex items-center mb-2">
                      <Zap className="w-4 h-4 text-green-600 mr-2" />
                      <p className="text-sm text-gray-700 font-medium">Ok Prod (%)</p>
                    </div>
                    <div className="flex items-end">
                      <p className="text-3xl font-bold text-green-700">{currentData.summary.okProdPercent}%</p>
                      <TrendingUp className="w-5 h-5 text-green-600 ml-2 mb-1" />
                    </div>
                    <div className="mt-2 bg-green-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${currentData.summary.okProdPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Rejection */}
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-2 border-red-300 shadow-sm">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                      <p className="text-sm text-gray-700 font-medium">Rej (Kgs)</p>
                    </div>
                    <div className="flex items-end">
                      <p className="text-3xl font-bold text-red-700">{currentData.summary.rejKgs.toFixed(2)}</p>
                      <TrendingDown className="w-5 h-5 text-red-600 ml-2 mb-1" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{(currentData.summary.rejKgs / currentData.summary.okProdKgs * 100).toFixed(1)}% rejection rate</p>
                  </div>

                  {/* Run Time */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-300 shadow-sm">
                    <div className="flex items-center mb-2">
                      <Clock className="w-4 h-4 text-blue-600 mr-2" />
                      <p className="text-sm text-gray-700 font-medium">Run Time (mins)</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-700">{currentData.summary.runTime.toLocaleString()}</p>
                    <p className="text-xs text-gray-600 mt-1">≈ {(currentData.summary.runTime / 60).toFixed(1)} hours</p>
                  </div>

                  {/* Down Time */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-2 border-orange-300 shadow-sm">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 mr-2" />
                      <p className="text-sm text-gray-700 font-medium">Down Time (min)</p>
                    </div>
                    <p className="text-3xl font-bold text-orange-700">{currentData.summary.downTime}</p>
                    <p className="text-xs text-gray-600 mt-1">≈ {(currentData.summary.downTime / 60).toFixed(1)} hours</p>
                  </div>
                </div>
              </div>
                );
              })()}

              {/* Achievement Section - Enhanced */}
              {(() => {
                const currentData = getCurrentDPRData();
                if (!currentData) return null;
                return (
              <div className="mt-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-lg border-2 border-blue-400 shadow-lg">
                <div className="flex items-center justify-center mb-6">
                  <Award className="w-6 h-6 mr-2 text-blue-600" />
                  <h3 className="text-2xl font-bold text-gray-900">ACHIEVEMENT METRICS</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Actual vs Target */}
                  <div className="bg-white p-6 rounded-lg border-2 border-green-300 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <Target className="w-5 h-5 text-green-600" />
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">PERFORMANCE</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">Actual vs Target</p>
                    <div className="relative">
                      <p className="text-4xl font-bold text-green-600 mb-2">{Math.round(currentData.summary.actualQty / currentData.summary.targetQty * 100)}%</p>
                      <div className="flex items-center mb-3">
                        <TrendingUp className="w-5 h-5 text-green-600 mr-1" />
                        <span className="text-sm font-semibold text-green-600">On Track</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" style={{ width: `${Math.round(currentData.summary.actualQty / currentData.summary.targetQty * 100)}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{(currentData.summary.targetQty - currentData.summary.actualQty).toLocaleString()} units short of target</p>
                    </div>
                  </div>

                  {/* Rejection vs OK Production */}
                  <div className="bg-white p-6 rounded-lg border-2 border-red-300 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">QUALITY</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">Rej vs Ok Prod</p>
                    <div className="relative">
                      <p className="text-4xl font-bold text-red-600 mb-2">{(currentData.summary.rejKgs / currentData.summary.okProdKgs * 100).toFixed(1)}%</p>
                      <div className="flex items-center mb-3">
                        <TrendingDown className="w-5 h-5 text-green-600 mr-1" />
                        <span className="text-sm font-semibold text-green-600">Excellent</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full" style={{ width: `${(currentData.summary.rejKgs / currentData.summary.okProdKgs * 100)}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Low rejection rate</p>
                    </div>
                  </div>

                  {/* Run Time vs Total */}
                  <div className="bg-white p-6 rounded-lg border-2 border-blue-300 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">EFFICIENCY</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">Run Time vs Total</p>
                    <div className="relative">
                      <p className="text-4xl font-bold text-blue-600 mb-2">{Math.round(currentData.summary.runTime / (currentData.summary.runTime + currentData.summary.downTime) * 100)}%</p>
                      <div className="flex items-center mb-3">
                        <TrendingUp className="w-5 h-5 text-blue-600 mr-1" />
                        <span className="text-sm font-semibold text-blue-600">High</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style={{ width: `${Math.round(currentData.summary.runTime / (currentData.summary.runTime + currentData.summary.downTime) * 100)}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Only {Math.round(currentData.summary.downTime / (currentData.summary.runTime + currentData.summary.downTime) * 100)}% downtime</p>
                    </div>
                  </div>

                  {/* Down Time vs Total */}
                  <div className="bg-white p-6 rounded-lg border-2 border-orange-300 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">DOWNTIME</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">Down Time vs Total</p>
                    <div className="relative">
                      <p className="text-4xl font-bold text-orange-600 mb-2">{Math.round(currentData.summary.downTime / (currentData.summary.runTime + currentData.summary.downTime) * 100)}%</p>
                      <div className="flex items-center mb-3">
                        <TrendingDown className="w-5 h-5 text-green-600 mr-1" />
                        <span className="text-sm font-semibold text-green-600">Minimal</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full" style={{ width: `${Math.round(currentData.summary.downTime / (currentData.summary.runTime + currentData.summary.downTime) * 100)}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{currentData.summary.downTime} minutes downtime</p>
                    </div>
                  </div>
                </div>
              </div>
                );
              })()}
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Schedule</h3>
              <p className="text-gray-600">Production scheduling interface will be implemented here.</p>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Analytics</h3>
              <p className="text-gray-600">Production analytics and reporting will be implemented here.</p>
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Management</h3>
              <p className="text-gray-600">Resource management interface will be implemented here.</p>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Settings</h3>
              <p className="text-gray-600">Production configuration settings will be implemented here.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="w-5 h-5 inline mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderTabContent()}
      </div>

      {/* Excel File Reader Modal for DPR Import */}
      {showExcelReader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Import DPR Excel File</h2>
              <button
                onClick={() => setShowExcelReader(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ExcelFileReader
                defaultDataType="dpr"
                onDataImported={(importData) => {
                  // Convert ExcelFileReader's DPR format to ProductionModule's DPRData format
                  if (importData.dpr) {
                    const dprData = importData.dpr;
                    
                    // Update date and shift from imported data
                    if (dprData.date) {
                      setSelectedDate(dprData.date);
                    }
                    if (dprData.shift) {
                      setSelectedShift(dprData.shift as 'DAY' | 'NIGHT');
                    }

                    // Convert to DPRData format expected by ProductionModule
                    const convertedData: DPRData = {
                      id: dprData.id || `${dprData.date}-${dprData.shift}-${Date.now()}`,
                      date: dprData.date,
                      shift: dprData.shift,
                      shiftIncharge: dprData.shiftIncharge || 'CHANDAN/DHIRAJ',
                      machines: dprData.machines || [],
                      summary: dprData.summary || {
                        targetQty: 0,
                        actualQty: 0,
                        okProdQty: 0,
                        okProdKgs: 0,
                        okProdPercent: 0,
                        rejKgs: 0,
                        runTime: 0,
                        downTime: 0
                      }
                    };

                    // Check if data for this date+shift already exists and replace it
                    setDprData(prev => {
                      const filtered = prev.filter(dpr => !(dpr.date === convertedData.date && dpr.shift === convertedData.shift));
                      return [...filtered, convertedData];
                    });

                    alert(`DPR imported successfully!\n\nImported:\n- ${convertedData.machines.length} machines\n- Date: ${new Date(convertedData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\n- Shift: ${convertedData.shift}\n- Shift Incharge: ${convertedData.shiftIncharge}`);
                    
                    // Close the modal
                    setShowExcelReader(false);
                  }
                }}
                onClose={() => setShowExcelReader(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionModule;
