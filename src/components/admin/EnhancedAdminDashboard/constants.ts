import type { DprViewFieldDef } from './types';

// DPR View Fields configuration
export const DPR_VIEW_FIELDS: DprViewFieldDef[] = [
  // SHIFT TOTAL
  { key: 'summary.shiftTotal.targetQty',     header: 'SHIFT TOTAL',              label: 'Target Qty (Nos)' },
  { key: 'summary.shiftTotal.actualQty',     header: 'SHIFT TOTAL',              label: 'Actual Qty (Nos)' },
  { key: 'summary.shiftTotal.okProdQty',     header: 'SHIFT TOTAL',              label: 'Ok Prod Qty (Nos)' },
  { key: 'summary.shiftTotal.okProdKgs',     header: 'SHIFT TOTAL',              label: 'Ok Prod (Kgs)' },
  { key: 'summary.shiftTotal.okProdPercent', header: 'SHIFT TOTAL',              label: 'Ok Prod (%)' },
  { key: 'summary.shiftTotal.rejKgs',        header: 'SHIFT TOTAL',              label: 'Rej (Kgs)' },
  { key: 'summary.shiftTotal.lumps',         header: 'SHIFT TOTAL',              label: 'Lumps (Kgs)' },
  { key: 'summary.shiftTotal.runTime',       header: 'SHIFT TOTAL',              label: 'Run Time (mins)' },
  { key: 'summary.shiftTotal.downTime',      header: 'SHIFT TOTAL',              label: 'Down Time (min)' },
  { key: 'summary.shiftTotal.totalTime',     header: 'SHIFT TOTAL',              label: 'Total Time (min)' },

  // ACHIEVEMENT METRICS
  { key: 'summary.achievement.actualVsTarget',  header: 'ACHIEVEMENT METRICS',   label: 'Actual vs Target' },
  { key: 'summary.achievement.rejVsOkProd',     header: 'ACHIEVEMENT METRICS',   label: 'Rej vs Ok Prod' },
  { key: 'summary.achievement.runTimeVsTotal',  header: 'ACHIEVEMENT METRICS',   label: 'Run Time vs Total' },
  { key: 'summary.achievement.downTimeVsTotal', header: 'ACHIEVEMENT METRICS',   label: 'Down Time vs Total' },

  // Basic Info
  { key: 'table.basic.machineNo',    header: 'Basic Info',                      label: 'M/c No.' },
  { key: 'table.basic.operatorName', header: 'Basic Info',                      label: 'Opt Name' },
  { key: 'table.basic.product',      header: 'Basic Info',                      label: 'Product' },
  { key: 'table.basic.cavity',       header: 'Basic Info',                      label: 'Cavity' },

  // Process Parameters
  { key: 'table.process.targetCycle',      header: 'Process Parameters',         label: 'Trg Cycle (sec)' },
  { key: 'table.process.targetRunTime',    header: 'Process Parameters',         label: 'Trg Run Time (min)' },
  { key: 'table.process.partWeight',       header: 'Process Parameters',         label: 'Part Wt (gm)' },
  { key: 'table.process.actualPartWeight', header: 'Process Parameters',         label: 'Act part wt (gm)' },
  { key: 'table.process.actualCycle',      header: 'Process Parameters',         label: 'Act Cycle (sec)' },
  { key: 'table.process.partWeightCheck',  header: 'Process Parameters',         label: 'Part Wt Check' },
  { key: 'table.process.cycleTimeCheck',   header: 'Process Parameters',         label: 'Cycle Time Check' },

  // No of Shots
  { key: 'table.shots.start', header: 'No of Shots',                            label: 'No of Shots (Start)' },
  { key: 'table.shots.end',   header: 'No of Shots',                            label: 'No of Shots (End)' },

  // Production Data
  { key: 'table.production.targetQty',     header: 'Production Data',            label: 'Target Qty (Nos)' },
  { key: 'table.production.actualQty',     header: 'Production Data',            label: 'Actual Qty (Nos)' },
  { key: 'table.production.okProdQty',     header: 'Production Data',            label: 'Ok Prod Qty (Nos)' },
  { key: 'table.production.okProdKgs',     header: 'Production Data',            label: 'Ok Prod (Kgs)' },
  { key: 'table.production.okProdPercent', header: 'Production Data',            label: 'Ok Prod (%)' },
  { key: 'table.production.rejKgs',        header: 'Production Data',            label: 'Rej (Kgs)' },

  // Runtime
  { key: 'table.runtime.runTime',          header: 'Run Time',                   label: 'Run Time (mins)' },
  { key: 'table.runtime.downTime',         header: 'Run Time',                   label: 'Down time (min)' },

  // Stoppage
  { key: 'table.stoppage.reason',      header: 'Stoppage Time & Remarks',       label: 'Reason' },
  { key: 'table.stoppage.startTime',   header: 'Stoppage Time & Remarks',       label: 'Start Time' },
  { key: 'table.stoppage.endTime',     header: 'Stoppage Time & Remarks',       label: 'End Time' },
  { key: 'table.stoppage.totalTime',   header: 'Stoppage Time & Remarks',       label: 'Total Time (min)' },
  { key: 'table.stoppage.mouldChange', header: 'Stoppage Time & Remarks',       label: 'Mould change' },
  { key: 'table.stoppage.remark',      header: 'Stoppage Time & Remarks',       label: 'REMARK' },
];

// Action display names
export const ACTION_LABELS: Record<string, string> = {
  read: 'View',
  create: 'Create',
  update: 'Edit',
  delete: 'Delete',
  export: 'Export',
  approve: 'Approve',
  managePermissions: 'Manage Permissions'
};

// Status badges
export const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' }
};

// Default departments
export const DEPARTMENTS = [
  'Production',
  'Quality',
  'Maintenance',
  'Administration',
  'Finance',
  'IT',
  'HR',
  'Sales'
];

