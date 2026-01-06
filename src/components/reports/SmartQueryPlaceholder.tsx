'use client';

import React from 'react';
import {
  MessageSquare,
  Sparkles,
  Search,
  Database,
  Lock,
  Zap,
} from 'lucide-react';

interface SmartQueryPlaceholderProps {
  onBack?: () => void;
}

const SmartQueryPlaceholder: React.FC<SmartQueryPlaceholderProps> = ({ onBack }) => {
  return (
    <div className="min-h-[600px] flex flex-col items-center justify-center p-8">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6">
        <MessageSquare className="w-10 h-10 text-emerald-600" />
      </div>
      
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Smart Query</h1>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-amber-600 font-medium text-sm">AI-Powered</span>
      </div>
      
      {/* Description */}
      <p className="text-gray-500 text-center max-w-md mb-8">
        Ask questions about your data in plain English and get instant answers.
        No SQL knowledge required!
      </p>
      
      {/* Preview Input */}
      <div className="w-full max-w-lg mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            disabled
            placeholder="e.g., What was the total production last week?"
            className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl text-gray-400 bg-gray-50 cursor-not-allowed"
          />
          <button
            disabled
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-300 text-white rounded-lg cursor-not-allowed"
          >
            Ask
          </button>
        </div>
        
        {/* Example queries */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <span className="text-xs text-gray-400">Try:</span>
          {[
            'Total production last week',
            'Top 5 customers',
            'Rejection rate by mold',
            'Low stock items',
          ].map((example, i) => (
            <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
              {example}
            </span>
          ))}
        </div>
      </div>
      
      {/* Coming Soon Badge */}
      <div className="bg-slate-800 text-white px-6 py-3 rounded-xl flex items-center gap-3 mb-8">
        <Lock className="w-5 h-5" />
        <div>
          <div className="font-semibold">Coming Soon</div>
          <div className="text-sm text-slate-300">This feature is being developed</div>
        </div>
      </div>
      
      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
        <FeatureCard
          icon={MessageSquare}
          title="Natural Language"
          description="Ask questions in plain English, no coding required"
        />
        <FeatureCard
          icon={Database}
          title="All Your Data"
          description="Access production, dispatch, stock, and procurement data"
        />
        <FeatureCard
          icon={Zap}
          title="Instant Results"
          description="Get answers and visualizations in seconds"
        />
      </div>
      
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mt-8 text-slate-600 hover:text-slate-800 font-medium"
        >
          ← Back to Reports
        </button>
      )}
    </div>
  );
};

const FeatureCard: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
}> = ({ icon: Icon, title, description }) => (
  <div className="text-center p-4">
    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
      <Icon className="w-6 h-6 text-gray-600" />
    </div>
    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

export default SmartQueryPlaceholder;

