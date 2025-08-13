import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Search, Filter, Plus, BarChart3, FileText, Eye } from 'lucide-react';

interface QualityInspection {
  id: string;
  inspection_id: string;
  product_name: string;
  batch_number: string;
  machine_id: string;
  inspector: string;
  inspection_date: string;
  status: 'passed' | 'failed' | 'pending' | 'in_progress' | 'completed';
  result: 'pass' | 'fail' | 'conditional_pass';
  defects_found: number;
  total_samples: number;
  pass_rate: number;
  notes: string;
  created_date: string;
}

interface QualityControlModuleProps {
  // Add any props that might be needed
}

const QualityControlModule: React.FC<QualityControlModuleProps> = () => {
  const [activeTab, setActiveTab] = useState('inspections');
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');

  // Mock data for demonstration
  useEffect(() => {
    const mockInspections: QualityInspection[] = [
      {
        id: '1',
        inspection_id: 'QC-2024-001',
        product_name: 'Plastic Container 500ml',
        batch_number: 'BATCH-2024-001',
        machine_id: 'IMM-001',
        inspector: 'Alice Johnson',
        inspection_date: '2024-01-20',
        status: 'completed',
        result: 'pass',
        defects_found: 2,
        total_samples: 100,
        pass_rate: 98.0,
        notes: 'Minor surface defects found, within acceptable limits',
        created_date: '2024-01-20'
      },
      {
        id: '2',
        inspection_id: 'QC-2024-002',
        product_name: 'Bottle Cap 28mm',
        batch_number: 'BATCH-2024-002',
        machine_id: 'IMM-002',
        inspector: 'Bob Smith',
        inspection_date: '2024-01-21',
        status: 'completed',
        result: 'fail',
        defects_found: 15,
        total_samples: 50,
        pass_rate: 70.0,
        notes: 'Excessive flash and dimensional variations detected',
        created_date: '2024-01-21'
      },
      {
        id: '3',
        inspection_id: 'QC-2024-003',
        product_name: 'Food Container Lid',
        batch_number: 'BATCH-2024-003',
        machine_id: 'IMM-003',
        inspector: 'Carol Davis',
        inspection_date: '2024-01-22',
        status: 'in_progress',
        result: 'pass',
        defects_found: 0,
        total_samples: 75,
        pass_rate: 100.0,
        notes: 'Inspection in progress - initial results look good',
        created_date: '2024-01-22'
      }
    ];
    
    setInspections(mockInspections);
    setLoading(false);
  }, []);

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = inspection.inspection_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.inspector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;
    const matchesResult = resultFilter === 'all' || inspection.result === resultFilter;
    
    return matchesSearch && matchesStatus && matchesResult;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pass': return 'text-green-600 bg-green-50 border-green-200';
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      case 'conditional_pass': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass': return <CheckCircle className="w-4 h-4" />;
      case 'fail': return <XCircle className="w-4 h-4" />;
      case 'conditional_pass': return <AlertTriangle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getPassRateColor = (passRate: number) => {
    if (passRate >= 95) return 'text-green-600';
    if (passRate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inspections')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'inspections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle className="w-5 h-5 inline mr-2" />
            Quality Inspections
          </button>
          <button
            onClick={() => setActiveTab('standards')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'standards'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Quality Standards
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-5 h-5 inline mr-2" />
            Quality Analytics
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'inspections' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Quality Inspections</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                New Inspection
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
                      placeholder="Search inspections..."
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
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                  <select
                    value={resultFilter}
                    onChange={(e) => setResultFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Results</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="conditional_pass">Conditional Pass</option>
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

            {/* Inspections List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading inspections...</p>
                </div>
              ) : filteredInspections.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No quality inspections found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspector</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredInspections.map((inspection) => (
                        <tr key={inspection.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {inspection.inspection_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{inspection.product_name}</div>
                              <div className="text-sm text-gray-500">{inspection.inspection_date}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inspection.batch_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inspection.machine_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inspection.inspector}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(inspection.status)}`}>
                              {inspection.status.replace('_', ' ').charAt(0).toUpperCase() + inspection.status.replace('_', ' ').slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getResultColor(inspection.result)}`}>
                              {getResultIcon(inspection.result)}
                              <span className="ml-1">{inspection.result.replace('_', ' ').charAt(0).toUpperCase() + inspection.result.replace('_', ' ').slice(1)}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${getPassRateColor(inspection.pass_rate)}`}>
                              {inspection.pass_rate}%
                            </span>
                            <div className="text-xs text-gray-500">
                              {inspection.defects_found}/{inspection.total_samples} defects
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'standards' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Quality Standards</h2>
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Quality standards management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Quality Analytics</h2>
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Quality analytics and reporting coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QualityControlModule;
