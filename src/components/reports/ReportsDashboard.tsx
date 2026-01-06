'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  MessageSquare,
  Lightbulb,
  Star,
  Clock,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import ReportCard from './ReportCard';
import InsightCard from './InsightCard';

interface ReportsDashboardProps {
  onNavigate: (page: string) => void;
  onRunReport?: (reportId: string) => void;
}

interface QuickStats {
  prod_qty: number;
  rej_rate: number;
  dispatch_count: number;
  grn_value: number;
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ onNavigate, onRunReport }) => {
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [favorites, setFavorites] = useState<unknown[]>([]);
  const [insights, setInsights] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch favorites
        const favResponse = await fetch('/api/reports/saved?is_template=false');
        const favResult = await favResponse.json();
        if (favResult.success) {
          setFavorites(favResult.data.slice(0, 4));
        }
        
        // Generate mock quick stats for demo
        setQuickStats({
          prod_qty: 12450,
          rej_rate: 2.3,
          dispatch_count: 45,
          grn_value: 250000,
        });
        
        // Mock insights for demo
        setInsights([
          {
            id: 1,
            insight_type: 'alert',
            category: 'production',
            severity: 'warning',
            title: 'High Rejection Rate',
            summary: 'Rejection rate on RPRo10-C spiked to 15% yesterday (average: 3%)',
          },
          {
            id: 2,
            insight_type: 'trend',
            category: 'production',
            severity: 'info',
            title: 'Production Increasing',
            summary: 'Production increased 12% week-over-week',
            change_percent: 12,
          },
          {
            id: 3,
            insight_type: 'alert',
            category: 'stock',
            severity: 'warning',
            title: 'Low Stock Warning',
            summary: 'PP-HP-HJ333MO is at 250kg, below minimum threshold of 500kg',
          },
        ]);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Analytics and insights for your business</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStatCard
          label="Production Qty"
          value={quickStats?.prod_qty ?? 0}
          unit="pieces"
          icon={Package}
          change={8}
          trend="up"
          loading={loading}
        />
        <QuickStatCard
          label="Rejection Rate"
          value={quickStats?.rej_rate ?? 0}
          unit="%"
          icon={AlertTriangle}
          change={0.5}
          trend="down"
          trendPositive={true}
          loading={loading}
        />
        <QuickStatCard
          label="Dispatches"
          value={quickStats?.dispatch_count ?? 0}
          unit="today"
          icon={Truck}
          change={12}
          trend="up"
          loading={loading}
        />
        <QuickStatCard
          label="GRN Value"
          value={quickStats?.grn_value ?? 0}
          unit="₹"
          icon={TrendingUp}
          change={15}
          trend="up"
          isCurrency={true}
          loading={loading}
        />
      </div>
      
      {/* Tools Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🔧 Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report Builder */}
          <ToolCard
            title="Report Builder"
            description="Create custom reports with any data and charts"
            icon={BarChart3}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            onClick={() => onNavigate('builder')}
          />
          
          {/* Smart Query */}
          <ToolCard
            title="Smart Query"
            description="Ask questions in plain English (Coming Soon)"
            icon={MessageSquare}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            onClick={() => onNavigate('smart-query')}
            badge="AI"
          />
          
          {/* AI Insights */}
          <ToolCard
            title="AI Insights"
            description="Auto-detected patterns & alerts (Coming Soon)"
            icon={Lightbulb}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            onClick={() => onNavigate('insights')}
            badge={insights.length > 0 ? `${insights.length} New` : undefined}
          />
        </div>
      </div>
      
      {/* Favorite Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">⭐ Recent Reports</h2>
          <button
            onClick={() => onNavigate('saved')}
            className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {favorites.map((report: unknown) => {
              const r = report as { id: string; name: string; description?: string; category: string; config_json?: { chartType?: string }; updated_at?: string };
              return (
                <ReportCard
                  key={r.id}
                  report={{
                    ...r,
                    chartType: r.config_json?.chartType,
                  }}
                  onRun={() => onRunReport?.(r.id)}
                  onEdit={() => onNavigate(`builder?id=${r.id}`)}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No saved reports yet</p>
            <button
              onClick={() => onNavigate('builder')}
              className="mt-3 text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              Create your first report →
            </button>
          </div>
        )}
      </div>
      
      {/* Recent Insights */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">🔔 Recent Insights</h2>
          <button
            onClick={() => onNavigate('insights')}
            className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          {insights.slice(0, 3).map((insight: unknown) => {
            const i = insight as { id: number; insight_type: 'trend' | 'anomaly' | 'alert' | 'comparison' | 'opportunity'; category: string; severity: 'info' | 'warning' | 'critical'; title: string; summary?: string; change_percent?: number };
            return (
              <InsightCard
                key={i.id}
                insight={i}
                onDismiss={() => setInsights(prev => (prev as { id: number }[]).filter(x => x.id !== i.id))}
                onViewDetails={() => onNavigate('insights')}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface QuickStatCardProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  change?: number;
  trend?: 'up' | 'down';
  trendPositive?: boolean;
  isCurrency?: boolean;
  loading?: boolean;
}

const QuickStatCard: React.FC<QuickStatCardProps> = ({
  label,
  value,
  unit,
  icon: Icon,
  change,
  trend,
  trendPositive,
  isCurrency,
  loading,
}) => {
  const isPositiveChange = trendPositive ?? trend === 'up';
  
  const formatValue = () => {
    if (isCurrency) {
      if (value >= 100000) {
        return `₹${(value / 100000).toFixed(1)}L`;
      }
      return `₹${value.toLocaleString('en-IN')}`;
    }
    return value.toLocaleString('en-IN');
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
      </div>
      
      {loading ? (
        <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
      ) : (
        <>
          <div className="text-2xl font-bold text-gray-900">{formatValue()}</div>
          {!isCurrency && unit && <span className="text-sm text-gray-500">{unit}</span>}
        </>
      )}
      
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{isPositiveChange ? '+' : '-'}{Math.abs(change)}%</span>
        </div>
      )}
    </div>
  );
};

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
  badge?: string;
}

const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon: Icon,
  iconBg,
  iconColor,
  onClick,
  badge,
}) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {badge && (
          <span className="px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded">
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-slate-700">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium">
        Open <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
};

export default ReportsDashboard;

