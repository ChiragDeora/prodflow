'use client';

import React, { useState } from 'react';
import { Wrench, Package, Link } from 'lucide-react';
import Image from 'next/image';
import MachineMaster from './MachineMaster';
import MoldMaster from './MoldMaster';
import RawMaterialsMaster from './RawMaterialsMaster';
import PackingMaterialsMaster from './PackingMaterialsMaster';
import { 
  Machine as SupabaseMachine, 
  Mold as SupabaseMold,
  RawMaterial as SupabaseRawMaterial,
  PackingMaterial as SupabasePackingMaterial,
  Unit
} from '../../../lib/supabase';


type Machine = SupabaseMachine;
type Mold = SupabaseMold;
type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material' | 'packing_material';

// Use Supabase types
type RawMaterial = SupabaseRawMaterial;
type PackingMaterial = SupabasePackingMaterial;

interface MasterDataModuleProps {
  machinesMaster: Machine[];
  moldsMaster: Mold[];
  rawMaterials: RawMaterial[];
  packingMaterials: PackingMaterial[];
  
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
  
  // Unit management settings
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: Unit[];
  
  // Common handlers
  openExcelReader: (type: string) => void;
  handleAction: (actionType: ActionType, item: any, itemType: ItemType) => Promise<void>;
  setViewingNameplate: (nameplate: string | null) => void;
  InfoButton: React.ComponentType<{ type: string }>;
}

const MasterDataModule: React.FC<MasterDataModuleProps> = ({
  machinesMaster,
  moldsMaster,
  rawMaterials,
  packingMaterials,
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
  openExcelReader,
  handleAction,
  setViewingNameplate,
  InfoButton,
  unitManagementEnabled,
  defaultUnit,
  units
}) => {
  const [activeTab, setActiveTab] = useState('machines');

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
            <Image src="/mold_vector.png" alt="Mold" width={20} height={20} className="inline mr-2 w-8 h-8" />
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
            <Image src="/raw_materials_vector.png" alt="Raw Materials" width={20} height={20} className="inline mr-2 w-8 h-8" />
            Raw Materials Master
          </button>
          <button
            onClick={() => handleTabChange('packing_materials')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'packing_materials'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Image src="/packing_material_vector.png" alt="Packing Materials" width={20} height={20} className="inline mr-2 w-8 h-8" />
            Packing Materials Master
          </button>
          {/* Line Master tab intentionally removed */}
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
      </div>
    </div>
  );
};

export default MasterDataModule;