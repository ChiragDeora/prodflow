-- ============================================================================
-- DISABLE RLS ON ALL REPORT TABLES
-- ============================================================================
-- Remove row-level security restrictions on all report-related tables

-- ============================================================================
-- 1. SAVED_REPORTS
-- ============================================================================
DROP POLICY IF EXISTS "Public reports are viewable by all" ON saved_reports;
DROP POLICY IF EXISTS "Users can manage own reports" ON saved_reports;
ALTER TABLE saved_reports DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. SAVED_QUERIES
-- ============================================================================
DROP POLICY IF EXISTS "Public queries viewable by all" ON saved_queries;
DROP POLICY IF EXISTS "Users can manage own queries" ON saved_queries;
ALTER TABLE saved_queries DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. REPORT_FAVORITES
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage own favorites" ON report_favorites;
ALTER TABLE report_favorites DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. REPORT_SCHEDULES
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage own schedules" ON report_schedules;
ALTER TABLE report_schedules DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. AI_INSIGHTS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view insights" ON ai_insights;
DROP POLICY IF EXISTS "Users can dismiss insights" ON ai_insights;
ALTER TABLE ai_insights DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DONE
-- ============================================================================
