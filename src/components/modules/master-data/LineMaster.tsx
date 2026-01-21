'use client';

import React, { useState } from 'react';
import { 
  Plus, Edit, Trash2, Eye, Search, Filter, Download, Upload, 
  AlertCircle, CheckCircle, XCircle, Info, Link, Wrench, Package
} from 'lucide-react';
import { Line, Machine } from '../../../lib/supabase';
import { lineAPI } from '../../../lib/supabase/api/line';

interface LineMasterProps {
  linesMaster: Line[];
  machinesMaster: Machine[];
  lineSortField: string;
  lineSortDirection: 'asc' | 'desc';
  setLineSortField: (field: string) => void;
  setLineSortDirection: (direction: 'asc' | 'desc') => void;
  handleLineSortChange: (field: string) => void;
  sortedLines: Line[];
  openExcelReader: (type: string) => void;
  handleAction: (actionType: 'edit' | 'delete' | 'view' | 'approve' | 'mark_done', item: any, itemType: 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material' | 'packing_material' | 'line') => Promise<void>;
  InfoButton: React.ComponentType<{ type: string }>;
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: { id: string; name: string; description?: string; location?: string; status: 'Active' | 'Inactive' | 'Maintenance'; created_at?: string; updated_at?: string; }[];
}

const LineMaster: React.FC<LineMasterProps> = ({
  linesMaster,
  machinesMaster,
  lineSortField,
  lineSortDirection,
  setLineSortField,
  setLineSortDirection,
  handleLineSortChange,
  sortedLines,
  openExcelReader,
  handleAction,
  InfoButton,
  unitManagementEnabled,
  defaultUnit,
  units
}) => {

  // Get machine details for display
  const getMachineDetails = (machineId?: string) => {
    if (!machineId) return null;
    return machinesMaster.find(machine => machine.machine_id === machineId);
  };

  // Calculate automatic status based on machine assignments
  const calculateLineStatus = (line: Line) => {
    // Check if all 4 machines are assigned
    const hasAllMachines = line.im_machine_id && 
                          line.robot_machine_id && 
                          line.conveyor_machine_id && 
                          line.hoist_machine_id;
    
    // If all machines are assigned, status is Active, otherwise Inactive
    return hasAllMachines ? 'Active' : 'Inactive';
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Inactive':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Maintenance':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">Line Master</h2>
          <InfoButton type="lines" />
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => openExcelReader('lines')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </button>
          <button 
            onClick={async () => {
              try {
                // Find the highest line number to generate next line ID
                const lineNumbers = linesMaster
                  .map(line => {
                    const match = line.line_id.match(/LINE-(\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
                  })
                  .filter(num => num > 0);
                
                const maxLineNumber = lineNumbers.length > 0 ? Math.max(...lineNumbers) : 0;
                const nextLineNumber = maxLineNumber + 1;
                const newLineId = `LINE-${nextLineNumber.toString().padStart(3, '0')}`;
                
                // Create new line with inactive status and empty fields
                const newLine = await lineAPI.create({
                  line_id: newLineId,
                  description: `Production ${newLineId}`,
                  im_machine_id: undefined,
                  robot_machine_id: undefined,
                  conveyor_machine_id: undefined,
                  hoist_machine_id: undefined,
                  loader_machine_id: undefined,
                  status: 'Inactive',
                  unit: defaultUnit || 'Unit 1',
                  grinding: false
                } as Omit<Line, 'created_at' | 'updated_at'>);
                
                if (newLine) {
                  // Open edit modal for the new line so user can assign machines
                  await handleAction('edit', newLine, 'line');
                }
              } catch (error) {
                console.error('Error creating new line:', error);
                alert('Failed to create new line. Please try again.');
              }
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Line
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleLineSortChange('line_id')}>
                  Line ID
                  {lineSortField === 'line_id' && (
                    <span className="ml-1">{lineSortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IM Machine
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Robot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conveyor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hoist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loader <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleLineSortChange('status')}>
                  Status
                  {lineSortField === 'status' && (
                    <span className="ml-1">{lineSortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                {unitManagementEnabled && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleLineSortChange('unit')}>
                    Unit
                    {lineSortField === 'unit' && (
                      <span className="ml-1">{lineSortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedLines.map((line) => {
                const imMachine = getMachineDetails(line.im_machine_id);
                const robotMachine = getMachineDetails(line.robot_machine_id);
                const conveyorMachine = getMachineDetails(line.conveyor_machine_id);
                const hoistMachine = getMachineDetails(line.hoist_machine_id);
                const loaderMachine = getMachineDetails(line.loader_machine_id);

                return (
                  <tr key={line.line_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {line.line_id}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {line.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {imMachine ? (
                        <span>{imMachine.machine_id}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {robotMachine ? (
                        <span>{robotMachine.machine_id}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {conveyorMachine ? (
                        <span>{conveyorMachine.machine_id}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {hoistMachine ? (
                        <span>{hoistMachine.machine_id}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {loaderMachine ? (
                        <span>{loaderMachine.machine_id}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {(() => {
                          const calculatedStatus = calculateLineStatus(line);
                          return (
                            <>
                              {getStatusIcon(calculatedStatus)}
                              <span className="ml-2 text-sm text-gray-900">{calculatedStatus}</span>
                              {calculatedStatus !== line.status && (
                                <span className="ml-2 text-xs text-gray-400"></span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    {unitManagementEnabled && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {line.unit || defaultUnit}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAction('view', line, 'line')}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction('edit', line, 'line')}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction('delete', line, 'line')}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {sortedLines.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No lines found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new production line.
            </p>
            <div className="mt-6">
              <button
                onClick={() => handleAction('edit', null, 'line')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Line
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {sortedLines.filter((line: Line) => calculateLineStatus(line) === 'Active').length}
            </div>
            <div className="text-sm text-gray-500">Active Lines</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {sortedLines.filter((line: Line) => calculateLineStatus(line) === 'Inactive').length}
            </div>
            <div className="text-sm text-gray-500">Inactive Lines</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {sortedLines.filter((line: Line) => line.status === 'Maintenance').length}
            </div>
            <div className="text-sm text-gray-500">Under Maintenance</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {sortedLines.length}
            </div>
            <div className="text-sm text-gray-500">Total Lines</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineMaster;
