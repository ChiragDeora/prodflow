import React, { useState } from 'react';
import { FileText, Settings, Zap, Thermometer, Wind, Gauge, HardDrive } from 'lucide-react';

interface ChecklistType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  frequency: string;
  sections: string[];
}

const checklistTypes: ChecklistType[] = [
  {
    id: 'daily',
    name: 'Daily Check List',
    description: 'Daily inspection checklist for all equipment',
    icon: <FileText className="w-6 h-6" />,
    frequency: 'Daily',
    sections: ['Machine Check Point', 'Robot Check Point', 'Chiller Check Point', 'Compressor Check Point', 'Blower', 'Electrical Panel', 'Granulator']
  },
  {
    id: 'weekly-compressor',
    name: 'Weekly Compressor Check Sheet',
    description: 'Weekly compressor maintenance and inspection checklist',
    icon: <Wind className="w-6 h-6" />,
    frequency: 'Weekly',
    sections: ['Air Pressure Check', 'Oil Level Inspection', 'Temperature Monitoring', 'Leak Detection', 'Filter Status', 'Safety Systems']
  },
  {
    id: 'weekly-magnate',
    name: 'Weekly Magnate Check Sheet',
    description: 'Weekly magnate system inspection and maintenance',
    icon: <Zap className="w-6 h-6" />,
    frequency: 'Weekly',
    sections: ['Magnetic Field Check', 'Power Supply Verification', 'Temperature Monitoring', 'Safety Interlocks', 'Performance Testing']
  },
  {
    id: 'monthly-robot',
    name: 'Monthly Robot Check List',
    description: 'Monthly robot system comprehensive inspection',
    icon: <HardDrive className="w-6 h-6" />,
    frequency: 'Monthly',
    sections: ['Robot Movement Check', 'Gripper Function Test', 'Safety Systems', 'Programming Verification', 'Mechanical Inspection', 'Performance Analysis']
  },
  {
    id: 'monthly-machine',
    name: 'Monthly Machine Check List',
    description: 'Monthly machine comprehensive inspection and maintenance',
    icon: <Settings className="w-6 h-6" />,
    frequency: 'Monthly',
    sections: ['Mechanical Components', 'Electrical Systems', 'Hydraulic Systems', 'Safety Devices', 'Performance Metrics', 'Documentation Review']
  },
  {
    id: 'quarterly-machine',
    name: 'Quarterly Machine Check List',
    description: 'Quarterly comprehensive machine assessment and maintenance',
    icon: <Settings className="w-6 h-6" />,
    frequency: 'Quarterly',
    sections: ['Major Component Inspection', 'Efficiency Analysis', 'Upgrade Assessment', 'Safety Audit', 'Compliance Review', 'Performance Optimization']
  },
  {
    id: 'semi-annual-machine',
    name: 'Semi Annual Machine Check List',
    description: 'Semi-annual comprehensive machine inspection and maintenance',
    icon: <Settings className="w-6 h-6" />,
    frequency: 'Semi-Annual',
    sections: ['Comprehensive Inspection', 'Preventive Maintenance', 'Performance Analysis', 'Safety Systems', 'Documentation Audit', 'Training Verification']
  },
  {
    id: 'annual-machine',
    name: 'Annual Machine Check List',
    description: 'Annual comprehensive machine inspection and maintenance',
    icon: <Settings className="w-6 h-6" />,
    frequency: 'Annual',
    sections: ['Complete System Inspection', 'Major Overhaul Assessment', 'Performance Analysis', 'Safety Compliance', 'Documentation Review', 'Future Planning']
  },
  {
    id: 'pm-plan',
    name: 'PM Plan for 2022(SEP.)',
    description: 'Preventive Maintenance plan and schedule',
    icon: <FileText className="w-6 h-6" />,
    frequency: 'Planned',
    sections: ['Schedule Planning', 'Resource Allocation', 'Task Assignment', 'Timeline Management', 'Progress Tracking', 'Documentation']
  }
];

interface ChecklistTypesProps {
  onSelectType: (type: ChecklistType) => void;
  selectedType?: string;
}

const ChecklistTypes: React.FC<ChecklistTypesProps> = ({ onSelectType, selectedType }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {checklistTypes.map((type) => (
        <div
          key={type.id}
          onClick={() => onSelectType(type)}
          className={`p-6 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedType === type.id
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-lg ${
              selectedType === type.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {type.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{type.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{type.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {type.frequency}
                </span>
                <span className="text-xs text-gray-500">
                  {type.sections.length} sections
                </span>
              </div>
            </div>
          </div>
          
          {selectedType === type.id && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Sections:</h4>
              <div className="flex flex-wrap gap-1">
                {type.sections.map((section, index) => (
                  <span
                    key={index}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ChecklistTypes;
