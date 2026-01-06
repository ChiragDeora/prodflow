export interface Unit {
  id: string;
  name: string;
  description?: string;
  location?: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  created_at?: string;
  updated_at?: string;
}

export interface UnitManagementSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Line {
  line_id: string;
  // line_name?: string;
  description?: string;
  im_machine_id?: string;
  robot_machine_id?: string;
  conveyor_machine_id?: string;
  hoist_machine_id?: string;
  loader_machine_id?: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  unit?: string;
  grinding?: boolean;
  created_at?: string;
  updated_at?: string;
}

