'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  X,
  ExternalLink,
} from 'lucide-react';

interface InsightCardProps {
  insight: {
    id: number;
    insight_type: 'trend' | 'anomaly' | 'alert' | 'comparison' | 'opportunity';
    category: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    summary?: string;
    details?: string;
    metric_name?: string;
    current_value?: string;
    comparison_value?: string;
    change_percent?: number;
  };
  onDismiss?: () => void;
  onViewDetails?: () => void;
}

const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onDismiss,
  onViewDetails,
}) => {
  // Get icon and colors based on type
  const getTypeConfig = () => {
    switch (insight.insight_type) {
      case 'trend':
        return {
          icon: insight.change_percent && insight.change_percent > 0 ? TrendingUp : TrendingDown,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          label: 'TREND',
          labelColor: 'bg-blue-100 text-blue-700',
        };
      case 'anomaly':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          label: 'ANOMALY',
          labelColor: 'bg-amber-100 text-amber-700',
        };
      case 'alert':
        return {
          icon: AlertTriangle,
          bgColor: insight.severity === 'critical' ? 'bg-red-50' : 'bg-orange-50',
          borderColor: insight.severity === 'critical' ? 'border-red-200' : 'border-orange-200',
          iconBg: insight.severity === 'critical' ? 'bg-red-100' : 'bg-orange-100',
          iconColor: insight.severity === 'critical' ? 'text-red-600' : 'text-orange-600',
          label: insight.severity === 'critical' ? 'CRITICAL' : 'WARNING',
          labelColor: insight.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700',
        };
      case 'comparison':
        return {
          icon: BarChart3,
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
          label: 'COMPARISON',
          labelColor: 'bg-purple-100 text-purple-700',
        };
      case 'opportunity':
        return {
          icon: Lightbulb,
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          label: 'OPPORTUNITY',
          labelColor: 'bg-emerald-100 text-emerald-700',
        };
      default:
        return {
          icon: BarChart3,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          label: 'INSIGHT',
          labelColor: 'bg-gray-100 text-gray-700',
        };
    }
  };
  
  const config = getTypeConfig();
  const Icon = config.icon;
  
  return (
    <div className={`rounded-xl border ${config.bgColor} ${config.borderColor} overflow-hidden`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${config.iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${config.labelColor}`}>
                {config.label}
              </span>
              <h3 className="font-semibold text-gray-900 mt-1">{insight.title}</h3>
            </div>
          </div>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Summary */}
        {insight.summary && (
          <p className="text-sm text-gray-600 mb-3">{insight.summary}</p>
        )}
        
        {/* Details */}
        {insight.details && (
          <p className="text-sm text-gray-500">{insight.details}</p>
        )}
        
        {/* Metrics */}
        {(insight.metric_name || insight.current_value || insight.change_percent) && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            {insight.metric_name && (
              <span className="text-gray-500">
                Metric: <span className="font-medium text-gray-700">{insight.metric_name}</span>
              </span>
            )}
            {insight.current_value && (
              <span className="text-gray-500">
                Value: <span className="font-medium text-gray-700">{insight.current_value}</span>
              </span>
            )}
            {insight.change_percent !== undefined && insight.change_percent !== null && (
              <span className={`font-medium ${insight.change_percent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {insight.change_percent > 0 ? '+' : ''}{insight.change_percent.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="px-4 py-3 bg-white/50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400 capitalize">{insight.category}</span>
        
        <div className="flex items-center gap-2">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white rounded-md transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Details
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-white rounded-md transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightCard;

