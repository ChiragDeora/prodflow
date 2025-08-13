'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock } from 'lucide-react';

import { ScheduleJob as SupabaseScheduleJob } from '../../../lib/supabase';

type ScheduleJob = SupabaseScheduleJob;
type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material';

interface ApprovalsModuleProps {
  scheduleData: ScheduleJob[];
  handleAction: (actionType: ActionType, item: any, itemType: ItemType) => Promise<void>;
}

const ApprovalsModule: React.FC<ApprovalsModuleProps> = ({ 
  scheduleData, 
  handleAction 
}) => {

  const pendingJobs = scheduleData.filter(job => job.is_done && job.approval_status === 'pending');
  const approvedJobs = scheduleData.filter(job => job.approval_status === 'approved');

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Job Approvals</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Pending Approvals ({pendingJobs.length})</h3>
          </div>
          <div className="p-6 space-y-4">
            {pendingJobs.map(job => (
              <div key={job.schedule_id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{job.machine_id} - {job.mold_id}</div>
                    <div className="text-sm text-gray-600">Date: {job.date} | {job.shift} Shift</div>
                    <div className="text-sm text-gray-600">Color: {job.color} | Expected: {job.expected_pieces} pcs</div>
                    <div className="text-xs text-gray-500 mt-1">Completed: {job.done_timestamp}</div>
                  </div>
                  <button
                    onClick={() => handleAction('approve', job, 'schedule')}
                    className="px-3 py-1 rounded text-sm transition-colors bg-green-600 text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
            {pendingJobs.length === 0 && (
              <div className="text-gray-500 text-center py-8">No pending approvals</div>
            )}
          </div>
        </div>

        {/* Recent Approvals */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Recent Approvals ({approvedJobs.length})</h3>
          </div>
          <div className="p-6 space-y-4">
            {approvedJobs.slice(0, 5).map(job => (
              <div key={job.schedule_id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="font-medium text-gray-900">{job.machine_id} - {job.mold_id}</div>
                <div className="text-sm text-gray-600">Date: {job.date} | {job.shift} Shift</div>
                <div className="text-sm text-gray-600">Approved by: {job.approved_by}</div>
                <div className="flex items-center mt-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-600">Approved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalsModule;