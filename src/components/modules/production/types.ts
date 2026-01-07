// Types extracted from production/index.tsx

import { Mold, Machine, Line } from '../../../lib/supabase';

export interface ProductionModuleProps {
  onSubNavClick?: () => void;
}

// DPR Data Interface
export interface DPRData {
  id: string;
  date: string;
  shift: string;
  shiftIncharge: string;
  machines: MachineData[];
  summary: SummaryData;
  shiftTotal?: ShiftTotalData | null;
  achievement?: any | null;
}

export interface MachineData {
  machineNo: string;
  operatorName: string;
  currentProduction: ProductionRun;
  changeover: ProductionRun;
}

export interface ProductionRun {
  product: string;
  cavity: number;
  targetCycle: number;
  targetRunTime: number;
  partWeight: number;
  actualPartWeight: number;
  actualCycle: number;
  shotsStart: number;
  shotsEnd: number;
  targetQty: number;
  actualQty: number;
  okProdQty: number;
  okProdKgs: number;
  okProdPercent: number;
  rejKgs: number;
  lumps: number;
  runTime: number;
  downTime: number;
  stoppageReason: string;
  startTime: string;
  endTime: string;
  totalTime: number;
  mouldChange: string;
  remark: string;
  // Quality Check fields
  partWeightCheck: 'OK' | 'NOT OK' | '';
  cycleTimeCheck: 'OK' | 'NOT OK' | '';
}

export interface SummaryData {
  targetQty: number;
  actualQty: number;
  okProdQty: number;
  okProdKgs: number;
  okProdPercent: number;
  rejKgs: number;
  runTime: number;
  downTime: number;
}

export interface ShiftTotalData {
  type: string;
  label: string;
  targetQty: number;
  actualQty: number;
  okProdQty: number;
  okProdKgs: number;
  okProdPercent: number;
  rejKgs: number;
  lumps: number;
  runTime: number;
  downTime: number;
  totalTime: number;
}

// Column definitions for DPR table
export interface ColumnDefinition {
  id: string;
  label: string;
  category: 'basic' | 'process' | 'shots' | 'production' | 'runtime' | 'stoppage';
  defaultVisible: boolean;
}

// Section visibility definitions
export interface SectionVisibility {
  shiftTotal: boolean;
  achievementMetrics: boolean;
}

// Individual metric visibility for SHIFT TOTAL
export interface ShiftTotalMetrics {
  targetQty: boolean;
  actualQty: boolean;
  okProdQty: boolean;
  okProdKgs: boolean;
  okProdPercent: boolean;
  rejKgs: boolean;
  lumps: boolean;
  runTime: boolean;
  downTime: boolean;
  totalTime: boolean;
}

// Individual metric visibility for ACHIEVEMENT METRICS
export interface AchievementMetrics {
  actualVsTarget: boolean;
  rejVsOkProd: boolean;
  runTimeVsTotal: boolean;
  downTimeVsTotal: boolean;
}

// Re-export supabase types for convenience
export type { Mold, Machine, Line };
