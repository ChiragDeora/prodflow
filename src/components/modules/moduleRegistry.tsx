import React, { ComponentType } from 'react';
import { LucideIcon } from 'lucide-react';

// Import all module components
import ProductionScheduler from './production-schedule';
import MasterDataModule from './master-data';
import ApprovalsModule from './approvals';
import ReportsModule from './reports';
import UserProfileModule from './profile';
import MaintenanceManagementModule from './maintenance-management';
import QualityControlModule from './quality-control';
import ProdPlanner from './prod-planner';
import ProductionModule from './production';
import StoreDispatchModule from './store-dispatch';
import WelcomeDashboard from './welcome-dashboard';
import StockLedgerModule from './stock-ledger';



// Import all module configs
import { moduleConfig as productionScheduleConfig } from './production-schedule/moduleConfig';
import { moduleConfig as masterDataConfig } from './master-data/moduleConfig';
import { moduleConfig as approvalsConfig } from './approvals/moduleConfig';
import { moduleConfig as reportsConfig } from './reports/moduleConfig';
import { moduleConfig as profileConfig } from './profile/moduleConfig';
import { moduleConfig as maintenanceConfig } from './maintenance-management/moduleConfig';
import { moduleConfig as qualityConfig } from './quality-control/moduleConfig';
import { moduleConfig as prodPlannerConfig } from './prod-planner/moduleConfig';
import { moduleConfig as productionConfig } from './production/moduleConfig';
import { moduleConfig as storeDispatchConfig } from './store-dispatch/moduleConfig';
import { moduleConfig as welcomeDashboardConfig } from './welcome-dashboard/moduleConfig';
import { moduleConfig as stockLedgerConfig } from './stock-ledger/moduleConfig';



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
// Ordered as: dashboard, masters, store, prod planner, production, quality, maintenance, approvals, reports
export const moduleRegistry: Record<string, ModuleDefinition> = {
  'welcome-dashboard': {
    config: welcomeDashboardConfig,
    component: WelcomeDashboard
  },
  'scheduler': {
    config: productionScheduleConfig,
    component: ProductionScheduler
  },
  'masters': {
    config: masterDataConfig,
    component: MasterDataModule
  },
  'store-dispatch': {
    config: storeDispatchConfig,
    component: StoreDispatchModule
  },
  'stock-ledger': {
    config: stockLedgerConfig,
    component: StockLedgerModule
  },
  'prod-planner': {
    config: prodPlannerConfig,
    component: ProdPlanner
  },
  'production': {
    config: productionConfig,
    component: ProductionModule
  },
  'quality': {
    config: qualityConfig,
    component: QualityControlModule
  },
  'maintenance': {
    config: maintenanceConfig,
    component: MaintenanceManagementModule
  },
  'approvals': {
    config: approvalsConfig,
    component: ApprovalsModule
  },
  'reports': {
    config: reportsConfig,
    component: ReportsModule
  },
  'profile': {
    config: profileConfig,
    component: UserProfileModule
  },
};

// Get all available modules
export const getAvailableModules = (): ModuleConfig[] => {
  return Object.values(moduleRegistry).map(module => module.config);
};

// Get a specific module
export const getModule = (moduleId: string): ModuleDefinition | undefined => {
  return moduleRegistry[moduleId];
};