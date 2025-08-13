import React, { useState, useEffect } from 'react';
import { FileText, Settings, HardDrive, Thermometer, Wind, Zap, Gauge, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface DailySection {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed';
  completedItems: number;
  totalItems: number;
}

interface DailyChecklistSectionsProps {
  onSectionClick: (sectionId: string) => void;
  onBack: () => void;
}

const DailyChecklistSections: React.FC<DailyChecklistSectionsProps> = ({ onSectionClick, onBack }) => {
  const [sections, setSections] = useState<DailySection[]>([]);

  useEffect(() => {
    // Initialize daily checklist sections
    const dailySections: DailySection[] = [
      {
        id: 'daily-machine',
        name: 'IM Check List',
        description: 'Daily IM machine inspection and maintenance checks',
        icon: <Settings className="w-6 h-6" />,
        status: 'pending',
        completedItems: 0,
        totalItems: 6
      },
      {
        id: 'daily-robot',
        name: 'Robot Check Point',
        description: 'Robot system inspection and maintenance',
        icon: <HardDrive className="w-6 h-6" />,
        status: 'pending',
        completedItems: 0,
        totalItems: 4
      },
      {
        id: 'daily-chiller',
        name: 'Chiller Check Point',
        description: 'Chiller system temperature and water level checks',
        icon: <Thermometer className="w-6 h-6" />,
        status: 'pending',
        completedItems: 0,
        totalItems: 4
      },
      {
        id: 'daily-compressor',
        name: 'Compressor Check Point',
        description: 'Air compressor system inspection',
        icon: <Wind className="w-6 h-6" />,
        status: 'pending',
        completedItems: 0,
        totalItems: 5
      },
      {
        id: 'daily-blower',
        name: 'Blower',
        description: 'Blower system filter and performance checks',
        icon: <Zap className="w-6 h-6" />,
        status: 'pending',
        completedItems: 0,
        totalItems: 1
      },
      {
        id: 'daily-electrical',
        name: 'Electrical Panel',
        description: 'Electrical panel connections and safety checks',
        icon: <Gauge className="w-6 h-6" />,
        status: 'pending',
        completedItems: 0,
        totalItems: 3
      },
      {
        id: 'daily-granulator',
        name: 'Granulator',
        description: 'Granulator safety and performance checks',
        icon: <Settings className="w-6 h-6" />,
        status: 'pending',
        completedItems: 0,
        totalItems: 2
      }
    ];
    setSections(dailySections);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? (completed / total) * 100 : 0;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Checklists
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Daily Check List</h1>
              <p className="text-sm text-gray-600">Select a section to complete the daily checklist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    {section.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-500">
                    {section.completedItems} of {section.totalItems} items
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage(section.completedItems, section.totalItems)}%` }}
                  ></div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(section.status)}`}>
                  {getStatusIcon(section.status)}
                  <span className="ml-1">{section.status.replace('_', ' ').charAt(0).toUpperCase() + section.status.replace('_', ' ').slice(1)}</span>
                </span>
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyChecklistSections;
