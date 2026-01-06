// ============================================================================
// CHART CONFIGURATION
// ============================================================================
// Defines available chart types and their configurations

import { LucideIcon, BarChart3, LineChart, PieChart, Table2, Hash, ScatterChart, Grid3X3 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type ChartTypeId = 
  | 'bar' 
  | 'horizontal_bar' 
  | 'grouped_bar' 
  | 'stacked_bar'
  | 'line' 
  | 'multi_line' 
  | 'area' 
  | 'stacked_area'
  | 'pie' 
  | 'donut'
  | 'scatter'
  | 'heatmap'
  | 'table'
  | 'kpi_cards'
  | 'combo';

export interface ChartTypeDefinition {
  id: ChartTypeId;
  displayName: string;
  icon: LucideIcon;
  description: string;
  supportsSingleDimension: boolean;
  supportsDualDimension: boolean;
  supportsMultipleMetrics: boolean;
  maxCategories?: number;  // For pie charts
  requiresTimeDimension?: boolean;
}

export interface ChartOptions {
  showValues?: boolean;
  showLegend?: boolean;
  showGridLines?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  smoothLines?: boolean;
  sortByValue?: 'asc' | 'desc';
  topN?: number;
  showTrendLine?: boolean;
  colorPalette?: string;
}

// ============================================================================
// CHART TYPE DEFINITIONS
// ============================================================================

export const CHART_TYPES: ChartTypeDefinition[] = [
  {
    id: 'bar',
    displayName: 'Bar Chart',
    icon: BarChart3,
    description: 'Compare values across categories',
    supportsSingleDimension: true,
    supportsDualDimension: false,
    supportsMultipleMetrics: true,
  },
  {
    id: 'horizontal_bar',
    displayName: 'Horizontal Bar',
    icon: BarChart3,
    description: 'Best for long category names',
    supportsSingleDimension: true,
    supportsDualDimension: false,
    supportsMultipleMetrics: true,
  },
  {
    id: 'grouped_bar',
    displayName: 'Grouped Bar',
    icon: BarChart3,
    description: 'Compare two dimensions',
    supportsSingleDimension: false,
    supportsDualDimension: true,
    supportsMultipleMetrics: false,
  },
  {
    id: 'stacked_bar',
    displayName: 'Stacked Bar',
    icon: BarChart3,
    description: 'Part-to-whole across categories',
    supportsSingleDimension: false,
    supportsDualDimension: true,
    supportsMultipleMetrics: false,
  },
  {
    id: 'line',
    displayName: 'Line Chart',
    icon: LineChart,
    description: 'Trends over time',
    supportsSingleDimension: true,
    supportsDualDimension: false,
    supportsMultipleMetrics: true,
    requiresTimeDimension: true,
  },
  {
    id: 'multi_line',
    displayName: 'Multi-Line',
    icon: LineChart,
    description: 'Compare multiple trends',
    supportsSingleDimension: false,
    supportsDualDimension: true,
    supportsMultipleMetrics: false,
    requiresTimeDimension: true,
  },
  {
    id: 'area',
    displayName: 'Area Chart',
    icon: LineChart,
    description: 'Volume over time',
    supportsSingleDimension: true,
    supportsDualDimension: false,
    supportsMultipleMetrics: true,
    requiresTimeDimension: true,
  },
  {
    id: 'stacked_area',
    displayName: 'Stacked Area',
    icon: LineChart,
    description: 'Composition over time',
    supportsSingleDimension: false,
    supportsDualDimension: true,
    supportsMultipleMetrics: false,
    requiresTimeDimension: true,
  },
  {
    id: 'pie',
    displayName: 'Pie Chart',
    icon: PieChart,
    description: 'Simple proportions',
    supportsSingleDimension: true,
    supportsDualDimension: false,
    supportsMultipleMetrics: false,
    maxCategories: 7,
  },
  {
    id: 'donut',
    displayName: 'Donut Chart',
    icon: PieChart,
    description: 'Proportions with center stat',
    supportsSingleDimension: true,
    supportsDualDimension: false,
    supportsMultipleMetrics: false,
    maxCategories: 7,
  },
  {
    id: 'scatter',
    displayName: 'Scatter Plot',
    icon: ScatterChart,
    description: 'Correlation between metrics',
    supportsSingleDimension: true,
    supportsDualDimension: false,
    supportsMultipleMetrics: true,
  },
  {
    id: 'heatmap',
    displayName: 'Heatmap',
    icon: Grid3X3,
    description: 'Two dimensions with intensity',
    supportsSingleDimension: false,
    supportsDualDimension: true,
    supportsMultipleMetrics: false,
  },
  {
    id: 'table',
    displayName: 'Data Table',
    icon: Table2,
    description: 'Detailed numbers',
    supportsSingleDimension: true,
    supportsDualDimension: true,
    supportsMultipleMetrics: true,
  },
  {
    id: 'kpi_cards',
    displayName: 'KPI Cards',
    icon: Hash,
    description: 'Big numbers, totals',
    supportsSingleDimension: false,
    supportsDualDimension: false,
    supportsMultipleMetrics: true,
  },
  {
    id: 'combo',
    displayName: 'Combo Chart',
    icon: BarChart3,
    description: 'Bar + Line together',
    supportsSingleDimension: true,
    supportsDualDimension: false,
    supportsMultipleMetrics: true,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get chart type by ID
 */
export function getChartTypeById(id: ChartTypeId): ChartTypeDefinition | undefined {
  return CHART_TYPES.find(ct => ct.id === id);
}

/**
 * Suggest best chart type based on configuration
 */
export function suggestChartType(
  metricsCount: number,
  hasPrimaryDimension: boolean,
  hasSecondaryDimension: boolean,
  isTimeDimension: boolean,
  categoriesCount?: number
): ChartTypeId {
  // No dimensions = KPI cards
  if (!hasPrimaryDimension) {
    return 'kpi_cards';
  }
  
  // Two dimensions
  if (hasSecondaryDimension) {
    if (isTimeDimension) {
      return 'multi_line';
    }
    return 'grouped_bar';
  }
  
  // Single dimension
  if (isTimeDimension) {
    return 'line';
  }
  
  // Small number of categories = pie chart
  if (categoriesCount && categoriesCount <= 7 && metricsCount === 1) {
    return 'pie';
  }
  
  // Two metrics = scatter or combo
  if (metricsCount >= 2) {
    return 'combo';
  }
  
  // Default = bar chart
  return 'bar';
}

/**
 * Get default chart options for a chart type
 */
export function getDefaultChartOptions(chartType: ChartTypeId): ChartOptions {
  const defaults: ChartOptions = {
    showValues: false,
    showLegend: true,
    showGridLines: true,
    stacked: false,
    horizontal: false,
    smoothLines: true,
  };
  
  switch (chartType) {
    case 'horizontal_bar':
      return { ...defaults, horizontal: true };
    case 'stacked_bar':
    case 'stacked_area':
      return { ...defaults, stacked: true };
    case 'pie':
    case 'donut':
      return { ...defaults, showValues: true, showGridLines: false };
    case 'kpi_cards':
      return { ...defaults, showLegend: false, showGridLines: false };
    case 'table':
      return { ...defaults, showLegend: false, showGridLines: false };
    default:
      return defaults;
  }
}

/**
 * Get available chart types for a given configuration
 */
export function getAvailableChartTypes(
  hasPrimaryDimension: boolean,
  hasSecondaryDimension: boolean,
  metricsCount: number
): ChartTypeDefinition[] {
  return CHART_TYPES.filter(ct => {
    // KPI cards don't need dimensions
    if (ct.id === 'kpi_cards') {
      return !hasPrimaryDimension && metricsCount > 0;
    }
    
    // Table works with anything
    if (ct.id === 'table') {
      return true;
    }
    
    // Check dimension requirements
    if (hasSecondaryDimension && !ct.supportsDualDimension) {
      return false;
    }
    
    if (hasPrimaryDimension && !hasSecondaryDimension && !ct.supportsSingleDimension) {
      return false;
    }
    
    // Check metric requirements
    if (metricsCount > 1 && !ct.supportsMultipleMetrics && ct.id !== 'grouped_bar' && ct.id !== 'stacked_bar') {
      return false;
    }
    
    return true;
  });
}

// ============================================================================
// COLOR PALETTES
// ============================================================================

export const COLOR_PALETTES: Record<string, string[]> = {
  default: [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  ],
  ocean: [
    '#0EA5E9', '#0284C7', '#0369A1', '#075985', '#0C4A6E',
    '#083344', '#164E63', '#155E75', '#0E7490', '#06B6D4',
  ],
  forest: [
    '#22C55E', '#16A34A', '#15803D', '#166534', '#14532D',
    '#134D24', '#365314', '#3F6212', '#4D7C0F', '#65A30D',
  ],
  sunset: [
    '#F97316', '#EA580C', '#C2410C', '#9A3412', '#7C2D12',
    '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA',
  ],
  purple: [
    '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95',
    '#A855F7', '#C084FC', '#D8B4FE', '#E9D5FF', '#F3E8FF',
  ],
  monochrome: [
    '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF',
    '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB', '#FFFFFF',
  ],
};

/**
 * Get colors for a palette
 */
export function getPaletteColors(paletteName: string = 'default'): string[] {
  return COLOR_PALETTES[paletteName] || COLOR_PALETTES.default;
}

