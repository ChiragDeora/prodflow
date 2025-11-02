-- =====================================================
-- CREATE DAILY WEIGHT REPORT TABLE
-- =====================================================

-- Drop table if exists (for clean recreation)
DROP TABLE IF EXISTS daily_weight_report CASCADE;

-- Create daily_weight_report table
CREATE TABLE public.daily_weight_report (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  line_id VARCHAR(50) NOT NULL,
  mold_name VARCHAR(100) NOT NULL,
  entry_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  cycle_time NUMERIC(5, 2) NOT NULL,
  cavity_weights JSONB NOT NULL,
  average_weight NUMERIC(8, 3) NOT NULL,
  is_changeover_point BOOLEAN NULL DEFAULT FALSE,
  previous_mold_name VARCHAR(100) NULL,
  changeover_reason TEXT NULL,
  changeover_timestamp TIMESTAMP WITHOUT TIME ZONE NULL,
  is_submitted BOOLEAN NULL DEFAULT FALSE,
  submitted_by VARCHAR(100) NULL,
  submitted_at TIMESTAMP WITHOUT TIME ZONE NULL,
  notes TEXT NULL,
  color VARCHAR(50) NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NULL,
  updated_by VARCHAR(100) NULL,
  production_date DATE NOT NULL,
  CONSTRAINT daily_weight_report_pkey PRIMARY KEY (id),
  CONSTRAINT fk_daily_weight_report_line FOREIGN KEY (line_id) REFERENCES lines (line_id),
  CONSTRAINT fk_daily_weight_report_mold FOREIGN KEY (mold_name) REFERENCES molds (mold_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_weight_report_production_date 
  ON public.daily_weight_report USING btree (production_date);

CREATE INDEX IF NOT EXISTS idx_daily_weight_report_line_production_date 
  ON public.daily_weight_report USING btree (line_id, production_date);

-- Disable RLS to allow inserts (or add proper policies)
ALTER TABLE public.daily_weight_report DISABLE ROW LEVEL SECURITY;

-- If you want RLS enabled, uncomment below and customize policies:
-- ALTER TABLE public.daily_weight_report ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Allow all operations for authenticated users" 
--   ON public.daily_weight_report
--   FOR ALL 
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);
--
-- CREATE POLICY "Allow all operations for anon users" 
--   ON public.daily_weight_report
--   FOR ALL 
--   TO anon
--   USING (true)
--   WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.daily_weight_report IS 'Stores daily weight quality control reports for production lines';

