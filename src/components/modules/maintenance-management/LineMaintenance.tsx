'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, Clock, AlertTriangle, CheckCircle, Plus, Search, Filter, FileText, 
  Calendar, Settings, ChevronDown, ChevronUp, Edit, Trash2, Eye, 
  CalendarDays, Users, Tag, DollarSign, Link, Package
} from 'lucide-react';
import { Line, Machine, MaintenanceTask, MaintenanceSchedule, MaintenanceChecklist, PreventiveMaintenanceTask } from '../../../lib/supabase';
import { preventiveMaintenanceAPI, maintenanceScheduleAPI, maintenanceChecklistAPI } from '../../../lib/supabase';
import LineChecklists from './LineChecklists';

interface LineMaintenanceProps {
  linesMaster: Line[];
  machinesMaster: Machine[];
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: { id: string; name: string; description?: string; location?: string; status: 'Active' | 'Inactive' | 'Maintenance'; created_at?: string; updated_at?: string; }[];
}

interface MaintenanceTaskForm {
  title: string;
  description: string;
  task_type: 'preventive' | 'corrective' | 'emergency' | 'line_maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  line_id: string;
  assigned_to: string;
  due_date: string;
  estimated_duration_hours: number;
  checklist_items: any[];
}

const LineMaintenance: React.FC<LineMaintenanceProps> = ({
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
  const [activeTab, setActiveTab] = useState('checklists');
  const [tasks, setTasks] = useState<PreventiveMaintenanceTask[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [checklists, setChecklists] = useState<MaintenanceChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<PreventiveMaintenanceTask | null>(null);
  const [taskForm, setTaskForm] = useState<MaintenanceTaskForm>({
    title: '',
    description: '',
    task_type: 'line_maintenance',
    priority: 'medium',
    line_id: '',
    assigned_to: '',
    due_date: '',
    estimated_duration_hours: 2,
    checklist_items: []
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [lineFilter, setLineFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, schedulesData, checklistsData] = await Promise.all([
        preventiveMaintenanceAPI.getAll().catch(() => []), // Use new preventive maintenance API
        maintenanceScheduleAPI.getAll().catch(() => []),
        maintenanceChecklistAPI.getByType('line').catch(() => [])
      ]);
      
      setTasks(tasksData || []);
      setSchedules(schedulesData || []);
      setChecklists(checklistsData || []);
    } catch (error) {
      console.error('Failed to load maintenance data:', error);
      // Set empty arrays on error to prevent crashes
      setTasks([]);
      setSchedules([]);
      setChecklists([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.line_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesLine = lineFilter === 'all' || task.line_id === lineFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesLine;
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

  const getLineDetails = (lineId: string) => {
    return linesMaster.find(line => line.line_id === lineId);
  };

  const getMachineDetails = (machineId: string) => {
    return machinesMaster.find(machine => machine.machine_id === machineId);
  };

  const handleCreateTask = async () => {
    try {
      const newTask = await preventiveMaintenanceAPI.create({
        title: taskForm.title,
        description: taskForm.description,
        maintenance_type: 'routine',
        priority: taskForm.priority,
        status: 'pending',
        line_id: taskForm.line_id || undefined,
        assigned_to: taskForm.assigned_to || undefined,
        unit: defaultUnit,
        due_date: taskForm.due_date,
        scheduled_date: taskForm.due_date,
        estimated_duration_hours: taskForm.estimated_duration_hours,
        checklist_items: taskForm.checklist_items
      }).catch(() => null);
      
      if (newTask) {
        setTasks(prev => [...prev, newTask]);
        setShowTaskForm(false);
        setTaskForm({
          title: '',
          description: '',
          task_type: 'line_maintenance',
          priority: 'medium',
          line_id: '',
          assigned_to: '',
          due_date: '',
          estimated_duration_hours: 2,
          checklist_items: []
        });
      } else {
        console.warn('⚠️ Could not create preventive maintenance task');
        alert('Failed to create task. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updatedTask = await preventiveMaintenanceAPI.update(taskId, { 
        status: newStatus as any
      }).catch(() => null);
      
      if (updatedTask) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? updatedTask : task
        ));
      } else {
        // If update failed, just update local state
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus as any } : task
        ));
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this maintenance task?')) {
      try {
        await preventiveMaintenanceAPI.delete(taskId).catch(() => {});
        setTasks(prev => prev.filter(task => task.id !== taskId));
      } catch (error) {
        console.error('Failed to delete task:', error);
        // Still remove from local state even if delete fails
        setTasks(prev => prev.filter(task => task.id !== taskId));
      }
    }
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => t.status === 'overdue').length;
    
    return { total, pending, inProgress, completed, overdue };
  };

  const stats = getTaskStats();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Line Maintenance Management</h1>
            <p className="text-gray-600">Manage maintenance tasks, schedules, and checklists for production lines</p>
          </div>
          <button
            onClick={() => setShowTaskForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('checklists')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'checklists'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Checklists
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'schedules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-5 h-5 inline mr-2" />
            Schedules
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Reports
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {false && activeTab === 'tasks' && (
          <div className="space-y-6">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Line</label>
                  <select
                    value={lineFilter}
                    onChange={(e) => setLineFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Lines</option>
                    {linesMaster.map(line => (
                      <option key={line.line_id} value={line.line_id}>
                        {line.line_id}
                      </option>
                    ))}
                  </select>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTasks.map((task) => {
                        const lineDetails = getLineDetails(task.line_id || '');
                        return (
                          <tr key={task.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                <div className="text-sm text-gray-500">{task.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lineDetails ? (
                                <div>
                                  <div className="font-medium">{task.line_id}</div>
                                  <div className="text-gray-500">{lineDetails.description}</div>
                                </div>
                              ) : (
                                task.line_id
                              )}
                            </td>
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.assigned_to || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.due_date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingTask(task)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Maintenance schedules view coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'checklists' && (
          <div className="space-y-6">
            <LineChecklists
              linesMaster={linesMaster}
              machinesMaster={machinesMaster}
              unitManagementEnabled={unitManagementEnabled}
              defaultUnit={defaultUnit}
              units={units}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Maintenance reports view coming soon...</p>
            </div>
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Maintenance Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Line</label>
                  <select
                    value={taskForm.line_id}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, line_id: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a line</option>
                    {linesMaster.map(line => (
                      <option key={line.line_id} value={line.line_id}>
                        {line.line_id} - {line.description}
                      </option>
                    ))}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                  <input
                    type="text"
                    value={taskForm.assigned_to}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
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
                    value={taskForm.estimated_duration_hours}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, estimated_duration_hours: parseInt(e.target.value) }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowTaskForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineMaintenance;
