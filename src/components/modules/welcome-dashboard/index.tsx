'use client';

import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  Package, 
  Calendar, 
  ShieldCheck, 
  Wrench, 
  FileText, 
  BarChart3, 
  Settings,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  ArrowRight,
  Activity
} from 'lucide-react';
import { lineAPI, breakdownMaintenanceAPI, preventiveMaintenanceAPI, scheduleAPI } from '../../../lib/supabase';

interface WelcomeDashboardProps {
  onModuleChange?: (moduleId: string) => void;
}

const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({ onModuleChange }) => {
  const [activeLinesCount, setActiveLinesCount] = useState<number>(0);
  const [maintenanceTasksCount, setMaintenanceTasksCount] = useState<number>(0);
  const [todayProduction, setTodayProduction] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const todayDateString = currentDate.toISOString().split('T')[0];

  // Fetch real data - optimized for speed (parallel requests, no DPR loop)
  useEffect(() => {
    const fetchDashboardData = async () => {
      const startTime = performance.now();
      try {
        setLoading(true);
        
        // Fetch all data in parallel for maximum speed
        const [lines, breakdownTasks, preventiveTasks, todayScheduleJobs] = await Promise.all([
          lineAPI.getAll(),
          breakdownMaintenanceAPI.getAll().catch(() => []), // Use new breakdown API
          preventiveMaintenanceAPI.getAll().catch(() => []), // Use new preventive API
          scheduleAPI.getByDate(todayDateString)
        ]);

        // Calculate active lines count
        const activeLines = lines.filter(line => line.status === 'Active');
        setActiveLinesCount(activeLines.length);

        // Calculate pending maintenance tasks from both APIs
        const pendingBreakdown = (breakdownTasks || []).filter(task => 
          task && (task.status === 'pending' || task.status === 'in_progress')
        );
        const pendingPreventive = (preventiveTasks || []).filter(task => 
          task && (task.status === 'pending' || task.status === 'in_progress')
        );
        setMaintenanceTasksCount(pendingBreakdown.length + pendingPreventive.length);

        // Calculate today's production from schedule jobs (fast, direct query)
        const totalProduction = todayScheduleJobs.reduce((sum, job) => {
          return sum + (parseInt(job.expected_pieces?.toString() || '0') || 0);
        }, 0);
        setTodayProduction(totalProduction);

        const endTime = performance.now();
        console.log(`✅ Dashboard data fetched in ${(endTime - startTime).toFixed(2)}ms`);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set defaults on error
        setActiveLinesCount(0);
        setMaintenanceTasksCount(0);
        setTodayProduction(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [todayDateString]);

  const quickAccessModules = [
    {
      id: 'prod-planner',
      name: 'Production Planner',
      icon: Calendar,
      description: 'Visual monthly production line scheduling',
      color: 'bg-white',
      hoverColor: 'hover:bg-slate-50',
      textColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      borderColor: 'border-slate-200'
    },
    {
      id: 'production',
      name: 'Production',
      icon: Factory,
      description: 'Daily production reports and monitoring',
      color: 'bg-white',
      hoverColor: 'hover:bg-slate-50',
      textColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      borderColor: 'border-slate-200'
    },
    {
      id: 'masters',
      name: 'Master Data',
      icon: Settings,
      description: 'Manage machines, molds, materials, and more',
      color: 'bg-white',
      hoverColor: 'hover:bg-slate-50',
      textColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      borderColor: 'border-slate-200'
    },
    {
      id: 'store-dispatch',
      name: 'Store & Dispatch',
      icon: Package,
      description: 'Inventory and dispatch management',
      color: 'bg-white',
      hoverColor: 'hover:bg-slate-50',
      textColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      borderColor: 'border-slate-200'
    },
    {
      id: 'quality',
      name: 'Quality Control',
      icon: ShieldCheck,
      description: 'Quality inspections and standards',
      color: 'bg-white',
      hoverColor: 'hover:bg-slate-50',
      textColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      borderColor: 'border-slate-200'
    },
    {
      id: 'maintenance',
      name: 'Maintenance',
      icon: Wrench,
      description: 'Maintenance tasks and schedules',
      color: 'bg-white',
      hoverColor: 'hover:bg-slate-50',
      textColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      borderColor: 'border-slate-200'
    },
    {
      id: 'approvals',
      name: 'Approvals',
      icon: FileText,
      description: 'Review and approve completed jobs',
      color: 'bg-white',
      hoverColor: 'hover:bg-slate-50',
      textColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      borderColor: 'border-slate-200'
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: BarChart3,
      description: 'Analytics and insights',
      color: 'bg-white',
      hoverColor: 'hover:bg-slate-50',
      textColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      borderColor: 'border-slate-200'
    }
  ];

  const stats = [
    {
      label: 'Active Lines',
      value: loading ? '...' : activeLinesCount.toLocaleString(),
      icon: Activity,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-300',
      iconBg: 'bg-slate-100'
    },
    {
      label: 'Pending Approvals',
      value: loading ? '...' : '0',
      icon: AlertCircle,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-300',
      iconBg: 'bg-slate-100'
    },
    {
      label: 'Today\'s Production',
      value: loading ? '...' : todayProduction.toLocaleString(),
      icon: TrendingUp,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-300',
      iconBg: 'bg-slate-100'
    },
    {
      label: 'Maintenance Tasks',
      value: loading ? '...' : maintenanceTasksCount.toLocaleString(),
      icon: Wrench,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-300',
      iconBg: 'bg-slate-100'
    }
  ];

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Welcome Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to ProdFlow
          </h1>
          <p className="text-base text-gray-600 font-medium">
            {formattedDate}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className={`${stat.bgColor} border-2 ${stat.borderColor} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                      {stat.label}
                    </p>
                    <p className={`text-4xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.iconBg} p-3 rounded-lg`}>
                    <IconComponent className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Access Modules */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <ArrowRight className="w-6 h-6 mr-2 text-slate-600" />
            Quick Access
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickAccessModules.map((module) => {
              const IconComponent = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => {
                    // Navigate to module
                    if (typeof window !== 'undefined') {
                      const userId = localStorage.getItem('currentUserId') || 'default';
                      localStorage.setItem(`prodSchedulerCurrentModule_${userId}`, module.id);
                      // Call the callback if provided
                      if (onModuleChange) {
                        onModuleChange(module.id);
                      } else {
                        // Fallback: reload page
                        window.location.reload();
                      }
                    }
                  }}
                  className={`${module.color} ${module.hoverColor} ${module.textColor} border-2 ${module.borderColor} rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left group`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${module.iconBg} p-3 rounded-lg`}>
                      <IconComponent className="w-6 h-6 text-slate-600" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {module.name}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {module.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity / Information Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Getting Started */}
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-slate-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Users className="w-6 h-6 mr-2 text-slate-600" />
              Department Responsibilities
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Production Department</h4>
                <ul className="space-y-1.5 text-xs text-gray-600 ml-2">
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Create production schedules in <strong>Prod Planner</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Record daily production in <strong>Production → Daily Production Report</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Manage silo operations and grinding records</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Store Department</h4>
                <ul className="space-y-1.5 text-xs text-gray-600 ml-2">
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Manage inventory in <strong>Store & Dispatch</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Process purchase orders, GRN, and material indents</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Handle dispatch and delivery challans</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Maintenance Department</h4>
                <ul className="space-y-1.5 text-xs text-gray-600 ml-2">
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Manage maintenance tasks in <strong>Maintenance Management</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Perform preventive maintenance and breakdown repairs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Complete maintenance checklists</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Quality Department</h4>
                <ul className="space-y-1.5 text-xs text-gray-600 ml-2">
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Conduct quality inspections in <strong>Quality Control</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Perform material and container inspections</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Generate quality reports and approvals</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Admin Department</h4>
                <ul className="space-y-1.5 text-xs text-gray-600 ml-2">
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Set up master data in <strong>Master Data</strong> (machines, molds, materials, lines)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Review and approve completed jobs in <strong>Approvals</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    <span>Access analytics and reports</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-slate-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Settings className="w-6 h-6 mr-2 text-slate-600" />
              System Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm font-semibold text-gray-700">System Status</span>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm font-semibold text-gray-700">Last Sync</span>
                <span className="text-gray-900 font-bold text-sm">
                  {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm font-semibold text-gray-700">Total Modules</span>
                <span className="text-gray-900 font-bold text-sm">
                  {quickAccessModules.length}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm font-semibold text-gray-700">Active Lines</span>
                <span className="text-gray-900 font-bold text-sm">
                  {loading ? '...' : activeLinesCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDashboard;

