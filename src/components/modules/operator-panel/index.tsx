'use client';

import React, { useState, useEffect } from 'react';
import { User, CheckCircle, Clock, AlertCircle, Play, Pause } from 'lucide-react';

import { 
  Machine as SupabaseMachine, 
  Mold as SupabaseMold, 
  ScheduleJob as SupabaseScheduleJob 
} from '../../../lib/supabase';

type Machine = SupabaseMachine;
type Mold = SupabaseMold;
type ScheduleJob = SupabaseScheduleJob;
type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material';

interface OperatorPanelProps {
  scheduleData: ScheduleJob[];
  selectedDate: string;
  handleAction: (actionType: ActionType, item: any, itemType: ItemType) => Promise<void>;
  machinesMaster: Machine[];
  moldsMaster: Mold[];
}

const OperatorPanel: React.FC<OperatorPanelProps> = ({ 
  scheduleData, 
  selectedDate, 
  handleAction, 
  machinesMaster, 
  moldsMaster 
}) => {

  const todayJobs = scheduleData.filter(job => job.date === selectedDate && !job.is_done);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Operator Panel - Today&apos;s Jobs</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {todayJobs.map(job => {
          const machine = machinesMaster.find(m => m.machine_id === job.machine_id);
          const mold = moldsMaster.find(m => m.mold_id === job.mold_id);
          
          return (
            <div key={job.schedule_id} className="bg-white rounded-lg shadow border-l-4 border-blue-500 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{job.machine_id}</h3>
                  <p className="text-sm text-gray-600">{machine?.make} {machine?.model}</p>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {job.shift}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mold:</span>
                  <span className="text-sm font-medium">{job.mold_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Color:</span>
                  <span className="text-sm font-medium">{job.color}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Time:</span>
                  <span className="text-sm font-medium">{job.start_time} - {job.end_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Target:</span>
                  <span className="text-sm font-medium">{job.expected_pieces} pieces</span>
                </div>
              </div>
              
              <button
                onClick={() => handleAction('mark_done', job, 'schedule')}
                className="w-full flex items-center justify-center px-4 py-2 rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Done
              </button>
            </div>
          );
        })}
      </div>
      
      {todayJobs.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All jobs completed!</h3>
          <p className="text-gray-600">No pending jobs for today.</p>
        </div>
      )}
    </div>
  );
};

export default OperatorPanel;