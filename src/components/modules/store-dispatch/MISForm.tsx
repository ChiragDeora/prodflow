'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { misAPI, rawMaterialAPI, packingMaterialAPI } from '../../../lib/supabase';
import PrintHeader from '../../shared/PrintHeader';
import { generateDocumentNumber, FORM_CODES } from '../../../utils/formCodeUtils';

interface MISItem {
  id: string;
  itemCode: string;
  itemDescription: string;
  uom: string;
  currentStock: string;
  issueQty: string;
  remarks: string;
  // Sub-type selection (RM Type, PM Type, or Spares Type)
  subType?: string;
  grade?: string;
}

interface MISFormData {
  issueNo: string;
  issueDate: string;
  department: string;
  typeOfIssue: 'RM' | 'PM' | 'SPARE' | '';
  items: MISItem[];
}

const MISForm: React.FC = () => {
  const [formData, setFormData] = useState<MISFormData>({
    issueNo: '',
    issueDate: new Date().toISOString().split('T')[0],
    department: 'Production',
    typeOfIssue: '',
    items: [
      { id: '1', itemCode: '', itemDescription: '', uom: '', currentStock: '', issueQty: '', remarks: '' }
    ]
  });

  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Department selection state
  const [deptType, setDeptType] = useState<'Production' | 'Custom'>('Production');
  const [customDept, setCustomDept] = useState('');

  // Stock posting state
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<'NOT_SAVED' | 'SAVED' | 'POSTING' | 'POSTED' | 'ERROR'>('NOT_SAVED');
  const [stockMessage, setStockMessage] = useState<string>('');
  
  // Loading state per row
  const [loadingStock, setLoadingStock] = useState<Record<string, boolean>>({});
  
  // Sub-types with stock (RM Types, PM Categories, Spares Categories)
  // Format: { type: string; stock: number }[]
  const [subTypesWithStock, setSubTypesWithStock] = useState<Array<{ type: string; stock: number }>>([]);
  // Selected sub-type per row (itemId -> subType)
  const [selectedSubType, setSelectedSubType] = useState<Record<string, string>>({});
  // Items/grades for sub-type per row (itemId -> items[])
  const [itemsForSubType, setItemsForSubType] = useState<Record<string, Array<{ itemCode: string; grade: string; stock: number; supplier?: string }>>>({});
  // Raw materials master data
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  // Packing materials master data
  const [packingMaterials, setPackingMaterials] = useState<any[]>([]);
  // Stock items and balances per type
  const [stockItemsByType, setStockItemsByType] = useState<Record<string, any[]>>({});
  const [stockBalancesByType, setStockBalancesByType] = useState<Record<string, Record<string, number>>>({});

  // Function to generate document number
  const generateDocNo = async (dateValue: string) => {
    try {
      // Generate doc_no using the standard format: FORM_CODE + YEAR + FORM_NO (e.g., 50025260001)
      const newDocNo = await generateDocumentNumber(FORM_CODES.MIS, dateValue);
      setDocNo(newDocNo);
      
      // Issue No uses the same generated document number for consistency
      setFormData(prev => ({ ...prev, issueNo: newDocNo }));
    } catch (error) {
      console.error('Error generating document number:', error);
    }
  };

  // Generate document number on initial load and when date changes
  useEffect(() => {
    generateDocNo(date);
  }, [date]);

  const handleInputChange = (field: keyof Omit<MISFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // When type of issue changes, fetch sub-types for that type
    if (field === 'typeOfIssue' && value) {
      fetchSubTypesByMainType(value as 'RM' | 'PM' | 'SPARE');
      // Clear all row-level selections
      setSelectedSubType({});
      setItemsForSubType({});
      // Reset all items
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item => ({
          ...item,
          itemCode: '',
          itemDescription: '',
          currentStock: '',
          uom: '',
          subType: ''
        }))
      }));
    }
  };

  // Fetch sub-types (RM Types, PM Categories, Spares Categories) by main type - optimized
  const fetchSubTypesByMainType = async (type: 'RM' | 'PM' | 'SPARE') => {
    setLoadingStock(prev => ({ ...prev, ['main']: true }));
    try {
      if (type === 'RM') {
        // For RM, fetch raw materials types first (cached)
        if (rawMaterials.length === 0) {
          const rmData = await rawMaterialAPI.getAll();
          setRawMaterials(rmData);
        }
        
        // Use batch API to get all RM balances at STORE location
        const balanceResponse = await fetch(`/api/stock/balance?item_type=RM&location=STORE`);
        const balanceResult = await balanceResponse.json();
        
        if (balanceResult.success && balanceResult.data) {
          // Aggregate balances by item_code and group by sub_category
          const subTypeGroups: Record<string, number> = {};
          
          balanceResult.data.forEach((balance: any) => {
            let rmType = balance.sub_category || 'Other';
            // Remove "RM-" prefix if present
            if (rmType.startsWith('RM-')) {
              rmType = rmType.replace('RM-', '');
            }
            if (!subTypeGroups[rmType]) {
              subTypeGroups[rmType] = 0;
            }
            subTypeGroups[rmType] += balance.current_balance || 0;
          });
          
          // Also add types from raw_materials that might not have stock yet
          const uniqueRmTypes = [...new Set(rawMaterials.map((rm: any) => rm.type))];
          uniqueRmTypes.forEach(t => {
            if (!subTypeGroups[t]) {
              subTypeGroups[t] = 0;
            }
          });
          
          // Convert to array - show all sub-types, sorted by stock descending
          const subTypesWithStockArray = Object.entries(subTypeGroups)
            .map(([type, stock]) => ({ type, stock }))
            .sort((a, b) => b.stock - a.stock);
          
          setSubTypesWithStock(subTypesWithStockArray);
        }
      } else if (type === 'PM') {
        // For PM, fetch packing materials first (cached)
        if (packingMaterials.length === 0) {
          const pmData = await packingMaterialAPI.getAll();
          setPackingMaterials(pmData);
        }
        
        // Fetch only stock items (not balances) to get categories quickly
        const stockItemsResponse = await fetch(`/api/admin/stock-items?item_type=PM`);
        const stockItemsResult = await stockItemsResponse.json();
        
        if (stockItemsResult.success && stockItemsResult.data) {
          // Group by category from stock items
          const subTypeGroups: Record<string, number> = {};
          
          // Get unique categories from stock items
          const categories = new Set<string>();
          stockItemsResult.data.forEach((item: any) => {
            if (item.category) {
              categories.add(item.category);
            }
          });
          
          // Initialize all categories with 0 stock (we'll fetch balances on-demand)
          categories.forEach(cat => {
            subTypeGroups[cat] = 0;
          });
          
          // Also add categories from packing_materials that might not have stock yet
          const uniquePmCategories = [...new Set(packingMaterials.map((pm: any) => pm.category))];
          uniquePmCategories.forEach(cat => {
            if (cat && !subTypeGroups[cat]) {
              subTypeGroups[cat] = 0;
            }
          });
          
          // Convert to array - show all categories
          const subTypesWithStockArray = Object.entries(subTypeGroups)
            .map(([type, stock]) => ({ type, stock }))
            .sort((a, b) => a.type.localeCompare(b.type)); // Sort alphabetically
          
          setSubTypesWithStock(subTypesWithStockArray);
        }
      } else if (type === 'SPARE') {
        // For SPARE, fetch only stock items to get categories quickly
        const stockItemsResponse = await fetch(`/api/admin/stock-items?item_type=SPARE`);
        const stockItemsResult = await stockItemsResponse.json();
        
        if (stockItemsResult.success && stockItemsResult.data) {
          // Group by category from stock items
          const subTypeGroups: Record<string, number> = {};
          
          // Get unique categories from stock items
          const categories = new Set<string>();
          stockItemsResult.data.forEach((item: any) => {
            if (item.category) {
              categories.add(item.category);
            }
          });
          
          // Initialize all categories with 0 stock (we'll fetch balances on-demand)
          categories.forEach(cat => {
            subTypeGroups[cat] = 0;
          });
          
          // Convert to array - show all categories
          const subTypesWithStockArray = Object.entries(subTypeGroups)
            .map(([type, stock]) => ({ type, stock }))
            .sort((a, b) => a.type.localeCompare(b.type)); // Sort alphabetically
          
          setSubTypesWithStock(subTypesWithStockArray);
        }
      }
    } catch (error) {
      console.error('Error fetching sub-types by main type:', error);
      // Set empty array on error so UI doesn't break
      setSubTypesWithStock([]);
    } finally {
      setLoadingStock(prev => ({ ...prev, ['main']: false }));
    }
  };

  // Refresh stock data after posting - updates current stock values in the form
  const refreshStockData = async (type: 'RM' | 'PM' | 'SPARE') => {
    try {
      // Fetch updated balances from STORE location (not total across all locations)
      const balanceResponse = await fetch(`/api/stock/balance?item_type=${type}&location=STORE`);
      const balanceResult = await balanceResponse.json();
      
      if (balanceResult.success && balanceResult.data) {
        // Create updated balance map
        const newBalanceMap: Record<string, number> = {};
        balanceResult.data.forEach((b: any) => {
          newBalanceMap[b.item_code] = (newBalanceMap[b.item_code] || 0) + (b.current_balance || 0);
        });
        
        // Update stock balances state
        setStockBalancesByType(prev => ({ ...prev, [type]: newBalanceMap }));
        
        // Update current stock values in form items
        setFormData(prev => ({
          ...prev,
          items: prev.items.map(item => {
            if (item.itemCode && newBalanceMap[item.itemCode] !== undefined) {
              return {
                ...item,
                currentStock: String(newBalanceMap[item.itemCode])
              };
            }
            return item;
          })
        }));
        
        // Also update sub-types stock display
        if (type === 'RM') {
          const subTypeGroups: Record<string, number> = {};
          balanceResult.data.forEach((balance: any) => {
            let rmType = balance.sub_category || 'Other';
            if (rmType.startsWith('RM-')) {
              rmType = rmType.replace('RM-', '');
            }
            if (!subTypeGroups[rmType]) {
              subTypeGroups[rmType] = 0;
            }
            subTypeGroups[rmType] += balance.current_balance || 0;
          });
          
          setSubTypesWithStock(prev => 
            prev.map(st => ({
              ...st,
              stock: subTypeGroups[st.type] || 0
            }))
          );
        }
        
        // Update items in itemsForSubType with new stock values
        setItemsForSubType(prev => {
          const updated: Record<string, Array<{ itemCode: string; grade: string; stock: number; supplier?: string }>> = {};
          Object.entries(prev).forEach(([itemId, items]) => {
            updated[itemId] = items.map(item => ({
              ...item,
              stock: newBalanceMap[item.itemCode] || 0
            }));
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Error refreshing stock data:', error);
    }
  };

  // Handle sub-type selection for a specific row (RM Type, PM Category, or Spares Category)
  const handleSubTypeSelect = async (itemId: string, subType: string) => {
    setSelectedSubType(prev => ({ ...prev, [itemId]: subType }));
    setLoadingStock(prev => ({ ...prev, [itemId]: true }));
    
    const mainType = formData.typeOfIssue;
    if (!mainType) return;
    
    try {
      // For PM and SPARE, only fetch stock items (balances will be fetched on-demand when item is selected)
      // For RM, we still need balances to show stock
      if (mainType === 'RM') {
        // Fetch stock items and balances for RM
        const [stockItemsRes, balanceRes] = await Promise.all([
          fetch(`/api/admin/stock-items?item_type=RM`),
          fetch(`/api/stock/balance?item_type=RM&location=STORE`)
        ]);
        
        const stockItemsResult = await stockItemsRes.json();
        const balanceResult = await balanceRes.json();
        
        if (stockItemsResult.success && stockItemsResult.data && balanceResult.success && balanceResult.data) {
          const stockItems = stockItemsResult.data;
          const balances = balanceResult.data;
          
          // Create a map of item_code -> balance for quick lookup
          const balanceMap: Record<string, number> = {};
          balances.forEach((b: any) => {
            balanceMap[b.item_code] = (balanceMap[b.item_code] || 0) + (b.current_balance || 0);
          });
          
          // Store for future use
          setStockItemsByType(prev => ({ ...prev, [mainType]: stockItems }));
          setStockBalancesByType(prev => ({ ...prev, [mainType]: balanceMap }));
          
          const matchingItems: Array<{ itemCode: string; grade: string; stock: number; supplier?: string }> = [];
          
          // Get grades from raw_materials for this type
          const gradesFromRM = rawMaterials
            .filter((rm: any) => rm.type === subType)
            .map((rm: any) => ({
              grade: rm.grade,
              supplier: rm.supplier
            }));
          
          // Find matching stock items
          stockItems.forEach((item: any) => {
            let itemSubCategory = item.sub_category || '';
            if (itemSubCategory.startsWith('RM-')) {
              itemSubCategory = itemSubCategory.replace('RM-', '');
            }
            
            if (itemSubCategory === subType || item.sub_category === subType) {
              const stock = balanceMap[item.item_code] || 0;
              let grade = item.item_code;
              if (item.item_code.includes('-')) {
                const parts = item.item_code.split('-');
                grade = parts[parts.length - 1];
              }
              matchingItems.push({
                itemCode: item.item_code,
                grade: grade,
                stock: stock,
                supplier: item.category
              });
            }
          });
          
          // Also add grades from raw_materials
          gradesFromRM.forEach((rm: any) => {
            const matchingItem = stockItems.find((item: any) => 
              item.item_code.includes(rm.grade) || item.item_name.includes(rm.grade)
            );
            if (matchingItem && !matchingItems.find(m => m.grade === rm.grade)) {
              matchingItems.push({
                itemCode: matchingItem.item_code,
                grade: rm.grade,
                stock: balanceMap[matchingItem.item_code] || 0,
                supplier: rm.supplier
              });
            }
          });
          
          // Sort by stock descending
          matchingItems.sort((a, b) => b.stock - a.stock);
          
          setItemsForSubType(prev => ({ ...prev, [itemId]: matchingItems }));
        }
      } else {
        // For PM and SPARE, only fetch stock items (fast)
        const stockItemsRes = await fetch(`/api/admin/stock-items?item_type=${mainType}`);
        const stockItemsResult = await stockItemsRes.json();
        
        if (stockItemsResult.success && stockItemsResult.data) {
          const stockItems = stockItemsResult.data;
          
          // Store for future use
          setStockItemsByType(prev => ({ ...prev, [mainType]: stockItems }));
          
          const matchingItems: Array<{ itemCode: string; grade: string; stock: number; supplier?: string }> = [];
          
          // Find items matching this category
          stockItems.forEach((item: any) => {
            if (item.category === subType) {
              matchingItems.push({
                itemCode: item.item_code,
                grade: item.item_name || item.item_code,
                stock: 0, // Will be fetched on-demand when item is selected
                supplier: item.category
              });
            }
          });
          
          // Sort alphabetically
          matchingItems.sort((a, b) => a.grade.localeCompare(b.grade));
          
          setItemsForSubType(prev => ({ ...prev, [itemId]: matchingItems }));
        }
      }
      
      // Auto-fill the row
      handleItemChange(itemId, 'itemDescription', subType);
      handleItemChange(itemId, 'itemCode', '');
      handleItemChange(itemId, 'currentStock', '');
      handleItemChange(itemId, 'uom', mainType === 'RM' ? 'KG' : '');
    } catch (error) {
      console.error('Error fetching sub-type items:', error);
    } finally {
      setLoadingStock(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Handle Item Code selection
  const handleItemCodeSelect = (itemId: string, itemCode: string) => {
    const items = itemsForSubType[itemId] || [];
    const selectedItem = items.find(i => i.itemCode === itemCode);
    if (selectedItem) {
      handleItemChange(itemId, 'itemCode', itemCode);
      handleItemChange(itemId, 'currentStock', selectedItem.stock.toString());
    }
  };

  // Fetch current stock when item code changes (for PM and Spares)
  const fetchCurrentStock = async (itemCode: string, itemId: string, typeOfIssue?: string) => {
    if (!itemCode) {
      handleItemChange(itemId, 'currentStock', '');
      return;
    }
    
    // For RM, stock is already set when grade is selected
    if (typeOfIssue === 'RM') {
      return;
    }
    
    try {
      // Fetch balance from STORE location specifically (not total across all locations)
      const response = await fetch(`/api/stock/balance?item_code=${itemCode}&location=STORE`);
      const result = await response.json();
      // Sum up all balances for this item code at STORE
      const balance = result.success && result.data 
        ? result.data.reduce((sum: number, b: any) => sum + (b.current_balance || 0), 0)
        : 0;
      
      handleItemChange(itemId, 'currentStock', balance.toString());
    } catch (error) {
      console.error('Error fetching current stock:', error);
      handleItemChange(itemId, 'currentStock', '0');
    }
  };

  const handleItemChange = (id: string, field: keyof MISItem, value: string) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      );
      
      // When sub-type changes, fetch items for that sub-type
      if (field === 'subType' && value) {
        handleSubTypeSelect(id, value);
      }
      
      // When item code changes, fetch current stock
      if (field === 'itemCode') {
        fetchCurrentStock(value, id, formData.typeOfIssue);
      }
      
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const addItemRow = () => {
    const newItem: MISItem = {
      id: Date.now().toString(),
      itemCode: '',
      itemDescription: '',
      uom: '',
      currentStock: '',
      issueQty: '',
      remarks: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItemRow = (id: string) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
      // Clean up per-row state
      setSelectedSubType(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setItemsForSubType(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setLoadingStock(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const misData = {
        doc_no: docNo,
        date: date,
        dept_name: formData.department,
        issue_no: formData.issueNo,
        issue_date: formData.issueDate
      };

      const itemsData = formData.items
        .filter(item => item.itemDescription.trim() !== '' || item.itemCode.trim() !== '')
        .map(item => ({
          item_code: item.itemCode || undefined,
          description_of_material: item.itemDescription,
          uom: item.uom || undefined,
          required_qty: item.currentStock ? parseFloat(item.currentStock) : undefined,
          issue_qty: item.issueQty ? parseFloat(item.issueQty) : undefined,
          remarks: item.remarks || undefined
        }));

      const newMIS = await misAPI.create(misData, itemsData);
      
      if (newMIS) {
        setSavedDocumentId(newMIS.id);
        setStockStatus('SAVED');
        setStockMessage('');
        alert('Issue Slip saved successfully! Click "Post to Stock" to update inventory.');
      }
    } catch (error) {
      console.error('Error saving Issue Slip:', error);
      alert('Error saving Issue Slip. Please try again.');
    }
  };

  const handlePostToStock = async () => {
    if (!savedDocumentId) {
      alert('Please save the document first before posting to stock.');
      return;
    }
    
    setStockStatus('POSTING');
    setStockMessage('');
    
    try {
      const stockResponse = await fetch(`/api/stock/post/mis/${savedDocumentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posted_by: 'user' })
      });
      
      const stockResult = await stockResponse.json();
      
      if (stockResult.success) {
        setStockStatus('POSTED');
        let message = `Stock posted successfully! (${stockResult.entries_created || 0} entries created)`;
        if (stockResult.warnings && stockResult.warnings.length > 0) {
          message += `\nWarnings: ${stockResult.warnings.join(', ')}`;
        }
        setStockMessage(message);
        alert(message);
        
        // Refresh stock data to show updated current stock values
        if (formData.typeOfIssue) {
          await refreshStockData(formData.typeOfIssue);
        }
      } else {
        setStockStatus('ERROR');
        const errorMsg = stockResult.error?.message || 'Unknown error';
        setStockMessage(`Failed: ${errorMsg}. Items must exist in Stock Items master.`);
        alert(`Stock posting failed: ${errorMsg}\n\nNote: Items must exist in Stock Items master for posting to work.`);
      }
    } catch (error) {
      console.error('Error posting to stock:', error);
      setStockStatus('ERROR');
      setStockMessage('Error posting to stock. Please try again.');
      alert('Error posting to stock. Please try again.');
    }
  };

  const handleNewForm = async () => {
    const newDate = new Date().toISOString().split('T')[0];
    setFormData({
      issueNo: '',
      issueDate: newDate,
      department: 'Production',
      typeOfIssue: '',
      items: [{ id: '1', itemCode: '', itemDescription: '', uom: '', currentStock: '', issueQty: '', remarks: '' }]
    });
    setDeptType('Production');
    setCustomDept('');
    setDate(newDate);
    setSavedDocumentId(null);
    setStockStatus('NOT_SAVED');
    setStockMessage('');
    setStockItemsByType({});
    setStockBalancesByType({});
    setSubTypesWithStock([]);
    setSelectedSubType({});
    setItemsForSubType({});
    setRawMaterials([]);
    setPackingMaterials([]);
    setLoadingStock({});
    
    // Regenerate document number for the new form
    await generateDocNo(newDate);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-6xl mx-auto">
      <PrintHeader docNo={docNo} date={date} />
      
      <form onSubmit={handleSubmit} className="print:p-8">
        {/* Main Title */}
        <div className="text-center mb-6 print:mb-4">
          <h2 className="text-3xl font-bold text-gray-900">MATERIAL ISSUE SLIP</h2>
        </div>

        {/* Issue No, Date, and Department Section */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          {/* Left: Issue No and Date */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue No. :-
              </label>
              <input
                type="text"
                value={formData.issueNo}
                onChange={(e) => handleInputChange('issueNo', e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date :-
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => handleInputChange('issueDate', e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Right: Department */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department :-
            </label>
            <select
              value={deptType}
              onChange={(e) => {
                const newType = e.target.value as 'Production' | 'Custom';
                setDeptType(newType);
                if (newType === 'Production') {
                  setFormData(prev => ({ ...prev, department: 'Production' }));
                  setCustomDept('');
                } else {
                  setFormData(prev => ({ ...prev, department: customDept }));
                }
              }}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Production">Production</option>
              <option value="Custom">Custom</option>
            </select>
            {deptType === 'Custom' && (
              <input
                type="text"
                value={customDept}
                onChange={(e) => {
                  setCustomDept(e.target.value);
                  setFormData(prev => ({ ...prev, department: e.target.value }));
                }}
                placeholder="Enter custom department name"
                className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            )}
          </div>
        </div>

        {/* Type of Issue Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type of Issue :-
          </label>
          <select
            value={formData.typeOfIssue}
            onChange={(e) => handleInputChange('typeOfIssue', e.target.value)}
            className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select Type</option>
            <option value="RM">RM (Raw Materials)</option>
            <option value="PM">PM (Packing Materials)</option>
            <option value="SPARE">Spare Parts</option>
          </select>
          {loadingStock['main'] && (
            <span className="ml-2 text-sm text-gray-500">Loading...</span>
          )}
        </div>

        {/* Items Table */}
        {formData.typeOfIssue && (
          <div className="mb-6 print:mb-4 overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12">Sl.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">
                  {formData.typeOfIssue === 'RM' ? 'RM Type' : formData.typeOfIssue === 'PM' ? 'PM Type' : 'Spares Type'}
                </th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Item Code</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Item Description</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24">UOM</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Current Stock</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">ISSUE QTY.</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold">REMARKS</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-16 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-2 py-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-2 py-2">
                    {subTypesWithStock.length > 0 ? (
                      <select
                        value={selectedSubType[item.id] || ''}
                        onChange={(e) => handleItemChange(item.id, 'subType', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select {formData.typeOfIssue === 'RM' ? 'RM Type' : formData.typeOfIssue === 'PM' ? 'PM Type' : 'Spares Type'}</option>
                        {subTypesWithStock.map(({ type, stock }) => (
                          <option key={type} value={type}>
                            {type} (Stock: {stock.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                    {loadingStock[item.id] && (
                      <span className="text-xs text-gray-500 block mt-1">Loading...</span>
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    {selectedSubType[item.id] && itemsForSubType[item.id] && itemsForSubType[item.id].length > 0 ? (
                      <select
                        value={item.itemCode}
                        onChange={(e) => handleItemCodeSelect(item.id, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Item</option>
                        {itemsForSubType[item.id].map((itemOption) => (
                          <option key={itemOption.itemCode} value={itemOption.itemCode}>
                            {itemOption.grade}{itemOption.supplier ? ` - ${itemOption.supplier}` : ''} (Stock: {itemOption.stock.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={item.itemCode}
                        onChange={(e) => handleItemChange(item.id, 'itemCode', e.target.value)}
                        className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      />
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.itemDescription}
                      onChange={(e) => handleItemChange(item.id, 'itemDescription', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      required
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.uom}
                      onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.currentStock}
                      readOnly
                      className="w-full px-2 py-1 border-none bg-gray-50"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={item.issueQty}
                      onChange={(e) => handleItemChange(item.id, 'issueQty', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                      className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center print:hidden">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={addItemRow}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 print:hidden"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
      </div>
        )}

        {/* Stock Status Message */}
        {stockMessage && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            stockStatus === 'POSTED' ? 'bg-green-50 text-green-800 border border-green-200' :
            stockStatus === 'ERROR' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {stockStatus === 'POSTED' && <CheckCircle className="w-5 h-5" />}
            <span className="text-sm">{stockMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6 print:hidden">
          {savedDocumentId && (
            <button
              type="button"
              onClick={handleNewForm}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              New Form
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            type="submit"
            disabled={stockStatus === 'POSTED'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            type="button"
            onClick={handlePostToStock}
            disabled={!savedDocumentId || stockStatus === 'POSTING' || stockStatus === 'POSTED'}
            className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
              stockStatus === 'POSTED' 
                ? 'bg-green-600 text-white cursor-not-allowed'
                : !savedDocumentId
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {stockStatus === 'POSTING' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : stockStatus === 'POSTED' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {stockStatus === 'POSTED' ? 'Posted' : stockStatus === 'POSTING' ? 'Posting...' : 'Post to Stock'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MISForm;
