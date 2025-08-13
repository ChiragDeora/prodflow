import React, { useState } from 'react';
import { Download, FileSpreadsheet, Plus, Settings } from 'lucide-react';

interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  headers: string[];
  sampleData: any[][];
  equipmentTypes: string[];
}

const templateConfigs: TemplateConfig[] = [
  {
    id: 'daily-checklist',
    name: 'Daily Check List Template',
    description: 'Template for daily equipment inspection checklist',
    headers: ['Check Point', 'M/C No-1', 'M/C No-2', 'M/C No-3', 'M/C No-4', 'M/C No-5', 'M/C No-6', 'M/C No-7', 'Remarks'],
    equipmentTypes: ['Machine Check Point', 'Robot Check Point', 'Chiller Check Point', 'Compressor Check Point', 'Blower', 'Electrical Panel', 'Granulator'],
    sampleData: [
      ['Machine and surrounding area clean', '', '', '', '', '', '', '', ''],
      ['Electricals Power Checking', '', '', '', '', '', '', '', ''],
      ['Any Air leakage in machine', '', '', '', '', '', '', '', ''],
      ['Any water leakage in machine Area', '', '', '', '', '', '', '', ''],
      ['Any abnormal sound', '', '', '', '', '', '', '', ''],
      ['All tools kept in the tool box', '', '', '', '', '', '', '', '']
    ]
  },
  {
    id: 'weekly-compressor',
    name: 'Weekly Compressor Check Sheet Template',
    description: 'Template for weekly compressor maintenance and inspection',
    headers: ['Check Item', 'Compressor 1', 'Compressor 2', 'Compressor 3', 'Status', 'Action Required', 'Technician', 'Date'],
    equipmentTypes: ['Air Pressure Check', 'Oil Level Inspection', 'Temperature Monitoring', 'Leak Detection', 'Filter Status', 'Safety Systems'],
    sampleData: [
      ['Air Pressure (bar)', '', '', '', 'Normal', 'None', '', ''],
      ['Oil Level', '', '', '', 'Normal', 'None', '', ''],
      ['Temperature (°C)', '', '', '', 'Normal', 'None', '', ''],
      ['Air Leaks', '', '', '', 'None', 'None', '', ''],
      ['Filter Condition', '', '', '', 'Good', 'None', '', ''],
      ['Safety Systems', '', '', '', 'Operational', 'None', '', '']
    ]
  },
  {
    id: 'weekly-magnate',
    name: 'Weekly Magnate Check Sheet Template',
    description: 'Template for weekly magnate system inspection',
    headers: ['Check Item', 'Magnate 1', 'Magnate 2', 'Magnate 3', 'Status', 'Action Required', 'Technician', 'Date'],
    equipmentTypes: ['Magnetic Field Check', 'Power Supply Verification', 'Temperature Monitoring', 'Safety Interlocks', 'Performance Testing'],
    sampleData: [
      ['Magnetic Field Strength', '', '', '', 'Normal', 'None', '', ''],
      ['Power Supply Voltage', '', '', '', 'Normal', 'None', '', ''],
      ['Temperature (°C)', '', '', '', 'Normal', 'None', '', ''],
      ['Safety Interlocks', '', '', '', 'Operational', 'None', '', ''],
      ['Performance Test', '', '', '', 'Pass', 'None', '', '']
    ]
  },
  {
    id: 'monthly-robot',
    name: 'Monthly Robot Check List Template',
    description: 'Template for monthly robot system comprehensive inspection',
    headers: ['Check Item', 'Robot 1', 'Robot 2', 'Robot 3', 'Robot 4', 'Status', 'Action Required', 'Inspector', 'Date'],
    equipmentTypes: ['Robot Movement Check', 'Gripper Function Test', 'Safety Systems', 'Programming Verification', 'Mechanical Inspection', 'Performance Analysis'],
    sampleData: [
      ['Axis Movement', '', '', '', '', 'Normal', 'None', '', ''],
      ['Gripper Function', '', '', '', '', 'Normal', 'None', '', ''],
      ['Safety Systems', '', '', '', '', 'Operational', 'None', '', ''],
      ['Programming Check', '', '', '', '', 'Correct', 'None', '', ''],
      ['Mechanical Inspection', '', '', '', '', 'Good', 'None', '', ''],
      ['Performance Analysis', '', '', '', '', 'Optimal', 'None', '', '']
    ]
  },
  {
    id: 'monthly-machine',
    name: 'Monthly Machine Check List Template',
    description: 'Template for monthly machine comprehensive inspection',
    headers: ['Check Item', 'Machine 1', 'Machine 2', 'Machine 3', 'Machine 4', 'Status', 'Action Required', 'Inspector', 'Date'],
    equipmentTypes: ['Mechanical Components', 'Electrical Systems', 'Hydraulic Systems', 'Safety Devices', 'Performance Metrics', 'Documentation Review'],
    sampleData: [
      ['Mechanical Components', '', '', '', '', 'Good', 'None', '', ''],
      ['Electrical Systems', '', '', '', '', 'Good', 'None', '', ''],
      ['Hydraulic Systems', '', '', '', '', 'Good', 'None', '', ''],
      ['Safety Devices', '', '', '', '', 'Operational', 'None', '', ''],
      ['Performance Metrics', '', '', '', '', 'Optimal', 'None', '', ''],
      ['Documentation Review', '', '', '', '', 'Complete', 'None', '', '']
    ]
  },
  {
    id: 'quarterly-machine',
    name: 'Quarterly Machine Check List Template',
    description: 'Template for quarterly comprehensive machine assessment',
    headers: ['Check Item', 'Machine 1', 'Machine 2', 'Machine 3', 'Machine 4', 'Status', 'Action Required', 'Inspector', 'Date'],
    equipmentTypes: ['Major Component Inspection', 'Efficiency Analysis', 'Upgrade Assessment', 'Safety Audit', 'Compliance Review', 'Performance Optimization'],
    sampleData: [
      ['Major Components', '', '', '', '', 'Good', 'None', '', ''],
      ['Efficiency Analysis', '', '', '', '', 'Optimal', 'None', '', ''],
      ['Upgrade Assessment', '', '', '', '', 'Current', 'None', '', ''],
      ['Safety Audit', '', '', '', '', 'Compliant', 'None', '', ''],
      ['Compliance Review', '', '', '', '', 'Compliant', 'None', '', ''],
      ['Performance Optimization', '', '', '', '', 'Optimized', 'None', '', '']
    ]
  },
  {
    id: 'semi-annual-machine',
    name: 'Semi Annual Machine Check List Template',
    description: 'Template for semi-annual comprehensive machine inspection',
    headers: ['Check Item', 'Machine 1', 'Machine 2', 'Machine 3', 'Machine 4', 'Status', 'Action Required', 'Inspector', 'Date'],
    equipmentTypes: ['Comprehensive Inspection', 'Preventive Maintenance', 'Performance Analysis', 'Safety Systems', 'Documentation Audit', 'Training Verification'],
    sampleData: [
      ['Comprehensive Inspection', '', '', '', '', 'Complete', 'None', '', ''],
      ['Preventive Maintenance', '', '', '', '', 'Complete', 'None', '', ''],
      ['Performance Analysis', '', '', '', '', 'Optimal', 'None', '', ''],
      ['Safety Systems', '', '', '', '', 'Operational', 'None', '', ''],
      ['Documentation Audit', '', '', '', '', 'Complete', 'None', '', ''],
      ['Training Verification', '', '', '', '', 'Current', 'None', '', '']
    ]
  },
  {
    id: 'annual-machine',
    name: 'Annual Machine Check List Template',
    description: 'Template for annual comprehensive machine inspection',
    headers: ['Check Item', 'Machine 1', 'Machine 2', 'Machine 3', 'Machine 4', 'Status', 'Action Required', 'Inspector', 'Date'],
    equipmentTypes: ['Complete System Inspection', 'Major Overhaul Assessment', 'Performance Analysis', 'Safety Compliance', 'Documentation Review', 'Future Planning'],
    sampleData: [
      ['Complete System Inspection', '', '', '', '', 'Complete', 'None', '', ''],
      ['Major Overhaul Assessment', '', '', '', '', 'Not Required', 'None', '', ''],
      ['Performance Analysis', '', '', '', '', 'Optimal', 'None', '', ''],
      ['Safety Compliance', '', '', '', '', 'Compliant', 'None', '', ''],
      ['Documentation Review', '', '', '', '', 'Complete', 'None', '', ''],
      ['Future Planning', '', '', '', '', 'Planned', 'None', '', '']
    ]
  },
  {
    id: 'pm-plan',
    name: 'PM Plan for 2022(SEP.) Template',
    description: 'Template for preventive maintenance plan and schedule',
    headers: ['Task', 'Equipment', 'Frequency', 'Assigned To', 'Due Date', 'Status', 'Priority', 'Notes'],
    equipmentTypes: ['Schedule Planning', 'Resource Allocation', 'Task Assignment', 'Timeline Management', 'Progress Tracking', 'Documentation'],
    sampleData: [
      ['Daily Check List', 'All Equipment', 'Daily', '', '', 'Scheduled', 'High', ''],
      ['Weekly Compressor Check', 'Compressors', 'Weekly', '', '', 'Scheduled', 'Medium', ''],
      ['Monthly Robot Check', 'Robots', 'Monthly', '', '', 'Scheduled', 'Medium', ''],
      ['Quarterly Machine Check', 'All Machines', 'Quarterly', '', '', 'Scheduled', 'High', ''],
      ['Annual Machine Check', 'All Machines', 'Annual', '', '', 'Scheduled', 'Critical', '']
    ]
  }
];

