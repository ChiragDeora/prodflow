'use client';

import React from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Star,
  MoreVertical,
  Play,
  Edit2,
  Trash2,
  Share2,
  Clock,
  Eye,
} from 'lucide-react';

interface ReportCardProps {
  report: {
    id: string;
    name: string;
    description?: string;
    category: string;
    chartType?: string;
    updated_at?: string;
    view_count?: number;
    is_template?: boolean;
  };
  isFavorite?: boolean;
  onRun?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({
  report,
  isFavorite = false,
  onRun,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  
  // Get chart icon based on type
  const getChartIcon = () => {
    const chartType = report.chartType || 'bar';
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
  
  const ChartIcon = getChartIcon();
  
  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };
  
  // Category colors
  const categoryColors: Record<string, string> = {
    production: 'bg-blue-100 text-blue-700',
    dispatch: 'bg-green-100 text-green-700',
    stock: 'bg-amber-100 text-amber-700',
    procurement: 'bg-purple-100 text-purple-700',
    general: 'bg-gray-100 text-gray-700',
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <ChartIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{report.name}</h3>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${categoryColors[report.category] || categoryColors.general}`}>
              {report.category}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className={`p-1.5 rounded hover:bg-gray-100 ${isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-36">
                  {onRun && (
                    <button
                      onClick={() => { onRun(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Play className="w-4 h-4" />
                      Run Report
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => { onEdit(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => { onDelete(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Description */}
      {report.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{report.description}</p>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(report.updated_at)}
          </span>
          {report.view_count !== undefined && (
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {report.view_count}
            </span>
          )}
        </div>
        
        {report.is_template && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
            Template
          </span>
        )}
      </div>
      
      {/* Run button overlay on hover */}
      {onRun && (
        <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRun}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            <Play className="w-4 h-4" />
            Run Report
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportCard;

