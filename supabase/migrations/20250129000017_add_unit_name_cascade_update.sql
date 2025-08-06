-- Add cascade update trigger for unit name changes
-- This ensures when a unit name changes, all master data is automatically updated

-- ===========================================
-- STEP 1: CREATE FUNCTION TO UPDATE MASTER DATA
-- ===========================================

CREATE OR REPLACE FUNCTION update_master_data_unit_names()
RETURNS TRIGGER AS $$
BEGIN
    -- Update machines table
    UPDATE machines 
    SET unit = NEW.name 
    WHERE unit = OLD.name;
    
    -- Update molds table
    UPDATE molds 
    SET unit = NEW.name 
    WHERE unit = OLD.name;
    
    -- Update raw_materials table
    UPDATE raw_materials 
    SET unit = NEW.name 
    WHERE unit = OLD.name;
    
    -- Update packing_materials table
    UPDATE packing_materials 
    SET unit = NEW.name 
    WHERE unit = OLD.name;
    
    -- Update schedule_jobs table
    UPDATE schedule_jobs 
    SET unit = NEW.name 
    WHERE unit = OLD.name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- STEP 2: CREATE TRIGGER ON UNITS TABLE
-- ===========================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_master_data_on_unit_change ON units;

-- Create trigger
CREATE TRIGGER trigger_update_master_data_on_unit_change
    AFTER UPDATE OF name ON units
    FOR EACH ROW
    WHEN (OLD.name IS DISTINCT FROM NEW.name)
    EXECUTE FUNCTION update_master_data_unit_names();

-- ===========================================
-- STEP 3: VERIFICATION
-- ===========================================

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Added cascade update trigger for unit name changes';
    RAISE NOTICE 'Now when a unit name changes, all master data will be automatically updated';
    RAISE NOTICE 'Example: Changing "Unit 1" to "Bhimpore" will update all records';
END $$; 