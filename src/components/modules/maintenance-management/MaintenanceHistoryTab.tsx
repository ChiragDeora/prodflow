import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Settings, Wrench, Search, Filter } from 'lucide-react';
import { BreakdownMaintenanceTask, PreventiveMaintenanceTask, MoldBreakdownMaintenanceTask, breakdownMaintenanceAPI, preventiveMaintenanceAPI, moldBreakdownMaintenanceAPI } from '../../../lib/supabase';

interface MaintenanceHistoryTabProps {
  unitManagementEnabled: boolean;
  defaultUnit: string;
}

const MaintenanceHistoryTab: React.FC<MaintenanceHistoryTabProps> = ({
  unitManagementEnabled,
  defaultUnit
}) => {
  const [activeSection, setActiveSection] = useState<'machine_preventive' | 'machine_breakdown' | 'mold_breakdown'>('machine_preventive');
  const [machinePreventiveTasks, setMachinePreventiveTasks] = useState<PreventiveMaintenanceTask[]>([]);
  const [machineBreakdownTasks, setMachineBreakdownTasks] = useState<BreakdownMaintenanceTask[]>([]);
  const [moldBreakdownTasks, setMoldBreakdownTasks] = useState<MoldBreakdownMaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadAllHistory();
  }, [defaultUnit]); // Reload when unit changes

  const loadAllHistory = async () => {
    setLoading(true);
    try {
      const [preventive, breakdown, moldBreakdown] = await Promise.all([
        preventiveMaintenanceAPI.getAll().catch(() => []),
        breakdownMaintenanceAPI.getAll().catch(() => []),
        moldBreakdownMaintenanceAPI.getAll().catch(() => [])
      ]);
      
      // Filter by completed status and current unit for history
      setMachinePreventiveTasks(preventive.filter(t => t.status === 'completed' && t.unit === defaultUnit));
      setMachineBreakdownTasks(breakdown.filter(t => t.status === 'completed' && t.unit === defaultUnit));
      setMoldBreakdownTasks(moldBreakdown.filter(t => t.status === 'completed' && t.unit === defaultUnit));
    } catch (error) {
      console.error('Failed to load maintenance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const getFilteredTasks = () => {
    let tasks: any[] = [];
    
    switch (activeSection) {
      case 'machine_preventive':
        tasks = machinePreventiveTasks;
        break;
      case 'machine_breakdown':
        tasks = machineBreakdownTasks;
        break;
      case 'mold_breakdown':
        tasks = moldBreakdownTasks;
        break;
    }

    return tasks.filter(task => {
      const matchesSearch = !searchTerm || 
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.machine_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.mold_id || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const renderTasksTable = (tasks: any[]) => {
    if (tasks.length === 0) {
      return (
        <div className="p-8 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No completed tasks found</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
              {activeSection === 'mold_breakdown' ? (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mold</th>
              ) : (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              {activeSection === 'machine_preventive' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              )}
              {activeSection !== 'machine_preventive' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakdown Type</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    <div className="text-sm text-gray-500">{task.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {activeSection === 'mold_breakdown' ? (task.mold_id || 'N/A') : (task.machine_id || 'N/A')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(task.priority)}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {task.actual_duration_hours ? `${task.actual_duration_hours}h` : (task.estimated_duration_hours ? `${task.estimated_duration_hours}h (est)` : 'N/A')}
                </td>
                {activeSection === 'machine_preventive' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{task.maintenance_type || 'N/A'}</td>
                )}
                {activeSection !== 'machine_preventive' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{task.breakdown_type || 'N/A'}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Maintenance History</h2>
      </div>

      {/* Section Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSection('machine_preventive')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
              activeSection === 'machine_preventive'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-5 h-5 inline mr-2" />
            Machine Preventive
          </button>
          <button
            onClick={() => setActiveSection('machine_breakdown')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
              activeSection === 'machine_breakdown'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            Machine Breakdown
          </button>
          <button
            onClick={() => setActiveSection('mold_breakdown')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
              activeSection === 'mold_breakdown'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wrench className="w-5 h-5 inline mr-2" />
            Mold Breakdown
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <p className="mt-2 text-gray-500">Loading history...</p>
          </div>
        ) : (
          renderTasksTable(getFilteredTasks())
        )}
      </div>
    </div>
  );
};

export default MaintenanceHistoryTab;

