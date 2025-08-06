'use client';

import React from 'react';
import Image from 'next/image';
import { 
  Package, Upload, Plus, ArrowUp, ArrowDown, Eye, Trash2, Pencil 
} from 'lucide-react';
import { Unit } from '../../../lib/supabase';

// Raw Material interface based on the new database schema
interface RawMaterial {
  id?: string; // Optional since database auto-generates UUID
  sl_no: number;
  category: string; // PP, PE, etc.
  type: string; // HP, ICP, RCP, LDPE, MB, etc.
  grade: string; // HJ333MO, 1750 MN, etc.
  supplier: string; // Borouge, IOCL, Basell, etc.
  mfi: number | null; // Melt Flow Index
  density: number | null; // Density in g/cm³
  tds_image?: string; // Base64 encoded TDS image or URL
  remark?: string; // Additional remarks
  unit?: string; // Factory unit identifier (Unit 1, Unit 2, etc.)
  created_at?: string;
  updated_at?: string;
}

type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material';

interface RawMaterialsMasterProps {
  rawMaterials: RawMaterial[];
  rawMaterialSortField: string;
  rawMaterialSortDirection: 'asc' | 'desc';
  setRawMaterialSortField: (field: string) => void;
  setRawMaterialSortDirection: (direction: 'asc' | 'desc') => void;
  handleRawMaterialSortChange: (field: string) => void;
  sortedRawMaterials: RawMaterial[];
  openExcelReader: (type: string) => void;
  handleAction: (actionType: ActionType, item: any, itemType: ItemType) => Promise<void>;
  InfoButton: React.ComponentType<{ type: string }>;
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: Unit[];
}

const RawMaterialsMaster: React.FC<RawMaterialsMasterProps> = ({
  rawMaterials,
  rawMaterialSortField,
  rawMaterialSortDirection,
  setRawMaterialSortField,
  setRawMaterialSortDirection,
  handleRawMaterialSortChange,
  sortedRawMaterials,
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
          <h2 className="text-2xl font-bold text-gray-800">Raw Materials Master</h2>
          <InfoButton type="raw_materials" />
        </div>
        <div className="flex space-x-3">

          
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
                onClick={() => handleRawMaterialSortChange('category')}
              >
                <div className="flex items-center">
                  Category
                  {rawMaterialSortField === 'category' && (
                    rawMaterialSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleRawMaterialSortChange('type')}
              >
                <div className="flex items-center">
                  Type
                  {rawMaterialSortField === 'type' && (
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
                TDS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Remark
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleRawMaterialSortChange('unit')}
              >
                <div className="flex items-center">
                  Unit
                  {rawMaterialSortField === 'unit' && (
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
                  {material.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.grade}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.supplier}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.mfi || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.density || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.tds_image ? (
                    <button
                      onClick={() => handleAction('view', material, 'raw_material')}
                      className="text-blue-600 hover:text-blue-900 underline"
                    >
                      View TDS
                    </button>
                  ) : (
                    <span className="text-gray-400">No TDS</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.remark || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {material.unit || 'Unit 1'}
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
          <Image src="/raw_materials_vector.png" alt="Raw Materials" width={70} height={70} className="mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Raw Materials</h3>
            <p className="text-gray-600">Add your first raw material to get started</p>
        </div>
        )}
      </div>
    </div>
  );
};

export default RawMaterialsMaster;