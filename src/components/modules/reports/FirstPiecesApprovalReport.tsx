'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Save, Printer, Download, ChevronRight, ChevronDown, ClipboardCheck, AlertCircle, Check, X, AlertTriangle } from 'lucide-react';
import { Line, Mold } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';

interface CavityData {
  cavity: string;
  surfaceFinish: string;
  weight: number;
  volume: number;
  lengthInnerDia: number;
  breadthOuterDia: number;
  height: number;
  fitmentC1: boolean;
  fitmentC2: boolean;
  leakageTest: string;
  remarks: string;
}

interface WallThicknessData {
  quadrant: string;
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  G: number;
}

interface FirstPiecesApprovalReportProps {
  linesMaster: Line[];
  moldsMaster: Mold[];
}

const FirstPiecesApprovalReport: React.FC<FirstPiecesApprovalReportProps> = ({ linesMaster, moldsMaster }) => {
  const { user } = useAuth();
  const [lines, setLines] = useState<any[]>([]);
  const [molds, setMolds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  
  // Production date picker
  const [selectedProductionDate, setSelectedProductionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // Track selected mold per line
  const [selectedMoldPerLine, setSelectedMoldPerLine] = useState<Record<string, any>>({});
  
  // Store form data per line
  const [formDataPerLine, setFormDataPerLine] = useState<Record<string, any>>({});
  
  // Mold lock status per line
  const [moldLockedPerLine, setMoldLockedPerLine] = useState<Record<string, boolean>>({});
  
  // Error messages per line
  const [errorPerLine, setErrorPerLine] = useState<Record<string, string | null>>({});
  
  // Changeover tracking
  const [previousMoldPerLine, setPreviousMoldPerLine] = useState<Record<string, string>>({});
  const [changeoverCountPerLine, setChangeoverCountPerLine] = useState<Record<string, number>>({});

  // Calculate line status based on machine assignments
  const calculateLineStatus = (line: Line) => {
    const hasAllMachines = line.im_machine_id && 
                          line.robot_machine_id && 
                          line.conveyor_machine_id && 
                          line.hoist_machine_id;
    return hasAllMachines ? 'Active' : 'Inactive';
  };

  // Convert props data to component format
  useEffect(() => {
    const convertedLines = linesMaster.map((line: Line) => {
      const calculatedStatus = calculateLineStatus(line);
      return {
        id: line.line_id,
        line_name: line.line_id,
        description: line.description || '',
        status: calculatedStatus // Use calculated status instead of database status
      };
    });
    
    const convertedMolds = moldsMaster.map((mold: Mold) => ({
      id: mold.mold_id,
      mold_name: mold.mold_name,
      cavities: mold.cavities,
      std_weight: mold.int_wt || 100,
      cycle_time: mold.cycle_time || 30,
      description: mold.item_name || ''
    }));
    
    setLines(convertedLines);
    setMolds(convertedMolds);
  }, [linesMaster, moldsMaster]);

  // Clear all line data when production date changes
  useEffect(() => {
    setSelectedMoldPerLine({});
    setFormDataPerLine({});
    setMoldLockedPerLine({});
    setErrorPerLine({});
    setExpandedLines(new Set());
  }, [selectedProductionDate]);

  const toggleLineExpansion = (lineId: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
    } else {
      newExpanded.add(lineId);
      // Load existing data when line is expanded
      loadExistingData(lineId);
    }
    setExpandedLines(newExpanded);
  };

  const loadExistingData = async (lineId: string) => {
    try {
      console.log(`🔍 Loading First Pieces data for line ${lineId} on production date ${selectedProductionDate}`);
      
      const response = await fetch(`/api/first-pieces-approval?lineId=${lineId}&productionDate=${selectedProductionDate}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        console.log(`✅ Found ${result.data.length} entries for line ${lineId}:`, result.data);
        
        // Map database data to form format
        const dbData = result.data;
        const firstEntry = dbData[0];
        
        // Find the mold from mold master
        const mold = molds.find(m => m.mold_name === firstEntry.mold_name);
        
        if (mold) {
          console.log(`🎯 Setting mold ${mold.mold_name} for line ${lineId}`);
          setSelectedMoldPerLine(prev => ({ ...prev, [lineId]: mold }));
          setMoldLockedPerLine(prev => ({ ...prev, [lineId]: true }));
          
          // Initialize form data with existing data
          const cavityData = Array.from({ length: mold.cavities }, (_, i) => {
            const existingCavity = firstEntry.cavity_data?.[i] || {};
            return {
              cavity: `C${i + 1}`,
              surfaceFinish: existingCavity.surfaceFinish || '',
              weight: existingCavity.weight || 0,
              volume: existingCavity.volume || 0,
              lengthInnerDia: existingCavity.lengthInnerDia || 0,
              breadthOuterDia: existingCavity.breadthOuterDia || 0,
              height: existingCavity.height || 0,
              fitment: existingCavity.fitment || Array.from({ length: mold.cavities }, () => false),
              leakageTest: existingCavity.leakageTest || '',
              remarks: existingCavity.remarks || ''
            };
          });
          
          // Create wall thickness data for each cavity independently
          const wallThicknessData = Array.from({ length: mold.cavities }, (_, cavityIndex) => {
            const existingData = firstEntry.wall_thickness_data?.[cavityIndex] || [];
            return existingData.length > 0 ? existingData : [
              { quadrant: 'X1', A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 },
              { quadrant: 'X2', A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 },
              { quadrant: 'Y1', A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 },
              { quadrant: 'Y2', A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 }
            ];
          });
          
          setFormDataPerLine(prev => ({
            ...prev,
            [lineId]: {
              lineNo: lineId,
              date: selectedProductionDate,
              time: new Date().toLocaleTimeString(),
              cycleTime: mold.cycle_time || 0,
              barrelTemp: firstEntry.barrel_temp || 200,
              processRemarks: firstEntry.process_remarks || '',
      cavityData,
              wallThicknessData,
              isSubmitted: firstEntry.is_submitted || false
            }
          }));
        } else {
          console.warn(`⚠️ Mold "${firstEntry.mold_name}" not found in mold master for line ${lineId}`);
        }
      } else {
        console.log(`ℹ️ No existing data found for line ${lineId} on ${selectedProductionDate}`);
        // Clear any existing data for this line
        setSelectedMoldPerLine(prev => {
          const newState = { ...prev };
          delete newState[lineId];
          return newState;
        });
        setFormDataPerLine(prev => {
          const newState = { ...prev };
          delete newState[lineId];
          return newState;
        });
        setMoldLockedPerLine(prev => {
          const newState = { ...prev };
          delete newState[lineId];
          return newState;
        });
      }
    } catch (error) {
      console.error(`❌ Error loading existing data for line ${lineId}:`, error);
    }
  };

  const getMoldsForLine = (lineId: string) => {
    // For now, return all molds. In a real app, you'd filter by line_id
    return molds;
  };

  const getLineStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'inactive':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'maintenance':
        return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const handleMoldSelection = (lineId: string, mold: any) => {
    // Check if mold is already selected on another line
    const isMoldInUse = Object.values(selectedMoldPerLine).some(selectedMold => 
      selectedMold && selectedMold.mold_name === mold.mold_name
    );
    
    if (isMoldInUse) {
      setErrorPerLine(prev => ({ 
        ...prev, 
        [lineId]: `Mold ${mold.mold_name} is already selected on another line. Please choose a different mold.` 
      }));
      return;
    }
    
    // Clear any previous errors
    setErrorPerLine(prev => ({ ...prev, [lineId]: null }));
    
    setSelectedMoldPerLine(prev => ({ ...prev, [lineId]: mold }));
    
    // Initialize form data for this line if not exists
    if (!formDataPerLine[lineId]) {
      const initialCavityData = Array.from({ length: mold.cavities }, (_, i) => ({
        cavity: `C${i + 1}`,
        surfaceFinish: '',
        weight: 0,
        volume: 0,
        lengthInnerDia: 0,
        breadthOuterDia: 0,
        height: 0,
        fitment: Array.from({ length: mold.cavities }, () => false), // Dynamic fitment checkboxes based on number of cavities
        leakageTest: '',
        remarks: ''
      }));
      
      // Create wall thickness data for each cavity independently
      const initialWallThicknessData = Array.from({ length: mold.cavities }, (_, cavityIndex) => [
        { quadrant: 'X1', A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 },
        { quadrant: 'X2', A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 },
        { quadrant: 'Y1', A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 },
        { quadrant: 'Y2', A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 }
      ]);
      
      setFormDataPerLine(prev => ({
        ...prev,
        [lineId]: {
          lineNo: lineId,
          date: selectedProductionDate,
          time: new Date().toLocaleTimeString(),
          cycleTime: mold.cycle_time || 0,
          barrelTemp: 200,
          processRemarks: '',
          cavityData: initialCavityData,
          wallThicknessData: initialWallThicknessData,
          isSubmitted: false
        }
      }));
    }
    
    // Lock the mold after selection
    setMoldLockedPerLine(prev => ({ ...prev, [lineId]: true }));
  };

  const handleChangeoverClick = (lineId: string) => {
    // Unlock the mold selection for changeover
    // Keep all existing data - just allow selecting a new mold for future entries
    setMoldLockedPerLine(prev => ({ ...prev, [lineId]: false }));
    // Clear any errors
    setErrorPerLine(prev => ({ ...prev, [lineId]: null }));
  };

  const handleSave = async (lineId: string) => {
    try {
      const formData = formDataPerLine[lineId];
      const selectedMold = selectedMoldPerLine[lineId];
      
      if (!formData || !selectedMold) {
        setErrorPerLine(prev => ({ ...prev, [lineId]: 'Please select a mold and fill in the form data.' }));
        return;
      }

      const reportData = {
        lineId: lineId,
        moldName: selectedMold.mold_name,
        productionDate: selectedProductionDate,
        cavityData: formData.cavityData,
        wallThicknessData: formData.wallThicknessData,
        barrelTemp: formData.barrelTemp,
        processRemarks: formData.processRemarks,
        submittedBy: user?.fullName || user?.username || 'Unknown User'
      };

      console.log('Submitting First Pieces data:', reportData);

      const response = await fetch('/api/first-pieces-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ First Pieces data saved successfully');
        // Mark as submitted
        setFormDataPerLine(prev => ({
          ...prev,
          [lineId]: {
            ...prev[lineId],
            isSubmitted: true
          }
        }));
        setErrorPerLine(prev => ({ ...prev, [lineId]: null }));
      } else {
        console.error('❌ Failed to save First Pieces data:', result.error);
        setErrorPerLine(prev => ({ ...prev, [lineId]: result.error || 'Failed to save data' }));
      }
    } catch (error) {
      console.error('❌ Error saving First Pieces data:', error);
      setErrorPerLine(prev => ({ ...prev, [lineId]: 'Network error. Please try again.' }));
    }
  };

  const filteredLines = lines.filter(line => {
    const matchesSearch = line.line_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         line.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || line.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setFrequencyFilter('all');
  };

    return (
    <div className="space-y-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">First Pieces Approval Report</h1>
            <p className="text-gray-600">Select mold and line for first pieces quality approval</p>
        </div>

      {/* Production Date Picker */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Production Date:</label>
          <input
            type="date"
            value={selectedProductionDate}
            onChange={(e) => {
              setSelectedProductionDate(e.target.value);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-sm text-gray-600">
            Production Day: {new Date(selectedProductionDate).toLocaleDateString()} (08:00) to {new Date(new Date(selectedProductionDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString()} (08:00)
          </div>
          <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
            📅 View/Edit data for selected date
          </div>
        </div>
        </div>

          {/* Filter and Action Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-64">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Lines</label>
                <div className="relative">
              <input
                    type="text"
                    placeholder="Search lines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
            </div>
        </div>
      </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
            <select 
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Select Frequency</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <button 
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
            Clear Filters
                </button>
            </div>
          </div>
          
          {/* Available Lines List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Lines</h3>
          {filteredLines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No lines found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLines.map(line => {
                const isExpanded = expandedLines.has(line.id);
                const lineMolds = getMoldsForLine(line.id);
                const selectedMold = selectedMoldPerLine[line.id];
                const formData = formDataPerLine[line.id];
                const isMoldLocked = moldLockedPerLine[line.id];
                const error = errorPerLine[line.id];
                const changeoverCount = changeoverCountPerLine[line.id] || 0;
                
                return (
                  <div key={line.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Line Header */}
                    <div 
                      className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => toggleLineExpansion(line.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button className="text-gray-400 hover:text-gray-600">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </button>
                      <div>
                            <h3 className="text-lg font-semibold text-gray-900">{line.line_name}</h3>
                            <p className="text-sm text-gray-500">{line.description}</p>
                      </div>
                      </div>
                    <div className="flex items-center space-x-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getLineStatusColor(line.status)}`}>
                            {line.status}
                          </span>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-600">
                              {selectedMold ? 'Mold Selected' : 'No Mold Selected'}
                    </div>
                            <div className="text-xs text-gray-500">
                              {lineMolds.length} Molds • {changeoverCount} Changeovers
                            </div>
                              </div>
                              </div>
                              </div>
                              </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50">
                        <div className="p-6">
                          <h4 className="text-md font-semibold text-gray-900 mb-4">Select Mold for {line.line_name}</h4>
                          
                          {/* Error Message */}
                          {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                              <div className="flex items-center">
                                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                                <span className="text-sm text-red-700">{error}</span>
                              </div>
                            </div>
                          )}
                          
                          {lineMolds.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              No molds available for this line
                        </div>
                          ) : (
                            <div>
        {/* Mold Selection */}
                              <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Select Mold
                                </label>
                                <select
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                                  value={selectedMold?.id || ''}
                                  onChange={(e) => {
                                    const mold = lineMolds.find(m => m.id === e.target.value);
                                    if (mold) {
                                      handleMoldSelection(line.id, mold);
                                    }
                                  }}
                                  disabled={isMoldLocked}
                                >
                                  <option value="">
                                    -- Select a mold --
                                  </option>
                                  {lineMolds.map((mold) => (
                                    <option key={mold.id} value={mold.id}>
                                      {mold.mold_name} - {mold.cavities} cavities, {mold.std_weight}g int wt, {mold.cycle_time}s cycle
                                    </option>
                                  ))}
                                </select>
                                <p className="text-sm text-gray-600">
                                  {lineMolds.length} molds available for this line
                                </p>
                                
                                {/* Changeover Button */}
                                {selectedMold && (
                                  <div className="mt-4">
                                    <button
                                      onClick={() => handleChangeoverClick(line.id)}
                                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                      </svg>
                                      Changeover
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Production Info Panel */}
                              {selectedMold && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-6">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-blue-800">Current Mold:</span>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                                          {selectedMold.mold_name}
                                        </span>
                                      </div>
                                      <div className="text-sm text-blue-700">
                                        <span className="font-medium">Cycle:</span> {selectedMold.cycle_time}s
                                      </div>
                                      <div className="text-sm text-blue-700">
                                        <span className="font-medium">Int Wt:</span> {selectedMold.std_weight}g
                                      </div>
                                      <div className="text-sm text-blue-700">
                                        <span className="font-medium">Cavities:</span> {selectedMold.cavities}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-blue-800">Changeovers:</span>
                                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-medium">
                                        {changeoverCount}
                                      </span>
                            </div>
                        </div>
                      </div>
                              )}

                              {/* First Pieces Approval Form - Shows when mold is selected */}
                              {selectedMold && formData && (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                  <div className="flex items-center justify-between mb-6">
                                    <div>
                                      <h3 className="text-xl font-bold text-gray-900">
                                        First Pieces Approval - {selectedMold.mold_name}
                                      </h3>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Line: {line.line_name} | Production Day: {new Date(selectedProductionDate).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {formData.isSubmitted ? (
                                        <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                          <CheckCircle className="w-4 h-4" />
                                          <span>Submitted</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                          <Clock className="w-4 h-4" />
                                          <span>Pending</span>
                                        </div>
                                      )}
                                    </div>
                            </div>

                                  {/* Form Header Information */}
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Line No.</label>
                                <input
                                  type="text"
                                        value={formData.lineNo}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm"
                                />
                              </div>
              <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                  type="text"
                                        value={formData.date}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm"
                                />
                              </div>
              <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                <div className="relative">
                                <input
                                  type="text"
                                          value={formData.time}
                                          disabled
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm"
                                        />
                                        <Clock className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
                            </div>
                          </div>
              <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Time</label>
                                <input
                                  type="number"
                                        value={formData.cycleTime}
                                        onChange={(e) => {
                                          setFormDataPerLine(prev => ({
                                            ...prev,
                                            [line.id]: {
                                              ...prev[line.id],
                                              cycleTime: parseFloat(e.target.value) || 0
                                            }
                                          }));
                                        }}
                                        disabled={formData.isSubmitted}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
              <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Barrel Temp (Nozzle)</label>
                                <input
                                  type="number"
                                        value={formData.barrelTemp}
                                        onChange={(e) => {
                                          setFormDataPerLine(prev => ({
                                            ...prev,
                                            [line.id]: {
                                              ...prev[line.id],
                                              barrelTemp: parseFloat(e.target.value) || 200
                                            }
                                          }));
                                        }}
                                        disabled={formData.isSubmitted}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
              <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                <input
                                  type="text"
                                  placeholder="Process remarks"
                                        value={formData.processRemarks}
                                        onChange={(e) => {
                                          setFormDataPerLine(prev => ({
                                            ...prev,
                                            [line.id]: {
                                              ...prev[line.id],
                                              processRemarks: e.target.value
                                            }
                                          }));
                                        }}
                                        disabled={formData.isSubmitted}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                      />
                          </div>
                              </div>

                                  {/* Cavity Data Table */}
                                  <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Cavity Data</h4>
                        <div className="overflow-x-auto">
                                      <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-20">CAVITY</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-32">SURFACE FINISH / VISUAL</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-24">WEIGHT (GM)</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-24">VOLUME (ML)</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-32">LENGTH/INNER DIA (MM)</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-32">BREADTH/OUTER DIA (MM)</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-24">HEIGHT (MM)</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-32">FITMENT</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-24">LEAKAGE TEST</th>
                                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-24">REMARKS</th>
                              </tr>
                            </thead>
                <tbody>
                                          {formData.cavityData.map((cavity: any, index: number) => (
                                            <tr key={index} className={`hover:bg-gray-50 ${formData.isSubmitted ? 'bg-green-50' : ''}`}>
                                              <td className="border border-gray-300 px-4 py-3 font-medium">{cavity.cavity}</td>
                                              <td className="border border-gray-300 px-4 py-3">
                                    <input
                                      type="text"
                                                  placeholder="Surface finish"
                          value={cavity.surfaceFinish}
                                                  onChange={(e) => {
                                                    const newCavityData = [...formData.cavityData];
                                                    newCavityData[index].surfaceFinish = e.target.value;
                                                    setFormDataPerLine(prev => ({
                                                      ...prev,
                                                      [line.id]: {
                                                        ...prev[line.id],
                                                        cavityData: newCavityData
                                                      }
                                                    }));
                                                  }}
                                                  disabled={formData.isSubmitted}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                              <td className="border border-gray-300 px-4 py-3">
                                    <input
                                      type="number"
                                                  step="0.1"
                                                  placeholder={selectedMold.std_weight.toString()}
                                                  value={cavity.weight || ''}
                                                  onChange={(e) => {
                                                    const newCavityData = [...formData.cavityData];
                                                    newCavityData[index].weight = parseFloat(e.target.value) || 0;
                                                    setFormDataPerLine(prev => ({
                                                      ...prev,
                                                      [line.id]: {
                                                        ...prev[line.id],
                                                        cavityData: newCavityData
                                                      }
                                                    }));
                                                  }}
                                                  disabled={formData.isSubmitted}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                              <td className="border border-gray-300 px-4 py-3">
                                    <input
                                      type="number"
                                                  step="0.1"
                                                  placeholder="Volume (ml)"
                                                  value={cavity.volume || ''}
                                                  onChange={(e) => {
                                                    const newCavityData = [...formData.cavityData];
                                                    newCavityData[index].volume = parseFloat(e.target.value) || 0;
                                                    setFormDataPerLine(prev => ({
                                                      ...prev,
                                                      [line.id]: {
                                                        ...prev[line.id],
                                                        cavityData: newCavityData
                                                      }
                                                    }));
                                                  }}
                                                  disabled={formData.isSubmitted}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                              <td className="border border-gray-300 px-4 py-3">
                                    <input
                                      type="number"
                                                  step="0.1"
                                                  placeholder="Length (mm)"
                                                  value={cavity.lengthInnerDia || ''}
                                                  onChange={(e) => {
                                                    const newCavityData = [...formData.cavityData];
                                                    newCavityData[index].lengthInnerDia = parseFloat(e.target.value) || 0;
                                                    setFormDataPerLine(prev => ({
                                                      ...prev,
                                                      [line.id]: {
                                                        ...prev[line.id],
                                                        cavityData: newCavityData
                                                      }
                                                    }));
                                                  }}
                                                  disabled={formData.isSubmitted}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                              <td className="border border-gray-300 px-4 py-3">
                                    <input
                                      type="number"
                                                  step="0.1"
                                                  placeholder="Breadth (mm)"
                                                  value={cavity.breadthOuterDia || ''}
                                                  onChange={(e) => {
                                                    const newCavityData = [...formData.cavityData];
                                                    newCavityData[index].breadthOuterDia = parseFloat(e.target.value) || 0;
                                                    setFormDataPerLine(prev => ({
                                                      ...prev,
                                                      [line.id]: {
                                                        ...prev[line.id],
                                                        cavityData: newCavityData
                                                      }
                                                    }));
                                                  }}
                                                  disabled={formData.isSubmitted}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                              <td className="border border-gray-300 px-4 py-3">
                                    <input
                                      type="number"
                                                  step="0.1"
                                                  placeholder="Height (mm)"
                                                  value={cavity.height || ''}
                                                  onChange={(e) => {
                                                    const newCavityData = [...formData.cavityData];
                                                    newCavityData[index].height = parseFloat(e.target.value) || 0;
                                                    setFormDataPerLine(prev => ({
                                                      ...prev,
                                                      [line.id]: {
                                                        ...prev[line.id],
                                                        cavityData: newCavityData
                                                      }
                                                    }));
                                                  }}
                                                  disabled={formData.isSubmitted}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                              <td className="border border-gray-300 px-4 py-3">
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                  {(() => {
                                                    const totalCavities = cavity.fitment.length;
                                                    
                                                    // Determine grid layout based on cavity count
                                                    let colsPerRow = 2; // Default for 2-4 cavities
                                                    if (totalCavities >= 8) {
                                                      colsPerRow = 4; // 4 columns for 8+ cavities
                                                    } else if (totalCavities >= 6) {
                                                      colsPerRow = 3; // 3 columns for 6-7 cavities
                                                    } else if (totalCavities === 5) {
                                                      colsPerRow = 3; // 3 columns for 5 cavities (2+3 layout)
                                                    }
                                                    
                                                    const rows = Math.ceil(totalCavities / colsPerRow);
                                                    
                                                    return (
                                                      <>
                                                        {Array.from({ length: rows }, (_, rowIndex) => (
                                                          <div key={rowIndex} className="flex gap-2 mb-1">
                                                            {Array.from({ length: colsPerRow }, (_, colIndex) => {
                                                              const fitmentIndex = rowIndex * colsPerRow + colIndex;
                                                              if (fitmentIndex >= totalCavities) return null;
                                                              return (
                                                                <label key={fitmentIndex} className="flex items-center">
                                          <input
                                            type="checkbox"
                                                                    checked={cavity.fitment[fitmentIndex]}
                                                                    onChange={(e) => {
                                                                      const newCavityData = [...formData.cavityData];
                                                                      newCavityData[index].fitment[fitmentIndex] = e.target.checked;
                                                                      setFormDataPerLine(prev => ({
                                                                        ...prev,
                                                                        [line.id]: {
                                                                          ...prev[line.id],
                                                                          cavityData: newCavityData
                                                                        }
                                                                      }));
                                                                    }}
                                                                    disabled={formData.isSubmitted}
                              className="mr-1"
                            />
                                                                  <span className="text-xs">C{fitmentIndex + 1}</span>
                                        </label>
                                                              );
                                                            })}
                                                          </div>
                                                        ))}
                                                      </>
                                                    );
                                                  })()}
                                    </div>
                                  </td>
                                              <td className="border border-gray-300 px-4 py-3">
                                    <input
                                      type="text"
                                                  placeholder="Leakage test"
                          value={cavity.leakageTest}
                                                  onChange={(e) => {
                                                    const newCavityData = [...formData.cavityData];
                                                    newCavityData[index].leakageTest = e.target.value;
                                                    setFormDataPerLine(prev => ({
                                                      ...prev,
                                                      [line.id]: {
                                                        ...prev[line.id],
                                                        cavityData: newCavityData
                                                      }
                                                    }));
                                                  }}
                                                  disabled={formData.isSubmitted}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                              <td className="border border-gray-300 px-4 py-3">
                                    <input
                                      type="text"
                                                  placeholder="Remarks"
                                      value={cavity.remarks}
                                                  onChange={(e) => {
                                                    const newCavityData = [...formData.cavityData];
                                                    newCavityData[index].remarks = e.target.value;
                                                    setFormDataPerLine(prev => ({
                                                      ...prev,
                                                      [line.id]: {
                                                        ...prev[line.id],
                                                        cavityData: newCavityData
                                                      }
                                                    }));
                                                  }}
                                                  disabled={formData.isSubmitted}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                    </tr>
                              ))}
                            </tbody>
                          </table>
                                    </div>
        </div>

        {/* Wall Thickness Measurements */}
                                  <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Wall Thickness Measurements</h4>
            <p className="text-sm text-gray-600 mb-4">
              Each piece from a cavity is cut into 4 quadrants (X1, X2, Y1, Y2) for wall thickness measurement
            </p>
                                    
                                    {formData.cavityData.map((cavity: any, cavityIndex: number) => (
                                      <div key={cavityIndex} className="mb-4">
                                        <h5 className="text-md font-medium text-gray-800 mb-2">Cavity {cavityIndex + 1} - Wall Thickness Measurements</h5>
                                        <div className="overflow-x-auto">
                                          <table className="w-full border-collapse table-fixed">
                                            <thead>
                                              <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-24">QUADRANT</th>
                                                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-20">A</th>
                                                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-20">B</th>
                                                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-20">C</th>
                                                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-20">D</th>
                                                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-20">E</th>
                                                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-20">F</th>
                                                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm w-20">G</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {formData.wallThicknessData[cavityIndex].map((row: any, index: number) => (
                                                <tr key={index} className={`hover:bg-gray-50 ${formData.isSubmitted ? 'bg-green-50' : ''}`}>
                                                  <td className="border border-gray-300 px-4 py-3 font-medium">{row.quadrant}</td>
                                                  {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((position) => (
                                                    <td key={position} className="border border-gray-300 px-4 py-3">
                                                      <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="-"
                                                        value={row[position] || ''}
                                                        onChange={(e) => {
                                                          const newWallThicknessData = [...formData.wallThicknessData];
                                                          newWallThicknessData[cavityIndex][index][position] = parseFloat(e.target.value) || 0;
                                                          setFormDataPerLine(prev => ({
                                                            ...prev,
                                                            [line.id]: {
                                                              ...prev[line.id],
                                                              wallThicknessData: newWallThicknessData
                                                            }
                                                          }));
                                                        }}
                                                        disabled={formData.isSubmitted}
                                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                                      />
                                                    </td>
                                                  ))}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Submit Button */}
                                  <div className="flex justify-end">
                                    {!formData.isSubmitted && (
                                      <button
                                        onClick={() => handleSave(line.id)}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                                      >
                                        <Save className="w-4 h-4 mr-2" />
                                        Submit First Pieces Approval
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
                          </div>
      </div>
    </div>
  );
};

export default FirstPiecesApprovalReport;