'use client';

import React from 'react';
import Image from 'next/image';
import { 
  Package, Upload, Plus, ArrowUp, ArrowDown, Eye, Edit, Trash2 
} from 'lucide-react';
import { Mold as SupabaseMold, Unit } from '../../../lib/supabase';
import { useAccessControl } from '../../../lib/useAccessControl';

type Mold = SupabaseMold;
type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material';

interface MoldMasterProps {
  moldsMaster: Mold[];
  moldSortField: string;
  moldSortDirection: 'asc' | 'desc';
  setMoldSortField: (field: string) => void;
  setMoldSortDirection: (direction: 'asc' | 'desc') => void;
  handleMoldSortChange: (field: string) => void;
  sortedMolds: Mold[];
  openExcelReader: (type: string) => void;
  handleAction: (actionType: ActionType, item: any, itemType: ItemType) => Promise<void>;
  InfoButton: React.ComponentType<{ type: string }>;
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: Unit[];
}

const MoldMaster: React.FC<MoldMasterProps> = ({
  moldsMaster,
  moldSortField,
  moldSortDirection,
  setMoldSortField,
  setMoldSortDirection,
  handleMoldSortChange,
  sortedMolds,
  openExcelReader,
  handleAction,
  InfoButton,
  unitManagementEnabled,
  defaultUnit,
  units
}) => {
  // Permission checks for Mold Master actions
  const { canPerformAction, isRootAdmin } = useAccessControl();
  
  // Root admin has all permissions; otherwise check specific action permissions
  const canCreateMolds = isRootAdmin || canPerformAction('create', 'Mold Master');
  const canEditMolds = isRootAdmin || canPerformAction('update', 'Mold Master');
  const canDeleteMolds = isRootAdmin || canPerformAction('delete', 'Mold Master');

  // Debug: Log first mold to check data structure
  React.useEffect(() => {
    if (sortedMolds && sortedMolds.length > 0) {
      const firstMold = sortedMolds[0];
      console.log('🔍 MoldMaster - First mold data:', {
        mold_name: firstMold.mold_name,
        int_wt: firstMold.int_wt,
        rp_bill_wt: firstMold.rp_bill_wt,
        std_wt: (firstMold as any).std_wt, // Check if old field still exists
        rp_wt: (firstMold as any).rp_wt, // Check if old field still exists
        allKeys: Object.keys(firstMold)
      });
    }
  }, [sortedMolds]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">Mold Master</h2>
          <InfoButton type="molds" />
        </div>
        <div className="flex space-x-3">

          
          {canCreateMolds && (
            <button 
              onClick={() => openExcelReader('molds')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </button>
          )}
          
          {canCreateMolds && (
            <button 
              onClick={() => handleAction('edit', {} as Mold, 'mold')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Mold
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMoldSortChange('sr_no')}
              >
                <div className="flex items-center">
                  Sr.no.
                  {moldSortField === 'sr_no' && (
                    moldSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMoldSortChange('mold_name')}
              >
                <div className="flex items-center">
                  Mold name
                  {moldSortField === 'mold_name' && (
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
                onClick={() => handleMoldSortChange('dwg_wt')}
              >
                <div className="flex items-center">
                  Dwg Wt.
                  {moldSortField === 'dwg_wt' && (
                    moldSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMoldSortChange('int_wt')}
              >
                <div className="flex items-center">
                  Int. Wt.
                  {moldSortField === 'int_wt' && (
                    moldSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMoldSortChange('rp_bill_wt')}
              >
                <div className="flex items-center">
                  RP Bill Wt.
                  {moldSortField === 'rp_bill_wt' && (
                    moldSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMoldSortChange('dimensions')}
              >
                <div className="flex items-center">
                  Dimensions
                  {moldSortField === 'dimensions' && (
                    moldSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMoldSortChange('mold_wt')}
              >
                <div className="flex items-center">
                  Mold Wt.
                  {moldSortField === 'mold_wt' && (
                    moldSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMoldSortChange('hrc_make')}
              >
                <div className="flex items-center">
                  HRC Make
                  {moldSortField === 'hrc_make' && (
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
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMoldSortChange('start_date')}
              >
                <div className="flex items-center">
                  Start Date
                  {moldSortField === 'start_date' && (
                    moldSortDirection === 'asc' ? 
                    <ArrowUp className="w-3 h-3 ml-1" /> : 
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMoldSortChange('unit')}
              >
                <div className="flex items-center">
                  Unit
                  {moldSortField === 'unit' && (
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
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{mold.sr_no || mold.mold_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.mold_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.type || 'Injection Mold'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.cavity || mold.cavities || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.cycle_time ? `${mold.cycle_time}s` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.dwg_wt ? `${mold.dwg_wt}g` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.int_wt != null ? `${mold.int_wt}g` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.rp_bill_wt != null ? `${mold.rp_bill_wt}g` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.dimensions || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.mold_wt ? `${mold.mold_wt}g` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.hrc_make || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.hrc_zone || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.make || mold.maker || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.start_date ? new Date(mold.start_date).toLocaleDateString() : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mold.unit || 'Unit 1'}</td>
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
                      onClick={() => canEditMolds && handleAction('edit', mold, 'mold')}
                      className={`${canEditMolds ? 'text-green-600 hover:text-green-900 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                      title={canEditMolds ? 'Edit Mold' : 'No permission to edit'}
                      disabled={!canEditMolds}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => canDeleteMolds && handleAction('delete', mold, 'mold')}
                      className={`${canDeleteMolds ? 'text-red-600 hover:text-red-900 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                      title={canDeleteMolds ? 'Delete Mold' : 'No permission to delete'}
                      disabled={!canDeleteMolds}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedMolds.length === 0 && (
          <div className="text-center py-12">
            <Image src="/mold_vector.png" alt="Mold" width={70} height={70} className="mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Molds</h3>
            <p className="text-gray-600">Add your first mold to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoldMaster;