'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  HelpCircle, Info, Link, Menu, Package, Plus, Save, Upload, User, Wrench, X, Settings, Shield, Palette, Building2, CheckCircle, XCircle
} from 'lucide-react';
import { useAuth } from './auth/AuthProvider';
import { useAccessControl } from '../lib/useAccessControl';
import ExcelFileReader from './ExcelFileReader';
import UnitSelector from './UnitSelector';
import { 
  machineAPI, 
  moldAPI, 
  scheduleAPI, 
  rawMaterialAPI, 
  packingMaterialAPI,
  lineAPI,
  unitAPI,
  unitManagementSettingsAPI,
  colorLabelAPI,
  partyNameAPI,
  Machine as SupabaseMachine, 
  Mold as SupabaseMold, 
  ScheduleJob as SupabaseScheduleJob,
  RawMaterial as SupabaseRawMaterial,
  PackingMaterial as SupabasePackingMaterial,
  Line as SupabaseLine,
  ColorLabel,
  PartyName,
  Unit
} from '../lib/supabase';

import { moduleRegistry, getAvailableModules, getModule } from './modules/moduleRegistry';


// Type definitions (using Supabase types)
type Machine = SupabaseMachine;
type Mold = SupabaseMold;

type ScheduleJob = SupabaseScheduleJob;
type RawMaterial = SupabaseRawMaterial;
type PackingMaterial = SupabasePackingMaterial;
type Line = SupabaseLine;

interface JobForm {
  date: string;
  shift: 'Day' | 'Evening' | 'Night';
  machine_id: string;
  mold_id: string;
  start_time: string;
  end_time: string;
  color: string;
  expected_pieces: string;
  stacks_per_box: string;
  pieces_per_stack: string;
  created_by: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

type ModuleType = 'welcome-dashboard' | 'scheduler' | 'masters' | 'approvals' | 'reports' | 'maintenance' | 'quality' | 'profile' | 'production' | 'store-dispatch' | 'prod-planner';
type ModalType = 'job' | 'machine' | 'mold' | 'packing_material' | 'raw_material' | 'line' | 'view_machine' | 'view_mold' | 'view_schedule' | 'view_packing_material' | 'view_raw_material' | 'view_line' | 'edit_line' | 'color_label' | 'party_name' | 'view_color_label' | 'view_party_name' | '';
type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material' | 'packing_material' | 'line' | 'color_label' | 'party_name';
type DataType = 'machines' | 'molds' | 'raw_materials' | 'packing_materials' | 'lines' | 'color_labels' | 'party_names';

const ProductionSchedulerERP: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<ModuleType>('welcome-dashboard');
  
  const [currentView, setCurrentView] = useState<string>('daily');
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Unit filter state - now using unit IDs instead of names
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [editingItem, setEditingItem] = useState<Machine | Mold | ScheduleJob | RawMaterial | PackingMaterial | Line | ColorLabel | PartyName | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [viewingNameplate, setViewingNameplate] = useState<string | null>(null);
  const [showExcelReader, setShowExcelReader] = useState<boolean>(false);
  const [excelDataType, setExcelDataType] = useState<DataType>('machines');
  const [loading, setLoading] = useState<boolean>(true);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [infoModalType, setInfoModalType] = useState<string>('');

  
  // Separate sorting states for Machine Master and Mold Master tabs
  const [machineSortField, setMachineSortField] = useState<string>('machine_id');
  const [machineSortDirection, setMachineSortDirection] = useState<'asc' | 'desc'>('asc');
  const [machineCategoryFilter, setMachineCategoryFilter] = useState<string>('IM');
  const [moldSortField, setMoldSortField] = useState<string>('mold_id');
  const [moldSortDirection, setMoldSortDirection] = useState<'asc' | 'desc'>('asc');

  // Raw Materials sorting state
  const [rawMaterialSortField, setRawMaterialSortField] = useState<string>('sl_no');
  const [rawMaterialSortDirection, setRawMaterialSortDirection] = useState<'asc' | 'desc'>('asc');

  // Packing Materials sorting state
  const [packingMaterialSortField, setPackingMaterialSortField] = useState<string>('sl_no');
  const [packingMaterialSortDirection, setPackingMaterialSortDirection] = useState<'asc' | 'desc'>('asc');

  // Line sorting state
  const [lineSortField, setLineSortField] = useState<string>('line_id');
  const [lineSortDirection, setLineSortDirection] = useState<'asc' | 'desc'>('asc');

  // Packing Materials category filter state
  const [packingMaterialCategoryFilter, setPackingMaterialCategoryFilter] = useState<string>('all');


  
  // Data from Supabase
  const [machinesMaster, setMachinesMaster] = useState<Machine[]>([]);
  const [moldsMaster, setMoldsMaster] = useState<Mold[]>([]);

  const [rawMaterialsMaster, setRawMaterialsMaster] = useState<RawMaterial[]>([]);
  const [packingMaterialsMaster, setPackingMaterialsMaster] = useState<PackingMaterial[]>([]);
  const [linesMaster, setLinesMaster] = useState<Line[]>([]);
  const [lineDetails, setLineDetails] = useState<Map<string, Line>>(new Map());
  const [scheduleData, setScheduleData] = useState<ScheduleJob[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitManagementEnabled, setUnitManagementEnabled] = useState(false);
  const [defaultUnit, setDefaultUnit] = useState('Unit 1');

  // Handle nameplate image upload
  const handleNameplateUpload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // Load data from Supabase on component mount with timeout
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let isMounted = true;
    
    const loadDataWithTimeout = async () => {
      if (!isMounted) return;
      
      try {
        console.log(`Starting data loading (attempt ${retryCount + 1}/${maxRetries})...`);
        
        // Using SimpleAuthProvider - no session check needed
        
        // Comment out timeout to prevent interruptions during normal usage
        // const timeoutPromise = new Promise((_, reject) => 
        //   setTimeout(() => reject(new Error('Data loading timeout')), 15000)
        // );
        
        // await Promise.race([loadAllData(), timeoutPromise]);
        await loadAllData();
        
        if (isMounted) {
          console.log('Data loading completed successfully');
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error(`Error loading data (attempt ${retryCount + 1}):`, error);
        
        // Check if it's an auth-related error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('JWT') || errorMessage.includes('auth') || errorMessage.includes('timeout')) {
          console.log('Auth-related or timeout error, stopping retries');
          if (isMounted) {
        setLoading(false);
          }
          return;
        }
        
        retryCount++;
        
        if (retryCount < maxRetries && isMounted) {
          console.log(`Retrying data loading in ${retryCount * 2000}ms...`);
          setTimeout(loadDataWithTimeout, retryCount * 2000);
        } else {
          console.log('Max retries reached, stopping data loading');
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    };
    
    // Add a small delay to ensure auth is ready
    const timer = setTimeout(() => {
      if (isMounted) {
    loadDataWithTimeout();
      }
    }, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log('Loading all data...');
      
      // Using SimpleAuthProvider - no session check needed
      
          console.log('Starting API calls...');
          
          // Call APIs individually to catch specific errors
          let machines: Machine[] = [];
          let molds: Mold[] = [];
          let schedules: ScheduleJob[] = [];
          let rawMaterials: RawMaterial[] = [];
          let packingMaterials: PackingMaterial[] = [];
          let lines: Line[] = [];
          let unitsData: Unit[] = [];
          
          try {
            machines = await machineAPI.getAll();
            console.log('Machines API call successful:', machines.length);
          } catch (error) {
            console.error('Machines API call failed:', error);
            machines = [];
          }
          
          try {
            molds = await moldAPI.getAll();
            console.log('Molds API call successful:', molds.length);
          } catch (error: any) {
            console.error('Molds API call failed:', error);
            console.error('Molds error details:', {
              message: error?.message,
              details: error?.details,
              hint: error?.hint,
              code: error?.code
            });
            molds = [];
          }
          
          try {
            schedules = await scheduleAPI.getAll();
            console.log('Schedules API call successful:', schedules.length);
          } catch (error) {
            console.error('Schedules API call failed:', error);
            schedules = [];
          }
          
          try {
            rawMaterials = await rawMaterialAPI.getAll();
            console.log('Raw Materials API call successful:', rawMaterials.length);
          } catch (error) {
            console.error('Raw Materials API call failed:', error);
            rawMaterials = [];
          }
          
          try {
            packingMaterials = await packingMaterialAPI.getAll();
            console.log('Packing Materials API call successful:', packingMaterials.length);
          } catch (error: any) {
            console.error('Packing Materials API call failed:', error);
            console.error('Packing Materials error details:', {
              message: error?.message,
              details: error?.details,
              hint: error?.hint,
              code: error?.code
            });
            packingMaterials = [];
          }
          
          try {
            lines = await lineAPI.getAll();
            console.log('Lines API call successful:', lines.length);
          } catch (error: any) {
            console.error('Lines API call failed:', error);
            console.error('Lines error details:', {
              message: error?.message,
              details: error?.details,
              hint: error?.hint,
              code: error?.code
            });
            lines = [];
          }
          
          try {
            unitsData = await unitAPI.getAll();
            console.log('Units API call successful:', unitsData.length);
          } catch (error: any) {
            console.error('Units API call failed:', error);
            console.error('Units error details:', {
              message: error?.message,
              details: error?.details,
              hint: error?.hint,
              code: error?.code
            });
            unitsData = [];
          }
      
              console.log('Data loaded successfully:', { 
          machines: machines.length,
          molds: molds.length,
          schedules: schedules.length,
          raw_materials: rawMaterials.length,
          packing_materials: packingMaterials.length,
          lines: lines.length,
          units: unitsData.length
        });
        
        // Debug: Log sample data to see what's being loaded
        console.log('Sample packing materials:', packingMaterials.slice(0, 3));
        console.log('Sample molds:', molds.slice(0, 3));
        console.log('Sample lines:', lines.slice(0, 3));
        
        // More detailed debugging
        console.log('Raw data details:');
        console.log('- machines:', machines);
        console.log('- molds:', molds);
        console.log('- lines:', lines);
        console.log('- rawMaterials:', rawMaterials);
        console.log('- packingMaterials:', packingMaterials);
        console.log('- units:', unitsData);
      
              setMachinesMaster(machines);
        setMoldsMaster(molds);
        setScheduleData(schedules);
        setRawMaterialsMaster(rawMaterials);
        setPackingMaterialsMaster(packingMaterials);
        setLinesMaster(lines);
      setUnits(unitsData);
      console.log('📦 Units loaded from database:', unitsData.length, 'units');
      if (unitsData.length > 0) {
        console.log('📋 Sample unit:', unitsData[0]);
      }
      
        // Load unit management settings
  try {
    const enabled = await unitManagementSettingsAPI.isUnitManagementEnabled();
    const defaultUnitSetting = await unitManagementSettingsAPI.getDefaultUnit();
    setUnitManagementEnabled(enabled);
    setDefaultUnit(defaultUnitSetting);
    console.log('Unit management settings loaded:', { enabled, defaultUnit: defaultUnitSetting });
  } catch (error) {
    console.error('Error loading unit management settings:', error);
  }
    } catch (error) {
      console.error('Error loading data:', error);
      // If data loading fails due to auth issues, don't retry indefinitely
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('JWT') || errorMessage.includes('auth')) {
        console.log('Auth-related error, stopping retries');
        setLoading(false);
        return;
      }
      throw error; // Re-throw for retry mechanism
    }
    setLoading(false);
  };

  const handleDataImported = () => {
    // Reload all data after import
    loadAllData().then(() => {
      // After data is loaded, automatically sort based on current sort preferences
      // This ensures that newly imported data is immediately sorted according to user preferences
      console.log('Data imported successfully, applying automatic sorting...');
      
      // Ensure default sorting is applied if no preferences exist
      if (typeof window !== 'undefined') {
        const userId = localStorage.getItem('currentUserId') || 'default';
        
        // Set default machine sorting if not already set
        if (!localStorage.getItem(`prodSchedulerMachineSortField_${userId}`)) {
          setMachineSortField('machine_id');
          setMachineSortDirection('asc');
          localStorage.setItem(`prodSchedulerMachineSortField_${userId}`, 'machine_id');
          localStorage.setItem(`prodSchedulerMachineSortDirection_${userId}`, 'asc');
        }
        
        // Set default mold sorting if not already set
        if (!localStorage.getItem(`prodSchedulerMoldSortField_${userId}`)) {
          setMoldSortField('mold_id');
          setMoldSortDirection('asc');
          localStorage.setItem(`prodSchedulerMoldSortField_${userId}`, 'mold_id');
          localStorage.setItem(`prodSchedulerMoldSortDirection_${userId}`, 'asc');
        }
      }
      
      // The sorting will be applied automatically through the existing sort functions
      // since they use the current machineSortField/moldSortField and machineSortDirection/moldSortDirection state values
      // which are already persisted in localStorage
      
      // Force a re-render to ensure the sorted data is displayed
              setMachinesMaster(prev => [...prev]);
        setMoldsMaster(prev => [...prev]);
        setRawMaterialsMaster(prev => [...prev]);
        setPackingMaterialsMaster(prev => [...prev]);
        setLinesMaster(prev => [...prev]);
    });
    setShowExcelReader(false);
  };

  // Info Button Component
  const InfoButton: React.FC<{ type: string; className?: string }> = ({ type, className = "" }) => (
    <button
      onClick={() => {
        setInfoModalType(type);
        setShowInfoModal(true);
      }}
      className={`p-2 text-gray-400 hover:text-blue-600 transition-colors ${className}`}
      title="Information about table columns"
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );

  // Info Modal Component
  const InfoModal: React.FC = () => {
    const getColumnInfo = () => {
      switch (infoModalType) {
        case 'machines':
          return [
            { column: 'Sr. No.', description: 'Machine ID (e.g., JSW-1, HAIT-1, WITT-1). Unique identifier for each machine in the system.' },
            { column: 'Category', description: 'Machine category (IM, Robot, Aux, Utility). IM = Injection Molding, Robot = Robotic equipment, Aux = Auxiliary equipment, Utility = Utility equipment.' },
            { column: 'Make', description: 'Manufacturer name (e.g., JSW, Haitain, Wittmaan, Switek). The company that manufactured the machine.' },
            { column: 'Size', description: 'Machine capacity in tons (e.g., 280T, 350T, 380T). Represents the clamping force or capacity of the machine.' },
            { column: 'Model', description: 'Machine model number (e.g., J-280-ADS, MA3800H/1280PRO). Specific model designation from the manufacturer.' },
            { column: 'Serial No.', description: 'Machine serial number. For IM machines: Format is "CLM_SERIAL/INJ_SERIAL" (e.g., 22182C929929/22182GH62H62). For other machines: Single serial number (e.g., 8EH0001543). IM machines have dual serial numbers for CLM and Injection units, while robots and auxiliary equipment have single serial numbers.' },
            { column: 'Mfg Date', description: 'Manufacturing date when the machine was built by the manufacturer (e.g., 2022-02-01, 2024-05-01).' },
            { column: 'Inst Date', description: 'Installation date when the machine started production in your factory (e.g., 2022-09-01, 2024-08-01). This is when the machine was commissioned for production use.' },
            { column: 'Dimensions', description: 'Physical dimensions of the machine. For IM machines: Format is "LxBxH" (Length x Breadth x Height) in mm (e.g., 6555 x 1764 x 2060). For robots: If X,Y,Z is mentioned, it refers to robot axes coordinates. For other equipment: LxBxH format without axes information.' },
            { column: 'Name Plate', description: 'View machine nameplate details and specifications. Click to see technical details, ratings, and manufacturer information.' },
            { column: 'Status', description: 'Machine operational status. Active = In production, Maintenance = Under maintenance/repair, Idle = Available but not in use.' },
            { column: 'Actions', description: 'Available actions: View details, Edit machine information, Delete machine from system.' }
          ];
        case 'molds':
          return [
            { column: 'Item Code', description: 'Mold ID (e.g., RP-1, RP-2). Unique identifier for each mold in the system.' },
            { column: 'Item Name', description: 'Product name (e.g., Ro10-C, Ro48-C). Name of the product that this mold produces.' },
            { column: 'Type', description: 'Mold type (e.g., Injection Mold, Container, Lid). Classification of the mold based on its purpose.' },
            { column: 'Cavity', description: 'Number of cavities in the mold (e.g., 1, 2, 4, 8). How many parts can be produced in one cycle.' },
            { column: 'Cycle Time', description: 'Production cycle time in seconds (e.g., 30s, 45s). Time required to complete one production cycle.' },
            { column: 'Int. Wt.', description: 'Internal weight in grams (e.g., 100g, 150g). Internal weight of the finished product from this mold.' },
            { column: 'HRC Zone', description: 'Hot Runner Control Zone (e.g., Zone A, Zone B). Zone designation for hot runner temperature control.' },
            { column: 'Make', description: 'Mold manufacturer (e.g., Wittmaan, Switek). Company that manufactured the mold.' },
            { column: 'Status', description: 'Mold operational status. Active = In production, Maintenance = Under maintenance/repair, Idle = Available but not in use.' },
            { column: 'Actions', description: 'Available actions: View details, Edit mold information, Delete mold from system.' }
          ];
        case 'raw_materials':
          return [
            { column: 'Sl. No.', description: 'Serial number for raw material identification (e.g., 1, 2, 3). Sequential numbering for easy reference.' },
            { column: 'Category', description: 'Material category (e.g., PP, PE, ABS). Primary classification of the raw material type.' },
            { column: 'Type', description: 'Material type specification (e.g., HP, ICP, RCP, LDPE, MB). Specific type and grade classification.' },
            { column: 'Grade', description: 'Material grade specification (e.g., HJ333MO, 1750 MN). Quality and performance classification of the material.' },
            { column: 'Supplier', description: 'Material supplier name (e.g., Borouge, IOCL, Basell). Company that supplies the raw material.' },
            { column: 'MFI', description: 'Melt Flow Index (e.g., 75, 60, 70). Measure of material flow characteristics during processing.' },
            { column: 'Density', description: 'Material density in g/cm³ (e.g., 910, 900, 903). Physical property indicating material weight per unit volume.' },
            { column: 'TDS', description: 'Technical Data Sheet image. Click to view the TDS document for detailed material specifications.' },
            { column: 'Actions', description: 'Available actions: View details, Edit material information, Delete material from system.' }
          ];
        case 'packing_materials':
          return [
            { column: 'Category', description: 'Packing material category (e.g., Boxes, PolyBags, Bopp). Classification of the packing material type.' },
            { column: 'Type', description: 'Packing material type (e.g., Export, Local). Specific type or variant of the packing material.' },
            { column: 'Item Code', description: 'Unique item code for the packing material (e.g., CTN-Ro16, CTN-Ro48). Product identifier for inventory management.' },
            { column: 'Pack Size', description: 'Quantity per pack (e.g., 150, 800). Number of items or units in one pack.' },
            { column: 'Dimensions', description: 'Physical dimensions of the packing material (e.g., LxBxH format). Size specifications for storage and handling.' },
            { column: 'Technical Detail', description: 'Technical specifications and requirements (e.g., material grade, strength, specifications). Detailed technical information about the packing material.' },
            { column: 'Brand', description: 'Brand or manufacturer name (e.g., Regular, Gesa). Company that manufactures or supplies the packing material.' },
            { column: 'Actions', description: 'Available actions: View details, Edit packing material information, Delete packing material from system.' }
          ];
        default:
          return [];
      }
    };

    const getModalTitle = () => {
      switch (infoModalType) {
        case 'machines': return 'Machine Master Columns';
        case 'molds': return 'Mold Master Columns';
        case 'raw_materials': return 'RM Master Columns';
        case 'packing_materials': return 'PM Master Columns';
        default: return 'Table Columns';
      }
    };

    const getModalDescription = () => {
      switch (infoModalType) {
        case 'machines': return 'Understanding the machine master table columns and their meanings.';
        case 'molds': return 'Understanding the mold master table columns and their meanings.';
        case 'raw_materials': return 'Understanding the RM master table columns and their meanings.';
        case 'packing_materials': return 'Understanding the PM master table columns and their meanings.';
        default: return 'Information about table columns.';
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getModalTitle()}</h2>
                <p className="text-sm text-gray-500 mt-1">{getModalDescription()}</p>
              </div>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              {getColumnInfo().map((item, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-32 font-medium text-gray-900">
                    {item.column}
                  </div>
                  <div className="flex-1 text-gray-700">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={() => setShowInfoModal(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Sorting function
  const sortMachines = (machines: Machine[], field: string, direction: 'asc' | 'desc'): Machine[] => {
    return [...machines].sort((a, b) => {
      let aValue: any = a[field as keyof Machine];
      let bValue: any = b[field as keyof Machine];
      
      // Handle special cases
      if (field === 'capacity_tons' || field === 'size') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (field === 'machine_id') {
        // Custom sorting order based on the image
        const categoryOrder = [
          'JSW', 'HAIT', 'TOYO', 'WITT', 'SWTK', 'CONY', 'Hoist', 
          'Chiller', 'AIR', 'ELEC', 'Pump', 'CTower', 'Blower', 
          'Grinding', 'PPACK', 'SILO', 'LIFT', 'Stacker', 'Cooler', 'RO'
        ];
        
        const getCategoryFromId = (id: string) => {
          for (const category of categoryOrder) {
            if (id.startsWith(category)) {
              return category;
            }
          }
          return 'OTHER'; // For any unmatched categories
        };
        
        const aCategory = getCategoryFromId(String(aValue));
        const bCategory = getCategoryFromId(String(bValue));
        
        // First compare by category order
        const aCategoryIndex = categoryOrder.indexOf(aCategory);
        const bCategoryIndex = categoryOrder.indexOf(bCategory);
        
        if (aCategoryIndex !== bCategoryIndex) {
          return direction === 'asc' ? aCategoryIndex - bCategoryIndex : bCategoryIndex - aCategoryIndex;
        }
        
        // If same category, compare by number
        const extractNumber = (id: string) => {
          const match = id.match(/(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        };
        
        const aNum = extractNumber(String(aValue));
        const bNum = extractNumber(String(bValue));
        
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortMolds = (molds: Mold[], field: string, direction: 'asc' | 'desc'): Mold[] => {
    console.log(`Sorting molds by ${field} in ${direction} order`);
    console.log('Original molds:', molds.map(m => ({ id: m.mold_id, item_code: m.item_code })));
    
    return [...molds].sort((a, b) => {
      let aValue: any = a[field as keyof Mold];
      let bValue: any = b[field as keyof Mold];
      
      console.log(`Comparing: ${aValue} vs ${bValue} for field ${field}`);
      
      // Handle special cases
      if (field === 'cavities' || field === 'cycle_time' || field === 'st_wt') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (field === 'mold_id' || field === 'item_code' || field === 'sr_no') {
        // Special handling for mold IDs like "RP-1", "RP-10", etc.
        const extractNumber = (id: string) => {
          // Handle patterns like "RP-1", "RP-10", "MOLD-1", etc.
          const match = id.match(/(\d+)$/);
          if (match) {
            return parseInt(match[1]);
          }
          // If no number at end, try to extract any number from the string
          const anyNumber = id.match(/(\d+)/);
          return anyNumber ? parseInt(anyNumber[1]) : 0;
        };
        
        // Extract numbers for comparison
        const aNum = extractNumber(String(aValue));
        const bNum = extractNumber(String(bValue));
        
        console.log(`Extracted numbers: ${aNum} vs ${bNum}`);
        
        // If both have numbers, compare numerically
        if (aNum !== 0 && bNum !== 0) {
          aValue = aNum;
          bValue = bNum;
        } else {
          // Fall back to string comparison if no numbers found
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      const result = aValue < bValue ? (direction === 'asc' ? -1 : 1) : 
                    aValue > bValue ? (direction === 'asc' ? 1 : -1) : 0;
      
      console.log(`Sort result: ${result} (${aValue} ${direction === 'asc' ? '<' : '>'} ${bValue})`);
      
      return result;
    });
  };



  const sortRawMaterials = (materials: RawMaterial[], field: string, direction: 'asc' | 'desc'): RawMaterial[] => {
    return [...materials].sort((a, b) => {
      let aValue: any = a[field as keyof RawMaterial];
      let bValue: any = b[field as keyof RawMaterial];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortPackingMaterials = (materials: PackingMaterial[], field: string, direction: 'asc' | 'desc'): PackingMaterial[] => {
    return [...materials].sort((a, b) => {
      let aValue: any = a[field as keyof PackingMaterial];
      let bValue: any = b[field as keyof PackingMaterial];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortLines = (lines: Line[], field: string, direction: 'asc' | 'desc'): Line[] => {
    return [...lines].sort((a, b) => {
      let aValue: any = a[field as keyof Line];
      let bValue: any = b[field as keyof Line];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Unit filter handler
  const handleUnitFilterChange = (unit: string) => {
    console.log('🔄 Unit filter changing from', selectedUnit, 'to', unit);
    setSelectedUnit(unit);
    
    // Save to localStorage with user-specific key
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerSelectedUnit_${userId}`, unit);
      console.log('💾 Saved unit selection to localStorage:', unit);
    }
  };

  // Validate selected unit when units are loaded
  useEffect(() => {
    if (units.length > 0 && selectedUnit !== 'all') {
      const availableUnitIds = getAvailableUnitIds();
      if (!availableUnitIds.includes(selectedUnit)) {
        // Selected unit no longer exists, reset to 'all'
        console.log(`Unit ID "${selectedUnit}" no longer exists, resetting to "all"`);
        setSelectedUnit('all');
        if (typeof window !== 'undefined') {
          const userId = localStorage.getItem('currentUserId') || 'default';
          localStorage.setItem(`prodSchedulerSelectedUnit_${userId}`, 'all');
        }
      }
    }
  }, [units, selectedUnit]);

  // Get available unit IDs from units table
  const getAvailableUnitIds = (): string[] => {
    try {
      const unitIds = units.map((unit: Unit) => unit.id).sort();
      console.log('🆔 Available unit IDs:', unitIds);
      return unitIds;
    } catch (error) {
      console.error('Error getting unit IDs:', error);
      return [];
    }
  };

  // Get available units for display (names)
  const getAvailableUnits = (): { id: string; name: string }[] => {
    try {
      const availableUnits = units.map((unit: Unit) => ({ id: unit.id, name: unit.name })).sort((a, b) => a.name.localeCompare(b.name));
      console.log('📊 Available units for display:', availableUnits);
      return availableUnits;
    } catch (error) {
      console.error('Error getting units:', error);
      return [];
    }
  };

  // Filter data based on selected unit
  const getFilteredData = () => {
    console.log('getFilteredData called with selectedUnit:', selectedUnit);
    console.log('Available units:', units.map(u => ({ id: u.id, name: u.name })));
    console.log('Raw data counts:', {
      machines: machinesMaster.length,
      molds: moldsMaster.length,
      lines: linesMaster.length,
      rawMaterials: rawMaterialsMaster.length,
      packingMaterials: packingMaterialsMaster.length
    });
    
    if (selectedUnit === 'all') {
      console.log('Returning all data (no unit filter)');
      return {
        machines: machinesMaster,
        molds: moldsMaster,
        lines: linesMaster,
        rawMaterials: rawMaterialsMaster,
        packingMaterials: packingMaterialsMaster
      };
    }
    
    // Find the selected unit by ID to get its name
    const selectedUnitData = units.find(unit => unit.id === selectedUnit);
    const selectedUnitName = selectedUnitData?.name;
    
    console.log('Selected unit data:', selectedUnitData);
    console.log('Selected unit name:', selectedUnitName);
    
    if (!selectedUnitName) {
      // If unit not found, return all data
      console.log('Unit not found, returning all data');
      return {
        machines: machinesMaster,
        molds: moldsMaster,
        lines: linesMaster,
        rawMaterials: rawMaterialsMaster,
        packingMaterials: packingMaterialsMaster
      };
    }
    
    const filteredData = {
      machines: machinesMaster.filter((machine: Machine) => machine.unit === selectedUnitName),
      molds: moldsMaster.filter((mold: Mold) => mold.unit === selectedUnitName),
      lines: linesMaster.filter((line: Line) => line.unit === selectedUnitName),
      rawMaterials: rawMaterialsMaster.filter((material: RawMaterial) => material.unit === selectedUnitName),
      packingMaterials: packingMaterialsMaster.filter((material: PackingMaterial) => material.unit === selectedUnitName)
    };
    
    console.log('Filtered data counts:', {
      machines: filteredData.machines.length,
      molds: filteredData.molds.length,
      lines: filteredData.lines.length,
      rawMaterials: filteredData.rawMaterials.length,
      packingMaterials: filteredData.packingMaterials.length
    });
    
    return filteredData;
  };

  // Get sorted machines
  const sortedMachines = useMemo(() => {
    const filteredData = getFilteredData();
    // First filter by category if not 'all'
    let filteredMachines = filteredData.machines;
    if (machineCategoryFilter !== 'all') {
      filteredMachines = filteredData.machines.filter(machine => machine.category === machineCategoryFilter);
    }
    
    // Then sort the filtered machines
    return sortMachines(filteredMachines, machineSortField, machineSortDirection);
  }, [machinesMaster, machineSortField, machineSortDirection, machineCategoryFilter, selectedUnit]);
  
  // Get sorted molds
  const sortedMolds = useMemo(() => {
    const filteredData = getFilteredData();
    return sortMolds(filteredData.molds, moldSortField, moldSortDirection);
  }, [moldsMaster, moldSortField, moldSortDirection, selectedUnit]);
  console.log('Sorted molds result:', sortedMolds.map(m => ({ id: m.mold_id, item_code: m.item_code })));



  const sortedRawMaterials = useMemo(() => {
    const filteredData = getFilteredData();
    return sortRawMaterials(filteredData.rawMaterials, rawMaterialSortField, rawMaterialSortDirection);
  }, [rawMaterialsMaster, rawMaterialSortField, rawMaterialSortDirection, selectedUnit]);

  const sortedPackingMaterials = useMemo(() => {
    const filteredData = getFilteredData();
    let filteredMaterials = filteredData.packingMaterials;
    
    // Apply category filter
    if (packingMaterialCategoryFilter !== 'all') {
      filteredMaterials = filteredData.packingMaterials.filter(material => 
        material.category === packingMaterialCategoryFilter
      );
    }
    
    return sortPackingMaterials(filteredMaterials, packingMaterialSortField, packingMaterialSortDirection);
  }, [packingMaterialsMaster, packingMaterialCategoryFilter, packingMaterialSortField, packingMaterialSortDirection, selectedUnit]);

  const sortedLines = useMemo(() => {
    const filteredData = getFilteredData();
    return sortLines(filteredData.lines, lineSortField, lineSortDirection);
  }, [linesMaster, lineSortField, lineSortDirection, selectedUnit]);



  // Handle machine sort change with persistence
  const handleMachineSortChange = (field: string) => {
    let newDirection: 'asc' | 'desc' = 'asc';
    
    if (field === machineSortField) {
      // Toggle direction if same field
      newDirection = machineSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to ascending
      newDirection = 'asc';
    }
    
    // Update state
    setMachineSortField(field);
    setMachineSortDirection(newDirection);
    
    // Save to localStorage with user-specific key
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerMachineSortField_${userId}`, field);
      localStorage.setItem(`prodSchedulerMachineSortDirection_${userId}`, newDirection);
    }
  };

  const handleMachineCategoryFilterChange = (category: string) => {
    setMachineCategoryFilter(category);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerMachineCategoryFilter_${userId}`, category);
    }
  };

  const handleMoldSortChange = (field: string) => {
    if (moldSortField === field) {
      setMoldSortDirection(moldSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMoldSortField(field);
      setMoldSortDirection('asc');
    }
    
    // Save to localStorage with user-specific key
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerMoldSortField_${userId}`, field);
      localStorage.setItem(`prodSchedulerMoldSortDirection_${userId}`, moldSortDirection === 'asc' ? 'desc' : 'asc');
    }
  };



  const handleRawMaterialSortChange = (field: string) => {
    if (rawMaterialSortField === field) {
      setRawMaterialSortDirection(rawMaterialSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRawMaterialSortField(field);
      setRawMaterialSortDirection('asc');
    }
    
    // Save to localStorage with user-specific key
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerRawMaterialSortField_${userId}`, field);
      localStorage.setItem(`prodSchedulerRawMaterialSortDirection_${userId}`, rawMaterialSortDirection === 'asc' ? 'desc' : 'asc');
    }
  };

  const handlePackingMaterialSortChange = (field: string) => {
    if (packingMaterialSortField === field) {
      setPackingMaterialSortDirection(packingMaterialSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPackingMaterialSortField(field);
      setPackingMaterialSortDirection('asc');
    }
    
    // Save to localStorage with user-specific key
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerPackingMaterialSortField_${userId}`, field);
      localStorage.setItem(`prodSchedulerPackingMaterialSortDirection_${userId}`, packingMaterialSortDirection === 'asc' ? 'desc' : 'asc');
    }
  };

  const handleLineSortChange = (field: string) => {
    if (lineSortField === field) {
      setLineSortDirection(lineSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setLineSortField(field);
      setLineSortDirection('asc');
    }
    
    // Save to localStorage with user-specific key
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerLineSortField_${userId}`, field);
      localStorage.setItem(`prodSchedulerLineSortDirection_${userId}`, lineSortDirection === 'asc' ? 'desc' : 'asc');
    }
  };

  const handlePackingMaterialCategoryFilterChange = (category: string) => {
    const userId = localStorage.getItem('currentUserId') || 'default';
    setPackingMaterialCategoryFilter(category);
    localStorage.setItem(`prodSchedulerPackingMaterialCategoryFilter_${userId}`, category);
  };

  const openExcelReader = (dataType: DataType) => {
    setExcelDataType(dataType);
    setShowExcelReader(true);
  };

  const [jobForm, setJobForm] = useState<JobForm>({
    date: new Date().toISOString().split('T')[0],
    shift: 'Day',
    machine_id: '',
    mold_id: '',
    start_time: '08:00',
    end_time: '16:00',
    color: '',
    expected_pieces: '',
    stacks_per_box: '',
    pieces_per_stack: '',
    created_by: 'Current User'
  });

  // Access control hook for permission checking
  const { canAccessModule, isRootAdmin } = useAccessControl();

  // Map module IDs to permission module keys (some modules map to multiple permission modules)
  const moduleIdToPermissionKeys: Record<string, string[]> = {
    'welcome-dashboard': [], // Restricted to root admin only
    'masters': ['masterData'],
    'store-dispatch': ['storePurchase', 'storeInward', 'storeOutward', 'storeSales'], // Any store permission grants access
    'prod-planner': ['productionPlanner'],
    'production': ['production'],
    'quality': ['quality'],
    'maintenance': ['maintenance'],
    'approvals': ['approvals'],
    'reports': ['reports'],
    'stock-ledger': ['stockLedger'],
    'scheduler': ['productionPlanner'],
    'profile': [], // Always accessible
  };

  // Get menu items from module registry (excluding profile), filtered by permissions
  const menuItems: MenuItem[] = getAvailableModules()
    .filter(config => config.id !== 'profile' && config.id !== 'scheduler') // Commented out Production Scheduler
    .filter(config => {
      // Dashboard is only visible to root admin (Yogesh Deora)
      if (config.id === 'welcome-dashboard') {
        return isRootAdmin;
      }
      
      // Get permission keys for this module
      const permissionKeys = moduleIdToPermissionKeys[config.id] || [config.id];
      
      // If no permission keys defined, module is always accessible
      if (permissionKeys.length === 0) return true;
      
      // Check if user has access to any of the permission modules
      return permissionKeys.some(key => canAccessModule(key));
    })
    .map(config => ({
      id: config.id,
      label: config.label,
      icon: config.icon,
      description: config.description
    }));

  const handleAction = async (actionType: ActionType, item: Machine | Mold | ScheduleJob | RawMaterial | PackingMaterial | Line | any, itemType: ItemType | 'line' | 'color_label' | 'party_name'): Promise<void> => {
    try {
      console.log(`Handling action: ${actionType} for ${itemType}`, item);
    switch (actionType) {
      case 'edit':
        console.log('Editing item:', item);
        console.log('Item type:', itemType);
        setEditingItem(item);
        if (itemType === 'packing_material') {
          setModalType('packing_material');
        } else if (itemType === 'raw_material') {
          setModalType('raw_material');
        } else if (itemType === 'line') {
          setModalType('edit_line');
        } else if (itemType === 'color_label' || itemType === 'party_name') {
          setModalType(itemType as ModalType);
        } else {
          setModalType(itemType as ModalType);
        }
        setShowModal(true);
        break;
      case 'delete':
        let itemId: string | undefined;
        let itemName: string | undefined;
        
        if ('machine_id' in item && typeof item.machine_id === 'string') {
          itemId = item.machine_id;
          itemName = item.machine_id;
        } else if ('mold_id' in item && typeof item.mold_id === 'string') {
          itemId = item.mold_id;
          itemName = (item as any).mold_name || item.mold_id;

        } else if ('schedule_id' in item && typeof (item as any).schedule_id === 'string') {
          itemId = (item as { schedule_id: string }).schedule_id;
          itemName = itemId;
        } else if ('id' in item && (item as any).id) {
          // For packing materials and raw materials
          itemId = (item as any).id;
          if ('item_code' in item) {
            itemName = (item as any).item_code || (item as any).id;
          } else if ('sl_no' in item) {
            itemName = `${(item as any).category}-${(item as any).type}` || (item as any).id;
          } else {
            itemName = (item as any).id;
          }
        } else if ('line_id' in item && typeof item.line_id === 'string') {
          // For lines
          itemId = item.line_id;
          itemName = item.line_id;
        }
        
        if (window.confirm(`Are you sure you want to delete ${itemName || itemId || 'this item'}?`)) {
            if (itemType === 'machine' && 'machine_id' in item && typeof item.machine_id === 'string') {
              await machineAPI.delete(item.machine_id);
              setMachinesMaster(prev => prev.filter(m => m.machine_id !== item.machine_id));
              
              // Refresh lines to reflect cleared machine assignments
              try {
                const refreshedLines = await lineAPI.getAll();
                setLinesMaster(refreshedLines);
              } catch (error) {
                console.error('Error refreshing lines after machine deletion:', error);
              }
            } else if (itemType === 'mold' && 'mold_id' in item && typeof item.mold_id === 'string') {
              await moldAPI.delete(item.mold_id);
              setMoldsMaster(prev => prev.filter(m => m.mold_id !== item.mold_id));

            } else if (itemType === 'schedule' && 'schedule_id' in item) {
              await scheduleAPI.delete(item.schedule_id);
              setScheduleData(prev => prev.filter(s => s.schedule_id !== item.schedule_id));
            } else if (itemType === 'packing_material' && 'id' in item && (item as any).id) {
              console.log(`Deleting packing material with id: ${(item as any).id}`);
              await packingMaterialAPI.delete((item as any).id);
              setPackingMaterialsMaster(prev => prev.filter(p => p.id !== (item as any).id));
            } else if (itemType === 'raw_material' && 'id' in item && (item as any).id) {
              console.log(`Deleting raw material with id: ${(item as any).id}`);
              await rawMaterialAPI.delete((item as any).id);
              setRawMaterialsMaster(prev => prev.filter(r => r.id !== (item as any).id));
            } else if (itemType === 'line' && 'line_id' in item && typeof item.line_id === 'string') {
              console.log(`Deleting line with id: ${item.line_id}`);
              await lineAPI.delete(item.line_id);
              setLinesMaster(prev => prev.filter(l => l.line_id !== item.line_id));
            } else if (itemType === 'packing_material') {
              console.log(`Cannot delete packing material - missing id:`, item);
            } else if (itemType === 'raw_material') {
              console.log(`Cannot delete raw material - missing id:`, item);
            } else if (itemType === 'line') {
              console.log(`Cannot delete line - missing line_id:`, item);
            } else if (itemType === 'color_label' && 'id' in item && (item as any).id) {
              // Color/Label delete is handled in the component itself
              console.log(`Color/Label delete handled in component`);
            } else if (itemType === 'party_name' && 'id' in item && (item as any).id) {
              // Party Name delete is handled in the component itself
              console.log(`Party Name delete handled in component`);
            }
        }
        break;
      case 'view':
        // For lines, get the current data from linesMaster to ensure we have the latest data
        if (itemType === 'line' && 'line_id' in item) {
          const currentLine = linesMaster.find(line => line.line_id === item.line_id);
          setEditingItem(currentLine || item);
        } else {
          setEditingItem(item);
        }
        
        if (itemType === 'packing_material') {
          setModalType('view_packing_material');
        } else if (itemType === 'raw_material') {
          setModalType('view_raw_material');
        } else if (itemType === 'line') {
          setModalType('view_line');
        } else if (itemType === 'color_label' || itemType === 'party_name') {
          setModalType(`view_${itemType}` as ModalType);
        } else {
          setModalType(`view_${itemType}` as ModalType);
        }
        setShowModal(true);
        
        // Fetch line details if viewing a machine with a line
        if (itemType === 'machine' && 'line' in item && item.line && typeof item.line === 'string') {
          try {
            const lineDetail = await lineAPI.getById(item.line as string);
            if (lineDetail) {
              setLineDetails(prev => new Map(prev).set(item.line as string, lineDetail));
            }
          } catch (error) {
            console.error('Error fetching line details:', error);
          }
        }
        break;
      case 'approve':
        if ('schedule_id' in item) {
            const updatedJob = await scheduleAPI.approve(item.schedule_id, 'Admin');
            if (updatedJob) {
          setScheduleData(prev => prev.map(job => 
                job.schedule_id === item.schedule_id ? updatedJob : job
          ));
            }
        }
        break;
      case 'mark_done':
        if ('schedule_id' in item) {
            const updatedJob = await scheduleAPI.markDone(item.schedule_id, 'Current User');
            if (updatedJob) {
          setScheduleData(prev => prev.map(job => 
                job.schedule_id === item.schedule_id ? updatedJob : job
          ));
            }
        }
        break;
      }
    } catch (error) {
      console.error(`Error performing ${actionType} on ${itemType}:`, error);
    }
  };

  const addNewJob = async (newJob: JobForm): Promise<void> => {
    try {
      const newScheduleItem: Omit<ScheduleJob, 'created_at' | 'updated_at'> = {
      schedule_id: `S${String(scheduleData.length + 1).padStart(3, '0')}`,
      ...newJob,
      expected_pieces: parseInt(newJob.expected_pieces),
      stacks_per_box: parseInt(newJob.stacks_per_box),
      pieces_per_stack: parseInt(newJob.pieces_per_stack),
      created_by: 'Current User',
      is_done: false,
      done_timestamp: null,
      approved_by: null,
      approval_status: 'pending'
    };
      
      const createdJob = await scheduleAPI.create(newScheduleItem);
      if (createdJob) {
        setScheduleData(prev => [...prev, createdJob]);
      }
      
    setShowModal(false);
    // Don't switch modules - stay on current module
    } catch (error) {
      console.error('Error creating new job:', error);
    }
  };

  const getJobsByMachine = (machineId: string): ScheduleJob[] => 
    scheduleData.filter(job => job.machine_id === machineId && job.date === selectedDate);

  const getJobPosition = (startTime: string, endTime: string): { left: string; width: string } => {
    const start = parseInt(startTime.split(':')[0]) + (parseInt(startTime.split(':')[1]) / 60);
    const end = parseInt(endTime.split(':')[0]) + (parseInt(endTime.split(':')[1]) / 60);
    return {
      left: `${(start / 24) * 100}%`,
      width: `${((end - start) / 24) * 100}%`
    };
  };

  const getStatusColor = (job: ScheduleJob): string => {
    if (job.is_done) return 'bg-green-500';
    if (job.approval_status === 'approved') return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getMachineStatusColor = (status: Machine['status']): string => {
    switch (status) {
      case 'Active': return 'bg-green-50 border-green-200';
      case 'Maintenance': return 'bg-red-50 border-red-200';
      case 'Idle': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();
    
    const handleModuleChange = (module: ModuleType) => {
      setCurrentModule(module);
      // Save to localStorage with user-specific key
      if (typeof window !== 'undefined') {
        const userId = localStorage.getItem('currentUserId') || 'default';
        localStorage.setItem(`prodSchedulerCurrentModule_${userId}`, module);
      }
      
      // Refresh unit management settings when switching to masters module
      if (module === 'masters') {
        refreshUnitManagementSettings();
      }
    };

    const refreshUnitManagementSettings = async () => {
      try {
        const enabled = await unitManagementSettingsAPI.isUnitManagementEnabled();
        const defaultUnitSetting = await unitManagementSettingsAPI.getDefaultUnit();
        setUnitManagementEnabled(enabled);
        setDefaultUnit(defaultUnitSetting);
        console.log('Unit management settings refreshed:', { enabled, defaultUnit: defaultUnitSetting });
      } catch (error) {
        console.error('Error refreshing unit management settings:', error);
      }
    };
    
    const handleSignOut = async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    return (
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white transition-all duration-300 flex flex-col h-screen app-sidebar`}>
        <div className="p-3 border-b border-gray-700">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen && <h2 className="text-lg font-semibold">ProdFlow</h2>}
            <button onClick={() => {
              const newState = !sidebarOpen;
              setSidebarOpen(newState);
              // Save to localStorage with user-specific key
              if (typeof window !== 'undefined') {
                const userId = localStorage.getItem('currentUserId') || 'default';
                localStorage.setItem(`prodSchedulerSidebarOpen_${userId}`, JSON.stringify(newState));
              }
            }} className="text-gray-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Unit Filter Dropdown */}
        {sidebarOpen && (
          <div className="p-3 border-b border-gray-700">
            <select
              value={selectedUnit}
              onChange={(e) => handleUnitFilterChange(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Units</option>
              {getAvailableUnits().map(unit => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <nav className="flex-1 pt-2 overflow-y-auto">
          {menuItems.map(item => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleModuleChange(item.id as ModuleType)}
                className={`w-full p-3 hover:bg-gray-700 transition-colors ${
                  currentModule === item.id ? 'bg-gray-700 border-r-2 border-blue-400' : ''
                } ${sidebarOpen ? 'text-left' : 'flex justify-center'}`}
              >
                <div className={`flex items-center ${sidebarOpen ? '' : 'justify-center'}`}>
                  <IconComponent className="w-5 h-5" />
                  {sidebarOpen && (
                    <div className="ml-3">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}

        </nav>

        {/* Current User Section - Bottom Left */}
        <div className="border-t border-gray-700 p-3 relative flex-shrink-0">
          <button
            onClick={() => handleModuleChange('profile')}
            className={`w-full text-left p-2 hover:bg-gray-700 transition-colors rounded ${
              sidebarOpen ? 'flex items-center' : 'flex justify-center'
            }`}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-600">
              <User className="w-3 h-3 text-white" />
            </div>
            {sidebarOpen && (
              <div className="ml-2 flex-1">
                <div className="font-medium text-xs truncate">
                  {user?.fullName || user?.email || 'Current User'}
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {user?.isRootAdmin ? 'Root Admin' : 'User'}
                </div>
              </div>
            )}
          </button>
          
          {/* Sign Out Button */}
          {sidebarOpen && (
            <button
              onClick={handleSignOut}
              className="w-full mt-1 text-left p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors rounded text-xs"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    );
  };

  // ProductionScheduler component moved to modules/production-schedule/index.tsx

  // Nameplate Viewing Modal
  const NameplateModal: React.FC = () => {
    if (!viewingNameplate) return null;

    let nameplateData;
    try {
      nameplateData = JSON.parse(viewingNameplate);
    } catch {
      // Fallback for old format (direct image URL)
      nameplateData = { image: viewingNameplate, details: '', machine_id: '', make: '', model: '' };
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Machine Nameplate Details</h3>
              {nameplateData.machine_id && (
                <p className="text-sm text-gray-600">{nameplateData.machine_id} - {nameplateData.make} {nameplateData.model}</p>
              )}
            </div>
            <button 
              onClick={() => setViewingNameplate(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Nameplate Image */}
              {nameplateData.image && (
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Nameplate Image</h4>
            <div className="flex justify-center">
              <img 
                      src={nameplateData.image} 
                alt="Machine Nameplate" 
                className="max-w-full max-h-96 object-contain border border-gray-200 rounded-lg shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'text-gray-500 p-8 border border-gray-200 rounded-lg';
                  errorDiv.textContent = 'Failed to load nameplate image';
                  target.parentElement!.appendChild(errorDiv);
                }}
              />
                  </div>
                </div>
              )}
              
              {/* Nameplate Details */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-3">Technical Details</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {nameplateData.details ? (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {nameplateData.details}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No technical details available
                    </div>
                  )}
                </div>
                
                {/* Machine Information */}
                {nameplateData.machine_id && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-800 mb-2">Machine Information</h5>
                    <div className="bg-blue-50 rounded-lg p-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="font-medium">ID:</span> {nameplateData.machine_id}</div>
                        <div><span className="font-medium">Make:</span> {nameplateData.make}</div>
                        <div className="col-span-2"><span className="font-medium">Model:</span> {nameplateData.model}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => setViewingNameplate(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // MasterDataModule component moved to modules/master-data/index.tsx
  // (Large component with 824 lines extracted into separate files for better organization)





  // ApprovalsModule component moved to modules/approvals/index.tsx

  // OperatorPanel component moved to modules/operator-panel/index.tsx

  // UserProfileModule component moved to modules/profile/index.tsx
  // (Large component with 267 lines removed from this file for better organization)



  const NewJobModal: React.FC = () => {
    const filteredData = getFilteredData();
    const compatibleMolds = jobForm.machine_id 
      ? filteredData.molds.filter(mold => mold.compatible_machines.includes(jobForm.machine_id)) 
      : [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Create New Production Job</h3>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={jobForm.date}
                  onChange={(e) => setJobForm({...jobForm, date: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <select
                  value={jobForm.shift}
                  onChange={(e) => setJobForm({...jobForm, shift: e.target.value as 'Day' | 'Evening' | 'Night'})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="Day">Day Shift</option>
                  <option value="Evening">Evening Shift</option>
                  <option value="Night">Night Shift</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
              <select
                value={jobForm.machine_id}
                onChange={(e) => setJobForm({...jobForm, machine_id: e.target.value, mold_id: ''})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select Machine</option>
                {filteredData.machines.filter(m => m.status === 'Active').map(machine => (
                  <option key={machine.machine_id} value={machine.machine_id}>
                    {machine.machine_id} - {machine.make} {machine.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mold</label>
              <select
                value={jobForm.mold_id}
                onChange={(e) => setJobForm({...jobForm, mold_id: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                disabled={!jobForm.machine_id}
              >
                <option value="">Select Mold</option>
                {compatibleMolds.map(mold => (
                  <option key={mold.mold_id} value={mold.mold_id}>
                    {mold.mold_id} - {mold.mold_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={jobForm.start_time}
                  onChange={(e) => setJobForm({...jobForm, start_time: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={jobForm.end_time}
                  onChange={(e) => setJobForm({...jobForm, end_time: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <select
                  value={jobForm.color}
                  onChange={(e) => setJobForm({...jobForm, color: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select Color</option>
                  <option value="White">White</option>
                  <option value="Black">Black</option>
                  <option value="Red">Red</option>
                  <option value="Blue">Blue</option>
                  <option value="Green">Green</option>
                  <option value="Yellow">Yellow</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Pieces</label>
                <input
                  type="number"
                  value={jobForm.expected_pieces}
                  onChange={(e) => setJobForm({...jobForm, expected_pieces: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pieces per Stack</label>
                <input
                  type="number"
                  value={jobForm.pieces_per_stack}
                  onChange={(e) => setJobForm({...jobForm, pieces_per_stack: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stacks per Box</label>
                <input
                  type="number"
                  value={jobForm.stacks_per_box}
                  onChange={(e) => setJobForm({...jobForm, stacks_per_box: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 p-6 border-t border-gray-200">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => addNewJob(jobForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={!jobForm.machine_id || !jobForm.mold_id || !jobForm.color}
            >
              Create Job
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderModule = (): JSX.Element => {
    const module = getModule(currentModule);
    
    if (!module) {
      // Fallback to welcome-dashboard if module not found
      const dashboardModule = getModule('welcome-dashboard');
      if (dashboardModule) {
        const DashboardComponent = dashboardModule.component;
        return <DashboardComponent />;
      }
      return <div>Module not found</div>;
    }

    const ModuleComponent = module.component;

    // Special handling for scheduler module with header
    if (currentModule === 'scheduler') {
        const filteredData = getFilteredData();
        return (
          <div className="flex flex-col h-full">
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-800">Production Scheduler</h1>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setSelectedDate(newDate);
                      // Save to localStorage with user-specific key
                      if (typeof window !== 'undefined') {
                        const userId = localStorage.getItem('currentUserId') || 'default';
                        localStorage.setItem(`prodSchedulerSelectedDate_${userId}`, newDate);
                      }
                    }}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  />
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => alert('Excel import for schedules is coming soon!')}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </button>
                  <button 
                    onClick={() => {setModalType('job'); setShowModal(true);}}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Job
                  </button>

                </div>
              </div>
            </div>
          <ModuleComponent 
            scheduleData={scheduleData}
            selectedDate={selectedDate}
            machinesMaster={filteredData.machines}
            handleAction={handleAction}
          />
          </div>
        );
    }



    // Render other modules with appropriate props
    const getModuleProps = () => {
      switch (currentModule) {
      case 'welcome-dashboard':
          return {
            onModuleChange: (moduleId: string) => {
              setCurrentModule(moduleId as ModuleType);
              if (typeof window !== 'undefined') {
                const userId = localStorage.getItem('currentUserId') || 'default';
                localStorage.setItem(`prodSchedulerCurrentModule_${userId}`, moduleId);
              }
            }
          };
      case 'approvals':
          return {
            scheduleData,
            handleAction
          };
      // case 'operators':
      //     const operatorsFilteredData = getFilteredData();
      //     return {
      //       scheduleData,
      //       selectedDate,
      //       handleAction,
      //       machinesMaster: operatorsFilteredData.machines,
      //       moldsMaster: operatorsFilteredData.molds
      //     };
        case 'masters':
          const mastersFilteredData = getFilteredData();
          return {
            machinesMaster: mastersFilteredData.machines,
            moldsMaster: mastersFilteredData.molds,
            linesMaster: mastersFilteredData.lines,
            rawMaterials: mastersFilteredData.rawMaterials,
            packingMaterials: mastersFilteredData.packingMaterials,
            
            // Machine state and handlers
            machineCategoryFilter,
            handleMachineCategoryFilterChange,
            machineSortField,
            machineSortDirection,
            setMachineSortField,
            setMachineSortDirection,
            handleMachineSortChange,
            sortedMachines,
            
            // Mold state and handlers
            moldSortField,
            moldSortDirection,
            setMoldSortField,
            setMoldSortDirection,
            handleMoldSortChange,
            sortedMolds,
            
            // Raw Materials state and handlers
            rawMaterialSortField,
            rawMaterialSortDirection,
            setRawMaterialSortField,
            setRawMaterialSortDirection,
            handleRawMaterialSortChange,
            sortedRawMaterials,
            


            
            // Packing Materials state and handlers
            packingMaterialCategoryFilter,
            handlePackingMaterialCategoryFilterChange,
            packingMaterialSortField,
            packingMaterialSortDirection,
            setPackingMaterialSortField,
            setPackingMaterialSortDirection,
            handlePackingMaterialSortChange,
            sortedPackingMaterials,
            
            // Line state and handlers
            lineSortField,
            lineSortDirection,
            setLineSortField,
            setLineSortDirection,
            handleLineSortChange,
            sortedLines,
            
            // Unit management settings
            unitManagementEnabled,
            defaultUnit,
            units,
            
            // Common handlers
            openExcelReader,
            handleAction,
            setViewingNameplate,
            InfoButton,
            // Callback to collapse sidebar when sub nav is clicked
            onSubNavClick: () => {
              if (sidebarOpen) {
                setSidebarOpen(false);
                // Save to localStorage with user-specific key
                if (typeof window !== 'undefined') {
                  const userId = localStorage.getItem('currentUserId') || 'default';
                  localStorage.setItem(`prodSchedulerSidebarOpen_${userId}`, JSON.stringify(false));
                }
              }
            }
          };
        case 'reports':
          return {};
        case 'maintenance':
          return {
            machinesMaster: sortedMachines,
            linesMaster: sortedLines,
            moldsMaster: sortedMolds,
            unitManagementEnabled,
            defaultUnit,
            units,
            // Callback to collapse sidebar when sub nav is clicked
            onSubNavClick: () => {
              if (sidebarOpen) {
                setSidebarOpen(false);
                // Save to localStorage with user-specific key
                if (typeof window !== 'undefined') {
                  const userId = localStorage.getItem('currentUserId') || 'default';
                  localStorage.setItem(`prodSchedulerSidebarOpen_${userId}`, JSON.stringify(false));
                }
              }
            }
          };
        case 'quality':
          return {
            linesMaster: sortedLines,
            moldsMaster: sortedMolds,
            // Callback to collapse sidebar when sub nav is clicked
            onSubNavClick: () => {
              if (sidebarOpen) {
                setSidebarOpen(false);
                // Save to localStorage with user-specific key
                if (typeof window !== 'undefined') {
                  const userId = localStorage.getItem('currentUserId') || 'default';
                  localStorage.setItem(`prodSchedulerSidebarOpen_${userId}`, JSON.stringify(false));
                }
              }
            }
          };
        case 'production':
          return {
            // Callback to collapse sidebar when sub nav is clicked
            onSubNavClick: () => {
              if (sidebarOpen) {
                setSidebarOpen(false);
                // Save to localStorage with user-specific key
                if (typeof window !== 'undefined') {
                  const userId = localStorage.getItem('currentUserId') || 'default';
                  localStorage.setItem(`prodSchedulerSidebarOpen_${userId}`, JSON.stringify(false));
                }
              }
            }
          };
        case 'store-dispatch':
          return {
            // Callback to collapse sidebar when sub nav is clicked
            onSubNavClick: () => {
              if (sidebarOpen) {
                setSidebarOpen(false);
                // Save to localStorage with user-specific key
                if (typeof window !== 'undefined') {
                  const userId = localStorage.getItem('currentUserId') || 'default';
                  localStorage.setItem(`prodSchedulerSidebarOpen_${userId}`, JSON.stringify(false));
                }
              }
            }
          };
      case 'profile':
          return {};
      default:
          return {};
    }
    };

    return <ModuleComponent {...getModuleProps()} />;
  };

  // Auto-collapse sidebar when prod-planner module is opened
  useEffect(() => {
    if (currentModule === 'prod-planner' && sidebarOpen) {
      setSidebarOpen(false);
      // Save to localStorage with user-specific key
      if (typeof window !== 'undefined') {
        const userId = localStorage.getItem('currentUserId') || 'default';
        localStorage.setItem(`prodSchedulerSidebarOpen_${userId}`, JSON.stringify(false));
      }
    }
  }, [currentModule]);

  // Restore user preferences from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      
      // Restore unit selection (but don't set it yet - wait for units to load)
      const savedUnit = localStorage.getItem(`prodSchedulerSelectedUnit_${userId}`);
      if (savedUnit) {
        console.log('📋 Found saved unit selection:', savedUnit);
        // Don't set it here - let the units-loaded useEffect handle it
      }
      
      // Restore sorting preferences
      const savedMachineSortField = localStorage.getItem(`prodSchedulerMachineSortField_${userId}`);
      const savedMachineSortDirection = localStorage.getItem(`prodSchedulerMachineSortDirection_${userId}`);
      if (savedMachineSortField) setMachineSortField(savedMachineSortField);
      if (savedMachineSortDirection) setMachineSortDirection(savedMachineSortDirection as 'asc' | 'desc');
      
      const savedMoldSortField = localStorage.getItem(`prodSchedulerMoldSortField_${userId}`);
      const savedMoldSortDirection = localStorage.getItem(`prodSchedulerMoldSortDirection_${userId}`);
      if (savedMoldSortField) setMoldSortField(savedMoldSortField);
      if (savedMoldSortDirection) setMoldSortDirection(savedMoldSortDirection as 'asc' | 'desc');
      
      const savedRawMaterialSortField = localStorage.getItem(`prodSchedulerRawMaterialSortField_${userId}`);
      const savedRawMaterialSortDirection = localStorage.getItem(`prodSchedulerRawMaterialSortDirection_${userId}`);
      if (savedRawMaterialSortField) setRawMaterialSortField(savedRawMaterialSortField);
      if (savedRawMaterialSortDirection) setRawMaterialSortDirection(savedRawMaterialSortDirection as 'asc' | 'desc');
      
      const savedPackingMaterialSortField = localStorage.getItem(`prodSchedulerPackingMaterialSortField_${userId}`);
      const savedPackingMaterialSortDirection = localStorage.getItem(`prodSchedulerPackingMaterialSortDirection_${userId}`);
      if (savedPackingMaterialSortField) setPackingMaterialSortField(savedPackingMaterialSortField);
      if (savedPackingMaterialSortDirection) setPackingMaterialSortDirection(savedPackingMaterialSortDirection as 'asc' | 'desc');
      
      const savedLineSortField = localStorage.getItem(`prodSchedulerLineSortField_${userId}`);
      const savedLineSortDirection = localStorage.getItem(`prodSchedulerLineSortDirection_${userId}`);
      if (savedLineSortField) setLineSortField(savedLineSortField);
      if (savedLineSortDirection) setLineSortDirection(savedLineSortDirection as 'asc' | 'desc');
      
      // Restore filter preferences
      const savedMachineCategoryFilter = localStorage.getItem(`prodSchedulerMachineCategoryFilter_${userId}`);
      if (savedMachineCategoryFilter) setMachineCategoryFilter(savedMachineCategoryFilter);
      
      const savedPackingMaterialCategoryFilter = localStorage.getItem(`prodSchedulerPackingMaterialCategoryFilter_${userId}`);
      if (savedPackingMaterialCategoryFilter) setPackingMaterialCategoryFilter(savedPackingMaterialCategoryFilter);
      
      // Restore module selection (default to welcome-dashboard if not set or if scheduler was saved)
      const savedCurrentModule = localStorage.getItem(`prodSchedulerCurrentModule_${userId}`);
      if (savedCurrentModule && savedCurrentModule !== 'scheduler') {
        setCurrentModule(savedCurrentModule as ModuleType);
      } else {
        // Default to welcome-dashboard, or migrate from scheduler
        setCurrentModule('welcome-dashboard');
        localStorage.setItem(`prodSchedulerCurrentModule_${userId}`, 'welcome-dashboard');
      }
      
      // Restore sidebar state
      const savedSidebarOpen = localStorage.getItem(`prodSchedulerSidebarOpen_${userId}`);
      if (savedSidebarOpen !== null) setSidebarOpen(JSON.parse(savedSidebarOpen));
      
      // Restore selected date
      const savedSelectedDate = localStorage.getItem(`prodSchedulerSelectedDate_${userId}`);
      if (savedSelectedDate) setSelectedDate(savedSelectedDate);
    }
  }, []);

  // Redirect non-root-admin users away from dashboard
  useEffect(() => {
    // If user is not root admin and is on the dashboard, redirect to first accessible module
    if (!isRootAdmin && currentModule === 'welcome-dashboard' && menuItems.length > 0) {
      const firstAccessibleModule = menuItems[0].id as ModuleType;
      setCurrentModule(firstAccessibleModule);
      if (typeof window !== 'undefined') {
        const userId = localStorage.getItem('currentUserId') || 'default';
        localStorage.setItem(`prodSchedulerCurrentModule_${userId}`, firstAccessibleModule);
      }
      console.log('📍 Non-root admin redirected from dashboard to:', firstAccessibleModule);
    }
  }, [isRootAdmin, currentModule, menuItems]);

  // Restore unit selection after units are loaded
  useEffect(() => {
    if (units.length > 0) {
      // Check if there's a saved unit selection that we can restore
      if (typeof window !== 'undefined') {
        const userId = localStorage.getItem('currentUserId') || 'default';
        const savedUnit = localStorage.getItem(`prodSchedulerSelectedUnit_${userId}`);
        
        if (savedUnit && savedUnit !== 'all') {
          // Verify the saved unit still exists
          const availableUnitIds = getAvailableUnitIds();
          if (availableUnitIds.includes(savedUnit)) {
            setSelectedUnit(savedUnit);
            console.log('✅ Restored unit selection after units loaded:', savedUnit);
          } else {
            console.log('⚠️ Saved unit no longer exists, keeping current selection');
          }
        } else if (savedUnit === 'all') {
          // If user explicitly chose "all", respect that choice
          setSelectedUnit('all');
          console.log('✅ Restored "all units" selection');
        }
      }
    }
  }, [units]); // Remove selectedUnit dependency to prevent loops

  // Monitor selectedUnit changes for debugging
  useEffect(() => {
    console.log('🎯 selectedUnit changed to:', selectedUnit);
  }, [selectedUnit]);

  return (
    <div className="h-screen bg-gray-100 flex">
      <Sidebar />
      <div className="flex-1 overflow-auto text-gray-900">
        {renderModule()}
      </div>
      
      {/* Modals */}
      {showModal && modalType === 'job' && <NewJobModal />}

      {showModal && modalType === 'machine' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wrench className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingItem && 'machine_id' in editingItem && editingItem.machine_id ? 'Edit Machine' : 'Add New Machine'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingItem && 'machine_id' in editingItem && editingItem.machine_id 
                      ? 'Update machine information' 
                      : 'Enter machine details to add to the system'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const mfgDate = formData.get('mfg_date') as string;
              const installDate = formData.get('install_date') as string;
              
              const machineData = {
                machine_id: formData.get('machine_id') as string,
                make: formData.get('make') as string,
                model: formData.get('model') as string,
                size: parseInt(formData.get('size') as string) || 0,
                capacity_tons: parseInt(formData.get('size') as string) || 0,
                type: 'Injection Molding Machine',
                category: formData.get('category') as string || 'IM',
                line: formData.get('line') as string || undefined,
                purchase_date: mfgDate && mfgDate.trim() ? mfgDate : new Date().toISOString().split('T')[0],
                install_date: installDate && installDate.trim() ? installDate : new Date().toISOString().split('T')[0],
                grinding_available: formData.get('grinding_available') === 'true',
                remarks: formData.get('remarks') as string || '',
                nameplate_image: undefined,
                status: (formData.get('status') as string) as 'Active' | 'Maintenance' | 'Idle' || 'Active',
                clm_sr_no: formData.get('clm_sr_no') as string || undefined,
                inj_serial_no: formData.get('inj_serial_no') as string || undefined,
                serial_no: formData.get('serial_no') as string || undefined,
                mfg_date: mfgDate && mfgDate.trim() ? mfgDate : undefined,
                dimensions: formData.get('dimensions') as string || undefined,
                nameplate_details: undefined,
                unit: unitManagementEnabled ? (formData.get('unit') as string) || defaultUnit : undefined
              };
              
              try {
                // Validation: Check if machine type already exists on the selected line
                if (machineData.line) {
                  const selectedLine = linesMaster.find(line => line.line_id === machineData.line);
                  if (selectedLine) {
                    const machineId = machineData.machine_id;
                    const category = machineData.category;
                    
                    // Check if it's a hoist machine - don't allow adding hoist here
                    if (machineId.startsWith('Hoist')) {
                      alert('Hoist machines cannot be added here. Hoists are already assigned to lines separately.');
                      return;
                    }
                    
                    // Check if IM machine already exists on this line
                    if (category === 'IM' && selectedLine.im_machine_id) {
                      alert(`This line already has an IM machine (${selectedLine.im_machine_id}). Only one IM machine can be assigned per line.`);
                      return;
                    }
                    
                    // Check if Robot already exists on this line
                    if (category === 'Robot' && selectedLine.robot_machine_id) {
                      alert(`This line already has a Robot (${selectedLine.robot_machine_id}). Only one Robot can be assigned per line.`);
                      return;
                    }
                    
                    // Check if Conveyor (CONY) already exists on this line
                    if (category === 'Aux' && machineId.startsWith('CONY') && selectedLine.conveyor_machine_id) {
                      alert(`This line already has a Conveyor (${selectedLine.conveyor_machine_id}). Only one Conveyor can be assigned per line.`);
                      return;
                    }
                  }
                }
                
                // Get old machine data for comparison (if updating)
                const oldMachine = editingItem && 'machine_id' in editingItem && typeof editingItem.machine_id === 'string' && editingItem.machine_id
                  ? machinesMaster.find(m => m.machine_id === editingItem.machine_id)
                  : null;
                const oldLineId = oldMachine?.line;
                
                if (editingItem && 'machine_id' in editingItem && typeof editingItem.machine_id === 'string' && editingItem.machine_id) {
                  // Update existing machine - exclude machine_id from update payload
                  const { machine_id, ...updateData } = machineData;
                  await machineAPI.update(editingItem.machine_id, updateData);
                  setMachinesMaster(prev => prev.map(m => 
                    m.machine_id === editingItem.machine_id ? { ...m, ...updateData } : m
                  ));
                } else {
                  // Create new machine
                  const newMachine = await machineAPI.create(machineData);
                  if (newMachine) {
                    setMachinesMaster(prev => [...prev, newMachine]);
                  }
                }
                
                // Bidirectional sync: Update Line Master when machine line assignment changes
                const machineId = machineData.machine_id;
                const newLineId = machineData.line;
                const category = machineData.category;
                
                // Determine which machine field to update based on category
                let machineField: 'im_machine_id' | 'robot_machine_id' | 'conveyor_machine_id' | 'hoist_machine_id' | null = null;
                if (category === 'IM') {
                  machineField = 'im_machine_id';
                } else if (category === 'Robot') {
                  machineField = 'robot_machine_id';
                } else if (category === 'Aux' && machineId.startsWith('CONY')) {
                  machineField = 'conveyor_machine_id';
                } else if (category === 'Aux' && machineId.startsWith('Hoist')) {
                  machineField = 'hoist_machine_id';
                }
                
                // If line assignment changed, update the line
                if (oldLineId !== newLineId && machineField) {
                  try {
                    // Always clear old line's machine assignment if line changed
                    // This ensures we don't leave stale assignments
                    if (oldLineId) {
                      await lineAPI.update(oldLineId, { [machineField]: null });
                      setLinesMaster(prev => prev.map(l => {
                        if (l.line_id === oldLineId) {
                          const updated = { ...l };
                          delete (updated as any)[machineField];
                          return updated;
                        }
                        return l;
                      }));
                    }
                    
                    // Set new line's machine assignment
                    if (newLineId) {
                      // First, clear any existing machine of this type from the new line
                      const newLine = linesMaster.find(l => l.line_id === newLineId);
                      if (newLine && (newLine as any)[machineField] && (newLine as any)[machineField] !== machineId) {
                        // Clear the old machine from the new line
                        const oldMachineIdOnNewLine = (newLine as any)[machineField] as string;
                        if (oldMachineIdOnNewLine) {
                          await machineAPI.update(oldMachineIdOnNewLine, { line: undefined });
                          setMachinesMaster(prev => prev.map(m => 
                            m.machine_id === oldMachineIdOnNewLine ? { ...m, line: undefined } : m
                          ));
                        }
                      }
                      
                      // Now assign this machine to the new line
                      await lineAPI.update(newLineId, { [machineField]: machineId });
                      setLinesMaster(prev => prev.map(l => 
                        l.line_id === newLineId ? { ...l, [machineField]: machineId } : l
                      ));
                    }
                    
                    // Reload data from database to ensure sync
                    try {
                      const [refreshedLines, refreshedMachines] = await Promise.all([
                        lineAPI.getAll(),
                        machineAPI.getAll()
                      ]);
                      setLinesMaster(refreshedLines);
                      setMachinesMaster(refreshedMachines);
                    } catch (refreshError) {
                      console.error('Error refreshing data after update:', refreshError);
                      // Non-blocking - data might still be correct
                    }
                  } catch (lineError: any) {
                    console.error('Error updating line assignments:', lineError);
                    console.error('Line error details:', {
                      message: lineError?.message,
                      details: lineError?.details,
                      hint: lineError?.hint,
                      code: lineError?.code
                    });
                    // Don't block machine save if line update fails, but log the error
                    alert(`Machine saved, but there was an issue updating line assignments: ${lineError?.message || 'Unknown error'}`);
                    
                    // Still try to refresh data even if there was an error
                    try {
                      const [refreshedLines, refreshedMachines] = await Promise.all([
                        lineAPI.getAll(),
                        machineAPI.getAll()
                      ]);
                      setLinesMaster(refreshedLines);
                      setMachinesMaster(refreshedMachines);
                    } catch (refreshError) {
                      console.error('Error refreshing data after error:', refreshError);
                    }
                  }
                } else {
                  // Even if line didn't change, refresh to ensure sync
                  try {
                    const [refreshedLines, refreshedMachines] = await Promise.all([
                      lineAPI.getAll(),
                      machineAPI.getAll()
                    ]);
                    setLinesMaster(refreshedLines);
                    setMachinesMaster(refreshedMachines);
                  } catch (refreshError) {
                    console.error('Error refreshing data:', refreshError);
                  }
                }
                
                setShowModal(false);
                setEditingItem(null);
              } catch (error: any) {
                console.error('Error saving machine:', error);
                const errorMessage = error?.message || error?.error?.message || 'Unknown error occurred';
                alert(`Error saving machine: ${errorMessage}. Please try again.`);
              }
            }}>
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Sr. No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="machine_id"
                        required
                        placeholder="e.g., JSW-1, HAIT-1, WITT-1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'machine_id' in editingItem && typeof editingItem.machine_id === 'string' ? editingItem.machine_id : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select 
                        name="category" 
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-500 transition-colors"
                        defaultValue={editingItem && 'category' in editingItem ? editingItem.category : 'IM'}
                      >
                        <option value="IM">IM - Injection Molding</option>
                        <option value="Robot">Robot - Robotic Equipment</option>
                        <option value="Aux">Aux - Auxiliary Equipment</option>
                        <option value="Utility">Utility - Utility Equipment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Make <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="make"
                        required
                        placeholder="e.g., JSW, Haitain, Wittmaan"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'make' in editingItem ? editingItem.make : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Size (Tons) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="size"
                        required
                        min="0"
                        placeholder="e.g., 280, 350, 380"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'size' in editingItem ? editingItem.size : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Model <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="model"
                        required
                        placeholder="e.g., J-280-ADS, MA3800H/1280PRO"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'model' in editingItem ? editingItem.model : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Serial No.
                      </label>
                      <input
                        type="text"
                        name="serial_no"
                        placeholder="e.g., 22182C929929/22182GH62H62 or 8EH0001543"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'serial_no' in editingItem ? editingItem.serial_no : ''}
                      />
                      <p className="text-xs text-gray-500 mt-1">For IM: CLM/INJ format, For others: Single serial</p>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-green-600 rounded-full mr-3"></div>
                    Technical Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        CLM Sr. No
                      </label>
                      <input
                        type="text"
                        name="clm_sr_no"
                        placeholder="e.g., 22182C929929"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'clm_sr_no' in editingItem ? editingItem.clm_sr_no : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Injection Serial No
                      </label>
                      <input
                        type="text"
                        name="inj_serial_no"
                        placeholder="e.g., 22182GH62H62"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'inj_serial_no' in editingItem ? editingItem.inj_serial_no : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mfg Date
                      </label>
                      <input
                        type="date"
                        name="mfg_date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'mfg_date' in editingItem ? editingItem.mfg_date : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Inst Date
                      </label>
                      <input
                        type="date"
                        name="install_date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'install_date' in editingItem ? editingItem.install_date : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Dimensions
                      </label>
                      <input
                        type="text"
                        name="dimensions"
                        placeholder="e.g., 6555 x 1764 x 2060 or X:1000 Y:800 Z:600"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'dimensions' in editingItem ? editingItem.dimensions : ''}
                      />
                      <p className="text-xs text-gray-500 mt-1">LxBxH for IM, X:Y:Z for robots (axes)</p>
                    </div>
                  </div>
                </div>

                {/* Status & Configuration */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-orange-600 rounded-full mr-3"></div>
                    Status & Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select 
                        name="status" 
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-500 transition-colors"
                        defaultValue={editingItem && 'status' in editingItem ? editingItem.status : 'Active'}
                      >
                        <option value="Active">🟢 Active</option>
                        <option value="Maintenance">🔧 Maintenance</option>
                        <option value="Idle">⏸️ Idle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Line
                      </label>
                      <select 
                        name="line" 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'line' in editingItem && editingItem.line ? editingItem.line : ''}
                      >
                        <option value="">Select a Line</option>
                        {linesMaster.filter(line => line.status === 'Inactive').map((line) => (
                          <option key={line.line_id} value={line.line_id}>
                            {line.line_id} {line.description ? `- ${line.description}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Grinding Available
                      </label>
                      <select 
                        name="grinding_available" 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'grinding_available' in editingItem ? String(editingItem.grinding_available) : 'false'}
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                    {unitManagementEnabled && units.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Unit
                        </label>
                        <select 
                          name="unit" 
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                          defaultValue={editingItem && 'unit' in editingItem ? editingItem.unit || defaultUnit : defaultUnit}
                        >
                          {units
                            .filter(unit => unit.status === 'Active')
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(unit => (
                              <option key={unit.id} value={unit.name}>
                                {unit.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                    Additional Information
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      name="remarks"
                      rows={3}
                      placeholder="Enter any additional notes or remarks..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-gray-500"
                      defaultValue={editingItem && 'remarks' in editingItem ? editingItem.remarks : ''}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingItem && 'machine_id' in editingItem && editingItem.machine_id ? 'Update Machine' : 'Add Machine'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModal && modalType === 'mold' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingItem && 'mold_id' in editingItem && editingItem.mold_id ? 'Edit Mold' : 'Add New Mold'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingItem && 'mold_id' in editingItem && editingItem.mold_id 
                      ? 'Update mold information' 
                      : 'Enter mold details to add to the system'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const itemName = formData.get('item_name') as string;
              const itemCode = formData.get('item_code') as string;
              
              // Helper function to convert form values to proper types
              const getNumberOrUndefined = (value: FormDataEntryValue | null): number | undefined => {
                if (!value || value === '') return undefined;
                const num = parseFloat(value as string);
                return isNaN(num) ? undefined : num;
              };
              
              const getStringOrUndefined = (value: FormDataEntryValue | null): string | undefined => {
                if (!value || value === '') return undefined;
                return value as string;
              };
              
              const moldData = {
                mold_id: formData.get('mold_id') as string,
                // Use item_name as mold_name if provided, otherwise use the hidden mold_name field
                mold_name: itemName || (formData.get('mold_name') as string) || '',
                cavities: parseInt(formData.get('cavities') as string) || 0,
                compatible_machines: [],
                purchase_date: formData.get('start_date') as string || new Date().toISOString().split('T')[0],
                maker: formData.get('make') as string || 'Unknown',
                // New fields
                item_code: itemCode,
                item_name: itemName,
                type: formData.get('type') as string,
                cycle_time: getNumberOrUndefined(formData.get('cycle_time')),
                st_wt: getNumberOrUndefined(formData.get('st_wt')),
                dwg_wt: getNumberOrUndefined(formData.get('dwg_wt')),
                int_wt: getNumberOrUndefined(formData.get('int_wt')),
                rp_bill_wt: getNumberOrUndefined(formData.get('rp_bill_wt')),
                mold_wt: getNumberOrUndefined(formData.get('mold_wt')),
                dimensions: getStringOrUndefined(formData.get('dimensions')),
                hrc_make: getStringOrUndefined(formData.get('hrc_make')),
                hrc_zone: formData.get('hrc_zone') as string,
                make: formData.get('make') as string,
                start_date: getStringOrUndefined(formData.get('start_date')),
                unit: unitManagementEnabled ? (formData.get('unit') as string) || defaultUnit : undefined
              } as Partial<Mold>;
              
              try {
                if (editingItem && 'mold_id' in editingItem && editingItem.mold_id) {
                  // Update existing mold - use the returned value from API to ensure UI reflects all database fields
                  const updatedMold = await moldAPI.update(editingItem.mold_id, moldData as Partial<Mold>);
                  if (updatedMold) {
                    setMoldsMaster(prev => prev.map(m => 
                      m.mold_id === editingItem.mold_id ? updatedMold : m
                    ));
                  }
                } else {
                  // Create new mold - ensure all required fields are present
                  // Extract required fields with defaults to ensure they're not undefined
                  const moldId: string = moldData.mold_id || `MOLD-${Date.now()}`;
                  const moldName: string = moldData.mold_name || '';
                  const cavities: number = moldData.cavities || 0;
                  const purchaseDate: string = moldData.purchase_date || new Date().toISOString().split('T')[0];
                  const maker: string = moldData.maker || 'Unknown';
                  const itemCode: string = moldData.item_code || '';
                  const itemName: string = moldData.item_name || '';
                  const type: string = moldData.type || 'Container';
                  const hrcZone: string = moldData.hrc_zone || '07 ZONE';
                  const make: string = moldData.make || '';
                  
                  const createData = {
                    mold_id: moldId,
                    mold_name: moldName,
                    cavities: cavities,
                    compatible_machines: [],
                    purchase_date: purchaseDate,
                    maker: maker,
                    item_code: itemCode,
                    item_name: itemName,
                    type: type,
                    hrc_zone: hrcZone,
                    make: make,
                    cycle_time: moldData.cycle_time,
                    st_wt: moldData.st_wt,
                    dwg_wt: moldData.dwg_wt,
                    int_wt: moldData.int_wt,
                    rp_bill_wt: moldData.rp_bill_wt,
                    mold_wt: moldData.mold_wt,
                    dimensions: moldData.dimensions,
                    hrc_make: moldData.hrc_make,
                    start_date: moldData.start_date,
                    unit: moldData.unit,
                  } as Omit<Mold, 'created_at' | 'updated_at'>;
                  
                  const newMold = await moldAPI.create(createData);
                  if (newMold) {
                    setMoldsMaster(prev => [...prev, newMold]);
                  }
                }
                setShowModal(false);
                setEditingItem(null);
              } catch (error) {
                console.error('Error saving mold:', error);
                alert('Error saving mold. Please try again.');
              }
            }}>
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                    Basic Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Item Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="item_code"
                        required
                        placeholder="e.g., MOLD-001"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'item_code' in editingItem && editingItem.item_code ? editingItem.item_code : (editingItem && 'mold_id' in editingItem ? editingItem.mold_id : '')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Item Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="item_name"
                        required
                        placeholder="e.g., Ro10-C"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'item_name' in editingItem && editingItem.item_name ? editingItem.item_name : (editingItem && 'mold_name' in editingItem ? editingItem.mold_name : '')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        name="type"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'type' in editingItem && editingItem.type ? editingItem.type : 'Container'}
                      >
                        <option value="Container">Container</option>
                        <option value="Lid">Lid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Make
                      </label>
                      <input
                        type="text"
                        name="make"
                        placeholder="e.g., Toolcraft Inc"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'make' in editingItem && editingItem.make ? editingItem.make : (editingItem && 'maker' in editingItem && editingItem.maker ? editingItem.maker : '')}
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-green-600 rounded-full mr-3"></div>
                    Technical Specifications
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Number of Cavities <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="cavities"
                        required
                        min="1"
                        placeholder="e.g., 4"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'cavities' in editingItem && editingItem.cavities != null ? editingItem.cavities : (editingItem && 'cavity' in editingItem && editingItem.cavity != null ? editingItem.cavity : '')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Cycle Time (seconds)
                      </label>
                      <input
                        type="number"
                        name="cycle_time"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 30.0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'cycle_time' in editingItem && editingItem.cycle_time != null ? editingItem.cycle_time : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        St. Wt. (grams)
                      </label>
                      <input
                        type="number"
                        name="st_wt"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 100.0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'st_wt' in editingItem && editingItem.st_wt != null ? editingItem.st_wt : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Dwg Wt. (grams)
                      </label>
                      <input
                        type="number"
                        name="dwg_wt"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 10.0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'dwg_wt' in editingItem && editingItem.dwg_wt != null ? editingItem.dwg_wt : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Int. Wt. (grams)
                      </label>
                      <input
                        type="number"
                        name="int_wt"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 1.0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'int_wt' in editingItem && editingItem.int_wt != null ? editingItem.int_wt : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        RP Bill Wt. (grams)
                      </label>
                      <input
                        type="number"
                        name="rp_bill_wt"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 1.0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'rp_bill_wt' in editingItem && editingItem.rp_bill_wt != null ? editingItem.rp_bill_wt : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mold Wt. (grams)
                      </label>
                      <input
                        type="number"
                        name="mold_wt"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 1100.77"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'mold_wt' in editingItem && editingItem.mold_wt != null ? editingItem.mold_wt : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Dimensions
                      </label>
                      <input
                        type="text"
                        name="dimensions"
                        placeholder="e.g., 701 x 579 x 434"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'dimensions' in editingItem && editingItem.dimensions ? editingItem.dimensions : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        HRC Make
                      </label>
                      <input
                        type="text"
                        name="hrc_make"
                        placeholder="e.g., HRC Make"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'hrc_make' in editingItem && editingItem.hrc_make ? editingItem.hrc_make : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        HRC Zone
                      </label>
                      <select
                        name="hrc_zone"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'hrc_zone' in editingItem && editingItem.hrc_zone ? editingItem.hrc_zone : '07 ZONE'}
                      >
                        <option value="01 ZONE">01 ZONE</option>
                        <option value="02 ZONE">02 ZONE</option>
                        <option value="03 ZONE">03 ZONE</option>
                        <option value="04 ZONE">04 ZONE</option>
                        <option value="05 ZONE">05 ZONE</option>
                        <option value="06 ZONE">06 ZONE</option>
                        <option value="07 ZONE">07 ZONE</option>
                        <option value="08 ZONE">08 ZONE</option>
                        <option value="09 ZONE">09 ZONE</option>
                        <option value="10 ZONE">10 ZONE</option>
                        <option value="11 ZONE">11 ZONE</option>
                        <option value="12 ZONE">12 ZONE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        name="start_date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'start_date' in editingItem && editingItem.start_date ? (typeof editingItem.start_date === 'string' ? editingItem.start_date.split('T')[0] : new Date(editingItem.start_date).toISOString().split('T')[0]) : ''}
                      />
                    </div>
                    {unitManagementEnabled && units.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Unit
                        </label>
                        <select 
                          name="unit" 
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                          defaultValue={editingItem && 'unit' in editingItem && editingItem.unit ? editingItem.unit : defaultUnit}
                        >
                          {units
                            .filter(unit => unit.status === 'Active')
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(unit => (
                              <option key={unit.id} value={unit.name}>
                                {unit.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legacy Fields (Hidden but maintained for compatibility) */}
                <input type="hidden" name="mold_id" value={editingItem && 'mold_id' in editingItem ? editingItem.mold_id : ''} />
                <input type="hidden" name="mold_name" value={editingItem && 'mold_name' in editingItem ? editingItem.mold_name : ''} />

                {/* Compatibility Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-green-600 rounded-full mr-3"></div>
                    Compatibility
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3">
                        <Info className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Compatible Machines</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Machine compatibility will be configured after mold creation
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingItem && 'mold_id' in editingItem && editingItem.mold_id ? 'Update Mold' : 'Add Mold'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModal && modalType === 'packing_material' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingItem && 'id' in editingItem && editingItem.id ? 'Edit Packing Material' : 'Add New Packing Material'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingItem && 'id' in editingItem && editingItem.id 
                      ? 'Update packing material information' 
                      : 'Enter packing material details to add to the system'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const packingMaterialData = {
                category: formData.get('category') as string,
                type: formData.get('type') as string,
                item_code: formData.get('item_code') as string,
                pack_size: formData.get('pack_size') as string,
                dimensions: formData.get('dimensions') as string,
                technical_detail: formData.get('technical_detail') as string,
                brand: formData.get('brand') as string,
                cbm: formData.get('cbm') ? parseFloat(formData.get('cbm') as string) : undefined,
                artwork: formData.get('artwork') as string || undefined,
                unit: unitManagementEnabled ? (formData.get('unit') as string) || defaultUnit : undefined
              };
              
              try {
                if (editingItem && 'id' in editingItem && editingItem.id) {
                  // Update existing packing material
                  await packingMaterialAPI.update(editingItem.id, packingMaterialData);
                  setPackingMaterialsMaster(prev => prev.map(p => 
                    p.id === editingItem.id ? { ...p, ...packingMaterialData } : p
                  ));
                } else {
                  // Create new packing material
                  const newPackingMaterial = await packingMaterialAPI.create(packingMaterialData);
                  if (newPackingMaterial) {
                    setPackingMaterialsMaster(prev => [...prev, newPackingMaterial]);
                  }
                }
                setShowModal(false);
                setEditingItem(null);
              } catch (error) {
                console.error('Error saving packing material:', error);
                alert('Error saving packing material. Please try again.');
              }
            }}>
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-orange-600 rounded-full mr-3"></div>
                    Basic Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category"
                        required
                        defaultValue={editingItem && 'category' in editingItem ? (editingItem as PackingMaterial).category : ''}
                        className="w-full px-3 py-2 border border-gray-300  text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select Category</option>
                        <option value="Boxes">Boxes</option>
                        <option value="Polybags">Polybags</option>
                        <option value="BOPP">BOPP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="type"
                        required
                        defaultValue={editingItem && 'type' in editingItem ? (editingItem as PackingMaterial).type : ''}
                        className="w-full px-3 py-2 border border-gray-300  text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., Export, Local"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Item Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="item_code"
                        required
                        defaultValue={editingItem && 'item_code' in editingItem ? (editingItem as PackingMaterial).item_code : ''}
                        className="w-full px-3 py-2 border border-gray-300  text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., CTN-Ro16"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Brand
                      </label>
                      <input
                        type="text"
                        name="brand"
                        defaultValue={editingItem && 'brand' in editingItem ? (editingItem as PackingMaterial).brand || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300  text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., Regular, Gesa"
                      />
                    </div>
                  </div>
                </div>

                {/* Specifications */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                    Specifications
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Pack Size
                      </label>
                      <input
                        type="text"
                        name="pack_size"
                        defaultValue={editingItem && 'pack_size' in editingItem ? (editingItem as PackingMaterial).pack_size || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300  text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., 150, 800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Dimensions
                      </label>
                      <input
                        type="text"
                        name="dimensions"
                        defaultValue={editingItem && 'dimensions' in editingItem ? (editingItem as PackingMaterial).dimensions || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300  text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., LxBxH format"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Technical Detail
                      </label>
                      <textarea
                        name="technical_detail"
                        rows={3}
                        defaultValue={editingItem && 'technical_detail' in editingItem ? (editingItem as PackingMaterial).technical_detail || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300  text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Technical specifications and requirements"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                    Additional Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        CBM (m³)
                      </label>
                      <input
                        type="number"
                        name="cbm"
                        step="0.0001"
                        min="0"
                        defaultValue={editingItem && 'cbm' in editingItem ? (editingItem as PackingMaterial).cbm || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300  text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., 0.1234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Artwork URL
                      </label>
                      <input
                        type="url"
                        name="artwork"
                        defaultValue={editingItem && 'artwork' in editingItem ? (editingItem as PackingMaterial).artwork || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300  text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., https://example.com/artwork.jpg"
                      />
                    </div>
                    {unitManagementEnabled && units.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Unit
                        </label>
                        <select 
                          name="unit" 
                          className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          defaultValue={editingItem && 'unit' in editingItem ? editingItem.unit || defaultUnit : defaultUnit}
                        >
                          {units
                            .filter(unit => unit.status === 'Active')
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(unit => (
                              <option key={unit.id} value={unit.name}>
                                {unit.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingItem && 'id' in editingItem && editingItem.id ? 'Update Packing Material' : 'Add Packing Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModal && modalType === 'raw_material' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingItem && 'id' in editingItem && editingItem.id ? 'Edit Raw Material' : 'Add New Raw Material'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingItem && 'id' in editingItem && editingItem.id 
                      ? 'Update raw material information' 
                      : 'Enter raw material details to add to the system'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const rawMaterialData = {
                sl_no: parseInt(formData.get('sl_no') as string) || 0,
                category: formData.get('category') as string,
                type: formData.get('type') as string,
                grade: formData.get('grade') as string,
                supplier: formData.get('supplier') as string,
                mfi: formData.get('mfi') ? parseFloat(formData.get('mfi') as string) : null,
                density: formData.get('density') ? parseFloat(formData.get('density') as string) : null,
                tds_image: formData.get('tds_image') as string || undefined,
                remark: formData.get('remark') as string || undefined,
                unit: unitManagementEnabled ? (formData.get('unit') as string) || defaultUnit : undefined
              };
              
              try {
                if (editingItem && 'id' in editingItem && editingItem.id) {
                  // Update existing raw material
                  await rawMaterialAPI.update(editingItem.id, rawMaterialData);
                  setRawMaterialsMaster(prev => prev.map(r => 
                    r.id === editingItem.id ? { ...r, ...rawMaterialData } : r
                  ));
                } else {
                  // Create new raw material
                  const newRawMaterial = await rawMaterialAPI.create(rawMaterialData);
                  if (newRawMaterial) {
                    setRawMaterialsMaster(prev => [...prev, newRawMaterial]);
                  }
                }
                setShowModal(false);
                setEditingItem(null);
              } catch (error) {
                console.error('Error saving raw material:', error);
                alert('Error saving raw material. Please try again.');
              }
            }}>
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-green-600 rounded-full mr-3"></div>
                    Basic Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Sl. No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="sl_no"
                        required
                        min="1"
                        placeholder="e.g., 1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'sl_no' in editingItem && editingItem.sl_no != null ? editingItem.sl_no : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'category' in editingItem && editingItem.category ? editingItem.category : 'PP'}
                      >
                        <option value="PP">PP</option>
                        <option value="PE">PE</option>
                        <option value="ABS">ABS</option>
                        <option value="PVC">PVC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="type"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'type' in editingItem && editingItem.type ? editingItem.type : 'HP'}
                      >
                        <option value="HP">HP</option>
                        <option value="ICP">ICP</option>
                        <option value="RCP">RCP</option>
                        <option value="LDPE">LDPE</option>
                        <option value="HDPE">HDPE</option>
                        <option value="MB">MB</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Grade <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="grade"
                        required
                        placeholder="e.g., HJ333MO, 1750 MN"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'grade' in editingItem && editingItem.grade ? editingItem.grade : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Supplier <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="supplier"
                        required
                        placeholder="e.g., Borouge, IOCL, Basell"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'supplier' in editingItem && editingItem.supplier ? editingItem.supplier : ''}
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                    Technical Specifications
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        MFI
                      </label>
                      <input
                        type="number"
                        name="mfi"
                        step="0.01"
                        min="0"
                        placeholder="e.g., 75"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'mfi' in editingItem && editingItem.mfi != null ? editingItem.mfi : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Density
                      </label>
                      <input
                        type="number"
                        name="density"
                        step="0.001"
                        min="0"
                        placeholder="e.g., 910"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'density' in editingItem && editingItem.density != null ? editingItem.density : ''}
                      />
                    </div>
                    {unitManagementEnabled && units.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Unit
                        </label>
                        <select 
                          name="unit" 
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900"
                          defaultValue={editingItem && 'unit' in editingItem && editingItem.unit ? editingItem.unit : defaultUnit}
                        >
                          {units
                            .filter(unit => unit.status === 'Active')
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(unit => (
                              <option key={unit.id} value={unit.name}>
                                {unit.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* TDS Image */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                    Technical Data Sheet
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      TDS Image URL
                    </label>
                    <input
                      type="url"
                      name="tds_image"
                      placeholder="Enter TDS image URL or leave blank"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900"
                      defaultValue={editingItem && 'tds_image' in editingItem && editingItem.tds_image ? editingItem.tds_image : ''}
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter a URL to the TDS image or leave blank if not available</p>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-orange-600 rounded-full mr-3"></div>
                    Additional Information
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      name="remark"
                      rows={3}
                      placeholder="Enter any additional notes or remarks..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none text-gray-900"
                      defaultValue={editingItem && 'remark' in editingItem && editingItem.remark ? editingItem.remark : ''}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingItem && 'id' in editingItem && editingItem.id ? 'Update Raw Material' : 'Add Raw Material'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModal && modalType === 'color_label' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Palette className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingItem && 'id' in editingItem && editingItem.id ? 'Edit Color/Label' : 'Add New Color/Label'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingItem && 'id' in editingItem && editingItem.id 
                      ? 'Update color/label information' 
                      : 'Enter color/label details to add to the system'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const colorLabelData = {
                sr_no: parseInt(formData.get('sr_no') as string) || 0,
                color_label: formData.get('color_label') as string
              };
              
              try {
                if (editingItem && 'id' in editingItem && editingItem.id) {
                  // Update existing color/label
                  await colorLabelAPI.update(editingItem.id, colorLabelData);
                } else {
                  // Create new color/label
                  await colorLabelAPI.create(colorLabelData);
                }
                setShowModal(false);
                setEditingItem(null);
                // Trigger a custom event to refresh the color label list
                window.dispatchEvent(new CustomEvent('refreshColorLabels'));
              } catch (error) {
                console.error('Error saving color/label:', error);
                alert('Error saving color/label. Please try again.');
              }
            }}>
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                    Color/Label Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Sr. No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="sr_no"
                        required
                        min="1"
                        placeholder="e.g., 1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'sr_no' in editingItem ? editingItem.sr_no : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Color / Label <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="color_label"
                        required
                        placeholder="e.g., Natural, Peach, White"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'color_label' in editingItem ? editingItem.color_label : ''}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingItem && 'id' in editingItem && editingItem.id ? 'Update Color/Label' : 'Add Color/Label'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModal && modalType === 'view_color_label' && editingItem && 'id' in editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Palette className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Color/Label Details</h2>
                  <p className="text-sm text-gray-500 mt-1">View color/label information</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Sr. No.
                      </label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {(editingItem as ColorLabel).sr_no}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Color / Label
                      </label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {(editingItem as ColorLabel).color_label}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showModal && modalType === 'party_name' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingItem && 'id' in editingItem && editingItem.id ? 'Edit Party Name' : 'Add New Party Name'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingItem && 'id' in editingItem && editingItem.id 
                      ? 'Update party name information' 
                      : 'Enter party name details to add to the system'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const partyNameData = {
                name: formData.get('name') as string
              };
              
              try {
                if (editingItem && 'id' in editingItem && editingItem.id) {
                  // Update existing party name
                  await partyNameAPI.update(editingItem.id, partyNameData);
                } else {
                  // Create new party name
                  await partyNameAPI.create(partyNameData);
                }
                setShowModal(false);
                setEditingItem(null);
                // Trigger a custom event to refresh the party name list
                window.dispatchEvent(new CustomEvent('refreshPartyNames'));
              } catch (error) {
                console.error('Error saving party name:', error);
                alert('Error saving party name. Please try again.');
              }
            }}>
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                    Party Name Information
                  </h3>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g., Easy, Herald, Regular"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                        defaultValue={editingItem && 'name' in editingItem ? editingItem.name : ''}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingItem && 'id' in editingItem && editingItem.id ? 'Update Party Name' : 'Add Party Name'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModal && modalType === 'view_party_name' && editingItem && 'id' in editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Party Name Details</h2>
                  <p className="text-sm text-gray-500 mt-1">View party name information</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Name
                      </label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {(editingItem as PartyName).name}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showModal && (modalType === 'view_machine' || modalType === 'view_mold' || modalType === 'view_packing_material' || modalType === 'view_raw_material' || modalType === 'view_line' || modalType === 'edit_line') && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  modalType === 'view_machine' ? 'bg-blue-100' : 
                  modalType === 'view_mold' ? 'bg-purple-100' : 
                  modalType === 'view_line' || modalType === 'edit_line' ? 'bg-purple-100' :
                  'bg-orange-100'
                }`}>
                  {modalType === 'view_machine' ? (
                    <Wrench className="w-6 h-6 text-blue-600" />
                  ) : modalType === 'view_mold' ? (
                    <Package className="w-6 h-6 text-purple-600" />
                  ) : modalType === 'view_line' || modalType === 'edit_line' ? (
                    <Link className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Package className="w-6 h-6 text-orange-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modalType === 'view_machine' ? 'Machine Details' : 
                     modalType === 'view_mold' ? 'Mold Details' : 
                     modalType === 'view_line' ? 'Line Details' :
                     modalType === 'edit_line' ? 'Edit Line' :
                     'Packing Material Details'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {modalType === 'view_machine' ? 'View machine information' : 
                     modalType === 'view_mold' ? 'View mold information' : 
                     modalType === 'view_line' ? 'View line information' :
                     modalType === 'edit_line' ? 'Edit line information' :
                     'View packing material information'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {editingItem && (
                <div className="space-y-6">


                  {modalType === 'view_machine' && 'machine_id' in editingItem && editingItem && (
                    <>
                      {/* Basic Information */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                          Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Machine ID</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).machine_id}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Make</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).make}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Model</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).model}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Size (Tons)</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).size}</div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Details */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-green-600 rounded-full mr-3"></div>
                          Technical Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">CLM Sr. No</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).clm_sr_no || 'Not specified'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Injection Serial No</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).inj_serial_no || 'Not specified'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Manufacturing Date</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).mfg_date || 'Not specified'}</div>
                          </div>
                          {/* <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Purchase Date</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).purchase_date || 'Not specified'}</div>
                          </div> */}
                        </div>
                      </div>

                      {/* Status & Configuration */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-orange-600 rounded-full mr-3"></div>
                          Status & Configuration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Status</div>
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                (editingItem as Machine).status === 'Active' ? 'bg-green-100 text-green-800' :
                                (editingItem as Machine).status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {(editingItem as Machine).status === 'Active' && '🟢'}
                                {(editingItem as Machine).status === 'Maintenance' && '🔧'}
                                {(editingItem as Machine).status === 'Idle' && '⏸️'}
                                {(editingItem as Machine).status}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Line</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {(editingItem as Machine).line ? (
                                <div>
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                    {(editingItem as Machine).line}
                                  </span>
                                  {(editingItem as Machine).line && typeof (editingItem as Machine).line === 'string' && lineDetails.get((editingItem as Machine).line as string) && (
                                    <div className="mt-2 text-sm text-gray-600">
                                      {lineDetails.get((editingItem as Machine).line as string)?.description}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500">Not specified</span>
                              )}
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Type</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).type || 'Injection Molding Machine'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Grinding Available</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).grinding_available ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Information */}
                      {(editingItem as Machine).remarks && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                            Additional Information
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-2">Remarks</div>
                            <div className="text-gray-900">{(editingItem as Machine).remarks}</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {modalType === 'view_mold' && 'mold_id' in editingItem && editingItem && (
                    <>
                      {/* Basic Information */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                          Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Item Code</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Mold).item_code || (editingItem as Mold).mold_id}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Item Name</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Mold).item_name || (editingItem as Mold).mold_name}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Type</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Mold).type || 'Injection Mold'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Make</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Mold).make || (editingItem as Mold).maker || 'Not specified'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Specifications */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-green-600 rounded-full mr-3"></div>
                          Technical Specifications
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Number of Cavities</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Mold).cavities}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Cycle Time</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Mold).cycle_time ? `${(editingItem as Mold).cycle_time}s` : 'Not specified'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">St. Wt.</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Mold).st_wt ? `${(editingItem as Mold).st_wt}g` : 'Not specified'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">HRC Zone</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Mold).hrc_zone || 'Not specified'}</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {modalType === 'view_packing_material' && editingItem && (
                    <>
                      {/* Basic Information */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-orange-600 rounded-full mr-3"></div>
                          Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Category</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as PackingMaterial).category || '-'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Type</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as PackingMaterial).type || '-'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Item Code</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as PackingMaterial).item_code || '-'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Brand</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as PackingMaterial).brand || '-'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Specifications */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                          Specifications
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Pack Size</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as PackingMaterial).pack_size || '-'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Dimensions</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as PackingMaterial).dimensions || '-'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                            <div className="text-sm font-medium text-gray-600 mb-1">Technical Detail</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as PackingMaterial).technical_detail || '-'}</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {modalType === 'view_raw_material' && editingItem && (
                    <>
                      {/* Basic Information */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-green-600 rounded-full mr-3"></div>
                          Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Sl. No.</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as RawMaterial).sl_no}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Category</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as RawMaterial).category}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Type</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as RawMaterial).type}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Grade</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as RawMaterial).grade}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Supplier</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as RawMaterial).supplier}</div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Specifications */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                          Technical Specifications
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">MFI</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as RawMaterial).mfi || 'Not specified'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Density</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as RawMaterial).density || 'Not specified'}</div>
                          </div>
                        </div>
                      </div>

                      {/* TDS Image */}
                      {(editingItem as RawMaterial).tds_image && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                            Technical Data Sheet
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-center">
                              <img 
                                src={(editingItem as RawMaterial).tds_image} 
                                alt="TDS" 
                                className="max-w-full max-h-96 object-contain border border-gray-200 rounded-lg shadow-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const errorDiv = document.createElement('div');
                                  errorDiv.className = 'text-gray-500 p-8 border border-gray-200 rounded-lg';
                                  errorDiv.textContent = 'Failed to load TDS image';
                                  target.parentElement!.appendChild(errorDiv);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Remarks */}
                      {(editingItem as RawMaterial).remark && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <div className="w-1 h-5 bg-orange-600 rounded-full mr-3"></div>
                            Additional Information
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-2">Remarks</div>
                            <div className="text-gray-900">{(editingItem as RawMaterial).remark}</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {modalType === 'view_line' && 'line_id' in editingItem && editingItem && (() => {
                    // Get the current line data from linesMaster to ensure we have the latest data
                    const currentLine = linesMaster.find(line => line.line_id === (editingItem as Line).line_id) || editingItem as Line;
                    
                    return (
                      <>
                        {/* Basic Information */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                            Basic Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">Line ID</div>
                              <div className="text-lg font-semibold text-gray-900">{currentLine.line_id}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">Description</div>
                              <div className="text-lg font-semibold text-gray-900">{currentLine.description || 'Not specified'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">Status</div>
                              <div className="text-lg font-semibold text-gray-900">{currentLine.status}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">Unit</div>
                              <div className="text-lg font-semibold text-gray-900">{currentLine.unit || 'Unit 1'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Grinding Section */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <div className="w-1 h-5 bg-orange-600 rounded-full mr-3"></div>
                            Grinding
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">Grinding Available</div>
                              <div className="text-lg font-semibold text-gray-900">
                                {currentLine.grinding ? (
                                  <span className="text-green-600 flex items-center">
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Yes
                                  </span>
                                ) : (
                                  <span className="text-gray-500 flex items-center">
                                    <XCircle className="w-5 h-5 mr-2" />
                                    No
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Machine Assignments */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                            Machine Assignments
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">IM Machine</div>
                              <div className="text-lg font-semibold text-gray-900">{currentLine.im_machine_id || 'Not assigned'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">Robot</div>
                              <div className="text-lg font-semibold text-gray-900">{currentLine.robot_machine_id || 'Not assigned'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">Conveyor</div>
                              <div className="text-lg font-semibold text-gray-900">{currentLine.conveyor_machine_id || 'Not assigned'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">Hoist</div>
                              <div className="text-lg font-semibold text-gray-900">{currentLine.hoist_machine_id || 'Not assigned'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="text-sm font-medium text-gray-600 mb-1">Loader <span className="text-gray-400 text-xs font-normal">(Optional)</span></div>
                              <div className="text-lg font-semibold text-gray-900">{currentLine.loader_machine_id || 'Not assigned'}</div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {modalType === 'edit_line' && (
                    <>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                          <div className="w-1 h-5 bg-purple-600 rounded-full mr-3"></div>
                          {editingItem && 'line_id' in editingItem && editingItem.line_id ? 'Edit Line Information' : 'Add New Line'}
                        </h3>
                        
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          // Helper to convert empty string to undefined
                          const getValueOrUndefined = (value: string | null) => {
                            return value && value.trim() ? value : undefined;
                          };
                          
                          const updates = {
                            description: formData.get('description') as string,
                            im_machine_id: getValueOrUndefined(formData.get('im_machine_id') as string),
                            robot_machine_id: getValueOrUndefined(formData.get('robot_machine_id') as string),
                            conveyor_machine_id: getValueOrUndefined(formData.get('conveyor_machine_id') as string),
                            hoist_machine_id: getValueOrUndefined(formData.get('hoist_machine_id') as string),
                            loader_machine_id: getValueOrUndefined(formData.get('loader_machine_id') as string),
                            status: formData.get('status') as 'Active' | 'Inactive' | 'Maintenance',
                            unit: formData.get('unit') as string || 'Unit 1',
                            grinding: formData.get('grinding') === 'true'
                          };
                          
                          try {
                            // Get old line data for comparison (if updating)
                            const oldLine = editingItem && 'line_id' in editingItem && editingItem.line_id
                              ? linesMaster.find(l => l.line_id === (editingItem as Line).line_id)
                              : null;
                            
                            if (editingItem && 'line_id' in editingItem && editingItem.line_id) {
                              // Update existing line - use the returned value from API to ensure UI reflects all database fields
                              const updatedLine = await lineAPI.update((editingItem as Line).line_id, updates);
                              if (updatedLine) {
                                setLinesMaster(prev => prev.map(line => 
                                  line.line_id === (editingItem as Line).line_id 
                                    ? updatedLine
                                    : line
                                ));
                                
                                // Bidirectional sync: Update machine's line field when line assignments change
                                const lineId = (editingItem as Line).line_id;
                                const machineFields: Array<'im_machine_id' | 'robot_machine_id' | 'conveyor_machine_id' | 'hoist_machine_id' | 'loader_machine_id'> = 
                                  ['im_machine_id', 'robot_machine_id', 'conveyor_machine_id', 'hoist_machine_id', 'loader_machine_id'];
                                
                                for (const field of machineFields) {
                                  const oldMachineId = oldLine?.[field];
                                  const newMachineId = updates[field];
                                  
                                  // If machine assignment changed, update the machine's line field
                                  if (oldMachineId !== newMachineId) {
                                    // Clear old machine's line assignment - it was removed from this line
                                    // This handles both: machine changed to another machine, or machine was deselected (newMachineId is undefined)
                                    // IMPORTANT: Always clear if oldMachineId exists, regardless of machine's current line field
                                    // This ensures sync even if data was previously out of sync
                                    if (oldMachineId) {
                                      try {
                                        // Always clear the old machine's line assignment since it was removed from this line
                                        await machineAPI.update(oldMachineId, { line: undefined });
                                        setMachinesMaster(prev => prev.map(m => 
                                          m.machine_id === oldMachineId ? { ...m, line: undefined } : m
                                        ));
                                        console.log(`✅ Cleared line assignment for machine ${oldMachineId} (was assigned to line ${lineId})`);
                                      } catch (error) {
                                        console.error(`Error clearing line assignment for machine ${oldMachineId}:`, error);
                                      }
                                    }
                                    
                                    // Set new machine's line assignment (only if a new machine was selected)
                                    if (newMachineId && newMachineId !== oldMachineId) {
                                      try {
                                        await machineAPI.update(newMachineId, { line: lineId });
                                        setMachinesMaster(prev => prev.map(m => 
                                          m.machine_id === newMachineId ? { ...m, line: lineId } : m
                                        ));
                                        console.log(`✅ Set line assignment ${lineId} for machine ${newMachineId}`);
                                      } catch (error) {
                                        console.error(`Error setting line assignment for machine ${newMachineId}:`, error);
                                      }
                                    }
                                  }
                                }
                                
                                // Reload data from database to ensure sync
                                try {
                                  const [refreshedLines, refreshedMachines] = await Promise.all([
                                    lineAPI.getAll(),
                                    machineAPI.getAll()
                                  ]);
                                  setLinesMaster(refreshedLines);
                                  setMachinesMaster(refreshedMachines);
                                } catch (refreshError) {
                                  console.error('Error refreshing data after line update:', refreshError);
                                }
                              }
                            } else {
                              // Create new line
                              const lineId = formData.get('line_id') as string;
                              if (!lineId) {
                                alert('Line ID is required');
                                return;
                              }
                              const newLine = await lineAPI.create({
                                ...updates,
                                line_id: lineId
                              } as Omit<Line, 'created_at' | 'updated_at'>);
                              if (newLine) {
                                setLinesMaster(prev => [...prev, newLine]);
                                
                                // Bidirectional sync: Update machines' line field for new line assignments
                                const machineFields: Array<'im_machine_id' | 'robot_machine_id' | 'conveyor_machine_id' | 'hoist_machine_id' | 'loader_machine_id'> = 
                                  ['im_machine_id', 'robot_machine_id', 'conveyor_machine_id', 'hoist_machine_id', 'loader_machine_id'];
                                
                                for (const field of machineFields) {
                                  const machineId = updates[field];
                                  if (machineId) {
                                    await machineAPI.update(machineId, { line: lineId });
                                    setMachinesMaster(prev => prev.map(m => 
                                      m.machine_id === machineId ? { ...m, line: lineId } : m
                                    ));
                                  }
                                }
                                
                                // Reload data from database to ensure sync
                                try {
                                  const [refreshedLines, refreshedMachines] = await Promise.all([
                                    lineAPI.getAll(),
                                    machineAPI.getAll()
                                  ]);
                                  setLinesMaster(refreshedLines);
                                  setMachinesMaster(refreshedMachines);
                                } catch (refreshError) {
                                  console.error('Error refreshing data after creating line:', refreshError);
                                }
                              }
                            }
                            setShowModal(false);
                            setEditingItem(null);
                          } catch (error) {
                            console.error('Error saving line:', error);
                            alert('Failed to save line. Please try again.');
                          }
                        }}>
                          
                          {/* Basic Information */}
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <div className="w-1 h-5 bg-blue-600 rounded-full mr-3"></div>
                              Basic Information
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Line ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  name="line_id"
                                  defaultValue={editingItem && 'line_id' in editingItem ? (editingItem as Line).line_id : ''}
                                  required
                                  disabled={editingItem && 'line_id' in editingItem && !!editingItem.line_id}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 disabled:bg-gray-100"
                                  placeholder="e.g., LINE-001"
                                />
                              </div>
                              
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Description
                                </label>
                                <textarea
                                  name="description"
                                  defaultValue={editingItem && 'description' in editingItem && editingItem.description ? (editingItem as Line).description : ''}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                                  placeholder="Description of the production line"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Machine Assignments */}
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <div className="w-1 h-5 bg-green-600 rounded-full mr-3"></div>
                              Machine Assignments
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  IM Machine
                                </label>
                                <select
                                  name="im_machine_id"
                                  defaultValue={editingItem && 'im_machine_id' in editingItem && editingItem.im_machine_id ? (editingItem as Line).im_machine_id : ''}
                                  className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                  <option value="">Select IM Machine</option>
                                  {(() => {
                                    const availableIMMachines = machinesMaster.filter(machine => 
                                      machine.category === 'IM' && 
                                      (machine.machine_id === (editingItem as Line).im_machine_id || 
                                       !linesMaster.some(line => 
                                         line.line_id !== (editingItem as Line).line_id && 
                                         line.im_machine_id === machine.machine_id
                                       ))
                                    );
                                    
                                    if (availableIMMachines.length === 0) {
                                      return <option value="" disabled>No available IM machines</option>;
                                    }
                                    
                                    return availableIMMachines.map(machine => (
                                      <option key={machine.machine_id} value={machine.machine_id}>
                                        {machine.machine_id} - {machine.make} {machine.model}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Robot
                                </label>
                                <select
                                  name="robot_machine_id"
                                  defaultValue={editingItem && 'robot_machine_id' in editingItem && editingItem.robot_machine_id ? (editingItem as Line).robot_machine_id : ''}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-900 focus:ring-purple-500 focus:border-purple-500"
                                >
                                  <option value="">Select Robot</option>
                                  {(() => {
                                    const availableRobotMachines = machinesMaster.filter(machine => 
                                      machine.category === 'Robot' && 
                                      (machine.machine_id === (editingItem as Line).robot_machine_id || 
                                       !linesMaster.some(line => 
                                         line.line_id !== (editingItem as Line).line_id && 
                                         line.robot_machine_id === machine.machine_id
                                       ))
                                    );
                                    
                                    if (availableRobotMachines.length === 0) {
                                      return <option value="" disabled>No available robots</option>;
                                    }
                                    
                                    return availableRobotMachines.map(machine => (
                                      <option key={machine.machine_id} value={machine.machine_id}>
                                        {machine.machine_id} - {machine.make} {machine.model}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Conveyor
                                </label>
                                <select
                                  name="conveyor_machine_id"
                                  defaultValue={editingItem && 'conveyor_machine_id' in editingItem && editingItem.conveyor_machine_id ? (editingItem as Line).conveyor_machine_id : ''}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-900 focus:ring-purple-500 focus:border-purple-500"
                                >
                                  <option value="">Select Conveyor</option>
                                  {(() => {
                                    const availableConveyorMachines = machinesMaster.filter(machine => 
                                      machine.machine_id.startsWith('CONY') && 
                                      (machine.machine_id === (editingItem as Line).conveyor_machine_id || 
                                       !linesMaster.some(line => 
                                         line.line_id !== (editingItem as Line).line_id && 
                                         line.conveyor_machine_id === machine.machine_id
                                       ))
                                    );
                                    
                                    if (availableConveyorMachines.length === 0) {
                                      return <option value="" disabled>No available conveyors</option>;
                                    }
                                    
                                    return availableConveyorMachines.map(machine => (
                                      <option key={machine.machine_id} value={machine.machine_id}>
                                        {machine.machine_id} - {machine.make} {machine.model}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Hoist
                                </label>
                                <select
                                  name="hoist_machine_id"
                                  defaultValue={editingItem && 'hoist_machine_id' in editingItem && editingItem.hoist_machine_id ? (editingItem as Line).hoist_machine_id : ''}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-900 focus:ring-purple-500 focus:border-purple-500"
                                >
                                  <option value="">Select Hoist</option>
                                  {(() => {
                                    const availableHoistMachines = machinesMaster.filter(machine => 
                                      machine.machine_id.startsWith('Hoist') && 
                                      (machine.machine_id === (editingItem as Line).hoist_machine_id || 
                                       !linesMaster.some(line => 
                                         line.line_id !== (editingItem as Line).line_id && 
                                         line.hoist_machine_id === machine.machine_id
                                       ))
                                    );
                                    
                                    if (availableHoistMachines.length === 0) {
                                      return <option value="" disabled>No available hoists</option>;
                                    }
                                    
                                    return availableHoistMachines.map(machine => (
                                      <option key={machine.machine_id} value={machine.machine_id}>
                                        {machine.machine_id} - {machine.make} {machine.model}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Loader <span className="text-gray-400 text-xs">(Optional)</span>
                                </label>
                                <select
                                  name="loader_machine_id"
                                  defaultValue={editingItem && 'loader_machine_id' in editingItem && editingItem.loader_machine_id ? (editingItem as Line).loader_machine_id : ''}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-900 focus:ring-purple-500 focus:border-purple-500"
                                >
                                  <option value="">Select Loader (Optional)</option>
                                  {(() => {
                                    const availableLoaderMachines = machinesMaster.filter(machine => 
                                      (machine.machine_id === (editingItem as Line).loader_machine_id || 
                                       !linesMaster.some(line => 
                                         line.line_id !== (editingItem as Line).line_id && 
                                         line.loader_machine_id === machine.machine_id
                                       ))
                                    );
                                    
                                    if (availableLoaderMachines.length === 0) {
                                      return <option value="" disabled>No available loaders</option>;
                                    }
                                    
                                    return availableLoaderMachines.map(machine => (
                                      <option key={machine.machine_id} value={machine.machine_id}>
                                        {machine.machine_id} - {machine.make} {machine.model}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Status and Unit */}
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <div className="w-1 h-5 bg-orange-600 rounded-full mr-3"></div>
                              Status & Unit
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Status
                                </label>
                                <select
                                  name="status"
                                  defaultValue={editingItem && 'status' in editingItem && editingItem.status ? (editingItem as Line).status : 'Active'}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-900 focus:ring-purple-500 focus:border-purple-500"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Inactive">Inactive</option>
                                  <option value="Maintenance">Maintenance</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Unit
                                </label>
                                <select
                                  name="unit"
                                  defaultValue={editingItem && 'unit' in editingItem && editingItem.unit ? (editingItem as Line).unit : defaultUnit}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-900 focus:ring-purple-500 focus:border-purple-500"
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

                          {/* Grinding Section */}
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <div className="w-1 h-5 bg-orange-600 rounded-full mr-3"></div>
                              Grinding
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Grinding Available
                                </label>
                                <select
                                  name="grinding"
                                  defaultValue={editingItem && 'grinding' in editingItem && editingItem.grinding ? 'true' : 'false'}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-900 focus:ring-purple-500 focus:border-purple-500"
                                >
                                  <option value="false">No</option>
                                  <option value="true">Yes</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                  Indicates if grinding operations can be performed on this line
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Form Actions */}
                          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button
                              type="button"
                              onClick={() => {
                                setShowModal(false);
                                setEditingItem(null);
                              }}
                              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                            >
                              Update Line
                            </button>
                          </div>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer - Only show for non-edit modals */}
            {modalType !== 'edit_line' && (
              <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Excel File Reader Modal */}
      {showExcelReader && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <ExcelFileReader
              defaultDataType={excelDataType}
              onDataImported={handleDataImported}
              onClose={() => setShowExcelReader(false)}
            />
          </div>
        </div>
      )}
      
      {/* Info Modal */}
      {showInfoModal && <InfoModal />}
      
      {/* Nameplate Viewing Modal */}
      <NameplateModal />
    </div>
  );
};

export default ProductionSchedulerERP;