const ExcelTemplateGenerator: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customHeaders, setCustomHeaders] = useState<string[]>([]);
  const [customEquipmentTypes, setCustomEquipmentTypes] = useState<string[]>([]);

  const generateExcelTemplate = (config: TemplateConfig) => {
    // Create CSV content
    const csvContent = [
      config.headers.join(','),
      ...config.sampleData.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const generateCustomTemplate = () => {
    if (customHeaders.length === 0) return;

    const csvContent = [
      customHeaders.join(','),
      ...Array(5).fill('').map(() => customHeaders.map(() => '').join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Custom_Checklist_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, '']);
  };

  const updateCustomHeader = (index: number, value: string) => {
    const updated = [...customHeaders];
    updated[index] = value;
    setCustomHeaders(updated);
  };

  const removeCustomHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Excel Template Generator</h2>
        <p className="text-gray-600 mb-6">Generate Excel templates for different types of maintenance checklists</p>

        {/* Predefined Templates */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Predefined Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateConfigs.map((config) => (
              <div key={config.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  <button
                    onClick={() => generateExcelTemplate(config)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{config.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Headers:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.headers.slice(0, 3).map((header, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {header}
                        </span>
                      ))}
                      {config.headers.length > 3 && (
                        <span className="text-xs text-gray-500">+{config.headers.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Equipment Types:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.equipmentTypes.slice(0, 2).map((type, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {type}
                        </span>
                      ))}
                      {config.equipmentTypes.length > 2 && (
                        <span className="text-xs text-gray-500">+{config.equipmentTypes.length - 2} more</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Template Generator */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Template Generator</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Headers</label>
              <div className="space-y-2">
                {customHeaders.map((header, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => updateCustomHeader(index, e.target.value)}
                      placeholder="Enter header name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => removeCustomHeader(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={addCustomHeader}
                  className="flex items-center text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Header
                </button>
              </div>
            </div>
            
            <button
              onClick={generateCustomTemplate}
              disabled={customHeaders.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate Custom Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelTemplateGenerator;
