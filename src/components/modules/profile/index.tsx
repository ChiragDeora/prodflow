'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Edit, Save, X, LogOut, Plus, Trash2, Building, Settings, Shield, Users, Package, RefreshCw, Search, AlertCircle, CheckCircle, Upload, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { unitAPI, unitManagementSettingsAPI, Unit } from '../../../lib/supabase';
import AdminDashboard from '../../admin/AdminDashboard';
import BulkOpeningStockUpload from './BulkOpeningStockUpload';

// Stock item types
interface StockItem {
  id: number;
  item_code: string;
  item_name: string;
  item_type: 'RM' | 'PM' | 'SFG' | 'FG';
  category: string | null;
  sub_category: string | null;
  unit_of_measure: 'KG' | 'NOS' | 'METERS';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type TabType = 'profile' | 'user-management' | 'unit-management' | 'stock-management' | 'account-actions';

const UserProfileModule: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: user?.fullName || '',
    email: user?.email || '',
    department: '',
    role: user?.isRootAdmin ? 'admin' : 'user'
  });

  // Unit management state
  const [units, setUnits] = useState<Unit[]>([]);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: '',
    description: '',
    location: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Maintenance'
  });

  // Unit management settings state
  const [unitManagementEnabled, setUnitManagementEnabled] = useState(false);
  const [defaultUnit, setDefaultUnit] = useState('Unit 1');

  // Stock management state
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockItemsLoading, setStockItemsLoading] = useState(false);
  const [showStockItemModal, setShowStockItemModal] = useState(false);
  const [isValidatingOpeningStock, setIsValidatingOpeningStock] = useState(false);
  const [isSubmittingStockItem, setIsSubmittingStockItem] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [stockItemSearch, setStockItemSearch] = useState('');
  const [stockItemTypeFilter, setStockItemTypeFilter] = useState<string>('');
  const [selectedStockItems, setSelectedStockItems] = useState<Set<number>>(new Set());
  const [isDeletingStockItems, setIsDeletingStockItems] = useState(false);
  const [isAddingAllOpeningStock, setIsAddingAllOpeningStock] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'with-ledger'>('soft');
  const [showDeleteTypeModal, setShowDeleteTypeModal] = useState(false);
  const [showAddAllOpeningStockModal, setShowAddAllOpeningStockModal] = useState(false);
  const [addAllOpeningStockQuantity, setAddAllOpeningStockQuantity] = useState(0);
  // "As on" date for stock management - defaults to today
  const [stockAsOnDate, setStockAsOnDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  // Merged form for stock item + opening stock
  const [stockItemForm, setStockItemForm] = useState({
    // Common fields
    item_type: 'SFG' as 'RM' | 'PM' | 'SFG' | 'FG',
    unit_of_measure: 'NOS' as 'KG' | 'NOS' | 'METERS',
    location_code: 'FG_STORE' as 'STORE' | 'PRODUCTION' | 'FG_STORE',
    quantity: 0,
    remarks: '',
    // RM fields
    category: '',
    type: '',
    grade: '',
    // PM fields
    item_code: '',
    pack_size: '',
    dimensions: '',
    brand: '',
    // SFG fields
    item_name: '',
    sfg_code: '',
  });
  
  // Form validation helper
  const isFormValid = () => {
    if (stockItemForm.item_type === 'RM') {
      return stockItemForm.category.trim() !== '' && 
             stockItemForm.type.trim() !== '' && 
             stockItemForm.grade.trim() !== '';
    } else if (stockItemForm.item_type === 'PM') {
      return stockItemForm.category.trim() !== '' && 
             stockItemForm.type.trim() !== '' && 
             stockItemForm.item_code.trim() !== '';
    } else if (stockItemForm.item_type === 'SFG') {
      return stockItemForm.item_name.trim() !== '' && 
             stockItemForm.sfg_code.trim() !== '';
    }
    return false;
  };
  const [stockMessage, setStockMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('Profile debug:', {
      user: user?.email,
      profile: user ? {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        role: user.isRootAdmin ? 'admin' : 'user',
        department: '',
        phone_number: user.phone || '',
        is_active: user.status === 'active'
      } : null,
      isAdmin: user?.isRootAdmin || false
    });
  }, [user]);

  // Load units and settings on component mount
  useEffect(() => {
    if (user?.isRootAdmin) {
      loadUnits();
      loadUnitManagementSettings();
    }
  }, [user?.isRootAdmin]);

  const loadUnitManagementSettings = async () => {
    try {
      const enabled = await unitManagementSettingsAPI.isUnitManagementEnabled();
      const defaultUnitSetting = await unitManagementSettingsAPI.getDefaultUnit();
      setUnitManagementEnabled(enabled);
      setDefaultUnit(defaultUnitSetting);
    } catch (error) {
      console.error('Error loading unit management settings:', error);
    }
  };

  const loadUnits = async () => {
    try {
      const unitsData = await unitAPI.getAll();
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  const handleSave = async () => {
    // Here you would typically update the user profile in Supabase
    // For now, we'll just close the edit mode
    setIsEditing(false);
    // TODO: Implement profile update functionality
  };

  const handleSignOut = () => {
    // No authentication system - just log the action
    console.log('Sign out requested (no authentication system)');
  };

  // Unit management functions
  const handleUnitSubmit = async () => {
    try {
      if (editingUnit) {
        // Update existing unit
        await unitAPI.update(editingUnit.id, unitForm);
      } else {
        // Create new unit
        await unitAPI.create(unitForm);
      }
      
      setShowUnitModal(false);
      setEditingUnit(null);
      setUnitForm({ name: '', description: '', location: '', status: 'Active' });
      loadUnits();
    } catch (error) {
      console.error('Error saving unit:', error);
      alert('Error saving unit. Please try again.');
    }
  };

  const handleUnitDelete = async (unitId: string) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      try {
        await unitAPI.delete(unitId);
        loadUnits();
      } catch (error) {
        console.error('Error deleting unit:', error);
        alert('Error deleting unit. Please try again.');
      }
    }
  };

  const openUnitModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({
        name: unit.name,
        description: unit.description || '',
        location: unit.location || '',
        status: unit.status
      });
    } else {
      setEditingUnit(null);
      setUnitForm({ name: '', description: '', location: '', status: 'Active' });
    }
    setShowUnitModal(true);
  };

  // Stock management functions
  const loadStockItems = useCallback(async () => {
    setStockItemsLoading(true);
    try {
      const params = new URLSearchParams();
      if (stockItemTypeFilter) params.append('item_type', stockItemTypeFilter);
      if (stockItemSearch) params.append('search', stockItemSearch);
      params.append('include_inactive', 'true');
      
      const response = await fetch(`/api/admin/stock-items?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setStockItems(result.data || []);
        setSelectedStockItems(new Set()); // Clear selection on reload
      } else {
        console.error('Error loading stock items:', result.error);
      }
    } catch (error) {
      console.error('Error loading stock items:', error);
    } finally {
      setStockItemsLoading(false);
    }
  }, [stockItemTypeFilter, stockItemSearch]);

  useEffect(() => {
    if (user?.isRootAdmin && activeTab === 'stock-management') {
      loadStockItems();
    }
  }, [user?.isRootAdmin, activeTab, loadStockItems]);

  const handleStockItemSubmit = async () => {
    setIsSubmittingStockItem(true);
    setIsValidatingOpeningStock(true);
    
    try {
      // Determine if this is a new item or existing item (check if item_code already exists)
      let existingItemCode = '';
      let isExistingItem = false;
      
      if (stockItemForm.item_type === 'RM') {
        // Generate RM item code: PP-{TYPE}-{GRADE} or RM-{TYPE}
        if (stockItemForm.category && stockItemForm.type && stockItemForm.grade) {
          existingItemCode = `${stockItemForm.category}-${stockItemForm.type}-${stockItemForm.grade}`;
        } else if (stockItemForm.type) {
          existingItemCode = `RM-${stockItemForm.type}`;
        }
      } else if (stockItemForm.item_type === 'SFG') {
        existingItemCode = stockItemForm.sfg_code;
      } else if (stockItemForm.item_type === 'PM') {
        existingItemCode = stockItemForm.item_code;
      }
      
      // Check if item already exists
      if (existingItemCode) {
        const checkResponse = await fetch(`/api/admin/stock-items?item_code=${existingItemCode}`);
        const checkResult = await checkResponse.json();
        isExistingItem = checkResult.success && checkResult.data && checkResult.data.length > 0;
      }
      
      // First validate item in masters if quantity > 0 and it's a new item
      if (stockItemForm.quantity > 0 && !isExistingItem && existingItemCode) {
        const validation = await validateItemInMasters(existingItemCode);
        if (!validation.valid) {
          setStockMessage({ type: 'error', text: validation.message });
          setTimeout(() => setStockMessage(null), 8000);
          return;
        }
      }
      
      // Prepare stock item data based on type
      let stockItemData: any = {
        item_type: stockItemForm.item_type,
        unit_of_measure: stockItemForm.unit_of_measure,
      };
      
      if (stockItemForm.item_type === 'RM') {
        // Generate item code: PP-{TYPE}-{GRADE} or RM-{TYPE}
        if (stockItemForm.category && stockItemForm.type && stockItemForm.grade) {
          stockItemData.item_code = `${stockItemForm.category}-${stockItemForm.type}-${stockItemForm.grade}`;
          stockItemData.item_name = `${stockItemForm.category} ${stockItemForm.type} ${stockItemForm.grade}`;
        } else if (stockItemForm.type) {
          stockItemData.item_code = `RM-${stockItemForm.type}`;
          // Format: "Grade Type" - but if no grade, use just the type
          stockItemData.item_name = stockItemForm.grade 
            ? `${stockItemForm.grade} ${stockItemForm.type}` 
            : stockItemForm.type;
        }
        stockItemData.category = stockItemForm.category || 'PP';
        stockItemData.sub_category = stockItemForm.type;
      } else if (stockItemForm.item_type === 'PM') {
        stockItemData.item_code = stockItemForm.item_code;
        stockItemData.item_name = stockItemForm.item_code; // Can be updated later
        stockItemData.category = stockItemForm.category || '';
      } else if (stockItemForm.item_type === 'SFG') {
        stockItemData.item_code = stockItemForm.sfg_code;
        stockItemData.item_name = stockItemForm.item_name;
        stockItemData.category = 'SFG';
      }
      
      // Create stock item only if it doesn't exist
      if (!isExistingItem) {
        const createResponse = await fetch('/api/admin/stock-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stockItemData)
        });
        const createResult = await createResponse.json();
        
        if (!createResult.success) {
          setStockMessage({ type: 'error', text: createResult.error || 'Failed to create stock item' });
          setTimeout(() => setStockMessage(null), 5000);
          return;
        }
      }
      
      // If quantity > 0, add opening stock
      if (stockItemForm.quantity > 0 && existingItemCode) {
        const openingStockResponse = await fetch('/api/admin/opening-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_code: existingItemCode,
            location_code: stockItemForm.location_code,
            quantity: stockItemForm.quantity,
            transaction_date: stockAsOnDate,
            remarks: stockItemForm.remarks || `Opening stock for ${stockItemData.item_name || existingItemCode}`,
            posted_by: user?.email || 'ADMIN'
          })
        });
        const openingStockResult = await openingStockResponse.json();
        
        if (!openingStockResult.success && !openingStockResult.partial) {
          setStockMessage({ 
            type: 'error', 
            text: `${isExistingItem ? 'Opening stock' : 'Stock item created but opening stock'} failed: ${openingStockResult.error || 'Unknown error'}` 
          });
          setTimeout(() => setStockMessage(null), 5000);
          return;
        }
      }
      
      setStockMessage({ 
        type: 'success', 
        text: `${isExistingItem ? 'Opening stock added' : 'Stock item created' + (stockItemForm.quantity > 0 ? ' and opening stock added' : '')} successfully!` 
      });
        setShowStockItemModal(false);
      
      // Reset form
        setStockItemForm({
          item_type: 'SFG',
        unit_of_measure: 'NOS',
        location_code: 'FG_STORE',
        quantity: 0,
        remarks: '',
          category: '',
        type: '',
        grade: '',
        item_code: '',
        pack_size: '',
        dimensions: '',
        brand: '',
        item_name: '',
        sfg_code: '',
      });
      
        loadStockItems();
    } catch (error) {
      setStockMessage({ type: 'error', text: 'Failed to create stock item' });
      console.error(error);
    } finally {
      setIsSubmittingStockItem(false);
      setIsValidatingOpeningStock(false);
    }
    
    setTimeout(() => setStockMessage(null), 5000);
  };

  const validateItemInMasters = async (itemCode: string): Promise<{ valid: boolean; message: string; itemType?: string }> => {
    try {
      // Determine item type from item code
      // RM: Format like PP-{TYPE}-{GRADE} or RM-{TYPE} or starts with "RM-"
      // PM: Check packing_materials table by item_code
      // SFG: 9-digit numeric code, check sfg_bom table by sfg_code
      
      const code = itemCode.trim();
      
      // Check if it's an RM item (starts with RM- or PP-)
      if (code.startsWith('RM-') || code.startsWith('PP-')) {
        // For RM, we need to parse category, type, and grade
        // Format: PP-{TYPE}-{GRADE} or RM-{TYPE}
        const parts = code.split('-');
        if (parts.length >= 2) {
          const category = parts[0]?.toUpperCase() || 'PP';
          const type = parts[1]?.toUpperCase();
          const grade = parts[2] || '';
          
          // Check against raw_materials master
          const response = await fetch(`/api/admin/master-data?type=rm`);
      const result = await response.json();
      
          if (result.success && result.data) {
            const rmMaster = result.data;
            
            // For RM-{TYPE} format (standard RM types), just check if type exists
            if (code.startsWith('RM-') && parts.length === 2) {
              const match = rmMaster.find((rm: any) => 
                rm.sub_category?.toUpperCase() === type || rm.item_code === code
              );
              
              if (!match) {
                return {
                  valid: false,
                  message: `Raw Material type "${type}" not found in Raw Materials Master. Please add it to Raw Materials Master first.`,
                  itemType: 'RM'
                };
              }
      } else {
              // For PP-{TYPE}-{GRADE} format, match by category + type + grade
              const match = rmMaster.find((rm: any) => 
                rm.category?.toUpperCase() === category &&
                rm.sub_category?.toUpperCase() === type &&
                (grade === '' || rm.grade?.toUpperCase() === grade.toUpperCase())
              );
              
              if (!match) {
                const itemDesc = grade ? `${category} ${type} ${grade}` : `${category} ${type}`;
                return {
                  valid: false,
                  message: `Raw Material "${itemDesc}" not found in Raw Materials Master. Please add it to Raw Materials Master first.`,
                  itemType: 'RM'
                };
              }
            }
          }
        }
        return { valid: true, message: '', itemType: 'RM' };
      }
      
      // Check if it's an SFG item (9-digit numeric code)
      if (/^\d{9}$/.test(code)) {
        // Check against sfg_bom master
        const response = await fetch(`/api/admin/master-data?type=sfg`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const sfgMaster = result.data;
          // API returns item_code field which is the sfg_code
          const match = sfgMaster.find((sfg: any) => 
            sfg.sfg_code === code || sfg.item_code === code
          );
          
          if (!match) {
            return {
              valid: false,
              message: `SFG code "${code}" not found in SFG BOM Master. Please add it to SFG BOM Master first.`,
              itemType: 'SFG'
            };
          }
        }
        return { valid: true, message: '', itemType: 'SFG' };
      }
      
      // Check if it's a PM item (check packing_materials by item_code)
      const response = await fetch(`/api/admin/master-data?type=pm`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const pmMaster = result.data;
        const match = pmMaster.find((pm: any) => 
          pm.item_code?.toLowerCase() === code.toLowerCase()
        );
        
        if (!match) {
          return {
            valid: false,
            message: `Item code "${code}" not found in Packing Materials Master. Please add it to Packing Materials Master first.`,
            itemType: 'PM'
          };
        }
      }
      
      return { valid: true, message: '', itemType: 'PM' };
    } catch (error) {
      console.error('Error validating item in masters:', error);
      // If validation fails, allow submission but log the error
      return { valid: true, message: '', itemType: 'UNKNOWN' };
    }
  };


  const handleDeleteStockItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to deactivate this stock item?')) return;
    
    try {
      const response = await fetch(`/api/admin/stock-items/${itemId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        setStockMessage({ type: 'success', text: 'Stock item deactivated' });
        loadStockItems();
        setSelectedStockItems(new Set());
      } else {
        setStockMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setStockMessage({ type: 'error', text: 'Failed to delete stock item' });
    }
    
    setTimeout(() => setStockMessage(null), 5000);
  };

const handleBulkDeleteStockItems = async () => {
    if (selectedStockItems.size === 0) {
      setStockMessage({ type: 'error', text: 'Please select items to delete' });
      setTimeout(() => setStockMessage(null), 3000);
      return;
    }

    const isDeleteWithLedger = deleteMode === 'with-ledger';
    
    let confirmMessage = '';
    if (isDeleteWithLedger) {
      confirmMessage = ` CRITICAL WARNING \n\nThis will PERMANENTLY DELETE:\n• ${selectedStockItems.size} stock item(s)\n• ALL ledger entries for these items\n• ALL balance entries for these items\n\nThis will REMOVE ALL TRANSACTION HISTORY!\n\nThis action CANNOT be undone!\n\nAre you absolutely certain?`;
    } else {
      confirmMessage = `Are you sure you want to deactivate ${selectedStockItems.size} stock item(s)?`;
    }
    
    if (!window.confirm(confirmMessage)) return;
    
    setIsDeletingStockItems(true);
    try {
      if (isDeleteWithLedger) {
        // Delete with ledger - removes everything
        const response = await fetch('/api/admin/stock-items/delete-with-ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_ids: Array.from(selectedStockItems)
          })
        });
        
        const result = await response.json();
        
        if (result.success || result.partial) {
          setStockMessage({ 
            type: 'success', 
            text: result.message || `Deleted ${result.data?.deleted || 0} item(s) with all ledger entries` 
          });
          loadStockItems();
          setSelectedStockItems(new Set());
        } else {
          setStockMessage({ 
            type: 'error', 
            text: result.error || 'Failed to delete items' 
          });
        }
      } else {
        // Soft delete - use individual endpoints
        const deletePromises = Array.from(selectedStockItems).map(itemId =>
          fetch(`/api/admin/stock-items/${itemId}`, { method: 'DELETE' })
        );
        
        const results = await Promise.all(deletePromises);
        const jsonResults = await Promise.all(results.map(r => r.json()));
        
        const successCount = jsonResults.filter(r => r.success).length;
        const failCount = jsonResults.length - successCount;
        
        if (successCount > 0) {
          setStockMessage({ 
            type: 'success', 
            text: `Deactivated ${successCount} item(s)${failCount > 0 ? `, ${failCount} failed` : ''}` 
          });
          loadStockItems();
          setSelectedStockItems(new Set());
        } else {
          setStockMessage({ type: 'error', text: 'Failed to deactivate items' });
        }
      }
    } catch (error) {
      setStockMessage({ type: 'error', text: 'Error during bulk delete' });
      console.error(error);
    } finally {
      setIsDeletingStockItems(false);
      setTimeout(() => setStockMessage(null), 5000);
    }
  };

  const toggleStockItemSelection = (itemId: number) => {
    const newSelected = new Set(selectedStockItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedStockItems(newSelected);
  };

  const toggleSelectAllStockItems = () => {
    const filteredItems = stockItems.filter(item => {
      const matchesSearch = !stockItemSearch || 
        item.item_code.toLowerCase().includes(stockItemSearch.toLowerCase()) ||
        item.item_name.toLowerCase().includes(stockItemSearch.toLowerCase());
      const matchesType = !stockItemTypeFilter || item.item_type === stockItemTypeFilter;
      return matchesSearch && matchesType;
    });

    if (selectedStockItems.size === filteredItems.length) {
      setSelectedStockItems(new Set());
    } else {
      setSelectedStockItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleAddAllOpeningStock = async () => {
    // Use selected items if any, otherwise use all active items
    const itemsToProcess = selectedStockItems.size > 0
      ? stockItems.filter(item => selectedStockItems.has(item.id) && item.is_active)
      : stockItems.filter(item => item.is_active);
    
    if (itemsToProcess.length === 0) {
      setStockMessage({ type: 'error', text: selectedStockItems.size > 0 ? 'No active items in selection' : 'No active stock items found' });
      setTimeout(() => setStockMessage(null), 3000);
      return;
    }

    if (addAllOpeningStockQuantity <= 0) {
      setStockMessage({ type: 'error', text: 'Please enter a quantity greater than 0' });
      setTimeout(() => setStockMessage(null), 3000);
      return;
    }

    const itemCount = itemsToProcess.length;
    const confirmMessage = selectedStockItems.size > 0
      ? `Add opening stock (quantity ${addAllOpeningStockQuantity}) for ${itemCount} selected stock item(s)? This will update stock balances and create entries in the stock ledger.`
      : `Add opening stock (quantity ${addAllOpeningStockQuantity}) for all ${itemCount} active stock items? This will update stock balances and create entries in the stock ledger.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsAddingAllOpeningStock(true);
    try {
      // Determine location based on item type - MUST match what MIS expects (STORE for PM)
      const getLocationForType = (itemType: string): string => {
        if (itemType === 'SFG') return 'FG_STORE';
        if (itemType === 'RM') return 'STORE';
        return 'STORE'; // PM and others MUST go to STORE (MIS queries STORE location)
      };

      const entries = itemsToProcess.map(item => ({
        item_code: item.item_code,
        location_code: getLocationForType(item.item_type) as 'STORE' | 'PRODUCTION' | 'FG_STORE',
        quantity: addAllOpeningStockQuantity, // Use the entered quantity
        transaction_date: stockAsOnDate,
        remarks: `Opening stock entry for ${item.item_name} - added by yogesh`,
        posted_by: 'yogesh'
      }));

      const response = await fetch('/api/admin/opening-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries)
      });

      const result = await response.json();
      
      if (result.success || result.partial) {
        const successCount = result.data?.processed || 0;
        const failCount = result.data?.failed || 0;
        setStockMessage({ 
          type: 'success', 
          text: `Added opening stock (${addAllOpeningStockQuantity} units) for ${successCount} item(s)${failCount > 0 ? `, ${failCount} failed` : ''}. Stock balances updated and visible in Material Issue Slip.` 
        });
        loadStockItems();
        setSelectedStockItems(new Set()); // Clear selection after adding
        setShowAddAllOpeningStockModal(false);
        setAddAllOpeningStockQuantity(0);
      } else {
        setStockMessage({ 
          type: 'error', 
          text: result.data?.errorMessages?.join(', ') || result.error || 'Failed to add opening stock' 
        });
      }
    } catch (error) {
      setStockMessage({ type: 'error', text: 'Error adding opening stock for all items' });
      console.error(error);
    } finally {
      setIsAddingAllOpeningStock(false);
      setTimeout(() => setStockMessage(null), 5000);
    }
  };

  const tabs = [
    {
      id: 'profile' as TabType,
      label: 'Profile Information',
      icon: User,
      description: 'Manage your personal information and account details'
    },
    {
      id: 'user-management' as TabType,
      label: 'User Management',
      icon: Users,
      description: 'Approve users, reset passwords, and manage accounts',
      adminOnly: true
    },
    {
      id: 'unit-management' as TabType,
      label: 'Unit Management',
      icon: Building,
      description: 'Configure units and unit management settings',
      adminOnly: true
    },
    {
      id: 'stock-management' as TabType,
      label: 'Stock Management',
      icon: Package,
      description: 'Manage stock items and add opening stock',
      adminOnly: true
    },
    {
      id: 'account-actions' as TabType,
      label: 'Account Actions',
      icon: Settings,
      description: 'Account security and session management'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {user?.fullName || user?.email || 'Current User'}
                </h2>
                <p className="text-sm text-gray-500 capitalize">
                  {user?.email === 'yogesh@polypacks.in' ? 'Owner' : user?.isRootAdmin ? 'Root Admin' : 'User'}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Email</span>
                  <span className="text-sm text-gray-800">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Department</span>
                  <span className="text-sm text-gray-800 capitalize">
                    {user?.email === 'yogesh@polypacks.in' ? 'Admin' : user?.department || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Member Since</span>
                  <span className="text-sm text-gray-800">
                    {user?.email === 'yogesh@polypacks.in' ? 'Founder' : 
                     user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-800">
                    {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
                

                

              </div>
            </div>

            {/* Edit Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {isEditing ? 'Edit Profile Information' : 'Profile Information'}
                </h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      disabled
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={editForm.department}
                      onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value as 'user' | 'admin' | 'operator'})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="operator">Operator</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                      {user?.fullName || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                      {user?.email}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                      Not specified
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 capitalize">
                      {user?.isRootAdmin ? 'Root Admin' : 'User'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'user-management':
        if (!user?.isRootAdmin) {
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Restricted</h3>
                <p className="text-gray-600">User management is only available to administrators.</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <AdminDashboard />
          </div>
        );

      case 'unit-management':
        if (!user?.isRootAdmin) {
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Restricted</h3>
                <p className="text-gray-600">Unit management is only available to administrators.</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Unit Management Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Unit Management Settings
                </h3>
              </div>
              
              <div className="space-y-4">
                {/* Unit Management Toggle */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Enable Unit Management</h4>
                    <p className="text-sm text-gray-600">
                      When enabled, unit selection will appear in all master data forms
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const newValue = !unitManagementEnabled;
                      try {
                        await unitManagementSettingsAPI.updateSetting('unit_management_enabled', newValue.toString());
                        setUnitManagementEnabled(newValue);
                      } catch (error) {
                        console.error('Error updating unit management setting:', error);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      unitManagementEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        unitManagementEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Default Unit Selection */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Default Unit</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Select the default unit for new master data entries
                  </p>
                  <select
                    value={defaultUnit}
                    onChange={async (e) => {
                      const newValue = e.target.value;
                      try {
                        await unitManagementSettingsAPI.updateSetting('default_unit', newValue);
                        setDefaultUnit(newValue);
                      } catch (error) {
                        console.error('Error updating default unit:', error);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {units.map(unit => (
                      <option key={unit.id} value={unit.name}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Unit Management Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Unit Management
                </h3>
                <button
                  onClick={() => openUnitModal()}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Unit
                </button>
              </div>
              
              <div className="space-y-3">
                {units.map(unit => (
                  <div key={unit.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-800">{unit.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          unit.status === 'Active' ? 'bg-green-100 text-green-800' :
                          unit.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {unit.status}
                        </span>
                      </div>
                      {unit.description && (
                        <p className="text-sm text-gray-600 mt-1">{unit.description}</p>
                      )}
                      {unit.location && (
                        <p className="text-xs text-gray-500 mt-1">📍 {unit.location}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openUnitModal(unit)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Edit unit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUnitDelete(unit.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {units.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No units found</p>
                    <p className="text-sm">Click "Add Unit" to create your first unit</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'stock-management':
        return (
          <div className="space-y-6">
            {/* Message Banner */}
            {stockMessage && (
              <div className={`p-4 rounded-lg flex items-center ${
                stockMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {stockMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                {stockMessage.text}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Stock Management
                </h3>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span>As on Date:</span>
                    <input
                      type="date"
                      value={stockAsOnDate}
                      onChange={(e) => setStockAsOnDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Select the date for which stock should be recorded"
                    />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setShowStockItemModal(true)}
                  className="flex items-center justify-center p-4 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Stock Item
                </button>
                <button
                  onClick={() => setShowStockItemModal(true)}
                  className="flex items-center justify-center p-4 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50 hover:border-green-400 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Opening Stock
                </button>
                <button
                  onClick={() => setShowBulkUploadModal(true)}
                  className="flex items-center justify-center p-4 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition-colors"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Bulk Upload Opening Stock
                </button>
              </div>
            </div>

            {/* Stock Items List */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Stock Items</h3>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={stockItemSearch}
                      onChange={(e) => {
                        setStockItemSearch(e.target.value);
                        setSelectedStockItems(new Set()); // Clear selection on search change
                      }}
                      className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
                    />
                  </div>
                  <select
                    value={stockItemTypeFilter}
                    onChange={(e) => {
                      setStockItemTypeFilter(e.target.value);
                      setSelectedStockItems(new Set()); // Clear selection on filter change
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="RM">Raw Material (RM)</option>
                    <option value="PM">Packing Material (PM)</option>
                    <option value="SFG">Semi-Finished Goods (SFG)</option>
                    <option value="FG">Finished Goods (FG)</option>
                  </select>
                  <button
                    onClick={loadStockItems}
                    disabled={stockItemsLoading}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${stockItemsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {stockItemsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500" />
                  <p className="mt-2 text-gray-500">Loading stock items...</p>
                </div>
              ) : stockItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No stock items found</p>
                  <p className="text-sm">Click "Add New Stock Item" to create one</p>
                </div>
              ) : (() => {
                // Filter items based on search and type
                const filteredItems = stockItems.filter(item => {
                  const matchesSearch = !stockItemSearch || 
                    item.item_code.toLowerCase().includes(stockItemSearch.toLowerCase()) ||
                    item.item_name.toLowerCase().includes(stockItemSearch.toLowerCase());
                  const matchesType = !stockItemTypeFilter || item.item_type === stockItemTypeFilter;
                  return matchesSearch && matchesType;
                });

                const allSelected = filteredItems.length > 0 && selectedStockItems.size === filteredItems.length;

                return (
                  <div className="space-y-4">
                    {/* Bulk Actions Bar */}
                    {selectedStockItems.size > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-blue-800">
                            {selectedStockItems.size} item(s) selected
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const selectedItems = stockItems.filter(item => selectedStockItems.has(item.id));
                              if (selectedItems.length === 0) {
                                setStockMessage({ type: 'error', text: 'No items selected' });
                                setTimeout(() => setStockMessage(null), 3000);
                                return;
                              }

                              // Check if items already have opening stock balances
                              try {
                                const balanceChecks = await Promise.all(
                                  selectedItems.map(async (item) => {
                                    const location = item.item_type === 'SFG' ? 'FG_STORE' : 'STORE';
                                    const response = await fetch(
                                      `/api/stock/balance?item_code=${item.item_code}&location=${location}`
                                    );
                                    const result = await response.json();
                                    const hasBalance = result.success && result.data && result.data.length > 0 && 
                                      result.data[0].current_balance > 0;
                                    return { item, hasBalance, balance: hasBalance ? result.data[0].current_balance : 0 };
                                  })
                                );

                                const itemsWithBalance = balanceChecks.filter(c => c.hasBalance);
                                const itemsWithoutBalance = balanceChecks.filter(c => !c.hasBalance);

                                if (itemsWithBalance.length > 0 && itemsWithoutBalance.length === 0) {
                                  // All items already have opening stock from Excel upload
                                  setStockMessage({ 
                                    type: 'success', 
                                    text: `All ${selectedItems.length} selected item(s) already have opening stock from Excel upload. Quantities are already in the system. Use "Bulk Upload Opening Stock" to update quantities from Excel if needed.` 
                                  });
                                  setTimeout(() => setStockMessage(null), 5000);
                                  return;
                                }

                                if (itemsWithBalance.length > 0) {
                                  // Some items have balance, some don't - show warning
                                  const confirmMsg = `${itemsWithBalance.length} item(s) already have opening stock. Do you want to add more stock to all selected items?`;
                                  if (!window.confirm(confirmMsg)) {
                                    return;
                                  }
                                }

                                // Show modal to enter quantity
                                setAddAllOpeningStockQuantity(0);
                                setShowAddAllOpeningStockModal(true);
                              } catch (error) {
                                console.error('Error checking balances:', error);
                                // If check fails, just show the modal
                                setAddAllOpeningStockQuantity(0);
                                setShowAddAllOpeningStockModal(true);
                              }
                            }}
                            disabled={isAddingAllOpeningStock}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                          >
                            {isAddingAllOpeningStock ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Package className="w-4 h-4" />
                                Add Stock
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setShowDeleteTypeModal(true)}
                            disabled={isDeletingStockItems}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                          >
                                <Trash2 className="w-4 h-4" />
                            Delete ({selectedStockItems.size})
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                          <tr>
                            <th className="w-12 px-4 py-3">
                              <button
                                onClick={toggleSelectAllStockItems}
                                className="flex items-center justify-center w-5 h-5 text-gray-600 hover:text-gray-900"
                                title={allSelected ? 'Deselect all' : 'Select all'}
                              >
                                {allSelected ? (
                                  <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Item Code
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Item Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Sub-Category
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Unit
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                          {filteredItems.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                No items match your filters
                              </td>
                            </tr>
                          ) : (
                            filteredItems.map((item) => (
                              <tr 
                                key={item.id} 
                                className={`hover:bg-gray-50 transition-colors ${
                                  !item.is_active ? 'bg-gray-50 opacity-60' : ''
                                } ${selectedStockItems.has(item.id) ? 'bg-blue-50' : ''}`}
                              >
                          <td className="px-4 py-3">
                                  <button
                                    onClick={() => toggleStockItemSelection(item.id)}
                                    className="flex items-center justify-center w-5 h-5 text-gray-600 hover:text-gray-900"
                                  >
                                    {selectedStockItems.has(item.id) ? (
                                      <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                      <Square className="w-5 h-5" />
                                    )}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm font-mono font-medium text-gray-900">
                                    {item.item_code}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-700">
                                    {item.item_name}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              item.item_type === 'RM' ? 'bg-blue-100 text-blue-800' :
                              item.item_type === 'PM' ? 'bg-purple-100 text-purple-800' :
                              item.item_type === 'SFG' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.item_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                                  <span className="text-sm text-gray-600">
                                    {item.category || <span className="text-gray-400">-</span>}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-600">
                                    {item.sub_category || <span className="text-gray-400">-</span>}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm font-medium text-gray-700">
                                    {item.unit_of_measure}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                // Pre-fill form with existing item data
                                setStockItemForm({
                                  item_type: item.item_type as 'RM' | 'PM' | 'SFG' | 'FG',
                                  unit_of_measure: item.unit_of_measure as 'KG' | 'NOS' | 'METERS',
                                  location_code: (item.item_type === 'SFG' || item.item_type === 'FG' ? 'FG_STORE' : 'STORE') as 'STORE' | 'PRODUCTION' | 'FG_STORE',
                                  quantity: 0,
                                  remarks: '',
                                  category: item.category || '',
                                  type: item.sub_category || '',
                                  grade: '',
                                  item_code: item.item_code,
                                  pack_size: '',
                                  dimensions: '',
                                  brand: '',
                                  item_name: item.item_name,
                                  sfg_code: item.item_code, // For SFG, item_code is the sfg_code
                                });
                                setShowStockItemModal(true);
                              }}
                                      className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                              title="Add opening stock"
                            >
                              + Stock
                            </button>
                            {item.is_active && (
                              <button
                                onClick={() => handleDeleteStockItem(item.id)}
                                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Deactivate"
                              >
                                        <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                                  </div>
                          </td>
                        </tr>
                            ))
                          )}
                    </tbody>
                  </table>
                </div>

                    {/* Results Summary */}
                    <div className="text-sm text-gray-600">
                      Showing {filteredItems.length} of {stockItems.length} items
                      {(stockItemSearch || stockItemTypeFilter) && (
                        <button
                          onClick={() => {
                            setStockItemSearch('');
                            setStockItemTypeFilter('');
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Add Stock Item & Opening Stock Modal (Merged) */}
            {showStockItemModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Add Stock Item & Opening Stock</h3>
                    <p className="text-sm text-gray-500 mt-1">Create a new item and optionally add opening stock</p>
                  </div>
                  
                  <div className="p-6">
                    {/* Item Type & Unit Selection */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Type *</label>
                        <select
                          value={stockItemForm.item_type}
                          onChange={(e) => {
                            const newType = e.target.value as 'RM' | 'PM' | 'SFG' | 'FG';
                            setStockItemForm({ 
                              ...stockItemForm, 
                              item_type: newType,
                              unit_of_measure: newType === 'RM' ? 'KG' : 'NOS',
                              location_code: newType === 'SFG' || newType === 'FG' ? 'FG_STORE' : 'STORE'
                            });
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value="RM">Raw Material (RM)</option>
                          <option value="PM">Packing Material (PM)</option>
                          <option value="SFG">Semi-Finished Goods (SFG)</option>
                          <option value="FG">Finished Goods (FG)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure *</label>
                        <select
                          value={stockItemForm.unit_of_measure}
                          onChange={(e) => setStockItemForm({ ...stockItemForm, unit_of_measure: e.target.value as 'KG' | 'NOS' | 'METERS' })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value="KG">KGS</option>
                          <option value="NOS">NOS</option>
                          <option value="METERS">M</option>
                        </select>
                      </div>
                    </div>

                    {/* Table-styled form with dynamic headers */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            {stockItemForm.item_type === 'RM' && (
                              <>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category *</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type *</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Grade *</th>
                              </>
                            )}
                            {stockItemForm.item_type === 'PM' && (
                              <>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category *</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type *</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Code *</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Pack Size</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Dimensions</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Brand</th>
                              </>
                            )}
                            {stockItemForm.item_type === 'SFG' && (
                              <>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Name *</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SFG-Code *</th>
                              </>
                            )}
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Location *</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {stockItemForm.item_type === 'RM' && (
                              <>
                                <td className="px-4 py-3 border-b border-gray-100">
                        <input
                          type="text"
                          value={stockItemForm.category}
                          onChange={(e) => setStockItemForm({ ...stockItemForm, category: e.target.value })}
                                    placeholder="e.g., PP"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                                </td>
                                <td className="px-4 py-3 border-b border-gray-100">
                        <input
                          type="text"
                                    value={stockItemForm.type}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, type: e.target.value })}
                          placeholder="e.g., HP, ICP"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-3 border-b border-gray-100">
                                  <input
                                    type="text"
                                    value={stockItemForm.grade}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, grade: e.target.value })}
                                    placeholder="e.g., HJ333MO"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                              </>
                            )}
                            {stockItemForm.item_type === 'PM' && (
                              <>
                                <td className="px-4 py-3 border-b border-gray-100">
                      <input
                        type="text"
                                    value={stockItemForm.category}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, category: e.target.value })}
                                    placeholder="e.g., Boxes"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-3 border-b border-gray-100">
                                  <input
                                    type="text"
                                    value={stockItemForm.type}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, type: e.target.value })}
                                    placeholder="e.g., CTN"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-3 border-b border-gray-100">
                                  <input
                                    type="text"
                                    value={stockItemForm.item_code}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, item_code: e.target.value })}
                                    placeholder="e.g., CTN-Ro10-GM"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-3 border-b border-gray-100">
                                  <input
                                    type="text"
                                    value={stockItemForm.pack_size}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, pack_size: e.target.value })}
                                    placeholder="e.g., 48"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-3 border-b border-gray-100">
                                  <input
                                    type="text"
                                    value={stockItemForm.dimensions}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, dimensions: e.target.value })}
                                    placeholder="e.g., 10x12"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-3 border-b border-gray-100">
                                  <input
                                    type="text"
                                    value={stockItemForm.brand}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, brand: e.target.value })}
                                    placeholder="e.g., Brand Name"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                              </>
                            )}
                            {stockItemForm.item_type === 'SFG' && (
                              <>
                                <td className="px-4 py-3 border-b border-gray-100">
                                  <input
                                    type="text"
                                    value={stockItemForm.item_name}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, item_name: e.target.value })}
                                    placeholder="e.g., RP-Ro10-C"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-3 border-b border-gray-100">
                                  <input
                                    type="text"
                                    value={stockItemForm.sfg_code}
                                    onChange={(e) => setStockItemForm({ ...stockItemForm, sfg_code: e.target.value })}
                                    placeholder="e.g., 110110001"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3 border-b border-gray-100">
                      <select
                                value={stockItemForm.location_code}
                                onChange={(e) => setStockItemForm({ ...stockItemForm, location_code: e.target.value as 'STORE' | 'PRODUCTION' | 'FG_STORE' })}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              >
                                <option value="STORE">STORE</option>
                                <option value="PRODUCTION">PRODUCTION</option>
                                <option value="FG_STORE">FG STORE</option>
                      </select>
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100">
                      <input
                        type="number"
                                value={stockItemForm.quantity}
                                onChange={(e) => setStockItemForm({ ...stockItemForm, quantity: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                        min="0"
                        step="0.01"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3 border-b border-gray-100">
                              <input
                                type="text"
                                value={stockItemForm.remarks}
                                onChange={(e) => setStockItemForm({ ...stockItemForm, remarks: e.target.value })}
                                placeholder="Optional"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowStockItemModal(false);
                        setStockItemForm({
                          item_type: 'SFG',
                          unit_of_measure: 'NOS',
                          location_code: 'FG_STORE',
                          quantity: 0,
                          remarks: '',
                          category: '',
                          type: '',
                          grade: '',
                          item_code: '',
                          pack_size: '',
                          dimensions: '',
                          brand: '',
                          item_name: '',
                          sfg_code: '',
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStockItemSubmit}
                      disabled={isSubmittingStockItem || isValidatingOpeningStock || !isFormValid()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isValidatingOpeningStock ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Validating...
                        </>
                      ) : isSubmittingStockItem ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Add Stock Item & Opening Stock'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Opening Stock Upload Modal */}
            {showBulkUploadModal && (
              <BulkOpeningStockUpload
                onClose={() => setShowBulkUploadModal(false)}
                onSuccess={() => {
                  loadStockItems();
                  setStockMessage({ type: 'success', text: 'Bulk opening stock uploaded successfully!' });
                }}
                transactionDate={stockAsOnDate}
              />
            )}

            {/* Add All Opening Stock Modal */}
            {showAddAllOpeningStockModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Add Opening Stock</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedStockItems.size > 0 
                        ? `Set opening stock quantity for ${selectedStockItems.size} selected item(s)`
                        : 'Set opening stock quantity for all active stock items'}
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={addAllOpeningStockQuantity || ''}
                        onChange={(e) => setAddAllOpeningStockQuantity(parseFloat(e.target.value) || 0)}
                        placeholder="Enter quantity (e.g., 100)"
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This quantity will be added to {selectedStockItems.size > 0 ? 'selected' : 'all active'} stock items at their respective locations:
                        <br />• RM & PM → STORE (visible in Material Issue Slip)
                        <br />• SFG → FG_STORE
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> This will update stock balances and create ledger entries. 
                        The updated stock will be visible in Material Issue Slip and other forms.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowAddAllOpeningStockModal(false);
                        setAddAllOpeningStockQuantity(0);
                      }}
                      disabled={isAddingAllOpeningStock}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddAllOpeningStock}
                      disabled={isAddingAllOpeningStock || addAllOpeningStockQuantity <= 0}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isAddingAllOpeningStock ? (
                        <>
                          <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Opening Stock'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Type Selection Modal */}
            {showDeleteTypeModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Select Delete Type</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose how you want to delete {selectedStockItems.size} selected item(s)
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-3">
                      <label 
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          deleteMode === 'soft'
                            ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setDeleteMode('soft')}
                      >
                        <input
                          type="radio"
                          checked={deleteMode === 'soft'}
                          onChange={() => setDeleteMode('soft')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Soft Delete</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Deactivates the items. Items can be reactivated later. This is the safest option.
                          </div>
                        </div>
                      </label>
                      
                      <label 
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          deleteMode === 'with-ledger'
                            ? 'bg-red-50 border-red-400 ring-2 ring-red-200'
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setDeleteMode('with-ledger')}
                      >
                        <input
                          type="radio"
                          checked={deleteMode === 'with-ledger'}
                          onChange={() => setDeleteMode('with-ledger')}
                          className="w-4 h-4 text-red-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Delete + Ledger</div>
                          <div className="text-sm text-red-700 mt-1 font-semibold">
                            ⚠️ CRITICAL: Permanently deletes items AND all transaction history! This cannot be undone.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowDeleteTypeModal(false);
                        setDeleteMode('soft');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteTypeModal(false);
                        handleBulkDeleteStockItems();
                      }}
                      className={`px-4 py-2 text-white rounded-lg hover:opacity-90 ${
                        deleteMode === 'with-ledger'
                          ? 'bg-red-800 hover:bg-red-900'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'account-actions':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Actions</h3>
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Session Management</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Sign out of your current session and return to the login page.
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">User ID:</span>
                      <span className="text-gray-800">{user?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="text-gray-800">{user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className="text-gray-800 capitalize">{user?.isRootAdmin ? 'Root Admin' : 'User'}</span>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">User Profile</h1>
              <p className="text-sm text-gray-500">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex h-full">
          {/* Left Sidebar - Tabs */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 p-6">
            <div className="space-y-2">
              {tabs.map((tab) => {
                if (tab.adminOnly && !user?.isRootAdmin) return null;
                
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-start space-x-3 p-4 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{tab.label}</h3>
                      <p className="text-xs text-gray-500 mt-1">{tab.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingUnit ? 'Edit Unit' : 'Add New Unit'}
                </h3>
                <button
                  onClick={() => setShowUnitModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({...unitForm, name: e.target.value})}
                  placeholder="e.g., Unit 1, Unit 2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({...unitForm, description: e.target.value})}
                  placeholder="e.g., Main Production Unit"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={unitForm.location}
                  onChange={(e) => setUnitForm({...unitForm, location: e.target.value})}
                  placeholder="e.g., Bhimpore"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={unitForm.status}
                  onChange={(e) => setUnitForm({...unitForm, status: e.target.value as 'Active' | 'Inactive' | 'Maintenance'})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowUnitModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnitSubmit}
                disabled={!unitForm.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {editingUnit ? 'Update Unit' : 'Add Unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileModule;