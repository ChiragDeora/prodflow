// Constants extracted from production/index.tsx

import type { 
  ColumnDefinition, 
  SectionVisibility, 
  ShiftTotalMetrics, 
  AchievementMetrics 
} from './types';

// DPR Column definitions
export const DPR_COLUMNS: ColumnDefinition[] = [
  // Basic Info
  { id: 'machineNo', label: 'M/c No.', category: 'basic', defaultVisible: true },
  { id: 'operatorName', label: 'Opt Name', category: 'basic', defaultVisible: true },
  { id: 'product', label: 'Product', category: 'basic', defaultVisible: true },
  { id: 'cavity', label: 'Cavity', category: 'basic', defaultVisible: true },
  
  // Process Parameters
  { id: 'targetCycle', label: 'Trg Cycle (sec)', category: 'process', defaultVisible: false },
  { id: 'targetRunTime', label: 'Trg Run Time (min)', category: 'process', defaultVisible: false },
  { id: 'partWeight', label: 'Part Wt (gm)', category: 'process', defaultVisible: false },
  { id: 'actualPartWeight', label: 'Act part wt (gm)', category: 'process', defaultVisible: false },
  { id: 'actualCycle', label: 'Act Cycle (sec)', category: 'process', defaultVisible: false },
  { id: 'partWeightCheck', label: 'Part Wt Check', category: 'process', defaultVisible: false },
  { id: 'cycleTimeCheck', label: 'Cycle Time Check', category: 'process', defaultVisible: false },
  
  // No of Shots
  { id: 'shotsStart', label: 'No of Shots (Start)', category: 'shots', defaultVisible: false },
  { id: 'shotsEnd', label: 'No of Shots (End)', category: 'shots', defaultVisible: false },
  
  // Production Data
  { id: 'targetQty', label: 'Target Qty (Nos)', category: 'production', defaultVisible: true },
  { id: 'actualQty', label: 'Actual Qty (Nos)', category: 'production', defaultVisible: true },
  { id: 'okProdQty', label: 'Ok Prod Qty (Nos)', category: 'production', defaultVisible: true },
  { id: 'okProdKgs', label: 'Ok Prod (Kgs)', category: 'production', defaultVisible: true },
  { id: 'okProdPercent', label: 'Ok Prod (%)', category: 'production', defaultVisible: true },
  { id: 'rejKgs', label: 'Rej (Kgs)', category: 'production', defaultVisible: true },
  
  // Runtime
  { id: 'runTime', label: 'Run Time (mins)', category: 'runtime', defaultVisible: true },
  { id: 'downTime', label: 'Down time (min)', category: 'runtime', defaultVisible: true },
  
  // Stoppage Time and Remarks
  { id: 'stoppageReason', label: 'Reason', category: 'stoppage', defaultVisible: false },
  { id: 'startTime', label: 'Start Time', category: 'stoppage', defaultVisible: false },
  { id: 'endTime', label: 'End Time', category: 'stoppage', defaultVisible: false },
  { id: 'totalTime', label: 'Total Time (min)', category: 'stoppage', defaultVisible: false },
  { id: 'mouldChange', label: 'Mould change', category: 'stoppage', defaultVisible: false },
  { id: 'remark', label: 'REMARK', category: 'stoppage', defaultVisible: false },
];

// Default section visibility
export const DEFAULT_SECTION_VISIBILITY: SectionVisibility = {
  shiftTotal: true,
  achievementMetrics: true,
};

// Default shift total metrics
export const DEFAULT_SHIFT_TOTAL_METRICS: ShiftTotalMetrics = {
  targetQty: true,
  actualQty: true,
  okProdQty: true,
  okProdKgs: true,
  okProdPercent: true,
  rejKgs: true,
  lumps: true,
  runTime: true,
  downTime: true,
  totalTime: true,
};

// Default achievement metrics
export const DEFAULT_ACHIEVEMENT_METRICS: AchievementMetrics = {
  actualVsTarget: true,
  rejVsOkProd: true,
  runTimeVsTotal: true,
  downTimeVsTotal: true,
};

// LocalStorage utility functions
export const loadColumnVisibility = (): Record<string, boolean> => {
  if (typeof window === 'undefined') {
    const defaults: Record<string, boolean> = {};
    DPR_COLUMNS.forEach(col => {
      defaults[col.id] = col.defaultVisible;
    });
    return defaults;
  }
  
  try {
    const saved = localStorage.getItem('dpr_column_visibility');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load column visibility:', e);
  }
  
  const defaults: Record<string, boolean> = {};
  DPR_COLUMNS.forEach(col => {
    defaults[col.id] = col.defaultVisible;
  });
  return defaults;
};

export const saveColumnVisibility = (visibility: Record<string, boolean>) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dpr_column_visibility', JSON.stringify(visibility));
    } catch (e) {
      console.error('Failed to save column visibility:', e);
    }
  }
};

export const loadSectionVisibility = (): SectionVisibility => {
  if (typeof window === 'undefined') {
    return DEFAULT_SECTION_VISIBILITY;
  }
  
  try {
    const saved = localStorage.getItem('dpr_section_visibility');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load section visibility:', e);
  }
  
  return DEFAULT_SECTION_VISIBILITY;
};

export const saveSectionVisibility = (visibility: SectionVisibility) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dpr_section_visibility', JSON.stringify(visibility));
    } catch (e) {
      console.error('Failed to save section visibility:', e);
    }
  }
};

export const loadShiftTotalMetrics = (): ShiftTotalMetrics => {
  if (typeof window === 'undefined') {
    return DEFAULT_SHIFT_TOTAL_METRICS;
  }
  
  try {
    const saved = localStorage.getItem('dpr_shift_total_metrics');
    if (saved) {
      return { ...DEFAULT_SHIFT_TOTAL_METRICS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load shift total metrics:', e);
  }
  
  return DEFAULT_SHIFT_TOTAL_METRICS;
};

export const saveShiftTotalMetrics = (metrics: ShiftTotalMetrics) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dpr_shift_total_metrics', JSON.stringify(metrics));
    } catch (e) {
      console.error('Failed to save shift total metrics:', e);
    }
  }
};

export const loadAchievementMetrics = (): AchievementMetrics => {
  if (typeof window === 'undefined') {
    return DEFAULT_ACHIEVEMENT_METRICS;
  }
  
  try {
    const saved = localStorage.getItem('dpr_achievement_metrics');
    if (saved) {
      return { ...DEFAULT_ACHIEVEMENT_METRICS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load achievement metrics:', e);
  }
  
  return DEFAULT_ACHIEVEMENT_METRICS;
};

export const saveAchievementMetrics = (metrics: AchievementMetrics) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dpr_achievement_metrics', JSON.stringify(metrics));
    } catch (e) {
      console.error('Failed to save achievement metrics:', e);
    }
  }
};
