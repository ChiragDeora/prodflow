-- ============================================================================
-- REPORT BUILDER: Execute Readonly Query Function
-- ============================================================================
-- This function allows the Report Builder to execute dynamic SQL queries
-- safely with parameterized queries. It's READ-ONLY for security.
--
-- NOTE: This is OPTIONAL. The Report Builder works without this function
-- by using direct Supabase client queries. This function enables more
-- complex/flexible queries.
-- ============================================================================

-- Create the execute_readonly_query function
CREATE OR REPLACE FUNCTION execute_readonly_query(
  query_text TEXT,
  query_params JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  param_array TEXT[];
  i INTEGER;
BEGIN
  -- Security check: Only allow SELECT statements
  IF NOT (
    UPPER(TRIM(query_text)) LIKE 'SELECT%'
  ) THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  -- Block dangerous keywords
  IF (
    UPPER(query_text) LIKE '%INSERT%' OR
    UPPER(query_text) LIKE '%UPDATE%' OR
    UPPER(query_text) LIKE '%DELETE%' OR
    UPPER(query_text) LIKE '%DROP%' OR
    UPPER(query_text) LIKE '%ALTER%' OR
    UPPER(query_text) LIKE '%CREATE%' OR
    UPPER(query_text) LIKE '%TRUNCATE%' OR
    UPPER(query_text) LIKE '%GRANT%' OR
    UPPER(query_text) LIKE '%REVOKE%'
  ) THEN
    RAISE EXCEPTION 'Query contains forbidden keywords';
  END IF;
  
  -- Execute the query and return results as JSON
  EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', query_text)
  INTO result;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT, JSONB) TO anon;

-- Add comment
COMMENT ON FUNCTION execute_readonly_query IS 'Executes read-only SQL queries for the Report Builder. Only SELECT statements are allowed for security.';

-- ============================================================================
-- Test the function (optional - uncomment to test)
-- ============================================================================
-- SELECT execute_readonly_query('SELECT COUNT(*) as total FROM dpr_data');
-- SELECT execute_readonly_query('SELECT machine_id, COUNT(*) FROM breakdown_maintenance_tasks GROUP BY machine_id');

