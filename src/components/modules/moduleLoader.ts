import { ComponentType, lazy } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ModuleConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface ModuleInfo {
  config: ModuleConfig;
  component: ComponentType<any>;
}

// Dynamic module loading
export const loadModule = async (moduleId: string): Promise<ModuleInfo> => {
  try {
    // Load module config and component dynamically
    const [configModule, componentModule] = await Promise.all([
      import(`./modules/${moduleId}/moduleConfig`),
      import(`./modules/${moduleId}/index`)
    ]);

    return {
      config: configModule.moduleConfig,
      component: componentModule.default
    };
  } catch (error) {
    console.error(`Failed to load module ${moduleId}:`, error);
    throw error;
  }
};

// Get all available modules by scanning the modules directory
export const getAvailableModules = async (): Promise<ModuleConfig[]> => {
  // For now, we'll hardcode the available modules
  // In a real implementation, you might scan the filesystem or use a registry
  const moduleIds = [
    'production-schedule',
    'master-data', 
    'approvals',
    'reports',
    'operator-panel',
    'profile'
  ];

  const modules: ModuleConfig[] = [];
  
  for (const moduleId of moduleIds) {
    try {
      const { config } = await loadModule(moduleId);
      modules.push(config);
    } catch (error) {
      console.warn(`Failed to load module ${moduleId}:`, error);
    }
  }

  return modules;
};