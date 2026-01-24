'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Factory, 
  Settings, 
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  Upload,
  Download,
  Target,
  Zap,
  Award,
  Activity,
  TrendingDown,
  Minus,
  Cog,
  Layers,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  FileText,
  ChevronDown,
  Loader2,
  MoreVertical,
  Database,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import ExcelFileReader from '../../ExcelFileReader';
import BlockingLoadingModal from '../../ui/BlockingLoadingModal';
import MouldLoadingUnloadingReport from './MouldLoadingUnloadingReport';
import SiloManagement from './SiloManagement';
import FGNForm from '../store-dispatch/FGNForm';
import { moldAPI, machineAPI, lineAPI, Mold, Machine, Line } from '../../../lib/supabase';
import { Plus } from 'lucide-react';

interface ProductionModuleProps {
  // Callback to collapse sidebar when sub nav is clicked
  onSubNavClick?: () => void;
}

// DPR Data Interface
interface DPRData {
  id: string;
  date: string;
  shift: string;
  shiftIncharge: string;
  machines: MachineData[];
  summary: SummaryData;
  shiftTotal?: ShiftTotalData | null;
  achievement?: any | null;
  stock_status?: string;
}

interface MachineData {
  machineNo: string;
  operatorName: string;
  currentProduction: ProductionRun;
  changeover: ProductionRun;
}

interface StoppageEntry {
  id: string; // Temporary ID for form management
  reason: string;
  startTime: string;
  endTime: string;
  totalTime: number; // Calculated from start/end time
  remark?: string;
}

interface ProductionRun {
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
  // Multiple stoppages support
  stoppages: StoppageEntry[];
  // Legacy fields for backward compatibility (will be migrated from/to stoppages array)
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

interface SummaryData {
  targetQty: number;
  actualQty: number;
  okProdQty: number;
  okProdKgs: number;
  okProdPercent: number;
  rejKgs: number;
  runTime: number;
  downTime: number;
}

interface ShiftTotalData {
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
interface ColumnDefinition {
  id: string;
  label: string;
  category: 'basic' | 'process' | 'shots' | 'production' | 'runtime' | 'stoppage';
  defaultVisible: boolean;
}

const DPR_COLUMNS: ColumnDefinition[] = [
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

// Section visibility definitions
interface SectionVisibility {
  shiftTotal: boolean;
  achievementMetrics: boolean;
}

// Individual metric visibility for SHIFT TOTAL
interface ShiftTotalMetrics {
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
interface AchievementMetrics {
  actualVsTarget: boolean;
  rejVsOkProd: boolean;
  runTimeVsTotal: boolean;
  downTimeVsTotal: boolean;
}

const DEFAULT_SECTION_VISIBILITY: SectionVisibility = {
  shiftTotal: true,
  achievementMetrics: true,
};

const DEFAULT_SHIFT_TOTAL_METRICS: ShiftTotalMetrics = {
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

const DEFAULT_ACHIEVEMENT_METRICS: AchievementMetrics = {
  actualVsTarget: true,
  rejVsOkProd: true,
  runTimeVsTotal: true,
  downTimeVsTotal: true,
};

// Load column visibility from localStorage
const loadColumnVisibility = (): Record<string, boolean> => {
  if (typeof window === 'undefined') {
    // Return defaults for SSR
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
  
  // Return defaults
  const defaults: Record<string, boolean> = {};
  DPR_COLUMNS.forEach(col => {
    defaults[col.id] = col.defaultVisible;
  });
  return defaults;
};

// Save column visibility to localStorage
const saveColumnVisibility = (visibility: Record<string, boolean>) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dpr_column_visibility', JSON.stringify(visibility));
    } catch (e) {
      console.error('Failed to save column visibility:', e);
    }
  }
};

// Load section visibility from localStorage
const loadSectionVisibility = (): SectionVisibility => {
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

// Save section visibility to localStorage
const saveSectionVisibility = (visibility: SectionVisibility) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dpr_section_visibility', JSON.stringify(visibility));
    } catch (e) {
      console.error('Failed to save section visibility:', e);
    }
  }
};

// Load shift total metrics visibility from localStorage
const loadShiftTotalMetrics = (): ShiftTotalMetrics => {
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

// Save shift total metrics visibility to localStorage
const saveShiftTotalMetrics = (metrics: ShiftTotalMetrics) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dpr_shift_total_metrics', JSON.stringify(metrics));
    } catch (e) {
      console.error('Failed to save shift total metrics:', e);
    }
  }
};

// Load achievement metrics visibility from localStorage
const loadAchievementMetrics = (): AchievementMetrics => {
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

// Save achievement metrics visibility to localStorage
const saveAchievementMetrics = (metrics: AchievementMetrics) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dpr_achievement_metrics', JSON.stringify(metrics));
    } catch (e) {
      console.error('Failed to save achievement metrics:', e);
    }
  }
};

