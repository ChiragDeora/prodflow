import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Save, Download, Upload, Calendar, Clock, User } from 'lucide-react';
import ExcelFileReader from '../../../ExcelFileReader';

interface ChecklistItem {
  id: string;
  checkPoint: string;
  machine1: boolean | null;
  machine2: boolean | null;
  machine3: boolean | null;
  machine4: boolean | null;
  machine5: boolean | null;
  machine6: boolean | null;
  machine7: boolean | null;
  remarks: string;
}

interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
  machineColumns: string[];
}

interface DailyChecklist {
  id: string;
  date: string;
  company: string;
  docNumber: string;
  checkedBy: string;
  verifiedBy: string;
  sections: ChecklistSection[];
}

const MaintenanceChecklist: React.FC = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkedBy, setCheckedBy] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [showExcelUpload, setShowExcelUpload] = useState(false);

  // Initialize default checklist structure based on the document
  useEffect(() => {
    const defaultChecklist: DailyChecklist = {
      id: '1',
      date: currentDate,
      company: 'DEORA POLYPLAST LLP',
      docNumber: 'DPPL-MNT-001/R00',
      checkedBy: '',
      verifiedBy: '',
      sections: [
        {
          id: 'machine',
          title: 'Machine Check Point',
          machineColumns: ['M/C No-1', 'M/C No-2', 'M/C No-3', 'M/C No-4', 'M/C No-5', 'M/C No-6', 'M/C No-7'],
          items: [
            { id: '1', checkPoint: 'Machine and surrounding area clean', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '2', checkPoint: 'Electricals Power Checking', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '3', checkPoint: 'Any Air leakage in machine', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '4', checkPoint: 'Any water leakage in machine Area', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '5', checkPoint: 'Any abnormal sound', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '6', checkPoint: 'All tools kept in the tool box', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' }
          ]
        },
        {
          id: 'robot',
          title: 'Robot Check Point',
          machineColumns: ['Robot No-1', 'Robot No-2', 'Robot No-3', 'Robot No-4', 'Robot No-5', 'Robot No-6', 'Robot No-7'],
          items: [
            { id: '1', checkPoint: 'Check Any Air leakage in furl', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '2', checkPoint: 'Check Any Air leakage in Eoat', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '3', checkPoint: 'Check Any abnormal sound', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '4', checkPoint: 'Check Any water in Furl', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' }
          ]
        },
        {
          id: 'chiller',
          title: 'Chiller Check Point',
          machineColumns: ['Chiller No-1', 'Chiller No-2'],
          items: [
            { id: '1', checkPoint: 'Check water level', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '2', checkPoint: 'Check Any water leakage in tank', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '3', checkPoint: 'Check Set & Act Temp', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '4', checkPoint: 'Check Any abnormal sound', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' }
          ]
        },
        {
          id: 'compressor',
          title: 'Compressor Check Point',
          machineColumns: ['Compressor No-1', 'Compressor No-2'],
          items: [
            { id: '1', checkPoint: 'Check Any Air leakage', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '2', checkPoint: 'Check Any abnormal sound', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '3', checkPoint: 'check oil leave', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '4', checkPoint: 'Check dryer', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '5', checkPoint: 'Temperature', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' }
          ]
        },
        {
          id: 'blower',
          title: 'Blower',
          machineColumns: ['M/c Blower No.1', 'M/c Blower No.2', 'Selo Blower No.1', 'Selo Blower No.2'],
          items: [
            { id: '1', checkPoint: 'Filter Clean', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' }
          ]
        },
        {
          id: 'electrical',
          title: 'Electrical Panel',
          machineColumns: ['Electrical Panel'],
          items: [
            { id: '1', checkPoint: 'Check all electrical connections', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '2', checkPoint: 'Check circuit breakers', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '3', checkPoint: 'Check voltage readings', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' }
          ]
        },
        {
          id: 'granulator',
          title: 'Granulator',
          machineColumns: ['Granulator'],
          items: [
            { id: '1', checkPoint: 'Check Any abnormal sound', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' },
            { id: '2', checkPoint: 'Check All Safety function are working', machine1: null, machine2: null, machine3: null, machine4: null, machine5: null, machine6: null, machine7: null, remarks: '' }
          ]
        }
      ]
    };
    setChecklist(defaultChecklist);
  }, [currentDate]);

  const handleCheckboxChange = (sectionId: string, itemId: string, machineKey: string, value: boolean) => {
    if (!checklist) return;

    setChecklist(prev => {
      if (!prev) return prev;
      
      const updatedSections = prev.sections.map(section => {
        if (section.id === sectionId) {
          const updatedItems = section.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                [machineKey]: value
              };
            }
            return item;
          });
          return { ...section, items: updatedItems };
        }
        return section;
      });

      return { ...prev, sections: updatedSections };
    });
  };

  const handleRemarksChange = (sectionId: string, itemId: string, remarks: string) => {
    if (!checklist) return;

    setChecklist(prev => {
      if (!prev) return prev;
      
      const updatedSections = prev.sections.map(section => {
        if (section.id === sectionId) {
          const updatedItems = section.items.map(item => {
            if (item.id === itemId) {
              return { ...item, remarks };
            }
            return item;
          });
          return { ...section, items: updatedItems };
        }
        return section;
      });

      return { ...prev, sections: updatedSections };
    });
  };

  const getStatusIcon = (value: boolean | null) => {
    if (value === null) return <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>;
    return value ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getCompletionStatus = (section: ChecklistSection) => {
    const totalItems = section.items.length;
    const completedItems = section.items.filter(item => 
      Object.keys(item).some(key => key.startsWith('machine') && item[key as keyof ChecklistItem] === true)
    ).length;
    
    const percentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    
    if (percentage === 0) return { text: 'Not Started', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (percentage < 50) return { text: 'In Progress', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (percentage < 100) return { text: 'Almost Complete', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { text: 'Complete', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const handleSave = () => {
    // Save checklist to database
    console.log('Saving checklist:', checklist);
    // TODO: Implement save functionality
  };

  const handleExport = () => {
    // Export checklist to Excel
    console.log('Exporting checklist:', checklist);
    // TODO: Implement export functionality
  };

  const handleExcelUpload = (data: any) => {
    // Handle Excel data import
    console.log('Excel data received:', data);
    setShowExcelUpload(false);
    // TODO: Implement Excel import functionality
  };

  if (!checklist) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Check List</h1>
            <p className="text-gray-600">{checklist.company}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              onClick={() => setShowExcelUpload(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </button>
            <button
              onClick={handleExport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={handleSave}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </button>
          </div>
        </div>
        
        {/* Document Info */}
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Doc No.: {checklist.docNumber}</span>
            <span>Date: {currentDate}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <input
                type="text"
                placeholder="Checked By"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <input
                type="text"
                placeholder="Verified By"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {checklist.sections.map((section) => {
            const status = getCompletionStatus(section);
            return (
              <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} ${status.bg}`}>
                      {status.text}
                    </span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                          Check Points
                        </th>
                        {section.machineColumns.map((column, index) => (
                          <th key={index} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {column}
                          </th>
                        ))}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {section.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.checkPoint}
                          </td>
                          {section.machineColumns.map((_, index) => {
                            const machineKey = `machine${index + 1}` as keyof ChecklistItem;
                            const value = item[machineKey] as boolean | null;
                            return (
                              <td key={index} className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleCheckboxChange(section.id, item.id, machineKey, value === true ? false : true)}
                                  className="flex items-center justify-center w-full"
                                >
                                  {getStatusIcon(value)}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="text"
                              placeholder="Add remarks..."
                              value={item.remarks}
                              onChange={(e) => handleRemarksChange(section.id, item.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Excel Upload Modal */}
      {showExcelUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Import Excel File</h3>
            <ExcelFileReader
              onDataImported={(data) => handleExcelUpload(data)}
              defaultDataType="machines"
            />
            <button
              onClick={() => setShowExcelUpload(false)}
              className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceChecklist;
