// ============================================================================
// REPORTS LIBRARY
// ============================================================================
// Export all report-related utilities

// Metrics
export * from './metrics';

// Dimensions
export * from './dimensions';

// Query Builder
export * from './query-builder';

// Data Transformer
export * from './data-transformer';

// Chart Configuration
export * from './chart-config';

// Data Sources
export * from './data-sources';

// ============================================================================
// TYPES
// ============================================================================

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  category: string;
  config_json: ReportConfigJson;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  is_public: boolean;
  is_template: boolean;
  view_count: number;
  last_viewed_at?: string;
}

export interface ReportConfigJson {
  dataSource: string;
  metrics: string[];
  primaryDimension?: string;
  secondaryDimension?: string;
  filters: Record<string, unknown>;
  chartType: string;
  chartOptions?: Record<string, unknown>;
}

export interface SavedQuery {
  id: number;
  name?: string;
  natural_question: string;
  sql_query: string;
  created_by?: string;
  created_at?: string;
  last_run_at?: string;
  run_count: number;
  is_public: boolean;
}

export interface AiInsight {
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
  generated_at?: string;
  valid_until?: string;
  is_dismissed: boolean;
  dismissed_by?: string;
  dismissed_at?: string;
}

export interface ReportFavorite {
  id: number;
  report_id: string;
  user_id: string;
  created_at?: string;
}

