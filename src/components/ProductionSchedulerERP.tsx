'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, Grid3X3, List, Plus, Filter, Search, Download, Upload, 
  Settings, Play, Pause, CheckCircle, AlertCircle, Wrench, Package, Home, 
  Users, BarChart3, FileText, Bell, Menu, X, Save, Edit, Trash2, Eye, 
  ArrowLeft, ArrowRight, Image, Camera, FileSpreadsheet, ArrowUpDown, 
  ArrowUp, ArrowDown, Info, HelpCircle, User, LogOut, Pencil
} from 'lucide-react';
import { useAuth } from './auth/AuthProvider';
import ExcelFileReader from './ExcelFileReader';
import { 
  machineAPI, 
  moldAPI, 
  scheduleAPI, 
  rawMaterialAPI, 
  Machine as SupabaseMachine, 
  Mold as SupabaseMold, 
  ScheduleJob as SupabaseScheduleJob 
} from '../lib/supabase';
import { authAPI, userProfileAPI } from '../lib/auth';

// Type definitions (using Supabase types)
type Machine = SupabaseMachine;
type Mold = SupabaseMold;
type ScheduleJob = SupabaseScheduleJob;

// Raw Material interface based on the sample data
interface RawMaterial {
  id?: string; // Optional since database auto-generates UUID
  sl_no: number;
  type1: string; // Short form like "PP"
  type2: string; // Full form like "HP", "ICP", "RCP" - treated as primary key
  grade: string;
  supplier: string;
  mfi: number;
  density: number;
  created_at?: string;
  updated_at?: string;
}

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

type ModuleType = 'scheduler' | 'masters' | 'approvals' | 'reports' | 'operators' | 'profile';
type ModalType = 'job' | 'machine' | 'mold' | 'view_machine' | 'view_mold' | 'view_schedule' | '';
type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material';
type DataType = 'machines' | 'molds' | 'raw_materials';

