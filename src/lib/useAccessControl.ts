import { useAuth } from '../components/auth/AuthProvider';

// Module key mapping - maps sidebar module names to permission module keys
const MODULE_KEY_MAP: Record<string, string> = {
  // Master Data
  'Master Data': 'masterData',
  'masterData': 'masterData',
  'Machine Master': 'masterData',
  'Mold Master': 'masterData',
  'Raw Materials Master': 'masterData',
  'RM Master': 'masterData',
  'Packing Materials Master': 'masterData',
  'PM Master': 'masterData',
  'Line Master': 'masterData',
  'BOM Master': 'masterData',
  'Commercial Master': 'masterData',
  'Others': 'masterData',
  'Spare Parts': 'masterData',
  
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
  'Issue Slip': 'storeOutward',
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
  
  // Stock Ledger
  'Stock Ledger': 'stockLedger',
  'stockLedger': 'stockLedger',
  'Movement Log': 'stockLedger',
  'Current Stock': 'stockLedger',
  'Stock Analytics': 'stockLedger',
  
  // Reports
  'Reports': 'reports',
  'reports': 'reports',
  'Reports Dashboard': 'reports',
  'Report Builder': 'reports',
  'Report Templates': 'reports',
  'Saved Reports': 'reports',
  'Smart Query': 'reports',
  'AI Insights': 'reports',
};

// Resource key mapping - maps resource names to their permission keys
const RESOURCE_KEY_MAP: Record<string, string> = {
  'Machine Master': 'machineMaster',
  'Mold Master': 'moldMaster',
  'Raw Materials Master': 'rawMaterialsMaster',
  'RM Master': 'rawMaterialsMaster',
  'Packing Materials Master': 'packingMaterialsMaster',
  'PM Master': 'packingMaterialsMaster',
  'Line Master': 'lineMaster',
  'BOM Master': 'bomMaster',
  'Commercial Master': 'commercialMaster',
  'Others': 'othersMaster',
  'Spare Parts': 'sparePartsMaster',
  'Material Indent': 'materialIndent',
  'Purchase Order': 'purchaseOrder',
  'Open Indent': 'openIndent',
  'Purchase History': 'purchaseHistory',
  'Normal GRN': 'normalGrn',
  'JW Annexure GRN': 'jwAnnexureGrn',
  'Inward History': 'inwardHistory',
  'Issue Slip': 'mis',
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
  // Stock Ledger
  'Stock Ledger': 'stockLedger',
  'Movement Log': 'stockLedgerMovements',
  'Current Stock': 'stockLedgerBalances',
  'Stock Analytics': 'stockLedgerAnalytics',
  // Reports
  'Reports': 'reports',
  'Reports Dashboard': 'reportsDashboard',
  'Report Builder': 'reportBuilder',
  'Report Templates': 'reportTemplates',
  'Saved Reports': 'savedReports',
  'Smart Query': 'smartQuery',
  'AI Insights': 'aiInsights',
};

// Tab ID to Resource Name mapping for permission checks
const TAB_ID_TO_RESOURCE: Record<string, string> = {
  // Master Data tabs
  'machines': 'Machine Master',
  'molds': 'Mold Master',
  'raw_materials': 'Raw Materials Master',
  'packing_materials': 'Packing Materials Master',
  'lines': 'Line Master',
  'bom_master': 'BOM Master',
  'commercial_master': 'Commercial Master',
  'spare_parts': 'Spare Parts',
  'others': 'Others',
  // Stock Ledger tabs
  'movements': 'Movement Log',
  'balances': 'Current Stock',
  'analytics': 'Stock Analytics',
  // Reports tabs
  'dashboard': 'Reports Dashboard',
  'builder': 'Report Builder',
  'templates': 'Report Templates',
  'saved': 'Saved Reports',
  'smart-query': 'Smart Query',
  'insights': 'AI Insights',
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
  canAccessResource: (resource: string) => boolean;
  canAccessTab: (tabId: string, moduleName?: string) => boolean;
  getModuleAccessLevel: (moduleName: string) => 'full' | 'read' | 'blocked';
  isRootAdmin: boolean;
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
   * Check if user can access a specific resource (has at least read/view permission)
   * @param resource - Resource name (e.g., "Machine Master", "Mold Master")
   */
  const canAccessResource = (resource: string): boolean => {
    if (!user) return false;
    
    // Root admin can access everything
    if (user.isRootAdmin) return true;
    
    const permissions = user.permissions || {};
    const moduleKey = MODULE_KEY_MAP[resource] || '';
    const resourceKey = RESOURCE_KEY_MAP[resource] || resource;
    
    if (!moduleKey) {
      console.warn(`[AccessControl] Unknown module for resource: ${resource}`);
      return false;
    }
    
    // Check if user has any permission for this resource (read/view at minimum)
    const permissionName = `${moduleKey}.${resourceKey}.read`;
    const hasAccess = permissions[permissionName] === true;
    
    // Debug logging for Stock Ledger and Reports
    if (moduleKey === 'stockLedger' || moduleKey === 'reports') {
      console.log(`[AccessControl] Checking: ${resource}`);
      console.log(`  → Permission needed: ${permissionName}`);
      console.log(`  → Has permission: ${hasAccess}`);
      console.log(`  → User permissions count: ${Object.keys(permissions).length}`);
      if (!hasAccess) {
        const stockPerms = Object.keys(permissions).filter(p => p.startsWith('stockLedger.'));
        const reportPerms = Object.keys(permissions).filter(p => p.startsWith('reports.'));
        console.log(`  → User's stockLedger permissions: ${stockPerms.length > 0 ? stockPerms.join(', ') : 'NONE'}`);
        console.log(`  → User's reports permissions: ${reportPerms.length > 0 ? reportPerms.join(', ') : 'NONE'}`);
      }
    }
    
    return hasAccess;
  };

  /**
   * Check if user can access a specific tab
   * @param tabId - Tab identifier (e.g., "machines", "molds", "raw_materials")
   * @param moduleName - Optional module name for context
   */
  const canAccessTab = (tabId: string, moduleName?: string): boolean => {
    if (!user) return false;
    
    // Root admin can access everything
    if (user.isRootAdmin) return true;
    
    // Get the resource name from tab ID
    const resourceName = TAB_ID_TO_RESOURCE[tabId];
    if (!resourceName) {
      // If no mapping exists, allow access (unknown tabs are accessible)
      return true;
    }
    
    return canAccessResource(resourceName);
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
    canAccessResource,
    canAccessTab,
    getModuleAccessLevel,
    isRootAdmin: user?.isRootAdmin || false,
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

export const useResourceAccess = (resource: string) => {
  const { canAccessResource, canPerformAction, isLoading, error } = useAccessControl();
  
  return {
    canView: canAccessResource(resource),
    canCreate: canPerformAction('create', resource),
    canUpdate: canPerformAction('update', resource),
    canDelete: canPerformAction('delete', resource),
    isLoading,
    error
  };
};

export const useTabAccess = (tabId: string, moduleName?: string) => {
  const { canAccessTab, isLoading, error } = useAccessControl();
  
  return {
    canAccess: canAccessTab(tabId, moduleName),
    isLoading,
    error
  };
};

// Export the mappings for use in other components
export { MODULE_KEY_MAP, RESOURCE_KEY_MAP, ACTION_MAP, TAB_ID_TO_RESOURCE };