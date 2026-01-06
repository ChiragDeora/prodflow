'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { MetricDefinition, MetricCategory } from '@/lib/reports';

interface MetricSelectorProps {
  category: MetricCategory;
  selectedMetrics: string[];
  onChange: (metrics: string[]) => void;
  maxMetrics?: number;
}

const MetricSelector: React.FC<MetricSelectorProps> = ({
  category,
  selectedMetrics,
  onChange,
  maxMetrics = 5,
}) => {
  const [availableMetrics, setAvailableMetrics] = useState<MetricDefinition[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Fetch metrics for category
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/reports/metrics/${category}`);
        const result = await response.json();
        if (result.success) {
          setAvailableMetrics(result.data);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, [category]);
  
  const handleToggleMetric = (metricId: string) => {
    if (selectedMetrics.includes(metricId)) {
      onChange(selectedMetrics.filter(m => m !== metricId));
    } else if (selectedMetrics.length < maxMetrics) {
      onChange([...selectedMetrics, metricId]);
    }
  };
  
  const handleRemoveMetric = (metricId: string) => {
    onChange(selectedMetrics.filter(m => m !== metricId));
  };
  
  const getMetricById = (id: string) => availableMetrics.find(m => m.id === id);
  
  return (
    <div className="space-y-2">
      {/* Selected Metrics */}
      {selectedMetrics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedMetrics.map(metricId => {
            const metric = getMetricById(metricId);
            return (
              <span
                key={metricId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-sm"
              >
                {metric?.displayName || metricId}
                <button
                  onClick={() => handleRemoveMetric(metricId)}
                  className="p-0.5 hover:bg-slate-200 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      
      {/* Add Metric Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={selectedMetrics.length >= maxMetrics}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Metric {selectedMetrics.length > 0 && `(${selectedMetrics.length}/${maxMetrics})`}
        </button>
        
        {/* Dropdown */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
              ) : availableMetrics.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No metrics available</div>
              ) : (
                <div className="py-1">
                  {availableMetrics.map(metric => {
                    const isSelected = selectedMetrics.includes(metric.id);
                    const isDisabled = !isSelected && selectedMetrics.length >= maxMetrics;
                    
                    return (
                      <button
                        key={metric.id}
                        onClick={() => {
                          handleToggleMetric(metric.id);
                          if (!isSelected && selectedMetrics.length === maxMetrics - 1) {
                            setIsOpen(false);
                          }
                        }}
                        disabled={isDisabled}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          isSelected ? 'bg-slate-50' : ''
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div>
                          <div className="font-medium text-gray-900">{metric.displayName}</div>
                          {metric.description && (
                            <div className="text-xs text-gray-500">{metric.description}</div>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-slate-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MetricSelector;