const ProductionModule: React.FC<ProductionModuleProps> = ({ onSubNavClick }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [showExcelReader, setShowExcelReader] = useState(false);
  const [dprData, setDprData] = useState<DPRData[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [skipNextFetch, setSkipNextFetch] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(loadColumnVisibility);
  const [sectionVisibility, setSectionVisibility] = useState<SectionVisibility>(loadSectionVisibility);
  const [shiftTotalMetrics, setShiftTotalMetrics] = useState<ShiftTotalMetrics>(loadShiftTotalMetrics);
  const [achievementMetrics, setAchievementMetrics] = useState<AchievementMetrics>(loadAchievementMetrics);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [hasFullViewAccess, setHasFullViewAccess] = useState<boolean>(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isPostingToStock, setIsPostingToStock] = useState(false);
  const [stockPostResult, setStockPostResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showActionsMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.actions-dropdown')) {
          setShowActionsMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu]);
  const [molds, setMolds] = useState<Mold[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  
  // Check if user is Yogesh Deora
  const userEmail = user?.email?.toLowerCase() || '';
  const userName = user?.fullName?.toLowerCase() || '';
  const isYogeshDeora = 
    userEmail.includes('yogesh') || 
    userEmail.includes('deora') ||
    userName.includes('yogesh') ||
    userName.includes('deora') ||
    user?.isRootAdmin || false;
  
  // Super user can always open the local Column Settings panel.
  // We no longer depend on legacy DPR category permissions here;
  // per-user view settings are managed from the Admin dashboard instead.
  const isSuperUser = isYogeshDeora;

  // Load per-user DPR view settings (what to show on dashboard)
  useEffect(() => {
    const loadDprViewSettings = async () => {
      try {
        const response = await fetch('/api/user/dpr-view-settings', {
          credentials: 'include'
        });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const settings = (data.settings || {}) as Record<string, boolean>;
        if (!settings || Object.keys(settings).length === 0) return;

        // Check fullView access (default to false if not set)
        // Root users (isYogeshDeora) always have full view access
        setHasFullViewAccess(settings['fullView'] === true);

        // Build SHIFT TOTAL metrics from settings (fallback to defaults)
        const newShiftTotal: ShiftTotalMetrics = { ...DEFAULT_SHIFT_TOTAL_METRICS };
        Object.entries(settings).forEach(([key, visible]) => {
          if (key.startsWith('summary.shiftTotal.')) {
            const metricKey = key.replace('summary.shiftTotal.', '') as keyof ShiftTotalMetrics;
            if (metricKey in newShiftTotal) {
              (newShiftTotal[metricKey] as boolean) = visible;
            }
          }
        });
        const anyShiftMetricVisible = Object.values(newShiftTotal).some(Boolean);

        // Build ACHIEVEMENT metrics from settings (fallback to defaults)
        const newAchievement: AchievementMetrics = { ...DEFAULT_ACHIEVEMENT_METRICS };
        Object.entries(settings).forEach(([key, visible]) => {
          if (key.startsWith('summary.achievement.')) {
            const metricKey = key.replace('summary.achievement.', '') as keyof AchievementMetrics;
            if (metricKey in newAchievement) {
              (newAchievement[metricKey] as boolean) = visible;
            }
          }
        });
        const anyAchievementVisible = Object.values(newAchievement).some(Boolean);

        // Apply summary visibility
        setShiftTotalMetrics(newShiftTotal);
        setAchievementMetrics(newAchievement);
        setSectionVisibility(prev => ({
          ...prev,
          shiftTotal: anyShiftMetricVisible,
          achievementMetrics: anyAchievementVisible
        }));

        // Apply table column visibility
        setColumnVisibility(prev => {
          const updated = { ...prev };
          Object.entries(settings).forEach(([key, visible]) => {
            if (key.startsWith('table.')) {
              const parts = key.split('.');
              const columnId = parts[parts.length - 1];
              updated[columnId] = visible;
            }
          });
          // Persist to localStorage so subsequent loads are fast
          saveColumnVisibility(updated);
          return updated;
        });
      } catch (error) {
        console.error('Error loading DPR view settings for user:', error);
      }
    };

    if (user) {
      loadDprViewSettings();
    }
  }, [user]);

  // Load molds, machines, and lines for manual entry
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [moldsData, machinesData, linesData] = await Promise.all([
          moldAPI.getAll(),
          machineAPI.getAll(),
          lineAPI.getAll()
        ]);
        setMolds(moldsData);
        setMachines(machinesData);
        setLines(linesData);
      } catch (error) {
        console.error('Error loading masters:', error);
      }
    };
    loadMasters();
  }, []);

  // Load DPR data from API - extracted for reuse with refresh button
  // Fetches from both regular DPR table and Excel DPR table
  const loadDprData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }
    try {
      console.log('🔄 Loading DPR data for:', { date: selectedDate, shift: selectedShift });
      
      // Fetch from both regular DPR and Excel DPR tables in parallel
      const [regularResponse, excelResponse] = await Promise.all([
        fetch(`/api/dpr?from_date=${selectedDate}&to_date=${selectedDate}&shift=${selectedShift}`),
        fetch(`/api/dpr-excel?from_date=${selectedDate}&to_date=${selectedDate}&shift=${selectedShift}`)
      ]);
      
      const regularResult = await regularResponse.json();
      const excelResult = await excelResponse.json();
      
      // Combine data from both sources
      const allData = [
        ...(regularResult.success && regularResult.data ? regularResult.data : []),
        ...(excelResult.success && excelResult.data ? excelResult.data.map((d: any) => ({
          ...d,
          // Map Excel table fields to regular DPR structure
          dpr_machine_entries: d.dpr_excel_machine_entries || [],
          is_excel_data: true
        })) : [])
      ];
      
      if (allData.length > 0) {
        console.log('✅ Loaded DPR data from API:', allData.length, 'entries (regular:', regularResult.data?.length || 0, ', excel:', excelResult.data?.length || 0, ')');
          
          // Convert API response to DPRData format
          const convertedData = allData.map((apiDpr: any) => {
            // Group machine entries by machine_no (combine current and changeover)
            const machineMap = new Map<string, MachineData>();
            
            (apiDpr.dpr_machine_entries || []).forEach((me: any) => {
              // For Excel/API data: machine_no is IMM (machine number like "IMM-01")
              // For new manual entries: machine_no is line_id (line number)
              // Keep as-is, do not convert between them
              const machineNo = me.machine_no;
              const isCurrent = me.section_type === 'current' && !me.is_changeover;
              const isChangeover = me.section_type === 'changeover' || me.is_changeover;
              
              if (!machineMap.has(machineNo)) {
                // Create new machine entry
                machineMap.set(machineNo, {
                  machineNo: machineNo,
                  operatorName: me.operator_name || '',
                  currentProduction: {
                    product: '',
                    cavity: 0,
                    targetCycle: 0,
                    targetRunTime: 0,
                    partWeight: 0,
                    actualPartWeight: 0,
                    actualCycle: 0,
                    shotsStart: 0,
                    shotsEnd: 0,
                    targetQty: 0,
                    actualQty: 0,
                    okProdQty: 0,
                    okProdKgs: 0,
                    okProdPercent: 0,
                    rejKgs: 0,
                    lumps: 0,
                    runTime: 0,
                    downTime: 0,
                    stoppages: [],
                    stoppageReason: '',
                    startTime: '',
                    endTime: '',
                    totalTime: 0,
                    mouldChange: '',
                    remark: '',
                    partWeightCheck: '',
                    cycleTimeCheck: ''
                  },
                  changeover: {
                    product: '',
                    cavity: 0,
                    targetCycle: 0,
                    targetRunTime: 0,
                    partWeight: 0,
                    actualPartWeight: 0,
                    actualCycle: 0,
                    shotsStart: 0,
                    shotsEnd: 0,
                    targetQty: 0,
                    actualQty: 0,
                    okProdQty: 0,
                    okProdKgs: 0,
                    okProdPercent: 0,
                    rejKgs: 0,
                    lumps: 0,
                    runTime: 0,
                    downTime: 0,
                    stoppages: [],
                    stoppageReason: '',
                    startTime: '',
                    endTime: '',
                    totalTime: 0,
                    mouldChange: '',
                    remark: '',
                    partWeightCheck: '',
                    cycleTimeCheck: ''
                  }
                });
              }
              
              const machine = machineMap.get(machineNo)!;
              
              // Update operator name if present
              if (me.operator_name) {
                machine.operatorName = me.operator_name;
              }
              
              // Populate current production or changeover based on section_type
              // Load values directly from database - they should be saved correctly
              console.log(`📥 [Load DPR] Loading data for ${machineNo} (${isCurrent ? 'current' : 'changeover'}):`, {
                targetQty: me.target_qty_nos,
                actualQty: me.actual_qty_nos,
                targetRunTime: me.trg_run_time_min,
                targetCycle: me.trg_cycle_sec,
                cavity: me.cavity,
                shotsStart: me.shots_start,
                shotsEnd: me.shots_end
              });
              
              // Load stoppages from dpr_stoppage_entries and sort by start_time
              const stoppages: StoppageEntry[] = (me.dpr_stoppage_entries || [])
                .map((se: any) => ({
                  id: se.id || `stoppage-${Date.now()}-${Math.random()}`,
                  reason: se.reason || '',
                  startTime: se.start_time || '',
                  endTime: se.end_time || '',
                  totalTime: se.total_time_min || 0,
                  remark: se.remark || ''
                }))
                .sort((a: StoppageEntry, b: StoppageEntry) => {
                  // Sort by start_time to maintain chronological order
                  if (!a.startTime && !b.startTime) return 0;
                  if (!a.startTime) return 1;
                  if (!b.startTime) return -1;
                  return a.startTime.localeCompare(b.startTime);
                });

              const productionData = {
                product: me.product || '',
                cavity: me.cavity || 0,
                targetCycle: me.trg_cycle_sec || 0,
                targetRunTime: me.trg_run_time_min || 0,
                partWeight: me.part_wt_gm || 0,
                actualPartWeight: me.act_part_wt_gm || 0,
                actualCycle: me.act_cycle_sec || 0,
                shotsStart: me.shots_start || 0,
                shotsEnd: me.shots_end || 0,
                targetQty: me.target_qty_nos || 0,
                actualQty: me.actual_qty_nos || 0,
                okProdQty: me.ok_prod_qty_nos || 0,
                okProdKgs: me.ok_prod_kgs || 0,
                okProdPercent: me.ok_prod_percent || 0,
                rejKgs: me.rej_kgs || 0,
                lumps: me.lumps_kgs || 0,
                runTime: me.run_time_mins || 0,
                downTime: me.down_time_min || 0,
                stoppages: stoppages,
                stoppageReason: me.stoppage_reason || '', // Legacy field
                startTime: isChangeover ? (me.changeover_start_time || '') : (me.stoppage_start || ''), // Legacy field
                endTime: isChangeover ? (me.changeover_end_time || '') : (me.stoppage_end || ''), // Legacy field
                stoppageTotal: me.stoppage_total_min || 0,
                totalTime: stoppages.reduce((sum, s) => {
                  // Only count if both start and end times are present
                  if (s.startTime && s.endTime && s.startTime.trim() && s.endTime.trim()) {
                    return sum + (s.totalTime || 0);
                  }
                  return sum;
                }, 0), // Calculate from stoppages (only counts those with start/end times)
                mouldChange: me.mould_change || '',
                remark: me.remark || '',
                partWeightCheck: me.part_wt_check || '',
                cycleTimeCheck: me.cycle_time_check || ''
              };
              
              if (isCurrent) {
                machine.currentProduction = productionData;
              } else if (isChangeover) {
                machine.changeover = productionData;
              }
            });

            const finalMachines = Array.from(machineMap.values());

            // Calculate summary
            console.log('📊 [Load DPR] Calculating summary from', finalMachines.length, 'machines');
            console.log('📊 [Load DPR] Machine data:', finalMachines.map(m => ({
              machineNo: m.machineNo,
              current: { targetQty: m.currentProduction.targetQty, okProdQty: m.currentProduction.okProdQty, okProdKgs: m.currentProduction.okProdKgs, partWeight: m.currentProduction.partWeight },
              changeover: { targetQty: m.changeover.targetQty, okProdQty: m.changeover.okProdQty, okProdKgs: m.changeover.okProdKgs, partWeight: m.changeover.partWeight }
            })));

            const summary: SummaryData = {
              targetQty: finalMachines.reduce((sum, m) => sum + (m.currentProduction.targetQty || 0) + (m.changeover.targetQty || 0), 0),
              actualQty: finalMachines.reduce((sum, m) => sum + (m.currentProduction.actualQty || 0) + (m.changeover.actualQty || 0), 0),
              okProdQty: finalMachines.reduce((sum, m) => sum + (m.currentProduction.okProdQty || 0) + (m.changeover.okProdQty || 0), 0),
              okProdKgs: finalMachines.reduce((sum, m) => sum + (m.currentProduction.okProdKgs || 0) + (m.changeover.okProdKgs || 0), 0),
              okProdPercent: 0,
              rejKgs: finalMachines.reduce((sum, m) => sum + (m.currentProduction.rejKgs || 0) + (m.changeover.rejKgs || 0), 0),
              runTime: finalMachines.reduce((sum, m) => sum + (m.currentProduction.runTime || 0) + (m.changeover.runTime || 0), 0),
              downTime: finalMachines.reduce((sum, m) => sum + (m.currentProduction.downTime || 0) + (m.changeover.downTime || 0), 0)
            };

            console.log('📊 [Load DPR] Summary (before okProdPercent):', {
              targetQty: summary.targetQty,
              actualQty: summary.actualQty,
              okProdQty: summary.okProdQty,
              okProdKgs: summary.okProdKgs,
              rejKgs: summary.rejKgs,
              runTime: summary.runTime,
              downTime: summary.downTime
            });

            const targetQtyKgs = finalMachines.reduce((sum, m) => {
              const current = (m.currentProduction.targetQty || 0) * (m.currentProduction.partWeight || 0) / 1000;
              const changeover = (m.changeover.targetQty || 0) * (m.changeover.partWeight || 0) / 1000;
              return sum + current + changeover;
            }, 0);

            console.log('📊 [Load DPR] targetQtyKgs calculated:', targetQtyKgs);
            summary.okProdPercent = targetQtyKgs > 0 ? (summary.okProdKgs / targetQtyKgs * 100) : 0;
            console.log('📊 [Load DPR] okProdPercent calculated:', summary.okProdPercent, '% (okProdKgs:', summary.okProdKgs, '/ targetQtyKgs:', targetQtyKgs, ')');

            const shiftTotal: ShiftTotalData = {
              type: 'shift_total',
              label: `${apiDpr.shift} Shift Total`,
              targetQty: summary.targetQty,
              actualQty: summary.actualQty,
              okProdQty: summary.okProdQty,
              okProdKgs: summary.okProdKgs,
              okProdPercent: summary.okProdPercent,
              rejKgs: summary.rejKgs,
              lumps: finalMachines.reduce((sum, m) => sum + (m.currentProduction.lumps || 0) + (m.changeover.lumps || 0), 0),
              runTime: summary.runTime,
              downTime: summary.downTime,
              totalTime: summary.runTime + summary.downTime
            };

            // Ensure date is in YYYY-MM-DD format for consistent comparison
            const normalizedDate = typeof apiDpr.report_date === 'string' 
              ? apiDpr.report_date.split('T')[0] 
              : apiDpr.report_date;
            
            const dprDataItem = {
              id: apiDpr.id,
              date: normalizedDate,
              shift: apiDpr.shift,
              shiftIncharge: apiDpr.shift_incharge || '',
              machines: finalMachines,
              summary,
              shiftTotal,
              achievement: null,
              stock_status: apiDpr.stock_status
            };
            
            console.log('📦 Converted DPR data item:', { id: dprDataItem.id, date: dprDataItem.date, shift: dprDataItem.shift });
            
            return dprDataItem;
          });

          setDprData(convertedData);
          console.log('✅ Converted and set DPR data:', convertedData.length, 'entries');
      } else {
        console.log('ℹ️ No DPR data found for selected date/shift');
        setDprData([]);
      }
    } catch (error) {
      console.error('❌ Error loading DPR data:', error);
      setDprData([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load DPR data from API when component mounts or date/shift changes
  useEffect(() => {
    // Skip fetch if flag is set (e.g., after Excel import to preserve local data)
    if (skipNextFetch) {
      console.log('⏭️ Skipping DPR data fetch (skipNextFetch flag set)');
      setSkipNextFetch(false);
      return;
    }
    loadDprData();
  }, [selectedDate, selectedShift]);

  // Excel Import Handler - Handles 63 sheets structure
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      console.log('Importing Excel file:', file.name);
      
      // Read Excel file using XLSX - match ExcelFileReader approach
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { 
        type: 'array',
        cellDates: false,
        cellNF: false,
        cellText: true, // Enable to get formatted text values (e.g., "01-Aug-25" instead of serial number)
        cellFormula: false,
        cellStyles: false,
        cellHTML: false
      });

      console.log('📊 Excel sheets found:', workbook.SheetNames);
      console.log('📊 Total sheets:', workbook.SheetNames.length);

      // Find summary sheet only for extracting date, shift, and shift incharge
      const summarySheetName = workbook.SheetNames.find(name => 
        name.toLowerCase() === 'summary'
      ) || workbook.SheetNames.find(name => 
        name.toLowerCase().includes('summary')
      ) || workbook.SheetNames[0];
      
      console.log('📊 Using summary sheet for metadata:', summarySheetName);
      const summarySheet = workbook.Sheets[summarySheetName];
      
      // Group and parse machine sheets (1a, 1b, 2a, 2b, etc.)
      const machineSheets = workbook.SheetNames.filter(name => {
        const isMachineSheet = /^\d+[ab]$/i.test(name.trim());
        const isNotSummary = name.toLowerCase() !== 'summary' && !name.toLowerCase().includes('summary');
        return isMachineSheet && isNotSummary;
      });
      
      // Extract date and shift from summary sheet FIRST (before parsing machines)
      console.log('📅 Extracting date and shift from summary sheet...');
      const extractedDate = extractDateFromSheet(summarySheet);
      const extractedShift = extractShiftFromSheet(summarySheet);
      const shiftIncharge = extractShiftIncharge(summarySheet) || 'CHANDAN/DHIRAJ';
      
      console.log('📅 Extracted date:', extractedDate, '(original selected:', selectedDate, ')');
      console.log('📅 Extracted shift:', extractedShift, '(original selected:', selectedShift, ')');
      console.log('📅 Shift incharge:', shiftIncharge);

      // Use extracted date/shift if available, otherwise use selected
      const finalDate = extractedDate || selectedDate;
      const finalShift = (extractedShift as 'DAY' | 'NIGHT') || selectedShift;

      // Update date and shift pickers to match imported data
      setSelectedDate(finalDate);
      setSelectedShift(finalShift);
      
      console.log('📅 Final date being used:', finalDate);
      console.log('📅 Final shift being used:', finalShift);

      console.log('📊 Machine sheets found:', machineSheets.length, machineSheets.slice(0, 10));
      const machines = groupAndParseMachineSheets(machineSheets, workbook);
      console.log('📊 Parsed machines:', machines.length);

      // Always calculate summary from machine data (source of truth)
      const targetQty = machines.reduce((sum, m) => 
        sum + (m.currentProduction.targetQty || 0) + (m.changeover.targetQty || 0), 0);
      const actualQty = machines.reduce((sum, m) => 
        sum + (m.currentProduction.actualQty || 0) + (m.changeover.actualQty || 0), 0);
      const okProdQty = machines.reduce((sum, m) => 
        sum + (m.currentProduction.okProdQty || 0) + (m.changeover.okProdQty || 0), 0);
      const okProdKgs = machines.reduce((sum, m) => 
        sum + (m.currentProduction.okProdKgs || 0) + (m.changeover.okProdKgs || 0), 0);
      const rejKgs = machines.reduce((sum, m) => 
        sum + (m.currentProduction.rejKgs || 0) + (m.changeover.rejKgs || 0), 0);
      const runTime = machines.reduce((sum, m) => 
        sum + (m.currentProduction.runTime || 0) + (m.changeover.runTime || 0), 0);
      const downTime = machines.reduce((sum, m) => 
        sum + (m.currentProduction.downTime || 0) + (m.changeover.downTime || 0), 0);
      
      const finalSummary: SummaryData = {
        targetQty,
        actualQty,
        okProdQty,
        okProdKgs,
        okProdPercent: actualQty > 0 ? (okProdQty / actualQty * 100) : 0,
        rejKgs,
        runTime,
        downTime
      };

      console.log(`📊 Calculated summary from ${machines.length} machines:`);
      console.log(`📊 Target: ${targetQty.toLocaleString()}, Actual: ${actualQty.toLocaleString()}, OK: ${okProdQty.toLocaleString()}, OK Kgs: ${okProdKgs.toFixed(2)}`);

      const importedData: DPRData = {
        id: `${finalDate}-${finalShift}-${Date.now()}`,
        date: finalDate,
        shift: finalShift,
        shiftIncharge,
        machines,
        summary: finalSummary
      };

      // Validate that we actually got some data
      if (machines.length === 0) {
        throw new Error(`No machine data found in Excel file. Found ${machineSheets.length} machine sheets but could not parse any machines. Please check the sheet names match the pattern (1a, 1b, 2a, 2b, etc.)`);
      }

      // Check if any machines have actual data
      const machinesWithData = machines.filter(m => 
        m.currentProduction.product || m.currentProduction.targetQty > 0 || m.changeover.product || m.changeover.targetQty > 0
      );

      if (machinesWithData.length === 0) {
        console.warn('⚠️ No machines have any production data. This might indicate a parsing issue.');
      }

      // Convert to API format and send to backend as Excel upload (reference data)
      const machineEntriesForApi = machines.map(m => ({
        machine_no: m.machineNo,
        operator_name: m.operatorName || '',
        current_production: m.currentProduction.product ? {
          product: m.currentProduction.product || '',
          cavity: m.currentProduction.cavity || 0,
          target_cycle: m.currentProduction.targetCycle || 0,
          target_run_time: m.currentProduction.targetRunTime || 0,
          part_weight: m.currentProduction.partWeight || 0,
          actual_part_weight: m.currentProduction.actualPartWeight || 0,
          actual_cycle: m.currentProduction.actualCycle || 0,
          shots_start: m.currentProduction.shotsStart || 0,
          shots_end: m.currentProduction.shotsEnd || 0,
          target_qty: m.currentProduction.targetQty || 0,
          actual_qty: m.currentProduction.actualQty || 0,
          ok_prod_qty: m.currentProduction.okProdQty || 0,
          ok_prod_kgs: m.currentProduction.okProdKgs || 0,
          ok_prod_percent: m.currentProduction.okProdPercent || 0,
          rej_kgs: m.currentProduction.rejKgs || 0,
          lumps: m.currentProduction.lumps || 0,
          run_time: m.currentProduction.runTime || 0,
          down_time: m.currentProduction.downTime || 0,
          stoppage_reason: m.currentProduction.stoppageReason || '',
          start_time: m.currentProduction.startTime || '',
          end_time: m.currentProduction.endTime || '',
          mould_change: m.currentProduction.mouldChange || '',
          remark: m.currentProduction.remark || '',
          part_weight_check: m.currentProduction.partWeightCheck || '',
          cycle_time_check: m.currentProduction.cycleTimeCheck || ''
        } : null,
        changeover: m.changeover.product ? {
          product: m.changeover.product || '',
          cavity: m.changeover.cavity || 0,
          target_cycle: m.changeover.targetCycle || 0,
          target_run_time: m.changeover.targetRunTime || 0,
          part_weight: m.changeover.partWeight || 0,
          actual_part_weight: m.changeover.actualPartWeight || 0,
          actual_cycle: m.changeover.actualCycle || 0,
          shots_start: m.changeover.shotsStart || 0,
          shots_end: m.changeover.shotsEnd || 0,
          target_qty: m.changeover.targetQty || 0,
          actual_qty: m.changeover.actualQty || 0,
          ok_prod_qty: m.changeover.okProdQty || 0,
          ok_prod_kgs: m.changeover.okProdKgs || 0,
          ok_prod_percent: m.changeover.okProdPercent || 0,
          rej_kgs: m.changeover.rejKgs || 0,
          lumps: m.changeover.lumps || 0,
          run_time: m.changeover.runTime || 0,
          down_time: m.changeover.downTime || 0,
          stoppage_reason: m.changeover.stoppageReason || '',
          start_time: m.changeover.startTime || '',
          end_time: m.changeover.endTime || '',
          changeover_reason: m.changeover.remark || '',
          mould_change: m.changeover.mouldChange || '',
          remark: m.changeover.remark || '',
          part_weight_check: m.changeover.partWeightCheck || '',
          cycle_time_check: m.changeover.cycleTimeCheck || ''
        } : null
      })).filter(entry => entry.current_production || entry.changeover);

      // Send to API as Excel upload (reference data) - uses separate Excel DPR table
      try {
        const createResponse = await fetch('/api/dpr-excel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_date: finalDate,
            shift: finalShift,
            shift_incharge: shiftIncharge,
            machine_entries: machineEntriesForApi,
            created_by: user?.email || 'user',
            excel_file_name: file.name
          })
        });

        const createResult = await createResponse.json();

        if (!createResult.success) {
          // If API creation fails, still show local data
          console.warn('Failed to save to backend, showing local data only:', createResult.error);
      setDprData(prev => {
        const filtered = prev.filter(dpr => !(dpr.date === finalDate && dpr.shift === finalShift));
        return [...filtered, importedData];
      });
          alert(`Excel parsed successfully but failed to save to database: ${createResult.error}\n\nData is shown locally only.`);
          return;
        }

        // Update local state with API response
        const apiDpr = createResult.data;
        setDprData(prev => {
          const filtered = prev.filter(dpr => !(dpr.date === finalDate && dpr.shift === finalShift));
          return [...filtered, importedData];
        });

        const successMessage = `Excel file imported and saved successfully!\n\nImported:\n- ${machines.length} machines\n- ${machinesWithData.length} machines with data\n- Date: ${new Date(finalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\n- Shift: ${finalShift}\n- Saved as reference data (cannot be posted to stock)\n\nPlease check the browser console for detailed parsing logs.`;
      alert(successMessage);
      } catch (apiError) {
        console.error('Error saving Excel import to API:', apiError);
        // Fallback: show local data
        setDprData(prev => {
          const filtered = prev.filter(dpr => !(dpr.date === finalDate && dpr.shift === finalShift));
          return [...filtered, importedData];
        });
        alert(`Excel parsed successfully but failed to save to database.\n\nData is shown locally only.\n\nError: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error importing Excel file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Error importing Excel file:\n\n${errorMessage}\n\nPlease check:\n1. File has a "summary" sheet\n2. Machine sheets follow naming pattern (1a, 1b, 2a, 2b, etc.)\n3. Check browser console for detailed error logs`);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Helper function to extract date from summary sheet
  const extractDateFromSheet = (sheet: XLSX.WorkSheet): string | null => {
    if (!sheet) return null;
    
    // First, try to get formatted cell text (e.g., "01-Aug-25")
    const jsonDataFormatted = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
    
    // Also get raw values (might be date serial numbers)
    const jsonDataRaw = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    
    console.log('🔍 Extracting date from summary sheet...');
    console.log('📋 First 10 rows (formatted):', jsonDataFormatted.slice(0, 10));
    console.log('📋 First 10 rows (raw):', jsonDataRaw.slice(0, 10));
    
    // Search for date patterns in the sheet (more specific search)
    for (let i = 0; i < jsonDataFormatted.length && i < 30; i++) {
      const rowFormatted = jsonDataFormatted[i];
      const rowRaw = jsonDataRaw[i];
      if (!rowFormatted || !rowRaw) continue;
      
      for (let j = 0; j < rowFormatted.length && j < 30; j++) {
        const cellValue = String(rowFormatted[j] || '').trim();
        
        // Look for "DATE:" or "DATE:-" pattern (case insensitive, with optional hyphen)
        const dateLabelPattern = /^date\s*:?\s*-?$/i;
        if (dateLabelPattern.test(cellValue)) {
          console.log(`✅ Found DATE label at row ${i}, col ${j}: "${cellValue}"`);
          
          // Try to get both formatted and raw values from adjacent cell
          const cellIndex = j + 1;
          
          // Priority 1: Check cell immediately to the right (most common)
          if (cellIndex < rowFormatted.length) {
            const formattedValue = rowFormatted[cellIndex];
            const rawValue = rowRaw[cellIndex];
            
            console.log(`📅 Cell C${i+1}${String.fromCharCode(65 + cellIndex)} formatted: "${formattedValue}", raw: ${rawValue} (type: ${typeof rawValue})`);
            
            // Try formatted value first (e.g., "01-Aug-25" or "01/08/2025")
            if (formattedValue !== null && formattedValue !== undefined && formattedValue !== '') {
              const dateValue = parseExcelDate(formattedValue);
              if (dateValue) {
                console.log(`✅ Parsed date from formatted value: "${formattedValue}" -> "${dateValue}"`);
                return dateValue;
              }
            }
            
            // Try raw value (might be Excel date serial number or string)
            if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
              const dateValue = parseExcelDate(rawValue);
              if (dateValue) {
                console.log(`✅ Parsed date from raw value: ${rawValue} -> "${dateValue}"`);
                return dateValue;
              }
            }
          }
          
          // Priority 2: Check next row same column
          if (i + 1 < jsonDataFormatted.length && jsonDataFormatted[i + 1] && jsonDataRaw[i + 1]) {
            const formattedValue = jsonDataFormatted[i + 1][j];
            const rawValue = jsonDataRaw[i + 1][j];
            
            if (formattedValue !== null && formattedValue !== undefined && formattedValue !== '') {
              const dateValue = parseExcelDate(formattedValue);
              if (dateValue) {
                console.log(`✅ Found date in next row (formatted): "${formattedValue}" -> "${dateValue}"`);
                return dateValue;
              }
            }
            
            if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
              const dateValue = parseExcelDate(rawValue);
              if (dateValue) {
                console.log(`✅ Found date in next row (raw): ${rawValue} -> "${dateValue}"`);
                return dateValue;
              }
            }
          }
          
          console.log(`⚠️ Found DATE label but couldn't parse adjacent date values`);
        }
      }
    }
    
    console.log('⚠️ Could not find DATE label in summary sheet');
    return null;
  };

  // Helper function to parse Excel date value to YYYY-MM-DD format
  const parseExcelDate = (value: any): string | null => {
    if (!value && value !== 0) return null;
    
    console.log(`📅 parseExcelDate called with value:`, value, `type:`, typeof value);
    
    // If it's already a date object
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      const result = `${year}-${month}-${day}`;
      console.log(`✅ Parsed Date object to:`, result);
      return result;
    }
    
    // If it's a string, try to parse common date formats FIRST (before treating as number)
    const strValue = String(value).trim();
    
    // Try DD-MMM-YY or DD-MMM-YYYY FIRST (e.g., "01-Aug-25" or "01-Aug-2025")
    // This should match "01-Aug-25", "1-Aug-25", "01-Aug-2025", etc.
    const ddmmyyMatch = strValue.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{2,4})$/i);
    if (ddmmyyMatch) {
      const day = ddmmyyMatch[1].padStart(2, '0');
      const monthName = ddmmyyMatch[2];
      const yearStr = ddmmyyMatch[3];
      
      console.log(`📅 Matched DD-MMM-YY format: day=${day}, month=${monthName}, year=${yearStr}`);
      
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = monthNames.findIndex(m => monthName.toLowerCase().startsWith(m.toLowerCase()));
      if (monthIndex >= 0) {
        const month = String(monthIndex + 1).padStart(2, '0');
        let year = parseInt(yearStr);
        // For 2-digit years, assume 20XX for years 00-99 (so 25 = 2025, not 1925)
        if (year < 100) {
          year = 2000 + year; // Always interpret 2-digit years as 2000s (25 = 2025, not 1925)
        }
        const result = `${year}-${month}-${day}`;
        console.log(`✅ Parsed DD-MMM-YY format to:`, result);
        return result;
      }
      console.log(`⚠️ Could not match month name:`, monthName);
    }
    
    // Try DD/MM/YYYY or DD-MM-YYYY format (e.g., "01/08/2025" = 1st August 2025)
    // IMPORTANT: This must come before MM/DD/YYYY to prioritize DD/MM format
    const ddmmyyyyMatch = strValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, '0');
      const month = ddmmyyyyMatch[2].padStart(2, '0');
      const year = ddmmyyyyMatch[3];
      
      // Validate: month should be 01-12, day should be 01-31
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        const result = `${year}-${month}-${day}`;
        console.log(`✅ Parsed DD/MM/YYYY format: "${strValue}" -> "${result}"`);
        return result;
      }
    }
    
    // Try MM/DD/YYYY format as fallback (e.g., "08/01/2025" = August 1st 2025)
    const mmddyyyyMatch = strValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (mmddyyyyMatch) {
      const month = mmddyyyyMatch[1].padStart(2, '0');
      const day = mmddyyyyMatch[2].padStart(2, '0');
      const year = mmddyyyyMatch[3];
      
      // Only use this if the first value is <= 12 (could be month)
      // and second value is > 12 (definitely not a month)
      const firstNum = parseInt(month);
      const secondNum = parseInt(day);
      if (firstNum <= 12 && secondNum > 12) {
        const result = `${year}-${month}-${day}`;
        console.log(`✅ Parsed MM/DD/YYYY format (fallback): "${strValue}" -> "${result}"`);
        return result;
      }
    }
    
    // If it's a number (Excel date serial number) - only check if string parsing failed
    if (typeof value === 'number' && !isNaN(value)) {
      // Excel dates start from 1900-01-01, but Excel incorrectly treats 1900 as a leap year
      // Excel date serial: 1 = Jan 1, 1900
      // For modern dates (2025), serial numbers are around 45800+ (Aug 1, 2025 ≈ 45883)
      // If the number is very small (< 100), it's likely not a date serial
      if (value > 1 && value < 1000000) {
        // Excel date serial conversion:
        // Excel serial 1 = Jan 1, 1900
        // JavaScript Date epoch = Jan 1, 1970 (Unix epoch)
        // Excel serial for Jan 1, 1970 = 25569
        // Formula: Date = (ExcelSerial - 25569) * 86400000 milliseconds
        // But Excel incorrectly treats 1900 as a leap year (it wasn't), so for dates after Feb 29, 1900,
        // we subtract 1 from the serial number
        let adjustedSerial = value;
        if (value > 59) { // Feb 29, 1900 would be serial 60
          adjustedSerial = value - 1; // Account for Excel's incorrect leap year
        }
        const date = new Date((adjustedSerial - 25569) * 86400000);
        
        // Verify the date is reasonable (between 1900 and 2100)
        const year = date.getFullYear();
        if (year >= 1900 && year <= 2100) {
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const result = `${year}-${month}-${day}`;
          console.log(`✅ Parsed Excel serial number (${value}) to:`, result);
          return result;
        } else {
          console.log(`⚠️ Excel serial ${value} produced invalid year: ${year}`);
        }
      } else {
        console.log(`⚠️ Number ${value} is likely not a valid Excel date serial (should be 1-1000000)`);
      }
    }
    
    // Try YYYY-MM-DD format
    const yyyymmddMatch = strValue.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (yyyymmddMatch) {
      const year = yyyymmddMatch[1];
      const month = yyyymmddMatch[2].padStart(2, '0');
      const day = yyyymmddMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Try native Date parsing (as last resort - may have incorrect interpretations)
    const parsedDate = new Date(strValue);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return null;
  };

  // Helper function to extract shift (DAY/NIGHT) from summary sheet
  const extractShiftFromSheet = (sheet: XLSX.WorkSheet): string | null => {
    if (!sheet) return null;
    
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    
    console.log('🔍 Extracting shift from summary sheet...');
    
    // Search for shift patterns in the sheet
    for (let i = 0; i < jsonData.length && i < 30; i++) {
      const row = jsonData[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length && j < 30; j++) {
        const cellValue = String(row[j] || '').trim();
        const cellValueLower = cellValue.toLowerCase();
        
        // Look for "SHIFT" or "Shift" pattern (case insensitive)
        // Match "Shift", "SHIFT:", "Shift:", etc.
        if (cellValueLower.includes('shift')) {
          console.log(`✅ Found SHIFT label at row ${i}, col ${j}: "${cellValue}"`);
          
          // Priority 1: Check cell immediately to the right (most common)
          if (j + 1 < row.length && row[j + 1] !== null && row[j + 1] !== undefined && row[j + 1] !== '') {
            const shiftValue = String(row[j + 1]).trim().toUpperCase();
            if (shiftValue === 'DAY' || shiftValue === 'NIGHT') {
              console.log(`✅ Found shift in adjacent cell (right): "${row[j + 1]}" -> "${shiftValue}"`);
              return shiftValue;
            }
          }
          
          // Priority 2: Check next row same column
          if (i + 1 < jsonData.length && jsonData[i + 1] && jsonData[i + 1][j] !== null && jsonData[i + 1][j] !== undefined && jsonData[i + 1][j] !== '') {
            const shiftValue = String(jsonData[i + 1][j]).trim().toUpperCase();
            if (shiftValue === 'DAY' || shiftValue === 'NIGHT') {
              console.log(`✅ Found shift in next row: "${jsonData[i + 1][j]}" -> "${shiftValue}"`);
              return shiftValue;
            }
          }
          
          // Priority 3: Check cell two positions to the right
          if (j + 2 < row.length && row[j + 2] !== null && row[j + 2] !== undefined && row[j + 2] !== '') {
            const shiftValue = String(row[j + 2]).trim().toUpperCase();
            if (shiftValue === 'DAY' || shiftValue === 'NIGHT') {
              console.log(`✅ Found shift two cells to the right: "${row[j + 2]}" -> "${shiftValue}"`);
              return shiftValue;
            }
          }
          
          console.log(`⚠️ Found SHIFT label but couldn't find DAY/NIGHT in adjacent cells`);
        }
        
        // Check if cell directly contains DAY or NIGHT (as fallback)
        const upperValue = cellValue.toUpperCase();
        if (upperValue === 'DAY' || upperValue === 'NIGHT') {
          // Verify it's likely a shift value (check nearby cells for "shift" keyword)
          for (let checkRow = Math.max(0, i - 1); checkRow <= Math.min(jsonData.length - 1, i + 1); checkRow++) {
            for (let checkCol = Math.max(0, j - 2); checkCol <= Math.min(row.length - 1, j + 2); checkCol++) {
              const checkValue = String(jsonData[checkRow]?.[checkCol] || '').toLowerCase();
              if (checkValue.includes('shift')) {
                console.log(`✅ Found shift value "${upperValue}" near SHIFT label`);
                return upperValue;
              }
            }
          }
        }
      }
    }
    
    console.log('⚠️ Could not find SHIFT label in summary sheet');
    return null;
  };

  // Helper function to extract shift incharge from summary sheet
  const extractShiftIncharge = (sheet: XLSX.WorkSheet): string | null => {
    if (!sheet) return null;
    
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    for (let row = 0; row <= range.e.r && row < 20; row++) {
      for (let col = 0; col <= range.e.c && col < 20; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        if (cell && cell.v) {
          const cellValue = String(cell.v).toLowerCase();
          if (cellValue.includes('shift') && cellValue.includes('incharge')) {
            // Try to find value in adjacent cells
            const nextCell = sheet[XLSX.utils.encode_cell({ r: row, c: col + 1 })];
            if (nextCell && nextCell.v) {
              return String(nextCell.v).trim();
            }
          }
        }
      }
    }
    return null;
  };

  // Helper function to parse summary sheet
  const parseSummarySheet = (sheet: XLSX.WorkSheet, workbook: XLSX.WorkBook): SummaryData => {
    const defaultSummary: SummaryData = {
      targetQty: 0,
      actualQty: 0,
      okProdQty: 0,
      okProdKgs: 0,
      okProdPercent: 0,
      rejKgs: 0,
      runTime: 0,
      downTime: 0
    };

    if (!sheet) {
      console.log('⚠️ Summary sheet is null or undefined');
      return defaultSummary;
    }

    // Convert sheet to JSON array for easier parsing - use both raw and text
    const jsonDataRaw = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    const jsonDataText = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
    
    // Combine - prefer numbers from raw, strings from text
    const jsonData = jsonDataRaw.map((row, rowIdx) => 
      row.map((cell, colIdx) => {
        const textCell = jsonDataText[rowIdx]?.[colIdx];
        if (typeof cell === 'number') return cell;
        if (textCell !== undefined && textCell !== null && textCell !== '') return textCell;
        return cell;
      })
    );
    
    console.log('📊 Summary sheet data preview:', jsonData.slice(0, 10));
    
    // Try to find summary values by searching for headers and their corresponding values
    const summary: SummaryData = { ...defaultSummary };

    // Search for summary values - look in first 30 rows
    for (let i = 0; i < Math.min(30, jsonData.length); i++) {
      const row = jsonData[i] || [];
      for (let j = 0; j < row.length; j++) {
        const cellValue = String(row[j] || '').toLowerCase().trim();
        
        if (cellValue.includes('target') && cellValue.includes('qty')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.targetQty = value;
            console.log(`✅ Found targetQty: ${value}`);
          }
        } else if (cellValue.includes('actual') && cellValue.includes('qty') && !cellValue.includes('ok')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.actualQty = value;
            console.log(`✅ Found actualQty: ${value}`);
          }
        } else if (cellValue.includes('ok prod qty') || cellValue.includes('ok prod. qty')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.okProdQty = value;
            console.log(`✅ Found okProdQty: ${value}`);
          }
        } else if (cellValue.includes('ok prod') && (cellValue.includes('kg') || cellValue.includes('kgs')) && !cellValue.includes('%')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.okProdKgs = value;
            console.log(`✅ Found okProdKgs: ${value}`);
          }
        } else if (cellValue.includes('ok prod') && cellValue.includes('%')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.okProdPercent = value;
            console.log(`✅ Found okProdPercent: ${value}`);
          }
        } else if (cellValue.includes('rej') && (cellValue.includes('kg') || cellValue.includes('kgs'))) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null) {
            summary.rejKgs = value;
            console.log(`✅ Found rejKgs: ${value}`);
          }
        } else if (cellValue.includes('run time') && !cellValue.includes('down')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null && value > 0) {
            summary.runTime = value;
            console.log(`✅ Found runTime: ${value}`);
          }
        } else if (cellValue.includes('down time') || cellValue.includes('downtime')) {
          const value = parseNumberValue(jsonData, i, j);
          if (value !== null) {
            summary.downTime = value;
            console.log(`✅ Found downTime: ${value}`);
          }
        }
      }
    }

    console.log('📊 Parsed summary data:', summary);
    return summary;
  };

  // Helper to parse number value from adjacent cells
  const parseNumberValue = (data: any[][], row: number, col: number): number | null => {
    // Try right cell first
    if (col + 1 < data[row].length) {
      const value = data[row][col + 1];
      if (value !== null && value !== undefined && value !== '') {
        const num = parseFloat(String(value).replace(/,/g, ''));
        if (!isNaN(num)) return num;
      }
    }
    // Try below cell
    if (row + 1 < data.length && col < data[row + 1].length) {
      const value = data[row + 1][col];
      if (value !== null && value !== undefined && value !== '') {
        const num = parseFloat(String(value).replace(/,/g, ''));
        if (!isNaN(num)) return num;
      }
    }
    return null;
  };

  // Helper function to parse a single production run from sheet data
  // Understands: 2-row headers, merged cells, empty spacer rows, 4-row machine blocks
  const parseProductionRun = (sheetData: any[][], sheetName?: string): ProductionRun => {
    // Default empty production run
    const defaultRun: ProductionRun = {
      product: '',
      cavity: 0,
      targetCycle: 0,
      targetRunTime: 0,
      partWeight: 0,
      actualPartWeight: 0,
      actualCycle: 0,
      shotsStart: 0,
      shotsEnd: 0,
      targetQty: 0,
      actualQty: 0,
      okProdQty: 0,
      okProdKgs: 0,
      okProdPercent: 0,
      rejKgs: 0,
      lumps: 0,
      runTime: 0,
      downTime: 0,
      stoppages: [],
      stoppageReason: '',
      startTime: '',
      endTime: '',
      totalTime: 0,
      mouldChange: '',
      remark: '',
      partWeightCheck: '',
      cycleTimeCheck: ''
    };

    if (!sheetData || sheetData.length === 0) {
      console.log(`⚠️ Sheet ${sheetName || 'unknown'} has no data`);
      return defaultRun;
    }

    console.log(`📄 Parsing sheet ${sheetName || 'unknown'}, total rows: ${sheetData.length}`);

    // STEP 1: Find the SECOND header row (the one with actual column names)
    // The first header row has parent headers like "Production Data", second row has "Target Qty (Nos)", etc.
    let headerRowIndex = -1;
    let headerRow: any[] = [];
    let firstHeaderRowIndex = -1;
    
    // Look for both header rows
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
      const row = sheetData[i] || [];
      if (row.length === 0) continue;
      
      const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
      
      // Skip title and metadata rows
      if (rowText.includes('daily production report') || 
          rowText.includes('date:-') || 
          rowText.includes('shift incharge')) {
        continue;
      }
      
      // Look for first header row (parent headers like "Production Data", "No of Shots")
      if (rowText.includes('production data') || rowText.includes('no of shots')) {
        firstHeaderRowIndex = i;
        console.log(`📄 Found first header row (parent headers) at index ${i}`);
        continue;
      }
      
      // Look for second header row (actual column names)
      // This row should have specific column headers in individual cells
      const headerKeywords = [
        'product', 'cavity', 'm/c no', 'm/c', 'machine no', 'machine', 'opt name', 'operator',
        'target qty', 'target', 'actual qty', 'actual', 
        'ok prod qty', 'ok prod', 'ok', 'production qty',
        'run time', 'runtime', 'down time', 'downtime', 'down',
        'trg cycle', 'target cycle', 'trg', 'act cycle', 'actual cycle', 'act',
        'part wt', 'part weight', 'weight',
        'start', 'end', 'time',
        'rej', 'rejection', 'remark', 'remarks',
        'mould', 'mold', 'change'
      ];
      
      let keywordMatches = 0;
      let distinctKeywords = new Set<string>();
      
      // Check each cell individually for header keywords
      for (let j = 0; j < row.length && j < 30; j++) {
        const cellText = String(row[j] || '').toLowerCase().trim();
        if (!cellText) continue;
        
        for (const keyword of headerKeywords) {
          if (cellText.includes(keyword)) {
            distinctKeywords.add(keyword);
          }
        }
      }
      
      keywordMatches = distinctKeywords.size;
      
      // If we found the first header row, the next row with headers is likely the second header row
      if (firstHeaderRowIndex >= 0 && i === firstHeaderRowIndex + 1) {
        // Second header row should have column headers - lower threshold since we know where it should be
        if (keywordMatches >= 3 && row.length >= 10) {
          headerRowIndex = i;
          headerRow = row;
          console.log(`✅ Found second header row (column headers) at index ${i} (${keywordMatches} headers, ${row.length} columns)`);
          console.log(`📄 Header row:`, row.slice(0, 15).map(c => String(c || '').substring(0, 25)));
          break;
        } else {
          console.log(`📄 Row ${i} is after first header row but doesn't have enough headers (${keywordMatches} keywords, ${row.length} columns)`);
          console.log(`📄 Row ${i} sample:`, row.slice(0, 10).map(c => String(c || '').substring(0, 30)));
        }
      } else if (firstHeaderRowIndex >= 0 && i > firstHeaderRowIndex + 1 && i <= firstHeaderRowIndex + 3) {
        // If row 6 didn't work, try rows 7-8 as fallback
        if (keywordMatches >= 4 && row.length >= 15) {
          headerRowIndex = i;
          headerRow = row;
          console.log(`✅ Found second header row (column headers) at index ${i} - fallback (${keywordMatches} headers, ${row.length} columns)`);
          console.log(`📄 Header row:`, row.slice(0, 15).map(c => String(c || '').substring(0, 25)));
          break;
        }
      } else if (firstHeaderRowIndex < 0) {
        // If we didn't find first header row, but this row has many headers, use it
        if (keywordMatches >= 6 && row.length >= 15) {
          headerRowIndex = i;
          headerRow = row;
          console.log(`✅ Found header row at index ${i} (${keywordMatches} headers, ${row.length} columns)`);
          console.log(`📄 Header row:`, row.slice(0, 15).map(c => String(c || '').substring(0, 25)));
          break;
        }
      }
    }

    if (headerRowIndex === -1 || headerRow.length === 0) {
      console.log(`⚠️ Could not find header row in sheet ${sheetName}`);
      console.log(`📄 First 10 rows for debugging:`);
      for (let i = 0; i < Math.min(10, sheetData.length); i++) {
        const row = sheetData[i] || [];
        console.log(`  Row ${i}:`, row.slice(0, 10).map(c => String(c || '').substring(0, 30)));
      }
      return defaultRun;
    }

    // STEP 2: Find the FIRST DATA ROW (first row with machine number like "IMM-01")
    // Data rows start after headers and contain machine numbers in first column
    // Skip empty spacer rows (row 2, 4 of each 4-row block)
    let dataRowIndex = -1;
    let dataRow: any[] = [];
    
    // Search for rows starting with machine number pattern (IMM-01, IMM-02, etc.)
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 15, sheetData.length); i++) {
      const candidateRow = sheetData[i] || [];
      if (candidateRow.length === 0) continue;
      
      const firstCell = String(candidateRow[0] || '').trim();
      
      // Check if this row starts with a machine number (IMM-01, IMM-1, etc.)
      // Also check if second cell might be empty (since M/c No. and Opt Name are merged)
      const isMachineRow = /^IMM-?\d+/i.test(firstCell);
      
      if (isMachineRow) {
        // This is a data row - first row of a machine's 4-row block
        dataRowIndex = i;
        dataRow = candidateRow;
        console.log(`✅ Found data row at index ${i} (machine: ${firstCell})`);
        console.log(`📄 Data row sample:`, candidateRow.slice(0, 15).map(c => {
          const val = String(c || '');
          return val.length > 20 ? val.substring(0, 20) + '...' : val;
        }));
        break;
      }
    }

    if (dataRowIndex === -1 || dataRow.length === 0) {
      console.log(`⚠️ No data row found after headers in sheet ${sheetName}`);
      console.log(`📄 Checked rows ${headerRowIndex + 1} to ${Math.min(headerRowIndex + 14, sheetData.length - 1)}`);
      console.log(`📄 Sample rows after header:`);
      for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 10, sheetData.length); i++) {
        const row = sheetData[i] || [];
        const firstCell = String(row[0] || '').trim();
        console.log(`  Row ${i}: [0]="${firstCell.substring(0, 20)}" ... (${row.filter(c => c !== null && c !== undefined && c !== '').length} non-empty)`);
      }
      return defaultRun;
    }

    console.log(`📄 Using data row at index ${dataRowIndex} for parsing`);

    // Helper to get column index by header name with fuzzy matching
    // Falls back to fixed column positions if headers not found (based on DPR structure)
    const getColIndex = (headerPatterns: string[]): number => {
      // First, try to find by header name
      for (let i = 0; i < headerRow.length; i++) {
        const cellValue = headerRow[i];
        if (!cellValue) continue;
        const header = String(cellValue).toLowerCase().trim();
        for (const pattern of headerPatterns) {
          const patternLower = pattern.toLowerCase();
          // Exact match or contains pattern
          if (header === patternLower || header.includes(patternLower)) {
            console.log(`✅ Found "${pattern}" at column ${i} (header: "${header}")`);
            return i;
          }
        }
      }
      
      // Fallback: Use fixed column positions based on DPR structure
      // Column mapping: 0=M/c No, 1=Opt Name, 2=Product, 3=Cavity, 4=Trg Cycle, 5=Trg Run Time,
      // 6=Part Wt, 7=Act Part Wt, 8=Act Cycle, 9=Start, 10=End, 11=Target Qty, 12=Actual Qty,
      // 13=Ok Prod Qty, 14=Ok Prod Kgs, 15=Ok Prod %, 16=Rej Kgs, 17=Run Time, 18=Down Time,
      // 19=Reason, 20=Start Time, 21=End Time, 22=Total Time, 23=Mould Change, 24=Remark
      const fixedPositions: Record<string, number> = {
        'product': 2,
        'cavity': 3,
        'trg cycle': 4, 'target cycle': 4, 'trg. cycle': 4,
        'trg run time': 5, 'target run time': 5, 'trg run': 5,
        'part wt': 6, 'part weight': 6, 'part wt.': 6, 'part wt (gm)': 6,
        'act part wt': 7, 'actual part weight': 7, 'act part wt.': 7, 'act part wt (gm)': 7,
        'act cycle': 8, 'actual cycle': 8, 'act cycle (sec)': 8,
        'start time': 9, 'start': 9,
        'end time': 10, 'end': 10,
        'target qty': 11, 'target quantity': 11, 'target qty (nos)': 11,
        'actual qty': 12, 'actual quantity': 12, 'actual qty (nos)': 12,
        'ok prod qty': 13, 'ok production qty': 13, 'ok prod qty (nos)': 13,
        'ok prod (kgs)': 14, 'ok prod': 14, 'ok production (kgs)': 14,
        'ok prod (%)': 15, 'ok prod %': 15, 'ok prod percent': 15,
        'rej (kgs)': 16, 'rej': 16, 'rejection (kgs)': 16,
        'run time (mins)': 17, 'run time': 17, 'run time (minutes)': 17,
        'down time (min)': 18, 'down time': 18, 'downtime': 18,
        'reason': 19, 'stoppage': 19, 'stoppage reason': 19,
        'total time (min)': 22, 'total time': 22,
        'mould change': 23, 'mold change': 23, 'mould': 23,
        'remark': 24, 'remarks': 24
      };
      
      // Try to match pattern to fixed position
      for (const pattern of headerPatterns) {
        const patternLower = pattern.toLowerCase().trim();
        // Check exact match first
        if (fixedPositions.hasOwnProperty(patternLower)) {
          const fixedPos = fixedPositions[patternLower];
          console.log(`✅ Using fixed position ${fixedPos} for "${pattern}" (header not found, using DPR structure fallback)`);
          return fixedPos;
        }
        // Also check if any fixed position key contains this pattern (for partial matches)
        for (const [key, pos] of Object.entries(fixedPositions)) {
          if (key.includes(patternLower) || patternLower.includes(key)) {
            console.log(`✅ Using fixed position ${pos} for "${pattern}" (matched with "${key}", using DPR structure fallback)`);
            return pos;
          }
        }
      }
      
      console.log(`⚠️ Could not find column for patterns: ${headerPatterns.join(', ')} (tried header matching and fixed positions)`);
      console.log(`📊 Available fixed positions:`, Object.keys(fixedPositions).slice(0, 10).join(', '), '...');
      return -1;
    };

    const getValue = (patterns: string[], defaultValue: any = ''): any => {
      const colIndex = getColIndex(patterns);
      if (colIndex < 0) return defaultValue;
      
      // Check the data row first
      let value = dataRow[colIndex];
      
      // If empty, check if this is a merged cell - look at next row (might be in row 2 of the 2-row block)
      // Merged cells like Product, Cavity, etc. span 2 rows, so value might be in row 1
      // But since we're already at row 1, if it's empty, check if it's in row 2 or if it's part of a larger merge
      if ((value === '' || value === null || value === undefined) && dataRowIndex + 1 < sheetData.length) {
        const nextRow = sheetData[dataRowIndex + 1] || [];
        if (nextRow[colIndex] !== undefined && nextRow[colIndex] !== null && nextRow[colIndex] !== '') {
          value = nextRow[colIndex];
          console.log(`📊 Found merged cell value for ${patterns[0]} in next row: ${value}`);
        }
      }
      
      // Return empty string if value is empty, otherwise return the value
      if (value === '' || value === null || value === undefined) {
        return defaultValue;
      }
      
      console.log(`📊 Extracted ${patterns[0]}: "${value}" (type: ${typeof value})`);
      return value;
    };

    const getNumberValue = (patterns: string[], defaultValue: number = 0): number => {
      const value = getValue(patterns, null);
      if (value === null || value === undefined || value === '') {
        return defaultValue;
      }
      
      if (typeof value === 'number') {
        return value;
      }
      
      if (typeof value === 'string') {
        // Remove commas, percentage signs, parentheses for negative numbers
        let cleaned = value.replace(/,/g, '').replace(/%/g, '').trim();
        // Handle values in parentheses (negative)
        if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
          cleaned = '-' + cleaned.slice(1, -1);
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? defaultValue : num;
      }
      
      return defaultValue;
    };

    const parsedData: ProductionRun = {
      product: String(getValue(['product'], '')),
      cavity: getNumberValue(['cavity'], 0),
      targetCycle: getNumberValue(['trg cycle', 'target cycle', 'trg. cycle'], 0),
      targetRunTime: getNumberValue(['trg run time', 'target run time', 'trg run'], 0),
      partWeight: getNumberValue(['part wt', 'part weight', 'part wt.', 'part wt (gm)'], 0),
      actualPartWeight: getNumberValue(['act part wt', 'actual part weight', 'act part wt.', 'act part wt (gm)'], 0),
      actualCycle: getNumberValue(['act cycle', 'actual cycle', 'act cycle (sec)'], 0),
      shotsStart: getNumberValue(['shot start', 'shots start', 'start shot'], 0),
      shotsEnd: getNumberValue(['shot end', 'shots end', 'end shot'], 0),
      targetQty: getNumberValue(['target qty', 'target quantity', 'target qty (nos)'], 0),
      actualQty: getNumberValue(['actual qty', 'actual quantity', 'actual qty (nos)'], 0),
      okProdQty: getNumberValue(['ok prod qty', 'ok production qty', 'ok prod qty (nos)'], 0),
      okProdKgs: getNumberValue(['ok prod (kgs)', 'ok prod', 'ok production (kgs)'], 0),
      okProdPercent: getNumberValue(['ok prod (%)', 'ok prod %', 'ok prod percent'], 0),
      rejKgs: getNumberValue(['rej (kgs)', 'rej', 'rejection (kgs)'], 0),
      lumps: getNumberValue(['lumps', 'lump', 'lumps (nos)'], 0),
      runTime: getNumberValue(['run time (mins)', 'run time', 'run time (minutes)'], 0),
      downTime: getNumberValue(['down time (min)', 'down time', 'downtime'], 0),
      stoppages: [], // Excel import doesn't support multiple stoppages yet
      stoppageReason: String(getValue(['reason', 'stoppage', 'stoppage reason'], '')),
      startTime: String(getValue(['stoppage start time', 'start time'], '')),
      endTime: String(getValue(['stoppage end time', 'end time'], '')),
      totalTime: getNumberValue(['total time (min)', 'total time'], 0),
      mouldChange: String(getValue(['mould change', 'mold change', 'mould'], '')),
      remark: String(getValue(['remark', 'remarks', 'remarks'], '')),
      // Quality Check - Part Weight: If (Part Wt - Act Part Wt) > 0.5, "NOT OK", else "OK"
      partWeightCheck: '' as 'OK' | 'NOT OK' | '',
      // Quality Check - Cycle Time: If (Trg Cycle - Act Cycle) > 0.5, "NOT OK", else "OK"
      cycleTimeCheck: '' as 'OK' | 'NOT OK' | ''
    };

    // Calculate quality checks
    if (parsedData.partWeight > 0 && parsedData.actualPartWeight > 0) {
      const partWeightDiff = Math.abs(parsedData.partWeight - parsedData.actualPartWeight);
      parsedData.partWeightCheck = partWeightDiff > 0.5 ? 'NOT OK' : 'OK';
    }
    if (parsedData.targetCycle > 0 && parsedData.actualCycle > 0) {
      const cycleDiff = Math.abs(parsedData.targetCycle - parsedData.actualCycle);
      parsedData.cycleTimeCheck = cycleDiff > 0.5 ? 'NOT OK' : 'OK';
    }

    console.log(`✅ Parsed data from ${sheetName}:`, {
      product: parsedData.product,
      targetQty: parsedData.targetQty,
      actualQty: parsedData.actualQty,
      okProdQty: parsedData.okProdQty
    });

    return parsedData;
  };

  // Helper function to group and parse machine sheets
  const groupAndParseMachineSheets = (sheetNames: string[], workbook: XLSX.WorkBook): MachineData[] => {
    const machines: MachineData[] = [];
    
    // Group sheets by machine number (1a+1b, 2a+2b, etc.)
    const machineGroups = new Map<number, { a?: string; b?: string }>();
    
    sheetNames.forEach(sheetName => {
      const match = sheetName.match(/^(\d+)([ab])$/i);
      if (match) {
        const machineNum = parseInt(match[1]);
        const type = match[2].toLowerCase() as 'a' | 'b';
        
        if (!machineGroups.has(machineNum)) {
          machineGroups.set(machineNum, {});
        }
        machineGroups.get(machineNum)![type] = sheetName;
      }
    });

    // Parse each machine group (skip machines 9 and 10 as per user's clarification)
    machineGroups.forEach((sheets, machineNum) => {
      // Skip machines 9 and 10
      if (machineNum === 9 || machineNum === 10) {
        console.log(`⚠️ Skipping machine ${machineNum} (machines 9 and 10 are not used)`);
        return;
      }
      
      // For Excel data: machine_no is IMM (machine number), keep as-is, do not convert to line_id
      const machineNo = machineNum < 10 ? `IMM-0${machineNum}` : `IMM-${machineNum}`;
      
      // Parse sheet "a" for current production
      let currentProduction: ProductionRun = {
        product: '',
        cavity: 0,
        targetCycle: 0,
        targetRunTime: 0,
        partWeight: 0,
        actualPartWeight: 0,
        actualCycle: 0,
        shotsStart: 0,
        shotsEnd: 0,
        targetQty: 0,
        actualQty: 0,
        okProdQty: 0,
        okProdKgs: 0,
        okProdPercent: 0,
        rejKgs: 0,
        lumps: 0,
        runTime: 0,
        downTime: 0,
        stoppages: [],
        stoppageReason: '',
        startTime: '',
        endTime: '',
        totalTime: 0,
        mouldChange: '',
        remark: '',
        partWeightCheck: '',
        cycleTimeCheck: ''
      };

      // Parse sheet "b" for changeover
      let changeover: ProductionRun = {
        product: '',
        cavity: 0,
        targetCycle: 0,
        targetRunTime: 0,
        partWeight: 0,
        actualPartWeight: 0,
        actualCycle: 0,
        shotsStart: 0,
        shotsEnd: 0,
        targetQty: 0,
        actualQty: 0,
        okProdQty: 0,
        okProdKgs: 0,
        okProdPercent: 0,
        rejKgs: 0,
        lumps: 0,
        runTime: 0,
        downTime: 0,
        stoppages: [],
        stoppageReason: '',
        startTime: '',
        endTime: '',
        totalTime: 0,
        mouldChange: '',
        remark: '',
        partWeightCheck: '',
        cycleTimeCheck: ''
      };

      let operatorName = '';

      if (sheets.a) {
        console.log(`📄 Processing sheet ${sheets.a} for machine ${machineNum}`);
        const sheetA = workbook.Sheets[sheets.a];
        
        // Read both raw and text versions for better data handling
        const jsonDataARaw = XLSX.utils.sheet_to_json(sheetA, { header: 1, raw: true }) as any[][];
        const jsonDataAText = XLSX.utils.sheet_to_json(sheetA, { header: 1, raw: false }) as any[][];
        
        // Combine both - prefer text for strings, raw for numbers
        // This helps with merged cells - values appear in first cell of merge
        const jsonDataA = jsonDataARaw.map((row, rowIdx) => 
          row.map((cell, colIdx) => {
            // Use text version if available and raw is not a number
            const textCell = jsonDataAText[rowIdx]?.[colIdx];
            if (typeof cell !== 'number' && textCell !== undefined && textCell !== null && textCell !== '') {
              return textCell;
            }
            return cell;
          })
        );
        
        // Also access worksheet directly to handle merged cells better
        // For merged cells, XLSX stores value in top-left cell only
        const fillMergedCells = (data: any[][]): any[][] => {
          const filled = data.map(row => [...row]); // Deep copy
          // Access sheet range to understand merged cells
          const range = XLSX.utils.decode_range(sheetA['!ref'] || 'A1');
          
          // For each row, if a cell is empty but previous row same column has value (might be merged vertically)
          // We'll handle this in getValue function instead for better accuracy
          return filled;
        };
        
        const jsonDataAFilled = fillMergedCells(jsonDataA);
        
        console.log(`📄 Sheet ${sheets.a} data preview:`, jsonDataAFilled.slice(0, 5));
        currentProduction = parseProductionRun(jsonDataAFilled, sheets.a);
        // Extract operator name from sheet
        operatorName = extractOperatorName(jsonDataAFilled) || '';
        console.log(`📄 Extracted operator from ${sheets.a}:`, operatorName);
      }

      if (sheets.b) {
        console.log(`📄 Processing sheet ${sheets.b} for machine ${machineNum}`);
        const sheetB = workbook.Sheets[sheets.b];
        
        // Read both raw and text versions for better data handling
        const jsonDataBRaw = XLSX.utils.sheet_to_json(sheetB, { header: 1, raw: true }) as any[][];
        const jsonDataBText = XLSX.utils.sheet_to_json(sheetB, { header: 1, raw: false }) as any[][];
        
        // Combine both - prefer text for strings, raw for numbers
        // This helps with merged cells - values appear in first cell of merge
        const jsonDataB = jsonDataBRaw.map((row, rowIdx) => 
          row.map((cell, colIdx) => {
            // Use text version if available and raw is not a number
            const textCell = jsonDataBText[rowIdx]?.[colIdx];
            if (typeof cell !== 'number' && textCell !== undefined && textCell !== null && textCell !== '') {
              return textCell;
            }
            return cell;
          })
        );
        
        // Handle merged cells (same approach as sheet A)
        const fillMergedCells = (data: any[][]): any[][] => {
          const filled = data.map(row => [...row]); // Deep copy
          return filled;
        };
        
        const jsonDataBFilled = fillMergedCells(jsonDataB);
        
        console.log(`📄 Sheet ${sheets.b} data preview:`, jsonDataBFilled.slice(0, 5));
        changeover = parseProductionRun(jsonDataBFilled, sheets.b);
        // Use operator name from sheet b if not found in sheet a
        if (!operatorName) {
          operatorName = extractOperatorName(jsonDataBFilled) || '';
          console.log(`📄 Extracted operator from ${sheets.b}:`, operatorName);
        }
      }

      machines.push({
        machineNo,
        operatorName: operatorName || `Operator ${machineNum}`,
        currentProduction,
        changeover
      });
    });

    return machines.sort((a, b) => {
      const numA = parseInt(a.machineNo.replace('IMM-', ''));
      const numB = parseInt(b.machineNo.replace('IMM-', ''));
      return numA - numB;
    });
  };

  // Helper to extract operator name from sheet data
  // Operator name is in "Opt Name" column (usually column 1), merged across 4 rows for each machine
  const extractOperatorName = (sheetData: any[][]): string | null => {
    if (!sheetData || sheetData.length === 0) return null;
    
    // Find header row first
    let headerRowIndex = -1;
    let headerRow: any[] = [];
    
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
      const row = sheetData[i] || [];
      const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
      
      if (rowText.includes('daily production report') || rowText.includes('date:-')) {
        continue;
      }
      
      // Look for row with header keywords
      if (rowText.includes('product') && rowText.includes('opt name') && row.length >= 15) {
        headerRowIndex = i;
        headerRow = row;
        break;
      }
    }
    
    if (headerRowIndex < 0 || headerRow.length === 0) {
      console.log('⚠️ Could not find header row for operator extraction.');
      return null;
    }
    
    // Find "Opt Name" column (usually column index 1)
    const optNameColIndex = headerRow.findIndex((cell: any) => {
      const header = String(cell || '').toLowerCase().trim();
      return header.includes('opt name') || header.includes('operator name');
    });
    
    // If not found, assume it's column 1 (second column after M/c No.)
    const operatorColIndex = optNameColIndex >= 0 ? optNameColIndex : 1;
    
    // Find first data row (machine row starting with IMM-)
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 15, sheetData.length); i++) {
      const row = sheetData[i] || [];
      const firstCell = String(row[0] || '').trim();
      
      if (/^IMM-?\d+/i.test(firstCell)) {
        // Found machine row - operator name should be in column operatorColIndex
        // Since it's merged, it should be in this row (first row of 4-row block)
        let value = row[operatorColIndex];
        
        // If empty, check next row (might be in row 2 due to merging)
        if ((!value || String(value).trim() === '') && i + 1 < sheetData.length) {
          value = sheetData[i + 1]?.[operatorColIndex];
        }
        
        if (value && String(value).trim() !== '') {
          const operatorName = String(value).trim();
          console.log(`✅ Extracted operator name: "${operatorName}" from column ${operatorColIndex}, row ${i}`);
          return operatorName;
        }
      }
    }

    console.log('⚠️ Could not extract operator name - no machine row found or operator name is empty.');
    return null;
  };

  // Get current DPR data for selected date and shift
  const getCurrentDPRData = (): DPRData | null => {
    const found = dprData.find(dpr => {
      // Normalize dates for comparison (handle both YYYY-MM-DD and other formats)
      const dprDate = typeof dpr.date === 'string' ? dpr.date.split('T')[0] : dpr.date;
      const selDate = typeof selectedDate === 'string' ? selectedDate.split('T')[0] : selectedDate;
      return dprDate === selDate && dpr.shift === selectedShift;
    });
    
    if (found) {
      console.log('✅ Found DPR data:', { id: found.id, date: found.date, shift: found.shift });
    } else {
      console.log('⚠️ No DPR data found for:', { date: selectedDate, shift: selectedShift, availableDates: dprData.map(d => ({ id: d.id, date: d.date, shift: d.shift })) });
    }
    
    return found || null;
  };

  // Export to Excel
  const handleExcelExport = () => {
    const currentData = getCurrentDPRData();
    if (!currentData) {
      alert('No data available for the selected date.');
      return;
    }

    // This would generate and download an Excel file
    console.log('Exporting to Excel:', currentData);
    alert('Excel export functionality will be implemented with xlsx library.');
  };

  // Handle column visibility toggle
  const handleColumnVisibilityToggle = (columnId: string) => {
    const newVisibility = {
      ...columnVisibility,
      [columnId]: !columnVisibility[columnId]
    };
    setColumnVisibility(newVisibility);
    saveColumnVisibility(newVisibility);
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    const defaults: Record<string, boolean> = {};
    DPR_COLUMNS.forEach(col => {
      defaults[col.id] = col.defaultVisible;
    });
    setColumnVisibility(defaults);
    saveColumnVisibility(defaults);
    
    // Reset section visibility to defaults
    setSectionVisibility(DEFAULT_SECTION_VISIBILITY);
    saveSectionVisibility(DEFAULT_SECTION_VISIBILITY);
    
    // Reset metrics visibility to defaults
    setShiftTotalMetrics(DEFAULT_SHIFT_TOTAL_METRICS);
    saveShiftTotalMetrics(DEFAULT_SHIFT_TOTAL_METRICS);
    setAchievementMetrics(DEFAULT_ACHIEVEMENT_METRICS);
    saveAchievementMetrics(DEFAULT_ACHIEVEMENT_METRICS);
  };

  // Show all columns
  const handleShowAllColumns = () => {
    const allVisible: Record<string, boolean> = {};
    DPR_COLUMNS.forEach(col => {
      allVisible[col.id] = true;
    });
    setColumnVisibility(allVisible);
    saveColumnVisibility(allVisible);
  };

  // Handle section visibility toggle
  const handleSectionVisibilityToggle = (section: keyof SectionVisibility) => {
    const newVisibility = {
      ...sectionVisibility,
      [section]: !sectionVisibility[section]
    };
    setSectionVisibility(newVisibility);
    saveSectionVisibility(newVisibility);
  };

  // Handle shift total metric visibility toggle
  const handleShiftTotalMetricToggle = (metric: keyof ShiftTotalMetrics) => {
    const newMetrics = {
      ...shiftTotalMetrics,
      [metric]: !shiftTotalMetrics[metric]
    };
    setShiftTotalMetrics(newMetrics);
    saveShiftTotalMetrics(newMetrics);
  };

  // Handle achievement metric visibility toggle
  const handleAchievementMetricToggle = (metric: keyof AchievementMetrics) => {
    const newMetrics = {
      ...achievementMetrics,
      [metric]: !achievementMetrics[metric]
    };
    setAchievementMetrics(newMetrics);
    saveAchievementMetrics(newMetrics);
  };

  // Helper to check if column should be visible based on permissions
  // IMPORTANT: This function should be used for:
  // 1. Viewing past DPR data (current implementation)
  // 2. Manual entry forms for new DPR data (when filling up new data)
  // 3. Excel upload preview/validation for new data (not past data upload which is perfect)
  // When manually entering data: MC number = line number, Product = from product master
  const isColumnVisible = (columnId: string, isFullView: boolean = false): boolean => {
    if (isFullView) return true; // Full view shows all columns
    
    // Column visibility is now controlled purely by:
    // - global defaults,
    // - per-user Admin DPR Column Settings (saved in dpr_user_view_settings),
    // independent of the old DPR category permission flags.
    const isEnabled =
      columnVisibility[columnId] ??
      DPR_COLUMNS.find((c) => c.id === columnId)?.defaultVisible ??
      false;

    return isEnabled;
  };

  // Helper to count visible columns in a group
  const countVisibleColumns = (columnIds: string[]): number => {
    return columnIds.filter(id => isColumnVisible(id)).length;
  };

  // Helper to get clean product name (remove merged product names with "/")
  const getCleanProductName = (productName: string | undefined, isChangeover: boolean = false): string => {
    if (!productName) return '';
    const trimmed = productName.trim();
    
    // If product name contains "/", it's a merged name
    if (trimmed.includes(' / ')) {
      const parts = trimmed.split(' / ');
      // For current production, return only the first part
      // For changeover, return only the second part (if exists)
      if (isChangeover && parts.length > 1) {
        return parts[1].trim();
      }
      return parts[0].trim();
    }
    
    return trimmed;
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Daily Production Report',
      icon: Factory,
      description: 'Daily production report and key metrics'
    },
    {
      id: 'mould-reports',
      label: 'Mould Loading & Unloading',
      icon: Cog,
      description: 'Mould changeover reports and procedures'
    },
    {
      id: 'silo-management',
      label: 'Silo Management',
      icon: Layers,
      description: 'Monitor and manage material inventory in silos'
    },
    {
      id: 'fg-transfer-note',
      label: 'FG Transfer Note',
      icon: FileText,
      description: 'Finished Goods Transfer Note management'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Daily Production Report Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              {/* Header Controls */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="date-picker" className="text-sm font-medium text-gray-700">
                      Select Date:
                    </label>
                    <input
                      id="date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="shift-picker" className="text-sm font-medium text-gray-700">
                      Select Shift:
                    </label>
                    <select
                      id="shift-picker"
                      value={selectedShift}
                      onChange={(e) => setSelectedShift(e.target.value as 'DAY' | 'NIGHT')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DAY">DAY</option>
                      <option value="NIGHT">NIGHT</option>
                    </select>
                  </div>
                  {/* Refresh Button */}
                  <button
                    onClick={() => loadDprData(true)}
                    disabled={isRefreshing}
                    className={`flex items-center justify-center p-2 rounded-md transition-colors ${
                      isRefreshing 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                    title="Refresh DPR Data"
                  >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                  {getCurrentDPRData() && (
                    <div className="text-sm text-gray-600">
                      <span className="ml-4"><strong>Shift Incharge:</strong> {getCurrentDPRData()?.shiftIncharge || 'N/A'}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Add DPR Entry Button - Only show when there's existing data */}
                  {getCurrentDPRData() && (
                  <button
                    onClick={() => {
                      const currentData = getCurrentDPRData();
                      if (currentData && currentData.id) {
                        console.log('✏️ Opening edit form for DPR:', { id: currentData.id, date: currentData.date, shift: currentData.shift });
                        setShowManualEntry(true);
                      } else {
                        console.error('❌ Cannot open edit form: DPR data missing or has no ID', currentData);
                        alert('DPR data is not fully loaded. Please wait a moment and try again.');
                      }
                    }}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    title="Add/Edit DPR Entry"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Edit Entry
                  </button>
                  )}
                  
                  {/* Full View Button - Show for root users OR users with fullView access */}
                  {getCurrentDPRData() && (hasFullViewAccess || isSuperUser) && (
                    <button
                      onClick={() => setShowFullView(true)}
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      title="View Full Report"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Full View
                    </button>
                  )}
                  
                  {/* Post to Stock / Posted - Only show when there's existing DPR data AND it's NOT Excel data */}
                  {getCurrentDPRData() && getCurrentDPRData()?.id && !(getCurrentDPRData() as any)?.is_excel_data && (
                    getCurrentDPRData()?.stock_status === 'POSTED' ? (
                      <span
                        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md gap-2"
                        title="DPR has been posted to stock ledger"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Posted
                      </span>
                    ) : (
                    <button
                      onClick={async () => {
                        const currentData = getCurrentDPRData();
                        if (!currentData || !currentData.id) {
                          alert('No DPR data to post');
                          return;
                        }
                        
                        // Double-check: Don't post Excel data
                        if ((currentData as any).is_excel_data) {
                          alert('Excel/legacy DPR data cannot be posted to stock. It is for reference only.');
                          return;
                        }
                        
                        setIsPostingToStock(true);
                        setStockPostResult(null);
                        
                        try {
                          const response = await fetch(`/api/stock/post/dpr/${currentData.id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ posted_by: user?.email || 'user' })
                          });
                          
                          const result = await response.json();
                          
                          if (result.success) {
                            let message = `✅ Stock posted successfully! (${result.entries_created || 0} entries created)`;
                            if (result.warnings && result.warnings.length > 0) {
                              message += `\n⚠️ Warnings: ${result.warnings.join(', ')}`;
                            }
                            setStockPostResult({ success: true, message });
                            alert(message);
                            loadDprData();
                          } else {
                            const errorMsg = result.error?.message || 'Unknown error';
                            setStockPostResult({ success: false, message: errorMsg });
                            alert(`❌ Stock posting failed: ${errorMsg}`);
                          }
                        } catch (error) {
                          console.error('Error posting to stock:', error);
                          setStockPostResult({ success: false, message: 'Network error' });
                          alert('❌ Error posting to stock. Please try again.');
                        } finally {
                          setIsPostingToStock(false);
                        }
                      }}
                      disabled={isPostingToStock}
                      className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                        isPostingToStock 
                          ? 'bg-orange-400 text-white cursor-not-allowed' 
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                      title="Post DPR to Stock Ledger"
                    >
                      {isPostingToStock ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4 mr-2" />
                      )}
                      {isPostingToStock ? 'Posting...' : 'Post to Stock'}
                    </button>
                    )
                  )}
                  
                  {/* Actions Dropdown Menu - Collapsible for cleaner UI */}
                  <div className="relative actions-dropdown">
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      title="More Actions"
                    >
                      <MoreVertical className="w-4 h-4 mr-2" />
                      Actions
                      <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showActionsMenu && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                        {/* Column Settings */}
                        <button
                          onClick={() => {
                            if (isSuperUser) {
                              setShowSettingsPanel(!showSettingsPanel);
                              setShowActionsMenu(false);
                            } else {
                              alert('Column settings are only available for authorized users.');
                            }
                          }}
                          className={`w-full flex items-center px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                            !isSuperUser ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                          }`}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Column Settings
                        </button>
                        
                        {/* Import Excel */}
                        <button
                          onClick={() => {
                            setShowExcelReader(true);
                            setShowActionsMenu(false);
                          }}
                          className="w-full flex items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Import Excel
                        </button>
                        
                        {/* Export Excel */}
                        <button
                          onClick={() => {
                            handleExcelExport();
                            setShowActionsMenu(false);
                          }}
                          className="w-full flex items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Excel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  DAILY PRODUCTION REPORT (DPR)
                  {(getCurrentDPRData() as any)?.is_excel_data && (
                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      📊 Excel/Reference Data
                    </span>
                  )}
                </h1>
                <div className="text-lg text-gray-600">
                  <strong>DATE:</strong> {new Date(selectedDate).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })} | <strong>SHIFT:</strong> {selectedShift}
                  {(getCurrentDPRData() as any)?.is_excel_data && (
                    <span className="ml-2 text-sm text-amber-600">(Cannot be posted to stock)</span>
                  )}
                </div>
              </div>

              {/* Main DPR Table */}
              {getCurrentDPRData() ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-xs">
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-gray-100">
                      {isColumnVisible('machineNo') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">M/c No.</th>}
                      {isColumnVisible('operatorName') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Opt Name</th>}
                      {isColumnVisible('product') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Product</th>}
                      {isColumnVisible('cavity') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Cavity</th>}
                      {isColumnVisible('targetCycle') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Trg Cycle (sec)</th>}
                      {isColumnVisible('targetRunTime') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Trg Run Time (min)</th>}
                      {isColumnVisible('partWeight') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Part Wt (gm)</th>}
                      {isColumnVisible('actualPartWeight') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Act part wt (gm)</th>}
                      {isColumnVisible('actualCycle') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Act Cycle (sec)</th>}
                      {isColumnVisible('partWeightCheck') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Part Wt Check</th>}
                      {isColumnVisible('cycleTimeCheck') && <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Cycle Time Check</th>}
                      {(() => {
                        const shotsCount = countVisibleColumns(['shotsStart', 'shotsEnd']);
                        return shotsCount > 0 && (
                          <th colSpan={shotsCount} className="border border-gray-300 p-2 text-center font-bold">No of Shots</th>
                        );
                      })()}
                      {(() => {
                        const productionCount = countVisibleColumns(['targetQty', 'actualQty', 'okProdQty', 'okProdKgs', 'okProdPercent', 'rejKgs']);
                        return productionCount > 0 && (
                          <th colSpan={productionCount} className="border border-gray-300 p-2 text-center font-bold">Production Data</th>
                        );
                      })()}
                      {(() => {
                        const runtimeCount = countVisibleColumns(['runTime', 'downTime']);
                        return runtimeCount > 0 && (
                          <th colSpan={runtimeCount} className="border border-gray-300 p-2 text-center font-bold">Run Time</th>
                        );
                      })()}
                      {(() => {
                        const stoppageCount = countVisibleColumns(['stoppageReason', 'startTime', 'endTime', 'totalTime', 'mouldChange', 'remark']);
                        return stoppageCount > 0 && (
                          <th colSpan={stoppageCount} className="border border-gray-300 p-2 text-center font-bold">Stoppage Time and Remarks</th>
                        );
                      })()}
                    </tr>
                    <tr className="bg-gray-100">
                      {isColumnVisible('shotsStart') && <th className="border border-gray-300 p-1 text-center font-bold">Start</th>}
                      {isColumnVisible('shotsEnd') && <th className="border border-gray-300 p-1 text-center font-bold">End</th>}
                      {isColumnVisible('targetQty') && <th className="border border-gray-300 p-1 text-center font-bold">Target Qty (Nos)</th>}
                      {isColumnVisible('actualQty') && <th className="border border-gray-300 p-1 text-center font-bold">Actual Qty (Nos)</th>}
                      {isColumnVisible('okProdQty') && <th className="border border-gray-300 p-1 text-center font-bold">Ok Prod Qty (Nos)</th>}
                      {isColumnVisible('okProdKgs') && <th className="border border-gray-300 p-1 text-center font-bold">Ok Prod (Kgs)</th>}
                      {isColumnVisible('okProdPercent') && <th className="border border-gray-300 p-1 text-center font-bold">Ok Prod (%)</th>}
                      {isColumnVisible('rejKgs') && <th className="border border-gray-300 p-1 text-center font-bold">Rej (Kgs)</th>}
                      {isColumnVisible('runTime') && <th className="border border-gray-300 p-1 text-center font-bold">Run Time (mins)</th>}
                      {isColumnVisible('downTime') && <th className="border border-gray-300 p-1 text-center font-bold">Down time (min)</th>}
                      {isColumnVisible('stoppageReason') && <th className="border border-gray-300 p-1 text-center font-bold">Reason</th>}
                      {isColumnVisible('startTime') && <th className="border border-gray-300 p-1 text-center font-bold">Start Time</th>}
                      {isColumnVisible('endTime') && <th className="border border-gray-300 p-1 text-center font-bold">End Time</th>}
                      {isColumnVisible('totalTime') && <th className="border border-gray-300 p-1 text-center font-bold">Total Time (min)</th>}
                      {isColumnVisible('mouldChange') && <th className="border border-gray-300 p-1 text-center font-bold">Mould change</th>}
                      {isColumnVisible('remark') && <th className="border border-gray-300 p-1 text-center font-bold">REMARK</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentDPRData()?.machines.map((machine, index) => {
                      // Check if there's a REAL changeover - only show changeover rows (3-4) if:
                      // 1. The changeover.product exists AND is DIFFERENT from currentProduction.product
                      // 2. AND there's actual changeover data (quantities, times, etc.)
                      // This means a different mold/product was run after the initial one
                      const currentProduct = machine.currentProduction.product?.trim() || '';
                      const changeoverProduct = machine.changeover.product?.trim() || '';
                      
                      // Check if product is different
                      const hasDifferentProduct = changeoverProduct !== '' && 
                                                  changeoverProduct !== currentProduct;
                      
                      // Check if there's actual changeover data (not just empty/default values)
                      const hasChangeoverData = machine.changeover.targetQty > 0 || 
                                                machine.changeover.actualQty > 0 || 
                                                machine.changeover.okProdQty > 0 ||
                                                machine.changeover.runTime > 0 ||
                                                (machine.changeover.stoppageReason && machine.changeover.stoppageReason.trim() !== '') ||
                                                (machine.changeover.mouldChange && machine.changeover.mouldChange.trim() !== '') ||
                                                (machine.changeover.remark && machine.changeover.remark.trim() !== '');
                      
                      // Changeover exists ONLY if product is different AND there's actual data
                      // Don't show changeover rows if product is same, empty, or no data exists
                      const hasChangeover = hasDifferentProduct && hasChangeoverData;
                      
                      return (
                        <React.Fragment key={`${machine.machineNo}-${machine.currentProduction.product || 'current'}`}>
                          {/* Row 1: Current Production */}
                          <tr>
                            {isColumnVisible('machineNo') && (
                            <td rowSpan={hasChangeover ? 2 : 1} className="border border-gray-300 p-2 text-center font-bold bg-blue-50">
                              {machine.machineNo}
                            </td>
                            )}
                            {isColumnVisible('operatorName') && (
                            <td rowSpan={hasChangeover ? 2 : 1} className="border border-gray-300 p-2 text-center">
                              {machine.operatorName}
                            </td>
                            )}
                            {isColumnVisible('product') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {getCleanProductName(machine.currentProduction.product, false)}
                            </td>
                            )}
                            {isColumnVisible('cavity') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.cavity.toFixed(2)}
                            </td>
                            )}
                            {isColumnVisible('targetCycle') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetCycle.toFixed(2)}
                            </td>
                            )}
                            {isColumnVisible('targetRunTime') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetRunTime.toFixed(2)}
                            </td>
                            )}
                            {isColumnVisible('partWeight') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.partWeight.toFixed(2)}
                            </td>
                            )}
                            {isColumnVisible('actualPartWeight') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.actualPartWeight.toFixed(2)}
                            </td>
                            )}
                            {isColumnVisible('actualCycle') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.actualCycle.toFixed(2)}
                            </td>
                            )}
                            {isColumnVisible('partWeightCheck') && (
                            <td className={`border border-gray-300 p-2 text-center font-medium ${
                              machine.currentProduction.partWeightCheck === 'OK' ? 'text-green-600 bg-green-50' : 
                              machine.currentProduction.partWeightCheck === 'NOT OK' ? 'text-red-600 bg-red-50' : ''
                            }`}>
                              {machine.currentProduction.partWeightCheck || '-'}
                            </td>
                            )}
                            {isColumnVisible('cycleTimeCheck') && (
                            <td className={`border border-gray-300 p-2 text-center font-medium ${
                              machine.currentProduction.cycleTimeCheck === 'OK' ? 'text-green-600 bg-green-50' : 
                              machine.currentProduction.cycleTimeCheck === 'NOT OK' ? 'text-red-600 bg-red-50' : ''
                            }`}>
                              {machine.currentProduction.cycleTimeCheck || '-'}
                            </td>
                            )}
                            {isColumnVisible('shotsStart') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.shotsStart > 0
                                ? machine.currentProduction.shotsStart.toLocaleString()
                                : ''}
                            </td>
                            )}
                            {isColumnVisible('shotsEnd') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.shotsEnd > 0
                                ? machine.currentProduction.shotsEnd.toLocaleString()
                                : ''}
                            </td>
                            )}
                            {isColumnVisible('targetQty') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetQty % 1 === 0 
                                ? machine.currentProduction.targetQty.toLocaleString() 
                                : machine.currentProduction.targetQty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                            </td>
                            )}
                            {isColumnVisible('actualQty') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {Math.round(machine.currentProduction.actualQty).toLocaleString()}
                            </td>
                            )}
                            {isColumnVisible('okProdQty') && (
                            <td className="border border-gray-300 p-2 text-center bg-yellow-200 font-bold">
                              {Math.round(machine.currentProduction.okProdQty).toLocaleString()}
                            </td>
                            )}
                            {isColumnVisible('okProdKgs') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.okProdKgs.toFixed(2)}
                            </td>
                            )}
                            {isColumnVisible('okProdPercent') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetQty > 0 
                                ? Math.round((machine.currentProduction.okProdQty / machine.currentProduction.targetQty) * 100)
                                : Math.round(machine.currentProduction.okProdPercent)}%
                            </td>
                            )}
                            {isColumnVisible('rejKgs') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.rejKgs.toFixed(2)}
                            </td>
                            )}
                            {isColumnVisible('runTime') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {Math.round(machine.currentProduction.runTime)}
                            </td>
                            )}
                            {isColumnVisible('downTime') && (
                            <td className="border border-gray-300 p-2 text-center">
                              ({machine.currentProduction.downTime > 0 ? machine.currentProduction.downTime.toFixed(2) : '0.00'})
                            </td>
                            )}
                            {isColumnVisible('stoppageReason') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.stoppageReason}
                            </td>
                            )}
                            {isColumnVisible('startTime') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.startTime || ''}
                            </td>
                            )}
                            {isColumnVisible('endTime') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.endTime || ''}
                            </td>
                            )}
                            {isColumnVisible('totalTime') && (
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.totalTime > 0 ? Math.round(machine.currentProduction.totalTime).toFixed(2) : ''}
                            </td>
                            )}
                            {isColumnVisible('mouldChange') && (
                            <td className={`border border-gray-300 p-2 text-center ${machine.currentProduction.mouldChange ? 'bg-green-200' : ''}`}>
                              {machine.currentProduction.mouldChange}
                            </td>
                            )}
                            {isColumnVisible('remark') && (
                            <td className={`border border-gray-300 p-2 text-center ${machine.currentProduction.remark ? 'bg-green-200' : ''}`}>
                              {machine.currentProduction.remark}
                            </td>
                            )}
                          </tr>
                          {/* Changeover - Show if there's any changeover data */}
                          {hasChangeover && (
                            <>
                              {/* Changeover Row */}
                              <tr>
                                {isColumnVisible('product') && (
                                <td className="border border-gray-300 p-2 text-center bg-orange-50">
                                  {getCleanProductName(machine.changeover.product, true) || machine.changeover.product}
                                </td>
                                )}
                                {isColumnVisible('cavity') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.cavity.toFixed(2)}
                                </td>
                                )}
                                {isColumnVisible('targetCycle') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.targetCycle.toFixed(2)}
                                </td>
                                )}
                                {isColumnVisible('targetRunTime') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.targetRunTime.toFixed(2)}
                                </td>
                                )}
                                {isColumnVisible('partWeight') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.partWeight.toFixed(2)}
                                </td>
                                )}
                                {isColumnVisible('actualPartWeight') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.actualPartWeight.toFixed(2)}
                                </td>
                                )}
                                {isColumnVisible('actualCycle') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.actualCycle.toFixed(2)}
                                </td>
                                )}
                                {isColumnVisible('partWeightCheck') && (
                                <td className={`border border-gray-300 p-2 text-center font-medium ${
                                  machine.changeover.partWeightCheck === 'OK' ? 'text-green-600 bg-green-50' : 
                                  machine.changeover.partWeightCheck === 'NOT OK' ? 'text-red-600 bg-red-50' : ''
                                }`}>
                                  {machine.changeover.partWeightCheck || '-'}
                                </td>
                                )}
                                {isColumnVisible('cycleTimeCheck') && (
                                <td className={`border border-gray-300 p-2 text-center font-medium ${
                                  machine.changeover.cycleTimeCheck === 'OK' ? 'text-green-600 bg-green-50' : 
                                  machine.changeover.cycleTimeCheck === 'NOT OK' ? 'text-red-600 bg-red-50' : ''
                                }`}>
                                  {machine.changeover.cycleTimeCheck || '-'}
                                </td>
                                )}
                                {isColumnVisible('shotsStart') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.shotsStart > 0
                                    ? machine.changeover.shotsStart.toLocaleString()
                                    : ''}
                                </td>
                                )}
                                {isColumnVisible('shotsEnd') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.shotsEnd > 0
                                    ? machine.changeover.shotsEnd.toLocaleString()
                                    : ''}
                                </td>
                                )}
                                {isColumnVisible('targetQty') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.targetQty % 1 === 0 
                                    ? machine.changeover.targetQty.toLocaleString() 
                                    : machine.changeover.targetQty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                </td>
                                )}
                                {isColumnVisible('actualQty') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {Math.round(machine.changeover.actualQty).toLocaleString()}
                                </td>
                                )}
                                {isColumnVisible('okProdQty') && (
                                <td className="border border-gray-300 p-2 text-center bg-yellow-200 font-bold">
                                  {Math.round(machine.changeover.okProdQty).toLocaleString()}
                                </td>
                                )}
                                {isColumnVisible('okProdKgs') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.okProdKgs.toFixed(2)}
                                </td>
                                )}
                                {isColumnVisible('okProdPercent') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.targetQty > 0 
                                    ? Math.round((machine.changeover.okProdQty / machine.changeover.targetQty) * 100)
                                    : Math.round(machine.changeover.okProdPercent)}%
                                </td>
                                )}
                                {isColumnVisible('rejKgs') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.rejKgs.toFixed(2)}
                                </td>
                                )}
                                {isColumnVisible('runTime') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {Math.round(machine.changeover.runTime)}
                                </td>
                                )}
                                {isColumnVisible('downTime') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  ({machine.changeover.downTime > 0 ? machine.changeover.downTime.toFixed(2) : '0.00'})
                                </td>
                                )}
                                {isColumnVisible('stoppageReason') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.stoppageReason}
                                </td>
                                )}
                                {isColumnVisible('startTime') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.startTime || ''}
                                </td>
                                )}
                                {isColumnVisible('endTime') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.endTime || ''}
                                </td>
                                )}
                                {isColumnVisible('totalTime') && (
                                <td className="border border-gray-300 p-2 text-center">
                                  {machine.changeover.totalTime > 0 ? Math.round(machine.changeover.totalTime).toFixed(2) : ''}
                                </td>
                                )}
                                {isColumnVisible('mouldChange') && (
                                <td className={`border border-gray-300 p-2 text-center ${machine.changeover.mouldChange ? 'bg-green-200' : ''}`}>
                                  {machine.changeover.mouldChange}
                                </td>
                                )}
                                {isColumnVisible('remark') && (
                                <td className={`border border-gray-300 p-2 text-center ${machine.changeover.remark ? 'bg-green-200' : ''}`}>
                                  {machine.changeover.remark}
                                </td>
                                )}
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-600 mb-4">
                    No DPR data found for <strong>{new Date(selectedDate).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}</strong> - <strong>{selectedShift}</strong> shift
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Please import an Excel file or create a new DPR entry manually.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        // For new entries, ensure we're not passing existing data
                        console.log('➕ Opening form to create NEW DPR entry');
                        setShowManualEntry(true);
                      }}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New DPR Entry
                    </button>
                    <button
                      onClick={() => setShowExcelReader(true)}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import Excel
                    </button>
                  </div>
                </div>
              )}

              {/* Shift Total Section - Enhanced */}
              {sectionVisibility.shiftTotal && (() => {
                const currentData = getCurrentDPRData();
                if (!currentData) return null;
                
                // Count visible metrics to determine layout
                const visibleCount = [
                  shiftTotalMetrics.targetQty,
                  shiftTotalMetrics.actualQty,
                  shiftTotalMetrics.okProdQty,
                  shiftTotalMetrics.okProdKgs,
                  shiftTotalMetrics.okProdPercent,
                  shiftTotalMetrics.rejKgs,
                  shiftTotalMetrics.lumps,
                  shiftTotalMetrics.runTime,
                  shiftTotalMetrics.downTime,
                  shiftTotalMetrics.totalTime
                ].filter(Boolean).length;
                
                // Dynamic grid columns based on visible count
                const gridCols = visibleCount <= 2 ? 'grid-cols-1 sm:grid-cols-2' :
                                 visibleCount <= 4 ? 'grid-cols-2 lg:grid-cols-4' :
                                 visibleCount <= 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' :
                                 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5';
                
                return (
              <div className="mt-8 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-6 rounded-xl border-2 border-slate-300 shadow-xl">
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-blue-600 p-2 rounded-lg mr-3">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">SHIFT TOTAL</h3>
                </div>
                
                {/* Dynamic Metrics Grid */}
                <div className={`grid ${gridCols} gap-4`}>
                  {/* Target Quantity */}
                  {shiftTotalMetrics.targetQty && (
                  <div className="bg-white p-5 rounded-xl border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Target className="w-5 h-5 text-blue-600" />
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">TARGET</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 font-medium">Target Qty (Nos)</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.summary.targetQty.toLocaleString()}</p>
                  </div>
                  )}

                  {/* Actual Quantity */}
                  {shiftTotalMetrics.actualQty && (
                  <div className="bg-white p-5 rounded-xl border-2 border-purple-200 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="w-5 h-5 text-purple-600" />
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">ACTUAL</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 font-medium">Actual Qty (Nos)</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.summary.actualQty.toLocaleString()}</p>
                    <div className="mt-3 flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min((currentData.summary.actualQty / currentData.summary.targetQty * 100), 100)}%` }}></div>
                      </div>
                      <span className="text-sm font-bold text-purple-600">{currentData.summary.targetQty > 0 ? Math.round(currentData.summary.actualQty / currentData.summary.targetQty * 100) : 0}%</span>
                    </div>
                  </div>
                  )}

                  {/* OK Production Quantity - Highlighted */}
                  {shiftTotalMetrics.okProdQty && (
                  <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-5 rounded-xl border-2 border-yellow-400 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Award className="w-5 h-5 text-yellow-700" />
                      <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-bold">KEY METRIC</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 font-medium">Ok Prod Qty (Nos)</p>
                    <p className="text-3xl font-bold text-yellow-900">{currentData.summary.okProdQty.toLocaleString()}</p>
                    <div className="mt-3 flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-gray-700 font-medium">{currentData.summary.actualQty > 0 ? Math.round(currentData.summary.okProdQty / currentData.summary.actualQty * 100 * 10) / 10 : 0}% of Actual</span>
                    </div>
                  </div>
                  )}

                  {/* OK Production in Kgs */}
                  {shiftTotalMetrics.okProdKgs && (
                  <div className="bg-white p-5 rounded-xl border-2 border-green-200 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Package className="w-5 h-5 text-green-600" />
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">WEIGHT</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 font-medium">Ok Prod (Kgs)</p>
                    <p className="text-3xl font-bold text-gray-900">{currentData.summary.okProdKgs.toFixed(2)}</p>
                  </div>
                  )}

                  {/* OK Production Percentage */}
                  {shiftTotalMetrics.okProdPercent && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl border-2 border-green-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-3">
                      <Zap className="w-5 h-5 text-green-600 mr-2" />
                      <p className="text-sm text-gray-700 font-semibold">Ok Prod (%)</p>
                    </div>
                    <p className="text-3xl font-bold text-green-700">{currentData.summary.okProdPercent.toFixed(1)}%</p>
                    <div className="mt-3 bg-green-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(currentData.summary.okProdPercent, 100)}%` }}></div>
                    </div>
                  </div>
                  )}

                  {/* Rejection */}
                  {shiftTotalMetrics.rejKgs && (
                  <div className="bg-gradient-to-br from-red-50 to-rose-100 p-5 rounded-xl border-2 border-red-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                      <p className="text-sm text-gray-700 font-semibold">Rej (Kgs)</p>
                    </div>
                    <p className="text-3xl font-bold text-red-700">{currentData.summary.rejKgs.toFixed(2)}</p>
                    <p className="text-sm text-gray-600 mt-2">{currentData.summary.okProdKgs > 0 ? (currentData.summary.rejKgs / currentData.summary.okProdKgs * 100).toFixed(1) : 0}% rejection rate</p>
                  </div>
                  )}

                  {/* Lumps */}
                  {shiftTotalMetrics.lumps && currentData.shiftTotal?.lumps !== undefined && (
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-100 p-5 rounded-xl border-2 border-yellow-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-3">
                      <Package className="w-5 h-5 text-yellow-600 mr-2" />
                      <p className="text-sm text-gray-700 font-semibold">Lumps (Kgs)</p>
                    </div>
                    <p className="text-3xl font-bold text-yellow-700">{currentData.shiftTotal.lumps.toFixed(2)}</p>
                  </div>
                  )}

                  {/* Run Time */}
                  {shiftTotalMetrics.runTime && (
                  <div className="bg-gradient-to-br from-blue-50 to-sky-100 p-5 rounded-xl border-2 border-blue-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-3">
                      <Clock className="w-5 h-5 text-blue-600 mr-2" />
                      <p className="text-sm text-gray-700 font-semibold">Run Time (mins)</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-700">{currentData.summary.runTime.toLocaleString()}</p>
                    <p className="text-sm text-gray-600 mt-2">≈ {(currentData.summary.runTime / 60).toFixed(1)} hours</p>
                  </div>
                  )}

                  {/* Down Time */}
                  {shiftTotalMetrics.downTime && (
                  <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-5 rounded-xl border-2 border-orange-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                      <p className="text-sm text-gray-700 font-semibold">Down Time (min)</p>
                    </div>
                    <p className="text-3xl font-bold text-orange-700">{currentData.summary.downTime.toFixed(0)}</p>
                    <p className="text-sm text-gray-600 mt-2">≈ {(currentData.summary.downTime / 60).toFixed(1)} hours</p>
                  </div>
                  )}

                  {/* Total Time */}
                  {shiftTotalMetrics.totalTime && (
                  <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-5 rounded-xl border-2 border-purple-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-3">
                      <Clock className="w-5 h-5 text-purple-600 mr-2" />
                      <p className="text-sm text-gray-700 font-semibold">Stoppage Time (min)</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-700">{currentData.shiftTotal?.totalTime ? currentData.shiftTotal.totalTime.toFixed(0) : '0'}</p>
                  </div>
                  )}
                </div>
              </div>
                );
              })()}

              {/* Achievement Section - Enhanced */}
              {sectionVisibility.achievementMetrics && (() => {
                const currentData = getCurrentDPRData();
                if (!currentData) return null;
                
                // Count visible achievement metrics
                const visibleAchievementCount = [
                  achievementMetrics.actualVsTarget,
                  achievementMetrics.rejVsOkProd,
                  achievementMetrics.runTimeVsTotal,
                  achievementMetrics.downTimeVsTotal
                ].filter(Boolean).length;
                
                // Dynamic grid columns based on visible count
                const achievementGridCols = visibleAchievementCount <= 2 ? 'grid-cols-1 sm:grid-cols-2' :
                                            visibleAchievementCount <= 3 ? 'grid-cols-1 sm:grid-cols-3' :
                                            'grid-cols-2 lg:grid-cols-4';
                
                // Calculate totals safely
                const totalTime = currentData.summary.runTime + currentData.summary.downTime;
                const runTimePercent = totalTime > 0 ? Math.round(currentData.summary.runTime / totalTime * 100) : 0;
                const downTimePercent = totalTime > 0 ? Math.round(currentData.summary.downTime / totalTime * 100) : 0;
                const rejPercent = currentData.summary.okProdKgs > 0 ? (currentData.summary.rejKgs / currentData.summary.okProdKgs * 100).toFixed(1) : '0.0';
                
                return (
              <div className="mt-6 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-400 shadow-xl">
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-indigo-600 p-2 rounded-lg mr-3">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">ACHIEVEMENT METRICS</h3>
                </div>
                
                <div className={`grid ${achievementGridCols} gap-4`}>
                  {/* Actual vs Target */}
                  {achievementMetrics.actualVsTarget && (
                  <div className="bg-white p-5 rounded-xl border-2 border-green-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Target className="w-5 h-5 text-green-600" />
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">PERFORMANCE</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">Actual vs Target</p>
                    {currentData.shiftTotal && currentData.shiftTotal.targetQty > 0 ? (
                      <>
                        <p className="text-4xl font-bold text-green-600 mb-3">{Math.round((currentData.shiftTotal.okProdQty / currentData.shiftTotal.targetQty) * 100)}%</p>
                        <div className="bg-gray-200 rounded-full h-3">
                          <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all" style={{ width: `${Math.min(Math.round((currentData.shiftTotal.okProdQty / currentData.shiftTotal.targetQty) * 100), 100)}%` }}></div>
                        </div>
                      </>
                    ) : (
                      <p className="text-2xl text-gray-400">-</p>
                    )}
                  </div>
                  )}

                  {/* Rejection vs OK Production */}
                  {achievementMetrics.rejVsOkProd && (
                  <div className="bg-white p-5 rounded-xl border-2 border-red-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">QUALITY</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">Rej vs Ok Prod</p>
                    <p className="text-4xl font-bold text-red-600 mb-3">{rejPercent}%</p>
                    <div className="bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all" style={{ width: `${Math.min(parseFloat(rejPercent), 100)}%` }}></div>
                    </div>
                  </div>
                  )}

                  {/* Run Time vs Total */}
                  {achievementMetrics.runTimeVsTotal && (
                  <div className="bg-white p-5 rounded-xl border-2 border-blue-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">EFFICIENCY</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">Run Time vs Total</p>
                    <p className="text-4xl font-bold text-blue-600 mb-3">{runTimePercent}%</p>
                    <div className="bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all" style={{ width: `${runTimePercent}%` }}></div>
                    </div>
                  </div>
                  )}

                  {/* Down Time vs Total */}
                  {achievementMetrics.downTimeVsTotal && (
                  <div className="bg-white p-5 rounded-xl border-2 border-orange-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">DOWNTIME</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">Down Time vs Total</p>
                    <p className="text-4xl font-bold text-orange-600 mb-3">{downTimePercent}%</p>
                    <div className="bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all" style={{ width: `${downTimePercent}%` }}></div>
                    </div>
                  </div>
                  )}
                </div>
              </div>
                );
              })()}
            </div>
          </div>
        );

      case 'mould-reports':
        return <MouldLoadingUnloadingReport />;

      case 'silo-management':
        return <SiloManagement />;

      case 'fg-transfer-note':
        return (
          <div className="space-y-6">
            <FGNForm />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Collapse sidebar when sub nav tab is clicked
                  if (onSubNavClick) {
                    onSubNavClick();
                  }
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="w-5 h-5 inline mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-auto p-6 transition-all duration-300 ${showSettingsPanel && isSuperUser ? 'pr-[340px]' : ''}`}>
        {renderTabContent()}
      </div>

      {/* Column Settings Panel (Super User Only) */}
      {isSuperUser && showSettingsPanel && (
        <div className="fixed right-0 top-[57px] h-[calc(100vh-57px)] w-80 bg-white shadow-2xl z-40 border-l border-gray-300 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Column Settings
              </h3>
              <button
                onClick={() => setShowSettingsPanel(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleResetToDefaults}
                className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleShowAllColumns}
                className="flex-1 px-3 py-2 text-sm bg-blue-200 text-blue-700 rounded-md hover:bg-blue-300 transition-colors"
              >
                Show All
              </button>
            </div>
          </div>
          
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Select which columns to display in the first glance view. Full view always shows all columns.
            </p>
            
            {/* Summary Sections */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Summary Sections</h4>
              <div className="space-y-2">
                <label className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionVisibility.shiftTotal}
                    onChange={() => handleSectionVisibilityToggle('shiftTotal')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 font-medium">SHIFT TOTAL</span>
                </label>
                {sectionVisibility.shiftTotal && (
                  <div className="ml-7 mt-2 space-y-1.5">
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.targetQty}
                        onChange={() => handleShiftTotalMetricToggle('targetQty')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Target Qty (Nos)</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.actualQty}
                        onChange={() => handleShiftTotalMetricToggle('actualQty')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Actual Qty (Nos)</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.okProdQty}
                        onChange={() => handleShiftTotalMetricToggle('okProdQty')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Ok Prod Qty (Nos)</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.okProdKgs}
                        onChange={() => handleShiftTotalMetricToggle('okProdKgs')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Ok Prod (Kgs)</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.okProdPercent}
                        onChange={() => handleShiftTotalMetricToggle('okProdPercent')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Ok Prod (%)</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.rejKgs}
                        onChange={() => handleShiftTotalMetricToggle('rejKgs')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Rej (Kgs)</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.lumps}
                        onChange={() => handleShiftTotalMetricToggle('lumps')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Lumps (Kgs)</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.runTime}
                        onChange={() => handleShiftTotalMetricToggle('runTime')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Run Time (mins)</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.downTime}
                        onChange={() => handleShiftTotalMetricToggle('downTime')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Down Time (min)</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftTotalMetrics.totalTime}
                        onChange={() => handleShiftTotalMetricToggle('totalTime')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Total Time (min)</span>
                    </label>
                  </div>
                )}
                <label className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionVisibility.achievementMetrics}
                    onChange={() => handleSectionVisibilityToggle('achievementMetrics')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 font-medium">ACHIEVEMENT METRICS</span>
                </label>
                {sectionVisibility.achievementMetrics && (
                  <div className="ml-7 mt-2 space-y-1.5">
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={achievementMetrics.actualVsTarget}
                        onChange={() => handleAchievementMetricToggle('actualVsTarget')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Actual vs Target</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={achievementMetrics.rejVsOkProd}
                        onChange={() => handleAchievementMetricToggle('rejVsOkProd')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Rej vs Ok Prod</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={achievementMetrics.runTimeVsTotal}
                        onChange={() => handleAchievementMetricToggle('runTimeVsTotal')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Run Time vs Total</span>
                    </label>
                    <label className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={achievementMetrics.downTimeVsTotal}
                        onChange={() => handleAchievementMetricToggle('downTimeVsTotal')}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs text-gray-600">Down Time vs Total</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            {/* Column Categories */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Table Columns</h4>
            </div>
            
            {['basic', 'process', 'shots', 'production', 'runtime', 'stoppage'].map((category) => (
              <div key={category} className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {category === 'basic' ? 'Basic Info' :
                   category === 'process' ? 'Process Parameters' :
                   category === 'shots' ? 'No of Shots' :
                   category === 'production' ? 'Production Data' :
                   category === 'runtime' ? 'Run Time' :
                   'Stoppage Time and Remarks'}
                </h4>
                <div className="space-y-2">
                  {DPR_COLUMNS.filter(col => col.category === category).map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={columnVisibility[column.id] ?? column.defaultVisible}
                        onChange={() => handleColumnVisibilityToggle(column.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full View Modal */}
      {showFullView && getCurrentDPRData() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Full DPR View</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(selectedDate).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })} | {selectedShift} Shift
                </p>
              </div>
              <button
                onClick={() => setShowFullView(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {/* Full View Table - Shows All Columns */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-gray-100">
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">M/c No.</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Opt Name</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Product</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Cavity</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Trg Cycle (sec)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Trg Run Time (min)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Part Wt (gm)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Act part wt (gm)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center font-bold">Act Cycle (sec)</th>
                      <th colSpan={2} className="border border-gray-300 p-2 text-center font-bold">No of Shots</th>
                      <th colSpan={6} className="border border-gray-300 p-2 text-center font-bold">Production Data</th>
                      <th colSpan={2} className="border border-gray-300 p-2 text-center font-bold">Run Time</th>
                      <th colSpan={5} className="border border-gray-300 p-2 text-center font-bold">Stoppage Time and Remarks</th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-1 text-center font-bold">Start</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">End</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Target Qty (Nos)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Actual Qty (Nos)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Ok Prod Qty (Nos)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Ok Prod (Kgs)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Ok Prod (%)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Rej (Kgs)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Run Time (mins)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Down time (min)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Reason</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Start Time</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">End Time</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Total Time (min)</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">Mould change</th>
                      <th className="border border-gray-300 p-1 text-center font-bold">REMARK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentDPRData()?.machines.map((machine) => {
                      const currentProduct = machine.currentProduction.product?.trim() || '';
                      const changeoverProduct = machine.changeover.product?.trim() || '';
                      const hasDifferentProduct = changeoverProduct !== '' && changeoverProduct !== currentProduct;
                      const hasChangeoverData = machine.changeover.targetQty > 0 || 
                                                machine.changeover.actualQty > 0 || 
                                                machine.changeover.okProdQty > 0 ||
                                                machine.changeover.runTime > 0 ||
                                                (machine.changeover.stoppageReason && machine.changeover.stoppageReason.trim() !== '') ||
                                                (machine.changeover.mouldChange && machine.changeover.mouldChange.trim() !== '') ||
                                                (machine.changeover.remark && machine.changeover.remark.trim() !== '');
                      const hasChangeover = hasDifferentProduct && hasChangeoverData;
                      
                      return (
                        <React.Fragment key={`${machine.machineNo}-${machine.currentProduction.product || 'current'}`}>
                          <tr>
                            <td rowSpan={hasChangeover ? 2 : 1} className="border border-gray-300 p-2 text-center font-bold bg-blue-50">
                              {machine.machineNo}
                            </td>
                            <td rowSpan={hasChangeover ? 2 : 1} className="border border-gray-300 p-2 text-center">
                              {machine.operatorName}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">{getCleanProductName(machine.currentProduction.product, false)}</td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.cavity.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.targetCycle.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.targetRunTime.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.partWeight.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.actualPartWeight.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.actualCycle.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.shotsStart > 0 ? machine.currentProduction.shotsStart.toLocaleString() : ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.shotsEnd > 0 ? machine.currentProduction.shotsEnd.toLocaleString() : ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetQty % 1 === 0 
                                ? machine.currentProduction.targetQty.toLocaleString() 
                                : machine.currentProduction.targetQty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">{Math.round(machine.currentProduction.actualQty).toLocaleString()}</td>
                            <td className="border border-gray-300 p-2 text-center bg-yellow-200 font-bold">
                              {Math.round(machine.currentProduction.okProdQty).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.okProdKgs.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.targetQty > 0 
                                ? Math.round((machine.currentProduction.okProdQty / machine.currentProduction.targetQty) * 100)
                                : Math.round(machine.currentProduction.okProdPercent)}%
                            </td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.rejKgs.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center">{Math.round(machine.currentProduction.runTime)}</td>
                            <td className="border border-gray-300 p-2 text-center">
                              ({machine.currentProduction.downTime > 0 ? machine.currentProduction.downTime.toFixed(2) : '0.00'})
                            </td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.stoppageReason}</td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.startTime || ''}</td>
                            <td className="border border-gray-300 p-2 text-center">{machine.currentProduction.endTime || ''}</td>
                            <td className="border border-gray-300 p-2 text-center">
                              {machine.currentProduction.totalTime > 0 ? Math.round(machine.currentProduction.totalTime).toFixed(2) : ''}
                            </td>
                            <td className={`border border-gray-300 p-2 text-center ${machine.currentProduction.mouldChange ? 'bg-green-200' : ''}`}>
                              {machine.currentProduction.mouldChange}
                            </td>
                            <td className={`border border-gray-300 p-2 text-center ${machine.currentProduction.remark ? 'bg-green-200' : ''}`}>
                              {machine.currentProduction.remark}
                            </td>
                          </tr>
                          {hasChangeover && (
                            <tr className="bg-orange-50">
                              <td className="border border-gray-300 p-2 text-center">{getCleanProductName(machine.changeover.product, true) || machine.changeover.product}</td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.cavity.toFixed(2)}</td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.targetCycle.toFixed(2)}</td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.targetRunTime.toFixed(2)}</td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.partWeight.toFixed(2)}</td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.actualPartWeight.toFixed(2)}</td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.actualCycle.toFixed(2)}</td>
                              <td className="border border-gray-300 p-2 text-center">
                                {machine.changeover.shotsStart > 0 ? machine.changeover.shotsStart.toLocaleString() : ''}
                              </td>
                              <td className="border border-gray-300 p-2 text-center">
                                {machine.changeover.shotsEnd > 0 ? machine.changeover.shotsEnd.toLocaleString() : ''}
                              </td>
                              <td className="border border-gray-300 p-2 text-center">
                                {machine.changeover.targetQty % 1 === 0 
                                  ? machine.changeover.targetQty.toLocaleString() 
                                  : machine.changeover.targetQty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                              </td>
                              <td className="border border-gray-300 p-2 text-center">{Math.round(machine.changeover.actualQty).toLocaleString()}</td>
                              <td className="border border-gray-300 p-2 text-center bg-yellow-200 font-bold">
                                {Math.round(machine.changeover.okProdQty).toLocaleString()}
                              </td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.okProdKgs.toFixed(2)}</td>
                              <td className="border border-gray-300 p-2 text-center">
                                {machine.changeover.targetQty > 0 
                                  ? Math.round((machine.changeover.okProdQty / machine.changeover.targetQty) * 100)
                                  : Math.round(machine.changeover.okProdPercent)}%
                              </td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.rejKgs.toFixed(2)}</td>
                              <td className="border border-gray-300 p-2 text-center">{Math.round(machine.changeover.runTime)}</td>
                              <td className="border border-gray-300 p-2 text-center">
                                ({machine.changeover.downTime > 0 ? machine.changeover.downTime.toFixed(2) : '0.00'})
                              </td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.stoppageReason}</td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.startTime || ''}</td>
                              <td className="border border-gray-300 p-2 text-center">{machine.changeover.endTime || ''}</td>
                              <td className="border border-gray-300 p-2 text-center">
                                {machine.changeover.totalTime > 0 ? Math.round(machine.changeover.totalTime).toFixed(2) : ''}
                              </td>
                              <td className={`border border-gray-300 p-2 text-center ${machine.changeover.mouldChange ? 'bg-green-200' : ''}`}>
                                {machine.changeover.mouldChange}
                              </td>
                              <td className={`border border-gray-300 p-2 text-center ${machine.changeover.remark ? 'bg-green-200' : ''}`}>
                                {machine.changeover.remark}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel File Reader Modal for DPR Import */}
      {showExcelReader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Import DPR Excel File</h2>
              <button
                onClick={() => setShowExcelReader(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ExcelFileReader
                defaultDataType="dpr"
                onDataImported={async (importData) => {
                  // Convert ExcelFileReader's DPR format to ProductionModule's DPRData format
                  if (importData.dpr) {
                    // Handle both single object and array of objects
                    const dprArray = Array.isArray(importData.dpr) ? importData.dpr : [importData.dpr];
                    
                    console.log('📊 Imported DPR data:', dprArray);
                    
                    // Convert all DPR objects
                    const convertedDataArray: DPRData[] = dprArray.map(dprData => ({
                      id: dprData.id || `${dprData.date}-${dprData.shift}-${Date.now()}`,
                      date: dprData.date,
                      shift: dprData.shift,
                      shiftIncharge: dprData.shiftIncharge || 'CHANDAN/DHIRAJ',
                      machines: dprData.machines || [],
                      summary: dprData.summary || {
                        targetQty: 0,
                        actualQty: 0,
                        okProdQty: 0,
                        okProdKgs: 0,
                        okProdPercent: 0,
                        rejKgs: 0,
                        runTime: 0,
                        downTime: 0
                      },
                      shiftTotal: dprData.shiftTotal || null,
                      achievement: dprData.achievement || null
                    }));
                    
                    console.log('📊 Converted DPR data:', convertedDataArray);

                    // Save each DPR to the database
                    let savedCount = 0;
                    let failedCount = 0;
                    const savedIds: string[] = [];
                    
                    for (const converted of convertedDataArray) {
                      try {
                        // Build machine entries for API
                        const machineEntriesForApi = converted.machines.map(m => ({
                          machine_no: m.machineNo,
                          operator_name: m.operatorName,
                          current_production: m.currentProduction?.product ? {
                            product: m.currentProduction.product,
                            cavity: m.currentProduction.cavity,
                            trg_cycle_sec: m.currentProduction.targetCycle,
                            trg_run_time_min: m.currentProduction.targetRunTime,
                            part_wt_gm: m.currentProduction.partWeight,
                            act_part_wt_gm: m.currentProduction.actualPartWeight,
                            act_cycle_sec: m.currentProduction.actualCycle,
                            shots_start: m.currentProduction.shotsStart,
                            shots_end: m.currentProduction.shotsEnd,
                            target_qty_nos: m.currentProduction.targetQty,
                            actual_qty_nos: m.currentProduction.actualQty,
                            ok_prod_qty_nos: m.currentProduction.okProdQty,
                            ok_prod_kgs: m.currentProduction.okProdKgs,
                            ok_prod_percent: m.currentProduction.okProdPercent,
                            rej_kgs: m.currentProduction.rejKgs,
                            lumps_kgs: m.currentProduction.lumps,
                            run_time_mins: m.currentProduction.runTime,
                            down_time_min: m.currentProduction.downTime,
                            stoppage_reason: m.currentProduction.stoppageReason,
                            stoppage_start: m.currentProduction.startTime,
                            stoppage_end: m.currentProduction.endTime,
                            mould_change: m.currentProduction.mouldChange,
                            remark: m.currentProduction.remark,
                            part_wt_check: m.currentProduction.partWeightCheck,
                            cycle_time_check: m.currentProduction.cycleTimeCheck
                          } : null,
                          changeover: m.changeover?.product ? {
                            product: m.changeover.product,
                            cavity: m.changeover.cavity,
                            trg_cycle_sec: m.changeover.targetCycle,
                            trg_run_time_min: m.changeover.targetRunTime,
                            part_wt_gm: m.changeover.partWeight,
                            act_part_wt_gm: m.changeover.actualPartWeight,
                            act_cycle_sec: m.changeover.actualCycle,
                            shots_start: m.changeover.shotsStart,
                            shots_end: m.changeover.shotsEnd,
                            target_qty_nos: m.changeover.targetQty,
                            actual_qty_nos: m.changeover.actualQty,
                            ok_prod_qty_nos: m.changeover.okProdQty,
                            ok_prod_kgs: m.changeover.okProdKgs,
                            ok_prod_percent: m.changeover.okProdPercent,
                            rej_kgs: m.changeover.rejKgs,
                            lumps_kgs: m.changeover.lumps,
                            run_time_mins: m.changeover.runTime,
                            down_time_min: m.changeover.downTime,
                            stoppage_reason: m.changeover.stoppageReason,
                            changeover_start_time: m.changeover.startTime,
                            changeover_end_time: m.changeover.endTime,
                            changeover_duration_min: m.changeover.totalTime || null,
                            changeover_reason: m.changeover.stoppageReason || m.changeover.remark || null,
                            mould_change: m.changeover.mouldChange,
                            remark: m.changeover.remark,
                            part_wt_check: m.changeover.partWeightCheck,
                            cycle_time_check: m.changeover.cycleTimeCheck
                          } : null
                        })).filter(entry => entry.current_production || entry.changeover);

                        // Use /api/dpr-excel for Excel imports (separate table, no FK constraints)
                        const response = await fetch('/api/dpr-excel', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            report_date: converted.date,
                            shift: converted.shift,
                            shift_incharge: converted.shiftIncharge,
                            machine_entries: machineEntriesForApi,
                            created_by: user?.email || 'user',
                            excel_file_name: 'ExcelFileReader import'
                          })
                        });

                        const result = await response.json();
                        if (result.success) {
                          savedCount++;
                          savedIds.push(result.data?.id || converted.id);
                          console.log('✅ Saved DPR to database:', converted.date, converted.shift);
                        } else {
                          // Check if it's a duplicate error
                          if (result.error?.includes('already exists')) {
                            console.log('⚠️ DPR already exists, skipping:', converted.date, converted.shift);
                          } else {
                            failedCount++;
                            console.error('❌ Failed to save DPR:', result.error);
                          }
                        }
                      } catch (err) {
                        failedCount++;
                        console.error('❌ Error saving DPR:', err);
                      }
                    }

                    // Set flag to skip the next auto-fetch (we'll load the data ourselves)
                    setSkipNextFetch(true);

                    // Update date and shift from first imported data
                    if (convertedDataArray.length > 0) {
                      setSelectedDate(convertedDataArray[0].date);
                      setSelectedShift(convertedDataArray[0].shift as 'DAY' | 'NIGHT');
                    }

                    // Add all DPR objects to local state
                    setDprData(prev => {
                      let filtered = prev;
                      convertedDataArray.forEach(converted => {
                        filtered = filtered.filter(dpr => !(dpr.date === converted.date && dpr.shift === converted.shift));
                      });
                      return [...filtered, ...convertedDataArray];
                    });

                    // Only refresh from database if some saves were successful
                    // Otherwise keep showing local data
                    if (savedCount > 0) {
                      setTimeout(() => {
                        loadDprData();
                      }, 500);
                    }

                    const shiftsInfo = convertedDataArray.map(d => `${d.shift} (${d.machines.length} machines)`).join(', ');
                    
                    if (savedCount > 0) {
                      alert(`DPR imported successfully!\n\nImported:\n- ${shiftsInfo}\n- Date: ${new Date(convertedDataArray[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\n- Shift Incharge: ${convertedDataArray[0].shiftIncharge}\n\nSaved to database: ${savedCount} entries${failedCount > 0 ? `\nFailed: ${failedCount} entries (check console for details)` : ''}`);
                    } else {
                      // All saves failed - show local data only with warning
                      alert(`⚠️ DPR imported locally but failed to save to database!\n\nImported:\n- ${shiftsInfo}\n- Date: ${new Date(convertedDataArray[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\n\nThe data is shown locally but will be lost on page refresh.\nPlease check the browser console for error details.\n\nCommon issue: Machine numbers in Excel don't match the lines table. Run the database migration to fix this.`);
                    }
                    
                    // Close the modal
                    setShowExcelReader(false);
                  }
                }}
                onClose={() => setShowExcelReader(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Form Modal */}
      {showManualEntry && (
        <ManualDPREntryForm
          date={selectedDate}
          shift={selectedShift}
          molds={molds}
          lines={lines}
          columnVisibility={columnVisibility}
          isColumnVisible={isColumnVisible}
          existingData={(() => {
            const currentData = getCurrentDPRData();
            console.log('📝 Form opening with existingData:', currentData ? { id: currentData.id, date: currentData.date, shift: currentData.shift } : 'null');
            return currentData || undefined;
          })()}
          onSave={(dprData) => {
            // Add the new DPR data
            setDprData(prev => {
              // Remove existing entry for same date+shift
              const filtered = prev.filter(dpr => !(dpr.date === dprData.date && dpr.shift === dprData.shift));
              return [...filtered, dprData];
            });
            setShowManualEntry(false);
            alert(`DPR created successfully for ${new Date(dprData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${dprData.shift} shift`);
          }}
          onClose={() => setShowManualEntry(false)}
        />
      )}

      {/* Blocking Loading Modal for Post to Stock and Excel Import */}
      <BlockingLoadingModal
        isOpen={isPostingToStock || isImporting}
        title={isPostingToStock ? "Posting to Stock Ledger..." : "Importing Excel Data..."}
        message={isPostingToStock 
          ? "Processing DPR entries. Please wait. Do not refresh or close this tab."
          : "Importing DPR data from Excel. Please wait. Do not refresh or close this tab."}
        showWarning={true}
      />
    </div>
  );
};

// Manual DPR Entry Form Component
interface ManualDPREntryFormProps {
  date: string;
  shift: 'DAY' | 'NIGHT';
  molds: Mold[];
  lines: Line[];
  columnVisibility: Record<string, boolean>;
  isColumnVisible: (columnId: string, isFullView?: boolean) => boolean;
  existingData?: DPRData;
  onSave: (dprData: DPRData) => void;
  onClose: () => void;
}

const ManualDPREntryForm: React.FC<ManualDPREntryFormProps> = ({
  date,
  shift,
  molds,
  lines,
  columnVisibility,
  isColumnVisible,
  existingData,
  onSave,
  onClose
}) => {
  const [shiftIncharge, setShiftIncharge] = useState(existingData?.shiftIncharge || 'CHANDAN/DHIRAJ');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Calculate total stoppage time from all stoppages
  // Only count stoppages that have both startTime and endTime filled
  const getTotalStoppageTime = (stoppages: StoppageEntry[]): number => {
    return stoppages.reduce((sum, stoppage) => {
      // Only count if both start and end times are present
      if (stoppage.startTime && stoppage.endTime && stoppage.startTime.trim() && stoppage.endTime.trim()) {
        return sum + (stoppage.totalTime || 0);
      }
      return sum;
    }, 0);
  };
  
  // Helper function to validate time sum (must be between 0 and 720)
  // If there's a mold change, current Trg Run Time + changeover Trg Run Time should be <= 720
  // Stoppage time is excluded from this validation
  const validateTimeSum = (entryId: string) => {
    const entry = machineEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    const currentRunTime = entry.currentProduction.targetRunTime || 0;
    const changeoverRunTime = entry.changeover.product ? (entry.changeover.targetRunTime || 0) : 0;
    const hasChangeover = !!entry.changeover.product;
    
    setValidationErrors(prev => {
      const updated = { ...prev };
      const errorKey = `${entryId}-timeSum`;
      
      if (hasChangeover) {
        // If there's a changeover, validate each value and the sum
        const sum = currentRunTime + changeoverRunTime;
        if (currentRunTime < 0 || currentRunTime > 720) {
          updated[errorKey] = `Trg Run Time (current) must be between 0 and 720 min. Current value: ${currentRunTime.toFixed(2)} min`;
        } else if (changeoverRunTime < 0 || changeoverRunTime > 720) {
          updated[errorKey] = `Trg Run Time (changeover) must be between 0 and 720 min. Current value: ${changeoverRunTime.toFixed(2)} min`;
        } else if (sum > 720) {
          updated[errorKey] = `Current + Changeover must not exceed 720 min. Sum: ${sum.toFixed(2)} min`;
        } else {
          delete updated[errorKey];
        }
      } else {
        // If no changeover, current must be between 0 and 720
        if (currentRunTime < 0 || currentRunTime > 720) {
          updated[errorKey] = `Trg Run Time (current) must be between 0 and 720 min. Current value: ${currentRunTime.toFixed(2)} min`;
        } else {
          delete updated[errorKey];
        }
      }
      
      return updated;
    });
  };
  
  // Initialize machine entries from existing data or start with empty entry
  const [machineEntries, setMachineEntries] = useState<Array<{
    id: string;
    machineNo: string; // Keep as machineNo for DPR compatibility, but will store line_id
    operatorName: string;
    currentProduction: Partial<ProductionRun>;
    changeover: Partial<ProductionRun>;
  }>>(() => {
    if (existingData && existingData.machines && existingData.machines.length > 0) {
      // Convert existing machines to entry format
      // Note: targetQty and actualQty will be recalculated in useEffect after component mounts
      return existingData.machines.map((machine, index) => ({
        id: `existing-${index}-${Date.now()}`,
        machineNo: machine.machineNo,
        operatorName: machine.operatorName,
        currentProduction: { ...machine.currentProduction },
        changeover: { ...machine.changeover }
      }));
    }
    // Start with one empty entry with default numeric values
    return [{
      id: Date.now().toString(),
      machineNo: '',
      operatorName: '',
      currentProduction: {
        product: '',
        shotsStart: 0,
        shotsEnd: 0,
        targetRunTime: 0,
        actualCycle: 0,
        actualPartWeight: 0,
        okProdQty: 0,
        lumps: 0
      },
      changeover: {
        product: '',
        shotsStart: 0,
        shotsEnd: 0,
        targetRunTime: 0,
        actualCycle: 0,
        actualPartWeight: 0,
        okProdQty: 0,
        lumps: 0
      }
    }];
  });

  // Get molds that are currently in use (in current production but NOT released via changeover)
  const getUsedMolds = (): Set<string> => {
    const usedMolds = new Set<string>();
    machineEntries.forEach(entry => {
      // Add current production mold to used list
      if (entry.currentProduction.product) {
        usedMolds.add(entry.currentProduction.product);
      }
    });
    return usedMolds;
  };

  // Get molds that have been released (have a changeover entry with a different mold)
  const getReleasedMolds = (): Set<string> => {
    const releasedMolds = new Set<string>();
    machineEntries.forEach(entry => {
      // If there's a changeover product, the current production mold is being released
      if (entry.changeover.product && entry.currentProduction.product) {
        releasedMolds.add(entry.currentProduction.product);
      }
    });
    return releasedMolds;
  };

  // Check if a mold is available for selection
  const isMoldAvailable = (moldName: string, currentEntryId: string, isChangeover: boolean): boolean => {
    const usedMolds = getUsedMolds();
    const releasedMolds = getReleasedMolds();
    
    // Get current entry
    const currentEntry = machineEntries.find(e => e.id === currentEntryId);
    
    // If checking for current production
    if (!isChangeover) {
      // Allow if it's the same mold already selected for this entry
      if (currentEntry?.currentProduction.product === moldName) return true;
      // Block if mold is in use by another line (and not released)
      if (usedMolds.has(moldName) && !releasedMolds.has(moldName)) return false;
    }
    
    // If checking for changeover
    if (isChangeover) {
      // Allow if it's the same mold already selected for this changeover
      if (currentEntry?.changeover.product === moldName) return true;
      // Block if mold is in use by another line's current production (and not released)
      // But allow if this mold was released by another line
      if (usedMolds.has(moldName) && !releasedMolds.has(moldName)) return false;
    }
    
    return true;
  };

  // Helper to calculate field values based on formulas
  const calculateField = (field: string, run: Partial<ProductionRun>, isChangeover: boolean = false): number => {
    const prod = run;
    
    console.log(`🧮 calculateField: ${field}`, { 
      isChangeover, 
      product: prod.product,
      targetRunTime: prod.targetRunTime,
      targetCycle: prod.targetCycle,
      cavity: prod.cavity,
      okProdQty: prod.okProdQty,
      partWeight: prod.partWeight,
      shotsStart: prod.shotsStart,
      shotsEnd: prod.shotsEnd,
      actualQty: prod.actualQty,
      actualCycle: prod.actualCycle
    });
    
    switch (field) {
      case 'targetQty':
        // Formula: Trg Run Time (min) * 60 / Trg Cycle (sec) * Cavity
        // Round to nearest whole number
        if (prod.targetRunTime !== undefined && prod.targetCycle !== undefined && prod.cavity !== undefined &&
            prod.targetRunTime > 0 && prod.targetCycle > 0 && prod.cavity > 0) {
          const result = Math.round(prod.targetRunTime * 60 / prod.targetCycle * prod.cavity);
          console.log(`  ✅ targetQty calculated: ${prod.targetRunTime} * 60 / ${prod.targetCycle} * ${prod.cavity} = ${result}`);
          return result;
        }
        console.log(`  ⚠️ targetQty: Missing or invalid inputs, returning 0`);
        return 0;
      
      case 'actualQty':
        // Formula: (No of Shots (end) - No of Shots (start)) * Cavity
        // Treat undefined/empty shotsStart as 0
        if (typeof prod.shotsEnd === 'number' && typeof prod.cavity === 'number' && prod.cavity > 0) {
          const shotsStart = typeof prod.shotsStart === 'number' ? prod.shotsStart : 0;
          const diff = prod.shotsEnd - shotsStart;
          return diff * prod.cavity;
        }
        return 0;
      
      case 'okProdKgs':
        // Formula: Ok Prod Qty (Nos) * (Part Wt (gm) / 1000)
        if (prod.okProdQty && prod.partWeight) {
          const result = (prod.okProdQty * prod.partWeight / 1000) || 0;
          console.log(`  ✅ okProdKgs calculated: ${prod.okProdQty} * ${prod.partWeight} / 1000 = ${result}`);
          return result;
        }
        console.log(`  ⚠️ okProdKgs: Missing okProdQty (${prod.okProdQty}) or partWeight (${prod.partWeight}), returning 0`);
        return 0;
      
      case 'okProdPercent':
        // Formula: Ok Prod Qty (Nos) / Target Qty (Nos)
        // Returns ratio as decimal (0-1), we'll multiply by 100 for display
        if (prod.okProdQty !== undefined && prod.targetQty !== undefined) {
          if (prod.targetQty > 0) {
            const result = (prod.okProdQty / prod.targetQty);
            console.log(`  ✅ okProdPercent calculated: ${prod.okProdQty} / ${prod.targetQty} = ${result} (${(result * 100).toFixed(2)}%)`);
            return result;
          } else {
            console.log(`  ⚠️ okProdPercent: targetQty is 0, returning 0`);
            return 0;
          }
        }
        console.log(`  ⚠️ okProdPercent: Missing okProdQty (${prod.okProdQty}) or targetQty (${prod.targetQty}), returning 0`);
        return 0;
      
      case 'rejKgs':
        // Formula: (Actual Qty (Nos) - Ok Prod Qty (Nos)) * Act Part Wt (gm) / 1000
        if (prod.actualQty !== undefined && prod.okProdQty !== undefined && prod.actualPartWeight !== undefined && prod.actualPartWeight > 0) {
          const diff = (prod.actualQty || 0) - (prod.okProdQty || 0);
          return (diff * prod.actualPartWeight) / 1000;
        }
        return 0;
      
      case 'runTime':
        // Formula: (No of Shots (end) - No of Shots (start)) * Act Cycle (sec) / 60
        // Treat undefined/empty shotsStart as 0
        if (typeof prod.shotsEnd === 'number' && typeof prod.actualCycle === 'number' && prod.actualCycle > 0) {
          const shotsStart = typeof prod.shotsStart === 'number' ? prod.shotsStart : 0;
          const diff = prod.shotsEnd - shotsStart;
          return (diff * prod.actualCycle) / 60;
        }
        return 0;
      
      case 'downTime':
        // Formula: Trg Run Time (min) - Run Time (mins)
        if (prod.targetRunTime !== undefined && prod.runTime !== undefined) {
          return (prod.targetRunTime || 0) - (prod.runTime || 0);
        }
        return 0;
      
      case 'totalTime':
        // Formula: Calculate minutes difference between End Time and Start Time
        // Times are in HH:MM format (e.g., "14:30")
        if (prod.endTime && prod.startTime) {
          try {
            // Parse time strings (HH:MM format) to total minutes
            const parseTimeToMinutes = (timeStr: string): number => {
              const [hours, minutes] = timeStr.split(':').map(Number);
              return hours * 60 + minutes; // Convert to total minutes
            };
            
            const startMinutes = parseTimeToMinutes(prod.startTime);
            const endMinutes = parseTimeToMinutes(prod.endTime);
            const diffMinutes = endMinutes - startMinutes;
            
            // Handle case where end time is next day (e.g., end 02:00, start 22:00 = 4 hours = 240 min)
            // If end < start, assume it's next day, so add 24 hours (1440 minutes)
            const totalMinutes = diffMinutes < 0 ? diffMinutes + 1440 : diffMinutes;
            
            // Return 0 if difference is 0 or negative (invalid), otherwise return the minutes
            return totalMinutes > 0 ? totalMinutes : 0;
          } catch {
            return 0;
          }
        }
        return 0;
      
      default:
        return 0;
    }
  };

  // Helper to calculate quality check fields
  // Quality Check - Part Weight: If (Part Wt (gm) - Act part wt (gm)) > 0.5, then "NOT OK", else "OK"
  // Quality Check - Cycle Time: If (Trg Cycle (sec) - Act Cycle (sec)) > 0.5, then "NOT OK", else "OK"
  const calculateQualityCheck = (field: 'partWeightCheck' | 'cycleTimeCheck', run: Partial<ProductionRun>): 'OK' | 'NOT OK' | '' => {
    const prod = run;
    
    switch (field) {
      case 'partWeightCheck':
        // Formula: If (Part Wt (gm) - Act part wt (gm)) > 0.5, then "NOT OK", else "OK"
        // Checks if actual part weight deviates more than 0.5g from target (in either direction)
        if (prod.partWeight !== undefined && prod.actualPartWeight !== undefined && 
            prod.partWeight > 0 && prod.actualPartWeight > 0) {
          const diff = prod.partWeight - prod.actualPartWeight;
          // Check deviation in either direction (underweight or overweight by more than 0.5g)
          return Math.abs(diff) > 0.5 ? 'NOT OK' : 'OK';
        }
        return '';
      
      case 'cycleTimeCheck':
        // Formula: If (Trg Cycle (sec) - Act Cycle (sec)) > 0.5, then "NOT OK", else "OK"
        // Checks if actual cycle time deviates more than 0.5 sec from target (in either direction)
        if (prod.targetCycle !== undefined && prod.actualCycle !== undefined && 
            prod.targetCycle > 0 && prod.actualCycle > 0) {
          const diff = prod.targetCycle - prod.actualCycle;
          // Check deviation in either direction (slower or faster by more than 0.5 sec)
          return Math.abs(diff) > 0.5 ? 'NOT OK' : 'OK';
        }
        return '';
      
      default:
        return '';
    }
  };

  // Handle product/mold selection - auto-populate fields
  const handleProductSelect = (entryId: string, productName: string, isChangeover: boolean) => {
    const mold = molds.find(m => m.mold_name === productName || m.item_name === productName);
    if (!mold) return;

    setMachineEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      
      const run = isChangeover ? entry.changeover : entry.currentProduction;
      const updatedRun = {
        ...run,
        product: productName,
        cavity: mold.cavity || mold.cavities || 0,
        targetCycle: mold.cycle_time || 0,
        partWeight: mold.int_wt || mold.dwg_wt || 0
      };

      // Recalculate dependent fields in correct order
      // First calculate targetQty (needed for okProdPercent)
      updatedRun.targetQty = calculateField('targetQty', updatedRun, isChangeover);
      // Then actualQty (needed for rejKgs)
      updatedRun.actualQty = calculateField('actualQty', updatedRun, isChangeover);
      // Then runTime (needed for downTime)
      updatedRun.runTime = calculateField('runTime', updatedRun, isChangeover);
      // Then okProdKgs (uses okProdQty and Part Wt (gm) from mold master)
      updatedRun.okProdKgs = calculateField('okProdKgs', updatedRun, isChangeover);
      // Then okProdPercent (needs targetQty and okProdQty)
      updatedRun.okProdPercent = calculateField('okProdPercent', updatedRun, isChangeover);
      // Then rejKgs (needs actualQty, okProdQty, and Part Wt (gm) from mold master)
      updatedRun.rejKgs = calculateField('rejKgs', updatedRun, isChangeover);
      // Then downTime (needs runTime)
      updatedRun.downTime = calculateField('downTime', updatedRun, isChangeover);
      // Finally totalTime (calculated from startTime and endTime)
      updatedRun.totalTime = calculateField('totalTime', updatedRun, isChangeover);
      // Quality Checks - Part Weight Check: If (Part Wt - Act Part Wt) > 0.5, "NOT OK", else "OK"
      updatedRun.partWeightCheck = calculateQualityCheck('partWeightCheck', updatedRun);
      // Quality Checks - Cycle Time Check: If (Trg Cycle - Act Cycle) > 0.5, "NOT OK", else "OK"
      updatedRun.cycleTimeCheck = calculateQualityCheck('cycleTimeCheck', updatedRun);

      const updatedEntry = {
        ...entry,
        [isChangeover ? 'changeover' : 'currentProduction']: updatedRun
      };
      
      // Validate time sum if changeover product was selected/deselected
      if (isChangeover) {
        setTimeout(() => {
          validateTimeSum(entryId);
        }, 0);
      }
      
      return updatedEntry;
    }));
  };

  // Handle field change with auto-calculation
  const handleFieldChange = (entryId: string, field: string, value: any, isChangeover: boolean) => {
    setMachineEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      
      const run = isChangeover ? entry.changeover : entry.currentProduction;
      // Ensure numeric fields are stored as numbers (not undefined/null)
      const numericFields = ['shotsStart', 'shotsEnd', 'targetRunTime', 'actualCycle', 'okProdQty', 
                            'actualPartWeight', 'lumps', 'cavity', 'targetCycle', 'partWeight', 'totalTime'];
      let processedValue = value;
      if (numericFields.includes(field)) {
        processedValue = typeof value === 'number' ? value : (value === '' || value === null || value === undefined ? 0 : parseFloat(value) || 0);
      }
      
      // Create updated run with new value
      const updatedRun: Partial<ProductionRun> = { ...run, [field]: processedValue };

      // If updating Trg Run Time for current production, auto-calculate changeover Trg Run Time
      // Formula: Trg Run Time (changeover) = 720 - Trg Run Time (current)
      // Only auto-calculate if changeover Trg Run Time hasn't been manually set yet
      if (!isChangeover && field === 'targetRunTime') {
        const currentRunTime = parseFloat(value) || 0;
        // Only auto-set if changeover Trg Run Time is empty or 0 and changeover product exists
        if (entry.changeover.product && (!entry.changeover.targetRunTime || entry.changeover.targetRunTime === 0)) {
          entry.changeover.targetRunTime = 720 - currentRunTime;
          // Recalculate changeover fields if changeover has product selected
          entry.changeover.targetQty = calculateField('targetQty', entry.changeover, true);
        }
      }
      
      // If updating Trg Run Time for changeover, auto-calculate current Trg Run Time
      // Formula: Trg Run Time (current) = 720 - Trg Run Time (changeover)
      // Only auto-calculate if current Trg Run Time hasn't been manually set yet
      if (isChangeover && field === 'targetRunTime') {
        const changeoverRunTime = parseFloat(value) || 0;
        // Only auto-set if current Trg Run Time is empty or 0
        if (!entry.currentProduction.targetRunTime || entry.currentProduction.targetRunTime === 0) {
          entry.currentProduction.targetRunTime = 720 - changeoverRunTime;
          // Recalculate current production fields
          entry.currentProduction.targetQty = calculateField('targetQty', entry.currentProduction, false);
        }
      }

      // Recalculate dependent fields in correct order
      // First calculate targetQty (needed for okProdPercent)
      updatedRun.targetQty = calculateField('targetQty', updatedRun, isChangeover);
      // Then actualQty (needed for rejKgs)
      updatedRun.actualQty = calculateField('actualQty', updatedRun, isChangeover);
      // Then runTime (needed for downTime)
      updatedRun.runTime = calculateField('runTime', updatedRun, isChangeover);
      // Then okProdKgs (uses okProdQty and Part Wt (gm) from mold master)
      updatedRun.okProdKgs = calculateField('okProdKgs', updatedRun, isChangeover);
      // Then okProdPercent (needs targetQty and okProdQty)
      updatedRun.okProdPercent = calculateField('okProdPercent', updatedRun, isChangeover);
      // Then rejKgs (needs actualQty, okProdQty, and Part Wt (gm) from mold master)
      updatedRun.rejKgs = calculateField('rejKgs', updatedRun, isChangeover);
      // Then downTime (needs runTime)
      updatedRun.downTime = calculateField('downTime', updatedRun, isChangeover);
      // Finally totalTime - only auto-calculate if not manually set (for stoppage time)
      // If field is not 'totalTime', recalculate it; otherwise use the provided value
      if (field !== 'totalTime') {
      updatedRun.totalTime = calculateField('totalTime', updatedRun, isChangeover);
      }
      // Quality Checks - Part Weight Check: If (Part Wt - Act Part Wt) > 0.5, "NOT OK", else "OK"
      updatedRun.partWeightCheck = calculateQualityCheck('partWeightCheck', updatedRun);
      // Quality Checks - Cycle Time Check: If (Trg Cycle - Act Cycle) > 0.5, "NOT OK", else "OK"
      updatedRun.cycleTimeCheck = calculateQualityCheck('cycleTimeCheck', updatedRun);

      const updatedEntry = {
        ...entry,
        [isChangeover ? 'changeover' : 'currentProduction']: updatedRun
      };
      
      // Validate time sum after state update (for fields that affect the sum)
      if (field === 'targetRunTime' || field === 'totalTime') {
        setTimeout(() => {
          validateTimeSum(entryId);
        }, 0);
      }
      
      return updatedEntry;
    }));
  };

  const addMachineEntry = () => {
    setMachineEntries(prev => [...prev, {
      id: Date.now().toString(),
      machineNo: '',
      operatorName: '',
      currentProduction: {
        product: '',
        shotsStart: 0,
        shotsEnd: 0,
        targetRunTime: 0,
        actualCycle: 0,
        actualPartWeight: 0,
        okProdQty: 0,
        lumps: 0
      },
      changeover: {
        product: '',
        shotsStart: 0,
        shotsEnd: 0,
        targetRunTime: 0,
        actualCycle: 0,
        actualPartWeight: 0,
        okProdQty: 0,
        lumps: 0
      }
    }]);
  };

  // Recalculate targetQty and actualQty when form loads with existing data
  useEffect(() => {
    if (existingData && machineEntries.length > 0) {
      setMachineEntries(prev => prev.map(entry => {
        const updatedEntry = { ...entry };
        let needsUpdate = false;
        
        // Recalculate current production
        const currentProd = { ...entry.currentProduction };
        if (currentProd.targetRunTime && currentProd.targetCycle && currentProd.cavity) {
          const recalculatedTargetQty = Math.round(currentProd.targetRunTime * 60 / currentProd.targetCycle * currentProd.cavity);
          if (recalculatedTargetQty !== (currentProd.targetQty || 0)) {
            currentProd.targetQty = recalculatedTargetQty;
            needsUpdate = true;
            console.log(`🔄 Recalculated current targetQty for ${entry.machineNo}: ${entry.currentProduction.targetQty} -> ${recalculatedTargetQty}`);
          }
        }
        if (currentProd.shotsEnd !== undefined && currentProd.cavity) {
          const shotsStart = currentProd.shotsStart || 0;
          const recalculatedActualQty = (currentProd.shotsEnd - shotsStart) * currentProd.cavity;
          if (recalculatedActualQty !== (currentProd.actualQty || 0)) {
            currentProd.actualQty = recalculatedActualQty;
            needsUpdate = true;
            console.log(`🔄 Recalculated current actualQty for ${entry.machineNo}: ${entry.currentProduction.actualQty} -> ${recalculatedActualQty}`);
          }
        }
        
        // Recalculate changeover
        const changeoverProd = { ...entry.changeover };
        if (changeoverProd.targetRunTime && changeoverProd.targetCycle && changeoverProd.cavity) {
          const recalculatedTargetQty = Math.round(changeoverProd.targetRunTime * 60 / changeoverProd.targetCycle * changeoverProd.cavity);
          if (recalculatedTargetQty !== (changeoverProd.targetQty || 0)) {
            changeoverProd.targetQty = recalculatedTargetQty;
            needsUpdate = true;
            console.log(`🔄 Recalculated changeover targetQty for ${entry.machineNo}: ${entry.changeover.targetQty} -> ${recalculatedTargetQty}`);
          }
        }
        if (changeoverProd.shotsEnd !== undefined && changeoverProd.cavity) {
          const shotsStart = changeoverProd.shotsStart || 0;
          const recalculatedActualQty = (changeoverProd.shotsEnd - shotsStart) * changeoverProd.cavity;
          if (recalculatedActualQty !== (changeoverProd.actualQty || 0)) {
            changeoverProd.actualQty = recalculatedActualQty;
            needsUpdate = true;
            console.log(`🔄 Recalculated changeover actualQty for ${entry.machineNo}: ${entry.changeover.actualQty} -> ${recalculatedActualQty}`);
          }
        }
        
        if (needsUpdate) {
          return {
            ...updatedEntry,
            currentProduction: currentProd,
            changeover: changeoverProd
          };
        }
        return entry;
      }));
    }
  }, [existingData]); // Only run when existingData changes (on initial load)

  const removeMachineEntry = (entryId: string) => {
    if (machineEntries.length > 1) {
      setMachineEntries(prev => prev.filter(entry => entry.id !== entryId));
    }
  };

  // Helper function to calculate stoppage time from start/end times
  const calculateStoppageTime = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    try {
      const parseTimeToMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = parseTimeToMinutes(endTime);
      const diffMinutes = endMinutes - startMinutes;
      // Handle next day case
      const totalMinutes = diffMinutes < 0 ? diffMinutes + 1440 : diffMinutes;
      return totalMinutes > 0 ? totalMinutes : 0;
    } catch {
      return 0;
    }
  };

  // Add a new stoppage entry
  const addStoppage = (entryId: string, isChangeover: boolean = false) => {
    setMachineEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      const run = isChangeover ? entry.changeover : entry.currentProduction;
      const newStoppage: StoppageEntry = {
        id: `stoppage-${Date.now()}-${Math.random()}`,
        reason: '',
        startTime: '',
        endTime: '',
        totalTime: 0,
        remark: ''
      };
      const updatedRun = {
        ...run,
        stoppages: [...(run.stoppages || []), newStoppage]
      };
      return {
        ...entry,
        [isChangeover ? 'changeover' : 'currentProduction']: updatedRun
      };
    }));
  };

  // Remove a stoppage entry
  const removeStoppage = (entryId: string, stoppageId: string, isChangeover: boolean = false) => {
    setMachineEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      const run = isChangeover ? entry.changeover : entry.currentProduction;
      const updatedRun = {
        ...run,
        stoppages: (run.stoppages || []).filter(s => s.id !== stoppageId)
      };
      // Recalculate total stoppage time
      updatedRun.totalTime = getTotalStoppageTime(updatedRun.stoppages);
      const updatedEntry = {
        ...entry,
        [isChangeover ? 'changeover' : 'currentProduction']: updatedRun
      };
      // Validate time sum after removing stoppage
      setTimeout(() => {
        validateTimeSum(entryId);
      }, 0);
      return updatedEntry;
    }));
  };

  // Update a stoppage entry
  const updateStoppage = (entryId: string, stoppageId: string, field: keyof StoppageEntry, value: any, isChangeover: boolean = false) => {
    setMachineEntries(prev => prev.map(entry => {
      if (entry.id !== entryId) return entry;
      const run = isChangeover ? entry.changeover : entry.currentProduction;
      const updatedStoppages = (run.stoppages || []).map(stoppage => {
        if (stoppage.id !== stoppageId) return stoppage;
        const updated = { ...stoppage, [field]: value };
        // Auto-calculate totalTime when startTime or endTime changes
        if (field === 'startTime' || field === 'endTime') {
          updated.totalTime = calculateStoppageTime(updated.startTime, updated.endTime);
        }
        return updated;
      });
      const updatedRun = {
        ...run,
        stoppages: updatedStoppages,
        totalTime: getTotalStoppageTime(updatedStoppages)
      };
      const updatedEntry = {
        ...entry,
        [isChangeover ? 'changeover' : 'currentProduction']: updatedRun
      };
      // Validate time sum after updating stoppage
      setTimeout(() => {
        validateTimeSum(entryId);
      }, 0);
      return updatedEntry;
    }));
  };

  const handleSave = async () => {
    // Validate all entries before saving
    const errors: Record<string, string> = {};
    
    machineEntries.forEach(entry => {
      // Validate current production
      const currentPartWeight = entry.currentProduction.partWeight || 0;
      const currentActualPartWeight = entry.currentProduction.actualPartWeight || 0;
      if (currentPartWeight > 0 && currentActualPartWeight > 0) {
        const diff = Math.abs(currentActualPartWeight - currentPartWeight);
        if (diff > 3) {
          errors[`${entry.id}-actualPartWeight-current`] = `Act part wt must be within ±3 gm of target (${currentPartWeight} gm). Current difference: ${diff.toFixed(2)} gm`;
        }
      }
      
      const currentTargetCycle = entry.currentProduction.targetCycle || 0;
      const currentActualCycle = entry.currentProduction.actualCycle || 0;
      if (currentTargetCycle > 0 && currentActualCycle > 0) {
        const diff = Math.abs(currentActualCycle - currentTargetCycle);
        if (diff > 2) {
          errors[`${entry.id}-actualCycle-current`] = `Act Cycle must be within ±2 sec of target (${currentTargetCycle} sec). Current difference: ${diff.toFixed(2)} sec`;
        }
      }
      
      // Validate changeover
      if (entry.changeover.product) {
        const changeoverPartWeight = entry.changeover.partWeight || 0;
        const changeoverActualPartWeight = entry.changeover.actualPartWeight || 0;
        if (changeoverPartWeight > 0 && changeoverActualPartWeight > 0) {
          const diff = Math.abs(changeoverActualPartWeight - changeoverPartWeight);
          if (diff > 3) {
            errors[`${entry.id}-actualPartWeight-changeover`] = `Act part wt (changeover) must be within ±3 gm of target (${changeoverPartWeight} gm). Current difference: ${diff.toFixed(2)} gm`;
          }
        }
        
        const changeoverTargetCycle = entry.changeover.targetCycle || 0;
        const changeoverActualCycle = entry.changeover.actualCycle || 0;
        if (changeoverTargetCycle > 0 && changeoverActualCycle > 0) {
          const diff = Math.abs(changeoverActualCycle - changeoverTargetCycle);
          if (diff > 2) {
            errors[`${entry.id}-actualCycle-changeover`] = `Act Cycle (changeover) must be within ±2 sec of target (${changeoverTargetCycle} sec). Current difference: ${diff.toFixed(2)} sec`;
          }
        }
      }
      
      // Validate time sum: target run times must be between 0 and 720
      // If there's a mold change, current Trg Run Time + changeover Trg Run Time should be <= 720
      // Stoppage time is excluded from this validation
      const currentRunTime = entry.currentProduction.targetRunTime || 0;
      const changeoverRunTime = entry.changeover.product ? (entry.changeover.targetRunTime || 0) : 0;
      const hasChangeover = !!entry.changeover.product;
      
      if (hasChangeover) {
        // If there's a changeover, validate each value and the sum
        const sum = currentRunTime + changeoverRunTime;
        if (currentRunTime < 0 || currentRunTime > 720) {
          errors[`${entry.id}-timeSum`] = `Trg Run Time (current) must be between 0 and 720 min. Current value: ${currentRunTime.toFixed(2)} min`;
        } else if (changeoverRunTime < 0 || changeoverRunTime > 720) {
          errors[`${entry.id}-timeSum`] = `Trg Run Time (changeover) must be between 0 and 720 min. Current value: ${changeoverRunTime.toFixed(2)} min`;
        } else if (sum > 720) {
          errors[`${entry.id}-timeSum`] = `Current + Changeover must not exceed 720 min. Sum: ${sum.toFixed(2)} min`;
        }
      } else {
        // If no changeover, current must be between 0 and 720
        if (currentRunTime < 0 || currentRunTime > 720) {
          errors[`${entry.id}-timeSum`] = `Trg Run Time (current) must be between 0 and 720 min. Current value: ${currentRunTime.toFixed(2)} min`;
        }
      }
    });
    
    // If there are validation errors, show them and prevent saving
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      alert('Cannot save DPR: Please fix the validation errors shown in red below.');
      // Scroll to first error
      const firstErrorKey = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[data-error-key="${firstErrorKey}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Clear any existing errors
    setValidationErrors({});
    
    // Convert entries to API format
    // Recalculate targetQty and actualQty before saving to ensure they're correct
    const entriesWithRecalculatedValues = machineEntries.map(entry => {
      const currentProd = { ...entry.currentProduction };
      // Recalculate targetQty if we have the required inputs
      if (currentProd.targetRunTime && currentProd.targetCycle && currentProd.cavity) {
        const recalculatedTargetQty = Math.round(currentProd.targetRunTime * 60 / currentProd.targetCycle * currentProd.cavity);
        if (recalculatedTargetQty !== currentProd.targetQty) {
          console.log(`🔄 Recalculating targetQty for ${entry.machineNo}: ${currentProd.targetQty} -> ${recalculatedTargetQty}`);
          currentProd.targetQty = recalculatedTargetQty;
        }
      }
      // Recalculate actualQty if we have the required inputs
      if (currentProd.shotsEnd !== undefined && currentProd.cavity) {
        const shotsStart = currentProd.shotsStart || 0;
        const recalculatedActualQty = (currentProd.shotsEnd - shotsStart) * currentProd.cavity;
        if (recalculatedActualQty !== currentProd.actualQty) {
          console.log(`🔄 Recalculating actualQty for ${entry.machineNo}: ${currentProd.actualQty} -> ${recalculatedActualQty}`);
          currentProd.actualQty = recalculatedActualQty;
        }
      }
      
      const changeoverProd = { ...entry.changeover };
      // Recalculate changeover targetQty if we have the required inputs
      if (changeoverProd.targetRunTime && changeoverProd.targetCycle && changeoverProd.cavity) {
        const recalculatedTargetQty = Math.round(changeoverProd.targetRunTime * 60 / changeoverProd.targetCycle * changeoverProd.cavity);
        if (recalculatedTargetQty !== changeoverProd.targetQty) {
          console.log(`🔄 Recalculating changeover targetQty for ${entry.machineNo}: ${changeoverProd.targetQty} -> ${recalculatedTargetQty}`);
          changeoverProd.targetQty = recalculatedTargetQty;
        }
      }
      // Recalculate changeover actualQty if we have the required inputs
      if (changeoverProd.shotsEnd !== undefined && changeoverProd.cavity) {
        const shotsStart = changeoverProd.shotsStart || 0;
        const recalculatedActualQty = (changeoverProd.shotsEnd - shotsStart) * changeoverProd.cavity;
        if (recalculatedActualQty !== changeoverProd.actualQty) {
          console.log(`🔄 Recalculating changeover actualQty for ${entry.machineNo}: ${changeoverProd.actualQty} -> ${recalculatedActualQty}`);
          changeoverProd.actualQty = recalculatedActualQty;
        }
      }
      
      return {
        ...entry,
        currentProduction: currentProd,
        changeover: changeoverProd
      };
    });

    const filteredEntries = entriesWithRecalculatedValues.filter(entry => entry.machineNo);
    
    const machineEntriesForApi = filteredEntries.map(entry => {
      console.log(`💾 Preparing to save entry for ${entry.machineNo}:`, {
        targetQty: entry.currentProduction.targetQty,
        actualQty: entry.currentProduction.actualQty,
        targetRunTime: entry.currentProduction.targetRunTime,
        targetCycle: entry.currentProduction.targetCycle,
        cavity: entry.currentProduction.cavity,
        shotsStart: entry.currentProduction.shotsStart,
        shotsEnd: entry.currentProduction.shotsEnd,
        calculatedTargetQty: entry.currentProduction.targetRunTime && entry.currentProduction.targetCycle && entry.currentProduction.cavity 
          ? Math.round(entry.currentProduction.targetRunTime * 60 / entry.currentProduction.targetCycle * entry.currentProduction.cavity)
          : 'N/A',
        calculatedActualQty: entry.currentProduction.shotsEnd !== undefined && entry.currentProduction.cavity
          ? (entry.currentProduction.shotsEnd - (entry.currentProduction.shotsStart || 0)) * entry.currentProduction.cavity
          : 'N/A'
      });
      
      return {
        // For new manual entries: machineNo is line_id (line number), not machine number
        machine_no: entry.machineNo,
        operator_name: entry.operatorName || '',
        current_production: {
          product: entry.currentProduction.product || '',
          cavity: entry.currentProduction.cavity || 0,
          target_cycle: entry.currentProduction.targetCycle || 0,
          target_run_time: entry.currentProduction.targetRunTime || 0,
          part_weight: entry.currentProduction.partWeight || 0,
          actual_part_weight: entry.currentProduction.actualPartWeight || 0,
          actual_cycle: entry.currentProduction.actualCycle || 0,
          shots_start: entry.currentProduction.shotsStart || 0,
          shots_end: entry.currentProduction.shotsEnd || 0,
          target_qty: entry.currentProduction.targetQty || 0,
          actual_qty: entry.currentProduction.actualQty || 0,
          ok_prod_qty: entry.currentProduction.okProdQty || 0,
          ok_prod_kgs: entry.currentProduction.okProdKgs || 0,
          ok_prod_percent: entry.currentProduction.okProdPercent || 0,
          rej_kgs: entry.currentProduction.rejKgs || 0,
          lumps: entry.currentProduction.lumps || 0,
          run_time: entry.currentProduction.runTime || 0,
          down_time: entry.currentProduction.downTime || 0,
          stoppage_reason: entry.currentProduction.stoppageReason || '', // Legacy field
          start_time: entry.currentProduction.startTime || '', // Legacy field
          end_time: entry.currentProduction.endTime || '', // Legacy field
          stoppages: (entry.currentProduction.stoppages || []).map(s => ({
            reason: s.reason,
            startTime: s.startTime,
            endTime: s.endTime,
            totalTime: s.totalTime,
            remark: s.remark
          })),
          mould_change: entry.currentProduction.mouldChange || '',
          remark: entry.currentProduction.remark || '',
          part_weight_check: entry.currentProduction.partWeightCheck || '',
          cycle_time_check: entry.currentProduction.cycleTimeCheck || ''
        },
        changeover: entry.changeover.product ? {
          product: entry.changeover.product || '',
          cavity: entry.changeover.cavity || 0,
          target_cycle: entry.changeover.targetCycle || 0,
          target_run_time: entry.changeover.targetRunTime || 0,
          part_weight: entry.changeover.partWeight || 0,
          actual_part_weight: entry.changeover.actualPartWeight || 0,
          actual_cycle: entry.changeover.actualCycle || 0,
          shots_start: entry.changeover.shotsStart || 0,
          shots_end: entry.changeover.shotsEnd || 0,
          target_qty: entry.changeover.targetQty || 0,
          actual_qty: entry.changeover.actualQty || 0,
          ok_prod_qty: entry.changeover.okProdQty || 0,
          ok_prod_kgs: entry.changeover.okProdKgs || 0,
          ok_prod_percent: entry.changeover.okProdPercent || 0,
          rej_kgs: entry.changeover.rejKgs || 0,
          lumps: entry.changeover.lumps || 0,
          run_time: entry.changeover.runTime || 0,
          down_time: entry.changeover.downTime || 0,
          stoppage_reason: entry.changeover.stoppageReason || '', // Legacy field
          start_time: entry.changeover.startTime || '', // Legacy field
          end_time: entry.changeover.endTime || '', // Legacy field
          stoppages: (entry.changeover.stoppages || []).map(s => ({
            reason: s.reason,
            startTime: s.startTime,
            endTime: s.endTime,
            totalTime: s.totalTime,
            remark: s.remark
          })),
          changeover_reason: entry.changeover.remark || '',
          mould_change: entry.changeover.mouldChange || '',
          remark: entry.changeover.remark || '',
          part_weight_check: entry.changeover.partWeightCheck || '',
          cycle_time_check: entry.changeover.cycleTimeCheck || ''
        } : null
      };
    }).filter((entry: any) => entry.current_production.product || entry.changeover?.product); // Only entries with at least one production

    if (machineEntriesForApi.length === 0) {
      alert('Please add at least one machine entry with production data');
      return;
    }

    // Determine if we're editing an existing DPR or creating a new one
    const isEditMode = !!existingData?.id;
    const apiUrl = isEditMode ? `/api/dpr/${existingData!.id}` : '/api/dpr';
    const method = isEditMode ? 'PUT' : 'POST';

    try {

      // Call API to create or update DPR
      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_date: date,
          shift: shift,
          shift_incharge: shiftIncharge,
          machine_entries: machineEntriesForApi,
          ...(isEditMode ? { updated_by: 'user' } : { created_by: 'user' }) // TODO: Get from auth context
        })
      });

      const result = await response.json();

      if (!result.success) {
        alert(`Error ${isEditMode ? 'updating' : 'creating'} DPR: ${result.error}`);
        return;
      }

      // Convert API response to DPRData format for local state
      // Group machine entries by machine_no (combine current and changeover) - same as load logic
      const apiDpr = result.data;
      const machineMap = new Map<string, MachineData>();
      
      (apiDpr.dpr_machine_entries || []).forEach((me: any) => {
        const machineNo = me.machine_no;
        const isCurrent = me.section_type === 'current' && !me.is_changeover;
        const isChangeover = me.section_type === 'changeover' || me.is_changeover;
        
        if (!machineMap.has(machineNo)) {
          // Create new machine entry with empty defaults
          machineMap.set(machineNo, {
            machineNo: machineNo,
            operatorName: me.operator_name || '',
            currentProduction: {
              product: '',
              cavity: 0,
              targetCycle: 0,
              targetRunTime: 0,
              partWeight: 0,
              actualPartWeight: 0,
              actualCycle: 0,
              shotsStart: 0,
              shotsEnd: 0,
              targetQty: 0,
              actualQty: 0,
              okProdQty: 0,
              okProdKgs: 0,
              okProdPercent: 0,
              rejKgs: 0,
              lumps: 0,
              runTime: 0,
              downTime: 0,
              stoppages: [],
              stoppageReason: '',
              startTime: '',
              endTime: '',
              totalTime: 0,
              mouldChange: '',
              remark: '',
              partWeightCheck: '',
              cycleTimeCheck: ''
            },
            changeover: {
              product: '',
              cavity: 0,
              targetCycle: 0,
              targetRunTime: 0,
              partWeight: 0,
              actualPartWeight: 0,
              actualCycle: 0,
              shotsStart: 0,
              shotsEnd: 0,
              targetQty: 0,
              actualQty: 0,
              okProdQty: 0,
              okProdKgs: 0,
              okProdPercent: 0,
              rejKgs: 0,
              lumps: 0,
              runTime: 0,
              downTime: 0,
              stoppages: [],
              stoppageReason: '',
              startTime: '',
              endTime: '',
              totalTime: 0,
              mouldChange: '',
              remark: '',
              partWeightCheck: '',
              cycleTimeCheck: ''
            }
          });
        }
        
        const machine = machineMap.get(machineNo)!;
        
        // Update operator name if present
        if (me.operator_name) {
          machine.operatorName = me.operator_name;
        }
        
        // Load stoppages from dpr_stoppage_entries and sort by start_time
        const stoppages: StoppageEntry[] = (me.dpr_stoppage_entries || [])
          .map((se: any) => ({
            id: se.id || `stoppage-${Date.now()}-${Math.random()}`,
            reason: se.reason || '',
            startTime: se.start_time || '',
            endTime: se.end_time || '',
            totalTime: se.total_time_min || 0,
                  remark: se.remark || ''
                }))
                .sort((a: StoppageEntry, b: StoppageEntry) => {
                  // Sort by start_time to maintain chronological order
                  if (!a.startTime && !b.startTime) return 0;
                  if (!a.startTime) return 1;
                  if (!b.startTime) return -1;
                  return a.startTime.localeCompare(b.startTime);
                });

        // Build production data object
        const productionData = {
          product: me.product || '',
          cavity: me.cavity || 0,
          targetCycle: me.trg_cycle_sec || 0,
          targetRunTime: me.trg_run_time_min || 0,
          partWeight: me.part_wt_gm || 0,
          actualPartWeight: me.act_part_wt_gm || 0,
          actualCycle: me.act_cycle_sec || 0,
          shotsStart: me.shots_start || 0,
          shotsEnd: me.shots_end || 0,
          targetQty: me.target_qty_nos || 0,
          actualQty: me.actual_qty_nos || 0,
          okProdQty: me.ok_prod_qty_nos || 0,
          okProdKgs: me.ok_prod_kgs || 0,
          okProdPercent: me.ok_prod_percent || 0,
          rejKgs: me.rej_kgs || 0,
          lumps: me.lumps_kgs || 0,
          runTime: me.run_time_mins || 0,
          downTime: me.down_time_min || 0,
          stoppages: stoppages,
          stoppageReason: me.stoppage_reason || '', // Legacy field
          startTime: isChangeover ? (me.changeover_start_time || '') : (me.stoppage_start || ''), // Legacy field
          endTime: isChangeover ? (me.changeover_end_time || '') : (me.stoppage_end || ''), // Legacy field
          totalTime: stoppages.length > 0 ? stoppages.reduce((sum, s) => sum + (s.totalTime || 0), 0) : 0, // Calculate from stoppages
          mouldChange: me.mould_change || '',
          remark: me.remark || '',
          partWeightCheck: me.part_wt_check || '',
          cycleTimeCheck: me.cycle_time_check || ''
        };
        
        // Assign to current or changeover based on section_type
        if (isCurrent) {
          machine.currentProduction = productionData;
        } else if (isChangeover) {
          machine.changeover = productionData;
        }
      });
      
      const machinesData: MachineData[] = Array.from(machineMap.values());

      // Calculate summary
      console.log('📊 Calculating summary from', machinesData.length, 'machines');
      console.log('📊 Machine data:', machinesData.map(m => ({
        machineNo: m.machineNo,
        current: { targetQty: m.currentProduction.targetQty, okProdQty: m.currentProduction.okProdQty, okProdKgs: m.currentProduction.okProdKgs, partWeight: m.currentProduction.partWeight },
        changeover: { targetQty: m.changeover.targetQty, okProdQty: m.changeover.okProdQty, okProdKgs: m.changeover.okProdKgs, partWeight: m.changeover.partWeight }
      })));

      const summary: SummaryData = {
        targetQty: machinesData.reduce((sum, m) => sum + (m.currentProduction.targetQty || 0) + (m.changeover.targetQty || 0), 0),
        actualQty: machinesData.reduce((sum, m) => sum + (m.currentProduction.actualQty || 0) + (m.changeover.actualQty || 0), 0),
        okProdQty: machinesData.reduce((sum, m) => sum + (m.currentProduction.okProdQty || 0) + (m.changeover.okProdQty || 0), 0),
        okProdKgs: machinesData.reduce((sum, m) => sum + (m.currentProduction.okProdKgs || 0) + (m.changeover.okProdKgs || 0), 0),
        okProdPercent: 0,
        rejKgs: machinesData.reduce((sum, m) => sum + (m.currentProduction.rejKgs || 0) + (m.changeover.rejKgs || 0), 0),
        runTime: machinesData.reduce((sum, m) => sum + (m.currentProduction.runTime || 0) + (m.changeover.runTime || 0), 0),
        downTime: machinesData.reduce((sum, m) => sum + (m.currentProduction.downTime || 0) + (m.changeover.downTime || 0), 0)
      };

      console.log('📊 Summary (before okProdPercent):', {
        targetQty: summary.targetQty,
        actualQty: summary.actualQty,
        okProdQty: summary.okProdQty,
        okProdKgs: summary.okProdKgs,
        rejKgs: summary.rejKgs,
        runTime: summary.runTime,
        downTime: summary.downTime
      });

      const targetQtyKgs = machinesData.reduce((sum, m) => {
        const current = (m.currentProduction.targetQty || 0) * (m.currentProduction.partWeight || 0) / 1000;
        const changeover = (m.changeover.targetQty || 0) * (m.changeover.partWeight || 0) / 1000;
        return sum + current + changeover;
      }, 0);

      console.log('📊 targetQtyKgs calculated:', targetQtyKgs);
      summary.okProdPercent = targetQtyKgs > 0 ? (summary.okProdKgs / targetQtyKgs * 100) : 0;
      console.log('📊 okProdPercent calculated:', summary.okProdPercent, '% (okProdKgs:', summary.okProdKgs, '/ targetQtyKgs:', targetQtyKgs, ')');

      const shiftTotal: ShiftTotalData = {
        type: 'shift_total',
        label: `${shift} Shift Total`,
        targetQty: machinesData.reduce((sum, m) => sum + (m.currentProduction.targetQty || 0) + (m.changeover.targetQty || 0), 0),
        actualQty: machinesData.reduce((sum, m) => sum + (m.currentProduction.actualQty || 0) + (m.changeover.actualQty || 0), 0),
        okProdQty: machinesData.reduce((sum, m) => sum + (m.currentProduction.okProdQty || 0) + (m.changeover.okProdQty || 0), 0),
        okProdKgs: machinesData.reduce((sum, m) => sum + (m.currentProduction.okProdKgs || 0) + (m.changeover.okProdKgs || 0), 0),
        okProdPercent: 0,
        rejKgs: machinesData.reduce((sum, m) => sum + (m.currentProduction.rejKgs || 0) + (m.changeover.rejKgs || 0), 0),
        lumps: machinesData.reduce((sum, m) => sum + (m.currentProduction.lumps || 0) + (m.changeover.lumps || 0), 0),
        runTime: machinesData.reduce((sum, m) => sum + (m.currentProduction.runTime || 0) + (m.changeover.runTime || 0), 0),
        downTime: machinesData.reduce((sum, m) => sum + (m.currentProduction.downTime || 0) + (m.changeover.downTime || 0), 0),
        totalTime: machinesData.reduce((sum, m) => sum + (m.currentProduction.totalTime || 0) + (m.changeover.totalTime || 0), 0)
      };
      shiftTotal.okProdPercent = shiftTotal.targetQty > 0 ? (shiftTotal.okProdQty / shiftTotal.targetQty * 100) : 0;

      const dprData: DPRData = {
        id: apiDpr.id,
        date: apiDpr.report_date,
        shift: apiDpr.shift,
        shiftIncharge: apiDpr.shift_incharge || '',
        machines: machinesData,
        summary,
        shiftTotal,
        achievement: null
      };

      onSave(dprData);
      alert(`DPR ${isEditMode ? 'updated' : 'created'} successfully for ${new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${shift} shift`);
    } catch (error) {
      console.error('Error saving DPR:', error);
      alert(`Error ${isEditMode ? 'updating' : 'creating'} DPR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {existingData?.id ? 'Edit DPR Entry' : 'Create New DPR Entry'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* Shift Information - Compact Row */}
          <div className="mb-4 grid grid-cols-3 gap-3">
              <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  disabled
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                />
              </div>
              <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                  Shift
                </label>
                <input
                  type="text"
                  value={shift}
                  disabled
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                />
              </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                  Shift Incharge
                </label>
                <input
                  type="text"
                  value={shiftIncharge}
                  onChange={(e) => setShiftIncharge(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  placeholder="Enter shift incharge name"
                />
            </div>
          </div>

          {/* Form-based Entry for DPR */}
          <div className="space-y-4">
            {machineEntries.map((entry, index) => (
              <div key={entry.id} className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Entry {index + 1}</h3>
                  {machineEntries.length > 1 && (
                    <button
                      onClick={() => removeMachineEntry(entry.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove line"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Line, Operator Name, and Product (Mold) - All in one row */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Line *
                    </label>
                    <select
                      value={entry.machineNo}
                      onChange={(e) => {
                        setMachineEntries(prev => prev.map(en => 
                          en.id === entry.id ? { ...en, machineNo: e.target.value } : en
                        ));
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      required
                    >
                      <option value="">Select Line</option>
                      {lines.filter(line => {
                        // Only show active lines
                        if (line.status !== 'Active') return false;
                        
                        // Get all lines already selected in other entries
                        const selectedLineIds = machineEntries
                          .filter(en => en.id !== entry.id && en.machineNo)
                          .map(en => en.machineNo);
                        
                        // Show the line if:
                        // 1. It's not selected in any other entry, OR
                        // 2. It's the currently selected line for this entry (so user can see their selection)
                        return !selectedLineIds.includes(line.line_id) || entry.machineNo === line.line_id;
                      }).map(line => (
                        <option key={line.line_id} value={line.line_id}>
                          {line.description || line.line_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Operator Name
                    </label>
                    <input
                      type="text"
                      value={entry.operatorName}
                      onChange={(e) => {
                        setMachineEntries(prev => prev.map(en => 
                          en.id === entry.id ? { ...en, operatorName: e.target.value } : en
                        ));
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      placeholder="Enter operator name"
                    />
                </div>

                  <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Product (Mold) * <span className="text-xs text-gray-500">(Unavailable molds shown in red)</span>
                  </label>
                  <select
                    value={entry.currentProduction.product || ''}
                    onChange={(e) => handleProductSelect(entry.id, e.target.value, false)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Select Mold</option>
                    {molds.map(mold => {
                      const moldName = mold.mold_name || mold.item_name || '';
                      if (!moldName) return null;
                      const isAvailable = isMoldAvailable(moldName, entry.id, false);
                      return (
                        <option 
                          key={mold.mold_id} 
                          value={moldName}
                          disabled={!isAvailable}
                          className={!isAvailable ? 'text-red-500 bg-red-50' : ''}
                        >
                          {moldName} {!isAvailable ? '(In Use)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  </div>
                </div>

                {/* Cavity, Trg Cycle, Part Wt - In one row */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cavity</label>
                    <input
                      type="number"
                      value={entry.currentProduction.cavity || ''}
                      readOnly
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Trg Cycle (sec)</label>
                    <input
                      type="number"
                      value={entry.currentProduction.targetCycle || ''}
                      readOnly
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Part Wt (gm)</label>
                    <input
                      type="number"
                      value={entry.currentProduction.partWeight || ''}
                      readOnly
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                    />
                  </div>
                </div>

                {/* Production Input Fields - All in One Row */}
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-800 mb-2">Production Input Fields</h4>
                  <div className="grid grid-cols-7 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Trg Run Time (min) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.currentProduction.targetRunTime || ''}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0;
                          handleFieldChange(entry.id, 'targetRunTime', newValue, false);
                          // Clear time sum error when user starts typing
                          const errorKey = `${entry.id}-timeSum`;
                          if (validationErrors[errorKey]) {
                            setValidationErrors(prev => {
                              const updated = { ...prev };
                              delete updated[errorKey];
                              return updated;
                            });
                          }
                        }}
                        onBlur={() => validateTimeSum(entry.id)}
                        data-error-key={`${entry.id}-timeSum`}
                        className={`w-full px-2 py-1.5 border rounded text-sm ${
                          validationErrors[`${entry.id}-timeSum`] 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-300'
                        }`}
                        required
                      />
                      {validationErrors[`${entry.id}-timeSum`] && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors[`${entry.id}-timeSum`]}</p>
                      )}
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Act part wt (gm) *</label>
                      <div className="flex gap-1 items-center min-w-0">
                        <input
                          type="number"
                          step="0.01"
                          value={entry.currentProduction.actualPartWeight || ''}
                          onChange={(e) => {
                            const newValue = e.target.value === '' ? '' : parseFloat(e.target.value);
                            // Clear error when user starts typing
                            const errorKey = `${entry.id}-actualPartWeight-current`;
                            if (validationErrors[errorKey]) {
                              setValidationErrors(prev => {
                                const updated = { ...prev };
                                delete updated[errorKey];
                                return updated;
                              });
                            }
                            // Allow typing, validate on blur
                            if (newValue === '' || !isNaN(newValue as number)) {
                              handleFieldChange(entry.id, 'actualPartWeight', newValue === '' ? 0 : newValue, false);
                            }
                          }}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            const targetWeight = entry.currentProduction.partWeight || 0;
                            const errorKey = `${entry.id}-actualPartWeight-current`;
                            // Validate: Must be within ±3 gm of target
                            if (targetWeight > 0 && newValue > 0) {
                              const diff = Math.abs(newValue - targetWeight);
                              if (diff > 3) {
                                setValidationErrors(prev => ({
                                  ...prev,
                                  [errorKey]: `Must be within ±3 gm of target (${targetWeight} gm). Current difference: ${diff.toFixed(2)} gm`
                                }));
                              } else {
                                setValidationErrors(prev => {
                                  const updated = { ...prev };
                                  delete updated[errorKey];
                                  return updated;
                                });
                              }
                            }
                          }}
                          data-error-key={`${entry.id}-actualPartWeight-current`}
                          className={`flex-1 min-w-0 px-2 py-1.5 border rounded text-sm ${
                            validationErrors[`${entry.id}-actualPartWeight-current`] 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                          required
                        />
                        {entry.currentProduction.partWeightCheck === 'OK' && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                            OK
                          </span>
                        )}
                        {entry.currentProduction.partWeightCheck === 'NOT OK' && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                            NOT OK
                          </span>
                        )}
                      </div>
                      {validationErrors[`${entry.id}-actualPartWeight-current`] && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors[`${entry.id}-actualPartWeight-current`]}</p>
                      )}
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Act Cycle (sec) *</label>
                      <div className="flex gap-1 items-center min-w-0">
                        <input
                          type="number"
                          step="0.01"
                          value={entry.currentProduction.actualCycle || ''}
                          onChange={(e) => {
                            const newValue = e.target.value === '' ? '' : parseFloat(e.target.value);
                            // Clear error when user starts typing
                            const errorKey = `${entry.id}-actualCycle-current`;
                            if (validationErrors[errorKey]) {
                              setValidationErrors(prev => {
                                const updated = { ...prev };
                                delete updated[errorKey];
                                return updated;
                              });
                            }
                            // Allow typing, validate on blur
                            if (newValue === '' || !isNaN(newValue as number)) {
                              handleFieldChange(entry.id, 'actualCycle', newValue === '' ? 0 : newValue, false);
                            }
                          }}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            const targetCycle = entry.currentProduction.targetCycle || 0;
                            const errorKey = `${entry.id}-actualCycle-current`;
                            // Validate: Must be within ±2 sec of target
                            if (targetCycle > 0 && newValue > 0) {
                              const diff = Math.abs(newValue - targetCycle);
                              if (diff > 2) {
                                setValidationErrors(prev => ({
                                  ...prev,
                                  [errorKey]: `Must be within ±2 sec of target (${targetCycle} sec). Current difference: ${diff.toFixed(2)} sec`
                                }));
                              } else {
                                setValidationErrors(prev => {
                                  const updated = { ...prev };
                                  delete updated[errorKey];
                                  return updated;
                                });
                              }
                            }
                          }}
                          data-error-key={`${entry.id}-actualCycle-current`}
                          className={`flex-1 min-w-0 px-2 py-1.5 border rounded text-sm ${
                            validationErrors[`${entry.id}-actualCycle-current`] 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                          required
                        />
                        {entry.currentProduction.cycleTimeCheck === 'OK' && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                            OK
                          </span>
                        )}
                        {entry.currentProduction.cycleTimeCheck === 'NOT OK' && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                            NOT OK
                          </span>
                        )}
                      </div>
                      {validationErrors[`${entry.id}-actualCycle-current`] && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors[`${entry.id}-actualCycle-current`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Shots Start *</label>
                      <input
                        type="number"
                        value={entry.currentProduction.shotsStart !== undefined ? entry.currentProduction.shotsStart : 0}
                        onChange={(e) => {
                          const numVal = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          handleFieldChange(entry.id, 'shotsStart', isNaN(numVal) ? 0 : numVal, false);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Shots End *</label>
                      <input
                        type="number"
                        value={entry.currentProduction.shotsEnd !== undefined ? entry.currentProduction.shotsEnd : 0}
                        onChange={(e) => {
                          const numVal = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          handleFieldChange(entry.id, 'shotsEnd', isNaN(numVal) ? 0 : numVal, false);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ok Prod Qty (Nos) *</label>
                      <input
                        type="number"
                        value={entry.currentProduction.okProdQty || ''}
                        onChange={(e) => handleFieldChange(entry.id, 'okProdQty', parseFloat(e.target.value) || 0, false)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">lumps (KG)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.currentProduction.lumps || ''}
                        onChange={(e) => handleFieldChange(entry.id, 'lumps', parseFloat(e.target.value) || 0, false)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculated Fields Display - All in One Row */}
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-800 mb-2">Calculated Fields</h4>
                  <div className="grid grid-cols-7 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Target Qty (Nos)</label>
                      <input
                        type="number"
                        value={entry.currentProduction.targetQty?.toFixed(0) || '0'}
                        readOnly
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Actual Qty (Nos)</label>
                      <input
                        type="number"
                        value={entry.currentProduction.actualQty?.toFixed(0) || '0'}
                        readOnly
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ok Prod (Kgs)</label>
                      <input
                        type="number"
                        value={entry.currentProduction.okProdKgs?.toFixed(2) || '0.00'}
                        readOnly
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ok Prod (%)</label>
                      <input
                        type="number"
                        value={entry.currentProduction.okProdPercent ? (entry.currentProduction.okProdPercent * 100).toFixed(2) : '0.00'}
                        readOnly
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rej (Kgs)</label>
                      <input
                        type="number"
                        value={entry.currentProduction.rejKgs?.toFixed(2) || '0.00'}
                        readOnly
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Run Time (mins)</label>
                      <input
                        type="number"
                        value={entry.currentProduction.runTime?.toFixed(2) || '0.00'}
                        readOnly
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Down time (min)</label>
                      <input
                        type="number"
                        value={entry.currentProduction.downTime?.toFixed(2) || '0.00'}
                        readOnly
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Stoppage Time and Remarks - Multiple Stoppages */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-800">Stoppage Time and Remarks</h4>
                    <button
                      type="button"
                      onClick={() => addStoppage(entry.id, false)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      <Plus size={14} />
                      Add Stoppage
                    </button>
                  </div>
                  
                  {/* List of stoppages */}
                  {((entry.currentProduction.stoppages || []).length > 0) ? (
                    <div className="space-y-2">
                      {(() => {
                        const stoppages = entry.currentProduction.stoppages || [];
                        // Find the index of the first "Mold Change" stoppage
                        const firstMoldChangeIndex = stoppages.findIndex(s => s.reason === 'Mold Change');
                        
                        // If no Mold Change exists, render all stoppages normally
                        if (firstMoldChangeIndex === -1) {
                          return stoppages.map((stoppage, idx) => (
                            <div key={stoppage.id} className="border border-gray-300 rounded p-2 bg-gray-50">
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">Stoppage #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeStoppage(entry.id, stoppage.id, false)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                                  <select
                                    value={stoppage.reason || ''}
                                    onChange={(e) => updateStoppage(entry.id, stoppage.id, 'reason', e.target.value, false)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="">Select reason</option>
                                    <option value="Mold Change">Mold Change</option>
                                    <option value="Power Failure">Power Failure</option>
                                    <option value="Machine Issue">Machine Issue</option>
                                    <option value="Robot Issue">Robot Issue</option>
                                    <option value="Mold Issue">Mold Issue</option>
                                    <option value="Other Issue">Other Issue</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                                  <input
                                    type="time"
                                    value={stoppage.startTime || ''}
                                    onChange={(e) => updateStoppage(entry.id, stoppage.id, 'startTime', e.target.value, false)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                                  <input
                                    type="time"
                                    value={stoppage.endTime || ''}
                                    onChange={(e) => updateStoppage(entry.id, stoppage.id, 'endTime', e.target.value, false)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Total Time (min)</label>
                                  <input
                                    type="number"
                                    value={stoppage.totalTime?.toFixed(2) || '0.00'}
                                    readOnly
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">REMARK</label>
                                  <input
                                    type="text"
                                    value={stoppage.remark || ''}
                                    onChange={(e) => updateStoppage(entry.id, stoppage.id, 'remark', e.target.value, false)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    placeholder="Enter remarks"
                                  />
                                </div>
                              </div>
                            </div>
                          ));
                        }
                        
                        // Split into: before first Mold Change, Mold Change(s), after first Mold Change (non-Mold Change only)
                        const beforeMoldChange = stoppages.slice(0, firstMoldChangeIndex);
                        const moldChangeStoppages = stoppages.filter(s => s.reason === 'Mold Change');
                        const afterMoldChange = stoppages
                          .slice(firstMoldChangeIndex + 1)
                          .filter(s => s.reason !== 'Mold Change');
                        
                        let stoppageCounter = 0;
                        const renderStoppage = (stoppage: any) => {
                          stoppageCounter++;
                          return (
                            <div key={stoppage.id} className="border border-gray-300 rounded p-2 bg-gray-50">
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">Stoppage #{stoppageCounter}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // If removing a "Mold Change" stoppage, clear changeover
                                    if (stoppage.reason === 'Mold Change' && entry.changeover.product) {
                                      setMachineEntries(prev => prev.map(en => 
                                        en.id === entry.id ? {
                                          ...en,
                                          changeover: {
                                            ...en.changeover,
                                            product: '',
                                            targetRunTime: 0,
                                            actualPartWeight: 0,
                                            actualCycle: 0,
                                            shotsStart: 0,
                                            shotsEnd: 0,
                                            okProdQty: 0,
                                            lumps: 0
                                          }
                                        } : en
                                      ));
                                    }
                                    removeStoppage(entry.id, stoppage.id, false);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                                  <select
                                    value={stoppage.reason || ''}
                                    onChange={(e) => {
                                      const newReason = e.target.value;
                                      updateStoppage(entry.id, stoppage.id, 'reason', newReason, false);
                                      // Clear changeover data if reason is changed away from "Mold Change"
                                      if (newReason !== 'Mold Change' && entry.changeover.product) {
                                        setMachineEntries(prev => prev.map(en => 
                                          en.id === entry.id ? {
                                            ...en,
                                            changeover: {
                                              ...en.changeover,
                                              product: '',
                                              targetRunTime: 0,
                                              actualPartWeight: 0,
                                              actualCycle: 0,
                                              shotsStart: 0,
                                              shotsEnd: 0,
                                              okProdQty: 0,
                                              lumps: 0
                                            }
                                          } : en
                                        ));
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="">Select reason</option>
                                    <option value="Mold Change">Mold Change</option>
                                    <option value="Power Failure">Power Failure</option>
                                    <option value="Machine Issue">Machine Issue</option>
                                    <option value="Robot Issue">Robot Issue</option>
                                    <option value="Mold Issue">Mold Issue</option>
                                    <option value="Other Issue">Other Issue</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                                  <input
                                    type="time"
                                    value={stoppage.startTime || ''}
                                    onChange={(e) => updateStoppage(entry.id, stoppage.id, 'startTime', e.target.value, false)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                                  <input
                                    type="time"
                                    value={stoppage.endTime || ''}
                                    onChange={(e) => updateStoppage(entry.id, stoppage.id, 'endTime', e.target.value, false)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Total Time (min)</label>
                                  <input
                                    type="number"
                                    value={stoppage.totalTime?.toFixed(2) || '0.00'}
                                    readOnly
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">REMARK</label>
                                  <input
                                    type="text"
                                    value={stoppage.remark || ''}
                                    onChange={(e) => updateStoppage(entry.id, stoppage.id, 'remark', e.target.value, false)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    placeholder="Enter remarks"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        };
                        
                        return (
                          <>
                            {/* Stoppages before Mold Change */}
                            {beforeMoldChange.map(renderStoppage)}
                            
                            {/* Mold Change stoppages */}
                            {moldChangeStoppages.map(renderStoppage)}
                            
                            {/* Changeover UI section - appears right after Mold Change */}
                            <div className="mt-3 border-t-2 border-orange-200 pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-orange-800 flex items-center">
                                  <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded mr-2 text-xs">CHANGEOVER</span>
                                  Mold Change
                                </h4>
                                <span className="text-xs text-gray-500">Select a different mold if there was a changeover during the shift</span>
                              </div>
                              
                              {/* Changeover Product Selection */}
                              <div className="mb-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Changeover Product (Mold) <span className="text-xs text-gray-500">(Selecting releases current mold for other lines)</span>
                                </label>
                                <select
                                  value={entry.changeover.product || ''}
                                  onChange={(e) => handleProductSelect(entry.id, e.target.value, true)}
                                  className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-orange-50"
                                >
                                  <option value="">No Changeover</option>
                                  {molds.map(mold => {
                                    const moldName = mold.mold_name || mold.item_name || '';
                                    if (!moldName) return null;
                                    const isAvailable = isMoldAvailable(moldName, entry.id, true);
                                    const isSameAsCurrent = moldName === entry.currentProduction.product;
                                    return (
                                      <option 
                                        key={mold.mold_id} 
                                        value={moldName}
                                        disabled={!isAvailable || isSameAsCurrent}
                                        className={(!isAvailable || isSameAsCurrent) ? 'text-red-500 bg-red-50' : ''}
                                      >
                                        {moldName} {isSameAsCurrent ? '(Current)' : !isAvailable ? '(In Use)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* Changeover Fields - Only show if changeover product is selected */}
                              {entry.changeover.product && (
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                  {/* Cavity, Trg Cycle, Part Wt - In one row */}
                                  <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Cavity</label>
                                      <input
                                        type="number"
                                        value={entry.changeover.cavity || ''}
                                        readOnly
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Trg Cycle (sec)</label>
                                      <input
                                        type="number"
                                        value={entry.changeover.targetCycle || ''}
                                        readOnly
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Part Wt (gm)</label>
                                      <input
                                        type="number"
                                        value={entry.changeover.partWeight || ''}
                                        readOnly
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                      />
                                    </div>
                                  </div>

                                  {/* Production Input Fields - All in One Row */}
                                  <div className="mb-3">
                                    <h4 className="text-xs font-semibold text-gray-800 mb-2">Production Input Fields</h4>
                                    <div className="grid grid-cols-7 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Trg Run Time (min) *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={entry.changeover.targetRunTime || ''}
                                        onChange={(e) => {
                                          const newValue = parseFloat(e.target.value) || 0;
                                          handleFieldChange(entry.id, 'targetRunTime', newValue, true);
                                          const errorKey = `${entry.id}-timeSum`;
                                          if (validationErrors[errorKey]) {
                                            setValidationErrors(prev => {
                                              const updated = { ...prev };
                                              delete updated[errorKey];
                                              return updated;
                                            });
                                          }
                                        }}
                                        onBlur={() => validateTimeSum(entry.id)}
                                        data-error-key={`${entry.id}-timeSum`}
                                        className={`w-full px-2 py-1.5 border rounded text-sm ${
                                          validationErrors[`${entry.id}-timeSum`] 
                                            ? 'border-red-500 bg-red-50' 
                                            : 'border-gray-300'
                                        }`}
                                        required
                                      />
                                      {validationErrors[`${entry.id}-timeSum`] && (
                                        <p className="text-xs text-red-600 mt-1">{validationErrors[`${entry.id}-timeSum`]}</p>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Act part wt (gm) *</label>
                                      <div className="flex gap-1 items-center min-w-0">
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={entry.changeover.actualPartWeight || ''}
                                        onChange={(e) => {
                                          const newValue = e.target.value === '' ? '' : parseFloat(e.target.value);
                                          const errorKey = `${entry.id}-actualPartWeight-changeover`;
                                          if (validationErrors[errorKey]) {
                                            setValidationErrors(prev => {
                                              const updated = { ...prev };
                                              delete updated[errorKey];
                                              return updated;
                                            });
                                          }
                                          if (newValue === '' || !isNaN(newValue as number)) {
                                            handleFieldChange(entry.id, 'actualPartWeight', newValue === '' ? 0 : newValue, true);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const newValue = parseFloat(e.target.value) || 0;
                                          const targetWeight = entry.changeover.partWeight || 0;
                                          const errorKey = `${entry.id}-actualPartWeight-changeover`;
                                          if (targetWeight > 0 && newValue > 0) {
                                            const diff = Math.abs(newValue - targetWeight);
                                            if (diff > 3) {
                                              setValidationErrors(prev => ({
                                                ...prev,
                                                [errorKey]: `Must be within ±3 gm of target (${targetWeight} gm). Current difference: ${diff.toFixed(2)} gm`
                                              }));
                                            } else {
                                              setValidationErrors(prev => {
                                                const updated = { ...prev };
                                                delete updated[errorKey];
                                                return updated;
                                              });
                                            }
                                          }
                                        }}
                                        data-error-key={`${entry.id}-actualPartWeight-changeover`}
                                        className={`flex-1 min-w-0 px-2 py-1.5 border rounded text-sm ${
                                          validationErrors[`${entry.id}-actualPartWeight-changeover`] 
                                            ? 'border-red-500 bg-red-50' 
                                            : 'border-gray-300'
                                        }`}
                                        required
                                      />
                                      {entry.changeover.partWeightCheck === 'OK' && (
                                        <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                                          OK
                                        </span>
                                      )}
                                      {entry.changeover.partWeightCheck === 'NOT OK' && (
                                        <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                                          NOT OK
                                        </span>
                                      )}
                                    </div>
                                      {validationErrors[`${entry.id}-actualPartWeight-changeover`] && (
                                        <p className="text-xs text-red-600 mt-1">{validationErrors[`${entry.id}-actualPartWeight-changeover`]}</p>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Act Cycle (sec) *</label>
                                      <div className="flex gap-1 items-center min-w-0">
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={entry.changeover.actualCycle || ''}
                                        onChange={(e) => {
                                          const newValue = e.target.value === '' ? '' : parseFloat(e.target.value);
                                          const errorKey = `${entry.id}-actualCycle-changeover`;
                                          if (validationErrors[errorKey]) {
                                            setValidationErrors(prev => {
                                              const updated = { ...prev };
                                              delete updated[errorKey];
                                              return updated;
                                            });
                                          }
                                          if (newValue === '' || !isNaN(newValue as number)) {
                                            handleFieldChange(entry.id, 'actualCycle', newValue === '' ? 0 : newValue, true);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const newValue = parseFloat(e.target.value) || 0;
                                          const targetCycle = entry.changeover.targetCycle || 0;
                                          const errorKey = `${entry.id}-actualCycle-changeover`;
                                          if (targetCycle > 0 && newValue > 0) {
                                            const diff = Math.abs(newValue - targetCycle);
                                            if (diff > 2) {
                                              setValidationErrors(prev => ({
                                                ...prev,
                                                [errorKey]: `Must be within ±2 sec of target (${targetCycle} sec). Current difference: ${diff.toFixed(2)} sec`
                                              }));
                                            } else {
                                              setValidationErrors(prev => {
                                                const updated = { ...prev };
                                                delete updated[errorKey];
                                                return updated;
                                              });
                                            }
                                          }
                                        }}
                                        data-error-key={`${entry.id}-actualCycle-changeover`}
                                        className={`flex-1 min-w-0 px-2 py-1.5 border rounded text-sm ${
                                          validationErrors[`${entry.id}-actualCycle-changeover`] 
                                            ? 'border-red-500 bg-red-50' 
                                            : 'border-gray-300'
                                        }`}
                                        required
                                      />
                                      {entry.changeover.cycleTimeCheck === 'OK' && (
                                        <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                                          OK
                                        </span>
                                      )}
                                      {entry.changeover.cycleTimeCheck === 'NOT OK' && (
                                        <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                                          NOT OK
                                        </span>
                                      )}
                                    </div>
                                      {validationErrors[`${entry.id}-actualCycle-changeover`] && (
                                        <p className="text-xs text-red-600 mt-1">{validationErrors[`${entry.id}-actualCycle-changeover`]}</p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Shots Start *</label>
                                      <input
                                        type="number"
                                        value={entry.changeover.shotsStart !== undefined ? entry.changeover.shotsStart : 0}
                                        onChange={(e) => {
                                          const numVal = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                          handleFieldChange(entry.id, 'shotsStart', isNaN(numVal) ? 0 : numVal, true);
                                        }}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Shots End *</label>
                                      <input
                                        type="number"
                                        value={entry.changeover.shotsEnd !== undefined ? entry.changeover.shotsEnd : 0}
                                        onChange={(e) => {
                                          const numVal = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                          handleFieldChange(entry.id, 'shotsEnd', isNaN(numVal) ? 0 : numVal, true);
                                        }}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Ok Prod Qty (Nos) *</label>
                                      <input
                                        type="number"
                                        value={entry.changeover.okProdQty || ''}
                                        onChange={(e) => handleFieldChange(entry.id, 'okProdQty', parseFloat(e.target.value) || 0, true)}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">lumps (KG)</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={entry.changeover.lumps || ''}
                                        onChange={(e) => handleFieldChange(entry.id, 'lumps', parseFloat(e.target.value) || 0, true)}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                        placeholder="0.00"
                                      />
                                    </div>
                                    </div>
                                  </div>

                                  {/* Calculated Fields Display - All in One Row */}
                                  <div className="mb-3">
                                    <h4 className="text-xs font-semibold text-gray-800 mb-2">Calculated Fields</h4>
                                    <div className="grid grid-cols-7 gap-2">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Target Qty (Nos)</label>
                                        <input
                                          type="number"
                                          value={entry.changeover.targetQty?.toFixed(0) || '0'}
                                          readOnly
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Actual Qty (Nos)</label>
                                        <input
                                          type="number"
                                          value={entry.changeover.actualQty?.toFixed(0) || '0'}
                                          readOnly
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Ok Prod (Kgs)</label>
                                        <input
                                          type="number"
                                          value={entry.changeover.okProdKgs?.toFixed(2) || '0.00'}
                                          readOnly
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Ok Prod (%)</label>
                                        <input
                                          type="number"
                                          value={entry.changeover.okProdPercent ? (entry.changeover.okProdPercent * 100).toFixed(2) : '0.00'}
                                          readOnly
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Rej (Kgs)</label>
                                        <input
                                          type="number"
                                          value={entry.changeover.rejKgs?.toFixed(2) || '0.00'}
                                          readOnly
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Run Time (mins)</label>
                                        <input
                                          type="number"
                                          value={entry.changeover.runTime?.toFixed(2) || '0.00'}
                                          readOnly
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Down time (min)</label>
                                        <input
                                          type="number"
                                          value={entry.changeover.downTime?.toFixed(2) || '0.00'}
                                          readOnly
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Stoppages after Mold Change */}
                            {afterMoldChange.map(renderStoppage)}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No stoppages recorded. Click "Add Stoppage" to add one.</p>
                  )}
                  
                  {/* Total Stoppage Time */}
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-700">Total Stoppage Time (min)</label>
                      <input
                        type="number"
                        value={entry.currentProduction.totalTime?.toFixed(2) || '0.00'}
                        readOnly
                        className="w-32 px-2 py-1.5 border rounded text-sm bg-gray-100 border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addMachineEntry}
              className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Line
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-2 p-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            Save DPR
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionModule;
