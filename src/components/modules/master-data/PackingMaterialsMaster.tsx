'use client';

import React from 'react';
import Image from 'next/image';
import { 
  Package, Upload, Plus, ArrowUp, ArrowDown, Eye, Trash2, Pencil 
} from 'lucide-react';
import { Unit } from '../../../lib/supabase';

// Packing Material interface based on the Excel structure
interface PackingMaterial {
  id?: string;
  category: string; // Boxes, PolyBags, Bopp
  type: string; // Export, Local, etc.
  item_code: string; // CTN-Ro16, etc.
  pack_size: string; // 150, 800, etc.
  dimensions: string; // LxBxH format
  technical_detail: string; // Technical specifications
  brand: string; // Regular, Gesa, etc.
  cbm?: number; // Cubic meter measurement - area that flat box would take
  artwork?: string; // Artwork image data or URL
  unit?: string; // Factory unit identifier (Unit 1, Unit 2, etc.)
  created_at?: string;
  updated_at?: string;
}

type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material' | 'packing_material';

interface PackingMaterialsMasterProps {
  packingMaterials: PackingMaterial[];
  packingMaterialCategoryFilter: string;
  handlePackingMaterialCategoryFilterChange: (category: string) => void;
  packingMaterialSortField: string;
  packingMaterialSortDirection: 'asc' | 'desc';
  setPackingMaterialSortField: (field: string) => void;
  setPackingMaterialSortDirection: (direction: 'asc' | 'desc') => void;
  handlePackingMaterialSortChange: (field: string) => void;
  sortedPackingMaterials: PackingMaterial[];
  openExcelReader: (type: string) => void;
  handleAction: (actionType: ActionType, item: any, itemType: ItemType) => Promise<void>;
  InfoButton: React.ComponentType<{ type: string }>;
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: Unit[];
}

const PackingMaterialsMaster: React.FC<PackingMaterialsMasterProps> = ({
  packingMaterials,
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
  InfoButton,
  unitManagementEnabled,
  defaultUnit,
  units
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">PM Master</h2>
          <InfoButton type="packing_materials" />
        </div>
        <div className="flex space-x-3">
          {/* Categories Filter */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handlePackingMaterialCategoryFilterChange('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                packingMaterialCategoryFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handlePackingMaterialCategoryFilterChange('Boxes')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                packingMaterialCategoryFilter === 'Boxes'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Boxes
            </button>
            <button
              onClick={() => handlePackingMaterialCategoryFilterChange('Polybags')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                packingMaterialCategoryFilter === 'Polybags'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Polybags
            </button>
            <button
              onClick={() => handlePackingMaterialCategoryFilterChange('BOPP')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                packingMaterialCategoryFilter === 'BOPP'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              BOPP
            </button>
          </div>
          <button 
            onClick={() => openExcelReader('packing_materials')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </button>
          
          <button 
            onClick={() => handleAction('edit', {} as PackingMaterial, 'packing_material')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Packing Material
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('category')}
              >
                <div className="flex items-center">
                  Category
                  {packingMaterialSortField === 'category' && (
                    packingMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('type')}
              >
                <div className="flex items-center">
                  Type
                  {packingMaterialSortField === 'type' && (
                    packingMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('item_code')}
              >
                <div className="flex items-center">
                  Item Code
                  {packingMaterialSortField === 'item_code' && (
                    packingMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('pack_size')}
              >
                <div className="flex items-center">
                  Pack Size
                  {packingMaterialSortField === 'pack_size' && (
                    packingMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('dimensions')}
              >
                <div className="flex items-center">
                  Dimensions
                  {packingMaterialSortField === 'dimensions' && (
                    packingMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('technical_detail')}
              >
                <div className="flex items-center">
                  Technical Detail
                  {packingMaterialSortField === 'technical_detail' && (
                    packingMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('brand')}
              >
                <div className="flex items-center">
                  Brand
                  {packingMaterialSortField === 'brand' && (
                    packingMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('cbm')}
              >
                <div className="flex items-center">
                  CBM (m³)
                  {packingMaterialSortField === 'cbm' && (
                    packingMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('artwork')}
              >
                <div className="flex items-center">
                  Artwork
                  {packingMaterialSortField === 'artwork' && (
                    packingMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handlePackingMaterialSortChange('unit')}
              >
                <div className="flex items-center">
                  Unit
                  {packingMaterialSortField === 'unit' && (
                    packingMaterialSortDirection === 'asc' ? 
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
            {sortedPackingMaterials.map((material, index) => (
              <tr key={material.id || `packing-material-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {material.category || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.type || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.item_code || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.pack_size || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.dimensions || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.technical_detail || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.brand || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.cbm ? material.cbm.toFixed(4) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.artwork ? (
                    <div className="flex items-center">
                      <img 
                        src={material.artwork} 
                        alt="Artwork" 
                        className="w-8 h-8 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.unit || 'Unit 1'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAction('view', material, 'packing_material')}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAction('edit', material, 'packing_material')}
                      className="text-green-600 hover:text-green-900"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAction('delete', material, 'packing_material')}
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
        {sortedPackingMaterials.length === 0 && (
        <div className="text-center py-12">
          <Image src="/packing_material_vector.png" alt="Packing Materials" width={70} height={70} className="mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Packing Materials</h3>
            <p className="text-gray-600">Add your first packing material to get started</p>
        </div>
        )}
      </div>
    </div>
  );
};

export default PackingMaterialsMaster;