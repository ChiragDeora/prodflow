'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Loader2,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import ReportCard from '@/components/reports/ReportCard';

interface SavedReport {
  id: string;
  name: string;
  description?: string;
  category: string;
  config_json: {
    chartType?: string;
    dataSource?: string;
  };
  updated_at?: string;
  view_count?: number;
  is_template?: boolean;
}

interface SavedReportsPageProps {
  onNavigate: (page: string) => void;
}

const SavedReportsPage: React.FC<SavedReportsPageProps> = ({ onNavigate }) => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Fetch saved reports
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/reports/saved?is_template=false');
        const result = await response.json();
        if (result.success) {
          setReports(result.data);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReports();
  }, []);
  
  // Filter reports
  const filteredReports = reports.filter(report => {
    if (selectedCategory !== 'all' && report.category !== selectedCategory) return false;
    if (searchTerm && !report.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  
  // Get categories
  const categories = ['all', ...new Set(reports.map(r => r.category))];
  
  // Handle delete report
  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      const response = await fetch(`/api/reports/saved/${reportId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setReports(prev => prev.filter(r => r.id !== reportId));
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };
  
  // Handle toggle favorite
  const handleToggleFavorite = (reportId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(reportId)) {
        newFavorites.delete(reportId);
      } else {
        newFavorites.add(reportId);
      }
      return newFavorites;
    });
  };
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Reports</h1>
          <p className="text-gray-500 mt-1">Your custom reports and analytics</p>
        </div>
        <button
          onClick={() => onNavigate('builder')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
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
            placeholder="Search reports..."
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
      
      {/* Reports Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No reports found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your filters'
              : 'Create your first report to get started'}
          </p>
          <button
            onClick={() => onNavigate('builder')}
            className="text-slate-600 hover:text-slate-800 font-medium"
          >
            Create a report →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={{
                ...report,
                chartType: report.config_json?.chartType,
              }}
              isFavorite={favorites.has(report.id)}
              onRun={() => onNavigate(`builder?id=${report.id}`)}
              onEdit={() => onNavigate(`builder?id=${report.id}`)}
              onDelete={() => handleDelete(report.id)}
              onToggleFavorite={() => handleToggleFavorite(report.id)}
            />
          ))}
        </div>
      )}
      
      {/* Summary */}
      {!loading && filteredReports.length > 0 && (
        <div className="mt-6 text-sm text-gray-500 text-center">
          Showing {filteredReports.length} of {reports.length} reports
        </div>
      )}
    </div>
  );
};

export default SavedReportsPage;

