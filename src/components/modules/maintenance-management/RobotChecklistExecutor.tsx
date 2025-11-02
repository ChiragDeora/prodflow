'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, CheckCircle, AlertTriangle, Clock, User, Calendar,
  Save, Send, Eye, Edit, Trash2, Plus, Minus, FileText
} from 'lucide-react';
import { MaintenanceChecklist, Line, Machine } from '../../../lib/supabase';
import { maintenanceChecklistAPI } from '../../../lib/supabase';

interface RobotChecklistExecutorProps {
  checklist: MaintenanceChecklist;
  line: Line;
  machine: Machine;
  onComplete: (checklistId: string) => void;
  onSave: (checklistId: string, updatedItems: any[]) => void;
}

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  frequency: string;
  priority: string;
  category: string;
  remark?: string;
  checked_by?: string;
  checked_at?: string;
  status?: 'pending' | 'completed' | 'failed' | 'skipped';
}

const RobotChecklistExecutor: React.FC<RobotChecklistExecutorProps> = ({
  checklist,
  line,
  machine,
  onComplete,
  onSave
}) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('Maintenance Engineer');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [overallRemarks, setOverallRemarks] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (checklist.items && Array.isArray(checklist.items)) {
      setItems(checklist.items.map((item: any) => ({
        id: item.id || `item_${Math.random()}`,
        task: item.task || '',
        completed: item.completed || false,
        frequency: item.frequency || 'monthly',
        priority: item.priority || 'medium',
        category: item.category || 'general',
        remark: item.remark || '',
        checked_by: item.checked_by || '',
        checked_at: item.checked_at || '',
        status: item.status || 'pending'
      })));
    }
  }, [checklist]);

  const handleItemToggle = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            completed: !item.completed,
            status: !item.completed ? 'completed' : 'pending',
            checked_by: !item.completed ? currentUser : '',
            checked_at: !item.completed ? new Date().toISOString() : ''
          }
        : item
    ));
  };

  const handleItemRemark = (itemId: string, remark: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, remark } : item
    ));
  };

  const handleItemStatus = (itemId: string, status: 'pending' | 'completed' | 'failed' | 'skipped') => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            status,
            completed: status === 'completed',
            checked_by: status !== 'pending' ? currentUser : '',
            checked_at: status !== 'pending' ? new Date().toISOString() : ''
          }
        : item
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedChecklist = {
        ...checklist,
        items: items
      };
      
      await maintenanceChecklistAPI.update(checklist.id, updatedChecklist);
      onSave(checklist.id, items);
      
      // Show success message
      alert('Checklist saved successfully!');
    } catch (error) {
      console.error('Failed to save checklist:', error);
      alert('Failed to save checklist. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    setIsExecuting(true);
    try {
      const completedItems = items.filter(item => item.completed);
      const totalItems = items.length;
      const completionRate = (completedItems.length / totalItems) * 100;

      if (completionRate < 80) {
        const confirm = window.confirm(
          `Only ${completionRate.toFixed(1)}% of items are completed. Are you sure you want to mark this checklist as complete?`
        );
        if (!confirm) {
          setIsExecuting(false);
          return;
        }
      }

      const updatedChecklist = {
        ...checklist,
        items: items,
        completed_at: new Date().toISOString(),
        completed_by: currentUser,
        overall_remarks: overallRemarks
      };
      
      await maintenanceChecklistAPI.update(checklist.id, updatedChecklist);
      onComplete(checklist.id);
      
      alert('Checklist completed successfully!');
    } catch (error) {
      console.error('Failed to complete checklist:', error);
      alert('Failed to complete checklist. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'skipped': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'electrical': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'mechanical': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'safety': return 'text-red-600 bg-red-50 border-red-200';
      case 'operational': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{checklist.name}</h2>
            <p className="text-sm text-gray-600">
              {line.line_id} - {machine.machine_id} ({machine.make} {machine.model})
            </p>
            <p className="text-sm text-gray-500">{checklist.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              <div className="flex items-center mb-1">
                <Calendar className="w-4 h-4 mr-1" />
                {currentDate}
              </div>
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {currentUser}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">{completedCount} / {totalCount} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {completionPercentage.toFixed(1)}% Complete
        </div>
      </div>

      {/* Checklist Items */}
      <div className="p-6">
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-4">
                {/* Checkbox */}
                <div className="flex-shrink-0 pt-1">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleItemToggle(item.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                {/* Item Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {index + 1}. {item.task}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={item.status}
                        onChange={(e) => handleItemStatus(item.id, e.target.value as any)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="skipped">Skipped</option>
                      </select>
                    </div>
                  </div>

                  {/* Remark Field */}
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Remarks:
                    </label>
                    <textarea
                      value={item.remark}
                      onChange={(e) => handleItemRemark(item.id, e.target.value)}
                      placeholder="Add remarks or observations..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </div>

                  {/* Status Info */}
                  {item.checked_by && (
                    <div className="mt-2 text-xs text-gray-500">
                      Checked by: {item.checked_by} on {new Date(item.checked_at || '').toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Remarks */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Overall Remarks:
        </label>
        <textarea
          value={overallRemarks}
          onChange={(e) => setOverallRemarks(e.target.value)}
          placeholder="Add overall remarks about the maintenance checklist..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleComplete}
            disabled={isExecuting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isExecuting ? 'Completing...' : 'Complete Checklist'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RobotChecklistExecutor;
