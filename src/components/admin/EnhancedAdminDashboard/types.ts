// Types
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  status: string;
  department?: string;
  jobTitle?: string;
  isRootAdmin: boolean;
  requiresPasswordReset: boolean;
  lastLogin?: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  accessScope?: 'FACTORY_ONLY' | 'UNIVERSAL';
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'approve' | 'managePermissions';
  scope_level: 'global' | 'resource' | 'record' | 'field';
  field_mode?: 'visible' | 'editable' | 'mask';
  mask_type?: string;
  is_allow: boolean;
  resource_id?: string;
  resource?: {
    id: string;
    name: string;
    description: string;
    table_name?: string;
  };
  field_id?: string;
  field?: {
    id: string;
    field_name: string;
    field_type: string;
    is_sensitive: boolean;
  };
}

export interface UserPermission {
  id: string;
  permission_id: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  granted_by?: string;
  permission: Permission;
  grantedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  department: string;
  roleType: string;
  permissions: string[];
  permissionDetails: Permission[];
  createdAt: string;
}

export interface ModuleStructure {
  mainModules: any[];
  subModules: any[];
}

// Schema-based permission types (from /api/admin/permissions/schema)
export interface ActionSchema {
  permissionId: string;
  action: string;
  name: string;
}

export interface ResourceSchema {
  resourceKey: string;
  resourceId: string;
  label: string;
  description: string;
  sortOrder: number;
  actions: ActionSchema[];
}

export interface ModuleSchema {
  module: string;
  moduleLabel: string;
  sortOrder: number;
  resources: ResourceSchema[];
}

export interface PermissionSchemaResponse {
  schema: ModuleSchema[];
  metadata: {
    totalModules: number;
    totalResources: number;
    totalPermissions: number;
  };
}

export interface UserActionAuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: any;
  outcome: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_super_admin_override?: boolean;
  created_at: string;
  actor?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export type TabType = 'users' | 'permissions' | 'templates' | 'audit' | 'settings';

// DPR dashboard field definitions
export interface DprViewFieldDef {
  key: string;
  header: string;
  label: string;
}

// Edit form data
export interface EditFormData {
  fullName: string;
  email: string;
  phone: string;
  status: string;
  department: string;
  jobTitle: string;
  accessScope: 'FACTORY_ONLY' | 'UNIVERSAL';
}

