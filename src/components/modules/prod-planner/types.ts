import { Line, Mold, PackingMaterial, ColorLabel, PartyName } from '../../../lib/supabase';

// Production Line type
export interface ProductionLine {
  id: string;
  name: string;
  color: string;
  lineData?: Line;
  isActive?: boolean;
  im_machine_id?: string;
  robot_machine_id?: string;
  conveyor_machine_id?: string;
  hoist_machine_id?: string;
  status?: 'Active' | 'Inactive' | 'Maintenance';
  grinding?: boolean;
}

// Color segment within a production block
export interface ColorSegment {
  color: string;
  label?: string;
  startDay: number;
  endDay: number;
}

// Product color with quantity
export interface ProductColor {
  color: string;
  quantity: number;
  partyCode?: string;
}

// Packing material selection
export interface PackingMaterialSelection {
  packingMaterialId: string;
  quantity: number;
}

// Production block definition
export interface ProductionBlock {
  id: string;
  lineId: string;
  startDay: string;
  endDay: string;
  label: string;
  color: string;
  colorSegments?: ColorSegment[];
  productColors?: ProductColor[];
  partyCodes?: string[];
  changeoverProductColors?: ProductColor[];
  changeoverPartyCodes?: string[];
  packingMaterials?: {
    boxes?: PackingMaterialSelection[];
    polybags?: PackingMaterialSelection[];
    bopp?: PackingMaterialSelection[];
  };
  notes?: string;
  duration: number;
  moldId?: string;
  moldData?: Mold;
  isResizingLeft?: boolean;
  isChangeover?: boolean;
  changeoverStartDay?: string;
  changeoverEndDay?: string;
  changeoverTime?: number;
  changeoverTimeString?: string;
  changeoverTimeMode?: 'minutes' | 'time';
  changeoverMoldId?: string;
  changeoverMoldData?: Mold;
  isChangeoverBlock?: boolean;
}

// Day line data for grid
export interface DayLineData {
  color: string;
  quantity: number;
  changeoverTime: string;
  extendDays: number;
  packingMaterialId?: string;
  packingMaterialQty?: number;
  changeoverMoldName?: string;
  logEntries?: Array<{
    type: 'color' | 'packing' | 'changeover';
    date: string;
    time: string;
    value: string;
    qty?: number;
  }>;
}

// Drag state
export interface DragState {
  mouseX: number;
  mouseY: number;
  initialLineIndex: number;
  initialStartDay: number;
  initialEndDay: number;
}

// Drag preview
export interface DragPreview {
  x: number;
  y: number;
  block: ProductionBlock;
}

// Tooltip position
export interface TooltipPosition {
  x: number;
  y: number;
}

// Props
export interface ProdPlannerProps {
  // Add any props if needed
}

// Re-export types
export type { Line, Mold, PackingMaterial, ColorLabel, PartyName };

