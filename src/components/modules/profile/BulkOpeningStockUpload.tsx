'use client';

import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Download,
  Loader2,
  Package,
  Box,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface RMItem {
  category: string;
  type: string;
  grade: string;
  quantity: number;
  status?: 'matched' | 'not_in_master' | 'error';
  stock_item_code?: string;
  message?: string;
}

interface PMItem {
  category: string;
  type: string;
  item_code: string;
  pack_size?: string;
  dimensions?: string;
  brand?: string;
  quantity: number;
  unit?: string;
  status?: 'matched' | 'not_in_master' | 'error';
  stock_item_code?: string;
  message?: string;
}

interface SFGItem {
  item_name: string;
  sfg_code: string;
  quantity: number;
  status?: 'matched' | 'not_in_master' | 'error';
  stock_item_code?: string;
  message?: string;
}

interface ValidationResult {
  rm: { matched: RMItem[]; not_in_master: RMItem[]; total: number };
  pm: { matched: PMItem[]; not_in_master: PMItem[]; total: number };
  sfg: { matched: SFGItem[]; not_in_master: SFGItem[]; total: number };
}

interface BulkOpeningStockUploadProps {
  onClose: () => void;
  onSuccess?: () => void;
}

type TabType = 'rm' | 'pm' | 'sfg';

// ============================================================================
// COMPONENT
// ============================================================================

