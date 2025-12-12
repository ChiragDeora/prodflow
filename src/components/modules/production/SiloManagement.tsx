'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, Plus, Edit, Eye, Download, Upload, Trash2, Bell, TrendingUp, Package, Gauge, Layers, X, FileSpreadsheet, BarChart3, Grid3X3, Table, Wrench } from 'lucide-react';

interface SiloData {
  silo_id: string;
  silo_number: number;
  silo_name: string;
  capacity_kg: number;
  silo_status: string;
  last_updated_date: string;
  hp_grade_bags: number;
  hp_grade_kg: number;
  hp_grade_percentage: number;
  icp_grade_bags: number;
  icp_grade_kg: number;
  icp_grade_percentage: number;
  cp_grade_bags: number;
  cp_grade_kg: number;
  cp_grade_percentage: number;
  ld_grade_bags: number;
  ld_grade_kg: number;
  ld_grade_percentage: number;
  mb_bags: number;
  mb_kg: number;
  mb_percentage: number;
  total_bags: number;
  total_kg: number;
  capacity_utilization_percentage: number;
}

interface SiloInventory {
  id?: string;
  silo_id: string;
  inventory_date: string;
  hp_grade_bags: number;
  hp_grade_kg: number;
  icp_grade_bags: number;
  icp_grade_kg: number;
  cp_grade_bags: number;
  cp_grade_kg: number;
  ld_grade_bags: number;
  ld_grade_kg: number;
  mb_bags: number;
  mb_kg: number;
}

interface SiloTransaction {
  silo_id: string;
  transaction_date: string;
  transaction_type: 'loading' | 'unloading' | 'transfer';
  material_grade: 'hp_grade' | 'icp_grade' | 'cp_grade' | 'ld_grade' | 'mb';
  material_name: string;
  bags_count: number;
  weight_kg: number;
  grn_number?: string;
  batch_number?: string;
  operator_name?: string;
  supervisor_name?: string;
  remarks?: string;
}

interface SiloAlert {
  id: string;
  silo_id: string;
  alert_level: 'critical' | 'warning' | 'info';
  alert_type: string;
  message: string;
  threshold_value: number;
  current_value: number;
  is_active: boolean;
  created_at: string;
}

interface GrindingRecord {
  id?: string;
  record_date: string;
  silo_id: string;
  material_grade: 'hp_grade' | 'icp_grade' | 'cp_grade' | 'ld_grade' | 'mb';
  material_name: string;
  input_weight_kg: number;
  output_weight_kg: number;
  waste_weight_kg: number;
  efficiency_percentage: number;
  operator_name: string;
  supervisor_name: string;
  remarks?: string;
  created_at?: string;
}

export default function SiloManagement() {
  const [siloData, setSiloData] = useState<SiloData[]>([]);
  const [alerts, setAlerts] = useState<SiloAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingInventory, setEditingInventory] = useState<SiloInventory | null>(null);
  const [newTransaction, setNewTransaction] = useState<SiloTransaction>({
    silo_id: '',
    transaction_date: new Date().toISOString().slice(0, 16),
    transaction_type: 'loading',
    material_grade: 'hp_grade',
    material_name: '',
    bags_count: 0,
    weight_kg: 0
  });
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [grindingRecords, setGrindingRecords] = useState<GrindingRecord[]>([]);
  const [showGrindingModal, setShowGrindingModal] = useState(false);
  const [editingGrindingRecord, setEditingGrindingRecord] = useState<GrindingRecord | null>(null);
  const [newGrindingRecord, setNewGrindingRecord] = useState<GrindingRecord>({
    record_date: new Date().toISOString().split('T')[0],
    silo_id: '',
    material_grade: 'hp_grade',
    material_name: '',
    input_weight_kg: 0,
    output_weight_kg: 0,
    waste_weight_kg: 0,
    efficiency_percentage: 0,
    operator_name: '',
    supervisor_name: '',
    remarks: ''
  });

  useEffect(() => {
    loadSiloData();
    loadAlerts();
    loadGrindingRecords();
  }, [selectedDate]);

  const loadSiloData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/production/silos');
      if (response.ok) {
        const data = await response.json();
        setSiloData(data);
      } else {
        console.error('Failed to load silo data');
      }
    } catch (error) {
      console.error('Error loading silo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/production/silos/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const handleUpdateInventory = async (inventory: SiloInventory) => {
    try {
      const method = inventory.id ? 'PUT' : 'POST';
      const url = inventory.id 
        ? `/api/production/silos/inventory/${inventory.id}`
        : '/api/production/silos/inventory';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventory)
      });

      if (response.ok) {
        console.log(`Inventory ${inventory.id ? 'updated' : 'created'} successfully`);
        setShowInventoryModal(false);
        setEditingInventory(null);
        loadSiloData();
      } else {
        console.error('Failed to save inventory');
      }
    } catch (error) {
      console.error('Error saving inventory:', error);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      const response = await fetch('/api/production/silos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction)
      });

      if (response.ok) {
        console.log('Transaction recorded successfully');
        setShowTransactionModal(false);
        setNewTransaction({
          silo_id: '',
          transaction_date: new Date().toISOString().slice(0, 16),
          transaction_type: 'loading',
          material_grade: 'hp_grade',
          material_name: '',
          bags_count: 0,
          weight_kg: 0
        });
        loadSiloData();
      } else {
        console.error('Failed to record transaction');
      }
    } catch (error) {
      console.error('Error recording transaction:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/production/silos/alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged: true })
      });

      if (response.ok) {
        console.log('Alert acknowledged');
        loadAlerts();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const loadGrindingRecords = async () => {
    try {
      const response = await fetch(`/api/production/silos/grinding?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setGrindingRecords(data);
      } else {
        console.error('Failed to load grinding records');
      }
    } catch (error) {
      console.error('Error loading grinding records:', error);
    }
  };

  const handleSaveGrindingRecord = async (record: GrindingRecord) => {
    try {
      const method = record.id ? 'PUT' : 'POST';
      const url = record.id 
        ? `/api/production/silos/grinding/${record.id}`
        : '/api/production/silos/grinding';
      
      // Calculate efficiency
      const efficiency = record.input_weight_kg > 0 
        ? ((record.output_weight_kg / record.input_weight_kg) * 100)
        : 0;
      
      const recordToSave = {
        ...record,
        efficiency_percentage: efficiency,
        waste_weight_kg: record.input_weight_kg - record.output_weight_kg
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordToSave)
      });

      if (response.ok) {
        console.log(`Grinding record ${record.id ? 'updated' : 'created'} successfully`);
        setShowGrindingModal(false);
        setEditingGrindingRecord(null);
        setNewGrindingRecord({
          record_date: new Date().toISOString().split('T')[0],
          silo_id: '',
          material_grade: 'hp_grade',
          material_name: '',
          input_weight_kg: 0,
          output_weight_kg: 0,
          waste_weight_kg: 0,
          efficiency_percentage: 0,
          operator_name: '',
          supervisor_name: '',
          remarks: ''
        });
        loadGrindingRecords();
      } else {
        console.error('Failed to save grinding record');
        alert('Failed to save grinding record. Please try again.');
      }
    } catch (error) {
      console.error('Error saving grinding record:', error);
      alert('Error saving grinding record. Please try again.');
    }
  };

  const handleDeleteGrindingRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grinding record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/production/silos/grinding/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log('Grinding record deleted successfully');
        loadGrindingRecords();
      } else {
        console.error('Failed to delete grinding record');
        alert('Failed to delete grinding record. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting grinding record:', error);
      alert('Error deleting grinding record. Please try again.');
    }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Find the data row (should contain date)
      let dataRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i][0] && typeof jsonData[i][0] === 'string' && jsonData[i][0].includes('-')) {
          dataRowIndex = i;
          break;
        }
      }

      if (dataRowIndex === -1) {
        console.error('Could not find data row in Excel file');
        return;
      }

      const dataRow = jsonData[dataRowIndex];
      const date = dataRow[0]; // Column A
      
      // SILO-1: HP Grade (B-C), ICP Grade (F-G), CP Grade (J-K)
      const silo1Data = {
        silo_id: siloData.find(s => s.silo_name === 'SILO-1')?.silo_id || '',
        inventory_date: date,
        hp_grade_bags: parseInt(dataRow[1]) || 0,    // Column B
        hp_grade_kg: parseFloat(dataRow[2]) || 0,    // Column C
        icp_grade_bags: parseInt(dataRow[5]) || 0,   // Column F
        icp_grade_kg: parseFloat(dataRow[6]) || 0,   // Column G
        cp_grade_bags: parseInt(dataRow[9]) || 0,    // Column J
        cp_grade_kg: parseFloat(dataRow[10]) || 0,   // Column K
        ld_grade_bags: 0,   // Not in SILO-1
        ld_grade_kg: 0,
        mb_bags: 0,         // Not in SILO-1
        mb_kg: 0
      };

      // SILO-2: HP Grade (N-O), CP Grade (R-S), MB (V-W)
      const silo2Data = {
        silo_id: siloData.find(s => s.silo_name === 'SILO-2')?.silo_id || '',
        inventory_date: date,
        hp_grade_bags: parseInt(dataRow[13]) || 0,   // Column N
        hp_grade_kg: parseFloat(dataRow[14]) || 0,   // Column O
        icp_grade_bags: 0,  // Not in SILO-2
        icp_grade_kg: 0,
        cp_grade_bags: parseInt(dataRow[17]) || 0,   // Column R
        cp_grade_kg: parseFloat(dataRow[18]) || 0,   // Column S
        ld_grade_bags: 0,   // Not in SILO-2
        ld_grade_kg: 0,
        mb_bags: parseInt(dataRow[21]) || 0,         // Column V
        mb_kg: parseFloat(dataRow[22]) || 0          // Column W
      };

      // SILO-3: LD Grade (Z-AA), CP Grade (AD-AE)
      const silo3Data = {
        silo_id: siloData.find(s => s.silo_name === 'SILO-3')?.silo_id || '',
        inventory_date: date,
        hp_grade_bags: 0,   // Not in SILO-3
        hp_grade_kg: 0,
        icp_grade_bags: 0,  // Not in SILO-3
        icp_grade_kg: 0,
        cp_grade_bags: parseInt(dataRow[29]) || 0,   // Column AD
        cp_grade_kg: parseFloat(dataRow[30]) || 0,   // Column AE
        ld_grade_bags: parseInt(dataRow[25]) || 0,   // Column Z
        ld_grade_kg: parseFloat(dataRow[26]) || 0,   // Column AA
        mb_bags: 0,         // Not in SILO-3
        mb_kg: 0
      };

      // Import data for each silo
      for (const siloInventory of [silo1Data, silo2Data, silo3Data]) {
        if (siloInventory.silo_id) {
          await handleUpdateInventory(siloInventory);
        }
      }

      console.log('Excel import completed successfully');
      loadSiloData();
    } catch (error) {
      console.error('Error importing Excel file:', error);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExcelExport = () => {
    // Create Excel structure matching your exact format
    const headers = [
      // Row 1: Main silo headers
      ['Date', 'SILO-1', '', '', '', '', '', '', '', '', '', '', '', 'SILO-2', '', '', '', '', '', '', '', '', '', '', '', 'SILO-3', '', '', '', '', '', '', '', ''],
      // Row 2: 100 indicators  
      ['', '100', '', '', '', '', '', '', '', '', '', '', '', '100', '', '', '', '', '', '', '', '', '', '', '', '100', '', '', '', '', '', '', '', ''],
      // Row 3: Material type headers
      ['', 'HP Grade', '', 'ICP Grade', '', 'CP Grade', '', 'Total', '', '', '', '', '', 'HP Grade', '', 'CP Grade', '', 'MB', '', 'Total', '', '', '', '', '', 'LD Grade', '', 'CP Grade', '', 'Total', '', '', '', ''],
      // Row 4: Unit headers
      ['', 'Bag', 'Kg', 'Bag', 'Kg', 'Bag', 'Kg', 'Bags', '', '', '', '', '', 'Bag', 'Kg', 'Bag', 'Kg', 'Bag', 'Kg', 'Bags', '', '', '', '', '', 'Bag', 'Kg', 'Bag', 'Kg', 'Bags', '', '', '', '']
    ];

    // Add data row
    const dataRow: (string | number)[] = [selectedDate];
    
    // SILO-1 data (columns B-L)
    const silo1 = siloData.find(s => s.silo_name === 'SILO-1');
    if (silo1) {
      dataRow.push(
        silo1.hp_grade_bags, silo1.hp_grade_kg,     // B-C: HP Grade
        '', '',                                       // D-E: Empty
        silo1.icp_grade_bags, silo1.icp_grade_kg,   // F-G: ICP Grade
        '', '',                                       // H-I: Empty
        silo1.cp_grade_bags, silo1.cp_grade_kg,     // J-K: CP Grade
        silo1.total_bags                             // L: Total
      );
    } else {
      dataRow.push('', '', '', '', '', '', '', '', '', '', '');
    }

    // Empty column M
    dataRow.push('');

    // SILO-2 data (columns N-X)
    const silo2 = siloData.find(s => s.silo_name === 'SILO-2');
    if (silo2) {
      dataRow.push(
        silo2.hp_grade_bags, silo2.hp_grade_kg,     // N-O: HP Grade
        '', '',                                       // P-Q: Empty
        silo2.cp_grade_bags, silo2.cp_grade_kg,     // R-S: CP Grade
        '', '',                                       // T-U: Empty
        silo2.mb_bags, silo2.mb_kg,                 // V-W: MB
        silo2.total_bags                             // X: Total
      );
    } else {
      dataRow.push('', '', '', '', '', '', '', '', '', '', '');
    }

    // Empty columns Y
    dataRow.push('');

    // SILO-3 data (columns Z-AH)
    const silo3 = siloData.find(s => s.silo_name === 'SILO-3');
    if (silo3) {
      dataRow.push(
        silo3.ld_grade_bags, silo3.ld_grade_kg,     // Z-AA: LD Grade
        '', '',                                       // AB-AC: Empty
        silo3.cp_grade_bags, silo3.cp_grade_kg,     // AD-AE: CP Grade
        silo3.total_bags                             // AF: Total
      );
    } else {
      dataRow.push('', '', '', '', '', '', '');
    }

    const allData = [...headers, dataRow];
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Set column widths
    ws['!cols'] = Array(50).fill({ wch: 8 });
    
    // Add some styling to headers
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = 0; R <= 3; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FFFF00' } }, // Yellow background for headers
          font: { bold: true }
        };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Silo Inventory');
    XLSX.writeFile(wb, `Silo_Inventory_${selectedDate}.xlsx`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    if (percentage <= 10) return 'text-orange-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clean Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Silo Management</h1>
            <p className="text-gray-600 mt-1">Monitor and manage material inventory across all silos</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Silos</div>
            <div className="text-2xl font-bold text-gray-900">{siloData.length}</div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="text-sm text-gray-600">
              Last Updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-colors ${
                  viewMode === 'cards' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Table className="w-4 h-4" />
                Table
              </button>
            </div>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              className="hidden"
            />
            
            {/* Excel Import Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import Excel'}
            </button>
            
            {/* Excel Export Button */}
            <button
              onClick={handleExcelExport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            
            {/* Add Transaction Button */}
            <button
              onClick={() => setShowTransactionModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter(alert => alert.is_active).length > 0 && (
        <div className="border border-orange-200 bg-orange-50 rounded-lg shadow">
          <div className="p-6 pb-3">
            <h3 className="flex items-center text-orange-800 text-lg font-semibold">
              <Bell className="w-5 h-5 mr-2" />
              Active Alerts ({alerts.filter(alert => alert.is_active).length})
            </h3>
          </div>
          <div className="px-6 pb-6">
            <div className="space-y-2">
              {alerts.filter(alert => alert.is_active).map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.alert_level)} flex justify-between items-center`}>
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm opacity-75">
                      Current: {alert.current_value.toFixed(2)} kg | Threshold: {alert.threshold_value.toFixed(2)} kg
                    </p>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Silo Data Views */}
      {viewMode === 'cards' ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {siloData.map((silo) => (
          <div key={silo.silo_id} className="bg-white rounded-lg border shadow-sm">
            {/* Simple Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{silo.silo_name}</h3>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded mt-1 ${
                    silo.silo_status === 'active' ? 'bg-green-100 text-green-800' :
                    silo.silo_status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {silo.silo_status.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Capacity</div>
                  <div className="text-xl font-bold text-gray-900">
                    {silo.capacity_utilization_percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
            {/* Card Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Total Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Total Inventory</span>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">{silo.total_bags} bags</div>
                      <div className="text-sm text-gray-600">{silo.total_kg.toFixed(2)} kg</div>
                    </div>
                  </div>
                </div>

                {/* Material Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700 text-sm">Material Breakdown</h4>
                  
                  {[
                    { name: 'HP Grade', bags: silo.hp_grade_bags, kg: silo.hp_grade_kg, percentage: silo.hp_grade_percentage },
                    { name: 'ICP Grade', bags: silo.icp_grade_bags, kg: silo.icp_grade_kg, percentage: silo.icp_grade_percentage },
                    { name: 'CP Grade', bags: silo.cp_grade_bags, kg: silo.cp_grade_kg, percentage: silo.cp_grade_percentage },
                    { name: 'LD Grade', bags: silo.ld_grade_bags, kg: silo.ld_grade_kg, percentage: silo.ld_grade_percentage },
                    { name: 'MB', bags: silo.mb_bags, kg: silo.mb_kg, percentage: silo.mb_percentage }
                  ].filter(material => material.kg > 0).map((material) => (
                    <div key={material.name} className="flex justify-between items-center py-1 text-sm">
                      <span className="text-gray-600">{material.name}</span>
                      <div className="text-right">
                        <span className="font-medium text-gray-900">{material.bags} bags</span>
                        <span className="text-gray-500 ml-2">({material.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                  
                  {silo.total_kg === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No materials in this silo</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      setEditingInventory({
                        silo_id: silo.silo_id,
                        inventory_date: selectedDate,
                        hp_grade_bags: silo.hp_grade_bags,
                        hp_grade_kg: silo.hp_grade_kg,
                        icp_grade_bags: silo.icp_grade_bags,
                        icp_grade_kg: silo.icp_grade_kg,
                        cp_grade_bags: silo.cp_grade_bags,
                        cp_grade_kg: silo.cp_grade_kg,
                        ld_grade_bags: silo.ld_grade_bags,
                        ld_grade_kg: silo.ld_grade_kg,
                        mb_bags: silo.mb_bags,
                        mb_kg: silo.mb_kg
                      });
                      setShowInventoryModal(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Update
                  </button>
                  <button
                    onClick={() => {
                      setNewTransaction(prev => ({ ...prev, silo_id: silo.silo_id }));
                      setShowTransactionModal(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Transaction
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      ) : (
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Silo Inventory Table</h3>
            <p className="text-sm text-gray-500 mt-1">Comprehensive view of all silo data</p>
        </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-semibold text-gray-900">Silo</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Capacity</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Total Inventory</th>
                  <th className="text-right p-4 font-semibold text-gray-900">HP Grade</th>
                  <th className="text-right p-4 font-semibold text-gray-900">ICP Grade</th>
                  <th className="text-right p-4 font-semibold text-gray-900">CP Grade</th>
                  <th className="text-right p-4 font-semibold text-gray-900">LD Grade</th>
                  <th className="text-right p-4 font-semibold text-gray-900">MB</th>
                  <th className="text-center p-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {siloData.map((silo) => (
                  <tr key={silo.silo_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{silo.silo_name}</div>
                  </td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        silo.silo_status === 'active' ? 'bg-green-100 text-green-800' :
                        silo.silo_status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {silo.silo_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">{silo.capacity_utilization_percentage.toFixed(1)}%</div>
                      <div className="text-sm text-gray-500">{(silo.capacity_kg / 1000).toFixed(1)}t</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">{silo.total_bags} bags</div>
                      <div className="text-sm text-gray-500">{(silo.total_kg / 1000).toFixed(2)}t</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">{silo.hp_grade_bags}</div>
                      <div className="text-sm text-gray-500">{silo.hp_grade_percentage.toFixed(1)}%</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">{silo.icp_grade_bags}</div>
                      <div className="text-sm text-gray-500">{silo.icp_grade_percentage.toFixed(1)}%</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">{silo.cp_grade_bags}</div>
                      <div className="text-sm text-gray-500">{silo.cp_grade_percentage.toFixed(1)}%</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">{silo.ld_grade_bags}</div>
                      <div className="text-sm text-gray-500">{silo.ld_grade_percentage.toFixed(1)}%</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900">{silo.mb_bags}</div>
                      <div className="text-sm text-gray-500">{silo.mb_percentage.toFixed(1)}%</div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingInventory({
                              silo_id: silo.silo_id,
                              inventory_date: selectedDate,
                              hp_grade_bags: silo.hp_grade_bags,
                              hp_grade_kg: silo.hp_grade_kg,
                              icp_grade_bags: silo.icp_grade_bags,
                              icp_grade_kg: silo.icp_grade_kg,
                              cp_grade_bags: silo.cp_grade_bags,
                              cp_grade_kg: silo.cp_grade_kg,
                              ld_grade_bags: silo.ld_grade_bags,
                              ld_grade_kg: silo.ld_grade_kg,
                              mb_bags: silo.mb_bags,
                              mb_kg: silo.mb_kg
                            });
                            setShowInventoryModal(true);
                          }}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Update
                        </button>
                        <button
                          onClick={() => {
                            setNewTransaction(prev => ({ ...prev, silo_id: silo.silo_id }));
                            setShowTransactionModal(true);
                          }}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                        >
                          <Package className="w-3 h-3" />
                          Transaction
                        </button>
                          </div>
                    </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Table Summary */}
          <div className="p-6 border-t bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{siloData.length}</div>
                <div className="text-sm text-gray-600">Total Silos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {(siloData.reduce((sum, silo) => sum + silo.capacity_kg, 0) / 1000).toFixed(1)}t
              </div>
                <div className="text-sm text-gray-600">Total Capacity</div>
            </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {(siloData.reduce((sum, silo) => sum + silo.total_kg, 0) / 1000).toFixed(1)}t
          </div>
                <div className="text-sm text-gray-600">Current Stock</div>
        </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {((siloData.reduce((sum, silo) => sum + silo.total_kg, 0) / siloData.reduce((sum, silo) => sum + silo.capacity_kg, 0)) * 100).toFixed(1)}%
      </div>
                <div className="text-sm text-gray-600">Utilization</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Update Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Update Silo Inventory</h2>
              <button
                onClick={() => setShowInventoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          {editingInventory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingInventory.inventory_date}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, inventory_date: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HP Grade Bags</label>
                  <input
                    type="number"
                    value={editingInventory.hp_grade_bags}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, hp_grade_bags: parseInt(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HP Grade Kg</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingInventory.hp_grade_kg}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, hp_grade_kg: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ICP Grade Bags</label>
                  <input
                    type="number"
                    value={editingInventory.icp_grade_bags}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, icp_grade_bags: parseInt(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ICP Grade Kg</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingInventory.icp_grade_kg}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, icp_grade_kg: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CP Grade Bags</label>
                  <input
                    type="number"
                    value={editingInventory.cp_grade_bags}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, cp_grade_bags: parseInt(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CP Grade Kg</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingInventory.cp_grade_kg}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, cp_grade_kg: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LD Grade Bags</label>
                  <input
                    type="number"
                    value={editingInventory.ld_grade_bags}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, ld_grade_bags: parseInt(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LD Grade Kg</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingInventory.ld_grade_kg}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, ld_grade_kg: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MB Bags</label>
                  <input
                    type="number"
                    value={editingInventory.mb_bags}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, mb_bags: parseInt(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MB Kg</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingInventory.mb_kg}
                    onChange={(e) => setEditingInventory(prev => prev ? { ...prev, mb_kg: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateInventory(editingInventory)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Inventory
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Transaction</h2>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Silo</label>
                <select
                  value={newTransaction.silo_id}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, silo_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select silo</option>
                  {siloData.map((silo) => (
                    <option key={silo.silo_id} value={silo.silo_id}>
                      {silo.silo_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                <select
                  value={newTransaction.transaction_type}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, transaction_type: e.target.value as 'loading' | 'unloading' | 'transfer' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="loading">Loading</option>
                  <option value="unloading">Unloading</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Grade</label>
                <select
                  value={newTransaction.material_grade}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, material_grade: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hp_grade">HP Grade</option>
                  <option value="icp_grade">ICP Grade</option>
                  <option value="cp_grade">CP Grade</option>
                  <option value="ld_grade">LD Grade</option>
                    <option value="mb">Master Batch</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
                <input
                    type="text"
                  value={newTransaction.material_name}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, material_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter material name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bags Count</label>
                <input
                  type="number"
                  value={newTransaction.bags_count}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, bags_count: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (Kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.weight_kg}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date & Time</label>
                <input
                  type="datetime-local"
                  value={newTransaction.transaction_date}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, transaction_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

              <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTransaction}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Record Transaction
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Grinding Record Management Section */}
      <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Grinding Record Management
                </h2>
                <p className="text-gray-600 mt-1">Track and manage grinding operations for silo materials</p>
              </div>
              <button
                onClick={() => {
                  setEditingGrindingRecord(null);
                  setNewGrindingRecord({
                    record_date: selectedDate,
                    silo_id: '',
                    material_grade: 'hp_grade',
                    material_name: '',
                    input_weight_kg: 0,
                    output_weight_kg: 0,
                    waste_weight_kg: 0,
                    efficiency_percentage: 0,
                    operator_name: '',
                    supervisor_name: '',
                    remarks: ''
                  });
                  setShowGrindingModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Grinding Record
              </button>
            </div>
          </div>

          <div className="p-6">
            {grindingRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No grinding records found for the selected date.</p>
                <p className="text-sm mt-2">Click "Add Grinding Record" to create a new record.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-semibold text-gray-900">Date</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Silo</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Material</th>
                      <th className="text-right p-4 font-semibold text-gray-900">Input (Kg)</th>
                      <th className="text-right p-4 font-semibold text-gray-900">Output (Kg)</th>
                      <th className="text-right p-4 font-semibold text-gray-900">Waste (Kg)</th>
                      <th className="text-right p-4 font-semibold text-gray-900">Efficiency (%)</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Operator</th>
                      <th className="text-center p-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grindingRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">{new Date(record.record_date).toLocaleDateString()}</td>
                        <td className="p-4">
                          {siloData.find(s => s.silo_id === record.silo_id)?.silo_name || 'N/A'}
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{record.material_name}</div>
                          <div className="text-sm text-gray-500">{record.material_grade.replace('_', ' ').toUpperCase()}</div>
                        </td>
                        <td className="p-4 text-right">{record.input_weight_kg.toFixed(2)}</td>
                        <td className="p-4 text-right">{record.output_weight_kg.toFixed(2)}</td>
                        <td className="p-4 text-right">{record.waste_weight_kg.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <span className={`font-medium ${
                            record.efficiency_percentage >= 95 ? 'text-green-600' :
                            record.efficiency_percentage >= 85 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {record.efficiency_percentage.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-4">{record.operator_name}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingGrindingRecord(record);
                                setShowGrindingModal(true);
                              }}
                              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => record.id && handleDeleteGrindingRecord(record.id)}
                              className="px-3 py-1 text-sm border border-red-300 rounded hover:bg-red-50 text-red-600 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* Grinding Record Modal */}
      {showGrindingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingGrindingRecord ? 'Edit' : 'Add'} Grinding Record
              </h2>
              <button
                onClick={() => {
                  setShowGrindingModal(false);
                  setEditingGrindingRecord(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingGrindingRecord?.record_date || newGrindingRecord.record_date}
                    onChange={(e) => {
                      if (editingGrindingRecord) {
                        setEditingGrindingRecord({ ...editingGrindingRecord, record_date: e.target.value });
                      } else {
                        setNewGrindingRecord({ ...newGrindingRecord, record_date: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Silo</label>
                  <select
                    value={editingGrindingRecord?.silo_id || newGrindingRecord.silo_id}
                    onChange={(e) => {
                      if (editingGrindingRecord) {
                        setEditingGrindingRecord({ ...editingGrindingRecord, silo_id: e.target.value });
                      } else {
                        setNewGrindingRecord({ ...newGrindingRecord, silo_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select silo</option>
                    {siloData.map((silo) => (
                      <option key={silo.silo_id} value={silo.silo_id}>
                        {silo.silo_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Grade</label>
                  <select
                    value={editingGrindingRecord?.material_grade || newGrindingRecord.material_grade}
                    onChange={(e) => {
                      if (editingGrindingRecord) {
                        setEditingGrindingRecord({ ...editingGrindingRecord, material_grade: e.target.value as any });
                      } else {
                        setNewGrindingRecord({ ...newGrindingRecord, material_grade: e.target.value as any });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hp_grade">HP Grade</option>
                    <option value="icp_grade">ICP Grade</option>
                    <option value="cp_grade">CP Grade</option>
                    <option value="ld_grade">LD Grade</option>
                    <option value="mb">Master Batch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
                  <input
                    type="text"
                    value={editingGrindingRecord?.material_name || newGrindingRecord.material_name}
                    onChange={(e) => {
                      if (editingGrindingRecord) {
                        setEditingGrindingRecord({ ...editingGrindingRecord, material_name: e.target.value });
                      } else {
                        setNewGrindingRecord({ ...newGrindingRecord, material_name: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter material name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Input Weight (Kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingGrindingRecord?.input_weight_kg || newGrindingRecord.input_weight_kg}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (editingGrindingRecord) {
                        const output = editingGrindingRecord.output_weight_kg || 0;
                        const efficiency = value > 0 ? ((output / value) * 100) : 0;
                        setEditingGrindingRecord({ 
                          ...editingGrindingRecord, 
                          input_weight_kg: value,
                          efficiency_percentage: efficiency,
                          waste_weight_kg: value - output
                        });
                      } else {
                        const output = newGrindingRecord.output_weight_kg || 0;
                        const efficiency = value > 0 ? ((output / value) * 100) : 0;
                        setNewGrindingRecord({ 
                          ...newGrindingRecord, 
                          input_weight_kg: value,
                          efficiency_percentage: efficiency,
                          waste_weight_kg: value - output
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output Weight (Kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingGrindingRecord?.output_weight_kg || newGrindingRecord.output_weight_kg}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (editingGrindingRecord) {
                        const input = editingGrindingRecord.input_weight_kg || 0;
                        const efficiency = input > 0 ? ((value / input) * 100) : 0;
                        setEditingGrindingRecord({ 
                          ...editingGrindingRecord, 
                          output_weight_kg: value,
                          efficiency_percentage: efficiency,
                          waste_weight_kg: input - value
                        });
                      } else {
                        const input = newGrindingRecord.input_weight_kg || 0;
                        const efficiency = input > 0 ? ((value / input) * 100) : 0;
                        setNewGrindingRecord({ 
                          ...newGrindingRecord, 
                          output_weight_kg: value,
                          efficiency_percentage: efficiency,
                          waste_weight_kg: input - value
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waste Weight (Kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingGrindingRecord?.waste_weight_kg || newGrindingRecord.waste_weight_kg}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Efficiency (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingGrindingRecord?.efficiency_percentage.toFixed(2) || newGrindingRecord.efficiency_percentage.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator Name</label>
                  <input
                    type="text"
                    value={editingGrindingRecord?.operator_name || newGrindingRecord.operator_name}
                    onChange={(e) => {
                      if (editingGrindingRecord) {
                        setEditingGrindingRecord({ ...editingGrindingRecord, operator_name: e.target.value });
                      } else {
                        setNewGrindingRecord({ ...newGrindingRecord, operator_name: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter operator name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Name</label>
                  <input
                    type="text"
                    value={editingGrindingRecord?.supervisor_name || newGrindingRecord.supervisor_name}
                    onChange={(e) => {
                      if (editingGrindingRecord) {
                        setEditingGrindingRecord({ ...editingGrindingRecord, supervisor_name: e.target.value });
                      } else {
                        setNewGrindingRecord({ ...newGrindingRecord, supervisor_name: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter supervisor name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={editingGrindingRecord?.remarks || newGrindingRecord.remarks || ''}
                  onChange={(e) => {
                    if (editingGrindingRecord) {
                      setEditingGrindingRecord({ ...editingGrindingRecord, remarks: e.target.value });
                    } else {
                      setNewGrindingRecord({ ...newGrindingRecord, remarks: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter any remarks or notes"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowGrindingModal(false);
                    setEditingGrindingRecord(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveGrindingRecord(editingGrindingRecord || newGrindingRecord)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  {editingGrindingRecord ? 'Update' : 'Save'} Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
