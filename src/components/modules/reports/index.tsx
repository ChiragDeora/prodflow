'use client';

import React, { useState, useCallback } from 'react';
import {
  BarChart3,
  FileText,
  Layers,
  MessageSquare,
  Lightbulb,
  Star,
  ChevronLeft,
} from 'lucide-react';
import ReportsDashboard from '@/components/reports/ReportsDashboard';
import ReportBuilder from '@/components/reports/ReportBuilder';
import TemplateGallery from '@/components/reports/TemplateGallery';
import SmartQueryPlaceholder from '@/components/reports/SmartQueryPlaceholder';
import InsightsPlaceholder from '@/components/reports/InsightsPlaceholder';
import SavedReportsPage from './SavedReportsPage';

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
  { id: 'dashboard' as ReportPage, label: 'Dashboard', icon: BarChart3 },
  { id: 'builder' as ReportPage, label: 'Report Builder', icon: Layers },
  { id: 'templates' as ReportPage, label: 'Templates', icon: FileText },
  { id: 'saved' as ReportPage, label: 'Saved Reports', icon: Star },
  { id: 'smart-query' as ReportPage, label: 'Smart Query', icon: MessageSquare, badge: 'AI' },
  { id: 'insights' as ReportPage, label: 'AI Insights', icon: Lightbulb, badge: 'AI' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ReportsModule: React.FC<ReportsModuleProps> = ({ onSubNavClick }) => {
  const [activePage, setActivePage] = useState<ReportPage>('dashboard');
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
          <ReportBuilder
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
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Sub Navigation */}
      <div className="border-b border-gray-200 bg-white app-subnav">
        <nav className="flex items-center gap-1 px-4 overflow-x-auto">
          {NAV_ITEMS.map(item => {
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
