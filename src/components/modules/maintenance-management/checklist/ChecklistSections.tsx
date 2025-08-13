import React, { useState, useEffect } from 'react';
import { FileText, Settings, HardDrive, Thermometer, Wind, Zap, Gauge, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface ChecklistSection {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed';
  completedItems: number;
  totalItems: number;
}

interface ChecklistSectionsProps {
  checklistType: string;
  onSectionClick: (sectionId: string) => void;
  onBack: () => void;
}

const ChecklistSections: React.FC<ChecklistSectionsProps> = ({ checklistType, onSectionClick, onBack }) => {
  const [sections, setSections] = useState<ChecklistSection[]>([]);

  useEffect(() => {
    const generateSections = () => {
      let sectionsData: ChecklistSection[] = [];

      switch (checklistType) {
        case 'Daily Check List':
          sectionsData = [
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
          break;

        case 'Weekly Compressor Check Sheet':
          sectionsData = [
            {
              id: 'weekly-compressor-air',
              name: 'Air Pressure Check',
              description: 'Check air pressure levels and systems',
              icon: <Wind className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 3
            },
            {
              id: 'weekly-compressor-oil',
              name: 'Oil Level Inspection',
              description: 'Inspect oil levels and quality',
              icon: <Gauge className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 2
            },
            {
              id: 'weekly-compressor-temp',
              name: 'Temperature Monitoring',
              description: 'Monitor operating temperatures',
              icon: <Thermometer className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 3
            },
            {
              id: 'weekly-compressor-leak',
              name: 'Leak Detection',
              description: 'Check for air and oil leaks',
              icon: <AlertTriangle className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 2
            },
            {
              id: 'weekly-compressor-filter',
              name: 'Filter Status',
              description: 'Inspect and clean filters',
              icon: <Settings className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 2
            },
            {
              id: 'weekly-compressor-safety',
              name: 'Safety Systems',
              description: 'Test safety systems and alarms',
              icon: <CheckCircle className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 3
            }
          ];
          break;

        case 'Weekly Magnate Check Sheet':
          sectionsData = [
            {
              id: 'weekly-magnate-field',
              name: 'Magnetic Field Check',
              description: 'Verify magnetic field strength and stability',
              icon: <Zap className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 4
            },
            {
              id: 'weekly-magnate-power',
              name: 'Power Supply Verification',
              description: 'Check power supply and connections',
              icon: <Gauge className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 3
            },
            {
              id: 'weekly-magnate-temp',
              name: 'Temperature Monitoring',
              description: 'Monitor system temperatures',
              icon: <Thermometer className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 2
            },
            {
              id: 'weekly-magnate-safety',
              name: 'Safety Interlocks',
              description: 'Test safety interlocks and emergency stops',
              icon: <CheckCircle className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 3
            },
            {
              id: 'weekly-magnate-performance',
              name: 'Performance Testing',
              description: 'Run performance tests and calibrations',
              icon: <Settings className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 4
            }
          ];
          break;

        case 'Monthly Robot Check List':
          sectionsData = [
            {
              id: 'monthly-robot-movement',
              name: 'Robot Movement Check',
              description: 'Test robot movement and positioning accuracy',
              icon: <HardDrive className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 5
            },
            {
              id: 'monthly-robot-gripper',
              name: 'Gripper Function Test',
              description: 'Test gripper functionality and grip strength',
              icon: <Settings className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 4
            },
            {
              id: 'monthly-robot-safety',
              name: 'Safety Systems',
              description: 'Verify all safety systems and sensors',
              icon: <CheckCircle className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 6
            },
            {
              id: 'monthly-robot-programming',
              name: 'Programming Verification',
              description: 'Check programming and control systems',
              icon: <FileText className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 3
            },
            {
              id: 'monthly-robot-mechanical',
              name: 'Mechanical Inspection',
              description: 'Inspect mechanical components and wear',
              icon: <Settings className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 4
            },
            {
              id: 'monthly-robot-performance',
              name: 'Performance Analysis',
              description: 'Analyze performance metrics and efficiency',
              icon: <Gauge className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 3
            }
          ];
          break;

        case 'Monthly Machine Check List':
          sectionsData = [
            {
              id: 'monthly-machine-mechanical',
              name: 'Mechanical Components',
              description: 'Inspect mechanical parts and assemblies',
              icon: <Settings className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 6
            },
            {
              id: 'monthly-machine-electrical',
              name: 'Electrical Systems',
              description: 'Check electrical systems and wiring',
              icon: <Zap className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 5
            },
            {
              id: 'monthly-machine-hydraulic',
              name: 'Hydraulic Systems',
              description: 'Inspect hydraulic systems and pressure',
              icon: <Gauge className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 4
            },
            {
              id: 'monthly-machine-safety',
              name: 'Safety Devices',
              description: 'Test safety devices and emergency systems',
              icon: <CheckCircle className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 5
            },
            {
              id: 'monthly-machine-performance',
              name: 'Performance Metrics',
              description: 'Measure and record performance metrics',
              icon: <Gauge className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 4
            },
            {
              id: 'monthly-machine-documentation',
              name: 'Documentation Review',
              description: 'Review and update documentation',
              icon: <FileText className="w-6 h-6" />,
              status: 'pending',
              completedItems: 0,
              totalItems: 3
            }
          ];
          break;

        default:
          sectionsData = [];
      }
      setSections(sectionsData);
    };

    generateSections();
  }, [checklistType]);

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
      {/* Page Description */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{checklistType}</h1>
        <p className="text-gray-600">Select a section to complete the checklist</p>
      </div>

      {/* Sections Grid */}
      <div className="flex-1">
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

export default ChecklistSections;
