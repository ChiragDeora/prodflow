-- Temporary script to disable foreign key constraints for testing
-- Run this in Supabase SQL Editor if you're getting foreign key constraint errors

-- Drop the foreign key constraints temporarily
ALTER TABLE daily_weight_report DROP CONSTRAINT IF EXISTS fk_daily_weight_report_line;
ALTER TABLE daily_weight_report DROP CONSTRAINT IF EXISTS fk_daily_weight_report_mold;

-- This will allow you to insert data without foreign key validation
-- You can re-add the constraints later once you confirm the data is correct

-- To re-add the constraints later, run:
-- ALTER TABLE daily_weight_report ADD CONSTRAINT fk_daily_weight_report_line FOREIGN KEY (line_id) REFERENCES lines(line_id);
-- ALTER TABLE daily_weight_report ADD CONSTRAINT fk_daily_weight_report_mold FOREIGN KEY (mold_name) REFERENCES molds(mold_name);
