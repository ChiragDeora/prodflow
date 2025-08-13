import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Save, Download, Calendar, User } from 'lucide-react';
import { machineAPI, Machine } from '../../../../lib/supabase';

interface ChecklistFormItem {
  id: string;
  checkPoint: string;
  status: 'pending' | 'completed' | 'failed' | null;
  remarks: string;
}

interface ChecklistFormProps {
  checklistType: string;
  checklistData?: any;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

const ChecklistForm: React.FC<ChecklistFormProps> = ({ 
  checklistType, 
  checklistData, 
  onSave, 
  onClose 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkedBy, setCheckedBy] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [items, setItems] = useState<ChecklistFormItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);

  // Fetch machines and generate checklist items based on type
  useEffect(() => {
    console.log('ChecklistForm - checklistType:', checklistType);
    console.log('ChecklistForm - checklistData:', checklistData);
    
    const fetchMachines = async () => {
      try {
        const machinesData = await machineAPI.getAll();
        setMachines(machinesData);
      } catch (error) {
        console.error('Error fetching machines:', error);
      }
    };

    // Fetch machines first
    fetchMachines();
    
    const generateItems = () => {
      const baseItems: ChecklistFormItem[] = [];
      
      switch (checklistType) {
        case 'daily-machine':
          // Machine Check Point - fetch IM category machines
          const imMachines = machines.filter(m => m.category === 'IM');
          baseItems.push(
            { id: 'machine_1', checkPoint: 'Machine and surrounding area clean', status: null, remarks: '' },
            { id: 'machine_2', checkPoint: 'Electricals Power Checking', status: null, remarks: '' },
            { id: 'machine_3', checkPoint: 'Any Air leakage in machine', status: null, remarks: '' },
            { id: 'machine_4', checkPoint: 'Any water leakage in machine Area', status: null, remarks: '' },
            { id: 'machine_5', checkPoint: 'Any abnormal sound', status: null, remarks: '' },
            { id: 'machine_6', checkPoint: 'All tools kept in the tool box', status: null, remarks: '' }
          );
          break;
        case 'daily-robot':
          // Robot Check Point - fetch Robot category machines
          const robotMachines = machines.filter(m => m.category === 'Robot');
          baseItems.push(
            { id: 'robot_1', checkPoint: 'Check Any Air leakage in furl', status: null, remarks: '' },
            { id: 'robot_2', checkPoint: 'Check Any Air leakage in Eoat', status: null, remarks: '' },
            { id: 'robot_3', checkPoint: 'Check Any abnormal sound', status: null, remarks: '' },
            { id: 'robot_4', checkPoint: 'Check Any water in Furl', status: null, remarks: '' }
          );
          break;
        case 'daily-chiller':
          // Chiller Check Point - fetch Chiller category machines
          const chillerMachines = machines.filter(m => m.category === 'Chiller');
          baseItems.push(
            { id: 'chiller_1', checkPoint: 'Check water level', status: null, remarks: '' },
            { id: 'chiller_2', checkPoint: 'Check Any water leakage in tank', status: null, remarks: '' },
            { id: 'chiller_3', checkPoint: 'Check Set & Act Temp', status: null, remarks: '' },
            { id: 'chiller_4', checkPoint: 'Check Any abnormal sound', status: null, remarks: '' }
          );
          break;
        case 'daily-compressor':
          // Compressor Check Point - fetch Compressor category machines
          const compressorMachines = machines.filter(m => m.category === 'Compressor');
          baseItems.push(
            { id: 'compressor_1', checkPoint: 'Check Any Air leakage', status: null, remarks: '' },
            { id: 'compressor_2', checkPoint: 'Check Any abnormal sound', status: null, remarks: '' },
            { id: 'compressor_3', checkPoint: 'check oil leave', status: null, remarks: '' },
            { id: 'compressor_4', checkPoint: 'Check dryer', status: null, remarks: '' },
            { id: 'compressor_5', checkPoint: 'Temperature', status: null, remarks: '' }
          );
          break;
        case 'daily-blower':
          // Blower - fetch Blower category machines
          const blowerMachines = machines.filter(m => m.category === 'Blower');
          baseItems.push(
            { id: 'blower_1', checkPoint: 'Filter Clean', status: null, remarks: '' }
          );
          break;
        case 'daily-electrical':
          // Electrical Panel - fetch Electrical category machines
          const electricalMachines = machines.filter(m => m.category === 'Electrical');
          baseItems.push(
            { id: 'electrical_1', checkPoint: 'Check all electrical connections', status: null, remarks: '' },
            { id: 'electrical_2', checkPoint: 'Check circuit breakers', status: null, remarks: '' },
            { id: 'electrical_3', checkPoint: 'Check voltage readings', status: null, remarks: '' }
          );
          break;
        case 'daily-granulator':
          // Granulator - fetch Granulator category machines
          const granulatorMachines = machines.filter(m => m.category === 'Granulator');
          baseItems.push(
            { id: 'granulator_1', checkPoint: 'Check Any abnormal sound', status: null, remarks: '' },
            { id: 'granulator_2', checkPoint: 'Check All Safety function are working', status: null, remarks: '' }
          );
          break;
        case 'daily':
          // Machine Check Point
          baseItems.push(
            { id: 'machine_1', checkPoint: 'Machine Check Point - Machine and surrounding area clean', status: null, remarks: '' },
            { id: 'machine_2', checkPoint: 'Machine Check Point - Electricals Power Checking', status: null, remarks: '' },
            { id: 'machine_3', checkPoint: 'Machine Check Point - Any Air leakage in machine', status: null, remarks: '' },
            { id: 'machine_4', checkPoint: 'Machine Check Point - Any water leakage in machine Area', status: null, remarks: '' },
            { id: 'machine_5', checkPoint: 'Machine Check Point - Any abnormal sound', status: null, remarks: '' },
            { id: 'machine_6', checkPoint: 'Machine Check Point - All tools kept in the tool box', status: null, remarks: '' }
          );
          
          // Robot Check Point
          baseItems.push(
            { id: 'robot_1', checkPoint: 'Robot Check Point - Check Any Air leakage in furl', status: null, remarks: '' },
            { id: 'robot_2', checkPoint: 'Robot Check Point - Check Any Air leakage in Eoat', status: null, remarks: '' },
            { id: 'robot_3', checkPoint: 'Robot Check Point - Check Any abnormal sound', status: null, remarks: '' },
            { id: 'robot_4', checkPoint: 'Robot Check Point - Check Any water in Furl', status: null, remarks: '' }
          );
          
          // Chiller Check Point
          baseItems.push(
            { id: 'chiller_1', checkPoint: 'Chiller Check Point - Check water level', status: null, remarks: '' },
            { id: 'chiller_2', checkPoint: 'Chiller Check Point - Check Any water leakage in tank', status: null, remarks: '' },
            { id: 'chiller_3', checkPoint: 'Chiller Check Point - Check Set & Act Temp', status: null, remarks: '' },
            { id: 'chiller_4', checkPoint: 'Chiller Check Point - Check Any abnormal sound', status: null, remarks: '' }
          );
          
          // Compressor Check Point
          baseItems.push(
            { id: 'compressor_1', checkPoint: 'Compressor Check Point - Check Any Air leakage', status: null, remarks: '' },
            { id: 'compressor_2', checkPoint: 'Compressor Check Point - Check Any abnormal sound', status: null, remarks: '' },
            { id: 'compressor_3', checkPoint: 'Compressor Check Point - check oil leave', status: null, remarks: '' },
            { id: 'compressor_4', checkPoint: 'Compressor Check Point - Check dryer', status: null, remarks: '' },
            { id: 'compressor_5', checkPoint: 'Compressor Check Point - Temperature', status: null, remarks: '' }
          );
          
          // Blower
          baseItems.push(
            { id: 'blower_1', checkPoint: 'Blower - Filter Clean', status: null, remarks: '' }
          );
          
          // Electrical Panel
          baseItems.push(
            { id: 'electrical_1', checkPoint: 'Electrical Panel - Check all electrical connections', status: null, remarks: '' },
            { id: 'electrical_2', checkPoint: 'Electrical Panel - Check circuit breakers', status: null, remarks: '' },
            { id: 'electrical_3', checkPoint: 'Electrical Panel - Check voltage readings', status: null, remarks: '' }
          );
          
          // Granulator
          baseItems.push(
            { id: 'granulator_1', checkPoint: 'Granulator - Check Any abnormal sound', status: null, remarks: '' },
            { id: 'granulator_2', checkPoint: 'Granulator - Check All Safety function are working', status: null, remarks: '' }
          );
          break;
        case 'weekly-compressor':
          baseItems.push(
            { id: '1', checkPoint: 'Air Pressure Check', status: null, remarks: '' },
            { id: '2', checkPoint: 'Oil Level Inspection', status: null, remarks: '' },
            { id: '3', checkPoint: 'Temperature Monitoring', status: null, remarks: '' },
            { id: '4', checkPoint: 'Leak Detection', status: null, remarks: '' },
            { id: '5', checkPoint: 'Filter Status', status: null, remarks: '' },
            { id: '6', checkPoint: 'Safety Systems', status: null, remarks: '' }
          );
          break;
        case 'weekly-magnate':
          baseItems.push(
            { id: '1', checkPoint: 'Magnetic Field Check', status: null, remarks: '' },
            { id: '2', checkPoint: 'Power Supply Verification', status: null, remarks: '' },
            { id: '3', checkPoint: 'Temperature Monitoring', status: null, remarks: '' },
            { id: '4', checkPoint: 'Safety Interlocks', status: null, remarks: '' },
            { id: '5', checkPoint: 'Performance Testing', status: null, remarks: '' }
          );
          break;
        case 'monthly-robot':
          baseItems.push(
            { id: '1', checkPoint: 'Robot Movement Check', status: null, remarks: '' },
            { id: '2', checkPoint: 'Gripper Function Test', status: null, remarks: '' },
            { id: '3', checkPoint: 'Safety Systems', status: null, remarks: '' },
            { id: '4', checkPoint: 'Programming Verification', status: null, remarks: '' },
            { id: '5', checkPoint: 'Mechanical Inspection', status: null, remarks: '' },
            { id: '6', checkPoint: 'Performance Analysis', status: null, remarks: '' }
          );
          break;
        case 'monthly-machine':
          baseItems.push(
            { id: '1', checkPoint: 'Mechanical Components', status: null, remarks: '' },
            { id: '2', checkPoint: 'Electrical Systems', status: null, remarks: '' },
            { id: '3', checkPoint: 'Hydraulic Systems', status: null, remarks: '' },
            { id: '4', checkPoint: 'Safety Devices', status: null, remarks: '' },
            { id: '5', checkPoint: 'Performance Metrics', status: null, remarks: '' },
            { id: '6', checkPoint: 'Documentation Review', status: null, remarks: '' }
          );
          break;
        case 'quarterly-machine':
          baseItems.push(
            { id: '1', checkPoint: 'Major Component Inspection', status: null, remarks: '' },
            { id: '2', checkPoint: 'Efficiency Analysis', status: null, remarks: '' },
            { id: '3', checkPoint: 'Upgrade Assessment', status: null, remarks: '' },
            { id: '4', checkPoint: 'Safety Audit', status: null, remarks: '' },
            { id: '5', checkPoint: 'Compliance Review', status: null, remarks: '' },
            { id: '6', checkPoint: 'Performance Optimization', status: null, remarks: '' }
          );
          break;
        case 'semi-annual-machine':
          baseItems.push(
            { id: '1', checkPoint: 'Comprehensive Inspection', status: null, remarks: '' },
            { id: '2', checkPoint: 'Preventive Maintenance', status: null, remarks: '' },
            { id: '3', checkPoint: 'Performance Analysis', status: null, remarks: '' },
            { id: '4', checkPoint: 'Safety Systems', status: null, remarks: '' },
            { id: '5', checkPoint: 'Documentation Audit', status: null, remarks: '' },
            { id: '6', checkPoint: 'Training Verification', status: null, remarks: '' }
          );
          break;
        case 'annual-machine':
          baseItems.push(
            { id: '1', checkPoint: 'Complete System Inspection', status: null, remarks: '' },
            { id: '2', checkPoint: 'Major Overhaul Assessment', status: null, remarks: '' },
            { id: '3', checkPoint: 'Performance Analysis', status: null, remarks: '' },
            { id: '4', checkPoint: 'Safety Compliance', status: null, remarks: '' },
            { id: '5', checkPoint: 'Documentation Review', status: null, remarks: '' },
            { id: '6', checkPoint: 'Future Planning', status: null, remarks: '' }
          );
          break;
        default:
          baseItems.push(
            { id: '1', checkPoint: 'General Inspection', status: null, remarks: '' },
            { id: '2', checkPoint: 'Safety Check', status: null, remarks: '' },
            { id: '3', checkPoint: 'Performance Review', status: null, remarks: '' }
          );
      }
      
      setItems(baseItems);
    };

    generateItems();
  }, [checklistType]);

