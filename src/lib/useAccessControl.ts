import { useAuth } from '../components/auth/AuthProvider';

// Module key mapping - maps sidebar module names to permission module keys
const MODULE_KEY_MAP: Record<string, string> = {
  // Master Data
  'Master Data': 'masterData',
  'masterData': 'masterData',
  'Machine Master': 'masterData',
  'Mold Master': 'masterData',
  'Raw Materials Master': 'masterData',
  'Packing Materials Master': 'masterData',
  'Line Master': 'masterData',
  'BOM Master': 'masterData',
  'Commercial Master': 'masterData',
  'Others': 'masterData',
  
  // Store Purchase
  'Store Purchase': 'storePurchase',
  'storePurchase': 'storePurchase',
  'Material Indent': 'storePurchase',
  'Purchase Order': 'storePurchase',
  'Open Indent': 'storePurchase',
  'Purchase History': 'storePurchase',
  
  // Store Inward
  'Store Inward': 'storeInward',
  'storeInward': 'storeInward',
  'Normal GRN': 'storeInward',
  'JW Annexure GRN': 'storeInward',
  'Inward History': 'storeInward',
  
  // Store Outward
  'Store Outward': 'storeOutward',
  'storeOutward': 'storeOutward',
  'MIS': 'storeOutward',
  'Job Work Challan': 'storeOutward',
  'Delivery Challan': 'storeOutward',
  'Outward History': 'storeOutward',
  
  // Store Sales
  'Store Sales': 'storeSales',
  'storeSales': 'storeSales',
  'Dispatch Memo': 'storeSales',
  'Order Book': 'storeSales',
  'Sales History': 'storeSales',
  
  // Production Planner
  'Production Planner': 'productionPlanner',
  'productionPlanner': 'productionPlanner',
  'Line Scheduling': 'productionPlanner',
  
  // Production
  'Production': 'production',
  'production': 'production',
  'Daily Production Report': 'production',
  'DPR': 'production',
  'Mold Loading & Unloading': 'production',
  'Silo Management': 'production',
  'FG Transfer Note': 'production',
  
  // Quality
  'Quality': 'quality',
  'quality': 'quality',
  'Quality Inspections': 'quality',
  'Quality Standards': 'quality',
  'Quality Analytics': 'quality',
  'Daily Weight Report': 'quality',
  'First Pieces Approval Report': 'quality',
  'Corrective Action Plan': 'quality',
  'R&D': 'quality',
  
  // Maintenance
  'Maintenance': 'maintenance',
  'maintenance': 'maintenance',
  'Preventive Maintenance': 'maintenance',
  'Machine Breakdown': 'maintenance',
  'Mold Breakdown': 'maintenance',
  'Maintenance History': 'maintenance',
  'Daily Readings': 'maintenance',
  'Maintenance Report': 'maintenance',
};

// Resource key mapping - maps resource names to their permission keys
const RESOURCE_KEY_MAP: Record<string, string> = {
  'Machine Master': 'machineMaster',
  'Mold Master': 'moldMaster',
  'Raw Materials Master': 'rawMaterialsMaster',
  'Packing Materials Master': 'packingMaterialsMaster',
  'Line Master': 'lineMaster',
  'BOM Master': 'bomMaster',
  'Commercial Master': 'commercialMaster',
  'Others': 'othersMaster',
  'Material Indent': 'materialIndent',
  'Purchase Order': 'purchaseOrder',
  'Open Indent': 'openIndent',
  'Purchase History': 'purchaseHistory',
  'Normal GRN': 'normalGrn',
  'JW Annexure GRN': 'jwAnnexureGrn',
  'Inward History': 'inwardHistory',
  'MIS': 'mis',
  'Job Work Challan': 'jobWorkChallan',
  'Delivery Challan': 'deliveryChallan',
  'Outward History': 'outwardHistory',
  'Dispatch Memo': 'dispatchMemo',
  'Order Book': 'orderBook',
  'Sales History': 'salesHistory',
  'Production Planner': 'productionPlanner',
  'Line Scheduling': 'lineScheduling',
  'Daily Production Report': 'dpr',
  'DPR': 'dpr',
  'Mold Loading & Unloading': 'moldLoadingUnloading',
  'Silo Management': 'siloManagement',
  'FG Transfer Note': 'fgTransferNote',
  'Quality Inspections': 'qualityInspections',
  'Quality Standards': 'qualityStandards',
  'Quality Analytics': 'qualityAnalytics',
  'Daily Weight Report': 'dailyWeightReport',
  'First Pieces Approval Report': 'firstPiecesApproval',
  'Corrective Action Plan': 'correctiveActionPlan',
  'R&D': 'rnd',
  'Preventive Maintenance': 'preventiveMaintenance',
  'Machine Breakdown': 'machineBreakdown',
  'Mold Breakdown': 'moldBreakdown',
  'Maintenance History': 'maintenanceHistory',
  'Daily Readings': 'dailyReadings',
  'Maintenance Report': 'maintenanceReport',
};

