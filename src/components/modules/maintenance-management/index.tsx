import React, { useState, useEffect } from 'react';
import { Wrench, Clock, AlertTriangle, CheckCircle, Plus, Search, Filter, FileText, Calendar, Settings } from 'lucide-react';
import { Machine } from '../../../lib/supabase';
import MachineChecklist from './MachineChecklist';

interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  machine_id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assigned_to: string;
  due_date: string;
  created_date: string;
  completed_date?: string;
  maintenance_type: 'preventive' | 'corrective' | 'emergency';
}

interface MaintenanceManagementModuleProps {
  machinesMaster: Machine[];
}

const MaintenanceManagementModule: React.FC<MaintenanceManagementModuleProps> = ({
  machinesMaster,
}) => {
  const [activeTab, setActiveTab] = useState('preventive');
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('Day');

  // Mock data for demonstration
  useEffect(() => {
    const mockTasks: MaintenanceTask[] = [
      {
        id: '1',
        title: 'Monthly Machine Calibration',
        description: 'Perform monthly calibration check on Injection Molding Machine #1',
        machine_id: 'IMM-001',
        priority: 'medium',
        status: 'pending',
        assigned_to: 'John Smith',
        due_date: '2024-02-15',
        created_date: '2024-01-15',
        maintenance_type: 'preventive'
      },
      {
        id: '2',
        title: 'Emergency Repair - Hydraulic System',
        description: 'Hydraulic pressure drop detected, immediate attention required',
        machine_id: 'IMM-003',
        priority: 'critical',
        status: 'in_progress',
        assigned_to: 'Mike Johnson',
        due_date: '2024-01-20',
        created_date: '2024-01-19',
        maintenance_type: 'emergency'
      },
      {
        id: '3',
        title: 'Quarterly Safety Inspection',
        description: 'Comprehensive safety inspection of all production equipment',
        machine_id: 'ALL',
        priority: 'high',
        status: 'completed',
        assigned_to: 'Sarah Wilson',
        due_date: '2024-01-10',
        created_date: '2024-01-01',
        completed_date: '2024-01-08',
        maintenance_type: 'preventive'
      }
    ];
    
    setTasks(mockTasks);
    setLoading(false);
  }, []);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.machine_id.toLowerCase().includes(searchTerm.toLowerCase());
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
            onClick={() => setActiveTab('preventive')}
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
            onClick={() => setActiveTab('breakdown')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'breakdown'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            Breakdown
          </button>
          <button
            onClick={() => setActiveTab('report')}
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
            {selectedMachine ? (
              <MachineChecklist 
                machine={selectedMachine} 
                frequency={selectedFrequency}
                onBack={() => setSelectedMachine(null)} 
              />
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">Line maintenance functionality has been removed. Use machine-based maintenance instead.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'breakdown' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Breakdown Maintenance</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
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
                  <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.machine_id}</td>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.assigned_to}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.due_date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{task.maintenance_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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
