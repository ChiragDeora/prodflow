'use client';

import React, { useState, useMemo } from 'react';
import { Wrench, Package, Link, Building, MoreHorizontal, Settings } from 'lucide-react';
import Image from 'next/image';
import MachineMaster from './MachineMaster';
import MoldMaster from './MoldMaster';
import RawMaterialsMaster from './RawMaterialsMaster';
import PackingMaterialsMaster from './PackingMaterialsMaster';
import LineMaster from './LineMaster';
import BOMMaster from '../bom-master';
import CommercialMaster from '../commercial-master';
import OthersMaster from './OthersMaster';
import SparePartsMaster from './SparePartsMaster';
import { useAccessControl } from '@/lib/useAccessControl';

import { 
  Machine as SupabaseMachine, 
  Mold as SupabaseMold,
  RawMaterial as SupabaseRawMaterial,
  PackingMaterial as SupabasePackingMaterial,
  Line as SupabaseLine,
  Unit
} from '../../../lib/supabase';


type Machine = SupabaseMachine;
type Mold = SupabaseMold;
type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material' | 'packing_material' | 'color_label' | 'party_name';

// Use Supabase types
type RawMaterial = SupabaseRawMaterial;
type PackingMaterial = SupabasePackingMaterial;
type Line = SupabaseLine;

interface MasterDataModuleProps {
  machinesMaster: Machine[];
  moldsMaster: Mold[];
  rawMaterials: RawMaterial[];
  packingMaterials: PackingMaterial[];
  linesMaster: Line[];
  
  // Machine state and handlers
  machineCategoryFilter: string;
  handleMachineCategoryFilterChange: (category: string) => void;
  machineSortField: string;
  machineSortDirection: 'asc' | 'desc';
  setMachineSortField: (field: string) => void;
  setMachineSortDirection: (direction: 'asc' | 'desc') => void;
  handleMachineSortChange: (field: string) => void;
  sortedMachines: Machine[];
  
  // Mold state and handlers
  moldSortField: string;
  moldSortDirection: 'asc' | 'desc';
  setMoldSortField: (field: string) => void;
  setMoldSortDirection: (direction: 'asc' | 'desc') => void;
  handleMoldSortChange: (field: string) => void;
  sortedMolds: Mold[];
  
  // Raw Materials state and handlers
  rawMaterialSortField: string;
  rawMaterialSortDirection: 'asc' | 'desc';
  setRawMaterialSortField: (field: string) => void;
  setRawMaterialSortDirection: (direction: 'asc' | 'desc') => void;
  handleRawMaterialSortChange: (field: string) => void;
  sortedRawMaterials: RawMaterial[];
  

  
  // Packing Materials state and handlers
  packingMaterialCategoryFilter: string;
  handlePackingMaterialCategoryFilterChange: (category: string) => void;
  packingMaterialSortField: string;
  packingMaterialSortDirection: 'asc' | 'desc';
  setPackingMaterialSortField: (field: string) => void;
  setPackingMaterialSortDirection: (direction: 'asc' | 'desc') => void;
  handlePackingMaterialSortChange: (field: string) => void;
  sortedPackingMaterials: PackingMaterial[];
  
  // Line state and handlers
  lineSortField: string;
  lineSortDirection: 'asc' | 'desc';
  setLineSortField: (field: string) => void;
  setLineSortDirection: (direction: 'asc' | 'desc') => void;
  handleLineSortChange: (field: string) => void;
  sortedLines: Line[];
  
  // Unit management settings
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: Unit[];
  
  // Common handlers
  openExcelReader: (type: string) => void;
  handleAction: (actionType: ActionType, item: any, itemType: 'line' | ItemType) => Promise<void>;
  setViewingNameplate: (nameplate: string | null) => void;
  InfoButton: React.ComponentType<{ type: string }>;
  // Callback to collapse sidebar when sub nav is clicked
  onSubNavClick?: () => void;
}

// Tab configuration with permission mapping
const TAB_CONFIG = [
  { id: 'machines', label: 'Machine Master', resource: 'Machine Master', icon: 'wrench' },
  { id: 'lines', label: 'Line Master', resource: 'Line Master', icon: 'link' },
  { id: 'molds', label: 'Mold Master', resource: 'Mold Master', icon: 'mold' },
  { id: 'raw_materials', label: 'RM Master', resource: 'Raw Materials Master', icon: 'raw_materials' },
  { id: 'packing_materials', label: 'PM Master', resource: 'Packing Materials Master', icon: 'packing_materials' },
  { id: 'bom_master', label: 'BOM Master', resource: 'BOM Master', icon: 'package' },
  { id: 'commercial_master', label: 'Commercial Master', resource: 'Commercial Master', icon: 'building' },
  { id: 'spare_parts', label: 'Spare Parts', resource: 'Spare Parts', icon: 'settings' },
  { id: 'others', label: 'Others', resource: 'Others', icon: 'more' },
];

const MasterDataModule: React.FC<MasterDataModuleProps> = ({
  machinesMaster,
  moldsMaster,
  rawMaterials,
  packingMaterials,
  linesMaster,
  machineCategoryFilter,
  handleMachineCategoryFilterChange,
  machineSortField,
  machineSortDirection,
  setMachineSortField,
  setMachineSortDirection,
  handleMachineSortChange,
  sortedMachines,
  moldSortField,
  moldSortDirection,
  setMoldSortField,
  setMoldSortDirection,
  handleMoldSortChange,
  sortedMolds,
  rawMaterialSortField,
  rawMaterialSortDirection,
  setRawMaterialSortField,
  setRawMaterialSortDirection,
  handleRawMaterialSortChange,
  sortedRawMaterials,
  packingMaterialCategoryFilter,
  handlePackingMaterialCategoryFilterChange,
  packingMaterialSortField,
  packingMaterialSortDirection,
  setPackingMaterialSortField,
  setPackingMaterialSortDirection,
  handlePackingMaterialSortChange,
  sortedPackingMaterials,
  lineSortField,
  lineSortDirection,
  setLineSortField,
  setLineSortDirection,
  handleLineSortChange,
  sortedLines,
  openExcelReader,
  handleAction,
  setViewingNameplate,
  InfoButton,
  unitManagementEnabled,
  defaultUnit,
  units,
  onSubNavClick
}) => {
  const { canAccessResource, isRootAdmin } = useAccessControl();

  // Filter tabs based on user permissions
  const accessibleTabs = useMemo(() => {
    // Root admin can see all tabs
    if (isRootAdmin) return TAB_CONFIG;
    
    return TAB_CONFIG.filter(tab => canAccessResource(tab.resource));
  }, [canAccessResource, isRootAdmin]);

  // Initialize activeTab from localStorage or default to first accessible tab
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('masterDataActiveTab');
      // Check if saved tab is still accessible
      if (savedTab && accessibleTabs.some(tab => tab.id === savedTab)) {
        return savedTab;
      }
    }
    // Default to first accessible tab
    return accessibleTabs.length > 0 ? accessibleTabs[0].id : 'machines';
  });

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('masterDataActiveTab', tab);
    }
    // Collapse sidebar when sub nav tab is clicked
    if (onSubNavClick) {
      onSubNavClick();
    }
  };

  // Get icon component for tab
  const getTabIcon = (iconName: string) => {
    switch (iconName) {
      case 'wrench': return <Wrench className="w-5 h-5 inline mr-2" />;
      case 'link': return <Link className="w-5 h-5 inline mr-2" />;
      case 'mold': return <Image src="/mold_vector.png" alt="Mold" width={20} height={20} className="inline mr-2 w-8 h-8" />;
      case 'raw_materials': return <Image src="/raw_materials_vector.png" alt="Raw Materials" width={20} height={20} className="inline mr-2 w-8 h-8" />;
      case 'packing_materials': return <Image src="/packing_material_vector.png" alt="Packing Materials" width={20} height={20} className="inline mr-2 w-8 h-8" />;
      case 'package': return <Package className="w-5 h-5 inline mr-2" />;
      case 'building': return <Building className="w-5 h-5 inline mr-2" />;
      case 'settings': return <Settings className="w-5 h-5 inline mr-2" />;
      case 'more': return <MoreHorizontal className="w-5 h-5 inline mr-2" />;
      default: return null;
    }
  };

  // If user has no access to any tabs, show a message
  if (accessibleTabs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Access</h3>
          <p className="text-gray-600">You don't have permission to access any Master Data tabs.</p>
          <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation - Only shows tabs user has permission for */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          {accessibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {getTabIcon(tab.icon)}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'machines' && (
          <MachineMaster
            machinesMaster={machinesMaster}
            machineCategoryFilter={machineCategoryFilter}
            handleMachineCategoryFilterChange={handleMachineCategoryFilterChange}
            machineSortField={machineSortField}
            machineSortDirection={machineSortDirection}
            setMachineSortField={setMachineSortField}
            setMachineSortDirection={setMachineSortDirection}
            handleMachineSortChange={handleMachineSortChange}
            sortedMachines={sortedMachines}
            openExcelReader={openExcelReader}
            handleAction={handleAction}
            setViewingNameplate={setViewingNameplate}
            InfoButton={InfoButton}
            unitManagementEnabled={unitManagementEnabled}
            defaultUnit={defaultUnit}
            units={units}
          />
        )}

        {activeTab === 'molds' && (
          <MoldMaster
            moldsMaster={moldsMaster}
            moldSortField={moldSortField}
            moldSortDirection={moldSortDirection}
            setMoldSortField={setMoldSortField}
            setMoldSortDirection={setMoldSortDirection}
            handleMoldSortChange={handleMoldSortChange}
            sortedMolds={sortedMolds}
            openExcelReader={openExcelReader}
            handleAction={handleAction}
            InfoButton={InfoButton}
            unitManagementEnabled={unitManagementEnabled}
            defaultUnit={defaultUnit}
            units={units}
          />
        )}

        {/* Line Master content intentionally removed */}

        {activeTab === 'raw_materials' && (
          <RawMaterialsMaster
            rawMaterials={rawMaterials}
            rawMaterialSortField={rawMaterialSortField}
            rawMaterialSortDirection={rawMaterialSortDirection}
            setRawMaterialSortField={setRawMaterialSortField}
            setRawMaterialSortDirection={setRawMaterialSortDirection}
            handleRawMaterialSortChange={handleRawMaterialSortChange}
            sortedRawMaterials={sortedRawMaterials}
            openExcelReader={openExcelReader}
            handleAction={handleAction}
            InfoButton={InfoButton}
            unitManagementEnabled={unitManagementEnabled}
            defaultUnit={defaultUnit}
            units={units}
          />
        )}

        {activeTab === 'packing_materials' && (
          <PackingMaterialsMaster
            packingMaterials={packingMaterials}
            packingMaterialCategoryFilter={packingMaterialCategoryFilter}
            handlePackingMaterialCategoryFilterChange={handlePackingMaterialCategoryFilterChange}
            packingMaterialSortField={packingMaterialSortField}
            packingMaterialSortDirection={packingMaterialSortDirection}
            setPackingMaterialSortField={setPackingMaterialSortField}
            setPackingMaterialSortDirection={setPackingMaterialSortDirection}
            handlePackingMaterialSortChange={handlePackingMaterialSortChange}
            sortedPackingMaterials={sortedPackingMaterials}
            openExcelReader={openExcelReader}
            handleAction={handleAction}
            InfoButton={InfoButton}
            unitManagementEnabled={unitManagementEnabled}
            defaultUnit={defaultUnit}
            units={units}
          />
        )}

        {activeTab === 'lines' && (
          <LineMaster
            linesMaster={linesMaster}
            machinesMaster={machinesMaster}
            lineSortField={lineSortField}
            lineSortDirection={lineSortDirection}
            setLineSortField={setLineSortField}
            setLineSortDirection={setLineSortDirection}
            handleLineSortChange={handleLineSortChange}
            sortedLines={sortedLines}
            openExcelReader={openExcelReader}
            handleAction={handleAction}
            InfoButton={InfoButton}
            unitManagementEnabled={unitManagementEnabled}
            defaultUnit={defaultUnit}
            units={units}
          />
        )}

        {activeTab === 'bom_master' && (
          <BOMMaster />
        )}

        {activeTab === 'commercial_master' && (
          <CommercialMaster onSubNavClick={onSubNavClick} />
        )}

        {activeTab === 'spare_parts' && (
          <SparePartsMaster />
        )}

        {activeTab === 'others' && (
          <OthersMaster handleAction={handleAction} openExcelReader={openExcelReader} />
        )}
      </div>
    </div>
  );
};

export default MasterDataModule;