'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, FileText, Upload, Download, Search, Filter, 
  ChevronRight, ChevronDown, CheckCircle, AlertTriangle,
  Plus, Edit, Trash2, Eye, Settings, Link, Package
} from 'lucide-react';
import { Line, Machine, MaintenanceChecklist, MaintenanceTask } from '../../../lib/supabase';
import { maintenanceChecklistAPI, maintenanceTaskAPI } from '../../../lib/supabase';
import ExcelFileReader from '../../ExcelFileReader';
import RobotChecklistExecutor from './RobotChecklistExecutor';

interface LineChecklistsProps {
  linesMaster: Line[];
  machinesMaster: Machine[];
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: { id: string; name: string; description?: string; location?: string; status: 'Active' | 'Inactive' | 'Maintenance'; created_at?: string; updated_at?: string; }[];
}

interface LineChecklistData {
  line_id: string;
  line_name: string;
  description: string;
  status: string;
  machines: {
    machine_id: string;
    machine_name: string;
    category: string;
    checklists: MaintenanceChecklist[];
  }[];
  total_checklists: number;
  completed_checklists: number;
}

const LineChecklists: React.FC<LineChecklistsProps> = ({
  linesMaster,
  machinesMaster,
  unitManagementEnabled,
  defaultUnit,
  units
}) => {
  // Calculate line status based on machine assignments
  const calculateLineStatus = (line: Line) => {
    const hasAllMachines = line.im_machine_id && 
                          line.robot_machine_id && 
                          line.conveyor_machine_id && 
                          line.hoist_machine_id;
    return hasAllMachines ? 'Active' : 'Inactive';
  };
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [checklists, setChecklists] = useState<MaintenanceChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExcelReader, setShowExcelReader] = useState(false);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedChecklist, setSelectedChecklist] = useState<{
    checklist: MaintenanceChecklist;
    line: Line;
    machine: Machine;
  } | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<{
    machine: Machine;
    line: Line;
  } | null>(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [showMaintenanceHistory, setShowMaintenanceHistory] = useState(false);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [selectedLineForDetails, setSelectedLineForDetails] = useState<Line | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [historyFilters, setHistoryFilters] = useState({
    frequency: 'all',
    status: 'all',
    storage: 'all'
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceType: '',
    completedTasks: [] as string[],
    taskNotes: {} as Record<string, string>, // Individual notes for each task
    notes: '',
    performedBy: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [showTaskNotes, setShowTaskNotes] = useState<Record<string, boolean>>({});

  // Define frequency options for checklists
  const frequencyOptions = [
    { value: 'monthly', label: 'Monthly', description: 'Monthly maintenance checks' },
    { value: 'quarterly', label: 'Quarterly', description: 'Quarterly maintenance checks' },
    { value: 'semi-annual', label: 'Semi Annual', description: 'Semi-annual maintenance checks' },
    { value: 'annual', label: 'Annual', description: 'Annual maintenance checks' },
    { value: 'emergency', label: 'Emergency', description: 'Emergency maintenance checks' }
  ];

  // Define different maintenance types with their specific forms
  const maintenanceTypes = {
    'monthly': {
      name: 'Monthly Machine Check List',
      description: 'Monthly IM machine inspection and maintenance checklist',
      tasks: [
        'Check power supply voltage and Ground wire - Measure voltage variation in a day (within +/- % of voltage rating)',
        'Automatic grease lubrication device - Check the lubricated condition check the grease cartridge',
        'Cooling water strainer - check if the strainer is clean and functioning properly'
      ],

      frequency: 'Monthly'
    },
    'quarterly': {
      name: 'Quarterly Machine Check List',
      description: 'Quarterly IM machine deep inspection and maintenance checklist',
      tasks: [
        'Ball Screw - Lubricated condition check for contamination and scoring',
        'Servomotor cooling fan - Check if the fans are not dirty',
        'Inspection of Mold Thickness Adjustment - Inspection is required if the some mold has been used and the mold thickness value has not been changed for long period',
        'Band Heater - Check for looseness of the fitting bolts',
        'Thermocouple - Check fit condition of thermocouples'
      ],

      frequency: 'Quarterly'
    },
    'semi-annual': {
      name: 'Semi Annual Machine Check List',
      description: 'Semi-annual IM machine comprehensive inspection and maintenance checklist',
      tasks: [
        'Timing Belt - Wear, Crack or Swell',
        'Control panel inside - Looseness of connecting terminal, Deposited dust and resin power, Intrusion of water and oil, Filter of cooling air inlet part',
        'Mold thickness adjusting Motor - Abnormal heating, Abnormal noise order',
        'Bearing casing for plasticization (2300H or higher) - Contamination of lubrication oil and oil level: OIL Lick',
        'Barrel head - Mounting bolts to the heating barrel',
        'Nozzle - Looseness',
        'Plasticizing reduction unit (2300H or higher) - Contamination of lubrication and lubrication level: lubrication Lick'
      ],

      frequency: 'Semi-Annual'
    },
    'annual': {
      name: 'Annual Machine Check List',
      description: 'Annual IM machine comprehensive inspection and maintenance checklist',
      tasks: [
        'Bed - Measurement of levelness',
        'Wiring around the machine - check for wear and breakage of cable covering due to contact with moving parts',
        'Controller battery - Replace every 3 years',
        'Brreal head mounting bolt - Check for seizure',
        'Linear guide for shifting the injection unit - Lubricate',
        'Lead - acid battery - Replacement of the battery unit for power failure prevention',
        'Platen - Measurement of levelness',
        'Bearing casing for plasticization (2300h higher) - Replace the lubrication'
      ],

      frequency: 'Annual'
    },
    'emergency': {
      name: 'Emergency Repair',
      description: 'Urgent repair due to breakdown or malfunction',
      tasks: [
        'Assess emergency situation and safety',
        'Isolate and secure affected area',
        'Diagnose root cause of problem',
        'Perform necessary repairs',
        'Test system functionality',
        'Verify safety systems',
        'Document emergency repair',
        'Update maintenance schedule'
      ],

      frequency: 'As needed'
    }
  };

  useEffect(() => {
    loadChecklists();
    loadMaintenanceTasks();
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('LineChecklists component mounted');
    console.log('Lines Master:', linesMaster);
    console.log('Machines Master:', machinesMaster);
  }, [linesMaster, machinesMaster]);

  const loadChecklists = async () => {
    try {
      setLoading(true);
      const checklistsData = await maintenanceChecklistAPI.getAll();
      setChecklists(checklistsData);
      console.log('📋 Loaded checklists from database:', checklistsData.length);
    } catch (error) {
      console.error('Failed to load checklists:', error);
      setChecklists([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceTasks = async () => {
    try {
      // Try to load from database first
      const tasksData = await maintenanceTaskAPI.getAll();
      
      // Also load from local storage as fallback
      const localTasks = JSON.parse(localStorage.getItem('maintenance_tasks_local') || '[]');
      
      // Filter out placeholder data and combine both sources
      const realTasksData = tasksData.filter(task => 
        task.title && 
        !task.title.includes('Sample') && 
        !task.title.includes('Placeholder') &&
        !task.title.includes('Daily Maintenance - JSW-1') &&
        !task.title.includes('Line Maintenance - LINE-001') &&
        !task.title.includes('Emergency Repair - Hydraulic System')
      );
      const allTasks = [...realTasksData, ...localTasks];
      setMaintenanceTasks(allTasks);
      
      console.log('📊 Loaded maintenance tasks:', {
        database: tasksData.length,
        real_database: realTasksData.length,
        local: localTasks.length,
        total: allTasks.length
      });
    } catch (error) {
      console.error('Failed to load maintenance tasks from database:', error);
      
      // Fallback to local storage only
      const localTasks = JSON.parse(localStorage.getItem('maintenance_tasks_local') || '[]');
      setMaintenanceTasks(localTasks);
      
      console.log('📊 Loaded maintenance tasks from local storage only:', localTasks.length);
    }
  };

  const saveMaintenanceLog = async (formData: any) => {
    try {
      console.log('🔍 Attempting to save maintenance log with data:', {
        formData,
        selectedMachine: selectedMachine?.machine,
        selectedLine: selectedMachine?.line
      });

      const selectedMaintenanceType = maintenanceTypes[selectedFrequency as keyof typeof maintenanceTypes];
      const maintenanceTask: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'> = {
        title: `${selectedMaintenanceType?.name || selectedFrequency} - ${selectedMachine?.machine.machine_id}`,
        description: `${selectedMaintenanceType?.description || 'Maintenance performed'} on ${selectedMachine?.machine.machine_id} in ${selectedMachine?.line.line_id}`,
        task_type: selectedFrequency === 'emergency' ? 'emergency' : 'preventive',
        priority: selectedFrequency === 'emergency' ? 'critical' : 
                 selectedFrequency === 'annual' ? 'high' : 'medium',
        status: 'completed',
        machine_id: selectedMachine?.machine.machine_id || undefined,
        line_id: selectedMachine?.line.line_id || undefined,
        unit: 'Unit 1',
        assigned_to: formData.performedBy,
        assigned_by: 'System',
        due_date: formData.date,
        completed_at: new Date().toISOString(),
        checklist_items: formData.completedTasks,
        notes: formData.notes
      };

      console.log('📝 Maintenance task object to save:', maintenanceTask);

      // Try to save to database first
      try {
        const savedTask = await maintenanceTaskAPI.create(maintenanceTask);
        if (savedTask) {
          console.log('✅ Maintenance log saved successfully to database:', savedTask);
          // Reload maintenance tasks to show the new entry
          await loadMaintenanceTasks();
          return true;
        }
      } catch (dbError) {
        console.warn('⚠️ Database save failed, trying fallback approach:', dbError);
        
        // Fallback: Save to local storage as backup
        const fallbackTask = {
          ...maintenanceTask,
          id: `local_${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Get existing local tasks
        const existingLocalTasks = JSON.parse(localStorage.getItem('maintenance_tasks_local') || '[]');
        existingLocalTasks.push(fallbackTask);
        localStorage.setItem('maintenance_tasks_local', JSON.stringify(existingLocalTasks));
        
        console.log('✅ Maintenance log saved to local storage as fallback:', fallbackTask);
        
        // Update local state to show the new entry
        setMaintenanceTasks(prev => [...prev, fallbackTask as MaintenanceTask]);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to save maintenance log:', error);
      console.error('❌ Error details:', {
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code
      });
      return false;
    }
  };



  const getLineChecklistData = (line: Line): LineChecklistData => {
    const lineMachines = getMachinesInLine(line);
    const lineChecklists = checklists.filter(c => c.line_id === line.line_id);
    
    const machinesWithChecklists = lineMachines.map(machine => {
      const machineChecklists = checklists.filter(c => c.machine_id === machine.machine_id);
      return {
        machine_id: machine.machine_id,
        machine_name: `${machine.make} ${machine.model}`,
        category: machine.category,
        checklists: machineChecklists
      };
    });

    // Filter out placeholder data
    const realChecklists = machinesWithChecklists.map(machine => ({
      ...machine,
      checklists: machine.checklists.filter(c => 
        c.name && 
        !c.name.includes('Sample') && 
        !c.name.includes('Placeholder') &&
        !c.name.includes('Daily maintenance checklist') &&
        !c.name.includes('Comprehensive line maintenance')
      )
    }));

    const totalChecklists = realChecklists.reduce((sum, machine) => sum + machine.checklists.length, 0);
    const completedChecklists = realChecklists.reduce((sum, machine) => 
      sum + machine.checklists.filter(c => c.items && Array.isArray(c.items) && 
        c.items.every((item: any) => item.completed)).length, 0);

    return {
      line_id: line.line_id,
      line_name: line.line_id,
      description: line.description || '',
      status: line.status,
      machines: realChecklists,
      total_checklists: totalChecklists,
      completed_checklists: completedChecklists
    };
  };

  const getMachinesInLine = (line: Line): Machine[] => {
    const machineIds = [
      line.im_machine_id,
      line.robot_machine_id,
      line.conveyor_machine_id,
      line.hoist_machine_id
    ].filter(Boolean);

    return machinesMaster.filter(machine => machineIds.includes(machine.machine_id));
  };

  const getCalculatedLineStatus = (line: Line): string => {
    // Use the same calculation logic as other components
    return calculateLineStatus(line);
  };

  const toggleLineExpansion = (lineId: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
    } else {
      newExpanded.add(lineId);
    }
    setExpandedLines(newExpanded);
  };

  const filteredLines = linesMaster.filter(line => {
    const matchesSearch = line.line_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (line.description && line.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || line.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExcelUpload = (data: any[]) => {
    // Process Excel data and create checklists
    console.log('Excel data received:', data);
    // TODO: Implement Excel data processing
    setShowExcelReader(false);
    // Reload checklists after upload
    loadChecklists();
  };

  const handleChecklistSelect = (checklist: MaintenanceChecklist, line: Line, machine: Machine) => {
    setSelectedChecklist({ checklist, line, machine });
  };

  const handleChecklistComplete = (checklistId: string) => {
    // Reload checklists after completion
    loadChecklists();
    setSelectedChecklist(null);
  };

  const handleChecklistSave = (checklistId: string, updatedItems: any[]) => {
    // Update local state
    setChecklists(prev => prev.map(c => 
      c.id === checklistId ? { ...c, items: updatedItems } : c
    ));
  };

  const openExcelReader = () => {
    setShowExcelReader(true);
  };

  const openMaintenanceModal = (machine: Machine, line: Line) => {
    setSelectedMachine({ machine, line });
    setShowMaintenanceModal(true);
  };

  const closeMaintenanceModal = () => {
    setShowMaintenanceModal(false);
    setSelectedMachine(null);
    setShowTaskNotes({});
    setMaintenanceForm({
      maintenanceType: '',
      completedTasks: [],
      taskNotes: {},
      notes: '',
      performedBy: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const openViewDetails = (line: Line) => {
    setSelectedLineForDetails(line);
    setShowViewDetails(true);
  };

  const closeViewDetails = () => {
    setShowViewDetails(false);
    setSelectedLineForDetails(null);
  };

  const handleFrequencySelect = (frequency: string) => {
    setSelectedFrequency(frequency);
  };

  const handleAddChecklist = (line: Line) => {
    if (!selectedFrequency) {
      alert('Please select a frequency first');
      return;
    }
    // TODO: Implement add checklist functionality
    console.log('Adding checklist for line:', line.line_id, 'with frequency:', selectedFrequency);
    alert(`Adding ${selectedFrequency} checklist for ${line.line_id}`);
  };

  const handleSelectAllTasks = () => {
    if (!selectedFrequency || !maintenanceTypes[selectedFrequency as keyof typeof maintenanceTypes]) {
      return;
    }

    const allTasks = maintenanceTypes[selectedFrequency as keyof typeof maintenanceTypes].tasks;
    const allSelected = maintenanceForm.completedTasks.length === allTasks.length;

    if (allSelected) {
      // Unselect all
      setMaintenanceForm(prev => ({ ...prev, completedTasks: [] }));
    } else {
      // Select all
      setMaintenanceForm(prev => ({ ...prev, completedTasks: [...allTasks] }));
    }
  };

  const toggleTaskNote = (task: string) => {
    setShowTaskNotes(prev => ({
      ...prev,
      [task]: !prev[task]
    }));
  };

  const updateTaskNote = (task: string, note: string) => {
    setMaintenanceForm(prev => ({
      ...prev,
      taskNotes: {
        ...prev.taskNotes,
        [task]: note
      }
    }));
  };

  const getFilteredMaintenanceTasks = () => {
    return maintenanceTasks.filter(task => {
      // Filter by frequency
      if (historyFilters.frequency !== 'all') {
        const taskFrequency = task.title.toLowerCase().split(' ')[0]; // Extract frequency from title
        if (taskFrequency !== historyFilters.frequency) return false;
      }
      
      // Filter by status
      if (historyFilters.status !== 'all') {
        if (task.status !== historyFilters.status) return false;
      }
      
      // Filter by storage type
      if (historyFilters.storage !== 'all') {
        const isLocal = task.id?.startsWith('local_');
        if (historyFilters.storage === 'local' && !isLocal) return false;
        if (historyFilters.storage === 'database' && isLocal) return false;
      }
      
      return true;
    });
  };

  const clearMaintenanceHistory = async () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to clear ALL maintenance history?\n\n' +
      'This will delete:\n' +
      '• All maintenance records from the database\n' +
      '• All local storage maintenance records\n' +
      '• This action cannot be undone\n\n' +
      'Click OK to proceed or Cancel to abort.'
    );

    if (!confirmed) return;

    try {
      // Clear from database
      try {
        const allTasks = await maintenanceTaskAPI.getAll();
        for (const task of allTasks) {
          await maintenanceTaskAPI.delete(task.id);
        }
        console.log('✅ Cleared maintenance tasks from database');
      } catch (dbError) {
        console.warn('⚠️ Could not clear database records:', dbError);
      }

      // Clear from local storage
      localStorage.removeItem('maintenance_tasks_local');
      console.log('✅ Cleared maintenance tasks from local storage');

      // Update local state
      setMaintenanceTasks([]);
      
      // Show success message
      alert('✅ Maintenance history cleared successfully!\n\nAll maintenance records have been removed from both database and local storage.');
      
    } catch (error) {
      console.error('❌ Failed to clear maintenance history:', error);
      alert('❌ Failed to clear maintenance history. Please check the console for details.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-600 bg-green-50 border-green-200';
      case 'Idle': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'Maintenance': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Mixed': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = (completed: number, total: number) => {
    if (total === 0) return 'text-gray-400';
    const percentage = (completed / total) * 100;
    if (percentage === 100) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Line Maintenance Checklists</h1>
            <p className="text-gray-600">Manage maintenance checklists for all production lines and their machines</p>
          </div>
          <div className="flex space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Frequency:</label>
              <select
                value={selectedFrequency}
                onChange={(e) => handleFrequencySelect(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Select Frequency</option>
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative group">
              <button
                onClick={openExcelReader}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Data
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="py-1">
                  <button
                    onClick={openExcelReader}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Excel File
                  </button>
                  <button
                    onClick={() => {
                      alert('Sample data feature removed. Please use the maintenance logging system instead.');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Load Sample Data (Disabled)
                  </button>
                  <button
                    onClick={() => {
                      console.log('CSV upload not implemented yet');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Upload CSV File
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowMaintenanceHistory(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Eye className="w-4 h-4 mr-2" />
              View History ({maintenanceTasks.length})
            </button>
            <button
              onClick={async () => {
                try {
                  // Export all maintenance data
                  const exportData = {
                    lines: linesMaster.map(line => {
                      const lineMachines = getMachinesInLine(line);
                      const lineMaintenanceTasks = maintenanceTasks.filter(task => task.line_id === line.line_id);
                      
                      return {
                        line_id: line.line_id,
                        line_description: line.description,
                        line_status: line.status,
                        machines: lineMachines.map(machine => ({
                          machine_id: machine.machine_id,
                          make: machine.make,
                          model: machine.model,
                          category: machine.category,
                          status: machine.status,
                          maintenance_tasks: lineMaintenanceTasks.filter(task => task.machine_id === machine.machine_id)
                        })),
                        total_maintenance_tasks: lineMaintenanceTasks.length,
                        last_maintenance: lineMaintenanceTasks.length > 0 ? 
                          new Date(Math.max(...lineMaintenanceTasks.map(task => new Date(task.completed_at || task.created_at || '').getTime()))).toISOString() : null
                      };
                    }),
                    export_date: new Date().toISOString(),
                    total_lines: linesMaster.length,
                    total_machines: machinesMaster.length,
                    total_maintenance_records: maintenanceTasks.length
                  };

                  // Create and download JSON file
                  const dataStr = JSON.stringify(exportData, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `maintenance_export_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);

                  console.log('📊 Maintenance data exported successfully:', exportData);
                  alert(`✅ Maintenance data exported successfully!\n\nExported ${exportData.total_lines} lines, ${exportData.total_machines} machines, and ${exportData.total_maintenance_records} maintenance records.`);
                } catch (error) {
                  console.error('❌ Export failed:', error);
                  alert(`❌ Export failed!\n\nError: ${(error as any)?.message || 'Unknown error'}`);
                }
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Lines</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search lines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Idle">Idle</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Robot Checklist Executor */}
      {selectedChecklist && (
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4">
            <button
              onClick={() => setSelectedChecklist(null)}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Back to Lines
            </button>
          </div>
          <RobotChecklistExecutor
            checklist={selectedChecklist.checklist}
            line={selectedChecklist.line}
            machine={selectedChecklist.machine}
            onComplete={handleChecklistComplete}
            onSave={handleChecklistSave}
          />
        </div>
      )}

      {/* Lines Grid */}
      {!selectedChecklist && (
        <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading checklists...</span>
          </div>
        ) : filteredLines.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No lines found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-4">

            
            {filteredLines.map((line) => {
              const lineData = getLineChecklistData(line);
              const calculatedStatus = getCalculatedLineStatus(line);
              const isExpanded = expandedLines.has(line.line_id);
              
              return (
                <div key={line.line_id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Line Header */}
                  <div 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    onClick={() => toggleLineExpansion(line.line_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button className="text-gray-400 hover:text-gray-600">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{lineData.line_name}</h3>
                          <p className="text-sm text-gray-500">{lineData.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(calculatedStatus)}`}>
                          {calculatedStatus}
                        </span>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getProgressColor(lineData.completed_checklists, lineData.total_checklists)}`}>
                            {lineData.completed_checklists} / {lineData.total_checklists} Checklists
                          </div>
                          <div className="text-xs text-gray-500">
                            {lineData.machines.length} Machines • Frequency-based
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-6">
                        <div className="mb-4">
                          <h4 className="text-md font-semibold text-gray-900 mb-2">Machines in {lineData.line_name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {lineData.machines.map((machine) => (
                              <div key={machine.machine_id} className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-gray-900">{machine.machine_id}</h5>
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {machine.category}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{machine.machine_name}</p>
                                <div className="space-y-2">
                                  <div className="text-xs text-gray-500">
                                    <p>• Ready for maintenance logging</p>
                                    <p>• Click "Log Maintenance" to start</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    // Find the actual machine object from machinesMaster
                                    const actualMachine = machinesMaster.find(m => m.machine_id === machine.machine_id);
                                    if (actualMachine) {
                                      openMaintenanceModal(actualMachine, line);
                                    }
                                  }}
                                  className="mt-3 w-full text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 flex items-center justify-center"
                                >
                                  <Wrench className="w-3 h-3 mr-1" />
                                  Log Maintenance
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600">
                            Total: {lineData.total_checklists} checklists across {lineData.machines.length} machines
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleAddChecklist(line)}
                              className={`text-xs px-3 py-1 rounded ${
                                selectedFrequency 
                                  ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                              }`}
                              disabled={!selectedFrequency}
                            >
                              Add Checklist
                            </button>
                            <button 
                              onClick={() => openViewDetails(line)}
                              className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* Maintenance Log Modal */}
      {showMaintenanceModal && selectedMachine && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-5 mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Log Maintenance - {selectedMachine.machine.machine_id}
                </h3>
                <button
                  onClick={closeMaintenanceModal}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Machine Info & Form */}
              <div className="space-y-6">
                {/* Machine Info */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Machine Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-base">
                    <div>
                      <span className="text-gray-600">Machine ID:</span>
                      <span className="ml-2 font-medium">{selectedMachine.machine.machine_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Line:</span>
                      <span className="ml-2 font-medium">{selectedMachine.line.line_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">{selectedMachine.machine.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Model:</span>
                      <span className="ml-2 font-medium">{selectedMachine.machine.model}</span>
                    </div>
                  </div>
                </div>

                  {/* Maintenance Type Info */}
                  {selectedFrequency && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-blue-900 mb-2">
                        {frequencyOptions.find(opt => opt.value === selectedFrequency)?.label} Maintenance
                      </h4>
                      <p className="text-base text-blue-700 mb-2">
                        {frequencyOptions.find(opt => opt.value === selectedFrequency)?.description}
                      </p>
                      <div className="text-base text-blue-600">
                        <span className="font-medium">Frequency:</span> {frequencyOptions.find(opt => opt.value === selectedFrequency)?.label}
                      </div>
                    </div>
                  )}

                  {!selectedFrequency && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <p className="text-base text-yellow-700">
                        ⚠️ Please select a maintenance frequency from the header dropdown first.
                      </p>
                    </div>
                  )}

                  {/* Notes and Personnel */}
                <div className="space-y-4">
                  <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Notes
                    </label>
                      <textarea
                        rows={4}
                        value={maintenanceForm.notes}
                        onChange={(e) => setMaintenanceForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add any additional notes or observations..."
                      />
                  </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-base font-medium text-gray-700 mb-2">
                          Performed By
                        </label>
                        <input
                          type="text"
                          value={maintenanceForm.performedBy}
                          onChange={(e) => setMaintenanceForm(prev => ({ ...prev, performedBy: e.target.value }))}
                          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Technician name"
                        />
                        </div>
                        <div>
                        <label className="block text-base font-medium text-gray-700 mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={maintenanceForm.date}
                          onChange={(e) => setMaintenanceForm(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        </div>
                      </div>
                    </div>
                </div>

                {/* Right Column - Maintenance Tasks */}
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-lg font-semibold text-gray-900">
                      Maintenance Tasks
                        {selectedFrequency && (
                          <span className="text-base text-gray-500 ml-2">
                            ({maintenanceForm.completedTasks.length} of {maintenanceTypes[selectedFrequency as keyof typeof maintenanceTypes]?.tasks.length || 0} completed)
                        </span>
                      )}
                    </label>
                      {selectedFrequency && maintenanceTypes[selectedFrequency as keyof typeof maintenanceTypes] && (
                        <button
                          onClick={handleSelectAllTasks}
                          className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          {maintenanceForm.completedTasks.length === maintenanceTypes[selectedFrequency as keyof typeof maintenanceTypes].tasks.length ? 'Unselect All' : 'Select All'}
                        </button>
                      )}
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {selectedFrequency && maintenanceTypes[selectedFrequency as keyof typeof maintenanceTypes] ? (
                        <div className="grid grid-cols-1 gap-3">
                          {maintenanceTypes[selectedFrequency as keyof typeof maintenanceTypes].tasks.map((task, index) => (
                            <div key={index} className="bg-white rounded-lg border border-gray-200 hover:bg-blue-50 transition-colors">
                              <div className="p-3">
                                <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={maintenanceForm.completedTasks.includes(task)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMaintenanceForm(prev => ({
                                    ...prev,
                                    completedTasks: [...prev.completedTasks, task]
                                  }));
                                } else {
                                  setMaintenanceForm(prev => ({
                                    ...prev,
                                    completedTasks: prev.completedTasks.filter(t => t !== task)
                                  }));
                                }
                              }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1 w-5 h-5"
                                  />
                                  <span className="ml-3 text-base text-gray-700 leading-relaxed flex-1">{task}</span>
                                  <button
                                    onClick={() => toggleTaskNote(task)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 ml-2"
                                    title="Add note for this task"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                    </div>
                                
                                {/* Note indicator */}
                                {maintenanceForm.taskNotes[task] && (
                                  <div className="mt-2 ml-8">
                                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                      Note added
                                    </span>
                  </div>
                                )}
                                
                                {/* Individual task note input */}
                                {showTaskNotes[task] && (
                                  <div className="mt-2 ml-8">
                    <textarea
                                      value={maintenanceForm.taskNotes[task] || ''}
                                      onChange={(e) => updateTaskNote(task, e.target.value)}
                                      placeholder="Add specific notes for this task..."
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                      rows={2}
                    />
                  </div>
                                )}
                    </div>
                    </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-base text-gray-500 italic text-center py-8">Please select a maintenance frequency from the header to see available tasks</p>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

                {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 mt-6 border-t border-gray-200">
                  <button
                    onClick={closeMaintenanceModal}
                  className="px-6 py-3 text-base font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                    if (!selectedFrequency) {
                      alert('Please select a maintenance frequency from the header dropdown first');
                        return;
                      }
                      if (!maintenanceForm.performedBy) {
                        alert('Please enter the technician name in "Performed By" field');
                        return;
                      }
                      if (maintenanceForm.completedTasks.length === 0) {
                        alert('Please complete at least one maintenance task');
                        return;
                      }
                      
                      const success = await saveMaintenanceLog(maintenanceForm);
                      if (success) {
                        alert('✅ Maintenance log saved successfully!\n\nNote: If database connection failed, the data was saved locally and will be available in the history.');
                        closeMaintenanceModal();
                      } else {
                        alert('❌ Failed to save maintenance log. Please check the console for details and try again.');
                      }
                    }}
                  className="px-6 py-3 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    Save Maintenance Log
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance History Modal */}
      {showMaintenanceHistory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-5 mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Maintenance History</h3>
                  <p className="text-gray-600 mt-1">Complete maintenance records for all production lines</p>
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-4 mt-4">
                    {/* Frequency Filter */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Frequency:</label>
                      <select
                        value={historyFilters.frequency}
                        onChange={(e) => setHistoryFilters(prev => ({ ...prev, frequency: e.target.value }))}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Frequencies</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Status:</label>
                      <select
                        value={historyFilters.status}
                        onChange={(e) => setHistoryFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    
                    {/* Storage Filter */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Storage:</label>
                      <select
                        value={historyFilters.storage}
                        onChange={(e) => setHistoryFilters(prev => ({ ...prev, storage: e.target.value }))}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Storage</option>
                        <option value="database">Database</option>
                        <option value="local">Local Storage</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {maintenanceTasks.length > 0 && (
                    <button
                      onClick={clearMaintenanceHistory}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear History
                    </button>
                  )}
                <button
                  onClick={() => setShowMaintenanceHistory(false)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {getFilteredMaintenanceTasks().length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Wrench className="w-8 h-8 text-gray-400" />
                  </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Maintenance Records</h4>
                    <p className="text-gray-500 mb-4">Start logging maintenance activities to build your history</p>
                    <button
                      onClick={() => setShowMaintenanceHistory(false)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Start Logging Maintenance
                    </button>
                            </div>
                ) : (
                  <div className="space-y-6">
                    {getFilteredMaintenanceTasks().map((task) => (
                      <div key={task.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {task.title.replace(/ - .*$/, '')} {/* Remove machine ID from title */}
                                </h4>
                                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                            </span>
                                {task.id?.startsWith('local_') && (
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                    Local Storage
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600">{task.description}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Machine & Line Info */}
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Equipment Details</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                            <span className="text-gray-600">Machine:</span>
                                  <span className="font-medium text-gray-900">{task.machine_id || 'N/A'}</span>
                          </div>
                                <div className="flex justify-between">
                            <span className="text-gray-600">Line:</span>
                                  <span className="font-medium text-gray-900">{task.line_id || 'N/A'}</span>
                          </div>
                                <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                                  <span className="font-medium text-gray-900 capitalize">{task.task_type}</span>
                          </div>
                                <div className="flex justify-between">
                            <span className="text-gray-600">Priority:</span>
                                  <span className={`font-medium capitalize ${
                                    task.priority === 'critical' ? 'text-red-600' :
                                    task.priority === 'high' ? 'text-orange-600' :
                                    task.priority === 'medium' ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                          </div>
                        </div>
                        
                            {/* Personnel & Dates */}
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Personnel & Schedule</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Technician:</span>
                                  <span className="font-medium text-gray-900">{task.assigned_to || 'N/A'}</span>
                          </div>
                                <div className="flex justify-between">
                            <span className="text-gray-600">Due Date:</span>
                                  <span className="font-medium text-gray-900">{new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                                <div className="flex justify-between">
                            <span className="text-gray-600">Completed:</span>
                                  <span className="font-medium text-gray-900">
                              {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Duration:</span>
                                  <span className="font-medium text-gray-900">
                                    {task.actual_duration_hours ? `${task.actual_duration_hours}h` : 'N/A'}
                                  </span>
                        </div>
                          </div>
                            </div>

                            {/* Tasks Completed */}
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Tasks Completed</h5>
                              {task.checklist_items && Array.isArray(task.checklist_items) && task.checklist_items.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="text-sm text-gray-600 mb-2">
                                    {task.checklist_items.length} tasks completed
                                  </div>
                                  <div className="max-h-48 overflow-y-auto space-y-1">
                              {task.checklist_items.map((item: string, index: number) => (
                                      <div key={index} className="flex items-start text-xs text-gray-700">
                                        <CheckCircle className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                        <span className="leading-relaxed">{item.charAt(0).toUpperCase() + item.slice(1)}</span>
                                      </div>
                                    ))}
                          </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No tasks recorded</p>
                              )}
                            </div>
                          </div>

                          {/* Notes */}
                          {task.notes && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h5 className="font-medium text-gray-900 mb-2">Notes</h5>
                              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{task.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Reader Modal */}
      {showExcelReader && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Maintenance Checklists</h3>
                <button
                  onClick={() => setShowExcelReader(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ExcelFileReader
                onDataImported={(data) => {
                  // Handle the imported data
                  console.log('Excel data imported:', data);
                  setShowExcelReader(false);
                  loadChecklists();
                }}
                onClose={() => setShowExcelReader(false)}
                defaultDataType="maintenance_checklists"
              />
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewDetails && selectedLineForDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Machine Details - {selectedLineForDetails.line_id}
                </h3>
                <button
                  onClick={closeViewDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Line Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Line Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Line ID:</span>
                      <span className="ml-2 font-medium">{selectedLineForDetails.line_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Description:</span>
                      <span className="ml-2 font-medium">{selectedLineForDetails.description || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 font-medium ${getStatusColor(getCalculatedLineStatus(selectedLineForDetails))}`}>
                        {getCalculatedLineStatus(selectedLineForDetails)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2 font-medium">
                        {selectedLineForDetails.created_at ? new Date(selectedLineForDetails.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Machine Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Machines in this Line</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getMachinesInLine(selectedLineForDetails).map((machine) => (
                      <div key={machine.machine_id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-lg font-semibold text-gray-900">{machine.machine_id}</h5>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {machine.category}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Make:</span>
                              <span className="ml-2 font-medium">{machine.make}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Model:</span>
                              <span className="ml-2 font-medium">{machine.model}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Size:</span>
                              <span className="ml-2 font-medium">{machine.size}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Capacity:</span>
                              <span className="ml-2 font-medium">{machine.capacity_tons} tons</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Serial No:</span>
                              <span className="ml-2 font-medium">{machine.serial_no || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">CLM Serial:</span>
                              <span className="ml-2 font-medium">{machine.clm_sr_no || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Injection Serial:</span>
                              <span className="ml-2 font-medium">{machine.inj_serial_no || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Status:</span>
                              <span className={`ml-2 font-medium ${getStatusColor(machine.status)}`}>
                                {machine.status}
                              </span>
                            </div>
                          </div>
                          
                          {machine.remarks && (
                            <div className="pt-3 border-t border-gray-200">
                              <span className="text-gray-600 text-sm">Remarks:</span>
                              <p className="text-sm text-gray-700 mt-1">{machine.remarks}</p>
                            </div>
                          )}
                          
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Last Updated:</span>
                              <span className="font-medium">
                                {machine.updated_at ? new Date(machine.updated_at).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Line Configuration */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Line Configuration</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">IM Machine:</span>
                      <span className="ml-2 font-medium">{selectedLineForDetails.im_machine_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Robot Machine:</span>
                      <span className="ml-2 font-medium">{selectedLineForDetails.robot_machine_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Conveyor Machine:</span>
                      <span className="ml-2 font-medium">{selectedLineForDetails.conveyor_machine_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Hoist Machine:</span>
                      <span className="ml-2 font-medium">{selectedLineForDetails.hoist_machine_id || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineChecklists;
