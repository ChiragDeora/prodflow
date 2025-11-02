import { useAuth } from '../components/auth/AuthProvider';

interface AccessControlState {
  canAccessModule: (moduleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  canPerformAction: (action: string, resource: string) => boolean;
  getModuleAccessLevel: (moduleName: string) => string;
  isLoading: boolean;
  error: string | null;
}

export const useAccessControl = (): AccessControlState => {
  const { user, isLoading, error } = useAuth();

  const canAccessModule = (moduleName: string): boolean => {
    if (!user) return false;
    // For now, allow access to all modules if user is logged in
    // This can be extended with proper permission checking
    return true;
  };

  const hasPermission = (permissionName: string): boolean => {
    if (!user) return false;
    // For now, root admin has all permissions
    return user.isRootAdmin || false;
  };

  const canPerformAction = (action: string, resource: string): boolean => {
    if (!user) return false;
    // Simple implementation - root admin can do everything
    return user.isRootAdmin || false;
  };

  const getModuleAccessLevel = (moduleName: string): string => {
    if (!user) return 'blocked';
    // For now, return 'full' access for logged in users
    return 'full';
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