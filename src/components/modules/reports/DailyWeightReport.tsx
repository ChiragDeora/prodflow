'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Scale, Save, CheckCircle, AlertTriangle, Calendar, Settings, ChevronRight, ChevronDown, XCircle, Repeat } from 'lucide-react';
import { Line, Mold } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';

interface CavityWeight {
  cavity: string;
  weight: number | null;
  isActive?: boolean;
}

interface TimeSlotData {
  id: string;
  timeSlot: string;
  cycleTime: number;
  cavityWeights: CavityWeight[];
  avgWeight: number;
  notes: string;
  status: 'Pending' | 'Completed' | 'In Progress';
  submitted: boolean;
  moldId?: string;
  moldName?: string;
  moldStdWeight?: number;
  isChangeoverPoint?: boolean;
  previousMoldName?: string;
}

interface LineMaster {
  id: string;
  line_name: string;
  description: string;
  status: string;
}

interface MoldMaster {
  id: string;
  mold_name: string;
  cavities: number;
  std_weight: number;
  cycle_time: number;
  description: string;
}

interface DailyWeightReportProps {
  linesMaster: Line[];
  moldsMaster: Mold[];
}

const DailyWeightReport: React.FC<DailyWeightReportProps> = ({ linesMaster, moldsMaster }) => {
  const { user } = useAuth();
  const [lines, setLines] = useState<LineMaster[]>([]);
  const [molds, setMolds] = useState<MoldMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  
  // Production date state (defaults to today)
  const [selectedProductionDate, setSelectedProductionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Track selected mold per line
  const [selectedMoldPerLine, setSelectedMoldPerLine] = useState<Record<string, MoldMaster>>({});
  // Track time slots per line
  const [timeSlotsPerLine, setTimeSlotsPerLine] = useState<Record<string, TimeSlotData[]>>({});
  // Track if mold is locked per line
  const [moldLockedPerLine, setMoldLockedPerLine] = useState<Record<string, boolean>>({});
  // Track previous mold for changeover display
  const [previousMoldPerLine, setPreviousMoldPerLine] = useState<Record<string, MoldMaster | null>>({});
  
  // Track errors per line
  const [errorPerLine, setErrorPerLine] = useState<Record<string, string | null>>({});

  // Calculate line status based on machine assignments
  const calculateLineStatus = (line: any) => {
    const hasAllMachines = line.im_machine_id && 
                          line.robot_machine_id && 
                          line.conveyor_machine_id && 
                          line.hoist_machine_id;
    return hasAllMachines ? 'Active' : 'Inactive';
  };

  // Convert props data to component format
  useEffect(() => {
    console.log('🔍 DailyWeightReport - linesMaster data:', linesMaster);
    console.log('🔍 DailyWeightReport - first line status:', linesMaster[0]?.status);
    
    const convertedLines: LineMaster[] = linesMaster.map(line => {
      const calculatedStatus = calculateLineStatus(line);
      console.log(`🔍 Processing line ${line.line_id}:`, {
        line_id: line.line_id,
        database_status: line.status,
        calculated_status: calculatedStatus,
        description: line.description,
        im_machine_id: line.im_machine_id,
        robot_machine_id: line.robot_machine_id,
        conveyor_machine_id: line.conveyor_machine_id,
        hoist_machine_id: line.hoist_machine_id
      });
      
      return {
        id: line.line_id,
        line_name: line.line_id,
        description: line.description || '',
        status: calculatedStatus // Use calculated status instead of database status
      };
    });
    
    const convertedMolds: MoldMaster[] = moldsMaster.map(mold => ({
      id: mold.mold_id,
      mold_name: mold.mold_name,
      cavities: mold.cavities,
      std_weight: mold.std_wt || 100,
      cycle_time: mold.cycle_time || 30,
      description: mold.item_name || ''
    }));
    
    setLines(convertedLines);
    setMolds(convertedMolds);
  }, [linesMaster, moldsMaster]);

  // Clear data when production date changes
  useEffect(() => {
    // Clear all line data when production date changes
    setSelectedMoldPerLine({});
    setTimeSlotsPerLine({});
    setMoldLockedPerLine({});
    setErrorPerLine({});
    setExpandedLines(new Set());
  }, [selectedProductionDate]);

  const loadExistingData = async (lineId: string) => {
    try {
      console.log(`🔍 Loading data for line ${lineId} on production date ${selectedProductionDate}`);
      
      const response = await fetch(`/api/daily-weight-report?lineId=${lineId}&productionDate=${selectedProductionDate}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        console.log(`✅ Found ${result.data.length} entries for line ${lineId}:`, result.data);
        
        // Map database data to TimeSlotData format
        const dbData = result.data;
        const maxCavities = getMaxCavities();
        
        // Sort database entries by start_time to ensure proper order
        const sortedDbData = dbData.sort((a: any, b: any) => {
          const timeA = a.start_time || '00:00:00';
          const timeB = b.start_time || '00:00:00';
          return timeA.localeCompare(timeB);
        });

        const slots: TimeSlotData[] = sortedDbData.map((entry: any) => {
          // Convert time_slot from database format to display format
          let timeSlot;
          if (entry.time_slot.includes(':')) {
            // Already in correct format "08:00 - 10:00"
            timeSlot = entry.time_slot;
          } else {
            // Convert "08-10" to "08:00 - 10:00" or "24-02" to "00:00 - 02:00"
            const [start, end] = entry.time_slot.split('-');
            const startTime = start === '24' ? '00' : start;
            timeSlot = `${startTime}:00 - ${end}:00`;
          }
          
          // Map cavity_weights array to CavityWeight format
          const cavityWeights = Array.from({ length: maxCavities }, (_, i) => ({
            cavity: `C${i + 1}`,
            weight: entry.cavity_weights[i] || null,
            isActive: i < entry.cavity_weights.length
          }));
          
          return {
            id: entry.id,
            timeSlot,
            cycleTime: Number(entry.cycle_time),
            cavityWeights,
            avgWeight: Number(entry.average_weight),
            notes: entry.notes || '',
            status: 'Completed' as const,
            submitted: true,
            moldId: entry.mold_name,
            moldName: entry.mold_name,
            moldStdWeight: 0, // Will be updated from mold master
            isChangeoverPoint: entry.is_changeover_point || false,
            previousMoldName: entry.previous_mold_name
          };
        });
        
        // Find the mold from mold master
        const firstMoldName = dbData[0].mold_name;
        const mold = molds.find(m => m.mold_name === firstMoldName);
        
        if (mold) {
          // Update mold std weight in slots
          slots.forEach(slot => {
            if (slot.moldName === mold.mold_name) {
              slot.moldStdWeight = mold.std_weight;
            }
          });
          
          console.log(`🎯 Setting mold ${mold.mold_name} for line ${lineId}`);
          setSelectedMoldPerLine(prev => ({ ...prev, [lineId]: mold }));
          setMoldLockedPerLine(prev => ({ ...prev, [lineId]: true }));
        } else {
          console.warn(`⚠️ Mold "${firstMoldName}" not found in mold master for line ${lineId}`);
        }
        
        setTimeSlotsPerLine(prev => ({ ...prev, [lineId]: slots }));
      } else {
        console.log(`ℹ️ No existing data found for line ${lineId} on ${selectedProductionDate}`);
        // Clear any existing data for this line
        setSelectedMoldPerLine(prev => {
          const newState = { ...prev };
          delete newState[lineId];
          return newState;
        });
        setTimeSlotsPerLine(prev => {
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

  const toggleLineExpansion = (lineId: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
      // Clear errors when collapsing
      setErrorPerLine(prev => ({ ...prev, [lineId]: null }));
    } else {
      newExpanded.add(lineId);
      // Load existing data when expanding
      loadExistingData(lineId);
    }
    setExpandedLines(newExpanded);
  };

  const getMoldsForLine = (lineId: string) => {
    // For now, return all molds. In a real app, you'd filter by line_id
    return molds;
  };

  // Get maximum number of cavities from all molds
  const getMaxCavities = () => {
    if (molds.length === 0) return 8; // Default to 8 if no molds
    return Math.max(...molds.map(m => m.cavities), 8); // At least 8
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

  const getWeightToleranceIcon = (avgWeight: number, stdWeight: number) => {
    const difference = Math.abs(avgWeight - stdWeight);
    
    if (avgWeight === 0) {
      return null; // No data yet
    }
    
    // Exact match (same as standard weight)
    if (difference === 0) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    // Within tolerance (±0.5g)
    else if (difference <= 0.5) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
    // Out of tolerance
    else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const generateTimeSlots = (mold: MoldMaster) => {
    const dayShiftSlots = [
      '08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', 
      '16:00 - 18:00', '18:00 - 20:00'
    ];
    
    const nightShiftSlots = [
      '20:00 - 22:00', '22:00 - 00:00', '00:00 - 02:00', '02:00 - 04:00',
      '04:00 - 06:00', '06:00 - 08:00'
    ];

    const allSlots = [...dayShiftSlots, ...nightShiftSlots];
    const maxCavities = getMaxCavities();
    
    // Create cavity weights for all possible cavities (max across all molds)
    const cavityWeights = Array.from({ length: maxCavities }, (_, i) => ({
      cavity: `C${i + 1}`,
      weight: null,
      isActive: i < mold.cavities // Mark if this cavity is active for this mold
    }));

    // Generate unique IDs using timestamp to avoid conflicts during changeover
    const timestamp = Date.now();
    
    return allSlots.map((slot, index) => ({
      id: `${timestamp}-${mold.id}-${index}`,
      timeSlot: slot,
      cycleTime: mold.cycle_time,
      cavityWeights: [...cavityWeights],
      avgWeight: 0,
      notes: '',
      status: 'Pending' as const,
      submitted: false,
      moldId: mold.id,
      moldName: mold.mold_name,
      moldStdWeight: mold.std_weight,
      isChangeoverPoint: false
    }));
  };

  const handleMoldSelection = (lineId: string, mold: MoldMaster) => {
    // Clear any previous errors for this line
    setErrorPerLine(prev => ({ ...prev, [lineId]: null }));
    
    // Check if this mold is already being used on another line
    const otherLinesUsingMold = Object.entries(selectedMoldPerLine).find(
      ([otherLineId, selectedMold]) => 
        otherLineId !== lineId && selectedMold?.id === mold.id
    );
    
    if (otherLinesUsingMold) {
      const [otherLineId] = otherLinesUsingMold;
      const otherLine = lines.find((l: LineMaster) => l.id === otherLineId);
      setErrorPerLine(prev => ({ 
        ...prev, 
        [lineId]: `Mold "${mold.mold_name}" is already in use on ${otherLine?.line_name || otherLineId}. Please select a different mold.`
      }));
      return;
    }
    
    const existingSlots = timeSlotsPerLine[lineId] || [];
    const isChangeover = existingSlots.length > 0;
    
    if (isChangeover) {
      const previousMold = selectedMoldPerLine[lineId];
      
      // Define all time slots
      const allTimeSlots = [
        '08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', 
        '16:00 - 18:00', '18:00 - 20:00',
        '20:00 - 22:00', '22:00 - 00:00', '00:00 - 02:00', '02:00 - 04:00',
        '04:00 - 06:00', '06:00 - 08:00'
      ];
      
      // Only keep SUBMITTED slots from the old mold (remove unsubmitted ones)
      const submittedSlots = existingSlots.filter(slot => slot.submitted);
      
      // Find which time slots are already used (only submitted ones count)
      const usedTimeSlots = submittedSlots.map(slot => slot.timeSlot);
      
      // Get remaining time slots (those not yet submitted)
      const remainingTimeSlots = allTimeSlots.filter(timeSlot => !usedTimeSlots.includes(timeSlot));
      
      if (remainingTimeSlots.length === 0) {
        setErrorPerLine(prev => ({ 
          ...prev, 
          [lineId]: 'All time slots for today are already filled. Cannot do changeover.'
        }));
        return;
      }
      
      // Store previous mold for changeover display
      setPreviousMoldPerLine(prev => ({ ...prev, [lineId]: previousMold }));
      
      // Generate new slots ONLY for remaining time slots
      const maxCavities = getMaxCavities();
      const cavityWeights = Array.from({ length: maxCavities }, (_, i) => ({
        cavity: `C${i + 1}`,
        weight: null,
        isActive: i < mold.cavities
      }));
      
      const timestamp = Date.now();
      const newSlots: TimeSlotData[] = remainingTimeSlots.map((slot, index) => ({
        id: `${timestamp}-${mold.id}-${index}`,
        timeSlot: slot,
        cycleTime: mold.cycle_time,
        cavityWeights: [...cavityWeights],
        avgWeight: 0,
        notes: '',
        status: 'Pending' as const,
        submitted: false,
        moldId: mold.id,
        moldName: mold.mold_name,
        moldStdWeight: mold.std_weight,
        isChangeoverPoint: index === 0, // First new slot is changeover point
        previousMoldName: index === 0 ? previousMold.mold_name : undefined
      }));
      
      // Keep only SUBMITTED slots from old mold and append new slots
      setTimeSlotsPerLine(prev => ({ 
        ...prev, 
        [lineId]: [...submittedSlots, ...newSlots] 
      }));
    } else {
      // First time selection - create fresh slots
      const slots = generateTimeSlots(mold);
      setTimeSlotsPerLine(prev => ({ ...prev, [lineId]: slots }));
    }
    
    setSelectedMoldPerLine(prev => ({ ...prev, [lineId]: mold }));
    // Lock the mold after selection
    setMoldLockedPerLine(prev => ({ ...prev, [lineId]: true }));
  };

  const handleChangeoverClick = (lineId: string) => {
    // Unlock the mold selection for changeover
    // Keep all existing data - just allow selecting a new mold for future time slots
    setMoldLockedPerLine(prev => ({ ...prev, [lineId]: false }));
    // Clear any errors
    setErrorPerLine(prev => ({ ...prev, [lineId]: null }));
  };

  const updateCavityWeight = (lineId: string, slotId: string, cavityIndex: number, weight: number | null) => {
    setTimeSlotsPerLine(prev => ({
      ...prev,
      [lineId]: prev[lineId].map(slot => {
        if (slot.id === slotId) {
          const updatedWeights = [...slot.cavityWeights];
          updatedWeights[cavityIndex] = { ...updatedWeights[cavityIndex], weight };
          
          // Auto-calculate average (only for active cavities)
          const validWeights = updatedWeights
            .filter(cavity => cavity.isActive && cavity.weight !== null && cavity.weight !== undefined)
            .map(cavity => cavity.weight!);
          
          const avgWeight = validWeights.length > 0 
            ? validWeights.reduce((sum, weight) => sum + weight, 0) / validWeights.length 
            : 0;
          
          return { ...slot, cavityWeights: updatedWeights, avgWeight };
        }
        return slot;
      })
    }));
  };

  const updateCycleTime = (lineId: string, slotId: string, cycleTime: number) => {
    setTimeSlotsPerLine(prev => ({
      ...prev,
      [lineId]: prev[lineId].map(slot => 
        slot.id === slotId ? { ...slot, cycleTime } : slot
      )
    }));
  };

  const updateNotes = (lineId: string, slotId: string, notes: string) => {
    setTimeSlotsPerLine(prev => ({
      ...prev,
      [lineId]: prev[lineId].map(slot => 
        slot.id === slotId ? { ...slot, notes } : slot
      )
    }));
  };

  const calculateAvgWeight = (lineId: string, slotId: string) => {
    setTimeSlotsPerLine(prev => ({
      ...prev,
      [lineId]: prev[lineId].map(slot => {
        if (slot.id === slotId) {
          const validWeights = slot.cavityWeights
            .filter(cavity => cavity.isActive && cavity.weight !== null && cavity.weight !== undefined)
            .map(cavity => cavity.weight!);
          
          const avgWeight = validWeights.length > 0 
            ? validWeights.reduce((sum, weight) => sum + weight, 0) / validWeights.length 
            : 0;
          
          return { ...slot, avgWeight };
        }
        return slot;
      })
    }));
  };

  const fillCavities = (lineId: string, slotId: string) => {
    const mold = selectedMoldPerLine[lineId];
    if (!mold) return;
    
    setTimeSlotsPerLine(prev => ({
      ...prev,
      [lineId]: prev[lineId].map(slot => {
        if (slot.id === slotId) {
          const updatedWeights = slot.cavityWeights.map(cavity => ({
            ...cavity,
            weight: cavity.isActive && cavity.weight === null ? mold.std_weight : cavity.weight
          }));
          
          // Auto-calculate average (only for active cavities)
          const validWeights = updatedWeights
            .filter(cavity => cavity.isActive && cavity.weight !== null && cavity.weight !== undefined)
            .map(cavity => cavity.weight!);
          
          const avgWeight = validWeights.length > 0 
            ? validWeights.reduce((sum, weight) => sum + weight, 0) / validWeights.length 
            : 0;
          
          return { ...slot, cavityWeights: updatedWeights, avgWeight };
        }
        return slot;
      })
    }));
  };

  const submitSlot = async (lineId: string, slotId: string) => {
    const slot = timeSlotsPerLine[lineId]?.find(s => s.id === slotId);
    if (!slot) return;

    try {
      // Get current user from auth context
      const currentUser = user?.fullName || user?.username || 'Unknown User';
      const productionDate = selectedProductionDate;

      // Format time slot for database (e.g., "08:00 - 10:00" => "08-10")
      const timeSlotFormatted = slot.timeSlot.replace(/\s/g, '').replace('-', '-').substring(0, 5);
      
      // Extract start and end times
      const times = slot.timeSlot.split(' - ');
      const startTime = times[0] + ':00';
      const endTime = times[1] + ':00';

      // Format cavity weights as array of numbers
      const cavityWeightsArray = slot.cavityWeights
        .filter(c => c.isActive && c.weight !== null)
        .map(c => c.weight);

      const reportData = {
        lineId: lineId,
        moldName: slot.moldName,
        entryDate: new Date().toISOString().split('T')[0],
        timeSlot: timeSlotFormatted,
        startTime: startTime,
        endTime: endTime,
        cycleTime: Number(slot.cycleTime),
        cavityWeights: cavityWeightsArray,
        averageWeight: Number(slot.avgWeight.toFixed(3)),
        isChangeoverPoint: slot.isChangeoverPoint || false,
        previousMoldName: slot.previousMoldName || null,
        notes: slot.notes || '',
        color: '',
        productionDate: productionDate,
        submittedBy: currentUser
      };

      console.log('Submitting data:', reportData);

      const response = await fetch('/api/daily-weight-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        console.log('✅ Successfully submitted to database');
        // Update local state to mark as submitted
        setTimeSlotsPerLine(prev => ({
          ...prev,
          [lineId]: prev[lineId].map(s => 
            s.id === slotId 
              ? { ...s, status: 'Completed', submitted: true }
              : s
          )
        }));
        alert('✅ Weight report submitted successfully!');
      } else {
        console.error('❌ Failed to submit:', result.error);
        alert(`Failed to submit: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting slot:', error);
      alert('Error submitting weight report. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-green-600 bg-green-50';
      case 'In Progress':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Weight Report</h1>
          <p className="text-gray-600">Select mold and line for weight quality tracking</p>
        </div>

        {/* Production Date Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Production Day:
              </label>
              <input
                type="date"
                value={selectedProductionDate}
                onChange={(e) => {
                  setSelectedProductionDate(e.target.value);
                  // Data will be cleared and reloaded when user expands a line
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Production Day Logic:</span> 08:00 today → 08:00 tomorrow
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
                                0 / 0 Checklists
                              </div>
                              <div className="text-xs text-gray-500">
                                {lineMolds.length} Machines • Frequency-based
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content - Molds */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          <div className="p-6">
                            <h4 className="text-md font-semibold text-gray-900 mb-4">Select Mold for {line.line_name}</h4>
                            {lineMolds.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                No molds available for this line
                              </div>
                            ) : (
                              <div>
                                <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Mold
                                  </label>
                                  <select
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    value={selectedMoldPerLine[line.id]?.id || ''}
                                    disabled={moldLockedPerLine[line.id]}
                                    onChange={(e) => {
                                      const mold = lineMolds.find(m => m.id === e.target.value);
                                      if (mold) {
                                        handleMoldSelection(line.id, mold);
                                      }
                                    }}
                                  >
                                    <option value="">
                                      -- Select a mold --
                                    </option>
                                    {lineMolds.map((mold) => (
                                      <option key={mold.id} value={mold.id}>
                                        {mold.mold_name} - {mold.cavities} cavities, {mold.std_weight}g std wt, {mold.cycle_time}s cycle
                                      </option>
                                    ))}
                                  </select>
                                  
                                  {/* Error Message */}
                                  {errorPerLine[line.id] && (
                                    <div className="mb-4 px-4 py-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                                      <div className="flex items-start">
                                        <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm font-medium">{errorPerLine[line.id]}</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Changeover Button - Only show when mold is locked */}
                                  {moldLockedPerLine[line.id] && (
                                    <button
                                      onClick={() => handleChangeoverClick(line.id)}
                                      className="w-full mb-4 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-300 rounded hover:bg-orange-200 flex items-center justify-center space-x-2"
                                    >
                                      <Repeat className="w-4 h-4" />
                                      <span>Changeover - Switch Mold</span>
                                    </button>
                                  )}
                                  
                                  <p className="text-sm text-gray-600">
                                    {lineMolds.length} molds available for this line
                                  </p>
                                </div>

                                {/* Production Info Panel - Shows when mold is selected */}
                                {selectedMoldPerLine[line.id] && (
                                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-6">
                                        {/* Current Mold Bubble */}
                                        <div className="flex items-center space-x-2">
                                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                          <span className="text-sm font-medium text-gray-700">Current Mold:</span>
                                          <span className="text-sm font-semibold text-blue-800">
                                            {selectedMoldPerLine[line.id].mold_name}
                                          </span>
                                        </div>
                                        
                                        {/* Mold Info */}
                                        <div className="flex items-center space-x-4 text-sm">
                                          <div className="flex items-center space-x-1">
                                            <span className="text-gray-600">Cycle:</span>
                                            <span className="font-medium">{selectedMoldPerLine[line.id].cycle_time}s</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <span className="text-gray-600">Std Wt:</span>
                                            <span className="font-medium">{selectedMoldPerLine[line.id].std_weight}g</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <span className="text-gray-600">Cavities:</span>
                                            <span className="font-medium">{selectedMoldPerLine[line.id].cavities}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Changeover Counter */}
                                      <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-gray-700">Changeovers:</span>
                                        <span className="text-sm font-semibold text-orange-800">
                                          {timeSlotsPerLine[line.id]?.filter(slot => slot.isChangeoverPoint).length || 0}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Weight Report Form - Shows when mold is selected */}
                                {selectedMoldPerLine[line.id] && timeSlotsPerLine[line.id] && (
                                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                                    <div className="mb-6">
                                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Weight Quality Trail - {selectedMoldPerLine[line.id].mold_name}
                                      </h3>
                                      <p className="text-sm text-blue-600 font-medium">
                                        Production Day: {new Date(selectedProductionDate).toLocaleDateString('en-GB')} (08:00) to {new Date(new Date(selectedProductionDate).getTime() + 86400000).toLocaleDateString('en-GB')} (08:00)
                                      </p>
                                    </div>

                                    {/* Time Slots Table */}
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="px-4 py-3 text-left font-semibold text-sm">TIME SLOT</th>
                                            <th className="px-4 py-3 text-left font-semibold text-sm">CYCLE TIME</th>
                                            <th className="px-4 py-3 text-left font-semibold text-sm">CAVITY WEIGHTS</th>
                                            <th className="px-4 py-3 text-left font-semibold text-sm">AVG WEIGHT</th>
                                            <th className="px-4 py-3 text-left font-semibold text-sm">NOTES</th>
                                            <th className="px-4 py-3 text-left font-semibold text-sm">STATUS</th>
                                            <th className="px-4 py-3 text-left font-semibold text-sm">ACTION</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {timeSlotsPerLine[line.id].map((slot, index) => (
                                            <React.Fragment key={slot.id}>
                                              {/* Changeover separator */}
                                              {slot.isChangeoverPoint && (
                                                <tr>
                                                  <td colSpan={7} className="bg-blue-50 border-l-4 border-blue-400 px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center space-x-3">
                                                      <Repeat className="w-5 h-5 text-blue-600" />
                                                      <div className="text-sm">
                                                        <div className="font-semibold text-blue-800 mb-1">MOLD CHANGEOVER:</div>
                                                        <div className="text-blue-700">Prev Mold: <span className="font-medium">{slot.previousMoldName}</span></div>
                                                        <div className="text-blue-700">New Mold: <span className="font-medium">{slot.moldName}</span></div>
                                                      </div>
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                              <tr className={slot.submitted ? "bg-green-50" : "hover:bg-gray-50"}>
                                                <td className={`px-4 py-3 font-medium ${slot.submitted ? 'text-green-800' : ''}`}>{slot.timeSlot}</td>
                                                <td className="px-4 py-3">
                                                  <input
                                                    type="number"
                                                    value={slot.cycleTime}
                                                    onChange={(e) => !slot.submitted && updateCycleTime(line.id, slot.id, Number(e.target.value))}
                                                    className={`w-20 px-2 py-1 border rounded text-sm text-center ${
                                                      slot.submitted 
                                                        ? 'border-green-200 bg-green-50 text-green-700 cursor-not-allowed' 
                                                        : 'border-gray-300 bg-white'
                                                    }`}
                                                    step="0.1"
                                                    disabled={slot.submitted}
                                                  />
                                                </td>
                                                <td className="px-4 py-3">
                                                  <div className="grid grid-cols-4 gap-3">
                                                    {slot.cavityWeights.map((cavity, cavityIndex) => (
                                                      <div key={cavity.cavity} className="flex items-center space-x-1">
                                                        <label className={`text-xs ${slot.submitted ? 'text-green-700' : cavity.isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                                                          {cavity.cavity}:
                                                        </label>
                                                        <input
                                                          type="number"
                                                          value={cavity.isActive ? (cavity.weight || '') : ''}
                                                          onChange={(e) => !slot.submitted && cavity.isActive && updateCavityWeight(line.id, slot.id, cavityIndex, e.target.value ? Number(e.target.value) : null)}
                                                          className={`w-16 px-2 py-1 border rounded text-sm text-center ${
                                                            slot.submitted
                                                              ? 'border-green-200 bg-green-50 text-green-700 cursor-not-allowed'
                                                              : cavity.isActive 
                                                                ? 'border-gray-300 bg-white' 
                                                                : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                          }`}
                                                          placeholder={cavity.isActive ? `${slot.moldStdWeight}g` : '-'}
                                                          step="0.1"
                                                          disabled={slot.submitted || !cavity.isActive}
                                                        />
                                                      </div>
                                                    ))}
                                                  </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                  <div className="flex items-center justify-center space-x-2">
                                                    {getWeightToleranceIcon(slot.avgWeight, slot.moldStdWeight || 0)}
                                                    <span className={`text-sm font-medium ${slot.submitted ? 'text-green-700' : ''}`}>{slot.avgWeight > 0 ? `${slot.avgWeight.toFixed(1)}g` : '-'}</span>
                                                  </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                  <input
                                                    type="text"
                                                    value={slot.notes}
                                                    onChange={(e) => !slot.submitted && updateNotes(line.id, slot.id, e.target.value)}
                                                    placeholder="Notes..."
                                                    className={`w-full px-2 py-1 border rounded text-sm ${
                                                      slot.submitted
                                                        ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                                                        : 'border-gray-300 bg-white'
                                                    }`}
                                                    disabled={slot.submitted}
                                                  />
                                                </td>
                                                <td className="px-4 py-3">
                                                  {slot.submitted ? (
                                                    <div className="flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">
                                                      <CheckCircle className="w-4 h-4" />
                                                      <span>Completed</span>
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium text-yellow-600 bg-yellow-50">
                                                      <Clock className="w-4 h-4" />
                                                      <span>Pending</span>
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="px-4 py-3">
                                                  {!slot.submitted && (
                                                    <button
                                                      onClick={() => submitSlot(line.id, slot.id)}
                                                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                                                    >
                                                      Submit
                                                    </button>
                                                  )}
                                                </td>
                                              </tr>
                                              {/* Continuing separator for midnight crossover */}
                                              {index === 5 && (
                                                <tr>
                                                  <td colSpan={7} className="bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-700">
                                                    📅 Continuing to {new Date(Date.now() + 86400000).toLocaleDateString('en-GB')} - Still Part of Production Day {new Date().toLocaleDateString('en-GB')}
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          ))}
                                        </tbody>
                                      </table>
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

export default DailyWeightReport;
