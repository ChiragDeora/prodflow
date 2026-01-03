'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { 
  Users, 
  Shield, 
  Settings, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Eye, 
  EyeOff,
  Download,
  Upload,
  History,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  UserCheck,
  Factory,
  UserX,
  Key,
  FileText,
  BarChart3
} from 'lucide-react';

// Types
interface User {
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

interface Permission {
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

interface UserPermission {
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

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  department: string;
  roleType: string;
  permissions: string[];
  permissionDetails: Permission[];
  createdAt: string;
}

interface ModuleStructure {
  mainModules: any[];
  subModules: any[];
}

// Schema-based permission types (from /api/admin/permissions/schema)
interface ActionSchema {
  permissionId: string;
  action: string;
  name: string;
}

interface ResourceSchema {
  resourceKey: string;
  resourceId: string;
  label: string;
  description: string;
  sortOrder: number;
  actions: ActionSchema[];
}

interface ModuleSchema {
  module: string;
  moduleLabel: string;
  sortOrder: number;
  resources: ResourceSchema[];
}

interface PermissionSchemaResponse {
  schema: ModuleSchema[];
  metadata: {
    totalModules: number;
    totalResources: number;
    totalPermissions: number;
  };
}

interface UserActionAuditLog {
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

type TabType = 'users' | 'permissions' | 'templates' | 'audit' | 'settings';

// Lightweight DPR dashboard field definitions used for the
// per-user "column settings" admin panel.
interface DprViewFieldDef {
  key: string;
  header: string;
  label: string;
}

const DPR_VIEW_FIELDS: DprViewFieldDef[] = [
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

const EnhancedAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [moduleStructure, setModuleStructure] = useState<ModuleStructure>({ mainModules: [], subModules: [] });
  const [permissionSchema, setPermissionSchema] = useState<ModuleSchema[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [auditLogs, setAuditLogs] = useState<UserActionAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilterAction, setAuditFilterAction] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [showGrantPermissions, setShowGrantPermissions] = useState(false);
  const [showRevokePermissions, setShowRevokePermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRevokePermissions, setSelectedRevokePermissions] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    status: 'active',
    department: '',
    jobTitle: '',
    accessScope: 'FACTORY_ONLY' as 'FACTORY_ONLY' | 'UNIVERSAL'
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  // DPR view settings state
  const [showDprViewSettings, setShowDprViewSettings] = useState(false);
  const [dprUsers, setDprUsers] = useState<{ id: string; fullName: string; email: string; status: string }[]>([]);
  const [dprUsersLoading, setDprUsersLoading] = useState(false);
  const [selectedDprUserId, setSelectedDprUserId] = useState<string | null>(null);
  const [dprFieldSettings, setDprFieldSettings] = useState<Record<string, boolean>>({});
  const [dprFieldLoading, setDprFieldLoading] = useState(false);
  const [fullViewAccess, setFullViewAccess] = useState<boolean>(false);

  const { user } = useAuth();

  useEffect(() => {
    if (user?.isRootAdmin) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      // Only load essential data initially - templates and permissions
      // will be loaded on demand so that the dashboard appears faster.
      await loadUsers();
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Lazily load templates when the Templates tab is opened for the first time
  useEffect(() => {
    if (user?.isRootAdmin && activeTab === 'templates' && !templatesLoaded) {
      setTemplatesLoaded(true);
      loadTemplates();
    }
  }, [activeTab, templatesLoaded, user]);

  // Lazily load audit trail when the Audit tab is opened for the first time
  const loadAuditTrail = async () => {
    try {
      setAuditLoading(true);
      const response = await fetch('/api/admin/audit/user-actions?limit=200', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load audit trail');
      }
    } catch (error) {
      console.error('Load audit trail error:', error);
      setError('Network error loading audit trail');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isRootAdmin && activeTab === 'audit' && !auditLoading && auditLogs.length === 0) {
      loadAuditTrail();
    }
  }, [activeTab, auditLogs.length, auditLoading, user]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Load users error:', error);
      setError('Network error loading users');
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await fetch('/api/admin/permissions', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const loadedPermissions = data.permissions || [];
        console.log('✅ Loaded permissions:', loadedPermissions.length);
        
        // Debug: Log resource information
        if (loadedPermissions.length > 0) {
          const resources = loadedPermissions.map((p: any) => ({
            name: p.resource?.name,
            table_name: p.resource?.table_name,
            id: p.resource?.id,
            department: p.resource?.department
          }));
          console.log('📋 Resources in permissions:', resources.slice(0, 10)); // First 10
        } else {
          console.warn('⚠️ No permissions loaded! Check if permissions exist in database.');
        }
        
        setPermissions(loadedPermissions);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to load permissions:', errorData);
        setError(errorData.error || 'Failed to load permissions');
      }
    } catch (error) {
      console.error('❌ Load permissions error:', error);
      setError('Network error loading permissions');
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/permissions/templates', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load templates');
      }
    } catch (error) {
      console.error('Load templates error:', error);
      setError('Network error loading templates');
    }
  };

  const loadModuleStructure = async () => {
    try {
      const response = await fetch('/api/admin/permissions/modules', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setModuleStructure(data.modules);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load module structure');
      }
    } catch (error) {
      console.error('Load module structure error:', error);
      setError('Network error loading module structure');
    }
  };

  // Load permission schema from database (scalable approach)
  const loadPermissionSchema = async () => {
    try {
      setSchemaLoading(true);
      const response = await fetch('/api/admin/permissions/schema', {
        credentials: 'include'
      });

      if (response.ok) {
        const data: PermissionSchemaResponse = await response.json();
        console.log('✅ Loaded permission schema:', data.metadata);
        setPermissionSchema(data.schema);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to load permission schema:', errorData);
        setError(errorData.error || 'Failed to load permission schema');
      }
    } catch (error) {
      console.error('❌ Load permission schema error:', error);
      setError('Network error loading permission schema');
    } finally {
      setSchemaLoading(false);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      setActionLoading(userId);
      // Load permission schema when needed
      if (permissionSchema.length === 0) {
        await loadPermissionSchema();
      }
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUserPermissions(data.direct_permissions);
        setSelectedUser(data.user);
        setShowPermissionMatrix(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load user permissions');
      }
    } catch (error) {
      console.error('Load user permissions error:', error);
      setError('Network error loading user permissions');
    } finally {
      setActionLoading(null);
    }
  };

  const updateUserPermissions = async (userId: string, permissions: string[], action: 'grant' | 'revoke', reason?: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions,
          action,
          reason
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message);
        // Reload user permissions
        await loadUserPermissions(userId);
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to ${action} permissions`);
      }
    } catch (error) {
      console.error(`${action} permissions error:`, error);
      setError(`Network error ${action}ing permissions`);
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Load users who have DPR production permission
  const loadDprUsers = async () => {
    try {
      setDprUsersLoading(true);
      const response = await fetch('/api/admin/dpr-users', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setDprUsers(data.users || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load DPR users');
      }
    } catch (error) {
      console.error('Load DPR users error:', error);
      setError('Network error loading DPR users');
    } finally {
      setDprUsersLoading(false);
    }
  };

  // Load DPR field settings for a specific user
  const loadDprViewSettings = async (userId: string) => {
    try {
      setDprFieldLoading(true);
      const response = await fetch(`/api/admin/dpr-view-settings/${userId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const existing = (data.settings || {}) as Record<string, boolean>;
        if (!data.settings) {
          // Default to all visible
          const defaults: Record<string, boolean> = {};
          DPR_VIEW_FIELDS.forEach(field => {
            defaults[field.key] = true;
          });
          setDprFieldSettings(defaults);
          setFullViewAccess(true); // Default to enabled
        } else {
          setDprFieldSettings(existing);
          // Extract fullView setting (stored as 'fullView' key)
          setFullViewAccess(existing['fullView'] !== false); // Default to true if not set
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load DPR view settings');
      }
    } catch (error) {
      console.error('Load DPR view settings error:', error);
      setError('Network error loading DPR view settings');
    } finally {
      setDprFieldLoading(false);
    }
  };

