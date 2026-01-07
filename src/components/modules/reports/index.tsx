'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  BarChart3,
  FileText,
  Layers,
  MessageSquare,
  Lightbulb,
  Star,
  ChevronLeft,
  Database,
} from 'lucide-react';
import ReportsDashboard from '@/components/reports/ReportsDashboard';
import UnifiedReportBuilder from '@/components/reports/UnifiedReportBuilder';
import TemplateGallery from '@/components/reports/TemplateGallery';
import SmartQueryPlaceholder from '@/components/reports/SmartQueryPlaceholder';
import InsightsPlaceholder from '@/components/reports/InsightsPlaceholder';
import SavedReportsPage from './SavedReportsPage';
import { useAccessControl } from '@/lib/useAccessControl';

// ============================================================================
// TYPES
// ============================================================================

type ReportPage = 'dashboard' | 'builder' | 'templates' | 'saved' | 'smart-query' | 'insights';

interface ReportsModuleProps {
  onSubNavClick?: () => void;
}

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

const NAV_ITEMS = [
  { id: 'dashboard' as ReportPage, label: 'Dashboard', icon: BarChart3, resource: 'Reports Dashboard' },
  { id: 'builder' as ReportPage, label: 'Report Builder', icon: Database, resource: 'Report Builder' },
  { id: 'templates' as ReportPage, label: 'Templates', icon: FileText, resource: 'Report Templates' },
  { id: 'saved' as ReportPage, label: 'Saved Reports', icon: Star, resource: 'Saved Reports' },
  { id: 'smart-query' as ReportPage, label: 'Smart Query', icon: MessageSquare, badge: 'AI', resource: 'Smart Query' },
  { id: 'insights' as ReportPage, label: 'AI Insights', icon: Lightbulb, badge: 'AI', resource: 'AI Insights' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ReportsModule: React.FC<ReportsModuleProps> = ({ onSubNavClick }) => {
  const { canAccessResource, isRootAdmin } = useAccessControl();
  
  // Filter tabs based on permissions
  const accessibleTabs = useMemo(() => {
    if (isRootAdmin) return NAV_ITEMS;
    return NAV_ITEMS.filter(item => canAccessResource(item.resource));
  }, [canAccessResource, isRootAdmin]);

  const [activePage, setActivePage] = useState<ReportPage>(() => {
    // Default to first accessible tab
    return accessibleTabs.length > 0 ? accessibleTabs[0].id : 'dashboard';
  });
  const [builderConfig, setBuilderConfig] = useState<unknown>(null);
  
  // Handle navigation
  const handleNavigate = useCallback((page: string) => {
    // Parse page and optional params
    const [pageName, params] = page.split('?');
    setActivePage(pageName as ReportPage);
    
    // Handle builder with pre-loaded config
    if (pageName === 'builder' && params) {
      const searchParams = new URLSearchParams(params);
      const reportId = searchParams.get('id');
      if (reportId) {
        // Load report config
        loadReportConfig(reportId);
      }
    }
    
    onSubNavClick?.();
  }, [onSubNavClick]);
  
  // Load report configuration
  const loadReportConfig = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/saved/${reportId}`);
      const result = await response.json();
      if (result.success) {
        setBuilderConfig(result.data.config_json);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    }
  };
  
  // Handle template selection
  const handleUseTemplate = (template: unknown) => {
    const t = template as { config_json: unknown };
    setBuilderConfig(t.config_json);
    setActivePage('builder');
  };
  
  // Handle save report
  const handleSaveReport = async (config: unknown, name: string) => {
    try {
      const response = await fetch('/api/reports/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          config_json: config,
          category: (config as { dataSource?: string })?.dataSource || 'general',
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        // Navigate to saved reports
        setActivePage('saved');
      }
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };
  
  // Render current page
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <ReportsDashboard
            onNavigate={handleNavigate}
            onRunReport={(id) => handleNavigate(`builder?id=${id}`)}
          />
        );
      
      case 'builder':
        return (
          <UnifiedReportBuilder
            initialConfig={builderConfig as Record<string, unknown> | undefined}
            onSave={handleSaveReport}
          />
        );
      
      case 'templates':
        return (
          <TemplateGallery
            onUseTemplate={handleUseTemplate}
          />
        );
      
      case 'saved':
        return (
          <SavedReportsPage
            onNavigate={handleNavigate}
          />
        );
      
      case 'smart-query':
        return (
          <SmartQueryPlaceholder
            onBack={() => setActivePage('dashboard')}
          />
        );
      
      case 'insights':
        return (
          <InsightsPlaceholder
            onBack={() => setActivePage('dashboard')}
          />
        );
      
      default:
        return (
          <ReportsDashboard
            onNavigate={handleNavigate}
          />
        );
    }
  };
  
  // If user has no access to any tabs, show a message
  if (accessibleTabs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Access</h3>
          <p className="text-gray-600">You don't have permission to access any Reports tabs.</p>
          <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Sub Navigation - Only shows tabs user has permission for */}
      <div className="border-b border-gray-200 bg-white app-subnav">
        <nav className="flex items-center gap-1 px-4 overflow-x-auto">
          {accessibleTabs.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setBuilderConfig(null);
                  onSubNavClick?.();
                }}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-slate-700 text-slate-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {item.badge && (
                  <span className="px-1.5 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Page Content */}
      <div className="flex-1 overflow-auto">
        {renderPage()}
      </div>
    </div>
  );
};

export default ReportsModule;
