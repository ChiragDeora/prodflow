-- ============================================================================
-- REPORTS SYSTEM - Database Tables
-- ============================================================================
-- This migration creates tables for:
-- - saved_reports: Store report configurations
-- - saved_queries: Store AI-generated queries
-- - ai_insights: Store generated insights
-- - report_favorites: Track user favorites
-- - report_schedules: Scheduled report delivery
-- ============================================================================

-- ============================================================================
-- 1. SAVED_REPORTS TABLE
-- ============================================================================
-- Stores saved report configurations including metrics, dimensions, filters

CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('production', 'store', 'dispatch', 'stock', 'job-work', 'maintenance', 'quality', 'masters', 'general')),
  config_json JSONB NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  is_template BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_reports_category ON saved_reports(category);
CREATE INDEX IF NOT EXISTS idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_reports_is_template ON saved_reports(is_template);
CREATE INDEX IF NOT EXISTS idx_saved_reports_is_public ON saved_reports(is_public);

-- Add RLS policies
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- Everyone can read public reports and templates
CREATE POLICY "Public reports are viewable by all" ON saved_reports
  FOR SELECT
  USING (is_public = TRUE OR is_template = TRUE);

-- Users can manage their own reports
CREATE POLICY "Users can manage own reports" ON saved_reports
  FOR ALL
  USING (auth.uid()::text = created_by);

-- ============================================================================
-- 2. SAVED_QUERIES TABLE (for AI Smart Query)
-- ============================================================================
-- Stores AI-generated SQL queries

CREATE TABLE IF NOT EXISTS saved_queries (
  id SERIAL PRIMARY KEY,
  name TEXT,
  natural_question TEXT NOT NULL,
  sql_query TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_queries_created_by ON saved_queries(created_by);

-- Add RLS policies
ALTER TABLE saved_queries ENABLE ROW LEVEL SECURITY;

-- Users can read public queries and their own
CREATE POLICY "Public queries viewable by all" ON saved_queries
  FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can manage own queries" ON saved_queries
  FOR ALL
  USING (auth.uid()::text = created_by);

-- ============================================================================
-- 3. AI_INSIGHTS TABLE
-- ============================================================================
-- Stores generated insights from AI analysis

CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,
  insight_type TEXT CHECK (insight_type IN ('trend', 'anomaly', 'alert', 'comparison', 'opportunity')),
  category TEXT CHECK (category IN ('production', 'store', 'dispatch', 'stock', 'job-work', 'maintenance', 'quality', 'masters', 'general')),
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  summary TEXT,
  details TEXT,
  metric_name TEXT,
  current_value TEXT,
  comparison_value TEXT,
  change_percent DECIMAL(10, 2),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_by TEXT,
  dismissed_at TIMESTAMPTZ
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON ai_insights(category);
CREATE INDEX IF NOT EXISTS idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX IF NOT EXISTS idx_ai_insights_valid_until ON ai_insights(valid_until);
CREATE INDEX IF NOT EXISTS idx_ai_insights_is_dismissed ON ai_insights(is_dismissed);

-- ============================================================================
-- 4. REPORT_FAVORITES TABLE
-- ============================================================================
-- Tracks user favorites for reports

CREATE TABLE IF NOT EXISTS report_favorites (
  id SERIAL PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_report_favorites_user_id ON report_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_report_favorites_report_id ON report_favorites(report_id);

-- Add RLS policies
ALTER TABLE report_favorites ENABLE ROW LEVEL SECURITY;

-- Users can manage their own favorites
CREATE POLICY "Users can manage own favorites" ON report_favorites
  FOR ALL
  USING (auth.uid()::text = user_id);

-- ============================================================================
-- 5. REPORT_SCHEDULES TABLE
-- ============================================================================
-- Scheduled report delivery configuration

CREATE TABLE IF NOT EXISTS report_schedules (
  id SERIAL PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  time_of_day TIME,
  recipients TEXT,
  format TEXT CHECK (format IN ('pdf', 'excel', 'csv')),
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_report_schedules_report_id ON report_schedules(report_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_is_active ON report_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_send_at ON report_schedules(next_send_at);

-- ============================================================================
-- 6. CREATE UPDATE TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for saved_reports
DROP TRIGGER IF EXISTS trigger_update_saved_reports_updated_at ON saved_reports;
CREATE TRIGGER trigger_update_saved_reports_updated_at
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_report_updated_at();

-- ============================================================================
-- 7. INSERT DEFAULT TEMPLATES
-- ============================================================================

INSERT INTO saved_reports (name, description, category, config_json, is_template, is_public) VALUES
-- Production Templates
(
  'Daily Production Summary',
  'Daily production quantity trend over time',
  'production',
  '{"dataSource":"production","metrics":["prod_qty"],"primaryDimension":"date_day","filters":{"dateRange":"last_30_days"},"chartType":"line","chartOptions":{"showValues":false,"showLegend":true,"smoothLines":true}}',
  TRUE,
  TRUE
),
(
  'Mold Performance Comparison',
  'Compare production efficiency across different molds',
  'production',
  '{"dataSource":"production","metrics":["prod_qty","rej_rate"],"primaryDimension":"mold","filters":{"dateRange":"last_30_days"},"chartType":"bar","chartOptions":{"showValues":true,"showLegend":true}}',
  TRUE,
  TRUE
),
(
  'Shift Analysis',
  'Compare production between DAY and NIGHT shifts',
  'production',
  '{"dataSource":"production","metrics":["prod_qty"],"primaryDimension":"shift","secondaryDimension":"date_week","filters":{"dateRange":"last_30_days"},"chartType":"grouped_bar","chartOptions":{"showValues":true,"showLegend":true}}',
  TRUE,
  TRUE
),
(
  'Rejection Analysis by Mold',
  'Analyze rejection rates across molds',
  'production',
  '{"dataSource":"production","metrics":["rej_rate","rej_kg"],"primaryDimension":"mold","filters":{"dateRange":"last_30_days"},"chartType":"bar","chartOptions":{"showValues":true,"showLegend":true,"sortByValue":"desc"}}',
  TRUE,
  TRUE
),
(
  'Machine Utilization',
  'Monitor uptime percentage by machine',
  'production',
  '{"dataSource":"production","metrics":["uptime_pct"],"primaryDimension":"machine","filters":{"dateRange":"last_7_days"},"chartType":"horizontal_bar","chartOptions":{"showValues":true}}',
  TRUE,
  TRUE
),
(
  'Weekly Production Trend',
  'Weekly production trend analysis',
  'production',
  '{"dataSource":"production","metrics":["prod_qty","prod_kg"],"primaryDimension":"date_week","filters":{"dateRange":"last_90_days"},"chartType":"line","chartOptions":{"showValues":false,"showLegend":true}}',
  TRUE,
  TRUE
),

-- Dispatch Templates
(
  'Customer Distribution',
  'Dispatch distribution by customer',
  'dispatch',
  '{"dataSource":"dispatch","metrics":["dispatch_qty"],"primaryDimension":"customer","filters":{"dateRange":"this_month","topN":10},"chartType":"pie","chartOptions":{"showValues":true,"showLegend":true}}',
  TRUE,
  TRUE
),
(
  'Dispatch Trend',
  'Weekly dispatch trend',
  'dispatch',
  '{"dataSource":"dispatch","metrics":["dispatch_qty","dispatch_count"],"primaryDimension":"date_week","filters":{"dateRange":"last_90_days"},"chartType":"line","chartOptions":{"showValues":false,"showLegend":true}}',
  TRUE,
  TRUE
),
(
  'Top 10 Customers',
  'Top 10 customers by dispatch volume',
  'dispatch',
  '{"dataSource":"dispatch","metrics":["dispatch_qty"],"primaryDimension":"customer","filters":{"dateRange":"this_month","topN":10},"chartType":"horizontal_bar","chartOptions":{"showValues":true,"sortByValue":"desc"}}',
  TRUE,
  TRUE
),

-- Stock Templates
(
  'Current Stock Levels',
  'Current stock levels by item type',
  'stock',
  '{"dataSource":"stock","metrics":["stock_balance"],"primaryDimension":"item_type","secondaryDimension":"location","filters":{},"chartType":"grouped_bar","chartOptions":{"showValues":true,"showLegend":true}}',
  TRUE,
  TRUE
),
(
  'Stock Movement Trend',
  'Stock in vs out movement over time',
  'stock',
  '{"dataSource":"stock","metrics":["stock_in","stock_out"],"primaryDimension":"date_week","filters":{"dateRange":"last_30_days"},"chartType":"line","chartOptions":{"showValues":false,"showLegend":true}}',
  TRUE,
  TRUE
),
(
  'Low Stock Alert',
  'Items below minimum threshold',
  'stock',
  '{"dataSource":"stock","metrics":["stock_balance"],"primaryDimension":"item_code","filters":{"lowStock":true},"chartType":"table","chartOptions":{}}',
  TRUE,
  TRUE
),

-- Store Templates (GRN, MIS)
(
  'Supplier Analysis',
  'GRN value by supplier',
  'store',
  '{"dataSource":"store","metrics":["grn_value"],"primaryDimension":"supplier","filters":{"dateRange":"this_month","topN":10},"chartType":"pie","chartOptions":{"showValues":true,"showLegend":true}}',
  TRUE,
  TRUE
),
(
  'Material Receipt Trend',
  'GRN quantity trend over time',
  'store',
  '{"dataSource":"store","metrics":["grn_qty"],"primaryDimension":"date_week","filters":{"dateRange":"last_90_days"},"chartType":"line","chartOptions":{"showValues":false,"showLegend":true}}',
  TRUE,
  TRUE
),
(
  'Material Issue Analysis',
  'MIS quantity issued by department',
  'store',
  '{"dataSource":"store","metrics":["issue_qty"],"primaryDimension":"department","filters":{"dateRange":"this_month"},"chartType":"bar","chartOptions":{"showValues":true,"showLegend":true}}',
  TRUE,
  TRUE
),

-- Job Work Templates
(
  'Job Work Challan Summary',
  'Job work dispatches by party',
  'job-work',
  '{"dataSource":"job-work","metrics":["jw_qty"],"primaryDimension":"party","filters":{"dateRange":"this_month"},"chartType":"bar","chartOptions":{"showValues":true}}',
  TRUE,
  TRUE
)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON saved_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_queries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_schedules TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE saved_queries_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE ai_insights_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE report_favorites_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE report_schedules_id_seq TO authenticated;

-- ============================================================================
-- DONE
-- ============================================================================

