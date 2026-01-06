'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { materialIndentSlipAPI, rawMaterialAPI, packingMaterialAPI } from '../../../lib/supabase';
import type { RawMaterial, PackingMaterial } from '../../../lib/supabase/types';
import PrintHeader from '../../shared/PrintHeader';
import PartyNameSelect from './PartyNameSelect';
import { useStoreDispatch, MaterialIndentItem } from './StoreDispatchContext';
import { generateDocumentNumber, FORM_CODES } from '../../../utils/formCodeUtils';

const MaterialIndentSlipForm: React.FC = () => {
  const {
    materialIndentFormData: formData,
    setMaterialIndentFormData: setFormData,
    updateMaterialIndentField,
    resetMaterialIndentForm,
  } = useStoreDispatch();

  // Item selection state
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [packingMaterials, setPackingMaterials] = useState<PackingMaterial[]>([]);
  const [rmTypes, setRmTypes] = useState<string[]>([]);
  const [pmCategories, setPmCategories] = useState<string[]>([]);
  const [selectedRmType, setSelectedRmType] = useState<Record<string, string>>({}); // itemId -> rmType
  const [selectedPmCategory, setSelectedPmCategory] = useState<Record<string, string>>({}); // itemId -> pmCategory
  const [availableGrades, setAvailableGrades] = useState<Record<string, RawMaterial[]>>({}); // rmType -> grades
  const [availablePmItems, setAvailablePmItems] = useState<Record<string, PackingMaterial[]>>({}); // pmCategory -> items

  // Fetch raw materials and packing materials on mount
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        // Fetch raw materials
        const rmMaterials = await rawMaterialAPI.getAll();
        setRawMaterials(rmMaterials);
        
        // Extract unique RM types
        const types = Array.from(new Set(rmMaterials.map(rm => rm.type))).sort();
        setRmTypes(types);
        
        // Group by type for grade selection
        const gradesByType: Record<string, RawMaterial[]> = {};
        types.forEach(type => {
          gradesByType[type] = rmMaterials.filter(rm => rm.type === type);
        });
        setAvailableGrades(gradesByType);

        // Fetch packing materials
        const pmMaterials = await packingMaterialAPI.getAll();
        setPackingMaterials(pmMaterials);
        
        // Extract unique PM categories
        const categories = Array.from(new Set(pmMaterials.map(pm => pm.category))).sort();
        setPmCategories(categories);
        
        // Group by category for item selection
        const itemsByCategory: Record<string, PackingMaterial[]> = {};
        categories.forEach(category => {
          itemsByCategory[category] = pmMaterials.filter(pm => pm.category === category);
        });
        setAvailablePmItems(itemsByCategory);
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };
    
    fetchMaterials();
  }, []);

  // Generate indent number
  useEffect(() => {
    const generateIdentNo = async () => {
      if (!formData.identNo) {
        try {
          const docNo = await generateDocumentNumber(FORM_CODES.MATERIAL_INDENT, formData.indentDate);
          updateMaterialIndentField('identNo', docNo);
        } catch (error) {
          console.error('Error generating indent number:', error);
        }
      }
    };
    generateIdentNo();
  }, [formData.indentDate, formData.identNo, updateMaterialIndentField]);

  const handleInputChange = (field: keyof Omit<typeof formData, 'items'>, value: string) => {
    updateMaterialIndentField(field as any, value);
  };

  const handlePartySelect = (party: { id: string; name: string }) => {
    setFormData({
      ...formData,
      partyId: party.id,
      partyName: party.name,
    });
  };

  const handleItemChange = (id: string, field: keyof MaterialIndentItem, value: string) => {
    const newItems = formData.items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    updateMaterialIndentField('items', newItems);
  };

  const handleItemChangeMultiple = (id: string, updates: Partial<MaterialIndentItem>) => {
    const newItems = formData.items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    updateMaterialIndentField('items', newItems);
  };

  const addItemRow = () => {
    const newItem: MaterialIndentItem = {
      id: Date.now().toString(),
      itemCode: '',
      itemName: '',
      dimension: '',
      packSize: '',
      qty: '',
      uom: '',
      partyName: '',
      colorRemarks: ''
    };
    updateMaterialIndentField('items', [...formData.items, newItem]);
  };

  const removeItemRow = (id: string) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter(item => item.id !== id);
      updateMaterialIndentField('items', newItems);
      // Clean up all selections for removed item
      setSelectedRmType(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setSelectedPmCategory(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slipData = {
        ident_no: formData.identNo,
        date: new Date().toISOString().split('T')[0],
        indent_date: formData.indentDate,
        tentative_required_date: formData.tentativeDate || undefined,
        party_name: formData.partyName || undefined,
        address: formData.address || undefined,
        state: formData.state || undefined,
        gst_no: formData.gstNo || undefined,
        dept_head_sign: formData.deptHeadSign || undefined,
        store_inch_sign: formData.storeInchSign || undefined,
        plant_head_sign: formData.plantHeadSign || undefined
      };

      const itemsData = formData.items
        .filter(item => item.itemName.trim() !== '' || item.itemCode.trim() !== '')
        .map(item => ({
          item_code: item.itemCode || undefined,
          item_name: item.itemName || undefined,
          dimension: item.dimension || undefined,
          pack_size: item.packSize || undefined,
          qty: item.qty ? parseFloat(item.qty) : undefined,
          uom: item.uom || undefined,
          party_name: item.partyName || undefined,
          color_remarks: item.colorRemarks || undefined
        }));

      await materialIndentSlipAPI.create(slipData, itemsData);
      alert('Material Indent Slip saved successfully!');
      
      // Reset form after successful save
      resetMaterialIndentForm();
    } catch (error) {
      console.error('Error saving material indent slip:', error);
      alert('Error saving material indent slip. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-6xl mx-auto print:shadow-none print:rounded-none print:p-0 print:max-w-none material-indent-print">
      <PrintHeader docNo={formData.identNo} date={formData.indentDate} />
      
      <form onSubmit={handleSubmit} className="print:p-4 print:relative">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6 print:mb-4">
          <div className="flex items-center gap-4">
            <img
              src="/dppl_comapct_logo.jpeg"
              alt="DEORA POLYPLAST LLP Logo"
              width={180}
              height={90}
              className="object-contain print:hidden"
              onError={(e) => {
                console.error('Failed to load logo:', e);
              }}
            />
          </div>
          <div className="text-right text-sm space-y-1">
            <div>
              <span className="font-semibold">Ident No:</span>{' '}
              <input
                type="text"
                value={formData.identNo}
                onChange={(e) => handleInputChange('identNo', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48 print:hidden"
                required
              />
              <span className="hidden print:inline">{formData.identNo}</span>
            </div>
            <div>
              <span className="font-semibold">Indent Date:</span>{' '}
              <input
                type="date"
                value={formData.indentDate}
                onChange={(e) => handleInputChange('indentDate', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:hidden"
                required
              />
              <span className="hidden print:inline">{formatDateForDisplay(formData.indentDate)}</span>
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-6 print:mb-3 print-section">
          <h2 className="text-3xl font-bold text-gray-900 print:text-2xl print:font-bold">MATERIAL INDENT SLIP</h2>
        </div>

        {/* Party Details Section */}
        <div className="mb-6 print:mb-3 print-section">
          <div className="grid grid-cols-2 gap-4 print:gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 print:font-semibold">
                Party Name:
              </label>
              <PartyNameSelect
                value={formData.partyName}
                partyId={formData.partyId}
                onChange={handlePartySelect}
                placeholder="Select or search party..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 print:font-semibold">
                State:
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:px-0 print:py-1 print:bg-transparent print:shadow-none print:border-b print:border-gray-400"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 print:font-semibold">
                Address:
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 print:border-none print:px-0 print:py-1 print:bg-transparent print:shadow-none print:border-b print:border-gray-400 print:h-auto print:min-h-[3rem]"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 print:font-semibold">
                GST No:
              </label>
              <input
                type="text"
                value={formData.gstNo}
                onChange={(e) => handleInputChange('gstNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:px-0 print:py-1 print:bg-transparent print:shadow-none print:border-b print:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 print:font-semibold">
                Material Type:
              </label>
              <select
                value={formData.materialType}
                onChange={(e) => {
                  handleInputChange('materialType', e.target.value);
                  // Reset items when changing material type
                  updateMaterialIndentField('items', [{ id: '1', itemCode: '', itemName: '', dimension: '', packSize: '', qty: '', uom: '', partyName: '', colorRemarks: '' }]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:px-0 print:py-1 print:bg-transparent print:shadow-none print:border-b print:border-gray-400"
              >
                <option value="">Select Material Type</option>
                <option value="RM">RM (Raw Materials)</option>
                <option value="PM">PM (Packing Materials)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Table - RM or PM based on selection */}
        {formData.materialType && (
          <div className="mb-6 print:mb-3 overflow-x-auto print-table-container print-section">
            {formData.materialType === 'RM' ? (
              /* RM Table */
              <table className="w-full border-collapse border border-gray-300 print:text-xs">
            <thead>
                  <tr className="bg-gray-100 print:bg-gray-200">
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12 print:px-1 print:py-1 print:text-xs">Sl.</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold print:px-1 print:py-1 print:text-xs">Item Name</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32 print:px-1 print:py-1 print:text-xs">Item Code</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24 print:px-1 print:py-1 print:text-xs">Qty.</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24 print:px-1 print:py-1 print:text-xs">UOM</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold print:px-1 print:py-1 print:text-xs">Color / Remarks</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-16 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => {
                    const currentRmType = item.itemName || selectedRmType[item.id] || '';
                const gradesForType = availableGrades[currentRmType] || [];
                
                return (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-2 py-2 text-center">{index + 1}</td>
                        <td className="border border-gray-300 px-2 py-2 print:px-1 print:py-1 print:text-xs">
                          <select
                            value={item.itemName || ''}
                            onChange={(e) => {
                              const selectedType = e.target.value;
                              setSelectedRmType(prev => ({ ...prev, [item.id]: selectedType }));
                              handleItemChangeMultiple(item.id, {
                                itemName: selectedType,
                                itemCode: '' // Reset item code when type changes
                              });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:px-0 print:py-0.5 print:bg-transparent print:shadow-none print:text-xs"
                          >
                            <option value="">Select RM Type</option>
                              {rmTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-gray-300 px-2 py-2 print:px-1 print:py-1 print:text-xs">
                          {currentRmType ? (
                        <select
                              value={item.itemCode || ''}
                              onChange={(e) => handleItemChange(item.id, 'itemCode', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:px-0 print:py-0.5 print:bg-transparent print:shadow-none print:text-xs"
                        >
                          <option value="">Select Grade</option>
                          {gradesForType.map(rm => (
                            <option key={rm.grade} value={rm.grade}>
                              {rm.grade} {rm.supplier ? `(${rm.supplier})` : ''}
                            </option>
                          ))}
                        </select>
                          ) : (
                            <input
                              type="text"
                              value={item.itemCode || ''}
                              onChange={(e) => handleItemChange(item.id, 'itemCode', e.target.value)}
                              className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-0.5 print:bg-transparent print:shadow-none print:text-xs"
                              placeholder="Select RM Type first"
                              disabled
                            />
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="text"
                            value={item.qty}
                            onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                            className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-1 print:bg-transparent print:shadow-none"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="text"
                            value={item.uom}
                            onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)}
                            className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-1 print:bg-transparent print:shadow-none"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="text"
                            value={item.colorRemarks}
                            onChange={(e) => handleItemChange(item.id, 'colorRemarks', e.target.value)}
                            className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-1 print:bg-transparent print:shadow-none"
                      />
                    </td>
                        <td className="border border-gray-300 px-2 py-2 text-center print:hidden print:px-1 print:py-1 print:text-xs">
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
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* PM Table */
              <table className="w-full border-collapse border border-gray-300 print:text-xs">
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-200">
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12 print:px-1 print:py-1 print:text-xs">Sl.</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold print:px-1 print:py-1 print:text-xs">Item Name</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32 print:px-1 print:py-1 print:text-xs">Item Code</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24 print:px-1 print:py-1 print:text-xs">Qty.</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-24 print:px-1 print:py-1 print:text-xs">UOM</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32 print:px-1 print:py-1 print:text-xs">Party Name</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32 print:px-1 print:py-1 print:text-xs">Dimensions</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold print:px-1 print:py-1 print:text-xs">Color / Remarks</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-16 print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => {
                    // Use itemName first, then fallback to selectedPmCategory state
                    const currentPmCategory = item.itemName || selectedPmCategory[item.id] || '';
                    // Get PM items for the current category - use both itemName and selectedPmCategory to ensure we have the right items
                    const categoryForLookup = item.itemName || selectedPmCategory[item.id] || '';
                    const pmItemsForCategory = availablePmItems[categoryForLookup] || [];
                    
                    return (
                      <tr key={item.id}>
                        <td className="border border-gray-300 px-2 py-2 text-center">{index + 1}</td>
                        <td className="border border-gray-300 px-2 py-2 print:px-1 print:py-1 print:text-xs">
                          <select
                            value={item.itemName || ''}
                            onChange={(e) => {
                              const selectedCategory = e.target.value;
                              // Update both state and form data
                              setSelectedPmCategory(prev => ({ ...prev, [item.id]: selectedCategory }));
                              handleItemChangeMultiple(item.id, {
                                itemName: selectedCategory,
                                itemCode: '', // Reset item code when category changes
                                partyName: '', // Reset brand when category changes
                                dimension: '' // Reset dimensions when category changes
                              });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:px-0 print:py-1 print:bg-transparent print:shadow-none"
                          >
                            <option value="">Select PM Category</option>
                            {pmCategories.map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-gray-300 px-2 py-2 print:px-1 print:py-1 print:text-xs">
                          {currentPmCategory ? (
                            <select
                              value={item.itemCode || ''}
                              onChange={(e) => {
                                const selectedItemCode = e.target.value;
                                
                                // Use selectedPmCategory state (updated synchronously) for lookup
                                // This ensures we have the correct category even if item.itemName hasn't updated yet
                                const lookupCategory = selectedPmCategory[item.id] || item.itemName || '';
                                const itemsForLookup = availablePmItems[lookupCategory] || [];
                                
                                // Find the selected PM item
                                const selectedPm = itemsForLookup.find(pm => pm.item_code === selectedItemCode);
                                
                                // Batch all updates together - ensure brand and dimensions are set correctly
                                handleItemChangeMultiple(item.id, {
                                  itemCode: selectedItemCode,
                                  partyName: selectedPm?.brand ? selectedPm.brand : '',
                                  dimension: selectedPm?.dimensions ? selectedPm.dimensions : ''
                                });
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none print:px-0 print:py-0.5 print:bg-transparent print:shadow-none print:text-xs"
                            >
                              <option value="">Select PM Item</option>
                              {pmItemsForCategory.map(pm => (
                                <option key={pm.item_code} value={pm.item_code}>
                                  {pm.item_code} - {pm.brand || ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={item.itemCode || ''}
                              onChange={(e) => handleItemChange(item.id, 'itemCode', e.target.value)}
                              className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-0.5 print:bg-transparent print:shadow-none print:text-xs"
                              placeholder="Select PM Category first"
                              disabled
                            />
                          )}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="text"
                        value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                            className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-1 print:bg-transparent print:shadow-none"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="text"
                        value={item.uom}
                        onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)}
                            className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-1 print:bg-transparent print:shadow-none"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="text"
                        value={item.partyName}
                        onChange={(e) => handleItemChange(item.id, 'partyName', e.target.value)}
                            className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-1 print:bg-transparent print:shadow-none"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2 print:px-1 print:py-1 print:text-xs">
                          <input
                            type="text"
                            value={item.dimension}
                            onChange={(e) => handleItemChange(item.id, 'dimension', e.target.value)}
                            className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-1 print:bg-transparent print:shadow-none"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="text"
                        value={item.colorRemarks}
                        onChange={(e) => handleItemChange(item.id, 'colorRemarks', e.target.value)}
                            className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded print:px-0 print:py-1 print:bg-transparent print:shadow-none"
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
                );
              })}
            </tbody>
          </table>
            )}
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

        {/* Computer Generated Disclaimer */}
        <div className="mt-8 print:mt-6 print-section">
          <p className="hidden print:block print:text-center print:text-xs print:text-gray-600 print:pt-4 print:border-t print:border-gray-300">
            This is computer generated document this does not require signature
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6 print:hidden">
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialIndentSlipForm;
