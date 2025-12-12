'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, Pencil, Palette, Upload, Download } from 'lucide-react';
import { ColorLabel, colorLabelAPI } from '../../../lib/supabase';

interface ColorLabelMasterProps {
  handleAction: (actionType: 'edit' | 'delete' | 'view', item: any, itemType: string) => Promise<void>;
  openExcelReader?: (type: string) => void;
}

const ColorLabelMaster: React.FC<ColorLabelMasterProps> = ({
  handleAction,
  openExcelReader
}) => {
  const [colorLabels, setColorLabels] = useState<ColorLabel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadColorLabels();
    
    // Listen for refresh events
    const handleRefresh = () => {
      loadColorLabels();
    };
    window.addEventListener('refreshColorLabels', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshColorLabels', handleRefresh);
    };
  }, []);

  const loadColorLabels = async () => {
    try {
      setLoading(true);
      const data = await colorLabelAPI.getAll();
      setColorLabels(data);
    } catch (error) {
      console.error('Error loading color/labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    handleAction('edit', {} as ColorLabel, 'color_label');
  };

  const handleDelete = async (item: ColorLabel) => {
    if (window.confirm(`Are you sure you want to delete "${item.color_label}"?`)) {
      try {
        await colorLabelAPI.delete(item.id);
        await loadColorLabels();
      } catch (error) {
        console.error('Error deleting color/label:', error);
        alert('Failed to delete color/label. Please try again.');
      }
    }
  };

  const handleExport = async () => {
    try {
      const data = await colorLabelAPI.getAll();
      const headers = [['Sr. No.', 'Color / Label']];
      const rows = data.map((item) => [item.sr_no, item.color_label]);
      
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Color Master');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const saveAs = (await import('file-saver')).default;
      saveAs(blob, 'color_labels_export.xlsx');
    } catch (error) {
      console.error('Error exporting color/labels:', error);
      alert('Failed to export color/labels. Please try again.');
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
          <h3 className="text-xl font-bold text-gray-800">Color/Label Master</h3>
        </div>
        <div className="flex space-x-3">
          {openExcelReader && (
            <button 
              onClick={() => openExcelReader('color_labels')}
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
            Add Color/Label
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
                Color/Label
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {colorLabels.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.sr_no}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{item.color_label}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAction('view', item, 'color_label')}
                      className="text-blue-600 hover:text-blue-900"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAction('edit', item, 'color_label')}
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
        {colorLabels.length === 0 && (
          <div className="text-center py-12">
            <Palette className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Color/Labels</h3>
            <p className="text-gray-600">Add your first color/label to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorLabelMaster;