  const saveDprViewSettings = async () => {
    if (!selectedDprUserId) return;
    try {
      setDprFieldLoading(true);
      // Include fullView setting in the settings object
      const settingsToSave = {
        ...dprFieldSettings,
        fullView: fullViewAccess
      };
      const response = await fetch(`/api/admin/dpr-view-settings/${selectedDprUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ settings: settingsToSave }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save DPR view settings');
      } else {
        setSuccessMessage('DPR column settings saved');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Save DPR view settings error:', error);
      setError('Network error saving DPR view settings');
    } finally {
      setDprFieldLoading(false);
    }
  };

  const handleEditUser = async (userToEdit: User) => {
    try {
      setActionLoading(userToEdit.id);
      const response = await fetch(`/api/admin/users/${userToEdit.id}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEditingUser(data.user);
        setEditFormData({
          fullName: data.user.fullName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          status: data.user.status || 'active',
          department: data.user.department || '',
          jobTitle: data.user.jobTitle || '',
          accessScope: data.user.accessScope || (data.user.isRootAdmin ? 'UNIVERSAL' : 'FACTORY_ONLY')
        });
        setNewPassword('');
        setShowPasswordField(false);
        setShowEditUser(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load user details');
      }
    } catch (error) {
      console.error('Load user error:', error);
      setError('Network error loading user details');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      setActionLoading(editingUser.id);
      
      // Update user info
      const updatePayload: any = {
        fullName: editFormData.fullName,
        email: editFormData.email,
        phone: editFormData.phone,
        status: editFormData.status,
        department: editFormData.department,
        jobTitle: editFormData.jobTitle,
        accessScope: editFormData.accessScope
      };

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user');
        return;
      }

      // If password is provided, change it
      if (showPasswordField && newPassword) {
        const passwordResponse = await fetch(`/api/admin/users/${editingUser.id}/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newPassword }),
          credentials: 'include'
        });

        if (!passwordResponse.ok) {
          const errorData = await passwordResponse.json();
          setError(errorData.error || 'Failed to change password');
          return;
        }
      }

      setSuccessMessage('User updated successfully');
      setShowEditUser(false);
      setEditingUser(null);
      setNewPassword('');
      setShowPasswordField(false);
      
      // Reload users
      await loadUsers();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Update user error:', error);
      setError('Network error updating user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveUser = async (userToApprove: User) => {
    try {
      setActionLoading(userToApprove.id);

      // Ensure department, designation and permissions are set before approval
      const validationResponse = await fetch(`/api/admin/users/${userToApprove.id}/permissions`, {
        credentials: 'include'
      });

      if (!validationResponse.ok) {
        const errorData = await validationResponse.json();
        setError(errorData.error || 'Failed to validate user before approval');
        return;
      }

      const validationData = await validationResponse.json();
      const profile = validationData.user || {};
      const hasDepartment = !!profile.department;
      const hasDesignation = !!(profile.job_title || userToApprove.jobTitle);

      const directPermissions = (validationData.direct_permissions || []) as any[];
      const rolePermissions = (validationData.role_permissions || []) as any[];

      const activeDirectPermissions = directPermissions.filter((p) => p.is_active !== false).length;
      const activeRolePermissions = rolePermissions.filter((p) => p.is_active !== false).length;
      const hasPermissions = activeDirectPermissions + activeRolePermissions > 0;

      if (!hasDepartment || !hasDesignation || !hasPermissions) {
        const missing: string[] = [];
        if (!hasDepartment) missing.push('department');
        if (!hasDesignation) missing.push('designation');
        if (!hasPermissions) missing.push('permissions');

        setError(
          `Before approving this user, please first set their ${missing.join(
            ', '
          )} and grant at least one permission. Once that is done, you can approve the user.`
        );
        return;
      }

      if (!confirm(`Are you sure you want to approve ${userToApprove.fullName}?`)) {
        return;
      }

      const response = await fetch(`/api/admin/users/${userToApprove.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Role assignment is optional; send empty payload for now
        body: JSON.stringify({}),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message || 'User approved successfully');
        await loadUsers();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Approve user error:', error);
      setError('Network error approving user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = async (userToReject: User) => {
    if (!confirm(`Are you sure you want to reject ${userToReject.fullName}?`)) {
      return;
    }

    const reason =
      (typeof window !== 'undefined'
        ? window.prompt('Enter a reason for rejection (optional):', 'No reason provided')
        : 'No reason provided') || 'No reason provided';

    try {
      setActionLoading(userToReject.id);
      const response = await fetch(`/api/admin/users/${userToReject.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message || 'User rejected successfully');
        await loadUsers();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Reject user error:', error);
      setError('Network error rejecting user');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getUserInitials = (fullName?: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      case 'deactivated': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAuditActionLabel = (action: string) => {
    switch (action) {
      case 'approve_user': return 'User Approved';
      case 'reject_user': return 'User Rejected';
      // "delete_user" now represents a logical deactivation,
      // not a hard delete, so reflect that in the UI.
      case 'delete_user': return 'User Deactivated';
      case 'update_user': return 'User Updated';
      case 'grant_user_permissions': return 'Permissions Granted';
      case 'revoke_user_permissions': return 'Permissions Revoked';
      case 'reset_password': return 'Password Reset';
      case 'change_user_password': return 'Password Changed';
      default: return action.replace(/_/g, ' ');
    }
  };

  const getAuditActionColor = (action: string) => {
    switch (action) {
      case 'approve_user':
      case 'grant_user_permissions':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'reject_user':
      case 'delete_user':
      case 'revoke_user_permissions':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'reset_password':
      case 'change_user_password':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'update_user':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getAuditTargetUserName = (log: UserActionAuditLog): string => {
    const details = log.details || {};
    const target =
      details.target_user ||
      details.approved_user ||
      details.rejected_user ||
      details.deleted_user ||
      details.user ||
      details.targetUser;

    if (!target) {
      return 'Unknown user';
    }

    if (typeof target === 'string') {
      return target;
    }

    return (
      target.full_name ||
      target.fullName ||
      target.email ||
      'Unknown user'
    );
  };

  // DEPRECATED: getDepartmentMapping - Now using schema-based approach from /api/admin/permissions/schema
  // The permission schema is loaded dynamically from the database and stored in permissionSchema state

  // DEPRECATED: getDepartmentFromResource - Now using schema-based approach
  // Module information comes directly from the database via permissionSchema

  // DEPRECATED: extractSubDepartment - Now using schema-based approach
  // Sub-sections are handled as separate resources within modules in the schema

  // DEPRECATED: extractResource - Now using schema-based approach
  // Resource labels come directly from the database via permissionSchema.resources[].label

  // DEPRECATED: organizePermissionsByDepartment - Now using schema-based approach
  // The permissionSchema already provides the correct module -> resource -> action structure

  // Schema-based matrix structure
  type MatrixCell = {
    permissionId: string;
    action: string;
    isGranted: boolean;
    isActive?: boolean;
  };

  type SchemaMatrixRow = {
    module: string;
    moduleLabel: string;
    resourceKey: string;
    resourceLabel: string;
    cells: {
      approve?: MatrixCell;
      update?: MatrixCell;
      create?: MatrixCell;
      delete?: MatrixCell;
      view?: MatrixCell;
    };
  };

  // Build matrix from schema for granting permissions
  const buildSchemaMatrix = (): SchemaMatrixRow[] => {
    const matrix: SchemaMatrixRow[] = [];
    
    permissionSchema.forEach(module => {
      module.resources.forEach(resource => {
        const row: SchemaMatrixRow = {
          module: module.module,
          moduleLabel: module.moduleLabel,
          resourceKey: resource.resourceKey,
          resourceLabel: resource.label,
          cells: {}
        };

        resource.actions.forEach(action => {
          const cell: MatrixCell = {
            permissionId: action.permissionId,
            action: action.action,
            isGranted: false,
            isActive: true
          };

          // Map actions to columns
          if (action.action === 'approve') {
            row.cells.approve = cell;
          } else if (action.action === 'update') {
            row.cells.update = cell;
          } else if (action.action === 'create') {
            row.cells.create = cell;
          } else if (action.action === 'delete') {
            row.cells.delete = cell;
          } else if (action.action === 'view' || action.action === 'read') {
            row.cells.view = cell;
          }
        });

        matrix.push(row);
      });
    });

    return matrix;
  };

  // Build matrix showing user's granted permissions
  const buildUserPermissionMatrix = (grantedPermissions: UserPermission[]): SchemaMatrixRow[] => {
    const matrix: SchemaMatrixRow[] = [];
    const grantedPermissionIds = new Set(
      grantedPermissions
        .filter(up => up.is_active)
        .map(up => up.permission_id)
    );
    
    permissionSchema.forEach(module => {
      module.resources.forEach(resource => {
        // Check if any permission for this resource is granted
        const hasAnyPermission = resource.actions.some(
          action => grantedPermissionIds.has(action.permissionId)
        );
        
        if (!hasAnyPermission) return; // Skip resources with no permissions
        
        const row: SchemaMatrixRow = {
          module: module.module,
          moduleLabel: module.moduleLabel,
          resourceKey: resource.resourceKey,
          resourceLabel: resource.label,
          cells: {}
        };

        resource.actions.forEach(action => {
          const isGranted = grantedPermissionIds.has(action.permissionId);
          const cell: MatrixCell = {
            permissionId: action.permissionId,
            action: action.action,
            isGranted,
            isActive: isGranted
          };

          // Map actions to columns
          if (action.action === 'approve') {
            row.cells.approve = cell;
          } else if (action.action === 'update') {
            row.cells.update = cell;
          } else if (action.action === 'create') {
            row.cells.create = cell;
          } else if (action.action === 'delete') {
            row.cells.delete = cell;
          } else if (action.action === 'view' || action.action === 'read') {
            row.cells.view = cell;
          }
        });

        matrix.push(row);
      });
    });

    return matrix;
  };

  // Visible tabs in the Admin Dashboard.
  // Permission Matrix and Permission Templates have been removed
  // from the UI to simplify the experience; their underlying
  // logic is still available internally if needed in future.
  const tabs = [
    {
      id: 'users' as TabType,
      label: 'User Management',
      icon: Users,
      description: 'Manage users and their permissions'
    },
    {
      id: 'audit' as TabType,
      label: 'Audit Trail',
      icon: History,
      description: 'View permission change history'
    },
    {
      id: 'settings' as TabType,
      label: 'System Settings',
      icon: Settings,
      description: 'Configure system-wide settings'
    }
  ];

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesAction = auditFilterAction === 'all' || log.action === auditFilterAction;
    const search = auditSearch.trim().toLowerCase();

    if (!search) {
      return matchesAction;
    }

    const targetName = getAuditTargetUserName(log).toLowerCase();
    const actorName = (log.actor?.full_name || '').toLowerCase();
    const actorEmail = (log.actor?.email || '').toLowerCase();
    const actionLabel = getAuditActionLabel(log.action).toLowerCase();

    const haystack = `${targetName} ${actorName} ${actorEmail} ${actionLabel}`;

    const matchesSearch = haystack.includes(search);
    return matchesAction && matchesSearch;
  });

  const totalAuditActions = auditLogs.length;
  const totalUsersCreated = auditLogs.filter(log => log.action === 'approve_user').length;
  const totalUsersRemoved = auditLogs.filter(log => log.action === 'reject_user' || log.action === 'delete_user').length;
  const totalPermissionChanges = auditLogs.filter(
    log => log.action === 'grant_user_permissions' || log.action === 'revoke_user_permissions'
  ).length;

  if (!user?.isRootAdmin) {
    // Redirect to unauthorized page instead of showing inline message
    if (typeof window !== 'undefined') {
      window.location.href = '/unauthorized';
      return null;
    }
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600">Only root administrators can access this feature.</p>
          <p className="text-sm text-gray-500 mt-4">Redirecting to unauthorized page...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-gray-600">Loading admin dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Logged in as:</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              {user.fullName} (Root Admin)
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button 
            onClick={() => setError('')}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search users by name, email, or username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Departments</option>
                    <option value="store">Store</option>
                    <option value="production">Production</option>
                    <option value="planning_procurement">Planning/Procurement</option>
                    <option value="quality">Quality</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="admin">Admin</option>
                  </select>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="deactivated">Deactivated</option>
                  </select>

                  {/* DPR column settings dashboard trigger */}
                  <button
                    type="button"
                    onClick={async () => {
                      setShowDprViewSettings(true);
                      if (dprUsers.length === 0) {
                        await loadDprUsers();
                      }
                    }}
                    className="ml-2 px-3 py-2 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    DPR Column Settings
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                                {getUserInitials(user.fullName)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center">
                                {user.fullName}
                                {user.isRootAdmin && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Root Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">@{user.username}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              {user.jobTitle && (
                                <div className="text-xs text-gray-400">{user.jobTitle}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {user.department ? user.department.replace('_', ' ').toUpperCase() : 'Not Set'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </span>
                            {user.requiresPasswordReset && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                Password Reset Required
                              </span>
                            )}
                            {user.isLocked && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                Locked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => loadUserPermissions(user.id)}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              <Key className="w-4 h-4 mr-1" />
                              {actionLoading === user.id ? 'Loading...' : 'Permissions'}
                            </button>
                            {!user.isRootAdmin && (
                              <>
                                {user.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApproveUser(user)}
                                      disabled={actionLoading === user.id}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleRejectUser(user)}
                                      disabled={actionLoading === user.id}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                      <X className="w-4 h-4 mr-1" />
                                      Reject
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={() => handleEditUser(user)}
                                  disabled={actionLoading === user.id}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to ${user.status === 'suspended' ? 'activate' : 'suspend'} ${user.fullName}?`)) {
                                      try {
                                        setActionLoading(user.id);
                                        const response = await fetch(`/api/admin/users/${user.id}`, {
                                          method: 'PUT',
                                          headers: {
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({
                                            status: user.status === 'suspended' ? 'active' : 'suspended'
                                          }),
                                          credentials: 'include'
                                        });

                                        if (response.ok) {
                                          setSuccessMessage(`User ${user.status === 'suspended' ? 'activated' : 'suspended'} successfully`);
                                          await loadUsers();
                                          setTimeout(() => setSuccessMessage(''), 3000);
                                        } else {
                                          const errorData = await response.json();
                                          setError(errorData.error || 'Failed to update user status');
                                        }
                                      } catch (error) {
                                        console.error('Suspend user error:', error);
                                        setError('Network error updating user status');
                                      } finally {
                                        setActionLoading(null);
                                      }
                                    }
                                  }}
                                  disabled={actionLoading === user.id}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                  <UserX className="w-4 h-4 mr-1" />
                                  {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-blue-500" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-blue-600">{users.length}</div>
                      <div className="text-gray-600 text-sm">Total Users</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <div className="flex items-center">
                    <UserCheck className="w-8 h-8 text-green-500" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-green-600">
                        {users.filter(u => u.status === 'active').length}
                      </div>
                      <div className="text-gray-600 text-sm">Active Users</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-yellow-500" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-yellow-600">
                        {users.filter(u => u.status === 'pending').length}
                      </div>
                      <div className="text-gray-600 text-sm">Pending Approval</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                  <div className="flex items-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-red-600">
                        {users.filter(u => u.isLocked || u.status === 'suspended').length}
                      </div>
                      <div className="text-gray-600 text-sm">Locked/Suspended</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Permission Matrix</h3>
                <p className="text-gray-600">Select a user from the Users tab to view their permission matrix</p>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Permission Templates</h3>
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {template.department}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {template.permissionDetails?.length || 0} permissions
                      </span>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-800">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <div className="flex items-center">
                    <History className="w-8 h-8 text-blue-500" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-blue-600">{totalAuditActions}</div>
                      <div className="text-gray-600 text-sm">Total Actions</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <div className="flex items-center">
                    <UserCheck className="w-8 h-8 text-green-500" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-green-600">{totalUsersCreated}</div>
                      <div className="text-gray-600 text-sm">Users Approved</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                  <div className="flex items-center">
                    <UserX className="w-8 h-8 text-red-500" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-red-600">{totalUsersRemoved}</div>
                      <div className="text-gray-600 text-sm">Users Removed</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
                  <div className="flex items-center">
                    <Key className="w-8 h-8 text-amber-500" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-amber-600">{totalPermissionChanges}</div>
                      <div className="text-gray-600 text-sm">Permission Changes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by user name, email, or action..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={auditFilterAction}
                    onChange={(e) => setAuditFilterAction(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Actions</option>
                    <option value="approve_user">User Approved</option>
                    <option value="reject_user">User Rejected</option>
                    {/* "delete_user" now corresponds to a logical deactivation */}
                    <option value="delete_user">User Deactivated</option>
                    <option value="update_user">User Updated</option>
                    <option value="grant_user_permissions">Permissions Granted</option>
                    <option value="revoke_user_permissions">Permissions Revoked</option>
                    <option value="reset_password">Password Reset</option>
                    <option value="change_user_password">Password Changed</option>
                  </select>
                </div>
              </div>

              {/* Audit table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {auditLoading ? (
                  <div className="p-8 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <p className="text-gray-600">Loading audit trail...</p>
                  </div>
                ) : filteredAuditLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No audit events found</h3>
                    <p className="text-gray-600">
                      Actions you take here (approving, rejecting, deleting users or changing permissions) will appear in this trail.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            When
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Target User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAuditLogs.map((log) => {
                          const targetName = getAuditTargetUserName(log);
                          const actionLabel = getAuditActionLabel(log.action);
                          const badgeClasses = getAuditActionColor(log.action);

                          return (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeClasses}`}>
                                  {actionLabel}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {targetName}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {log.action === 'grant_user_permissions' || log.action === 'revoke_user_permissions' ? (
                                  <span>
                                    {log.details?.permission_count || log.details?.permission_names?.length || 0} permission(s){' '}
                                    {log.action === 'grant_user_permissions' ? 'changed' : 'revoked'}
                                    {log.details?.reason ? ` • ${log.details.reason}` : ''}
                                  </span>
                                ) : log.action === 'approve_user' || log.action === 'reject_user' || log.action === 'delete_user' ? (
                                  <span>
                                    {log.details?.reason
                                      ? log.details.reason
                                      : log.action === 'approve_user'
                                        ? 'User approved'
                                        : log.action === 'reject_user'
                                          ? 'User rejected'
                                          : 'User deleted'}
                                  </span>
                                ) : log.action === 'reset_password' || log.action === 'change_user_password' ? (
                                  <span>Password was reset/changed for this user.</span>
                                ) : (
                                  <span>See details in database audit log.</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">System Settings</h3>
                <p className="text-gray-600">Configure system-wide permission settings</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission Matrix Modal */}
      {showPermissionMatrix && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Permission Matrix - {selectedUser.fullName}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedUser.email} • {selectedUser.department?.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setShowPermissionMatrix(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total Permissions: {userPermissions.filter(up => up.is_active).length}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        if (permissionSchema.length === 0) {
                          loadPermissionSchema().then(() => setShowGrantPermissions(true));
                        } else {
                          setShowGrantPermissions(true);
                        }
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Grant Permissions
                    </button>
                    <button 
                      onClick={() => {
                        const activePermissions = userPermissions.filter(up => up.is_active);
                        setSelectedRevokePermissions(activePermissions.map(up => up.permission_id));
                        setShowRevokePermissions(true);
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Revoke Permissions
                    </button>
                  </div>
                </div>

                {userPermissions.filter(up => up.is_active).length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active permissions assigned to this user</p>
                  </div>
                ) : permissionSchema.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading permission schema...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Module / Resource
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Approve
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Update
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Create
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Delete
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            View
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const matrix = buildUserPermissionMatrix(userPermissions);
                          const rows: JSX.Element[] = [];
                          let currentModule = '';

                          matrix.forEach((row, index) => {
                            // Module header row
                            if (row.module !== currentModule) {
                              currentModule = row.module;
                              rows.push(
                                <tr key={`module-${row.module}`} className="bg-gray-100">
                                  <td colSpan={6} className="px-4 py-2 font-bold text-gray-900 border-b border-gray-300">
                                    {row.moduleLabel}
                                  </td>
                                </tr>
                              );
                            }

                            // Resource row
                            rows.push(
                              <tr key={`${row.module}-${row.resourceKey}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200">
                                  <span className="ml-4">{row.resourceLabel}</span>
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.approve?.isGranted ? (
                                    <span className="text-green-600 font-bold text-lg">✓</span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.update?.isGranted ? (
                                    <span className="text-green-600 font-bold text-lg">✓</span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.create?.isGranted ? (
                                    <span className="text-green-600 font-bold text-lg">✓</span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.delete?.isGranted ? (
                                    <span className="text-green-600 font-bold text-lg">✓</span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.view?.isGranted ? (
                                    <span className="text-green-600 font-bold text-lg">✓</span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });

                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DPR Column Settings Modal */}
      {showDprViewSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Factory className="w-5 h-5 text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    DPR Column Settings
                  </h2>
                  <p className="text-xs text-gray-500">
                    Control which DPR metrics and columns are visible for each user who has Production DPR access.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDprViewSettings(false);
                  setSelectedDprUserId(null);
                  setDprFieldSettings({});
                  setFullViewAccess(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left: DPR-enabled users */}
              <div className="w-64 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-gray-500" />
                    DPR Users
                  </h3>
                  {dprUsersLoading ? (
                    <p className="text-xs text-gray-500">Loading users…</p>
                  ) : dprUsers.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No users have Production DPR permission yet.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {dprUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={async () => {
                            setSelectedDprUserId(u.id);
                            setDprFieldSettings({});
                            setFullViewAccess(false);
                            await loadDprViewSettings(u.id);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-xs ${
                            selectedDprUserId === u.id
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="truncate">{u.fullName}</div>
                          <div className="text-[10px] text-gray-500 truncate">
                            {u.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Field checkboxes */}
              <div className="flex-1 overflow-y-auto p-6">
                {!selectedDprUserId ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Select a DPR user on the left to configure their dashboard.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Full View Access Toggle - at the top */}
                    <div className="border border-gray-200 rounded-lg bg-purple-50">
                      <div className="px-4 py-3 border-b border-gray-200 bg-purple-100 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                          <Eye className="w-4 h-4 mr-2 text-purple-600" />
                          Full View Access
                        </h3>
                      </div>
                      <div className="p-4">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            checked={fullViewAccess}
                            disabled={dprFieldLoading}
                            onChange={(e) => setFullViewAccess(e.target.checked)}
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-800">
                              Allow Full View Button
                            </span>
                            <p className="text-xs text-gray-600 mt-1">
                              When enabled, this user will see the "Full View" button on their DPR dashboard.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Field visibility checkboxes */}
                    {Array.from(
                      DPR_VIEW_FIELDS.reduce<Map<string, DprViewFieldDef[]>>((map, field) => {
                        const group = field.header;
                        if (!map.has(group)) map.set(group, []);
                        map.get(group)!.push(field);
                        return map;
                      }, new Map())
                    ).map(([header, fields]) => (
                      <div key={header} className="border border-gray-200 rounded-lg">
                        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-800">
                            {header}
                          </h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {fields.map((field) => {
                            const checked =
                              dprFieldSettings[field.key] !== undefined
                                ? dprFieldSettings[field.key]
                                : true;
                            return (
                              <label
                                key={field.key}
                                className="flex items-center text-xs text-gray-700 space-x-2"
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  checked={checked}
                                  disabled={dprFieldLoading}
                                  onChange={(e) =>
                                    setDprFieldSettings((prev) => ({
                                      ...prev,
                                      [field.key]: e.target.checked,
                                    }))
                                  }
                                />
                                <span>{field.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                These settings control what the user can <strong>see</strong> on their DPR dashboard. Data entry rules are unchanged.
              </p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDprViewSettings(false);
                    setSelectedDprUserId(null);
                    setDprFieldSettings({});
                    setFullViewAccess(false);
                  }}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={!selectedDprUserId || dprFieldLoading}
                  onClick={saveDprViewSettings}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {dprFieldLoading ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant Permissions Modal */}
      {showGrantPermissions && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Grant Permissions to {selectedUser.fullName}
                </h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowGrantPermissions(false);
                  setSelectedPermissions([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Selected: {selectedPermissions.length} permissions
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const allPermissionIds: string[] = [];
                        permissionSchema.forEach(module => {
                          module.resources.forEach(resource => {
                            resource.actions.forEach(action => {
                              allPermissionIds.push(action.permissionId);
                            });
                          });
                        });
                        setSelectedPermissions(allPermissionIds);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedPermissions([])}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {schemaLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading permission schema...</p>
                  </div>
                ) : permissionSchema.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No permissions available. Please run the database migration.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Module / Resource
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Approve
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Update
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Create
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Delete
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            View
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const matrix = buildSchemaMatrix();
                          const rows: JSX.Element[] = [];
                          let currentModule = '';

                          matrix.forEach((row, index) => {
                            // Module header row
                            if (row.module !== currentModule) {
                              currentModule = row.module;
                              rows.push(
                                <tr key={`module-${row.module}`} className="bg-gray-100">
                                  <td colSpan={6} className="px-4 py-2 font-bold text-gray-900 border-b border-gray-300">
                                    {row.moduleLabel}
                                  </td>
                                </tr>
                              );
                            }

                            // Resource row
                            rows.push(
                              <tr key={`${row.module}-${row.resourceKey}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200">
                                  <span className="ml-4">{row.resourceLabel}</span>
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.approve ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(row.cells.approve.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPermissions([...selectedPermissions, row.cells.approve!.permissionId]);
                                        } else {
                                          setSelectedPermissions(selectedPermissions.filter(id => id !== row.cells.approve!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.update ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(row.cells.update.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPermissions([...selectedPermissions, row.cells.update!.permissionId]);
                                        } else {
                                          setSelectedPermissions(selectedPermissions.filter(id => id !== row.cells.update!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.create ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(row.cells.create.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPermissions([...selectedPermissions, row.cells.create!.permissionId]);
                                        } else {
                                          setSelectedPermissions(selectedPermissions.filter(id => id !== row.cells.create!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.delete ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(row.cells.delete.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPermissions([...selectedPermissions, row.cells.delete!.permissionId]);
                                        } else {
                                          setSelectedPermissions(selectedPermissions.filter(id => id !== row.cells.delete!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.view ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(row.cells.view.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPermissions([...selectedPermissions, row.cells.view!.permissionId]);
                                        } else {
                                          setSelectedPermissions(selectedPermissions.filter(id => id !== row.cells.view!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });

                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {selectedPermissions.length} permissions selected
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowGrantPermissions(false);
                    setSelectedPermissions([]);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (selectedPermissions.length > 0) {
                      await updateUserPermissions(selectedUser.id, selectedPermissions, 'grant', 'Granted by admin');
                      setShowGrantPermissions(false);
                      setSelectedPermissions([]);
                    }
                  }}
                  disabled={selectedPermissions.length === 0 || actionLoading !== null}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Granting...' : `Grant ${selectedPermissions.length} Permissions`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Permissions Modal */}
      {showRevokePermissions && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Revoke Permissions from {selectedUser.fullName}
                </h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowRevokePermissions(false);
                  setSelectedRevokePermissions([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Selected: {selectedRevokePermissions.length} permissions
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const activePermissionIds = userPermissions
                          .filter(up => up.is_active)
                          .map(up => up.permission_id);
                        setSelectedRevokePermissions(activePermissionIds);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedRevokePermissions([])}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {userPermissions.filter(up => up.is_active).length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active permissions to revoke</p>
                  </div>
                ) : permissionSchema.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading permission schema...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Module / Resource
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Approve
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Update
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Create
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            Delete
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase border-b border-gray-200">
                            View
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const matrix = buildUserPermissionMatrix(userPermissions);
                          const rows: JSX.Element[] = [];
                          let currentModule = '';

                          matrix.forEach((row, index) => {
                            // Module header row
                            if (row.module !== currentModule) {
                              currentModule = row.module;
                              rows.push(
                                <tr key={`module-${row.module}`} className="bg-gray-100">
                                  <td colSpan={6} className="px-4 py-2 font-bold text-gray-900 border-b border-gray-300">
                                    {row.moduleLabel}
                                  </td>
                                </tr>
                              );
                            }

                            // Resource row
                            rows.push(
                              <tr key={`${row.module}-${row.resourceKey}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-200">
                                  <span className="ml-4">{row.resourceLabel}</span>
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.approve?.isGranted ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedRevokePermissions.includes(row.cells.approve.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRevokePermissions([...selectedRevokePermissions, row.cells.approve!.permissionId]);
                                        } else {
                                          setSelectedRevokePermissions(selectedRevokePermissions.filter(id => id !== row.cells.approve!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.update?.isGranted ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedRevokePermissions.includes(row.cells.update.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRevokePermissions([...selectedRevokePermissions, row.cells.update!.permissionId]);
                                        } else {
                                          setSelectedRevokePermissions(selectedRevokePermissions.filter(id => id !== row.cells.update!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.create?.isGranted ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedRevokePermissions.includes(row.cells.create.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRevokePermissions([...selectedRevokePermissions, row.cells.create!.permissionId]);
                                        } else {
                                          setSelectedRevokePermissions(selectedRevokePermissions.filter(id => id !== row.cells.create!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.delete?.isGranted ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedRevokePermissions.includes(row.cells.delete.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRevokePermissions([...selectedRevokePermissions, row.cells.delete!.permissionId]);
                                        } else {
                                          setSelectedRevokePermissions(selectedRevokePermissions.filter(id => id !== row.cells.delete!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-gray-200">
                                  {row.cells.view?.isGranted ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedRevokePermissions.includes(row.cells.view.permissionId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRevokePermissions([...selectedRevokePermissions, row.cells.view!.permissionId]);
                                        } else {
                                          setSelectedRevokePermissions(selectedRevokePermissions.filter(id => id !== row.cells.view!.permissionId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });

                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {selectedRevokePermissions.length} permissions selected
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRevokePermissions(false);
                    setSelectedRevokePermissions([]);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (selectedRevokePermissions.length > 0) {
                      await updateUserPermissions(selectedUser.id, selectedRevokePermissions, 'revoke', 'Revoked by admin');
                      setShowRevokePermissions(false);
                      setSelectedRevokePermissions([]);
                    }
                  }}
                  disabled={selectedRevokePermissions.length === 0 || actionLoading !== null}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Revoking...' : `Revoke ${selectedRevokePermissions.length} Permissions`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit User - {editingUser.fullName}
                </h3>
                <p className="text-sm text-gray-500">{editingUser.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditUser(false);
                  setEditingUser(null);
                  setNewPassword('');
                  setShowPasswordField(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
            Designation / Job Title
          </label>
          <input
            type="text"
            value={editFormData.jobTitle}
            onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Not Set</option>
                    <option value="store">Store</option>
                    <option value="production">Production</option>
                    <option value="planning_procurement">Planning/Procurement</option>
                    <option value="quality">Quality</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Scope
                  </label>
                  {editingUser?.isRootAdmin ? (
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      <span className="flex items-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                          Root Admin
                        </span>
                        UNIVERSAL (Always)
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Root admin always has universal network access and cannot be restricted.
                      </p>
                    </div>
                  ) : (
                    <>
                      <select
                        value={editFormData.accessScope}
                        onChange={(e) => setEditFormData({ ...editFormData, accessScope: e.target.value as 'FACTORY_ONLY' | 'UNIVERSAL' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="FACTORY_ONLY">FACTORY_ONLY - Factory network only</option>
                        <option value="UNIVERSAL">UNIVERSAL - Any network</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        FACTORY_ONLY: User can access ProdFlow only when connected to the factory network. UNIVERSAL: User can access from any network.
                      </p>
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Change Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordField(!showPasswordField);
                        if (showPasswordField) {
                          setNewPassword('');
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showPasswordField ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>
                  {showPasswordField && (
                    <div>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 characters)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to keep current password
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowEditUser(false);
                    setEditingUser(null);
                    setNewPassword('');
                    setShowPasswordField(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={actionLoading !== null || !editFormData.fullName || !editFormData.email || (showPasswordField && newPassword.length > 0 && newPassword.length < 6)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAdminDashboard;