const BulkOpeningStockUpload: React.FC<BulkOpeningStockUploadProps> = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<TabType>('rm');
  const [rmItems, setRmItems] = useState<RMItem[]>([]);
  const [pmItems, setPmItems] = useState<PMItem[]>([]);
  const [sfgItems, setSfgItems] = useState<SFGItem[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; details?: string[]; errors?: string[] } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rm_matched: true, rm_unmatched: true,
    pm_matched: true, pm_unmatched: true,
    sfg_matched: true, sfg_unmatched: true
  });

  const rmFileRef = useRef<HTMLInputElement>(null);
  const pmFileRef = useRef<HTMLInputElement>(null);
  const sfgFileRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // EXCEL PARSING
  // ============================================================================

  const parseRMExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Find header row - look for Category, Type, Grade, Qty columns
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.some((cell: any) => 
            String(cell).toLowerCase().includes('category') ||
            String(cell).toLowerCase().includes('type') ||
            String(cell).toLowerCase().includes('grade')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow = jsonData[headerRowIndex];
        const findColIndex = (names: string[]) => {
          return headerRow.findIndex((h: any) => 
            names.some(n => String(h).toLowerCase().includes(n.toLowerCase()))
          );
        };

        const categoryCol = findColIndex(['category']);
        const typeCol = findColIndex(['type']);
        const gradeCol = findColIndex(['grade']);
        const qtyCol = findColIndex(['stock', 'qty', 'quantity']); // Prioritize "Stock" column

        const items: RMItem[] = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || !row[categoryCol]) continue;
          
          // Parse quantity - allow 0 values (they should still be included)
          const qty = parseFloat(row[qtyCol]) || 0;
          // Don't skip rows with 0 quantity - they should still be parsed and shown

          items.push({
            category: String(row[categoryCol] || '').trim(),
            type: String(row[typeCol] || '').trim(),
            grade: String(row[gradeCol] || '').trim(),
            quantity: qty
          });
        }

        setRmItems(items);
        setValidationResult(null);
      } catch (err) {
        alert('Error parsing RM Excel file. Please check the format.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const parsePMExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Find header row
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.some((cell: any) => 
            String(cell).toLowerCase().includes('category') ||
            String(cell).toLowerCase().includes('item code') ||
            String(cell).toLowerCase().includes('item_code')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow = jsonData[headerRowIndex];
        const findColIndex = (names: string[]) => {
          return headerRow.findIndex((h: any) => 
            names.some(n => String(h).toLowerCase().includes(n.toLowerCase()))
          );
        };

        const categoryCol = findColIndex(['category']);
        const typeCol = findColIndex(['type']);
        const itemCodeCol = findColIndex(['item code', 'item_code', 'itemcode']);
        const packSizeCol = findColIndex(['pack size', 'pack_size', 'packsize']);
        const dimensionsCol = findColIndex(['dimensions', 'dimension']);
        const brandCol = findColIndex(['brand']);
        const stockCol = findColIndex(['stock', 'qty', 'quantity']);
        const unitCol = findColIndex(['unit']);

        const items: PMItem[] = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || (!row[categoryCol] && !row[itemCodeCol])) continue;
          
          // Parse quantity - allow 0 values (they should still be included)
          const qty = parseFloat(row[stockCol]) || 0;
          // Don't skip rows with 0 quantity - they should still be parsed and shown

          items.push({
            category: String(row[categoryCol] || '').trim(),
            type: String(row[typeCol] || '').trim(),
            item_code: String(row[itemCodeCol] || '').trim(),
            pack_size: String(row[packSizeCol] || '').trim(),
            dimensions: String(row[dimensionsCol] || '').trim(),
            brand: brandCol >= 0 ? String(row[brandCol] || '').trim() : '',
            quantity: qty,
            unit: unitCol >= 0 ? String(row[unitCol] || '').trim() : ''
          });
        }

        setPmItems(items);
        setValidationResult(null);
      } catch (err) {
        alert('Error parsing PM Excel file. Please check the format.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const parseSFGExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Find header row
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.some((cell: any) => 
            String(cell).toLowerCase().includes('item name') ||
            String(cell).toLowerCase().includes('item_name') ||
            String(cell).toLowerCase().includes('sfg') ||
            String(cell).toLowerCase().includes('code')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow = jsonData[headerRowIndex];
        const findColIndex = (names: string[]) => {
          return headerRow.findIndex((h: any) => 
            names.some(n => String(h).toLowerCase().includes(n.toLowerCase()))
          );
        };

        const itemNameCol = findColIndex(['item name', 'item_name', 'itemname', 'name']);
        const sfgCodeCol = findColIndex(['sfg-code', 'sfg_code', 'sfgcode', 'code']);
        const stockCol = findColIndex(['stock', 'qty', 'quantity']);

        const items: SFGItem[] = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || (!row[itemNameCol] && !row[sfgCodeCol])) continue;
          
          // Skip empty rows (where both item name and sfg code are empty)
          const itemName = String(row[itemNameCol] || '').trim();
          const sfgCode = String(row[sfgCodeCol] || '').trim();
          if (!itemName && !sfgCode) continue;
          
          // Parse quantity - allow 0 values (they should still be included)
          const qty = parseFloat(row[stockCol]) || 0;
          // Don't skip rows with 0 quantity - they should still be parsed and shown

          items.push({
            item_name: itemName,
            sfg_code: sfgCode,
            quantity: qty
          });
        }

        setSfgItems(items);
        setValidationResult(null);
      } catch (err) {
        alert('Error parsing SFG Excel file. Please check the format.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const validateItems = useCallback(async () => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/admin/bulk-opening-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          rm_items: rmItems,
          pm_items: pmItems,
          sfg_items: sfgItems
        })
      });

      const result = await response.json();
      if (result.success) {
        setValidationResult(result.data);
        // Update items with validation status
        if (result.data.rm) {
          setRmItems([...result.data.rm.matched, ...result.data.rm.not_in_master]);
        }
        if (result.data.pm) {
          setPmItems([...result.data.pm.matched, ...result.data.pm.not_in_master]);
        }
        if (result.data.sfg) {
          setSfgItems([...result.data.sfg.matched, ...result.data.sfg.not_in_master]);
        }
      } else {
        alert('Validation failed: ' + result.error);
      }
    } catch (err) {
      alert('Error validating items');
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  }, [rmItems, pmItems, sfgItems]);

  const uploadMatchedItems = useCallback(async () => {
    if (!validationResult) return;

    const matchedRM = validationResult.rm.matched;
    const matchedPM = validationResult.pm.matched;
    const matchedSFG = validationResult.sfg.matched;

    if (matchedRM.length === 0 && matchedPM.length === 0 && matchedSFG.length === 0) {
      alert('No matched items to upload');
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch('/api/admin/bulk-opening-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          rm_items: matchedRM,
          pm_items: matchedPM,
          sfg_items: matchedSFG,
          location_code: 'STORE',
          remarks: 'Bulk opening stock upload'
        })
      });

      const result = await response.json();
      console.log('Upload result:', result); // Debug logging
      setUploadResult({
        success: result.success || result.partial,
        message: result.message || (result.success ? 'Upload successful' : 'Upload failed'),
        details: result.data?.details || [],
        errors: result.data?.errors || []
      });

      if (result.success) {
        if (onSuccess) {
          onSuccess();
        }
        // Close the modal after a short delay to show success message
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadResult({
        success: false,
        message: 'Error uploading items: ' + (err instanceof Error ? err.message : String(err)),
        errors: ['Network or server error occurred. Check console for details.']
      });
    } finally {
      setIsUploading(false);
    }
  }, [validationResult, onSuccess, onClose]);

  // ============================================================================
  // DOWNLOAD TEMPLATE
  // ============================================================================

  const downloadTemplate = useCallback((type: TabType) => {
    let headers: string[];
    let filename: string;
    let sampleData: string[][];

    switch (type) {
      case 'rm':
        headers = ['Category', 'Type', 'Grade', 'Stock'];
        sampleData = [
          ['PP', 'HP', 'HJ333MO', '23660'],
          ['PP', 'ICP', '3650 MN', '1060'],
          ['PP', 'RCP', 'RH 668 MO', '2345'],
          ['PP', 'MB', 'Black', '2358'],
        ];
        filename = 'rm_opening_stock_template.xlsx';
        break;
      case 'pm':
        headers = ['Category', 'Type', 'Item Code', 'Pack Size', 'Dimensions', 'Stock', 'Brand', 'Unit'];
        sampleData = [
          ['Boxes', 'Local', 'CTN-Ro10-GM', '1000 nos', '670x515x420', '47', 'Domestic', 'Unit 1'],
          ['Boxes', 'Export', 'CTN-Ro10-Ex', '300 sets', '390x260x420', '485', 'Regular', 'Unit 1'],
          ['BOPP', 'Local', 'Bopp-65mm', '130000', '65mm', '282', '-', 'Unit 1'],
          ['Polybags', 'Local', 'Poly-4x22', '0.005416', '4x22', '105', '-', 'Unit 1'],
        ];
        filename = 'pm_opening_stock_template.xlsx';
        break;
      case 'sfg':
        headers = ['Sl', 'Item Name', 'SFG-Code', 'Stock'];
        sampleData = [
          ['1', 'RP-Ro10-C', '110110001', '840'],
          ['2', 'RP-Ro12-C', '110210001', '41300'],
          ['3', 'RP-Ro16T-C', '110310001', '4000'],
          ['4', 'CK-Ro16-L', '110220001', '133000'],
        ];
        filename = 'sfg_opening_stock_template.xlsx';
        break;
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, filename);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const totalItems = rmItems.length + pmItems.length + sfgItems.length;
  const totalMatched = validationResult 
    ? validationResult.rm.matched.length + validationResult.pm.matched.length + validationResult.sfg.matched.length 
    : 0;
  const totalUnmatched = validationResult 
    ? validationResult.rm.not_in_master.length + validationResult.pm.not_in_master.length + validationResult.sfg.not_in_master.length 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center">
            <Upload className="w-6 h-6 text-white mr-3" />
            <div>
              <h2 className="text-xl font-bold text-white">Bulk Opening Stock Upload</h2>
              <p className="text-blue-100 text-sm">Upload Excel files to add opening stock for RM, PM, and SFG items</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {[
            { id: 'rm' as TabType, label: 'Raw Materials', icon: Package, count: rmItems.length },
            { id: 'pm' as TabType, label: 'Packing Materials', icon: Box, count: pmItems.length },
            { id: 'sfg' as TabType, label: 'SFG (Semi-Finished)', icon: Layers, count: sfgItems.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Upload Section */}
          <div className="mb-6">
            <div className="flex gap-4 items-center">
              <input
                type="file"
                ref={activeTab === 'rm' ? rmFileRef : activeTab === 'pm' ? pmFileRef : sfgFileRef}
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (activeTab === 'rm') parseRMExcel(file);
                    else if (activeTab === 'pm') parsePMExcel(file);
                    else parseSFGExcel(file);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (activeTab === 'rm') rmFileRef.current?.click();
                  else if (activeTab === 'pm') pmFileRef.current?.click();
                  else sfgFileRef.current?.click();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Upload {activeTab.toUpperCase()} Excel
              </button>
              <button
                onClick={() => downloadTemplate(activeTab)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>

          {/* Data Preview */}
          {activeTab === 'rm' && rmItems.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-2">Raw Materials Preview ({rmItems.length} items)</h4>
              <div className="overflow-x-auto border rounded-lg max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock (KG)</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rmItems.map((item, idx) => (
                      <tr key={idx} className={item.status === 'not_in_master' ? 'bg-yellow-50' : ''}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.category}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.type}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.grade}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          {item.status === 'matched' && <CheckCircle2 className="w-4 h-4 text-green-500 inline" />}
                          {item.status === 'not_in_master' && <AlertTriangle className="w-4 h-4 text-yellow-500 inline" />}
                          {!item.status && <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pm' && pmItems.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-2">Packing Materials Preview ({pmItems.length} items)</h4>
              <div className="overflow-x-auto border rounded-lg max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pack Size</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pmItems.map((item, idx) => (
                      <tr key={idx} className={item.status === 'not_in_master' ? 'bg-yellow-50' : ''}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.category}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.type}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 font-mono">{item.item_code}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.pack_size}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          {item.status === 'matched' && <CheckCircle2 className="w-4 h-4 text-green-500 inline" />}
                          {item.status === 'not_in_master' && <AlertTriangle className="w-4 h-4 text-yellow-500 inline" />}
                          {!item.status && <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sfg' && sfgItems.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-2">SFG Items Preview ({sfgItems.length} items)</h4>
              <div className="overflow-x-auto border rounded-lg max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SFG Code</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty (NOS)</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sfgItems.map((item, idx) => (
                      <tr key={idx} className={item.status === 'not_in_master' ? 'bg-yellow-50' : ''}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.item_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 font-mono">{item.sfg_code}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          {item.status === 'matched' && <CheckCircle2 className="w-4 h-4 text-green-500 inline" />}
                          {item.status === 'not_in_master' && <AlertTriangle className="w-4 h-4 text-yellow-500 inline" />}
                          {!item.status && <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{totalItems}</div>
                  <div className="text-sm text-blue-600">Total Items</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{totalMatched}</div>
                  <div className="text-sm text-green-600">Matched (Ready to Upload)</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">{totalUnmatched}</div>
                  <div className="text-sm text-yellow-600">Not in Master</div>
                </div>
              </div>

              {/* Unmatched Items Details */}
              {totalUnmatched > 0 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Items Not Found in Master Data ({totalUnmatched})
                  </h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    These items were not found in the master data. You can either:
                    <br />• Add them to the respective master tables first
                    <br />• Check if there are typos in the item codes/names
                    <br />• Skip them and upload only the matched items
                  </p>
                  
                  {/* RM Unmatched */}
                  {validationResult.rm.not_in_master.length > 0 && (
                    <div className="mb-3">
                      <button 
                        onClick={() => toggleSection('rm_unmatched')}
                        className="flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900"
                      >
                        {expandedSections.rm_unmatched ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        Raw Materials ({validationResult.rm.not_in_master.length})
                      </button>
                      {expandedSections.rm_unmatched && (
                        <div className="mt-2 bg-white rounded border border-yellow-200 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-yellow-100">
                              <tr>
                                <th className="px-2 py-1 text-left">Category</th>
                                <th className="px-2 py-1 text-left">Type</th>
                                <th className="px-2 py-1 text-left">Grade</th>
                                <th className="px-2 py-1 text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validationResult.rm.not_in_master.map((item, idx) => (
                                <tr key={idx} className="border-t border-yellow-100">
                                  <td className="px-2 py-1">{item.category}</td>
                                  <td className="px-2 py-1">{item.type}</td>
                                  <td className="px-2 py-1">{item.grade}</td>
                                  <td className="px-2 py-1 text-right">{item.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PM Unmatched */}
                  {validationResult.pm.not_in_master.length > 0 && (
                    <div className="mb-3">
                      <button 
                        onClick={() => toggleSection('pm_unmatched')}
                        className="flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900"
                      >
                        {expandedSections.pm_unmatched ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        Packing Materials ({validationResult.pm.not_in_master.length})
                      </button>
                      {expandedSections.pm_unmatched && (
                        <div className="mt-2 bg-white rounded border border-yellow-200 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-yellow-100">
                              <tr>
                                <th className="px-2 py-1 text-left">Category</th>
                                <th className="px-2 py-1 text-left">Item Code</th>
                                <th className="px-2 py-1 text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validationResult.pm.not_in_master.map((item, idx) => (
                                <tr key={idx} className="border-t border-yellow-100">
                                  <td className="px-2 py-1">{item.category}</td>
                                  <td className="px-2 py-1 font-mono">{item.item_code}</td>
                                  <td className="px-2 py-1 text-right">{item.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SFG Unmatched */}
                  {validationResult.sfg.not_in_master.length > 0 && (
                    <div>
                      <button 
                        onClick={() => toggleSection('sfg_unmatched')}
                        className="flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900"
                      >
                        {expandedSections.sfg_unmatched ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        SFG Items ({validationResult.sfg.not_in_master.length})
                      </button>
                      {expandedSections.sfg_unmatched && (
                        <div className="mt-2 bg-white rounded border border-yellow-200 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-yellow-100">
                              <tr>
                                <th className="px-2 py-1 text-left">Item Name</th>
                                <th className="px-2 py-1 text-left">SFG Code</th>
                                <th className="px-2 py-1 text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validationResult.sfg.not_in_master.map((item, idx) => (
                                <tr key={idx} className="border-t border-yellow-100">
                                  <td className="px-2 py-1">{item.item_name}</td>
                                  <td className="px-2 py-1 font-mono">{item.sfg_code}</td>
                                  <td className="px-2 py-1 text-right">{item.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              uploadResult.success 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center mb-2">
                {uploadResult.success 
                  ? <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                  : <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                }
                <span className={`font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {uploadResult.message}
                </span>
              </div>
              {/* Show errors first if any */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="text-sm text-red-700 mt-2 mb-2 max-h-40 overflow-auto bg-red-100 p-2 rounded">
                  <div className="font-medium mb-1">Errors ({uploadResult.errors.length}):</div>
                  {uploadResult.errors.map((error, idx) => (
                    <div key={idx} className="text-xs">• {error}</div>
                  ))}
                </div>
              )}
              {/* Show success details */}
              {uploadResult.details && uploadResult.details.length > 0 && (
                <div className="text-sm text-green-700 mt-2 max-h-32 overflow-auto">
                  <div className="font-medium mb-1">Successful ({uploadResult.details.length}):</div>
                  {uploadResult.details.map((detail, idx) => (
                    <div key={idx} className="text-xs">✓ {detail}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {totalItems > 0 && !validationResult && 'Click "Validate" to check items against master data'}
            {validationResult && `${totalMatched} items ready to upload`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
            {totalItems > 0 && !validationResult && (
              <button
                onClick={validateItems}
                disabled={isValidating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Validate Items
              </button>
            )}
            {validationResult && totalMatched > 0 && (
              <button
                onClick={uploadMatchedItems}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload {totalMatched} Matched Items
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkOpeningStockUpload;
