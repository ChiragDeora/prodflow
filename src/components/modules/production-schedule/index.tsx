'use client';

import React from 'react';
import { Play, Pause, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  Machine as SupabaseMachine, 
  ScheduleJob as SupabaseScheduleJob 
} from '../../../lib/supabase';

type Machine = SupabaseMachine;
type ScheduleJob = SupabaseScheduleJob;
type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';
type ItemType = 'machine' | 'mold' | 'schedule' | 'material' | 'product' | 'raw_material';

interface ProductionSchedulerProps {
  scheduleData: ScheduleJob[];
  selectedDate: string;
  machinesMaster: Machine[];
  handleAction: (actionType: ActionType, item: any, itemType: ItemType) => Promise<void>;
}

const ProductionScheduler: React.FC<ProductionSchedulerProps> = ({ 
  scheduleData, 
  selectedDate, 
  machinesMaster, 
  handleAction 
}) => {
  const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const getJobsByMachine = (machineId: string): ScheduleJob[] => 
    scheduleData.filter(job => job.machine_id === machineId && job.date === selectedDate);

  const getJobPosition = (startTime: string, endTime: string): { left: string; width: string } => {
    const start = parseInt(startTime.split(':')[0]) + (parseInt(startTime.split(':')[1]) / 60);
    const end = parseInt(endTime.split(':')[0]) + (parseInt(endTime.split(':')[1]) / 60);
    return {
      left: `${(start / 24) * 100}%`,
      width: `${((end - start) / 24) * 100}%`
    };
  };

  const getStatusColor = (job: ScheduleJob): string => {
    if (job.is_done) return 'bg-green-500';
    if (job.approval_status === 'approved') return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getMachineStatusColor = (status: Machine['status']): string => {
    switch (status) {
      case 'Active': return 'bg-green-50 border-green-200';
      case 'Maintenance': return 'bg-red-50 border-red-200';
      case 'Idle': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="flex h-full">
      {/* Machine List */}
      <div className="w-48 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Machines</h3>
        </div>
        {machinesMaster.map(machine => (
          <div 
            key={machine.machine_id} 
            className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-100 ${getMachineStatusColor(machine.status)}`}
            onClick={() => handleAction('view', machine, 'machine')}
          >
            <div className="font-medium text-sm">{machine.machine_id}</div>
            <div className="text-xs text-gray-600">{machine.make} {machine.model}</div>
            <div className="flex items-center mt-1">
              {machine.status === 'Active' && <Play className="w-3 h-3 text-green-600 mr-1" />}
              {machine.status === 'Maintenance' && <AlertCircle className="w-3 h-3 text-red-600 mr-1" />}
              {machine.status === 'Idle' && <Pause className="w-3 h-3 text-yellow-600 mr-1" />}
              <span className="text-xs capitalize">{machine.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-auto">
        {/* Time Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="flex">
            {timeSlots.map(time => (
              <div key={time} className="flex-1 p-2 text-center text-xs font-medium border-r border-gray-100">
                {time}
              </div>
            ))}
          </div>
        </div>

        {/* Machine Rows */}
        <div className="relative">
          {machinesMaster.map(machine => (
            <div key={machine.machine_id} className="relative h-16 border-b border-gray-100">
              {/* Time Grid */}
              <div className="absolute inset-0 flex">
                {timeSlots.map(time => (
                  <div key={time} className="flex-1 border-r border-gray-50 hover:bg-blue-50" />
                ))}
              </div>

              {/* Job Cards */}
              {getJobsByMachine(machine.machine_id).map(job => {
                const position = getJobPosition(job.start_time, job.end_time);
                return (
                  <div
                    key={job.schedule_id}
                    className={`absolute top-1 bottom-1 ${getStatusColor(job)} rounded px-2 py-1 text-white text-xs cursor-pointer hover:shadow-lg transition-shadow z-20`}
                    style={position}
                    onClick={() => handleAction('view', job, 'schedule')}
                  >
                    <div className="font-medium">{job.mold_id}</div>
                    <div className="truncate">{job.color}</div>
                    <div>{job.expected_pieces} pcs</div>
                    {job.is_done && <CheckCircle className="w-3 h-3 inline ml-1" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductionScheduler;