'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, Pencil, Building2, Upload, Download } from 'lucide-react';
import { PartyName, partyNameAPI } from '../../../lib/supabase';

interface PartyNameMasterProps {
  handleAction: (actionType: 'edit' | 'delete' | 'view', item: any, itemType: string) => Promise<void>;
  openExcelReader?: (type: string) => void;
}

const PartyNameMaster: React.FC<PartyNameMasterProps> = ({
  handleAction,
  openExcelReader
}) => {
  const [partyNames, setPartyNames] = useState<PartyName[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartyNames();
    
    // Listen for refresh events
    const handleRefresh = () => {
      loadPartyNames();
    };
    window.addEventListener('refreshPartyNames', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshPartyNames', handleRefresh);
    };
  }, []);

  const loadPartyNames = async () => {
    try {
      setLoading(true);
      const data = await partyNameAPI.getAll();
      setPartyNames(data);
    } catch (error) {
      console.error('Error loading party names:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    handleAction('edit', {} as PartyName, 'party_name');
  };

  const handleDelete = async (item: PartyName) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await partyNameAPI.delete(item.id);
        await loadPartyNames();
      } catch (error) {
        console.error('Error deleting party name:', error);
        alert('Failed to delete party name. Please try again.');
      }
    }
  };

  const handleExport = async () => {
    try {
      const data = await partyNameAPI.getAll();
      const headers = [['Sr. No.', 'Name']];
      const rows = data.map((item, index) => [index + 1, item.name]);
      
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Party Name Master');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const saveAs = (await import('file-saver')).default;
      saveAs(blob, 'party_names_export.xlsx');
    } catch (error) {
      console.error('Error exporting party names:', error);
      alert('Failed to export party names. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <h3 className="text-xl font-bold text-gray-800">Party Name Master</h3>
        </div>
        <div className="flex space-x-3">
          {openExcelReader && (
            <button 
              onClick={() => openExcelReader('party_names')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </button>
          )}
          <button 
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Party Name
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sr. No.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {partyNames.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAction('view', item, 'party_name')}
                      className="text-blue-600 hover:text-blue-900"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAction('edit', item, 'party_name')}
                      className="text-green-600 hover:text-green-900"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {partyNames.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Party Names</h3>
            <p className="text-gray-600">Add your first party name to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyNameMaster;

