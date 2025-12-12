import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Search, Filter, Plus, BarChart3, FileText, Eye, Scale, ClipboardCheck, Ruler, Target, FlaskConical, ArrowLeft, X } from 'lucide-react';
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
  // Callback to collapse sidebar when sub nav is clicked
  onSubNavClick?: () => void;
}

const QualityControlModule: React.FC<QualityControlModuleProps> = ({ linesMaster, moldsMaster, onSubNavClick }) => {
  const [activeTab, setActiveTab] = useState('inspections');
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [selectedInspectionType, setSelectedInspectionType] = useState<string | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const [showAddStandardModal, setShowAddStandardModal] = useState(false);
  const [showAddActionPlanModal, setShowAddActionPlanModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [standardFormData, setStandardFormData] = useState<any>({});
  const [actionPlanFormData, setActionPlanFormData] = useState<any>({});
  const [projectFormData, setProjectFormData] = useState<any>({});

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
    // Collapse sidebar when sub nav tab is clicked
    if (onSubNavClick) {
      onSubNavClick();
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
          <button
            onClick={() => handleTabChange('corrective-action')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'corrective-action'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Target className="w-5 h-5 inline mr-2" />
            Corrective Action Plan
          </button>
          <button
            onClick={() => handleTabChange('rnd')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'rnd'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FlaskConical className="w-5 h-5 inline mr-2" />
            R&D
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
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Sample Size</label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    defaultValue="pH Level"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard/Unit</label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    defaultValue="Temperature"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard/Unit</label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            {!selectedStandard ? (
              <>
                <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Quality Standards</h2>
                  <p className="text-gray-600 mt-1">Manage product quality standards and specifications</p>
                </div>

                {/* Grid Card Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Product Weight Standard Card */}
                  <button
                    onClick={() => setSelectedStandard('weight')}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow text-left"
                  >
                    <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <Scale className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Weight Standard</h3>
                    <p className="text-sm text-gray-600">View and manage standard weights for all products</p>
                  </button>

                  {/* Packing Standards Card */}
                  <button
                    onClick={() => setSelectedStandard('packing')}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow text-left"
                  >
                    <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Packing Standards</h3>
                    <p className="text-sm text-gray-600">View and manage packing specifications and standards</p>
                  </button>

                  {/* CBM Standards Card */}
                  <button
                    onClick={() => setSelectedStandard('cbm')}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow text-left"
                  >
                    <div className="bg-purple-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                      <Ruler className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">CBM Standards</h3>
                    <p className="text-sm text-gray-600">View and manage cubic meter (CBM) standards for products</p>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <button
                    onClick={() => setSelectedStandard(null)}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Standards
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedStandard === 'weight' && 'Product Weight Standards'}
                    {selectedStandard === 'packing' && 'Packing Standards'}
                    {selectedStandard === 'cbm' && 'CBM Standards'}
                  </h2>
                </div>

                {/* Products and Standards Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedStandard === 'weight' && 'Product Weight Standards'}
                          {selectedStandard === 'packing' && 'Packing Standards'}
                          {selectedStandard === 'cbm' && 'CBM Standards'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">View and manage standards for all products</p>
                      </div>
                      <button 
                        onClick={() => setShowAddStandardModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Standard
                      </button>
                    </div>
                  </div>

                  {/* Mock Products Data */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Code</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                          {selectedStandard === 'weight' && (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard Weight (g)</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tolerance (±g)</th>
                            </>
                          )}
                          {selectedStandard === 'packing' && (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units per Carton</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cartons per Pallet</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packaging Type</th>
                            </>
                          )}
                          {selectedStandard === 'cbm' && (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CBM per Unit</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CBM per Carton</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units per Carton</th>
                            </>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[].length === 0 ? (
                          <tr>
                            <td colSpan={selectedStandard === 'weight' ? 6 : selectedStandard === 'packing' ? 7 : 7} className="px-6 py-8 text-center">
                              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">No standards found. Click "Add Standard" to create one.</p>
                            </td>
                          </tr>
                        ) : (
                          ([] as any[]).map((product: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.code}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                            {selectedStandard === 'weight' && (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.weight}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">±{product.tolerance}</td>
                              </>
                            )}
                            {selectedStandard === 'packing' && (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.unitsPerCarton}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.cartonsPerPallet}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.packagingType}</td>
                              </>
                            )}
                            {selectedStandard === 'cbm' && (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.cbmPerUnit}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.cbmPerCarton}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.unitsPerCarton}</td>
                              </>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {product.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                              <button className="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                          </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
            </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Quality Analytics</h2>
              <p className="text-gray-600 mt-1">Quality metrics and reporting dashboard</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Pass Rate</h3>
                  <p className="text-3xl font-bold text-blue-600">95.2%</p>
                  <p className="text-sm text-blue-700 mt-2">Last 30 days</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Inspections</h3>
                  <p className="text-3xl font-bold text-green-600">1,247</p>
                  <p className="text-sm text-green-700 mt-2">This month</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Defects Found</h3>
                  <p className="text-3xl font-bold text-orange-600">23</p>
                  <p className="text-sm text-orange-700 mt-2">This month</p>
                </div>
              </div>
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

        {activeTab === 'corrective-action' && (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Corrective Action Plan</h2>
              <p className="text-gray-600 mt-1">Track and manage corrective actions for quality issues</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Action Plans</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage corrective actions and their status</p>
                </div>
                <button 
                  onClick={() => setShowAddActionPlanModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Action Plan
                </button>
              </div>

              {/* Action Plans Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Root Cause</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[].length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center">
                          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No action plans found. Click "New Action Plan" to create one.</p>
                        </td>
                      </tr>
                    ) : (
                      ([] as any[]).map((action: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{action.actionId}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{action.issueDescription}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{action.rootCause}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{action.assignedTo}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{action.dueDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {action.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                            <button className="text-green-600 hover:text-green-900">Complete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rnd' && (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Research & Development</h2>
              <p className="text-gray-600 mt-1">Explore and develop new products</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">R&D Projects</h3>
                  <p className="text-sm text-gray-500 mt-1">Track new product development and exploration</p>
                </div>
                <button 
                  onClick={() => setShowNewProjectModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </button>
              </div>

              {/* R&D Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[].length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <FlaskConical className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No R&D projects found. Click "New Project" to create one.</p>
                  </div>
                ) : (
                  ([] as any[]).map((project: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <FlaskConical className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{project.name}</h4>
                          <p className="text-xs text-gray-500">Project ID: {project.projectId}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{project.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{project.status}</span>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">View Details</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Standard Modal */}
        {showAddStandardModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-300 w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add {selectedStandard === 'weight' ? 'Product Weight' : selectedStandard === 'packing' ? 'Packing' : 'CBM'} Standard
                </h3>
                <button
                  onClick={() => {
                    setShowAddStandardModal(false);
                    setStandardFormData({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Code *</label>
                  <input
                    type="text"
                    value={standardFormData.productCode || ''}
                    onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, productCode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={standardFormData.productName || ''}
                    onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, productName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                {selectedStandard === 'weight' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Standard Weight (g) *</label>
                      <input
                        type="number"
                        step="0.001"
                        value={standardFormData.standardWeight || ''}
                        onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, standardWeight: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tolerance (±g) *</label>
                      <input
                        type="number"
                        step="0.001"
                        value={standardFormData.tolerance || ''}
                        onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, tolerance: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </>
                )}
                {selectedStandard === 'packing' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Units per Carton *</label>
                      <input
                        type="number"
                        value={standardFormData.unitsPerCarton || ''}
                        onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, unitsPerCarton: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cartons per Pallet *</label>
                      <input
                        type="number"
                        value={standardFormData.cartonsPerPallet || ''}
                        onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, cartonsPerPallet: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Packaging Type</label>
                      <input
                        type="text"
                        value={standardFormData.packagingType || ''}
                        onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, packagingType: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}
                {selectedStandard === 'cbm' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CBM per Unit *</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={standardFormData.cbmPerUnit || ''}
                        onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, cbmPerUnit: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CBM per Carton *</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={standardFormData.cbmPerCarton || ''}
                        onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, cbmPerCarton: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Units per Carton *</label>
                      <input
                        type="number"
                        value={standardFormData.unitsPerCarton || ''}
                        onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, unitsPerCarton: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={standardFormData.notes || ''}
                    onChange={(e) => setStandardFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddStandardModal(false);
                    setStandardFormData({});
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Saving standard:', standardFormData);
                    // TODO: Implement API call to save standard
                    setShowAddStandardModal(false);
                    setStandardFormData({});
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Standard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Action Plan Modal */}
        {showAddActionPlanModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-300 w-full max-w-3xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">New Corrective Action Plan</h3>
                <button
                  onClick={() => {
                    setShowAddActionPlanModal(false);
                    setActionPlanFormData({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Description *</label>
                  <textarea
                    value={actionPlanFormData.issueDescription || ''}
                    onChange={(e) => setActionPlanFormData((prev: any) => ({ ...prev, issueDescription: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Root Cause *</label>
                  <textarea
                    value={actionPlanFormData.rootCause || ''}
                    onChange={(e) => setActionPlanFormData((prev: any) => ({ ...prev, rootCause: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Corrective Action *</label>
                  <textarea
                    value={actionPlanFormData.correctiveAction || ''}
                    onChange={(e) => setActionPlanFormData((prev: any) => ({ ...prev, correctiveAction: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To *</label>
                    <input
                      type="text"
                      value={actionPlanFormData.assignedTo || ''}
                      onChange={(e) => setActionPlanFormData((prev: any) => ({ ...prev, assignedTo: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                    <input
                      type="date"
                      value={actionPlanFormData.dueDate || ''}
                      onChange={(e) => setActionPlanFormData((prev: any) => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={actionPlanFormData.notes || ''}
                    onChange={(e) => setActionPlanFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddActionPlanModal(false);
                    setActionPlanFormData({});
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Saving action plan:', actionPlanFormData);
                    // TODO: Implement API call to save action plan
                    setShowAddActionPlanModal(false);
                    setActionPlanFormData({});
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Action Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-300 w-full max-w-3xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">New R&D Project</h3>
                <button
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setProjectFormData({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                  <input
                    type="text"
                    value={projectFormData.projectName || ''}
                    onChange={(e) => setProjectFormData((prev: any) => ({ ...prev, projectName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Description *</label>
                  <textarea
                    value={projectFormData.projectDescription || ''}
                    onChange={(e) => setProjectFormData((prev: any) => ({ ...prev, projectDescription: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Phase *</label>
                    <select
                      value={projectFormData.projectPhase || 'research'}
                      onChange={(e) => setProjectFormData((prev: any) => ({ ...prev, projectPhase: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="research">Research</option>
                      <option value="development">Development</option>
                      <option value="testing">Testing</option>
                      <option value="pilot">Pilot</option>
                      <option value="production_ready">Production Ready</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Manager</label>
                    <input
                      type="text"
                      value={projectFormData.projectManager || ''}
                      onChange={(e) => setProjectFormData((prev: any) => ({ ...prev, projectManager: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={projectFormData.notes || ''}
                    onChange={(e) => setProjectFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setProjectFormData({});
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Saving project:', projectFormData);
                    // TODO: Implement API call to save project
                    setShowNewProjectModal(false);
                    setProjectFormData({});
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default QualityControlModule;
