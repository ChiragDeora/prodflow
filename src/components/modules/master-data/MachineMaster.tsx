'use client';

import React from 'react';
import { 
  Wrench, Upload, Plus, ArrowUp, ArrowDown, Eye, Trash2, Pencil, Info 
} from 'lucide-react';
import { Machine as SupabaseMachine, Unit } from '../../../lib/supabase';
import { useAccessControl } from '../../../lib/useAccessControl';

type Machine = SupabaseMachine;
type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material';

interface MachineMasterProps {
  machinesMaster: Machine[];
  machineCategoryFilter: string;
  handleMachineCategoryFilterChange: (category: string) => void;
  machineSortField: string;
  machineSortDirection: 'asc' | 'desc';
  setMachineSortField: (field: string) => void;
  setMachineSortDirection: (direction: 'asc' | 'desc') => void;
  handleMachineSortChange: (field: string) => void;
  sortedMachines: Machine[];
  openExcelReader: (type: string) => void;
  handleAction: (actionType: ActionType, item: any, itemType: ItemType) => Promise<void>;
  setViewingNameplate: (nameplate: string | null) => void;
  InfoButton: React.ComponentType<{ type: string }>;
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: Unit[];
}

const MachineMaster: React.FC<MachineMasterProps> = ({
  machinesMaster,
  machineCategoryFilter,
  handleMachineCategoryFilterChange,
  machineSortField,
  machineSortDirection,
  setMachineSortField,
  setMachineSortDirection,
  handleMachineSortChange,
  sortedMachines,
  openExcelReader,
  handleAction,
  setViewingNameplate,
  InfoButton
}) => {
  // Temporarily disable permission checks - will be re-enabled later
  const canCreateMachines = true;
  const canEditMachines = true;
  const canDeleteMachines = true;
  const canViewMachines = true;

  return (
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
          

          
          {canCreateMachines && (
            <button 
              onClick={() => openExcelReader('machines')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </button>
          )}
          
          {canCreateMachines && (
            <button 
              onClick={() => handleAction('edit', {} as Machine, 'machine')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Add Machine
            </button>
          )}
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
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleMachineSortChange('unit')}
              >
                <div className="flex items-center justify-center">
                  Unit
                  {machineSortField === 'unit' && (
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.category || 'IM'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.make}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.size}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.model}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {machine.serial_no || (machine.clm_sr_no && machine.inj_serial_no ? `${machine.clm_sr_no}/${machine.inj_serial_no}` : 'N/A')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.mfg_date || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.install_date || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {machine.dimensions ? `${machine.dimensions}` : 'N/A'}
                </td>
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
                      <Info className="w-4 h-4 mr-1" />
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{machine.unit || 'Unit 1'}</td>
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
                      <Pencil className="w-4 h-4" />
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
        {sortedMachines.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Machines</h3>
            <p className="text-gray-600">Add your first machine to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MachineMaster;