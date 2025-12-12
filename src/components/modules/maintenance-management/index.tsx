import React, { useState, useEffect } from 'react';
import { Wrench, Clock, AlertTriangle, CheckCircle, Plus, Search, Filter, FileText, Calendar, Settings, X, History, Edit, Trash2, ClipboardList } from 'lucide-react';
import { Machine, Line, Mold, BreakdownMaintenanceTask, breakdownMaintenanceAPI } from '../../../lib/supabase';
import MachineChecklist from './MachineChecklist';
import LineMaintenance from './LineMaintenance';
import LineChecklists from './LineChecklists';
import MoldBreakdownTab from './MoldBreakdownTab';
import MaintenanceHistoryTab from './MaintenanceHistoryTab';
import DailyReadingsTab from './DailyReadingsTab';

interface MaintenanceManagementModuleProps {
  machinesMaster: Machine[];
  linesMaster: Line[];
  moldsMaster: Mold[];
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: { id: string; name: string; description?: string; location?: string; status: 'Active' | 'Inactive' | 'Maintenance'; created_at?: string; updated_at?: string; }[];
  // Callback to collapse sidebar when sub nav is clicked
  onSubNavClick?: () => void;
}

const MaintenanceManagementModule: React.FC<MaintenanceManagementModuleProps> = ({
  machinesMaster,
  linesMaster,
  moldsMaster,
  unitManagementEnabled,
  defaultUnit,
  units,
  onSubNavClick
}) => {
  const [activeTab, setActiveTab] = useState('preventive');
  const [tasks, setTasks] = useState<BreakdownMaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('Day');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<BreakdownMaintenanceTask | null>(null);
  const [completingTask, setCompletingTask] = useState<BreakdownMaintenanceTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    line_id: '',
    im_machine_id: '',
    robot_id: '',
    conveyor_id: '',
    hoist_id: '',
    other_machine_id: '',
    breakdown_type: 'emergency' as 'emergency' | 'corrective' | 'urgent_repair',
    failure_reason: '',
    priority: 'high' as 'low' | 'medium' | 'high' | 'critical',
    assigned_to: '',
    unit: defaultUnit,
    due_date: new Date().toISOString().split('T')[0],
    estimated_duration_hours: undefined as number | undefined,
    notes: ''
  });

  // Filter lines by current unit and only show lines that have machines in this unit
  const filteredLines = linesMaster.filter(line => {
    // First check if line belongs to current unit
    if (line.unit !== defaultUnit) return false;
    
    // Then check if line has any machines in the current unit
    const lineMachineIds = [
      line.im_machine_id,
      line.robot_machine_id,
      line.conveyor_machine_id,
      line.hoist_machine_id
    ].filter(Boolean) as string[];
    
    // Check if at least one machine from this line exists in the current unit
    return lineMachineIds.some(machineId => 
      machinesMaster.some(m => m.machine_id === machineId && m.unit === defaultUnit)
    );
  });

  // Get selected line
  const selectedLine = filteredLines.find(line => line.line_id === taskForm.line_id);

  // Filter machines by type from selected line
  const getLineMachines = () => {
    if (!selectedLine) return [];
    const lineMachineIds = [
      selectedLine.im_machine_id,
      selectedLine.robot_machine_id,
      selectedLine.conveyor_machine_id,
      selectedLine.hoist_machine_id
    ].filter(Boolean) as string[];
    
    // Only return machines that are in the current unit
    return machinesMaster.filter(m => 
      lineMachineIds.includes(m.machine_id) && m.unit === defaultUnit
    );
  };

  const lineMachines = getLineMachines();

  // Filter machines from selected line by type
  const imMachines = lineMachines.filter(m => 
    m.category === 'IM' || m.machine_id.startsWith('JSW') || m.machine_id.startsWith('HAIT') || m.machine_id.startsWith('TOYO')
  );
  
  const robotMachines = lineMachines.filter(m => 
    m.category === 'Robot' || m.machine_id.startsWith('WITT') || m.machine_id.startsWith('SWTK')
  );
  
  const conveyorMachines = lineMachines.filter(m => 
    m.category === 'Aux' && m.machine_id.startsWith('CONY')
  );
  
  const hoistMachines = lineMachines.filter(m => 
    m.category === 'Aux' && (m.machine_id.startsWith('SEPL') || m.machine_id.startsWith('Hoist') || m.model?.toLowerCase().includes('hoist'))
  );
  
  // Others: machines from machine master that don't fit in IM, Robot, Conveyor, or Hoist (not filtered by line)
  const otherMachines = machinesMaster.filter(m => {
    const isIM = m.category === 'IM' || m.machine_id.startsWith('JSW') || m.machine_id.startsWith('HAIT') || m.machine_id.startsWith('TOYO');
    const isRobot = m.category === 'Robot' || m.machine_id.startsWith('WITT') || m.machine_id.startsWith('SWTK');
    const isConveyor = m.category === 'Aux' && m.machine_id.startsWith('CONY');
    const isHoist = m.category === 'Aux' && (m.machine_id.startsWith('SEPL') || m.machine_id.startsWith('Hoist') || m.model?.toLowerCase().includes('hoist'));
    return !isIM && !isRobot && !isConveyor && !isHoist;
  });

  // Load breakdown tasks from database
  useEffect(() => {
    if (activeTab === 'breakdown') {
      loadBreakdownTasks();
    }
  }, [activeTab, defaultUnit]); // Reload when unit changes

  const loadBreakdownTasks = async () => {
    setLoading(true);
    try {
      const breakdownTasks = await breakdownMaintenanceAPI.getAll();
      // Filter tasks by current unit
      const unitFilteredTasks = breakdownTasks.filter(task => task.unit === defaultUnit);
      setTasks(unitFilteredTasks);
    } catch (error) {
      console.error('Failed to load breakdown tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title || !taskForm.due_date) {
      alert('Please fill in required fields (Title and Due Date)');
      return;
    }

    // Get the selected machine_id from whichever dropdown has a value
    const machine_id = taskForm.im_machine_id || taskForm.robot_id || taskForm.conveyor_id || taskForm.hoist_id || taskForm.other_machine_id || undefined;

    try {
      if (editingTask) {
        // Update existing task
        const updatedTask = await breakdownMaintenanceAPI.update(editingTask.id, {
          title: taskForm.title,
          description: taskForm.description || undefined,
          breakdown_type: taskForm.breakdown_type,
          failure_reason: taskForm.failure_reason || undefined,
          priority: taskForm.priority,
          machine_id: machine_id,
          line_id: taskForm.line_id || undefined,
          assigned_to: taskForm.assigned_to || undefined,
          due_date: taskForm.due_date,
          estimated_duration_hours: taskForm.estimated_duration_hours,
          notes: taskForm.notes || undefined,
          unit: taskForm.unit || defaultUnit
        });

        if (updatedTask) {
          setEditingTask(null);
          setTaskForm({
            title: '',
            description: '',
            line_id: '',
            im_machine_id: '',
            robot_id: '',
            conveyor_id: '',
            hoist_id: '',
            other_machine_id: '',
            breakdown_type: 'emergency',
            failure_reason: '',
            priority: 'high',
            assigned_to: '',
            unit: defaultUnit,
            due_date: new Date().toISOString().split('T')[0],
            estimated_duration_hours: undefined,
            notes: ''
          });
          setShowTaskForm(false);
          await loadBreakdownTasks();
        }
      } else {
        // Create new task
        const newTask = await breakdownMaintenanceAPI.create({
          title: taskForm.title,
          description: taskForm.description || undefined,
          breakdown_type: taskForm.breakdown_type,
          failure_reason: taskForm.failure_reason || undefined,
          priority: taskForm.priority,
        status: 'pending',
          machine_id: machine_id,
          line_id: taskForm.line_id || undefined,
          assigned_to: taskForm.assigned_to || undefined,
          due_date: taskForm.due_date,
          estimated_duration_hours: taskForm.estimated_duration_hours,
          notes: taskForm.notes || undefined,
          unit: taskForm.unit || defaultUnit
        });

        if (newTask) {
          // Reset form
          setTaskForm({
            title: '',
            description: '',
            line_id: '',
            im_machine_id: '',
            robot_id: '',
            conveyor_id: '',
            hoist_id: '',
            other_machine_id: '',
            breakdown_type: 'emergency',
            failure_reason: '',
        priority: 'high',
            assigned_to: '',
            unit: defaultUnit,
            due_date: new Date().toISOString().split('T')[0],
            estimated_duration_hours: undefined,
            notes: ''
          });
          setShowTaskForm(false);
          await loadBreakdownTasks();
        }
      }
    } catch (error) {
      console.error(`Failed to ${editingTask ? 'update' : 'create'} task:`, error);
      alert(`Failed to ${editingTask ? 'update' : 'create'} task. Please try again.`);
    }
  };

  const handleCompleteTask = async () => {
    if (!completingTask) {
      console.error('No task selected for completion');
      return;
    }

    console.log('Completing task:', completingTask.id);
    
    try {
      const updatedTask = await breakdownMaintenanceAPI.update(completingTask.id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      console.log('Update result:', updatedTask);

      if (updatedTask) {
        setCompletingTask(null);
        await loadBreakdownTasks();
        console.log('Task completed successfully');
      } else {
        console.error('Update returned null');
        alert('Failed to complete task. Update returned no data.');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert(`Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const filteredTasks = tasks.filter(task => {
    // Ensure task belongs to current unit
    if (task.unit !== defaultUnit) return false;
    
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.machine_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

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

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('preventive');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'preventive'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-5 h-5 inline mr-2" />
            Preventive Maintenance
          </button>
          <button
            onClick={() => {
              setActiveTab('breakdown');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'breakdown'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            Machine Breakdown
          </button>
          <button
            onClick={() => {
              setActiveTab('mold_breakdown');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'mold_breakdown'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wrench className="w-5 h-5 inline mr-2" />
            Mold Breakdown
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-5 h-5 inline mr-2" />
            History
          </button>
          <button
            onClick={() => {
              setActiveTab('daily_readings');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'daily_readings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="w-5 h-5 inline mr-2" />
            Daily Readings
          </button>
          <button
            onClick={() => {
              setActiveTab('report');
              if (onSubNavClick) onSubNavClick();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'report'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Report
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'preventive' && (
          <div className="space-y-6">
            <LineMaintenance
              linesMaster={linesMaster}
              machinesMaster={machinesMaster}
              unitManagementEnabled={unitManagementEnabled}
              defaultUnit={defaultUnit}
              units={units}
            />
          </div>
        )}

        {activeTab === 'breakdown' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Breakdown Maintenance</h2>
              <button 
                onClick={() => {
                  setEditingTask(null);
                  setShowTaskForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
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
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleClearFilters}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Tasks List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading tasks...</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No maintenance tasks found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{task.title}</div>
                              <div className="text-sm text-gray-500">{task.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.machine_id || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(task.priority)}`}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1">{task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.assigned_to || 'Unassigned'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.due_date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{task.breakdown_type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  const selectedLine = filteredLines.find(l => l.line_id === task.line_id);
                                  const taskMachineId = task.machine_id || '';
                                  setEditingTask(task);
                                  setTaskForm({
                                    title: task.title,
                                    description: task.description || '',
                                    line_id: task.line_id || '',
                                    im_machine_id: selectedLine?.im_machine_id === taskMachineId ? taskMachineId : '',
                                    robot_id: selectedLine?.robot_machine_id === taskMachineId ? taskMachineId : '',
                                    conveyor_id: selectedLine?.conveyor_machine_id === taskMachineId ? taskMachineId : '',
                                    hoist_id: selectedLine?.hoist_machine_id === taskMachineId ? taskMachineId : '',
                                    other_machine_id: !selectedLine || (!selectedLine.im_machine_id && !selectedLine.robot_machine_id && !selectedLine.conveyor_machine_id && !selectedLine.hoist_machine_id) ? taskMachineId : '',
                                    breakdown_type: task.breakdown_type,
                                    failure_reason: task.failure_reason || '',
                                    priority: task.priority,
                                    assigned_to: task.assigned_to || '',
                                    unit: task.unit || defaultUnit,
                                    due_date: task.due_date,
                                    estimated_duration_hours: task.estimated_duration_hours,
                                    notes: task.notes || ''
                                  });
                                  setShowTaskForm(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit Task"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {task.status !== 'completed' && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Complete button clicked for task:', task.id);
                                    setCompletingTask(task);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                  title="Complete Task"
                                  type="button"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* New Task Form Modal */}
            {showTaskForm && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{editingTask ? 'Edit Breakdown Task' : 'Create Breakdown Task'}</h3>
                      <button
                        onClick={() => {
                          setShowTaskForm(false);
                          setEditingTask(null);
                          setTaskForm({
                            title: '',
                            description: '',
                            line_id: '',
                            im_machine_id: '',
                            robot_id: '',
                            conveyor_id: '',
                            hoist_id: '',
                            other_machine_id: '',
                            breakdown_type: 'emergency',
                            failure_reason: '',
                            priority: 'high',
                            assigned_to: '',
                            unit: defaultUnit,
                            due_date: new Date().toISOString().split('T')[0],
                            estimated_duration_hours: undefined,
                            notes: ''
                          });
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Title *</label>
                        <input
                          type="text"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter task title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          value={taskForm.description}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter task description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Breakdown Type</label>
                          <select
                            value={taskForm.breakdown_type}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, breakdown_type: e.target.value as any }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="emergency">Emergency</option>
                            <option value="corrective">Corrective</option>
                            <option value="urgent_repair">Urgent Repair</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Priority</label>
                          <select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Line Selection</label>
                        <select
                          value={taskForm.line_id}
                          onChange={(e) => {
                            setTaskForm(prev => ({ 
                              ...prev, 
                              line_id: e.target.value,
                              // Clear all machine selections when line changes
                              im_machine_id: '',
                              robot_id: '',
                              conveyor_id: '',
                              hoist_id: '',
                              other_machine_id: ''
                            }));
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a Line</option>
                          {filteredLines.map(line => (
                            <option key={line.line_id} value={line.line_id}>
                              {line.line_id} - {line.description || ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      {taskForm.line_id && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Machine Selection (from selected line)</label>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">IM Machine</label>
                              <select
                                value={taskForm.im_machine_id}
                                onChange={(e) => {
                                  setTaskForm(prev => ({ 
                                    ...prev, 
                                    im_machine_id: e.target.value,
                                    robot_id: '', // Clear other selections
                                    conveyor_id: '',
                                    hoist_id: '',
                                    other_machine_id: ''
                                  }));
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                disabled={!taskForm.line_id}
                              >
                                <option value="">Select IM Machine</option>
                                {imMachines.map(machine => (
                                  <option key={machine.machine_id} value={machine.machine_id}>
                                    {machine.machine_id} - {machine.model || machine.make}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Robot</label>
                              <select
                                value={taskForm.robot_id}
                                onChange={(e) => {
                                  setTaskForm(prev => ({ 
                                    ...prev, 
                                    robot_id: e.target.value,
                                    im_machine_id: '', // Clear other selections
                                    conveyor_id: '',
                                    hoist_id: '',
                                    other_machine_id: ''
                                  }));
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                disabled={!taskForm.line_id}
                              >
                                <option value="">Select Robot</option>
                                {robotMachines.map(machine => (
                                  <option key={machine.machine_id} value={machine.machine_id}>
                                    {machine.machine_id} - {machine.model || machine.make}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Conveyor</label>
                              <select
                                value={taskForm.conveyor_id}
                                onChange={(e) => {
                                  setTaskForm(prev => ({ 
                                    ...prev, 
                                    conveyor_id: e.target.value,
                                    im_machine_id: '', // Clear other selections
                                    robot_id: '',
                                    hoist_id: '',
                                    other_machine_id: ''
                                  }));
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                disabled={!taskForm.line_id}
                              >
                                <option value="">Select Conveyor</option>
                                {conveyorMachines.map(machine => (
                                  <option key={machine.machine_id} value={machine.machine_id}>
                                    {machine.machine_id} - {machine.model || machine.make}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Hoist</label>
                              <select
                                value={taskForm.hoist_id}
                                onChange={(e) => {
                                  setTaskForm(prev => ({ 
                                    ...prev, 
                                    hoist_id: e.target.value,
                                    im_machine_id: '', // Clear other selections
                                    robot_id: '',
                                    conveyor_id: '',
                                    other_machine_id: ''
                                  }));
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                disabled={!taskForm.line_id}
                              >
                                <option value="">Select Hoist</option>
                                {hoistMachines.map(machine => (
                                  <option key={machine.machine_id} value={machine.machine_id}>
                                    {machine.machine_id} - {machine.model || machine.make}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Other Machines (from Machine Master)</label>
                        <select
                          value={taskForm.other_machine_id}
                          onChange={(e) => {
                            setTaskForm(prev => ({ 
                              ...prev, 
                              other_machine_id: e.target.value,
                              im_machine_id: '', // Clear other selections
                              robot_id: '',
                              conveyor_id: '',
                              hoist_id: ''
                            }));
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Other Machine</option>
                          {otherMachines.map(machine => (
                            <option key={machine.machine_id} value={machine.machine_id}>
                              {machine.machine_id} - {machine.model || machine.make}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Failure Reason</label>
                        <textarea
                          value={taskForm.failure_reason}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, failure_reason: e.target.value }))}
                          rows={2}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Describe why the breakdown occurred"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Unit</label>
                          <select
                            value={taskForm.unit}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, unit: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            {units.map(unit => (
                              <option key={unit.id} value={unit.name}>
                                {unit.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                          <input
                            type="text"
                            value={taskForm.assigned_to}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter assignee name"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                          <input
                            type="date"
                            value={taskForm.due_date}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Estimated Duration (hours)</label>
                          <input
                            type="number"
                            value={taskForm.estimated_duration_hours || ''}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, estimated_duration_hours: e.target.value ? parseInt(e.target.value) : undefined }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <input
                          type="text"
                          value={taskForm.notes}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => {
                          setShowTaskForm(false);
                        setTaskForm({
                          title: '',
                          description: '',
                          line_id: '',
                          im_machine_id: '',
                          robot_id: '',
                          conveyor_id: '',
                          hoist_id: '',
                          other_machine_id: '',
                          breakdown_type: 'emergency',
                          failure_reason: '',
                          priority: 'high',
                          assigned_to: '',
                          unit: defaultUnit,
                          due_date: new Date().toISOString().split('T')[0],
                          estimated_duration_hours: undefined,
                          notes: ''
                        });
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateTask}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {editingTask ? 'Update Task' : 'Create Task'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completion Confirmation Modal */}
        {completingTask && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-300 w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Complete Task</h3>
                <button
                  onClick={() => setCompletingTask(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Are you sure you want to mark this task as completed?</strong>
                  </p>
                </div>
                <div className="border border-gray-200 rounded-md p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Task Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Title:</span>
                      <p className="font-medium text-gray-900">{completingTask.title}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Machine:</span>
                      <p className="font-medium text-gray-900">{completingTask.machine_id || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span>
                      <p className="font-medium text-gray-900 capitalize">{completingTask.priority}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium text-gray-900 capitalize">{completingTask.breakdown_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Assigned To:</span>
                      <p className="font-medium text-gray-900">{completingTask.assigned_to || 'Unassigned'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Due Date:</span>
                      <p className="font-medium text-gray-900">{completingTask.due_date}</p>
                    </div>
                    {completingTask.description && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Description:</span>
                        <p className="font-medium text-gray-900">{completingTask.description}</p>
                      </div>
                    )}
                    {completingTask.failure_reason && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Failure Reason:</span>
                        <p className="font-medium text-gray-900">{completingTask.failure_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setCompletingTask(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Confirm Complete button clicked');
                      handleCompleteTask();
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    type="button"
                  >
                    Confirm Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mold_breakdown' && (
          <MoldBreakdownTab
            moldsMaster={moldsMaster}
            unitManagementEnabled={unitManagementEnabled}
            defaultUnit={defaultUnit}
            units={units}
          />
        )}

        {activeTab === 'history' && (
          <MaintenanceHistoryTab
            unitManagementEnabled={unitManagementEnabled}
            defaultUnit={defaultUnit}
          />
        )}

        {activeTab === 'daily_readings' && (
          <DailyReadingsTab
            defaultUnit={defaultUnit}
          />
        )}

        {activeTab === 'report' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Maintenance Reports</h2>
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Maintenance reports view coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceManagementModule;
