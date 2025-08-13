import { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { accessControlUtils } from './auth';

interface AccessControlState {
  canAccessModule: (moduleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  canPerformAction: (action: string, resource: string) => boolean;
  getModuleAccessLevel: (moduleName: string) => string;
  isLoading: boolean;
  error: string | null;
}

export const useAccessControl = (): AccessControlState => {
  const { user, profile } = useAuth();
  const [moduleAccessCache, setModuleAccessCache] = useState<Record<string, { canAccess: boolean; accessLevel: string }>>({});
  const [permissionCache, setPermissionCache] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear cache when user changes
  useEffect(() => {
    setModuleAccessCache({});
    setPermissionCache({});
  }, [user?.id]);

  const canAccessModule = (moduleName: string): boolean => {
    if (!user || !profile) return false;
    if (moduleAccessCache[moduleName]) {
      return moduleAccessCache[moduleName].canAccess;
    }
    return false;
  };

  const hasPermission = (permissionName: string): boolean => {
    if (!user || !profile) return false;
    if (permissionCache[permissionName] !== undefined) {
      return permissionCache[permissionName];
    }
    return false;
  };

  const canPerformAction = (action: string, resource: string): boolean => {
    const permissionName = `${resource}.${action}`;
    return hasPermission(permissionName);
  };

  const getModuleAccessLevel = (moduleName: string): string => {
    if (!user || !profile) return 'blocked';
    const cached = moduleAccessCache[moduleName];
    return cached ? cached.accessLevel : 'blocked';
  };

  // Load access control data when user is authenticated
  useEffect(() => {
    if (!user || !profile) return;

    const loadAccessControlData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const modules = ['master-data', 'production-schedule', 'operator-panel', 'reports', 'approvals', 'admin', 'profile'];
        const moduleAccessPromises = modules.map(async (moduleName) => {
          const result = await accessControlUtils.canAccessModule(moduleName);
          return { moduleName, ...result };
        });

        const moduleResults = await Promise.all(moduleAccessPromises);
        const newModuleCache: Record<string, { canAccess: boolean; accessLevel: string }> = {};
        moduleResults.forEach(({ moduleName, canAccess, accessLevel }) => {
          newModuleCache[moduleName] = { canAccess, accessLevel };
        });
        setModuleAccessCache(newModuleCache);

        const commonPermissions = [
          'machines.view', 'machines.create', 'machines.edit', 'machines.delete',
          'molds.view', 'molds.create', 'molds.edit', 'molds.delete',
          'schedule.view', 'schedule.create', 'schedule.edit', 'schedule.delete', 'schedule.approve',
          'operator.view', 'operator.update',
          'reports.view', 'reports.export',
          'approvals.view', 'approvals.approve', 'approvals.reject',
          'users.view', 'users.create', 'users.edit', 'users.delete', 'users.permissions',
          'profile.view', 'profile.edit'
        ];

        const permissionPromises = commonPermissions.map(async (permissionName) => {
          const result = await accessControlUtils.hasPermission(permissionName);
          return { permissionName, hasPermission: result.hasPermission };
        });

        const permissionResults = await Promise.all(permissionPromises);
        const newPermissionCache: Record<string, boolean> = {};
        permissionResults.forEach(({ permissionName, hasPermission }) => {
          newPermissionCache[permissionName] = hasPermission;
        });
        setPermissionCache(newPermissionCache);

      } catch (err) {
        console.error('Error loading access control data:', err);
        setError('Failed to load access control data');
      } finally {
        setIsLoading(false);
      }
    };

    loadAccessControlData();
  }, [user?.id, profile?.id]);

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