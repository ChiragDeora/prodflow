import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Plus, Search, Filter, X } from 'lucide-react';
import { Mold, MoldBreakdownMaintenanceTask, moldBreakdownMaintenanceAPI } from '../../../lib/supabase';

interface MoldBreakdownTabProps {
  moldsMaster: Mold[];
  unitManagementEnabled: boolean;
  defaultUnit: string;
  units: { id: string; name: string; description?: string; location?: string; status: 'Active' | 'Inactive' | 'Maintenance'; created_at?: string; updated_at?: string; }[];
}

const MoldBreakdownTab: React.FC<MoldBreakdownTabProps> = ({
  moldsMaster,
  unitManagementEnabled,
  defaultUnit,
  units
}) => {
  const [tasks, setTasks] = useState<MoldBreakdownMaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    mold_id: '',
    breakdown_type: 'emergency' as 'emergency' | 'corrective' | 'urgent_repair',
    failure_reason: '',
    // Mold-specific fields
    air_valve_pressure_broken: false,
    valve_broken: false,
    hrc_not_working: false,
    heating_element_failed: false,
    cooling_channel_blocked: false,
    ejector_pin_broken: false,
    sprue_bushing_damaged: false,
    cavity_damage: false,
    core_damage: false,
    vent_blocked: false,
    gate_damage: false,
    other_issues: '',
    priority: 'high' as 'low' | 'medium' | 'high' | 'critical',
    assigned_to: '',
    unit: defaultUnit,
    due_date: new Date().toISOString().split('T')[0],
    estimated_duration_hours: undefined as number | undefined,
    notes: ''
  });

  // Filter molds by current unit
  const filteredMolds = moldsMaster.filter(mold => mold.unit === defaultUnit);

  // Load mold breakdown tasks
  useEffect(() => {
    loadMoldBreakdownTasks();
  }, [defaultUnit]); // Reload when unit changes

  const loadMoldBreakdownTasks = async () => {
    setLoading(true);
    try {
      const moldTasks = await moldBreakdownMaintenanceAPI.getAll();
      // Filter tasks by current unit
      const unitFilteredTasks = moldTasks.filter(task => task.unit === defaultUnit);
      setTasks(unitFilteredTasks);
    } catch (error) {
      console.error('Failed to load mold breakdown tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title || !taskForm.due_date || !taskForm.mold_id) {
      alert('Please fill in required fields (Title, Due Date, and Mold)');
      return;
    }

    try {
      const newTask = await moldBreakdownMaintenanceAPI.create({
        title: taskForm.title,
        description: taskForm.description || undefined,
        breakdown_type: taskForm.breakdown_type,
        failure_reason: taskForm.failure_reason || undefined,
        air_valve_pressure_broken: taskForm.air_valve_pressure_broken,
        valve_broken: taskForm.valve_broken,
        hrc_not_working: taskForm.hrc_not_working,
        heating_element_failed: taskForm.heating_element_failed,
        cooling_channel_blocked: taskForm.cooling_channel_blocked,
        ejector_pin_broken: taskForm.ejector_pin_broken,
        sprue_bushing_damaged: taskForm.sprue_bushing_damaged,
        cavity_damage: taskForm.cavity_damage,
        core_damage: taskForm.core_damage,
        vent_blocked: taskForm.vent_blocked,
        gate_damage: taskForm.gate_damage,
        other_issues: taskForm.other_issues || undefined,
        priority: taskForm.priority,
        status: 'pending',
        mold_id: taskForm.mold_id,
        assigned_to: taskForm.assigned_to || undefined,
        due_date: taskForm.due_date,
        estimated_duration_hours: taskForm.estimated_duration_hours,
        notes: taskForm.notes || undefined,
        unit: taskForm.unit || defaultUnit
      });

      if (newTask) {
        setTaskForm({
          title: '',
          description: '',
          mold_id: '',
          breakdown_type: 'emergency',
          failure_reason: '',
          air_valve_pressure_broken: false,
          valve_broken: false,
          hrc_not_working: false,
          heating_element_failed: false,
          cooling_channel_blocked: false,
          ejector_pin_broken: false,
          sprue_bushing_damaged: false,
          cavity_damage: false,
          core_damage: false,
          vent_blocked: false,
          gate_damage: false,
          other_issues: '',
          priority: 'high',
          assigned_to: '',
          unit: defaultUnit,
          due_date: new Date().toISOString().split('T')[0],
          estimated_duration_hours: undefined,
          notes: ''
        });
        setShowTaskForm(false);
        loadMoldBreakdownTasks();
      }
    } catch (error) {
      console.error('Failed to create mold breakdown task:', error);
      alert('Failed to create task. Please try again.');
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
    
    const matchesSearch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.mold_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <span className="text-green-600">✓</span>;
      case 'in_progress': return <span className="text-blue-600">⟳</span>;
      case 'pending': return <span className="text-yellow-600">⏱</span>;
      case 'overdue': return <span className="text-red-600">⚠</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mold Breakdown Maintenance</h2>
        <button 
          onClick={() => setShowTaskForm(true)}
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
            <p className="text-gray-500">No mold breakdown tasks found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.mold_id || 'N/A'}</td>
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
          <div className="relative top-20 mx-auto p-5 border border-gray-300 w-full max-w-3xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Mold Breakdown Task</h3>
              <button
                onClick={() => setShowTaskForm(false)}
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
                  <label className="block text-sm font-medium text-gray-700">Mold *</label>
                  <select
                    value={taskForm.mold_id}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, mold_id: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a Mold</option>
                    {filteredMolds.map(mold => (
                      <option key={mold.mold_id} value={mold.mold_id}>
                        {mold.mold_id} - {mold.mold_name || mold.maker}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mold-Specific Issues</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.air_valve_pressure_broken}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, air_valve_pressure_broken: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Air Valve Pressure Broken</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.valve_broken}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, valve_broken: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Valve Broken</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.hrc_not_working}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, hrc_not_working: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">HRC Not Working</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.heating_element_failed}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, heating_element_failed: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Heating Element Failed</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.cooling_channel_blocked}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, cooling_channel_blocked: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Cooling Channel Blocked</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.ejector_pin_broken}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, ejector_pin_broken: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Ejector Pin Broken</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.sprue_bushing_damaged}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, sprue_bushing_damaged: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Sprue Bushing Damaged</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.cavity_damage}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, cavity_damage: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Cavity Damage</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.core_damage}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, core_damage: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Core Damage</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.vent_blocked}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, vent_blocked: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Vent Blocked</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={taskForm.gate_damage}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, gate_damage: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Gate Damage</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Other Issues</label>
                  <textarea
                    value={taskForm.other_issues}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, other_issues: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe any other mold-specific issues"
                  />
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
                      mold_id: '',
                      breakdown_type: 'emergency',
                      failure_reason: '',
                      air_valve_pressure_broken: false,
                      valve_broken: false,
                      hrc_not_working: false,
                      heating_element_failed: false,
                      cooling_channel_blocked: false,
                      ejector_pin_broken: false,
                      sprue_bushing_damaged: false,
                      cavity_damage: false,
                      core_damage: false,
                      vent_blocked: false,
                      gate_damage: false,
                      other_issues: '',
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
                  Create Task
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoldBreakdownTab;

