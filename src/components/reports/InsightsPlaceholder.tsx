'use client';

import React from 'react';
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Lock,
  Bell,
  Target,
} from 'lucide-react';
import InsightCard from './InsightCard';

interface InsightsPlaceholderProps {
  onBack?: () => void;
}

const InsightsPlaceholder: React.FC<InsightsPlaceholderProps> = ({ onBack }) => {
  // Mock insights for preview
  const mockInsights = [
    {
      id: 1,
      insight_type: 'alert' as const,
      category: 'production',
      severity: 'warning' as const,
      title: 'High Rejection Rate Detected',
      summary: 'Mold RPRo10-C rejection rate spiked to 15% yesterday',
      details: 'Average rejection rate is 3%. Investigation recommended.',
      metric_name: 'Rejection Rate',
      current_value: '15%',
      comparison_value: '3% (avg)',
    },
    {
      id: 2,
      insight_type: 'trend' as const,
      category: 'production',
      severity: 'info' as const,
      title: 'Production Increasing',
      summary: 'Overall production increased 12% week-over-week',
      change_percent: 12,
    },
    {
      id: 3,
      insight_type: 'opportunity' as const,
      category: 'production',
      severity: 'info' as const,
      title: 'Best Performer Identified',
      summary: 'Mold RPRo16-C has lowest rejection at 1.2% with high output',
    },
  ];
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              AI-Powered
            </div>
          </div>
          <p className="text-gray-500">Automatic pattern detection and intelligent alerts</p>
        </div>
        
        {/* Coming Soon Badge */}
        <div className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">Coming Soon</span>
        </div>
      </div>
      
      {/* Filter Tabs (disabled) */}
      <div className="flex gap-2 mb-6 opacity-50 pointer-events-none">
        {['All', 'Production', 'Stock', 'Dispatch', 'Alerts Only'].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              i === 0 ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Preview Insights */}
      <div className="relative">
        {/* Blur overlay */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
            <Lightbulb className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI Analysis Coming Soon</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            Our AI will automatically analyze your data to find trends, anomalies, 
            and opportunities. Get alerts before problems occur.
          </p>
          
          {/* Feature List */}
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Trend Detection
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Anomaly Alerts
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Bell className="w-4 h-4 text-red-500" />
              Proactive Warnings
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Target className="w-4 h-4 text-green-500" />
              Opportunity Finding
            </div>
          </div>
        </div>
        
        {/* Blurred content */}
        <div className="space-y-4 filter blur-[2px]">
          {mockInsights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
            />
          ))}
        </div>
      </div>
      
      {/* How It Will Work */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">How AI Insights Will Work</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StepCard
            number={1}
            title="Data Collection"
            description="AI continuously monitors your production, stock, dispatch, and procurement data"
            icon={BarChart3}
          />
          <StepCard
            number={2}
            title="Pattern Analysis"
            description="Machine learning algorithms detect trends, anomalies, and correlations"
            icon={TrendingUp}
          />
          <StepCard
            number={3}
            title="Smart Alerts"
            description="Get notified about issues before they become problems"
            icon={Bell}
          />
        </div>
      </div>
      
      {/* Back Button */}
      {onBack && (
        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-800 font-medium"
          >
            ← Back to Reports
          </button>
        </div>
      )}
    </div>
  );
};

const StepCard: React.FC<{
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
}> = ({ number, title, description, icon: Icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
    </div>
    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

export default InsightsPlaceholder;

