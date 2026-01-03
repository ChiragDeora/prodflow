-- Migration: Change start_day and end_day from INTEGER to TEXT to store full date strings (DD-MM-YYYY)
-- This allows storing dates like "3-12-2025" instead of just day numbers like 3

-- Step 0: Drop all triggers first to prevent them from firing during migration
-- This avoids the "type mismatch" error when triggers try to use old function signatures
DROP TRIGGER IF EXISTS trigger_validate_block_day_range ON production_blocks;
DROP TRIGGER IF EXISTS trigger_calculate_changeover_datetime ON production_blocks;

-- Step 1: Add new temporary columns
ALTER TABLE production_blocks 
ADD COLUMN start_day_new TEXT,
ADD COLUMN end_day_new TEXT;

-- Step 2: Migrate existing data - convert day numbers to date strings
-- Format: DD-MM-YYYY
UPDATE production_blocks 
SET 
  start_day_new = LPAD(start_day::TEXT, 2, '0') || '-' || LPAD(planning_month::TEXT, 2, '0') || '-' || planning_year::TEXT,
  end_day_new = LPAD(end_day::TEXT, 2, '0') || '-' || LPAD(planning_month::TEXT, 2, '0') || '-' || planning_year::TEXT;

-- Step 3: Drop old columns
ALTER TABLE production_blocks 
DROP COLUMN start_day,
DROP COLUMN end_day;

-- Step 4: Rename new columns to original names
ALTER TABLE production_blocks 
RENAME COLUMN start_day_new TO start_day;

ALTER TABLE production_blocks 
RENAME COLUMN end_day_new TO end_day;

-- Step 5: Add NOT NULL constraints
ALTER TABLE production_blocks 
ALTER COLUMN start_day SET NOT NULL,
ALTER COLUMN end_day SET NOT NULL;

-- Step 6: Update changeover columns as well
ALTER TABLE production_blocks 
ADD COLUMN changeover_start_day_new TEXT,
ADD COLUMN changeover_end_day_new TEXT;

-- Migrate changeover day data
UPDATE production_blocks 
SET 
  changeover_start_day_new = CASE 
    WHEN changeover_start_day IS NOT NULL 
    THEN LPAD(changeover_start_day::TEXT, 2, '0') || '-' || LPAD(planning_month::TEXT, 2, '0') || '-' || planning_year::TEXT
    ELSE NULL
  END,
  changeover_end_day_new = CASE 
    WHEN changeover_end_day IS NOT NULL 
    THEN LPAD(changeover_end_day::TEXT, 2, '0') || '-' || LPAD(planning_month::TEXT, 2, '0') || '-' || planning_year::TEXT
    ELSE NULL
  END;

-- Drop old changeover columns
ALTER TABLE production_blocks 
DROP COLUMN changeover_start_day,
DROP COLUMN changeover_end_day;

-- Rename new changeover columns
ALTER TABLE production_blocks 
RENAME COLUMN changeover_start_day_new TO changeover_start_day;

ALTER TABLE production_blocks 
RENAME COLUMN changeover_end_day_new TO changeover_end_day;

-- Step 7: Update constraints - remove integer checks, add date format validation
-- Drop old constraints
ALTER TABLE production_blocks 
DROP CONSTRAINT IF EXISTS production_blocks_start_day_check,
DROP CONSTRAINT IF EXISTS production_blocks_end_day_check,
DROP CONSTRAINT IF EXISTS production_blocks_changeover_start_day_check,
DROP CONSTRAINT IF EXISTS production_blocks_changeover_end_day_check;

-- Add new constraint to validate date format (DD-MM-YYYY)
-- Note: This is a basic check - full validation would require a function
ALTER TABLE production_blocks 
ADD CONSTRAINT valid_start_day_format 
CHECK (start_day ~ '^\d{2}-\d{2}-\d{4}$');

ALTER TABLE production_blocks 
ADD CONSTRAINT valid_end_day_format 
CHECK (end_day ~ '^\d{2}-\d{2}-\d{4}$');

ALTER TABLE production_blocks 
ADD CONSTRAINT valid_changeover_start_day_format 
CHECK (changeover_start_day IS NULL OR changeover_start_day ~ '^\d{2}-\d{2}-\d{4}$');

ALTER TABLE production_blocks 
ADD CONSTRAINT valid_changeover_end_day_format 
CHECK (changeover_end_day IS NULL OR changeover_end_day ~ '^\d{2}-\d{2}-\d{4}$');

-- Step 8: Drop and recreate the calculate_changeover_datetime function to handle date strings
-- Drop the function first to clear any cached plans
DROP FUNCTION IF EXISTS calculate_changeover_datetime() CASCADE;

-- Recreate the function with the new signature (handles TEXT date strings)
CREATE OR REPLACE FUNCTION calculate_changeover_datetime()
RETURNS TRIGGER AS $$
DECLARE
    production_day_start TIMESTAMPTZ;
    changeover_ts TIMESTAMPTZ;
    start_day_num INTEGER;
    start_month_num INTEGER;
    start_year_num INTEGER;