const ProductionSchedulerERP: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<ModuleType>(() => {
    // Try to get the current module from localStorage with user-specific key, default to 'scheduler'
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerCurrentModule_${userId}`);
      return (saved as ModuleType) || 'scheduler';
    }
    return 'scheduler';
  });
  
  const [currentView, setCurrentView] = useState<string>('daily');
  
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Try to get the selected date from localStorage with user-specific key, default to today
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerSelectedDate_${userId}`);
      return saved || new Date().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [editingItem, setEditingItem] = useState<Machine | Mold | ScheduleJob | RawMaterial | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [viewingNameplate, setViewingNameplate] = useState<string | null>(null);
  const [showExcelReader, setShowExcelReader] = useState<boolean>(false);
  const [excelDataType, setExcelDataType] = useState<DataType>('machines');
  const [loading, setLoading] = useState<boolean>(true);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [infoModalType, setInfoModalType] = useState<string>('');
  
  // Sorting state with user-specific persistence
  const [sortField, setSortField] = useState<string>(() => {
    // Try to get the sort field from localStorage with user-specific key, default to 'machine_id'
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerSortField_${userId}`);
      return saved || 'machine_id';
    }
    return 'machine_id';
  });
  
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    // Try to get the sort direction from localStorage with user-specific key, default to 'asc'
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerSortDirection_${userId}`);
      return (saved as 'asc' | 'desc') || 'asc';
    }
    return 'asc';
  });
  
  // Separate sorting states for Machine Master and Mold Master tabs
  const [machineSortField, setMachineSortField] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerMachineSortField_${userId}`);
      return saved || 'machine_id';
    }
    return 'machine_id';
  });
  
  const [machineSortDirection, setMachineSortDirection] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerMachineSortDirection_${userId}`);
      return (saved as 'asc' | 'desc') || 'asc';
    }
    return 'asc';
  });

  const [machineCategoryFilter, setMachineCategoryFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerMachineCategoryFilter_${userId}`);
      return saved || 'all';
    }
    return 'all';
  });

  const [moldSortField, setMoldSortField] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerMoldSortField_${userId}`);
      return saved || 'mold_id';
    }
    return 'mold_id';
  });
  
  const [moldSortDirection, setMoldSortDirection] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerMoldSortDirection_${userId}`);
      return (saved as 'asc' | 'desc') || 'asc';
    }
    return 'asc';
  });

  // Raw Materials sorting state with user-specific persistence
  const [rawMaterialSortField, setRawMaterialSortField] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerRawMaterialSortField_${userId}`);
      return saved || 'sl_no';
    }
    return 'sl_no';
  });
  
  const [rawMaterialSortDirection, setRawMaterialSortDirection] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const saved = localStorage.getItem(`prodSchedulerRawMaterialSortDirection_${userId}`);
      return (saved as 'asc' | 'desc') || 'asc';
    }
    return 'asc';
  });
  
  // Data from Supabase
  const [machinesMaster, setMachinesMaster] = useState<Machine[]>([]);
  const [moldsMaster, setMoldsMaster] = useState<Mold[]>([]);
  const [rawMaterialsMaster, setRawMaterialsMaster] = useState<RawMaterial[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleJob[]>([]);

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
        
        // Check session first before attempting data load
        const { session } = await authAPI.getSession();
        if (!session) {
          console.log('No valid session, skipping data load');
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
        
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
      
      // Check if we have a valid session before loading data
      const { session } = await authAPI.getSession();
      if (!session) {
        console.log('No valid session, skipping data load');
        setLoading(false);
        return;
      }
      
      const [machines, molds, schedules, rawMaterials] = await Promise.all([
        machineAPI.getAll(),
        moldAPI.getAll(),
        scheduleAPI.getAll(),
        rawMaterialAPI.getAll()
      ]);
      
      console.log('Data loaded successfully:', { 
        machines: machines.length, 
        molds: molds.length, 
        schedules: schedules.length,
        raw_materials: rawMaterials.length
      });
      
      setMachinesMaster(machines);
      setMoldsMaster(molds);
      setScheduleData(schedules);
      setRawMaterialsMaster(rawMaterials);
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
            { column: 'St. Wt.', description: 'Standard weight in grams (e.g., 100g, 150g). Weight of the finished product from this mold.' },
            { column: 'HRC Zone', description: 'Hot Runner Control Zone (e.g., Zone A, Zone B). Zone designation for hot runner temperature control.' },
            { column: 'Make', description: 'Mold manufacturer (e.g., Wittmaan, Switek). Company that manufactured the mold.' },
            { column: 'Status', description: 'Mold operational status. Active = In production, Maintenance = Under maintenance/repair, Idle = Available but not in use.' },
            { column: 'Actions', description: 'Available actions: View details, Edit mold information, Delete mold from system.' }
          ];
        case 'raw_materials':
          return [
            { column: 'Sl. No.', description: 'Serial number for raw material identification (e.g., 1, 2, 3). Sequential numbering for easy reference.' },
            { column: 'Type 1', description: 'Short form of material type (e.g., PP, PE, ABS). Abbreviated classification of the raw material.' },
            { column: 'Type 2', description: 'Full form of material type (e.g., HP, ICP, RCP). Complete classification and specification of the material.' },
            { column: 'Grade', description: 'Material grade specification (e.g., H350, M350, L350). Quality and performance classification of the material.' },
            { column: 'Supplier', description: 'Material supplier name (e.g., Reliance, Haldia, Indian Oil). Company that supplies the raw material.' },
            { column: 'MFI', description: 'Melt Flow Index (e.g., 2.5, 3.0, 4.0). Measure of material flow characteristics during processing.' },
            { column: 'Density', description: 'Material density in g/cm³ (e.g., 0.91, 0.92, 0.93). Physical property indicating material weight per unit volume.' },
            { column: 'Status', description: 'Material availability status. Active = Available for use, Inactive = Temporarily unavailable, Discontinued = No longer available.' },
            { column: 'Actions', description: 'Available actions: View details, Edit material information, Delete material from system.' }
          ];
        default:
          return [];
      }
    };

    const getModalTitle = () => {
      switch (infoModalType) {
        case 'machines': return 'Machine Master Columns';
        case 'molds': return 'Mold Master Columns';
        case 'raw_materials': return 'Raw Materials Master Columns';
        default: return 'Table Columns';
      }
    };

    const getModalDescription = () => {
      switch (infoModalType) {
        case 'machines': return 'Understanding the machine master table columns and their meanings.';
        case 'molds': return 'Understanding the mold master table columns and their meanings.';
        case 'raw_materials': return 'Understanding the raw materials master table columns and their meanings.';
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
      } else if (field === 'mold_id' || field === 'item_code') {
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

  // Get sorted machines
  const sortedMachines = useMemo(() => {
    // First filter by category if not 'all'
    let filteredMachines = machinesMaster;
    if (machineCategoryFilter !== 'all') {
      filteredMachines = machinesMaster.filter(machine => machine.category === machineCategoryFilter);
    }
    
    // Then sort the filtered machines
    return sortMachines(filteredMachines, machineSortField, machineSortDirection);
  }, [machinesMaster, machineSortField, machineSortDirection, machineCategoryFilter]);
  
  // Get sorted molds
  const sortedMolds = useMemo(() => {
    return sortMolds(moldsMaster, moldSortField, moldSortDirection);
  }, [moldsMaster, moldSortField, moldSortDirection]);
  console.log('Sorted molds result:', sortedMolds.map(m => ({ id: m.mold_id, item_code: m.item_code })));

  const sortedRawMaterials = useMemo(() => {
    return sortRawMaterials(rawMaterialsMaster, rawMaterialSortField, rawMaterialSortDirection);
  }, [rawMaterialsMaster, rawMaterialSortField, rawMaterialSortDirection]);

  // Handle sort change with persistence
  const handleSortChange = (field: string) => {
    let newDirection: 'asc' | 'desc' = 'asc';
    
    if (field === sortField) {
      // Toggle direction if same field
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to ascending
      newDirection = 'asc';
    }
    
    // Update state
    setSortField(field);
    setSortDirection(newDirection);
    
    // Save to localStorage with user-specific key
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`prodSchedulerSortField_${userId}`, field);
      localStorage.setItem(`prodSchedulerSortDirection_${userId}`, newDirection);
    }
  };

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

  const menuItems: MenuItem[] = [
    { id: 'scheduler', label: 'Production Scheduler', icon: Calendar, description: 'Plan and schedule production jobs' },
    { id: 'masters', label: 'Master Data', icon: Settings, description: 'Manage machines and molds' },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle, description: 'Review completed jobs' },
    { id: 'reports', label: 'Reports', icon: BarChart3, description: 'Analytics and insights' },
    { id: 'operators', label: 'Operator Panel', icon: Users, description: 'Mark jobs as done' }
  ];

  const handleAction = async (actionType: ActionType, item: Machine | Mold | ScheduleJob | RawMaterial, itemType: ItemType): Promise<void> => {
    try {
    switch (actionType) {
      case 'edit':
        console.log('Editing item:', item);
        console.log('Item type:', itemType);
        setEditingItem(item);
        setModalType(itemType as ModalType);
        setShowModal(true);
        break;
      case 'delete':
        let itemId: string | undefined;
        if ('machine_id' in item) {
          itemId = item.machine_id;
        } else if ('mold_id' in item) {
          itemId = item.mold_id;
        } else if ('schedule_id' in item && typeof (item as any).schedule_id === 'string') {
          itemId = (item as { schedule_id: string }).schedule_id;
        }
        if (window.confirm(`Are you sure you want to delete ${itemId}?`)) {
            if (itemType === 'machine' && 'machine_id' in item) {
              await machineAPI.delete(item.machine_id);
              setMachinesMaster(prev => prev.filter(m => m.machine_id !== item.machine_id));
            } else if (itemType === 'mold' && 'mold_id' in item) {
              await moldAPI.delete(item.mold_id);
              setMoldsMaster(prev => prev.filter(m => m.mold_id !== item.mold_id));
            } else if (itemType === 'schedule' && 'schedule_id' in item) {
              await scheduleAPI.delete(item.schedule_id);
              setScheduleData(prev => prev.filter(s => s.schedule_id !== item.schedule_id));
            }
        }
        break;
      case 'view':
        setEditingItem(item);
        setModalType(`view_${itemType}` as ModalType);
        setShowModal(true);
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
    setCurrentModule('scheduler');
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
    const { user, profile, signOut } = useAuth();
    
    const handleModuleChange = (module: ModuleType) => {
      setCurrentModule(module);
      // Save to localStorage with user-specific key
      if (typeof window !== 'undefined') {
        const userId = localStorage.getItem('currentUserId') || 'default';
        localStorage.setItem(`prodSchedulerCurrentModule_${userId}`, module);
      }
    };
    
    const handleSignOut = async () => {
      try {
        await signOut();
        // The signOut function now handles the redirect
      } catch (error) {
        console.error('Error signing out:', error);
        // Fallback redirect
        window.location.href = '/auth/login';
      }
    };

    return (
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && <h2 className="text-xl font-bold">ProdFlow</h2>}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 pt-4">
          {menuItems.map(item => {
            const IconComponent = item.icon;
            return (
                          <button
              key={item.id}
              onClick={() => handleModuleChange(item.id as ModuleType)}
              className={`w-full text-left p-4 hover:bg-gray-700 transition-colors ${
                currentModule === item.id ? 'bg-gray-700 border-r-4 border-blue-500' : ''
              }`}
            >
                <div className="flex items-center">
                  <IconComponent className="w-6 h-6" />
                  {sidebarOpen && (
                    <div className="ml-3">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-gray-400">{item.description}</div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Current User Section - Bottom Left */}
        <div className="border-t border-gray-700 p-4">
          <button
            onClick={() => handleModuleChange('profile')}
            className={`w-full text-left p-3 hover:bg-gray-700 transition-colors rounded-lg ${
              sidebarOpen ? 'flex items-center' : 'flex justify-center'
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full">
              <User className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <div className="ml-3 flex-1">
                <div className="font-medium text-sm truncate">
                  {profile?.full_name || user?.email || 'Current User'}
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {profile?.role || 'User'}
                </div>
              </div>
            )}
          </button>
          
          {/* Sign Out Button */}
          {sidebarOpen && (
            <button
              onClick={handleSignOut}
              className="w-full mt-2 text-left p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors rounded text-sm"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    );
  };

  const ProductionScheduler: React.FC = () => {
    const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

    return (
      <div className="flex h-full">
        {/* Machine List */}
        <div className="w-48 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Machines</h3>
          </div>
          {machinesMaster.map(machine => (
            <div 
              key={machine.machine_id} 
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-100 ${getMachineStatusColor(machine.status)}`}
              onClick={() => handleAction('view', machine, 'machine')}
            >
              <div className="font-medium text-sm">{machine.machine_id}</div>
              <div className="text-xs text-gray-600">{machine.make} {machine.model}</div>
              <div className="flex items-center mt-1">
                {machine.status === 'Active' && <Play className="w-3 h-3 text-green-600 mr-1" />}
                {machine.status === 'Maintenance' && <AlertCircle className="w-3 h-3 text-red-600 mr-1" />}
                {machine.status === 'Idle' && <Pause className="w-3 h-3 text-yellow-600 mr-1" />}
                <span className="text-xs capitalize">{machine.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-auto">
          {/* Time Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
            <div className="flex">
              {timeSlots.map(time => (
                <div key={time} className="flex-1 p-2 text-center text-xs font-medium border-r border-gray-100">
                  {time}
                </div>
              ))}
            </div>
          </div>

          {/* Machine Rows */}
          <div className="relative">
            {machinesMaster.map(machine => (
              <div key={machine.machine_id} className="relative h-16 border-b border-gray-100">
                {/* Time Grid */}
                <div className="absolute inset-0 flex">
                  {timeSlots.map(time => (
                    <div key={time} className="flex-1 border-r border-gray-50 hover:bg-blue-50" />
                  ))}
                </div>

                {/* Job Cards */}
                {getJobsByMachine(machine.machine_id).map(job => {
                  const position = getJobPosition(job.start_time, job.end_time);
                  return (
                    <div
                      key={job.schedule_id}
                      className={`absolute top-1 bottom-1 ${getStatusColor(job)} rounded px-2 py-1 text-white text-xs cursor-pointer hover:shadow-lg transition-shadow z-20`}
                      style={position}
                      onClick={() => handleAction('view', job, 'schedule')}
                    >
                      <div className="font-medium">{job.mold_id}</div>
                      <div className="truncate">{job.color}</div>
                      <div>{job.expected_pieces} pcs</div>
                      {job.is_done && <CheckCircle className="w-3 h-3 inline ml-1" />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
                  target.parentElement!.innerHTML = '<div class="text-gray-500 p-8 border border-gray-200 rounded-lg">Failed to load nameplate image</div>';
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

  const MasterDataModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>(() => {
      // Try to get the active tab from localStorage, default to 'molds'
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('masterDataActiveTab');
        return saved || 'molds';
      }
      return 'molds';
    });

    // Save active tab to localStorage whenever it changes
    const handleTabChange = (tab: string) => {
      setActiveTab(tab);
      if (typeof window !== 'undefined') {
        localStorage.setItem('masterDataActiveTab', tab);
      }
    };

    return (
      <div className="h-full flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            <button
              onClick={() => handleTabChange('machines')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'machines'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Wrench className="w-5 h-5 inline mr-2" />
              Machine Master
            </button>
            <button
              onClick={() => handleTabChange('molds')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'molds'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Mold Master
            </button>
            <button
              onClick={() => handleTabChange('raw_materials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'raw_materials'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Raw Materials Master
            </button>
            {/* Add more tabs here as needed */}
            {/* <button
              onClick={() => handleTabChange('')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'materials'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Material Master
            </button>
            <button
              onClick={() => handleTabChange('')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Product Master
            </button> */}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'machines' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold text-gray-800">Machine Master</h2>
                  <InfoButton type="machines" />
                </div>
                <div className="flex space-x-3">
                  {/* Categories Tab */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => handleMachineCategoryFilterChange('all')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        machineCategoryFilter === 'all'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => handleMachineCategoryFilterChange('IM')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        machineCategoryFilter === 'IM'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      IM
                    </button>
                    <button
                      onClick={() => handleMachineCategoryFilterChange('Robot')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        machineCategoryFilter === 'Robot'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Robot
                    </button>
                    <button
                      onClick={() => handleMachineCategoryFilterChange('Aux')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        machineCategoryFilter === 'Aux'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Aux
                    </button>
                    <button
                      onClick={() => handleMachineCategoryFilterChange('Utility')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        machineCategoryFilter === 'Utility'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Utility
                    </button>
                  </div>
                  
                  {/* Sorting Dropdown */}
                  <div className="relative">
                    <select
                      value={`${machineSortField}-${machineSortDirection}`}
                      onChange={(e) => {
                        const [field, direction] = e.target.value.split('-');
                        setMachineSortField(field);
                        setMachineSortDirection(direction as 'asc' | 'desc');
                      }}
                      className="flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                       <option value="machine_id-asc">Sort by ID (A-Z)</option>
                       <option value="machine_id-desc">Sort by ID (Z-A)</option>
                       <option value="category-asc">Sort by Category (A-Z)</option>
                       <option value="category-desc">Sort by Category (Z-A)</option>
                       <option value="make-asc">Sort by Make (A-Z)</option>
                       <option value="make-desc">Sort by Make (Z-A)</option>
                       <option value="size-asc">Sort by Size (Low-High)</option>
                       <option value="size-desc">Sort by Size (High-Low)</option>
                       <option value="model-asc">Sort by Model (A-Z)</option>
                       <option value="model-desc">Sort by Model (Z-A)</option>
                       <option value="capacity_tons-asc">Sort by Tons (Low-High)</option>
                       <option value="capacity_tons-desc">Sort by Tons (High-Low)</option>
                       <option value="status-asc">Sort by Status (A-Z)</option>
                       <option value="status-desc">Sort by Status (Z-A)</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => openExcelReader('machines')}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </button>
                  
                  <button 
                    onClick={() => handleAction('edit', {} as Machine, 'machine')}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Add Machine
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMachineSortChange('machine_id')}
                      >
                        <div className="flex items-center justify-center">
                          Sr. No.
                          {machineSortField === 'machine_id' && (
                            machineSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMachineSortChange('category')}
                      >
                        <div className="flex items-center justify-center">
                          Category
                          {machineSortField === 'category' && (
                            machineSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMachineSortChange('make')}
                      >
                        <div className="flex items-center justify-center">
                          Make
                          {machineSortField === 'make' && (
                            machineSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMachineSortChange('size')}
                      >
                        <div className="flex items-center justify-center">
                          Size
                          {machineSortField === 'size' && (
                            machineSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMachineSortChange('model')}
                      >
                        <div className="flex items-center justify-center">
                          Model
                          {machineSortField === 'model' && (
                            machineSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Serial No.</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mfg Date</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Inst Date</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Dimensions</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Name Plate</th>
                      <th 
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMachineSortChange('status')}
                      >
                        <div className="flex items-center justify-center">
                          Status
                          {machineSortField === 'status' && (
                            machineSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedMachines.map((machine) => (
                      <tr key={machine.machine_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-center">{machine.machine_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.category || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900 font-medium">{machine.make || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.size || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">{machine.model || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {machine.serial_no || (machine.clm_sr_no && machine.inj_serial_no ? `${machine.clm_sr_no}/${machine.inj_serial_no}` : '-')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.mfg_date || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.install_date || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.dimensions || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {machine.nameplate_image || machine.nameplate_details ? (
                            <button
                              onClick={() => setViewingNameplate(JSON.stringify({
                                image: machine.nameplate_image || '',
                                details: machine.nameplate_details || '',
                                machine_id: machine.machine_id,
                                make: machine.make,
                                model: machine.model
                              }))}
                              className="flex items-center justify-center text-blue-600 hover:text-blue-900"
                              title="View Nameplate Details"
                            >
                              <Image className="w-4 h-4 mr-1" />
                              <span className="text-xs">View Details</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">No details</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            machine.status === 'Active' ? 'bg-green-100 text-green-800' :
                            machine.status === 'Maintenance' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {machine.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                          <div className="flex space-x-2 justify-center">
                            <button 
                              onClick={() => handleAction('view', machine, 'machine')}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleAction('edit', machine, 'machine')}
                              className="text-green-600 hover:text-green-900"
                              title="Edit Machine"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleAction('delete', machine, 'machine')}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Machine"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'molds' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold text-gray-800">Mold Master</h2>
                  <InfoButton type="molds" />
                </div>
                <div className="flex space-x-3">
                  {/* Sorting Dropdown */}
                  <div className="relative">
                    <select
                      value={`${moldSortField}-${moldSortDirection}`}
                      onChange={(e) => {
                        const [field, direction] = e.target.value.split('-');
                        setMoldSortField(field);
                        setMoldSortDirection(direction as 'asc' | 'desc');
                      }}
                      className="flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                       <option value="mold_id-asc">Sort by ID (A-Z)</option>
                       <option value="mold_id-desc">Sort by ID (Z-A)</option>
                       <option value="mold_id-asc">Sort by Item Code (A-Z)</option>
                       <option value="mold_id-desc">Sort by Item Code (Z-A)</option>
                       <option value="item_name-asc">Sort by Item Name (A-Z)</option>
                       <option value="item_name-desc">Sort by Item Name (Z-A)</option>
                       <option value="cavities-asc">Sort by Cavities (Low-High)</option>
                       <option value="cavities-desc">Sort by Cavities (High-Low)</option>
                       <option value="cycle_time-asc">Sort by Cycle Time (Low-High)</option>
                       <option value="cycle_time-desc">Sort by Cycle Time (High-Low)</option>
                       <option value="st_wt-asc">Sort by Weight (Low-High)</option>
                       <option value="st_wt-desc">Sort by Weight (High-Low)</option>
                       <option value="hrc_zone-asc">Sort by Zone (A-Z)</option>
                       <option value="hrc_zone-desc">Sort by Zone (Z-A)</option>
                       <option value="make-asc">Sort by Make (A-Z)</option>
                       <option value="make-desc">Sort by Make (Z-A)</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => openExcelReader('molds')}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </button>
                  
                  <button 
                    onClick={() => handleAction('edit', {} as Mold, 'mold')}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Mold
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMoldSortChange('mold_id')}
                      >
                        <div className="flex items-center">
                          Item Code
                          {moldSortField === 'mold_id' && (
                            moldSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMoldSortChange('item_name')}
                      >
                        <div className="flex items-center">
                          Item Name
                          {moldSortField === 'item_name' && (
                            moldSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMoldSortChange('type')}
                      >
                        <div className="flex items-center">
                          Type
                          {moldSortField === 'type' && (
                            moldSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMoldSortChange('cavities')}
                      >
                        <div className="flex items-center">
                          Cavity
                          {moldSortField === 'cavities' && (
                            moldSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMoldSortChange('cycle_time')}
                      >
                        <div className="flex items-center">
                          Cycle Time
                          {moldSortField === 'cycle_time' && (
                            moldSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMoldSortChange('st_wt')}
                      >
                        <div className="flex items-center">
                          St. Wt.
                          {moldSortField === 'st_wt' && (
                            moldSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMoldSortChange('hrc_zone')}
                      >
                        <div className="flex items-center">
                          HRC Zone
                          {moldSortField === 'hrc_zone' && (
                            moldSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleMoldSortChange('make')}
                      >
                        <div className="flex items-center">
                          Make
                          {moldSortField === 'make' && (
                            moldSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedMolds.map((mold) => (
                      <tr key={mold.mold_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{mold.item_code || mold.mold_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{mold.item_name || mold.mold_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.type || 'Injection Mold'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.cavities}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.cycle_time ? `${mold.cycle_time}s` : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.st_wt ? `${mold.st_wt}g` : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.hrc_zone || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.make || mold.maker || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleAction('view', mold, 'mold')}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleAction('edit', mold, 'mold')}
                              className="text-green-600 hover:text-green-900"
                              title="Edit Mold"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleAction('delete', mold, 'mold')}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Mold"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'raw_materials' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold text-gray-800">Raw Materials Master</h2>
                  <InfoButton type="raw_materials" />
                </div>
                <div className="flex space-x-3">
                  {/* Sorting Dropdown */}
                  <div className="relative">
                    <select
                      value={`${rawMaterialSortField}-${rawMaterialSortDirection}`}
                      onChange={(e) => {
                        const [field, direction] = e.target.value.split('-');
                        setRawMaterialSortField(field);
                        setRawMaterialSortDirection(direction as 'asc' | 'desc');
                      }}
                      className="flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                       <option value="sl_no-asc">Sort by SL No (A-Z)</option>
                       <option value="sl_no-desc">Sort by SL No (Z-A)</option>
                       <option value="type1-asc">Sort by Type 1 (A-Z)</option>
                       <option value="type1-desc">Sort by Type 1 (Z-A)</option>
                       <option value="type2-asc">Sort by Type 2 (A-Z)</option>
                       <option value="type2-desc">Sort by Type 2 (Z-A)</option>
                       <option value="grade-asc">Sort by Grade (A-Z)</option>
                       <option value="grade-desc">Sort by Grade (Z-A)</option>
                       <option value="supplier-asc">Sort by Supplier (A-Z)</option>
                       <option value="supplier-desc">Sort by Supplier (Z-A)</option>
                       <option value="mfi-asc">Sort by MFI (Low-High)</option>
                       <option value="mfi-desc">Sort by MFI (High-Low)</option>
                       <option value="density-asc">Sort by Density (Low-High)</option>
                       <option value="density-desc">Sort by Density (High-Low)</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => openExcelReader('raw_materials')}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </button>
                  
                  <button 
                    onClick={() => handleAction('edit', {} as RawMaterial, 'raw_material')}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Raw Material
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleRawMaterialSortChange('sl_no')}
                      >
                        <div className="flex items-center">
                          Sl.
                          {rawMaterialSortField === 'sl_no' && (
                            rawMaterialSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleRawMaterialSortChange('type1')}
                      >
                        <div className="flex items-center">
                          Type 1
                          {rawMaterialSortField === 'type1' && (
                            rawMaterialSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleRawMaterialSortChange('type2')}
                      >
                        <div className="flex items-center">
                          Type 2
                          {rawMaterialSortField === 'type2' && (
                            rawMaterialSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleRawMaterialSortChange('grade')}
                      >
                        <div className="flex items-center">
                          Grade
                          {rawMaterialSortField === 'grade' && (
                            rawMaterialSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleRawMaterialSortChange('supplier')}
                      >
                        <div className="flex items-center">
                          Supplier
                          {rawMaterialSortField === 'supplier' && (
                            rawMaterialSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleRawMaterialSortChange('mfi')}
                      >
                        <div className="flex items-center">
                          MFI
                          {rawMaterialSortField === 'mfi' && (
                            rawMaterialSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleRawMaterialSortChange('density')}
                      >
                        <div className="flex items-center">
                          Density
                          {rawMaterialSortField === 'density' && (
                            rawMaterialSortDirection === 'asc' ? 
                            <ArrowUp className="w-3 h-3 ml-1" /> : 
                            <ArrowDown className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedRawMaterials.map((material) => (
                      <tr key={material.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {material.sl_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.type1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.type2}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.grade}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.supplier}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.mfi}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.density}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAction('view', material, 'raw_material')}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction('edit', material, 'raw_material')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction('delete', material, 'raw_material')}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedRawMaterials.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Raw Materials</h3>
                    <p className="text-gray-600">Add your first raw material to get started</p>
                </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Product Master</h2>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => alert('Excel import for products is coming soon!')}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </button>
                  <button 
                    onClick={() => handleAction('edit', {} as any, 'product')}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Product Master</h3>
                  <p className="text-gray-600">Manage finished products</p>
                  <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ApprovalsModule: React.FC = () => {
    const pendingJobs = scheduleData.filter(job => job.is_done && job.approval_status === 'pending');
    const approvedJobs = scheduleData.filter(job => job.approval_status === 'approved');

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Job Approvals</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Pending Approvals ({pendingJobs.length})</h3>
            </div>
            <div className="p-6 space-y-4">
              {pendingJobs.map(job => (
                <div key={job.schedule_id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{job.machine_id} - {job.mold_id}</div>
                      <div className="text-sm text-gray-600">Date: {job.date} | {job.shift} Shift</div>
                      <div className="text-sm text-gray-600">Color: {job.color} | Expected: {job.expected_pieces} pcs</div>
                      <div className="text-xs text-gray-500 mt-1">Completed: {job.done_timestamp}</div>
                    </div>
                    <button
                      onClick={() => handleAction('approve', job, 'schedule')}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
              {pendingJobs.length === 0 && (
                <div className="text-gray-500 text-center py-8">No pending approvals</div>
              )}
            </div>
          </div>

          {/* Recent Approvals */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Recent Approvals ({approvedJobs.length})</h3>
            </div>
            <div className="p-6 space-y-4">
              {approvedJobs.slice(0, 5).map(job => (
                <div key={job.schedule_id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="font-medium text-gray-900">{job.machine_id} - {job.mold_id}</div>
                  <div className="text-sm text-gray-600">Date: {job.date} | {job.shift} Shift</div>
                  <div className="text-sm text-gray-600">Approved by: {job.approved_by}</div>
                  <div className="flex items-center mt-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-600">Approved</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const OperatorPanel: React.FC = () => {
    const todayJobs = scheduleData.filter(job => job.date === selectedDate && !job.is_done);

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Operator Panel - Today&apos;s Jobs</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todayJobs.map(job => {
            const machine = machinesMaster.find(m => m.machine_id === job.machine_id);
            const mold = moldsMaster.find(m => m.mold_id === job.mold_id);
            
            return (
              <div key={job.schedule_id} className="bg-white rounded-lg shadow border-l-4 border-blue-500 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{job.machine_id}</h3>
                    <p className="text-sm text-gray-600">{machine?.make} {machine?.model}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {job.shift}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Mold:</span>
                    <span className="text-sm font-medium">{job.mold_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Color:</span>
                    <span className="text-sm font-medium">{job.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Time:</span>
                    <span className="text-sm font-medium">{job.start_time} - {job.end_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Target:</span>
                    <span className="text-sm font-medium">{job.expected_pieces} pieces</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleAction('mark_done', job, 'schedule')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Done
                </button>
              </div>
            );
          })}
        </div>
        
        {todayJobs.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All jobs completed!</h3>
            <p className="text-gray-600">No pending jobs for today.</p>
          </div>
        )}
      </div>
    );
  };

  const UserProfileModule: React.FC = () => {
    const { user, profile, signOut } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
      full_name: profile?.full_name || '',
      email: user?.email || '',
      department: profile?.department || '',
      role: profile?.role || 'user'
    });

    const handleSave = async () => {
      // Here you would typically update the user profile in Supabase
      // For now, we'll just close the edit mode
      setIsEditing(false);
      // TODO: Implement profile update functionality
    };

    const handleSignOut = async () => {
      try {
        await signOut();
        // The signOut function now handles the redirect
      } catch (error) {
        console.error('Error signing out:', error);
        // Fallback redirect
        window.location.href = '/auth/login';
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
            <div className="flex space-x-3">
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
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-12 h-12 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {profile?.full_name || user?.email || 'Current User'}
                    </h2>
                    <p className="text-sm text-gray-500 capitalize">
                      {profile?.role || 'User'}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Email</span>
                      <span className="text-sm text-gray-800">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Department</span>
                      <span className="text-sm text-gray-800">{profile?.department || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Member Since</span>
                      <span className="text-sm text-gray-800">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-600">Last Updated</span>
                      <span className="text-sm text-gray-800">
                        {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    
                    {/* Temporary Admin Role Update Button */}
                    {user?.email === 'yogesh@polypacks.in' && profile?.role !== 'admin' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={async () => {
                            try {
                              if (!user?.email) {
                                alert('User email not found');
                                return;
                              }
                              
                              console.log('Attempting to update role to admin for:', user.email);
                              
                              // Try the direct SQL method first
                              const { error: directError } = await userProfileAPI.updateUserRoleDirect(user.email, 'admin');
                              
                              if (directError) {
                                console.log('Direct method failed, trying regular method:', directError);
                                
                                // Fallback to regular method
                                const { error: regularError } = await userProfileAPI.updateUserRole(user.id, 'admin');
                                
                                if (regularError) {
                                  console.error('Both methods failed:', regularError);
                                  alert('Failed to update role: ' + regularError.message);
                                  return;
                                }
                              }
                              
                              console.log('Role updated to admin successfully');
                              alert('Role updated to admin! Please refresh the page.');
                              
                              // Force refresh the profile
                              window.location.reload();
                              
                            } catch (err) {
                              console.error('Exception updating role:', err);
                              alert('Failed to update role: ' + (err instanceof Error ? err.message : 'Unknown error'));
                            }
                          }}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          🔧 Make Admin (Temporary)
                        </button>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          Click to update role to admin
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {isEditing ? 'Edit Profile Information' : 'Profile Information'}
                  </h3>
                  
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
                          {profile?.full_name || 'Not specified'}
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
                          {profile?.department || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 capitalize">
                          {profile?.role || 'User'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Actions */}
                <div className="bg-white rounded-lg shadow p-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NewJobModal: React.FC = () => {
    const compatibleMolds = jobForm.machine_id 
      ? moldsMaster.filter(mold => mold.compatible_machines.includes(jobForm.machine_id)) 
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
                {machinesMaster.filter(m => m.status === 'Active').map(machine => (
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
    switch (currentModule) {
      case 'scheduler':
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
            <ProductionScheduler />
          </div>
        );
      case 'masters':
        return <MasterDataModule />;
      case 'approvals':
        return <ApprovalsModule />;
      case 'operators':
        return <OperatorPanel />;
      case 'profile':
        return <UserProfileModule />;
      default:
        return <ProductionScheduler />;
    }
  };

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
              const machineData = {
                machine_id: formData.get('machine_id') as string,
                category: formData.get('category') as string || 'IM',
                make: formData.get('make') as string,
                model: formData.get('model') as string,
                size: parseInt(formData.get('size') as string) || 0,
                status: (formData.get('status') as string) as 'Active' | 'Maintenance' | 'Idle',
                capacity_tons: parseInt(formData.get('size') as string) || 0,
                type: 'Injection Molding Machine',
                zone: formData.get('zone') as string || 'Line A',
                purchase_date: (formData.get('mfg_date') as string) || '',
                install_date: formData.get('install_date') as string || new Date().toISOString().split('T')[0],
                grinding_available: formData.get('grinding_available') === 'true',
                remarks: formData.get('remarks') as string || '',
                nameplate_image: undefined,
                nameplate_details: undefined,
                clm_sr_no: formData.get('clm_sr_no') as string || '',
                inj_serial_no: formData.get('inj_serial_no') as string || '',
                mfg_date: formData.get('mfg_date') as string || undefined,
                dimensions: formData.get('dimensions') as string || '',
                serial_no: formData.get('serial_no') as string || ''
              };
              
              try {
                if (editingItem && 'machine_id' in editingItem && editingItem.machine_id) {
                  // Update existing machine
                  await machineAPI.update(editingItem.machine_id, machineData);
                  setMachinesMaster(prev => prev.map(m => 
                    m.machine_id === editingItem.machine_id ? { ...m, ...machineData } : m
                  ));
                } else {
                  // Create new machine
                  const newMachine = await machineAPI.create({
                    ...machineData,
                    category: 'General', // or set to a default or appropriate value
                  });
                  if (newMachine) {
                    setMachinesMaster(prev => [...prev, newMachine]);
                  }
                }
                setShowModal(false);
                setEditingItem(null);
              } catch (error) {
                console.error('Error saving machine:', error);
                alert('Error saving machine. Please try again.');
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
                        defaultValue={editingItem && 'machine_id' in editingItem ? editingItem.machine_id : ''}
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
                        name="zone" 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'zone' in editingItem ? editingItem.zone : 'Line A'}
                      >
                        <option value="Line A">Line A</option>
                        <option value="Line B">Line B</option>
                        <option value="Line C">Line C</option>
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
              const moldData = {
                mold_id: formData.get('mold_id') as string,
                mold_name: formData.get('mold_name') as string,
                cavities: parseInt(formData.get('cavities') as string) || 0,
                compatible_machines: [],
                purchase_date: new Date().toISOString().split('T')[0],
                maker: 'Unknown',
                // New fields
                item_code: formData.get('item_code') as string,
                item_name: formData.get('item_name') as string,
                type: formData.get('type') as string,
                cycle_time: parseFloat(formData.get('cycle_time') as string) || 0,
                st_wt: parseFloat(formData.get('st_wt') as string) || 0,
                hrc_zone: formData.get('hrc_zone') as string,
                make: formData.get('make') as string
              };
              
              try {
                if (editingItem && 'mold_id' in editingItem && editingItem.mold_id) {
                  // Update existing mold
                  await moldAPI.update(editingItem.mold_id, moldData);
                  setMoldsMaster(prev => prev.map(m => 
                    m.mold_id === editingItem.mold_id ? { ...m, ...moldData } : m
                  ));
                } else {
                  // Create new mold
                  const newMold = await moldAPI.create(moldData);
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-500"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'item_name' in editingItem && editingItem.item_name ? editingItem.item_name : (editingItem && 'mold_name' in editingItem ? editingItem.mold_name : '')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        name="type"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'type' in editingItem ? editingItem.type : 'Injection Mold'}
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'make' in editingItem && editingItem.make ? editingItem.make : (editingItem && 'maker' in editingItem ? editingItem.maker : '')}
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'cavities' in editingItem ? editingItem.cavities : ''}
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'cycle_time' in editingItem ? editingItem.cycle_time : ''}
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'st_wt' in editingItem ? editingItem.st_wt : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        HRC Zone
                      </label>
                      <select
                        name="hrc_zone"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-500"
                        defaultValue={editingItem && 'hrc_zone' in editingItem ? editingItem.hrc_zone : '07 ZONE'}
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
      {showModal && (modalType === 'view_machine' || modalType === 'view_mold') && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${modalType === 'view_machine' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                  {modalType === 'view_machine' ? (
                    <Wrench className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Package className="w-6 h-6 text-purple-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modalType === 'view_machine' ? 'Machine Details' : 'Mold Details'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {modalType === 'view_machine' ? 'View machine information' : 'View mold information'}
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
                            <div className="text-sm font-medium text-gray-600 mb-1">Zone</div>
                            <div className="text-lg font-semibold text-gray-900">{(editingItem as Machine).zone || 'Not specified'}</div>
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
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Excel File Reader Modal */}
      {showExcelReader && (
        <ExcelFileReader
          defaultDataType={excelDataType}
          onDataImported={handleDataImported}
          onClose={() => setShowExcelReader(false)}
        />
      )}
      
      {/* Info Modal */}
      {showInfoModal && <InfoModal />}
      
      {/* Nameplate Viewing Modal */}
      <NameplateModal />
    </div>
  );
};

export default ProductionSchedulerERP;