// Action mapping
const ACTION_MAP: Record<string, string> = {
  'view': 'read',
  'read': 'read',
  'create': 'create',
  'add': 'create',
  'update': 'update',
  'edit': 'update',
  'delete': 'delete',
  'remove': 'delete',
  'approve': 'approve',
};

interface AccessControlState {
  canAccessModule: (moduleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  canPerformAction: (action: string, resource: string) => boolean;
  getModuleAccessLevel: (moduleName: string) => 'full' | 'read' | 'blocked';
  isLoading: boolean;
  error: string | null;
}

export const useAccessControl = (): AccessControlState => {
  const { user, isLoading, error } = useAuth();

  /**
   * Check if user can access a module (has at least read permission on any resource in the module)
   */
  const canAccessModule = (moduleName: string): boolean => {
    if (!user) return false;
    
    // Root admin has access to everything
    if (user.isRootAdmin) return true;
    
    const permissions = user.permissions || {};
    const moduleKey = MODULE_KEY_MAP[moduleName] || moduleName;
    
    // Check if user has any permission for this module
    // Permission format: module.resourceKey.action
    const hasModulePermission = Object.keys(permissions).some(permName => {
      const parts = permName.split('.');
      return parts[0] === moduleKey && permissions[permName] === true;
    });
    
    return hasModulePermission;
  };

  /**
   * Check if user has a specific permission
   * @param permissionName - Full permission name (e.g., "masterData.machineMaster.read")
   */
  const hasPermission = (permissionName: string): boolean => {
    if (!user) return false;
    
    // Root admin has all permissions
    if (user.isRootAdmin) return true;
    
    const permissions = user.permissions || {};
    return permissions[permissionName] === true;
  };

  /**
   * Check if user can perform an action on a resource
   * @param action - Action to perform (view, create, update, delete, approve)
   * @param resource - Resource name (e.g., "Machine Master")
   */
  const canPerformAction = (action: string, resource: string): boolean => {
    if (!user) return false;
    
    // Root admin can do everything
    if (user.isRootAdmin) return true;
    
    const permissions = user.permissions || {};
    
    // Get the module and resource keys
    const moduleKey = MODULE_KEY_MAP[resource] || '';
    const resourceKey = RESOURCE_KEY_MAP[resource] || resource;
    const actionKey = ACTION_MAP[action.toLowerCase()] || action.toLowerCase();
    
    if (!moduleKey) {
      console.warn(`Unknown module for resource: ${resource}`);
      return false;
    }
    
    // Build permission name: module.resourceKey.action
    const permissionName = `${moduleKey}.${resourceKey}.${actionKey}`;
    
    return permissions[permissionName] === true;
  };

  /**
   * Get the access level for a module
   * @returns 'full' if user can create/update/delete, 'read' if only view, 'blocked' if no access
   */
  const getModuleAccessLevel = (moduleName: string): 'full' | 'read' | 'blocked' => {
    if (!user) return 'blocked';
    
    // Root admin has full access to everything
    if (user.isRootAdmin) return 'full';
    
    const permissions = user.permissions || {};
    const moduleKey = MODULE_KEY_MAP[moduleName] || moduleName;
    
    // Check all permissions for this module
    const modulePermissions = Object.keys(permissions).filter(permName => {
      const parts = permName.split('.');
      return parts[0] === moduleKey && permissions[permName] === true;
    });
    
    if (modulePermissions.length === 0) return 'blocked';
    
    // Check if user has any write permissions (create, update, delete, approve)
    const hasWritePermission = modulePermissions.some(permName => {
      const action = permName.split('.')[2];
      return ['create', 'update', 'delete', 'approve'].includes(action);
    });
    
    return hasWritePermission ? 'full' : 'read';
  };

  return {
    canAccessModule,
    hasPermission,
    canPerformAction,
    getModuleAccessLevel,
    isLoading,
    error
  };
};

// Convenience hooks for specific access checks
export const useModuleAccess = (moduleName: string) => {
  const { canAccessModule, getModuleAccessLevel, isLoading, error } = useAccessControl();
  
  return {
    canAccess: canAccessModule(moduleName),
    accessLevel: getModuleAccessLevel(moduleName),
    isLoading,
    error
  };
};

export const usePermission = (permissionName: string) => {
  const { hasPermission, isLoading, error } = useAccessControl();
  
  return {
    hasPermission: hasPermission(permissionName),
    isLoading,
    error
  };
};

export const useActionPermission = (action: string, resource: string) => {
  const { canPerformAction, isLoading, error } = useAccessControl();
  
  return {
    canPerform: canPerformAction(action, resource),
    isLoading,
    error
  };
};

// Export the mappings for use in other components
export { MODULE_KEY_MAP, RESOURCE_KEY_MAP, ACTION_MAP };