BEGIN
    -- Only calculate if changeover_time_string is provided
    IF NEW.changeover_time_string IS NOT NULL AND NEW.changeover_time_string != '' THEN
        -- Parse start_day (DD-MM-YYYY format)
        start_day_num := SPLIT_PART(NEW.start_day, '-', 1)::INTEGER;
        start_month_num := SPLIT_PART(NEW.start_day, '-', 2)::INTEGER;
        start_year_num := SPLIT_PART(NEW.start_day, '-', 3)::INTEGER;
        
        -- Calculate production day start (8 AM on start_day)
        production_day_start := MAKE_DATE(start_year_num, start_month_num, start_day_num) + NEW.production_day_start_time;
        
        -- Parse changeover_time_string (HH:MM format)
        -- Add the hours and minutes to production day start
        changeover_ts := production_day_start + 
            (SPLIT_PART(NEW.changeover_time_string, ':', 1)::INTEGER || ' hours')::INTERVAL +
            (SPLIT_PART(NEW.changeover_time_string, ':', 2)::INTEGER || ' minutes')::INTERVAL;
        
        NEW.changeover_datetime := changeover_ts;
    ELSIF NEW.changeover_time IS NOT NULL AND NEW.changeover_time > 0 THEN
        -- Parse start_day (DD-MM-YYYY format)
        start_day_num := SPLIT_PART(NEW.start_day, '-', 1)::INTEGER;
        start_month_num := SPLIT_PART(NEW.start_day, '-', 2)::INTEGER;
        start_year_num := SPLIT_PART(NEW.start_day, '-', 3)::INTEGER;
        
        -- Calculate from minutes
        production_day_start := MAKE_DATE(start_year_num, start_month_num, start_day_num) + NEW.production_day_start_time;
        NEW.changeover_datetime := production_day_start + (NEW.changeover_time || ' minutes')::INTERVAL;
    ELSE
        NEW.changeover_datetime := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Update the constraint that checks start_day <= end_day
-- We need to compare dates properly
ALTER TABLE production_blocks 
DROP CONSTRAINT IF EXISTS valid_day_range;

-- Create a function to compare date strings
CREATE OR REPLACE FUNCTION compare_date_strings(date1 TEXT, date2 TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    day1 INTEGER;
    month1 INTEGER;
    year1 INTEGER;
    day2 INTEGER;
    month2 INTEGER;
    year2 INTEGER;
BEGIN
    day1 := SPLIT_PART(date1, '-', 1)::INTEGER;
    month1 := SPLIT_PART(date1, '-', 2)::INTEGER;
    year1 := SPLIT_PART(date1, '-', 3)::INTEGER;
    
    day2 := SPLIT_PART(date2, '-', 1)::INTEGER;
    month2 := SPLIT_PART(date2, '-', 2)::INTEGER;
    year2 := SPLIT_PART(date2, '-', 3)::INTEGER;
    
    -- Compare dates
    IF year1 < year2 THEN RETURN TRUE;
    ELSIF year1 > year2 THEN RETURN FALSE;
    ELSIF month1 < month2 THEN RETURN TRUE;
    ELSIF month1 > month2 THEN RETURN FALSE;
    ELSE RETURN day1 <= day2;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint using the function
ALTER TABLE production_blocks 
ADD CONSTRAINT valid_day_range 
CHECK (compare_date_strings(start_day, end_day));

-- Step 10: Update single_day_block constraint
ALTER TABLE production_blocks 
DROP CONSTRAINT IF EXISTS single_day_block;

ALTER TABLE production_blocks 
ADD CONSTRAINT single_day_block 
CHECK (start_day = end_day);

-- Step 11: Drop and recreate the function to handle date strings
-- Use DROP FUNCTION CASCADE to ensure all dependencies are cleared
DROP FUNCTION IF EXISTS validate_block_day_range() CASCADE;

-- Recreate the function with the new signature (handles TEXT date strings)
CREATE OR REPLACE FUNCTION validate_block_day_range()
RETURNS TRIGGER AS $$
DECLARE
    days_in_month INTEGER;
    start_day_num INTEGER;
    end_day_num INTEGER;
    start_month_num INTEGER;
    start_year_num INTEGER;
BEGIN
    -- Parse start_day (DD-MM-YYYY format) to extract day, month, year
    start_day_num := SPLIT_PART(NEW.start_day, '-', 1)::INTEGER;
    start_month_num := SPLIT_PART(NEW.start_day, '-', 2)::INTEGER;
    start_year_num := SPLIT_PART(NEW.start_day, '-', 3)::INTEGER;
    
    -- Parse end_day (DD-MM-YYYY format) to extract day
    end_day_num := SPLIT_PART(NEW.end_day, '-', 1)::INTEGER;
    
    -- Calculate days in the planning month
    days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', 
        MAKE_DATE(start_year_num, start_month_num, 1)) + INTERVAL '1 month - 1 day'));
    
    -- Validate start_day and end_day are within month
    IF start_day_num < 1 OR start_day_num > days_in_month THEN
        RAISE EXCEPTION 'start_day (%) is out of range for month %/%', start_day_num, start_month_num, start_year_num;
    END IF;
    
    IF end_day_num < 1 OR end_day_num > days_in_month THEN
        RAISE EXCEPTION 'end_day (%) is out of range for month %/%', end_day_num, start_month_num, start_year_num;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Recreate all triggers with the updated functions
CREATE TRIGGER trigger_validate_block_day_range
    BEFORE INSERT OR UPDATE ON production_blocks
    FOR EACH ROW
    EXECUTE FUNCTION validate_block_day_range();

CREATE TRIGGER trigger_calculate_changeover_datetime
    BEFORE INSERT OR UPDATE ON production_blocks
    FOR EACH ROW
    WHEN (NEW.changeover_time_string IS NOT NULL OR NEW.changeover_time IS NOT NULL)
    EXECUTE FUNCTION calculate_changeover_datetime();

