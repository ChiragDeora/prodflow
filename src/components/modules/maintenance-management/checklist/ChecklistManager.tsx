import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, CheckCircle, AlertTriangle, FileText, Download, Upload, Save, Search, Filter, FileSpreadsheet, Grid, List } from 'lucide-react';
import MaintenanceChecklist from './index';
import ChecklistTypes from './ChecklistTypes';
import ChecklistForm from './ChecklistForm';
import ChecklistKanban from './ChecklistKanban';
import ExcelTemplateGenerator from './ExcelTemplateGenerator';
import ExcelFileReader from '../../../ExcelFileReader';
import ChecklistSections from './ChecklistSections';

interface ChecklistRecord {
  id: string;
  type: string;
  date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignedTo: string;
  completedBy?: string;
  completionDate?: string;
  sections: number;
  completedSections: number;
}

const ChecklistManager: React.FC = () => {
  const [activeView, setActiveView] = useState<'list' | 'kanban' | 'types' | 'templates' | 'daily-sections'>('kanban');
  const [selectedType, setSelectedType] = useState<string>('');
  const [checklists, setChecklists] = useState<ChecklistRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistRecord | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockChecklists: ChecklistRecord[] = [
      {
        id: '1',
        type: 'Daily Check List',
        date: '2024-01-15',
        status: 'completed',
        assignedTo: 'John Smith',
        completedBy: 'John Smith',
        completionDate: '2024-01-15',
        sections: 7,
        completedSections: 7
      },
      {
        id: '2',
        type: 'Weekly Compressor Check Sheet',
        date: '2024-01-14',
        status: 'in_progress',
        assignedTo: 'Mike Johnson',
        sections: 6,
        completedSections: 4
      },
      {
        id: '3',
        type: 'Weekly Magnate Check Sheet',
        date: '2024-01-13',
        status: 'completed',
        assignedTo: 'Sarah Wilson',
        completedBy: 'Sarah Wilson',
        completionDate: '2024-01-13',
        sections: 5,
        completedSections: 5
      },
      {
        id: '4',
        type: 'Monthly Robot Check List',
        date: '2024-01-10',
        status: 'pending',
        assignedTo: 'David Brown',
        sections: 6,
        completedSections: 0
      },
      {
        id: '5',
        type: 'Monthly Machine Check List',
        date: '2024-01-08',
        status: 'overdue',
        assignedTo: 'Lisa Chen',
        sections: 6,
        completedSections: 2
      },
      {
        id: '6',
        type: 'Quarterly Machine Check List',
        date: '2024-01-05',
        status: 'pending',
        assignedTo: 'Robert Wilson',
        sections: 6,
        completedSections: 0
      },
      {
        id: '7',
        type: 'Semi Annual Machine Check List',
        date: '2024-01-01',
        status: 'pending',
        assignedTo: 'Maria Garcia',
        sections: 6,
        completedSections: 0
      },
      {
        id: '8',
        type: 'Annual Machine Check List',
        date: '2023-12-15',
        status: 'completed',
        assignedTo: 'James Miller',
        completedBy: 'James Miller',
        completionDate: '2023-12-20',
        sections: 6,
        completedSections: 6
      },
      {
        id: '9',
        type: 'PM Plan for 2022(SEP.)',
        date: '2022-09-01',
        status: 'completed',
        assignedTo: 'Admin Team',
        completedBy: 'Admin Team',
        completionDate: '2022-12-31',
        sections: 6,
        completedSections: 6
      }
    ];
    setChecklists(mockChecklists);
  }, []);

  const filteredChecklists = checklists.filter(checklist => {
    const matchesSearch = checklist.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         checklist.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || checklist.status === statusFilter;
    const matchesType = typeFilter === 'all' || checklist.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertTriangle className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleCreateChecklist = (type: any) => {
    console.log('Creating checklist with type:', type);
    setSelectedType(type.id);
    setShowChecklistModal(true);
  };

  const handleOpenChecklist = (checklist: ChecklistRecord) => {
    // Show sections view for all checklist types
    setActiveView('daily-sections');
    setSelectedChecklist(checklist);
    setShowChecklistModal(false); // Ensure modal is closed when opening sections view
  };

  const handleDailySectionClick = (sectionId: string) => {
    // Create a mock checklist record for the specific section
    const sectionChecklist: ChecklistRecord = {
      id: sectionId,
      type: sectionId, // Use the sectionId directly as the type
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      assignedTo: 'Current User',
      sections: 1,
      completedSections: 0
    };
    setSelectedChecklist(sectionChecklist);
    setSelectedType(sectionId);
    setShowChecklistModal(true);
  };

  const handleExcelUpload = (data: any) => {
    console.log('Excel data received:', data);
    setShowExcelUpload(false);
    // TODO: Implement Excel import functionality
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? (completed / total) * 100 : 0;
  };



  if (activeView === 'types') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveView('list')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to List
              </button>
              <h2 className="text-xl font-semibold text-gray-900">Select Checklist Type</h2>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <ChecklistTypes
            onSelectType={handleCreateChecklist}
            selectedType={selectedType}
          />
        </div>
      </div>
    );
  }

  if (activeView === 'templates') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveView('list')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to List
              </button>
              <h2 className="text-xl font-semibold text-gray-900">Excel Template Generator</h2>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <ExcelTemplateGenerator />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Maintenance Checklists</h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setActiveView('kanban')}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  activeView === 'kanban'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-3 h-3 inline mr-1" />
                Kanban
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  activeView === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-3 h-3 inline mr-1" />
                List
              </button>
            </div>
            
            <button
              onClick={() => setActiveView('types')}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              New
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveView('templates')}
                className="text-gray-600 hover:text-gray-800 p-1.5 rounded hover:bg-gray-100"
                title="Templates"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowExcelUpload(true)}
                className="text-gray-600 hover:text-gray-800 p-1.5 rounded hover:bg-gray-100"
                title="Import Excel"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search checklists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Types</option>
              <option value="Daily Check List">Daily Check List</option>
              <option value="Weekly Compressor Check Sheet">Weekly Compressor</option>
              <option value="Weekly Magnate Check Sheet">Weekly Magnate</option>
              <option value="Monthly Robot Check List">Monthly Robot</option>
              <option value="Monthly Machine Check List">Monthly Machine</option>
              <option value="Quarterly Machine Check List">Quarterly Machine</option>
              <option value="Semi Annual Machine Check List">Semi Annual Machine</option>
              <option value="Annual Machine Check List">Annual Machine</option>
              <option value="PM Plan for 2022(SEP.)">PM Plan</option>
            </select>
            
            <button 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Clear
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeView === 'daily-sections' ? (
          <div className="h-full flex flex-col">
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setActiveView('list')}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    ← Back to List
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedChecklist?.type || 'Checklist Sections'}</h2>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <ChecklistSections
                checklistType={selectedChecklist?.type || ''}
                onSectionClick={handleDailySectionClick}
                onBack={() => setActiveView('list')}
              />
            </div>
          </div>
        ) : activeView === 'kanban' ? (
          <ChecklistKanban />
        ) : (
          <div className="space-y-4">
            {filteredChecklists.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No checklists found</p>
              </div>
            ) : (
              filteredChecklists.map((checklist) => (
              <div 
                key={checklist.id} 
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => handleOpenChecklist(checklist)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900">{checklist.type}</h3>
                        <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {checklist.date}
                          </span>
                          <span>• {checklist.assignedTo}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">
                          {checklist.completedSections} of {checklist.sections} sections
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(checklist.completedSections, checklist.sections)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(checklist.status)}`}>
                      {getStatusIcon(checklist.status)}
                      <span className="ml-1">{checklist.status.replace('_', ' ').charAt(0).toUpperCase() + checklist.status.replace('_', ' ').slice(1)}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        )}
      </div>

      {/* Excel Upload Modal */}
      {showExcelUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Import Excel File</h3>
            <ExcelFileReader
              onDataImported={handleExcelUpload}
              onClose={() => setShowExcelUpload(false)}
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

      {/* Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedChecklist ? 
                    selectedChecklist.type === 'daily-machine' ? 'IM Check List' :
                    selectedChecklist.type === 'daily-robot' ? 'Robot Check Point' :
                    selectedChecklist.type === 'daily-chiller' ? 'Chiller Check Point' :
                    selectedChecklist.type === 'daily-compressor' ? 'Compressor Check Point' :
                    selectedChecklist.type === 'daily-blower' ? 'Blower' :
                    selectedChecklist.type === 'daily-electrical' ? 'Electrical Panel' :
                    selectedChecklist.type === 'daily-granulator' ? 'Granulator' :
                    selectedChecklist.type : 
                    `New ${selectedType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Checklist`
                  }
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedChecklist ? `Date: ${selectedChecklist.date}` : 'Fill out the checklist below'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowChecklistModal(false);
                  setSelectedChecklist(null);
                  setSelectedType('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              <ChecklistForm
                checklistType={selectedChecklist ? 
                  selectedChecklist.type === 'Daily Check List' ? 'daily' :
                  selectedChecklist.type === 'daily-machine' ? 'daily-machine' :
                  selectedChecklist.type === 'daily-robot' ? 'daily-robot' :
                  selectedChecklist.type === 'daily-chiller' ? 'daily-chiller' :
                  selectedChecklist.type === 'daily-compressor' ? 'daily-compressor' :
                  selectedChecklist.type === 'daily-blower' ? 'daily-blower' :
                  selectedChecklist.type === 'daily-electrical' ? 'daily-electrical' :
                  selectedChecklist.type === 'daily-granulator' ? 'daily-granulator' :
                  selectedChecklist.type === 'Weekly Compressor Check Sheet' ? 'weekly-compressor' :
                  selectedChecklist.type === 'Weekly Magnate Check Sheet' ? 'weekly-magnate' :
                  selectedChecklist.type === 'Monthly Robot Check List' ? 'monthly-robot' :
                  selectedChecklist.type === 'Monthly Machine Check List' ? 'monthly-machine' :
                  selectedChecklist.type === 'Quarterly Machine Check List' ? 'quarterly-machine' :
                  selectedChecklist.type === 'Semi Annual Machine Check List' ? 'semi-annual-machine' :
                  selectedChecklist.type === 'Annual Machine Check List' ? 'annual-machine' :
                  selectedChecklist.type === 'PM Plan for 2022(SEP.)' ? 'pm-plan' : 'daily'
                  : selectedType}
                checklistData={selectedChecklist}
                onSave={(data) => {
                  console.log('Checklist saved:', data);
                  setShowChecklistModal(false);
                  setSelectedChecklist(null);
                  setSelectedType('');
                }}
                onClose={() => {
                  setShowChecklistModal(false);
                  setSelectedChecklist(null);
                  setSelectedType('');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistManager;
