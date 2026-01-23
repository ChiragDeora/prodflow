'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, ExternalLink, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { jobWorkChallanAPI } from '../../../lib/supabase';
import { generateDocumentNumber, FORM_CODES } from '../../../utils/formCodeUtils';
import PrintHeader from '../../shared/PrintHeader';

interface JobWorkChallanItem {
  id: string;
  itemCode: string;
  itemName: string;
  alternateQtyPcs: string;
  quantityKg: string;
  stockPcs?: number;
  stockTons?: number;
  sfg1?: string;
  sfg2?: string;
  sfg1RpBillWt?: number; // For display on challan
  sfg2RpBillWt?: number; // For display on challan
  sfg1RpIntWt?: number; // For stock deduction
  sfg2RpIntWt?: number; // For stock deduction
}

interface JobWorkChallanFormData {
  challanNo: string;
  dated: string;
  jwNumber: string;
  motorVehicleNo: string;
  eWayBillNo: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  customerState: string;
  customerStateCode: string;
  hsnSac: string;
  taxAmount: string;
  companyPan: string;
  items: JobWorkChallanItem[];
}

interface FGStockItem {
  item_code: string;
  item_name: string;
  stock_pcs?: number;
  stock_tons?: number;
  unit_of_measure: string;
}

const JobWorkChallanForm: React.FC = () => {
  const [formData, setFormData] = useState<JobWorkChallanFormData>({
    challanNo: '',
    dated: new Date().toISOString().split('T')[0],
    jwNumber: '',
    motorVehicleNo: '',
    eWayBillNo: '',
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerGstin: '',
    customerState: '',
    customerStateCode: '',
    hsnSac: '39239090',
    taxAmount: 'NIL',
    companyPan: 'AATFD0618A',
    items: [
      { id: '1', itemCode: '', itemName: '', alternateQtyPcs: '', quantityKg: '' }
    ]
  });

  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [fgStockItems, setFgStockItems] = useState<FGStockItem[]>([]);
  
  // Stock posting state
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [stockStatus, setStockStatus] = useState<'NOT_SAVED' | 'SAVED' | 'POSTING' | 'POSTED' | 'ERROR'>('NOT_SAVED');
  const [stockMessage, setStockMessage] = useState<string>('');

  // Sync date state with dated when dated changes
  useEffect(() => {
    if (formData.dated) {
      setDate(formData.dated);
    }
  }, [formData.dated]);

  // Generate document number using JOB_WORK_CHALLAN form code
  useEffect(() => {
    const generateDocNo = async () => {
      try {
        // Use dated if available, otherwise use date state
        const dateToUse = formData.dated || date;
        const docNo = await generateDocumentNumber(FORM_CODES.JOB_WORK_CHALLAN, dateToUse);
        setDocNo(docNo);
        setFormData(prev => ({ ...prev, challanNo: docNo }));
      } catch (error) {
        console.error('Error generating document number:', error);
      }
    };
    generateDocNo();
  }, [date, formData.dated]);

  // Fetch customers and FG stock items
  useEffect(() => {
    fetchCustomers();
    fetchFGStockItems();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/masters/customers');
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchFGStockItems = async () => {
    try {
      const response = await fetch('/api/stock/ledger/fg-items');
      const result = await response.json();
      if (result.success) {
        setFgStockItems(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching FG stock items:', error);
      // Fallback: try alternative endpoint
      try {
        const response = await fetch('/api/stock/items?item_type=FG&location=FG_STORE');
        const result = await response.json();
        if (result.success) {
          setFgStockItems(result.data || []);
        }
      } catch (err) {
        console.error('Error fetching FG stock items from alternative endpoint:', err);
      }
    }
  };

  // Helper function to normalize mold name for matching
  const normalizeMoldName = (name: string): string => {
    if (!name) return '';
    return name.trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
  };

  // Get rp_int_wt for SFG code (for stock deduction)
  const getRpIntWtForSFG = async (sfgCode: string): Promise<number | null> => {
    if (!sfgCode) return null;

    try {
      // Get item_name (mold name) from sfg_bom
      const response = await fetch(`/api/bom?category=SFG&productCode=${sfgCode}`);
      const result = await response.json();
      
      let moldName: string | null = null;
      
      if (result.success && result.data && result.data.length > 0) {
        const sfgBom = result.data.find((bom: any) => bom.sfg_code === sfgCode || bom.item_code === sfgCode);
        if (sfgBom?.item_name) {
          moldName = sfgBom.item_name.trim();
        }
      }
      
      if (!moldName) {
        const directResponse = await fetch('/api/admin/master-data?type=sfg');
        const directResult = await directResponse.json();
        if (directResult.success && directResult.data) {
          const sfgBom = directResult.data.find((sfg: any) => 
            sfg.sfg_code === sfgCode || sfg.item_code === sfgCode
          );
          if (sfgBom?.item_name) {
            moldName = sfgBom.item_name.trim();
          }
        }
      }

      if (!moldName) {
        console.error(`SFG ${sfgCode} not found in sfg_bom`);
        return null;
      }

      // Fetch mold data using client-side Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: molds, error: moldsError } = await supabase
        .from('molds')
        .select('mold_name, int_wt');

      if (moldsError || !molds) {
        console.error('Error fetching molds:', moldsError);
        return null;
      }

      const normalizedMoldName = normalizeMoldName(moldName);

      // Try exact match first
      let moldData = molds.find((m: any) => 
        m.mold_name?.trim() === moldName
      );

      if (moldData?.int_wt !== undefined && moldData.int_wt !== null) {
        return moldData.int_wt;
      }

      // Try case-insensitive match
      moldData = molds.find((m: any) => 
        m.mold_name?.trim().toLowerCase() === moldName.toLowerCase()
      );

      if (moldData?.int_wt !== undefined && moldData.int_wt !== null) {
        return moldData.int_wt;
      }

      // Try normalized match
      moldData = molds.find((m: any) => {
        const normalizedMold = normalizeMoldName(m.mold_name || '');
        return normalizedMold === normalizedMoldName && normalizedMold !== '';
      });

      if (moldData?.int_wt !== undefined && moldData.int_wt !== null) {
        return moldData.int_wt;
      }

      console.error(`Mold ${moldName} not found in molds (tried exact, case-insensitive, and normalized matching)`);
      return null;
    } catch (error) {
      console.error('Error getting rp_int_wt for SFG:', error);
      return null;
    }
  };

  // Get rp_bill_wt for SFG code (for challan display)
  const getRpBillWtForSFG = async (sfgCode: string): Promise<number | null> => {
    if (!sfgCode) return null;

    try {
      // Get item_name (mold name) from sfg_bom
      const response = await fetch(`/api/bom?category=SFG&productCode=${sfgCode}`);
      const result = await response.json();
      
      let moldName: string | null = null;
      
      if (result.success && result.data && result.data.length > 0) {
        // Try to find SFG BOM entry
        const sfgBom = result.data.find((bom: any) => bom.sfg_code === sfgCode || bom.item_code === sfgCode);
        if (sfgBom?.item_name) {
          moldName = sfgBom.item_name.trim();
        }
      }
      
      // If not found via API, try direct fetch
      if (!moldName) {
        const directResponse = await fetch('/api/admin/master-data?type=sfg');
        const directResult = await directResponse.json();
        if (directResult.success && directResult.data) {
          const sfgBom = directResult.data.find((sfg: any) => 
            sfg.sfg_code === sfgCode || sfg.item_code === sfgCode
          );
          if (sfgBom?.item_name) {
            moldName = sfgBom.item_name.trim();
          }
        }
      }

      if (!moldName) {
        console.error(`SFG ${sfgCode} not found in sfg_bom`);
        return null;
      }

      // Fetch mold data using client-side Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: molds, error: moldsError } = await supabase
        .from('molds')
        .select('mold_name, rp_bill_wt');

      if (moldsError || !molds) {
        console.error('Error fetching molds:', moldsError);
        return null;
      }

      const normalizedMoldName = normalizeMoldName(moldName);

      // Try exact match first
      let moldData = molds.find((m: any) => 
        m.mold_name?.trim() === moldName
      );

      if (moldData?.rp_bill_wt !== undefined && moldData.rp_bill_wt !== null) {
        return moldData.rp_bill_wt;
      }

      // Try case-insensitive match
      moldData = molds.find((m: any) => 
        m.mold_name?.trim().toLowerCase() === moldName.toLowerCase()
      );

      if (moldData?.rp_bill_wt !== undefined && moldData.rp_bill_wt !== null) {
        return moldData.rp_bill_wt;
      }

      // Try normalized match
      moldData = molds.find((m: any) => {
        const normalizedMold = normalizeMoldName(m.mold_name || '');
        return normalizedMold === normalizedMoldName && normalizedMold !== '';
      });

      if (moldData?.rp_bill_wt !== undefined && moldData.rp_bill_wt !== null) {
        return moldData.rp_bill_wt;
      }

      console.error(`Mold ${moldName} not found in molds (tried exact, case-insensitive, and normalized matching)`);
      return null;
    } catch (error) {
      console.error('Error getting rp_bill_wt for SFG:', error);
      return null;
    }
  };

  // Fetch FG BOM and calculate weights
  const fetchFGBomAndCalculateWeight = async (itemCode: string, itemId: string, qtyPcs: string) => {
    try {
      const response = await fetch(`/api/bom?category=FG&productCode=${itemCode}`);
      const result = await response.json();
      
      if (!result.success || !result.data || result.data.length === 0) {
        console.warn(`No FG BOM found for item ${itemCode}`);
        return;
      }

      const fgBom = result.data[0]; // Get first matching BOM
      const sfg1 = fgBom.sfg_1;
      const sfg2 = fgBom.sfg_2;

      // Get rp_bill_wt for both SFG codes (for display)
      // Get rp_int_wt for both SFG codes (for stock deduction)
      const [sfg1RpBillWt, sfg2RpBillWt, sfg1RpIntWt, sfg2RpIntWt] = await Promise.all([
        sfg1 ? getRpBillWtForSFG(sfg1) : Promise.resolve(null),
        sfg2 ? getRpBillWtForSFG(sfg2) : Promise.resolve(null),
        sfg1 ? getRpIntWtForSFG(sfg1) : Promise.resolve(null),
        sfg2 ? getRpIntWtForSFG(sfg2) : Promise.resolve(null)
      ]);

      // Calculate KG for display: Qty (Pcs) × (SFG1_rp_bill_wt + SFG2_rp_bill_wt) / 1000
      // rp_bill_wt is in grams, so divide by 1000 to get KG
      const qtyPcsNum = parseFloat(qtyPcs) || 0;
      const sfg1BillWt = (sfg1RpBillWt || 0) / 1000; // Convert grams to KG
      const sfg2BillWt = (sfg2RpBillWt || 0) / 1000; // Convert grams to KG
      const calculatedKg = qtyPcsNum * (sfg1BillWt + sfg2BillWt);

      // Update the item with calculated weight and SFG info
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                sfg1,
                sfg2,
                sfg1RpBillWt: sfg1RpBillWt || undefined,
                sfg2RpBillWt: sfg2RpBillWt || undefined,
                sfg1RpIntWt: sfg1RpIntWt || undefined,
                sfg2RpIntWt: sfg2RpIntWt || undefined,
                quantityKg: calculatedKg > 0 ? calculatedKg.toFixed(3) : ''
              }
            : item
        )
      }));
    } catch (error) {
      console.error('Error fetching FG BOM and calculating weight:', error);
    }
  };

  const handleInputChange = (field: keyof Omit<JobWorkChallanFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (id: string, field: keyof JobWorkChallanItem, value: string) => {
    const item = formData.items.find(i => i.id === id);
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));

    // If Qty (Pcs) changed and item has FG BOM data, recalculate KG
    if (field === 'alternateQtyPcs' && item?.itemCode) {
      // If we already have SFG data, just recalculate. Otherwise fetch BOM first.
      if (item.sfg1 && item.sfg2 && item.sfg1RpBillWt !== undefined && item.sfg2RpBillWt !== undefined) {
        // Recalculate using existing SFG weights
        const qtyPcsNum = parseFloat(value) || 0;
        const sfg1Wt = (item.sfg1RpBillWt || 0) / 1000; // Convert grams to KG
        const sfg2Wt = (item.sfg2RpBillWt || 0) / 1000; // Convert grams to KG
        const calculatedKg = qtyPcsNum * (sfg1Wt + sfg2Wt);
        
        setFormData(prev => ({
          ...prev,
          items: prev.items.map(item =>
            item.id === id ? { ...item, quantityKg: calculatedKg > 0 ? calculatedKg.toFixed(3) : '' } : item
          )
        }));
      } else {
        // Fetch BOM and calculate
        fetchFGBomAndCalculateWeight(item.itemCode, id, value).catch(err => {
          console.error('Error recalculating weight:', err);
        });
      }
    }
  };

  const handleFGItemSelect = async (itemId: string, fgItem: FGStockItem) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId 
          ? { 
              ...item, 
              itemCode: fgItem.item_code,
              itemName: fgItem.item_name,
              alternateQtyPcs: '',
              quantityKg: '',
              stockPcs: fgItem.stock_pcs,
              stockTons: fgItem.stock_tons,
              sfg1: undefined,
              sfg2: undefined,
              sfg1RpBillWt: undefined,
              sfg2RpBillWt: undefined
            } 
          : item
      )
    }));

    // Fetch FG BOM and calculate weight if item code is available
    if (fgItem.item_code) {
      await fetchFGBomAndCalculateWeight(fgItem.item_code, itemId, '');
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.customer_name || '',
      customerAddress: customer.address || '',
      customerGstin: customer.gst_number || customer.gstin || customer.gst_no || '',
      customerState: customer.state || '',
      customerStateCode: customer.state_code || ''
    }));
    setShowCustomerSearch(false);
    setCustomerSearchTerm('');
  };

  const addItemRow = () => {
    const newItem: JobWorkChallanItem = {
      id: Date.now().toString(),
      itemCode: '',
      itemName: '',
      alternateQtyPcs: '',
      quantityKg: ''
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

  // Calculate totals
  const totalPcs = formData.items.reduce((sum, item) => {
    return sum + (parseFloat(item.alternateQtyPcs) || 0);
  }, 0);

  const totalKg = formData.items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantityKg) || 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const challanData = {
        doc_no: docNo,
        sr_no: formData.challanNo || docNo,
        date: formData.dated || date, // Use dated as the main date field
        party_name: formData.customerName || '',
        party_address: formData.customerAddress || undefined,
        gst_no: formData.customerGstin || undefined,
        vehicle_no: formData.motorVehicleNo || undefined,
        e_way_bill_no: formData.eWayBillNo || undefined,
        jw_number: formData.jwNumber || undefined,
        challan_no: formData.challanNo || undefined,
        challan_date: formData.dated || undefined
      };

      const itemsData = formData.items
        .filter(item => {
          // Include items that have at least itemCode, itemName, qty, or qty_pcs
          return item.itemCode?.trim() || item.itemName?.trim() || item.quantityKg || item.alternateQtyPcs;
        })
        .map(item => ({
          item_code: item.itemCode || undefined,
          item_name: item.itemName || undefined,
          material_description: item.itemName || item.itemCode || 'Item', // Required field, use itemName or itemCode, fallback to 'Item'
          qty: item.quantityKg ? parseFloat(item.quantityKg) : undefined,
          qty_pcs: item.alternateQtyPcs ? parseFloat(item.alternateQtyPcs) : undefined,
          uom: 'KG',
          remarks: undefined
        }));

      const newChallan = await jobWorkChallanAPI.create(challanData, itemsData);
      
      // Store the saved document ID for stock posting
      if (newChallan && newChallan.id) {
        setSavedDocumentId(newChallan.id);
        setStockStatus('SAVED');
        setStockMessage('');
        alert('Job Work Challan saved successfully! Click "Post to Stock" to update inventory.');
      } else {
        alert('Job Work Challan saved successfully!');
      }
      
      // Reset form
      setFormData({
        challanNo: '',
        dated: new Date().toISOString().split('T')[0],
        jwNumber: '',
        motorVehicleNo: '',
        eWayBillNo: '',
        customerId: '',
        customerName: '',
        customerAddress: '',
        customerGstin: '',
        customerState: '',
        customerStateCode: '',
        hsnSac: '39239090',
        taxAmount: 'NIL',
        companyPan: 'AATFD0618A',
        items: [
          { id: '1', itemCode: '', itemName: '', alternateQtyPcs: '', quantityKg: '' }
        ]
      });
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error saving job work challan:', error);
      alert('Error saving job work challan. Please try again.');
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
      const stockResponse = await fetch(`/api/stock/post/job-work-challan/${savedDocumentId}`, {
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

  const handlePrint = () => {
    window.print();
  };

  const navigateToCustomerMaster = () => {
    // Navigate to masters module
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerCurrentModule_${userId}`, 'masters');
      // Trigger navigation event
      window.dispatchEvent(new CustomEvent('navigateToModule', { 
        detail: { 
          module: 'masters', 
          subModule: 'commercial_master', 
          tab: 'customers' 
        } 
      }));
      // Reload to apply navigation
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-6xl mx-auto">
      {/* Print Header - Hidden on screen, shown on print */}
      <PrintHeader hideLogo={false} />

      {/* Print Heading - Hidden on screen, shown on print */}
      <div className="hidden print:block mb-4 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-1">JOBWORK CHALLAN (ANNEX - ||)</h2>
        <p className="text-sm font-semibold text-gray-700">(Rule 55 Section 143 of GST Act 2017)</p>
      </div>

      <form onSubmit={handleSubmit} className="print:p-8">
        {/* Screen Header - Hidden on print */}
        <div className="print:hidden mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Work Annexure Delivery Challan</h2>
        </div>

        {/* Main Content: Dispatch To / Party (Left) and Details (Right) */}
        <div className="grid grid-cols-2 gap-6 mb-6 print:mb-4">
          {/* Left Side: Dispatch To / Party */}
          <div>
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900">Dispatch To / Party</h3>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Party Name:</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => {
                    const selectedCustomer = customers.find(c => c.id === e.target.value);
                    if (selectedCustomer) {
                      handleCustomerSelect(selectedCustomer);
                    } else {
                      setFormData(prev => ({ ...prev, customerId: '', customerName: '', customerAddress: '', customerGstin: '', customerState: '', customerStateCode: '' }));
                    }
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                >
                  <option value="">Select from Customer Master</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customer_name || 'Unnamed Customer'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Address:</label>
                <textarea
                  value={formData.customerAddress}
                  onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm h-16 resize-none"
                  placeholder="Customer address"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN/UIN:</label>
                  <input
                    type="text"
                    value={formData.customerGstin}
                    onChange={(e) => handleInputChange('customerGstin', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State Name & Code:</label>
                  <input
                    type="text"
                    value={formData.customerState ? `${formData.customerState}, Code: ${formData.customerStateCode}` : ''}
                    onChange={(e) => {
                      const parts = e.target.value.split(', Code: ');
                      handleInputChange('customerState', parts[0] || '');
                      if (parts[1]) handleInputChange('customerStateCode', parts[1]);
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="State, Code: XX"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Challan Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Challan No. :-
              </label>
              <input
                type="text"
                value={formData.challanNo || docNo}
                onChange={(e) => handleInputChange('challanNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dated :-
              </label>
              <input
                type="date"
                value={formData.dated}
                onChange={(e) => {
                  handleInputChange('dated', e.target.value);
                  setDate(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JW Number :-
              </label>
              <input
                type="text"
                value={formData.jwNumber}
                onChange={(e) => handleInputChange('jwNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motor Vehicle No. :-
              </label>
              <input
                type="text"
                value={formData.motorVehicleNo}
                onChange={(e) => handleInputChange('motorVehicleNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Way bill no. :-
              </label>
              <input
                type="text"
                value={formData.eWayBillNo}
                onChange={(e) => handleInputChange('eWayBillNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Description of Goods Table */}
        <div className="mb-6 print:mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Description of Goods</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12">Sl.</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Item Code</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Item Name</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Qty (Pcs)</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-32">Quantity (KG)</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-16 print:hidden">Action</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2">
                      <select
                        value={item.itemCode}
                        onChange={(e) => {
                          const selectedItem = fgStockItems.find(fg => fg.item_code === e.target.value);
                          if (selectedItem) {
                            handleFGItemSelect(item.id, selectedItem);
                          } else {
                            handleItemChange(item.id, 'itemCode', '');
                            handleItemChange(item.id, 'itemName', '');
                            handleItemChange(item.id, 'alternateQtyPcs', '');
                            handleItemChange(item.id, 'quantityKg', '');
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                      >
                        <option value="">Select FG Item</option>
                        {fgStockItems.map(fgItem => (
                          <option key={fgItem.item_code} value={fgItem.item_code}>
                            {fgItem.item_code} - {fgItem.item_name} (Stock: {fgItem.stock_pcs || 0} Pcs)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                        className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        required
                      />
                      {item.stockPcs !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">
                          Available: {item.stockPcs} Pcs
                        </p>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="number"
                        value={item.alternateQtyPcs}
                        onChange={(e) => handleItemChange(item.id, 'alternateQtyPcs', e.target.value)}
                        className="w-full px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded text-right"
                        step="0.01"
                        min="0"
                        max={item.stockPcs}
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="number"
                        value={item.quantityKg}
                        className="w-full px-2 py-1 border-none focus:outline-none rounded text-right bg-gray-50"
                        step="0.01"
                        min="0"
                        readOnly
                        title="Calculated from Qty (Pcs) × (SFG1_rp_bill_wt + SFG2_rp_bill_wt)"
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
              <tfoot>
                <tr className="bg-gray-100">
                  <td colSpan={3} className="border border-gray-300 px-4 py-2 font-semibold text-right">
                    Total
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-bold text-right">
                    {totalPcs.toFixed(2)} Pcs
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-bold text-right">
                    {totalKg.toFixed(3)} KG
                  </td>
                  <td className="border border-gray-300 print:hidden"></td>
                </tr>
              </tfoot>
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
        </div>

        {/* HSN/SAC, Tax Amount, Company PAN */}
        <div className="grid grid-cols-3 gap-4 mb-6 print:mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HSN/SAC :-
            </label>
            <input
              type="text"
              value={formData.hsnSac}
              onChange={(e) => handleInputChange('hsnSac', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Amount (in words) :-
            </label>
            <input
              type="text"
              value={formData.taxAmount}
              onChange={(e) => handleInputChange('taxAmount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company's PAN :-
            </label>
            <input
              type="text"
              value={formData.companyPan}
              onChange={(e) => handleInputChange('companyPan', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Footer Note */}
        <div className="mb-6 print:mb-4 text-center text-sm text-gray-600">
          <p>This is a Computer Generated Document</p>
        </div>

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

export default JobWorkChallanForm;
