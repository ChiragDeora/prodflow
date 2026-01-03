// Maintenance Management Types
export interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  task_type: 'preventive' | 'corrective' | 'emergency' | 'line_maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  machine_id?: string;
  line_id?: string;
  unit?: string;
  assigned_to?: string;
  assigned_by?: string;
  due_date: string;
  estimated_duration_hours?: number;
  actual_duration_hours?: number;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  checklist_items?: any;
  parts_required?: any;
  cost_estimate?: number;
  actual_cost?: number;
  notes?: string;
}

// Breakdown Maintenance Interfaces
export interface BreakdownMaintenanceTask {
  id: string;
  title: string;
  description?: string;
  breakdown_type: 'emergency' | 'corrective' | 'urgent_repair';
  failure_reason?: string;
  failure_category?: string;
  downtime_hours?: number;
  impact_on_production?: 'high' | 'medium' | 'low' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  machine_id?: string;
  line_id?: string;
  unit?: string;
  assigned_to?: string;
  assigned_by?: string;
  reported_by?: string;
  reported_at?: string;
  due_date: string;
  estimated_duration_hours?: number;
  actual_duration_hours?: number;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  root_cause_analysis?: string;
  corrective_action_taken?: string;
  preventive_measures?: string;
  parts_used?: any;
  parts_cost?: number;
  labor_cost?: number;
  total_cost?: number;
  notes?: string;
}

// Mold Breakdown Maintenance Interface
export interface MoldBreakdownMaintenanceTask {
  id: string;
  title: string;
  description?: string;
  breakdown_type: 'emergency' | 'corrective' | 'urgent_repair';
  failure_reason?: string;
  // Mold-specific failure fields
  air_valve_pressure_broken?: boolean;
  valve_broken?: boolean;
  hrc_not_working?: boolean;
  heating_element_failed?: boolean;
  cooling_channel_blocked?: boolean;
  ejector_pin_broken?: boolean;
  sprue_bushing_damaged?: boolean;
  cavity_damage?: boolean;
  core_damage?: boolean;
  vent_blocked?: boolean;
  gate_damage?: boolean;
  other_issues?: string;
  downtime_hours?: number;
  impact_on_production?: 'high' | 'medium' | 'low' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  mold_id: string;
  machine_id?: string;
  line_id?: string;
  unit?: string;
  assigned_to?: string;
  assigned_by?: string;
  reported_by?: string;
  reported_at?: string;
  due_date: string;
  estimated_duration_hours?: number;
  actual_duration_hours?: number;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  root_cause_analysis?: string;
  corrective_action_taken?: string;
  preventive_measures?: string;
  parts_used?: any;
  parts_cost?: number;
  labor_cost?: number;
  total_cost?: number;
  notes?: string;
}

// Preventive Maintenance Interfaces
export interface PreventiveMaintenanceTask {
  id: string;
  title: string;
  description?: string;
  maintenance_type: 'scheduled' | 'routine' | 'inspection' | 'calibration' | 'lubrication' | 'cleaning';
  schedule_frequency?: string;
  schedule_id?: string;
  next_due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled' | 'skipped';
  machine_id?: string;
  line_id?: string;
  unit?: string;
  assigned_to?: string;
  assigned_by?: string;
  due_date: string;
  scheduled_date?: string;
  estimated_duration_hours?: number;
  actual_duration_hours?: number;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  checklist_items?: any;
  checklist_completed?: boolean;
  parts_required?: any;
  parts_used?: any;
  parts_cost?: number;
  labor_cost?: number;
  total_cost?: number;
  inspection_notes?: string;
  findings?: string;
  recommendations?: string;
  notes?: string;
  is_recurring?: boolean;
  recurrence_interval?: number;
  recurrence_unit?: string;
  last_completed_date?: string;
  completion_count?: number;
}

export interface PreventiveMaintenanceSchedule {
  id: string;
  name: string;
  description?: string;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  frequency_value: number;
  frequency_unit: 'days' | 'weeks' | 'months' | 'years';
  start_date: string;
  end_date?: string;
  is_active?: boolean;
  machine_id?: string;
  line_id?: string;
  unit?: string;
  task_template?: any;
  checklist_template?: any;
  estimated_duration_hours?: number;
  created_at?: string;
  updated_at?: string;
  last_generated_date?: string;
}

export interface MaintenanceSchedule {
  id: string;
  name: string;
  description?: string;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  machine_id?: string;
  line_id?: string;
  unit?: string;
  frequency_value: number;
  frequency_unit: 'days' | 'weeks' | 'months' | 'years';
  start_date: string;
  end_date?: string;
  is_active: boolean;
  task_template_id?: string;
  checklist_template?: any;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceChecklist {
  id: string;
  name: string;
  description?: string;
  checklist_type: 'machine' | 'line' | 'general';
  machine_id?: string;
  line_id?: string;
  unit?: string;
  items: any;
  estimated_duration_minutes?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceHistory {
  id: string;
  task_id: string;
  machine_id?: string;
  line_id?: string;
  unit?: string;
  action_type: 'created' | 'started' | 'updated' | 'completed' | 'cancelled';
  action_description?: string;
  performed_by?: string;
  performed_at?: string;
  metadata?: any;
}

