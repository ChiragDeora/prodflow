'use client';

import React from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Hash,
  ScatterChart,
  Grid3X3,
} from 'lucide-react';

interface ChartType {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

const CHART_TYPES: ChartType[] = [
  { id: 'bar', name: 'Bar', icon: BarChart3, description: 'Vertical bars' },
  { id: 'horizontal_bar', name: 'H-Bar', icon: BarChart3, description: 'Horizontal bars' },
  { id: 'grouped_bar', name: 'Grouped', icon: BarChart3, description: 'Side by side' },
  { id: 'stacked_bar', name: 'Stacked', icon: BarChart3, description: 'Stacked bars' },
  { id: 'line', name: 'Line', icon: LineChart, description: 'Trends' },
  { id: 'area', name: 'Area', icon: LineChart, description: 'Filled area' },
  { id: 'pie', name: 'Pie', icon: PieChart, description: 'Proportions' },
  { id: 'donut', name: 'Donut', icon: PieChart, description: 'With center' },
  { id: 'table', name: 'Table', icon: Table2, description: 'Data table' },
  { id: 'kpi_cards', name: 'KPIs', icon: Hash, description: 'Big numbers' },
];

interface ChartTypeSelectorProps {
  selectedType: string;
  onChange: (type: string) => void;
  hasPrimaryDimension: boolean;
  hasSecondaryDimension: boolean;
  metricsCount: number;
}

const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  selectedType,
  onChange,
  hasPrimaryDimension,
  hasSecondaryDimension,
  metricsCount,
}) => {
  const isTypeAvailable = (type: string) => {
    // KPI cards work without dimensions
    if (type === 'kpi_cards') {
      return !hasPrimaryDimension && metricsCount > 0;
    }
    
    // Table works with anything
    if (type === 'table') {
      return true;
    }
    
    // Grouped/stacked need secondary dimension
    if (type === 'grouped_bar' || type === 'stacked_bar') {
      return hasSecondaryDimension;
    }
    
    // Most charts need a primary dimension
    return hasPrimaryDimension;
  };
  
  return (
    <div className="grid grid-cols-5 gap-1">
      {CHART_TYPES.map(chart => {
        const Icon = chart.icon;
        const available = isTypeAvailable(chart.id);
        const selected = selectedType === chart.id;
        
        return (
          <button
            key={chart.id}
            onClick={() => available && onChange(chart.id)}
            disabled={!available}
            title={`${chart.name} - ${chart.description}`}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
              selected
                ? 'bg-slate-800 text-white'
                : available
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            <Icon className={`w-4 h-4 ${chart.id === 'horizontal_bar' ? 'rotate-90' : ''}`} />
            <span className="text-[10px] mt-1">{chart.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ChartTypeSelector;