  const handleStatusChange = (itemId: string, status: 'pending' | 'completed' | 'failed' | null) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status } : item
    ));
  };

  const handleRemarksChange = (itemId: string, remarks: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, remarks } : item
    ));
  };

  const getStatusIcon = (status: 'pending' | 'completed' | 'failed' | null) => {
    if (status === null) return <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>;
    return status === 'completed' ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getCompletionStatus = () => {
    const totalItems = items.length;
    const completedItems = items.filter(item => item.status === 'completed').length;
    const percentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    
    if (percentage === 0) return { text: 'Not Started', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (percentage < 50) return { text: 'In Progress', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (percentage < 100) return { text: 'Almost Complete', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { text: 'Complete', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const handleSave = () => {
    setLoading(true);
    const formData = {
      type: checklistType,
      date: currentDate,
      checkedBy,
      verifiedBy,
      items,
      completionStatus: getCompletionStatus()
    };
    
    console.log('Saving checklist:', formData);
    
    // Simulate save delay
    setTimeout(() => {
      setLoading(false);
      onSave?.(formData);
    }, 1000);
  };

  const status = getCompletionStatus();

  return (
    <div className="h-full flex flex-col">
      {/* Form Header */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Checked By</label>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter name"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verified By</label>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter name"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>
          <div className="flex items-end">
            <span className={`px-3 py-2 rounded-full text-sm font-medium ${status.color} ${status.bg}`}>
              {status.text}
            </span>
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {checklistType.startsWith('daily-') ? (
            // Table format for specific daily sections
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                 <h3 className="text-lg font-semibold text-gray-900">
                   {checklistType === 'daily-machine' && 'IM Check List'}
                   {checklistType === 'daily-robot' && 'Robot Check Point'}
                   {checklistType === 'daily-chiller' && 'Chiller Check Point'}
                   {checklistType === 'daily-compressor' && 'Compressor Check Point'}
                   {checklistType === 'daily-blower' && 'Blower'}
                   {checklistType === 'daily-electrical' && 'Electrical Panel'}
                   {checklistType === 'daily-granulator' && 'Granulator'}
                 </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check Point
                      </th>
                      {machines
                        .filter(m => {
                          if (checklistType === 'daily-machine') return m.category === 'IM';
                          if (checklistType === 'daily-robot') return m.category === 'Robot';
                          if (checklistType === 'daily-chiller') return m.category === 'Chiller';
                          if (checklistType === 'daily-compressor') return m.category === 'Compressor';
                          if (checklistType === 'daily-blower') return m.category === 'Blower';
                          if (checklistType === 'daily-electrical') return m.category === 'Electrical';
                          if (checklistType === 'daily-granulator') return m.category === 'Granulator';
                          return false;
                        })
                        .map(machine => (
                          <th key={machine.machine_id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {machine.machine_id}
                          </th>
                        ))}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.checkPoint}
                        </td>
                        {machines
                          .filter(m => {
                            if (checklistType === 'daily-machine') return m.category === 'IM';
                            if (checklistType === 'daily-robot') return m.category === 'Robot';
                            if (checklistType === 'daily-chiller') return m.category === 'Chiller';
                            if (checklistType === 'daily-compressor') return m.category === 'Compressor';
                            if (checklistType === 'daily-blower') return m.category === 'Blower';
                            if (checklistType === 'daily-electrical') return m.category === 'Electrical';
                            if (checklistType === 'daily-granulator') return m.category === 'Granulator';
                            return false;
                          })
                          .map(machine => (
                            <td key={machine.machine_id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleStatusChange(item.id, 'completed')}
                                  className={`p-1 rounded ${item.status === 'completed' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(item.id, 'failed')}
                                  className={`p-1 rounded ${item.status === 'failed' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(item.id, null)}
                                  className={`p-1 rounded ${item.status === null ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                                >
                                  <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                                </button>
                              </div>
                            </td>
                          ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <textarea
                            placeholder="Add remarks..."
                            value={item.remarks}
                            onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none"
                            rows={2}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : checklistType === 'daily' ? (
            // Grouped layout for daily checklist
            <>
              {/* Robot Check Point Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Robot Check Point</h3>
                <div className="space-y-3">
                  {items.filter(item => item.id.startsWith('robot_')).map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusChange(item.id, 'completed')}
                              className={`p-1 rounded ${item.status === 'completed' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                            >
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'failed')}
                              className={`p-1 rounded ${item.status === 'failed' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                            >
                              <XCircle className="w-5 h-5 text-red-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, null)}
                              className={`p-1 rounded ${item.status === null ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                            >
                              <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                            </button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">{item.checkPoint.replace('Robot Check Point - ', '')}</h3>
                          <textarea
                            placeholder="Add remarks..."
                            value={item.remarks}
                            onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chiller Check Point Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chiller Check Point</h3>
                <div className="space-y-3">
                  {items.filter(item => item.id.startsWith('chiller_')).map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusChange(item.id, 'completed')}
                              className={`p-1 rounded ${item.status === 'completed' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                            >
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'failed')}
                              className={`p-1 rounded ${item.status === 'failed' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                            >
                              <XCircle className="w-5 h-5 text-red-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, null)}
                              className={`p-1 rounded ${item.status === null ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                            >
                              <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                            </button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">{item.checkPoint.replace('Chiller Check Point - ', '')}</h3>
                          <textarea
                            placeholder="Add remarks..."
                            value={item.remarks}
                            onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compressor Check Point Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Compressor Check Point</h3>
                <div className="space-y-3">
                  {items.filter(item => item.id.startsWith('compressor_')).map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusChange(item.id, 'completed')}
                              className={`p-1 rounded ${item.status === 'completed' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                            >
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'failed')}
                              className={`p-1 rounded ${item.status === 'failed' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                            >
                              <XCircle className="w-5 h-5 text-red-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, null)}
                              className={`p-1 rounded ${item.status === null ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                            >
                              <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                            </button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">{item.checkPoint.replace('Compressor Check Point - ', '')}</h3>
                          <textarea
                            placeholder="Add remarks..."
                            value={item.remarks}
                            onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blower Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Blower</h3>
                <div className="space-y-3">
                  {items.filter(item => item.id.startsWith('blower_')).map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusChange(item.id, 'completed')}
                              className={`p-1 rounded ${item.status === 'completed' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                            >
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'failed')}
                              className={`p-1 rounded ${item.status === 'failed' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                            >
                              <XCircle className="w-5 h-5 text-red-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, null)}
                              className={`p-1 rounded ${item.status === null ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                            >
                              <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                            </button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">{item.checkPoint.replace('Blower - ', '')}</h3>
                          <textarea
                            placeholder="Add remarks..."
                            value={item.remarks}
                            onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Electrical Panel Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Electrical Panel</h3>
                <div className="space-y-3">
                  {items.filter(item => item.id.startsWith('electrical_')).map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusChange(item.id, 'completed')}
                              className={`p-1 rounded ${item.status === 'completed' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                            >
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'failed')}
                              className={`p-1 rounded ${item.status === 'failed' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                            >
                              <XCircle className="w-5 h-5 text-red-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, null)}
                              className={`p-1 rounded ${item.status === null ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                            >
                              <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                            </button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">{item.checkPoint.replace('Electrical Panel - ', '')}</h3>
                          <textarea
                            placeholder="Add remarks..."
                            value={item.remarks}
                            onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Granulator Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Granulator</h3>
                <div className="space-y-3">
                  {items.filter(item => item.id.startsWith('granulator_')).map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusChange(item.id, 'completed')}
                              className={`p-1 rounded ${item.status === 'completed' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                            >
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'failed')}
                              className={`p-1 rounded ${item.status === 'failed' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                            >
                              <XCircle className="w-5 h-5 text-red-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, null)}
                              className={`p-1 rounded ${item.status === null ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                            >
                              <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                            </button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">{item.checkPoint.replace('Granulator - ', '')}</h3>
                          <textarea
                            placeholder="Add remarks..."
                            value={item.remarks}
                            onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            // Regular layout for other checklist types
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusChange(item.id, 'completed')}
                          className={`p-1 rounded ${item.status === 'completed' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                        >
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(item.id, 'failed')}
                          className={`p-1 rounded ${item.status === 'failed' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                        >
                          <XCircle className="w-5 h-5 text-red-600" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(item.id, null)}
                          className={`p-1 rounded ${item.status === null ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        >
                          <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">{item.checkPoint}</h3>
                      <textarea
                        placeholder="Add remarks..."
                        value={item.remarks}
                        onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {items.filter(item => item.status === 'completed').length} of {items.length} items completed
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Checklist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistForm;
