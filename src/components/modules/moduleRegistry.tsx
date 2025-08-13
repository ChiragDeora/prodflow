import React, { ComponentType } from 'react';
import { LucideIcon } from 'lucide-react';

// Import all module components
import ProductionScheduler from './production-schedule';
import MasterDataModule from './master-data';
import ApprovalsModule from './approvals';
import ReportsModule from './reports';
import OperatorPanel from './operator-panel';
import UserProfileModule from './profile';
import MaintenanceManagementModule from './maintenance-management';
import QualityControlModule from './quality-control';

// Import all module configs
import { moduleConfig as productionScheduleConfig } from './production-schedule/moduleConfig';
import { moduleConfig as masterDataConfig } from './master-data/moduleConfig';
import { moduleConfig as approvalsConfig } from './approvals/moduleConfig';
import { moduleConfig as reportsConfig } from './reports/moduleConfig';
import { moduleConfig as operatorPanelConfig } from './operator-panel/moduleConfig';
import { moduleConfig as profileConfig } from './profile/moduleConfig';
import { moduleConfig as maintenanceConfig } from './maintenance-management/moduleConfig';
import { moduleConfig as qualityConfig } from './quality-control/moduleConfig';

export interface ModuleConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface ModuleDefinition {
  config: ModuleConfig;
  component: ComponentType<any>;
}

// Module registry - maps module IDs to their components and configs
export const moduleRegistry: Record<string, ModuleDefinition> = {
  'scheduler': {
    config: productionScheduleConfig,
    component: ProductionScheduler
  },
  'masters': {
    config: masterDataConfig,
    component: MasterDataModule
  },
  'approvals': {
    config: approvalsConfig,
    component: ApprovalsModule
  },
  'reports': {
    config: reportsConfig,
    component: ReportsModule
  },
  'operators': {
    config: operatorPanelConfig,
    component: OperatorPanel
  },
  'maintenance': {
    config: maintenanceConfig,
    component: MaintenanceManagementModule
  },
  'quality': {
    config: qualityConfig,
    component: QualityControlModule
  },
  'profile': {
    config: profileConfig,
    component: UserProfileModule
  }
};

// Get all available modules
export const getAvailableModules = (): ModuleConfig[] => {
  return Object.values(moduleRegistry).map(module => module.config);
};

// Get a specific module
export const getModule = (moduleId: string): ModuleDefinition | undefined => {
  return moduleRegistry[moduleId];
};