'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { misAPI, rawMaterialAPI } from '../../../lib/supabase';
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
  // For RM items
  rmType?: string; // regrind or HP
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
    department: '',
    typeOfIssue: '',
    items: [
      { id: '1', itemCode: '', itemDescription: '', uom: '', currentStock: '', issueQty: '', remarks: '' }
    ]
  });

  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Stock posting state
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<'NOT_SAVED' | 'SAVED' | 'POSTING' | 'POSTED' | 'ERROR'>('NOT_SAVED');
  const [stockMessage, setStockMessage] = useState<string>('');
  
  // Stock items and balances
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [stockBalances, setStockBalances] = useState<Record<string, number>>({});
  const [loadingStock, setLoadingStock] = useState(false);
  
  // RM Type dropdown data (HP, Regrind, etc. with stock)
  const [rmTypesWithStock, setRmTypesWithStock] = useState<Array<{ type: string; stock: number }>>([]);
  const [selectedRmType, setSelectedRmType] = useState<string>('');
  const [gradesForRmType, setGradesForRmType] = useState<Array<{ itemCode: string; grade: string; stock: number; supplier?: string }>>([]);
  // Raw materials master data
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);

  // Generate document number
  useEffect(() => {
    const generateDocNo = async () => {
      try {
        const docNo = await generateDocumentNumber(FORM_CODES.MIS, date);
        setDocNo(docNo);
      } catch (error) {
        console.error('Error generating document number:', error);
      }
    };
    generateDocNo();
  }, [date]);

  const handleInputChange = (field: keyof Omit<MISFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // When type of issue changes, auto-fill the table
    if (field === 'typeOfIssue' && value) {
      fetchItemsByType(value as 'RM' | 'PM' | 'Spares');
    }
  };

  // Fetch items by type and populate table
  const fetchItemsByType = async (type: 'RM' | 'PM' | 'SPARE') => {
    setLoadingStock(true);
    try {
      if (type === 'RM') {
        // For RM, fetch from raw_materials table to get types (HP, ICP, etc.) and grades
        const rmData = await rawMaterialAPI.getAll();
        setRawMaterials(rmData);
        
        // Also fetch stock items and balances for RM
        const response = await fetch(`/api/admin/stock-items?item_type=RM`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const items = result.data;
          setStockItems(items);
          
          // Fetch stock balances for all items
          const balancePromises = items.map(async (item: any) => {
            try {
              const balanceRes = await fetch(`/api/stock/balance?item_code=${item.item_code}&total=true`);
              const balanceData = await balanceRes.json();
              // API returns { total: number } when total=true is set
              return { itemCode: item.item_code, balance: balanceData.total || balanceData.total_balance || 0, item };
            } catch (error) {
              return { itemCode: item.item_code, balance: 0, item };
            }
          });
          
          const balances = await Promise.all(balancePromises);
          const balanceMap: Record<string, number> = {};
          balances.forEach(b => {
            balanceMap[b.itemCode] = b.balance;
          });
          setStockBalances(balanceMap);
          
          // Group by RM type (HP, ICP, REGRIND, etc.) - extract from sub_category
          // sub_category might be "HP", "RM-HP", "REGRIND", etc.
          const typeGroups: Record<string, number> = {};
          balances.forEach(b => {
            let rmType = b.item.sub_category || 'Other';
            // Remove "RM-" prefix if present
            if (rmType.startsWith('RM-')) {
              rmType = rmType.replace('RM-', '');
            }
            if (!typeGroups[rmType]) {
              typeGroups[rmType] = 0;
            }
            typeGroups[rmType] += b.balance;
          });
          
          // Also add types from raw_materials that might not have stock yet
          const uniqueRmTypes = [...new Set(rmData.map((rm: any) => rm.type))];
          uniqueRmTypes.forEach(t => {
            if (!typeGroups[t]) {
              typeGroups[t] = 0;
            }
          });
          
          // Convert to array - show all types, sorted by stock descending
          const typesWithStock = Object.entries(typeGroups)
            .map(([type, stock]) => ({ type, stock }))
            .sort((a, b) => b.stock - a.stock); // Sort by stock descending
          
          setRmTypesWithStock(typesWithStock);
          
          // Reset table to empty
          setFormData(prev => ({
            ...prev,
            items: [{ id: '1', itemCode: '', itemDescription: '', uom: '', currentStock: '', issueQty: '', remarks: '' }]
          }));
        }
      } else {
        // For PM and SPARE, use the old logic
        let itemType: 'RM' | 'PM' | 'SFG' | 'FG' | 'SPARE' | undefined;
        if (type === 'PM') itemType = 'PM';
        if (type === 'SPARE') itemType = 'SPARE';
        
        let url = `/api/admin/stock-items`;
        if (itemType) {
          url += `?item_type=${itemType}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success && result.data) {
          let items = result.data;
          
          setStockItems(items);
          
          // Fetch stock balances for all items
          const balancePromises = items.map(async (item: any) => {
            try {
              const balanceRes = await fetch(`/api/stock/balance?item_code=${item.item_code}&total=true`);
              const balanceData = await balanceRes.json();
              // API returns { total: number } when total=true is set
              return { itemCode: item.item_code, balance: balanceData.total || balanceData.total_balance || 0 };
            } catch (error) {
              return { itemCode: item.item_code, balance: 0 };
            }
          });
          
          const balances = await Promise.all(balancePromises);
          const balanceMap: Record<string, number> = {};
          balances.forEach(b => {
            balanceMap[b.itemCode] = b.balance;
          });
          setStockBalances(balanceMap);
          
          // Auto-fill table with items that have stock > 0
          const itemsWithStock = items
            .filter((item: any) => (balanceMap[item.item_code] || 0) > 0)
            .slice(0, 10); // Limit to 10 items initially
          
          const newItems: MISItem[] = itemsWithStock.map((item: any, index: number) => ({
            id: (index + 1).toString(),
            itemCode: item.item_code || '',
            itemDescription: item.item_name || '',
            uom: item.unit_of_measure || '',
            currentStock: (balanceMap[item.item_code] || 0).toString(),
            issueQty: '',
            remarks: ''
          }));
          
          // If no items with stock, still show empty row
          if (newItems.length === 0) {
            setFormData(prev => ({
              ...prev,
              items: [{ id: '1', itemCode: '', itemDescription: '', uom: '', currentStock: '', issueQty: '', remarks: '' }]
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              items: newItems
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching items by type:', error);
    } finally {
      setLoadingStock(false);
    }
  };

  // Handle RM Type selection
  const handleRmTypeSelect = async (rmType: string) => {
    setSelectedRmType(rmType);
    
    // Get grades from raw_materials for this type
    const gradesFromRM = rawMaterials
      .filter((rm: any) => rm.type === rmType)
      .map((rm: any) => ({
        grade: rm.grade,
        supplier: rm.supplier
      }));
    
    // Find matching stock items - try different item_code formats
    // Could be: "PP-HP-HJ333MO", "RM-HP", "HP", etc.
    const matchingStockItems: Array<{ itemCode: string; grade: string; stock: number; supplier?: string }> = [];
    
    // First, check stock items that match this RM type
    stockItems.forEach((item: any) => {
      let itemSubCategory = item.sub_category || '';
      // Remove "RM-" prefix if present
      if (itemSubCategory.startsWith('RM-')) {
        itemSubCategory = itemSubCategory.replace('RM-', '');
      }
      
      if (itemSubCategory === rmType || item.sub_category === rmType) {
        const stock = stockBalances[item.item_code] || 0;
        // Try to extract grade from item_code or item_name
        let grade = item.item_code;
        if (item.item_code.includes('-')) {
          const parts = item.item_code.split('-');
          grade = parts[parts.length - 1]; // Last part is usually the grade
        }
        matchingStockItems.push({
          itemCode: item.item_code,
          grade: grade,
          stock: stock,
          supplier: item.category
        });
      }
    });
    
    // Also add grades from raw_materials that have matching stock items
    gradesFromRM.forEach((rm: any) => {
      // Check if this grade has stock (look for item codes like PP-HP-{grade})
      const matchingItem = stockItems.find((item: any) => 
        item.item_code.includes(rm.grade) || 
        item.item_name.includes(rm.grade)
      );
      if (matchingItem && !matchingStockItems.find(m => m.grade === rm.grade)) {
        const stock = stockBalances[matchingItem.item_code] || 0;
        matchingStockItems.push({
          itemCode: matchingItem.item_code,
          grade: rm.grade,
          stock: stock,
          supplier: rm.supplier
        });
      }
    });
    
    // If no specific grades found, show the general RM type item
    if (matchingStockItems.length === 0) {
      const generalItem = stockItems.find((item: any) => {
        const subCat = (item.sub_category || '').replace('RM-', '');
        return subCat === rmType || item.item_code === `RM-${rmType}`;
      });
      if (generalItem) {
        matchingStockItems.push({
          itemCode: generalItem.item_code,
          grade: generalItem.item_name || rmType,
          stock: stockBalances[generalItem.item_code] || 0
        });
      }
    }
    
    // Sort by stock descending
    matchingStockItems.sort((a, b) => b.stock - a.stock);
    
    setGradesForRmType(matchingStockItems);
    
    // Auto-fill the first row with RM type as item name
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, index) => 
        index === 0 
          ? { ...item, itemDescription: rmType, itemCode: '', currentStock: '', uom: 'KG' }
          : item
      )
    }));
  };

  // Handle Grade (Item Code) selection
  const handleGradeSelect = (itemId: string, itemCode: string) => {
    const selectedGrade = gradesForRmType.find(g => g.itemCode === itemCode);
    if (selectedGrade) {
      handleItemChange(itemId, 'itemCode', itemCode);
      handleItemChange(itemId, 'currentStock', selectedGrade.stock.toString());
    }
  };

  // Fetch current stock when item code changes (for PM and Spares)
  const fetchCurrentStock = async (itemCode: string, itemId: string) => {
    if (!itemCode) {
      handleItemChange(itemId, 'currentStock', '');
      return;
    }
    
    // For RM, stock is already set when grade is selected
    if (formData.typeOfIssue === 'RM') {
      return;
    }
    
    try {
      const response = await fetch(`/api/stock/balance?item_code=${itemCode}&total=true`);
      const result = await response.json();
      const balance = result.total_balance || 0;
      
      handleItemChange(itemId, 'currentStock', balance.toString());
    } catch (error) {
      console.error('Error fetching current stock:', error);
      handleItemChange(itemId, 'currentStock', '0');
    }
  };

  const handleItemChange = (id: string, field: keyof MISItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
    
    // When item code changes, fetch current stock
    if (field === 'itemCode') {
      fetchCurrentStock(value, id);
    }
  };

  const addItemRow = () => {
    const newItem: MISItem = {
      id: Date.now().toString(),
      itemCode: '',
      itemDescription: formData.typeOfIssue === 'RM' && selectedRmType ? selectedRmType : '',
      uom: formData.typeOfIssue === 'RM' ? 'KG' : '',
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
        alert('MIS saved successfully! Click "Post to Stock" to update inventory.');
      }
    } catch (error) {
      console.error('Error saving MIS:', error);
      alert('Error saving MIS. Please try again.');
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

  const handleNewForm = () => {
    setFormData({
      issueNo: '',
      issueDate: new Date().toISOString().split('T')[0],
      department: '',
      typeOfIssue: '',
      items: [{ id: '1', itemCode: '', itemDescription: '', uom: '', currentStock: '', issueQty: '', remarks: '' }]
    });
    setDate(new Date().toISOString().split('T')[0]);
    setSavedDocumentId(null);
    setStockStatus('NOT_SAVED');
    setStockMessage('');
    setStockItems([]);
    setStockBalances({});
    setRmTypesWithStock([]);
    setSelectedRmType('');
    setGradesForRmType([]);
    setRawMaterials([]);
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department :-
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Type of Issue Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type of Issue :-
          </label>
          <select
            value={formData.typeOfIssue}
            onChange={(e) => {
              handleInputChange('typeOfIssue', e.target.value);
              setSelectedRmType('');
              setGradesForRmType([]);
            }}
            className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select Type</option>
            <option value="RM">RM (Raw Materials)</option>
            <option value="PM">PM (Packing Materials)</option>
            <option value="SPARE">Spare Parts</option>
          </select>
          {loadingStock && (
            <span className="ml-2 text-sm text-gray-500">Loading items...</span>
          )}
        </div>

        {/* RM Type Dropdown (only for RM) */}
        {formData.typeOfIssue === 'RM' && rmTypesWithStock.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RM Type :-
            </label>
            <select
              value={selectedRmType}
              onChange={(e) => handleRmTypeSelect(e.target.value)}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select RM Type</option>
              {rmTypesWithStock.map(({ type, stock }) => (
                <option key={type} value={type}>
                  {type} (Stock: {stock.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Items Table - Only show when type is selected */}
        {formData.typeOfIssue && (
          <div className="mb-6 print:mb-4 overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12">Sl.</th>
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
                    {formData.typeOfIssue === 'RM' && selectedRmType && gradesForRmType.length > 0 ? (
                      <select
                        value={item.itemCode}
                        onChange={(e) => handleGradeSelect(item.id, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Grade</option>
                        {gradesForRmType.map((grade) => (
                          <option key={grade.itemCode} value={grade.itemCode}>
                            {grade.grade}{grade.supplier ? ` - ${grade.supplier}` : ''} (Stock: {grade.stock.toFixed(2)})
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
