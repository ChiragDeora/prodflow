'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { DimensionDefinition, MetricCategory } from '@/lib/reports';

interface DimensionSelectorProps {
  category: MetricCategory;
  primaryDimension?: string;
  secondaryDimension?: string;
  onPrimaryChange: (dimension: string | undefined) => void;
  onSecondaryChange: (dimension: string | undefined) => void;
}

const DimensionSelector: React.FC<DimensionSelectorProps> = ({
  category,
  primaryDimension,
  secondaryDimension,
  onPrimaryChange,
  onSecondaryChange,
}) => {
  const [availableDimensions, setAvailableDimensions] = useState<DimensionDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch dimensions for category
  useEffect(() => {
    const fetchDimensions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/reports/dimensions/${category}`);
        const result = await response.json();
        if (result.success) {
          setAvailableDimensions(result.data);
        }
      } catch (error) {
        console.error('Error fetching dimensions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDimensions();
  }, [category]);
  
  // Group dimensions by type
  const dateDimensions = availableDimensions.filter(d => d.type === 'date');
  const categoricalDimensions = availableDimensions.filter(d => d.type === 'categorical' || d.type === 'text');
  
  return (
    <div className="space-y-3">
      {/* Primary Dimension (X-Axis) */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">X-Axis / Primary</label>
        <select
          value={primaryDimension || ''}
          onChange={(e) => onPrimaryChange(e.target.value || undefined)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
        >
          <option value="">None (Show totals only)</option>
          
          {dateDimensions.length > 0 && (
            <optgroup label="Time-Based">
              {dateDimensions.map(dim => (
                <option key={dim.id} value={dim.id}>
                  {dim.displayName}
                </option>
              ))}
            </optgroup>
          )}
          
          {categoricalDimensions.length > 0 && (
            <optgroup label="Categories">
              {categoricalDimensions.map(dim => (
                <option key={dim.id} value={dim.id}>
                  {dim.displayName}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      
      {/* Secondary Dimension (Group By) */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Group By / Secondary</label>
        <select
          value={secondaryDimension || ''}
          onChange={(e) => onSecondaryChange(e.target.value || undefined)}
          disabled={loading || !primaryDimension}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">None</option>
          
          {dateDimensions.length > 0 && (
            <optgroup label="Time-Based">
              {dateDimensions
                .filter(d => d.id !== primaryDimension)
                .map(dim => (
                  <option key={dim.id} value={dim.id}>
                    {dim.displayName}
                  </option>
                ))}
            </optgroup>
          )}
          
          {categoricalDimensions.length > 0 && (
            <optgroup label="Categories">
              {categoricalDimensions
                .filter(d => d.id !== primaryDimension)
                .map(dim => (
                  <option key={dim.id} value={dim.id}>
                    {dim.displayName}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
        {!primaryDimension && (
          <p className="text-xs text-gray-400 mt-1">Select a primary dimension first</p>
        )}
      </div>
    </div>
  );
};

export default DimensionSelector;

