'use client';

import React, { useState } from 'react';
import { Machine } from '../../../lib/supabase';
import { ChevronLeft, FileText, CheckCircle, MessageSquare, Save, Clock, AlertTriangle } from 'lucide-react';

interface MachineChecklistProps {
  machine: Machine;
  frequency: string;
  onBack: () => void;
}

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  remarks?: string;
}

const MachineChecklist: React.FC<MachineChecklistProps> = ({ machine, frequency, onBack }) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    { id: '1', task: 'Check oil levels and top up if necessary', completed: false },
    { id: '2', task: 'Inspect belts for wear and tension', completed: false },
    { id: '3', task: 'Clean air filters and replace if dirty', completed: false },
    { id: '4', task: 'Verify electrical connections and wiring', completed: false },
    { id: '5', task: 'Lubricate moving parts and bearings', completed: false },
    { id: '6', task: 'Check hydraulic system pressure', completed: false },
    { id: '7', task: 'Inspect safety guards and emergency stops', completed: false },
    { id: '8', task: 'Test machine operation and calibration', completed: false },
  ]);
  
  const [remarks, setRemarks] = useState<string>('');
  const [maintenanceHistory, setMaintenanceHistory] = useState<string[]>([
    '2024-01-15: Daily maintenance completed - All items checked ✓',
    '2024-01-14: Belt tension adjusted, oil level topped up ✓',
    '2024-01-13: Air filter replaced, electrical connections verified ✓',
  ]);

  const toggleChecklistItem = (id: string) => {
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const saveRemarks = () => {
    if (remarks.trim()) {
      const timestamp = new Date().toLocaleDateString();
      setMaintenanceHistory(prev => [`${timestamp}: ${remarks}`, ...prev]);
      setRemarks('');
    }
  };

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Line View
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {frequency} Maintenance Checklist
        </h2>
        <div></div> {/* Spacer */}
      </div>

      {/* Machine Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          {machine.machine_id} - {machine.make} {machine.model}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Category:</span>
            <span className="ml-2 text-gray-600">{machine.category}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Serial No:</span>
            <span className="ml-2 text-gray-600">{machine.serial_no || 'N/A'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className="ml-2 text-gray-600">{machine.status}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Unit:</span>
            <span className="ml-2 text-gray-600">{machine.unit || 'Unit 1'}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">{completedCount}/{totalCount} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {progressPercentage === 100 ? (
            <span className="text-green-600 flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              All tasks completed!
            </span>
          ) : (
            <span className="text-orange-600 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {totalCount - completedCount} tasks remaining
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist Items */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center text-lg font-semibold text-gray-800 mb-4">
            <FileText className="w-6 h-6 mr-2 text-blue-500" />
            Checklist Items
          </div>
          <div className="space-y-3">
            {checklistItems.map((item) => (
              <div 
                key={item.id}
                className={`flex items-start p-3 rounded-lg border transition-all duration-200 ${
                  item.completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 mt-0.5 transition-all duration-200 ${
                    item.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  {item.completed && <CheckCircle className="w-4 h-4" />}
                </button>
                <span className={`text-sm ${item.completed ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                  {item.task}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Remarks & History */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center text-lg font-semibold text-gray-800 mb-4">
            <MessageSquare className="w-6 h-6 mr-2 text-purple-500" />
            Remarks & History
          </div>
          
          {/* Add New Remarks */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-none"
              rows={4}
              placeholder="Enter maintenance remarks, observations, or notes..."
            />
            <button
              onClick={saveRemarks}
              disabled={!remarks.trim()}
              className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Remarks
            </button>
          </div>

          {/* Maintenance History */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Maintenance History</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {maintenanceHistory.map((entry, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{entry}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Checklist
        </button>
      </div>
    </div>
  );
};

export default MachineChecklist;
