import { 
  Machine as SupabaseMachine, 
  Mold as SupabaseMold, 
  ScheduleJob as SupabaseScheduleJob,
  RawMaterial as SupabaseRawMaterial,
  PackingMaterial as SupabasePackingMaterial,
  Line as SupabaseLine,
  ColorLabel,
  PartyName,
  Unit
} from '../../lib/supabase';

// Re-export types from Supabase
export type Machine = SupabaseMachine;
export type Mold = SupabaseMold;
export type ScheduleJob = SupabaseScheduleJob;
export type RawMaterial = SupabaseRawMaterial;
export type PackingMaterial = SupabasePackingMaterial;
export type Line = SupabaseLine;
export type { ColorLabel, PartyName, Unit };

// Form types
export interface JobForm {
  date: string;
  shift: 'Day' | 'Evening' | 'Night';
  machine_id: string;
  mold_id: string;
  start_time: string;
  end_time: string;
  color: string;
  expected_pieces: string;
  stacks_per_box: string;
  pieces_per_stack: string;
  created_by: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// Module and action types
export type ModuleType = 'welcome-dashboard' | 'scheduler' | 'masters' | 'approvals' | 'reports' | 'maintenance' | 'quality' | 'profile' | 'production' | 'store-dispatch' | 'prod-planner';

export type ModalType = 
  | 'job' 
  | 'machine' 
  | 'mold' 
  | 'packing_material' 
  | 'raw_material' 
  | 'line' 
  | 'view_machine' 
  | 'view_mold' 
  | 'view_schedule' 
  | 'view_packing_material' 
  | 'view_raw_material' 
  | 'view_line' 
  | 'edit_line' 
  | 'color_label' 
  | 'party_name' 
  | 'view_color_label' 
  | 'view_party_name' 
  | '';

export type ActionType = 'edit' | 'delete' | 'view' | 'approve' | 'mark_done';

export type ItemType = 
  | 'machine' 
  | 'mold' 
  | 'schedule' 
  | 'material' 
  | 'product' 
  | 'raw_material' 
  | 'packing_material' 
  | 'line' 
  | 'color_label' 
  | 'party_name';

export type DataType = 
  | 'machines' 
  | 'molds' 
  | 'raw_materials' 
  | 'packing_materials' 
  | 'lines' 
  | 'color_labels' 
  | 'party_names';

// Column info for info modals
export interface ColumnInfo {
  column: string;
  description: string;
}

// Sorting types
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: string;
  direction: SortDirection;
}

// Filtered data result
export interface FilteredData {
  machines: Machine[];
  molds: Mold[];
  lines: Line[];
  rawMaterials: RawMaterial[];
  packingMaterials: PackingMaterial[];
}

