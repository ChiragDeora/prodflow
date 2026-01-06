'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Play,
  Copy,
  Loader2,
  Search,
  Filter,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  config_json: {
    chartType?: string;
    dataSource?: string;
    metrics?: string[];
  };
}

interface TemplateGalleryProps {
  onUseTemplate: (template: Template) => void;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onUseTemplate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/reports/templates');
        const result = await response.json();
        if (result.success) {
          setTemplates(result.data);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTemplates();
  }, []);
  
  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  
  // Group templates by category
  const categories = ['all', ...new Set(templates.map(t => t.category))];
  
  // Get chart icon
  const getChartIcon = (chartType?: string) => {
    switch (chartType) {
      case 'line':
      case 'multi_line':
      case 'area':
        return LineChart;
      case 'pie':
      case 'donut':
        return PieChart;
      case 'table':
        return Table2;
      default:
        return BarChart3;
    }
  };
  
  // Category colors
  const categoryColors: Record<string, string> = {
    production: 'bg-blue-100 text-blue-700 border-blue-200',
    dispatch: 'bg-green-100 text-green-700 border-green-200',
    stock: 'bg-amber-100 text-amber-700 border-amber-200',
    procurement: 'bg-purple-100 text-purple-700 border-purple-200',
  };
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
        <p className="text-gray-500 mt-1">Pre-built reports to get you started quickly</p>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-500"
          />
        </div>
        
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-20">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => {
            const ChartIcon = getChartIcon(template.config_json.chartType);
            
            return (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* Preview Area */}
                <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b border-gray-100">
                  <ChartIcon className="w-16 h-16 text-gray-300" />
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize border ${categoryColors[template.category] || 'bg-gray-100 text-gray-700'}`}>
                        {template.category}
                      </span>
                    </div>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{template.description}</p>
                  )}
                  
                  {/* Metrics preview */}
                  {template.config_json.metrics && template.config_json.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.config_json.metrics.slice(0, 3).map(metric => (
                        <span key={metric} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          {metric.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {template.config_json.metrics.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                          +{template.config_json.metrics.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onUseTemplate(template)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Use Template
                    </button>
                    <button
                      onClick={() => onUseTemplate(template)}
                      className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Customize"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TemplateGallery;

