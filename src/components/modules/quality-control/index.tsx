import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Search, Filter, Plus, BarChart3, FileText, Eye, Scale, ClipboardCheck, Ruler } from 'lucide-react';
import DailyWeightReport from '../reports/DailyWeightReport';
import FirstPiecesApprovalReport from '../reports/FirstPiecesApprovalReport';
// import FirstPiecesWallThicknessReport from '../reports/FirstPiecesWallThicknessReport';
import IncomingMaterialInspectionForm from './IncomingMaterialInspectionForm';
import ContainerInspectionForm from './ContainerInspectionForm';

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
  linesMaster: any[];
  moldsMaster: any[];
}

const QualityControlModule: React.FC<QualityControlModuleProps> = ({ linesMaster, moldsMaster }) => {
  const [activeTab, setActiveTab] = useState('inspections');
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [selectedInspectionType, setSelectedInspectionType] = useState<string | null>(null);

  // Restore active tab from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      const savedActiveTab = localStorage.getItem(`qualityControlActiveTab_${userId}`);
      if (savedActiveTab) {
        setActiveTab(savedActiveTab);
      }
    }
  }, []);

  // Handle tab change with localStorage persistence
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Save to localStorage with user-specific key
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId') || 'default';
      localStorage.setItem(`qualityControlActiveTab_${userId}`, tab);
    }
  };

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
            onClick={() => handleTabChange('inspections')}
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
            onClick={() => handleTabChange('standards')}
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
            onClick={() => handleTabChange('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-5 h-5 inline mr-2" />
            Quality Analytics
          </button>
          <button
            onClick={() => handleTabChange('weight-report')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'weight-report'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Scale className="w-5 h-5 inline mr-2" />
            Daily Weight Report
          </button>
          <button
            onClick={() => handleTabChange('first-pieces-approval')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'first-pieces-approval'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardCheck className="w-5 h-5 inline mr-2" />
            First Pieces Approval Report
          </button>
          {/* <button
            onClick={() => handleTabChange('wall-thickness-report')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'wall-thickness-report'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Ruler className="w-5 h-5 inline mr-2" />
            First Pieces Wall Thickness Report
          </button> */}

        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'inspections' && (
          <div className="space-y-6">
            {!selectedInspectionType ? (
              <>
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Quality Inspections</h2>
                </div>

                {/* Inspection Type Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Material Inspection Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedInspectionType('material')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Material Inspection</h3>
                        <p className="text-sm text-gray-500">Incoming raw materials quality check</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Raw Materials</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Parameters:</span>
                        <span className="font-medium">11+ Tests</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Samples:</span>
                        <span className="font-medium">Dynamic</span>
                      </div>
                    </div>
                    <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                      Start Material Inspection
                    </button>
                  </div>

                  {/* Container Inspection Card */}
                  <div 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedInspectionType('container')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Container Inspection</h3>
                        <p className="text-sm text-gray-500">Packaging containers quality verification</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Packaging</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Parameters:</span>
                        <span className="font-medium">8+ Tests</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Samples:</span>
                        <span className="font-medium">Dynamic</span>
                      </div>
                    </div>
                    <button className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                      Start Container Inspection
                    </button>
                  </div>

                  {/* Custom Inspection Card */}
                  <div 
                    className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => setSelectedInspectionType('custom')}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                        <Plus className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Custom Inspection</h3>
                        <p className="text-sm text-gray-500">Create a new inspection type</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">
                        Define your own inspection parameters and criteria
                      </div>
                    </div>
                    <button className="w-full mt-4 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                      Create New
                    </button>
                  </div>
                </div>

                {/* Recent Inspection History */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Inspection History</h3>
                    <p className="text-sm text-gray-500">Last 10 inspection reports</p>
                  </div>
                  <div className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Inspection History</h4>
                    <p className="text-gray-500">No inspection reports have been completed yet. Start your first inspection above.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Back Button and Form */}
                <div className="flex items-center mb-6">
                  <button
                    onClick={() => setSelectedInspectionType(null)}
                    className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Inspection Types
                  </button>
                </div>

                {selectedInspectionType === 'material' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Material Inspection Report</h2>
                    </div>
                    <IncomingMaterialInspectionForm />
                  </div>
                )}

                {selectedInspectionType === 'container' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Container Inspection Report</h2>
                    </div>
                    <ContainerInspectionForm />
                  </div>
                )}

                {selectedInspectionType === 'custom' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Create Custom Inspection</h2>
                    </div>
                    
                    {/* Custom Inspection Builder */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Define Your Custom Inspection</h3>
                        
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Name</label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., Chemical Analysis Inspection"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              <option value="">Select Category</option>
                              <option value="raw-material">Raw Material</option>
                              <option value="packaging">Packaging</option>
                              <option value="chemical">Chemical</option>
                              <option value="equipment">Equipment</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                              placeholder="Describe what this inspection covers..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Sample Size</label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="5"
                              min="1"
                              max="20"
                            />
                          </div>
                        </div>

                        {/* Parameter Builder */}
                        <div className="mb-6">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-md font-semibold text-gray-900">Inspection Parameters</h4>
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Add Parameter
                            </button>
                          </div>
                          
                          {/* Sample Parameters */}
                          <div className="space-y-4">
                            <div className="border border-gray-200 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Parameter Name</label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., pH Level"
                                    defaultValue="pH Level"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard/Unit</label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., 6.5-7.5 pH"
                                    defaultValue="6.5-7.5 pH"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Input Type</label>
                                  <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="text">Text Input</option>
                                    <option value="number">Number Input</option>
                                    <option value="select">Pass/Fail Select</option>
                                    <option value="textarea">Text Area</option>
                                  </select>
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                              </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Parameter Name</label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Temperature"
                                    defaultValue="Temperature"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard/Unit</label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., 20-25°C"
                                    defaultValue="20-25°C"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Input Type</label>
                                  <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="number">Number Input</option>
                                    <option value="text">Text Input</option>
                                    <option value="select">Pass/Fail Select</option>
                                    <option value="textarea">Text Area</option>
                                  </select>
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Preview Section */}
                        <div className="mb-6">
                          <h4 className="text-md font-semibold text-gray-900 mb-4">Preview</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-2">This is how your custom inspection form will look:</p>
                            <div className="bg-white border border-gray-300 rounded p-3">
                              <div className="text-sm font-medium text-gray-900 mb-2">Chemical Analysis Inspection</div>
                              <div className="text-xs text-gray-500 space-y-1">
                                <div>• pH Level (6.5-7.5 pH) - Number Input</div>
                                <div>• Temperature (20-25°C) - Number Input</div>
                                <div>• + 3 more parameters...</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4">
                          <button className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Cancel
                          </button>
                          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            Create Inspection Template
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
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

        {activeTab === 'weight-report' && (
          <div className="space-y-6">
            <DailyWeightReport 
              linesMaster={linesMaster} 
              moldsMaster={moldsMaster} 
            />
          </div>
        )}

        {activeTab === 'first-pieces-approval' && (
          <div className="space-y-6">
            <FirstPiecesApprovalReport 
              linesMaster={linesMaster} 
              moldsMaster={moldsMaster} 
            />
          </div>
        )}

        {/* {activeTab === 'wall-thickness-report' && (
          <div className="space-y-6">
            <FirstPiecesWallThicknessReport />
          </div>
        )} */}


      </div>
    </div>
  );
};

export default QualityControlModule;
