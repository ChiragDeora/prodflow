-- ============================================================================
-- PRODUCTION PLANNER DATABASE SCHEMA
-- ============================================================================
-- This schema exactly matches the prod-planner UI component data structures
-- All fields, relationships, and constraints are preserved with zero data loss
-- ============================================================================

-- ============================================================================
-- 1. MAIN PRODUCTION BLOCKS TABLE
-- ============================================================================
-- Core table storing all production blocks with their essential properties
-- Each block represents a single-day production run on a specific line
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_blocks (
    -- Primary Key
    id TEXT PRIMARY KEY, -- Matches ProductionBlock.id (e.g., 'block-1234567890')
    
    -- Line Reference (Required)
    line_id TEXT NOT NULL REFERENCES lines(line_id) ON DELETE CASCADE,
    
    -- Day Information (Required)
    start_day INTEGER NOT NULL CHECK (start_day >= 1 AND start_day <= 31),
    end_day INTEGER NOT NULL CHECK (end_day >= 1 AND end_day <= 31),
    duration INTEGER NOT NULL DEFAULT 1 CHECK (duration >= 1),
    
    -- Block Identity
    label TEXT NOT NULL DEFAULT 'New Production Run', -- Display label/name
    color TEXT NOT NULL DEFAULT '#E0F2FE', -- Hex color code (uppercase stored)
    
    -- Mold Reference (Required for production blocks)
    mold_id TEXT REFERENCES molds(mold_id) ON DELETE SET NULL,
    
    -- Production Day Context
    -- Production day starts at 8 AM on day N and ends at 8 AM on day N+1
    -- Example: Nov 1 production day = 8 AM Nov 1 → 8 AM Nov 2
    production_day_start_time TIME DEFAULT '08:00:00', -- Default 8 AM, can be customized per line/facility
    
    -- Changeover Information (with Production Day Context)
    is_changeover BOOLEAN DEFAULT FALSE, -- True if this block is part of a changeover
    is_changeover_block BOOLEAN DEFAULT FALSE, -- True if this is the changeover block (gray)
    changeover_start_day INTEGER CHECK (changeover_start_day IS NULL OR (changeover_start_day >= 1 AND changeover_start_day <= 31)),
    changeover_end_day INTEGER CHECK (changeover_end_day IS NULL OR (changeover_end_day >= 1 AND changeover_end_day <= 31)),
    changeover_time INTEGER, -- Changeover time in minutes from production day start
    changeover_time_string TEXT, -- Changeover time as HH:MM string (relative to production day start at 8 AM)
    changeover_time_mode TEXT CHECK (changeover_time_mode IS NULL OR changeover_time_mode IN ('minutes', 'time')),
    changeover_mold_id TEXT REFERENCES molds(mold_id) ON DELETE SET NULL, -- Mold to changeover to
    -- Changeover datetime: Actual timestamp when changeover occurs (accounts for production day)
    -- Example: If changeover_time_string is "02:00" on Nov 1 production day, 
    --          changeover_datetime = 8 AM Nov 1 + 18 hours = 2 AM Nov 2 (but still Nov 1 production day)
    changeover_datetime TIMESTAMPTZ, -- Actual changeover timestamp (calculated from production day + changeover time)
    
    -- Notes
    notes TEXT, -- Optional notes/remarks
    
    -- UI State (for drag/resize operations - not persisted but included for completeness)
    is_resizing_left BOOLEAN DEFAULT FALSE, -- For drag handle logic (UI only)
    
    -- Month/Year Context (Required for proper data organization)
    -- Blocks are organized by month/year to support multi-month planning
    planning_month INTEGER NOT NULL CHECK (planning_month >= 1 AND planning_month <= 12),
    planning_year INTEGER NOT NULL CHECK (planning_year >= 2020 AND planning_year <= 2100),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_day_range CHECK (start_day <= end_day),
    CONSTRAINT single_day_block CHECK (start_day = end_day) -- Enforced: all blocks are single-day
);

-- ============================================================================
-- 2. PRODUCTION BLOCK COLOR SEGMENTS
-- ============================================================================
-- Stores multiple color segments within a single block
-- Used when a block has different colors for different parts of the day
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_block_color_segments (
    id SERIAL PRIMARY KEY,
    block_id TEXT NOT NULL REFERENCES production_blocks(id) ON DELETE CASCADE,
    
    -- Color Information
    color TEXT NOT NULL, -- Hex color code
    label TEXT, -- Optional color label (e.g., "Black", "White", "Peach")
    
    -- Day Range (relative to block's start_day)
    start_day_offset INTEGER NOT NULL DEFAULT 0 CHECK (start_day_offset >= 0), -- Relative start day within block (0-based)
    end_day_offset INTEGER NOT NULL DEFAULT 0 CHECK (end_day_offset >= 0), -- Relative end day within block (0-based)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_offset_range CHECK (start_day_offset <= end_day_offset)
);

-- ============================================================================
-- 3. PRODUCTION BLOCK PRODUCT COLORS
-- ============================================================================
-- Stores product colors with quantities for each block
-- Supports multiple colors per block with different quantities
-- Each color can optionally be associated with a party code
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_block_product_colors (
    id SERIAL PRIMARY KEY,
    block_id TEXT NOT NULL REFERENCES production_blocks(id) ON DELETE CASCADE,
    
    -- Color Information
    color TEXT NOT NULL, -- Color name (e.g., "Black", "Peach", "White")
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0), -- Number of pieces
    
    -- Party Association (Optional)
    party_code TEXT, -- Party code/name from party_name_master (e.g., "Gesa", "Klex")
    -- Note: No FK constraint here as party codes are stored as names, not IDs
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. PRODUCTION BLOCK PACKING MATERIALS
-- ============================================================================
-- Stores packing material selections for each block
-- Supports three categories: boxes, polybags, and bopp
-- Each selection includes the packing material ID and quantity
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_block_packing_materials (
    id SERIAL PRIMARY KEY,
    block_id TEXT NOT NULL REFERENCES production_blocks(id) ON DELETE CASCADE,
    
    -- Material Category
    category TEXT NOT NULL CHECK (category IN ('boxes', 'polybags', 'bopp')),
    
    -- Material Reference
    packing_material_id UUID NOT NULL REFERENCES packing_materials(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one entry per category per material per block
    CONSTRAINT unique_block_category_material UNIQUE (block_id, category, packing_material_id)
);

-- ============================================================================
-- 5. PRODUCTION BLOCK PARTY CODES
-- ============================================================================
-- Junction table for many-to-many relationship between blocks and party codes
-- A block can be associated with multiple party codes
-- Party codes are stored as names (strings) from party_name_master
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_block_party_codes (
    id SERIAL PRIMARY KEY,
    block_id TEXT NOT NULL REFERENCES production_blocks(id) ON DELETE CASCADE,
    
    -- Party Code (stored as name string, not FK to allow flexibility)
    party_code TEXT NOT NULL, -- Party name from party_name_master (e.g., "Gesa", "Klex")
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one entry per party code per block
    CONSTRAINT unique_block_party UNIQUE (block_id, party_code)
);

-- ============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Production Blocks Indexes
CREATE INDEX IF NOT EXISTS idx_production_blocks_line_id ON production_blocks(line_id);
CREATE INDEX IF NOT EXISTS idx_production_blocks_mold_id ON production_blocks(mold_id);
CREATE INDEX IF NOT EXISTS idx_production_blocks_planning_date ON production_blocks(planning_year, planning_month);
CREATE INDEX IF NOT EXISTS idx_production_blocks_start_day ON production_blocks(start_day);
CREATE INDEX IF NOT EXISTS idx_production_blocks_end_day ON production_blocks(end_day);
CREATE INDEX IF NOT EXISTS idx_production_blocks_changeover_mold ON production_blocks(changeover_mold_id) WHERE changeover_mold_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_blocks_is_changeover ON production_blocks(is_changeover) WHERE is_changeover = TRUE;
CREATE INDEX IF NOT EXISTS idx_production_blocks_is_changeover_block ON production_blocks(is_changeover_block) WHERE is_changeover_block = TRUE;

-- Composite index for common queries: find blocks by line and day range
CREATE INDEX IF NOT EXISTS idx_production_blocks_line_day_range ON production_blocks(line_id, start_day, end_day);

-- Composite index for mold conflict detection: same mold, same day, different line
CREATE INDEX IF NOT EXISTS idx_production_blocks_mold_day ON production_blocks(mold_id, start_day) WHERE mold_id IS NOT NULL;

-- Index for changeover datetime queries
CREATE INDEX IF NOT EXISTS idx_production_blocks_changeover_datetime ON production_blocks(changeover_datetime) WHERE changeover_datetime IS NOT NULL;

-- Index for production day queries
CREATE INDEX IF NOT EXISTS idx_production_blocks_production_day ON production_blocks(planning_year, planning_month, start_day, production_day_start_time);

-- Color Segments Indexes
CREATE INDEX IF NOT EXISTS idx_color_segments_block_id ON production_block_color_segments(block_id);

-- Product Colors Indexes
CREATE INDEX IF NOT EXISTS idx_product_colors_block_id ON production_block_product_colors(block_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_party_code ON production_block_product_colors(party_code) WHERE party_code IS NOT NULL;

-- Packing Materials Indexes
CREATE INDEX IF NOT EXISTS idx_packing_materials_block_id ON production_block_packing_materials(block_id);
CREATE INDEX IF NOT EXISTS idx_packing_materials_category ON production_block_packing_materials(category);
CREATE INDEX IF NOT EXISTS idx_packing_materials_material_id ON production_block_packing_materials(packing_material_id);

-- Party Codes Indexes
CREATE INDEX IF NOT EXISTS idx_party_codes_block_id ON production_block_party_codes(block_id);
CREATE INDEX IF NOT EXISTS idx_party_codes_party_code ON production_block_party_codes(party_code);

-- ============================================================================
-- 7. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update updated_at timestamp on production_blocks
CREATE OR REPLACE FUNCTION update_production_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_blocks_updated_at
    BEFORE UPDATE ON production_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_production_blocks_updated_at();

-- ============================================================================
-- PRODUCTION DAY HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate production day from a timestamp
-- Production day starts at 8 AM on day N and ends at 8 AM on day N+1
CREATE OR REPLACE FUNCTION get_production_day(timestamp_val TIMESTAMPTZ, start_time TIME DEFAULT '08:00:00')
RETURNS INTEGER AS $$
DECLARE
    production_day_start TIMESTAMPTZ;
    production_day INTEGER;
BEGIN
    -- Calculate the start of the production day (8 AM on the calendar day)
    production_day_start := DATE_TRUNC('day', timestamp_val) + start_time;
    
    -- If timestamp is before 8 AM, it belongs to previous day's production day
    IF timestamp_val < production_day_start THEN
        production_day := EXTRACT(DAY FROM timestamp_val - INTERVAL '1 day')::INTEGER;
    ELSE
        production_day := EXTRACT(DAY FROM timestamp_val)::INTEGER;
    END IF;
    
    RETURN production_day;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate changeover datetime from production day and changeover time
-- This ensures changeover times are correctly calculated based on production day concept
CREATE OR REPLACE FUNCTION calculate_changeover_datetime()
RETURNS TRIGGER AS $$
DECLARE
    production_day_start TIMESTAMPTZ;
    changeover_ts TIMESTAMPTZ;
BEGIN
    -- Only calculate if changeover_time_string is provided
    IF NEW.changeover_time_string IS NOT NULL AND NEW.changeover_time_string != '' THEN
        -- Calculate production day start (8 AM on start_day)
        production_day_start := MAKE_DATE(NEW.planning_year, NEW.planning_month, NEW.start_day) + NEW.production_day_start_time;
        
        -- Parse changeover_time_string (HH:MM format)
        -- Add the hours and minutes to production day start
        changeover_ts := production_day_start + 
            (SPLIT_PART(NEW.changeover_time_string, ':', 1)::INTEGER || ' hours')::INTERVAL +
            (SPLIT_PART(NEW.changeover_time_string, ':', 2)::INTEGER || ' minutes')::INTERVAL;
        
        -- If changeover time is before 8 AM, it's still part of the same production day
        -- But if it's after 8 AM next day, it belongs to next production day
        -- For now, we keep it in the same production day (8 AM start_day to 8 AM start_day+1)
        NEW.changeover_datetime := changeover_ts;
    ELSIF NEW.changeover_time IS NOT NULL AND NEW.changeover_time > 0 THEN
        -- Calculate from minutes
        production_day_start := MAKE_DATE(NEW.planning_year, NEW.planning_month, NEW.start_day) + NEW.production_day_start_time;
        NEW.changeover_datetime := production_day_start + (NEW.changeover_time || ' minutes')::INTERVAL;
    ELSE
        NEW.changeover_datetime := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_changeover_datetime
    BEFORE INSERT OR UPDATE ON production_blocks
    FOR EACH ROW
    WHEN (NEW.changeover_time_string IS NOT NULL OR NEW.changeover_time IS NOT NULL)
    EXECUTE FUNCTION calculate_changeover_datetime();

-- ============================================================================
-- 8. UNIQUE CONSTRAINTS AND BUSINESS RULES
-- ============================================================================

-- Constraint: No overlapping blocks on the same line on the same day
-- This enforces the UI's strict no-overlap policy
-- Exception: Same-day transitions are allowed (morning/evening shifts handled by UI logic)
CREATE UNIQUE INDEX IF NOT EXISTS idx_production_blocks_no_overlap 
    ON production_blocks(line_id, start_day) 
    WHERE start_day = end_day; -- Only enforce for single-day blocks

-- Constraint: A mold can only be on one line per day (mold conflict prevention)
-- This enforces the UI's mold conflict detection logic
CREATE UNIQUE INDEX IF NOT EXISTS idx_production_blocks_mold_day_unique 
    ON production_blocks(mold_id, start_day, planning_year, planning_month) 
    WHERE mold_id IS NOT NULL AND start_day = end_day;

-- ============================================================================
-- 9. HELPER FUNCTIONS FOR DATA INTEGRITY
-- ============================================================================

-- Function to validate block day range within month
CREATE OR REPLACE FUNCTION validate_block_day_range()
RETURNS TRIGGER AS $$
DECLARE
    days_in_month INTEGER;
BEGIN
    -- Calculate days in the planning month
    days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', 
        MAKE_DATE(NEW.planning_year, NEW.planning_month, 1)) + INTERVAL '1 month - 1 day'));
    
    -- Validate start_day and end_day are within month
    IF NEW.start_day < 1 OR NEW.start_day > days_in_month THEN
        RAISE EXCEPTION 'start_day (%) is out of range for month %/%', NEW.start_day, NEW.planning_month, NEW.planning_year;
    END IF;
    
    IF NEW.end_day < 1 OR NEW.end_day > days_in_month THEN
        RAISE EXCEPTION 'end_day (%) is out of range for month %/%', NEW.end_day, NEW.planning_month, NEW.planning_year;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_block_day_range
    BEFORE INSERT OR UPDATE ON production_blocks
    FOR EACH ROW
    EXECUTE FUNCTION validate_block_day_range();

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- DISABLED: Application uses custom authentication, not Supabase auth
-- This prevents RLS errors when entering data
-- ============================================================================

-- Disable RLS on all production planner tables (matching party_color_mapping pattern)
ALTER TABLE production_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_block_color_segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_block_product_colors DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_block_packing_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_block_party_codes DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE production_blocks IS 'Main table storing production blocks. Each block represents a single-day production run on a specific line. All blocks are enforced to be single-day (start_day = end_day).';
COMMENT ON TABLE production_block_color_segments IS 'Stores multiple color segments within a single block for multi-color production runs.';
COMMENT ON TABLE production_block_product_colors IS 'Stores product colors with quantities for each block. Supports multiple colors per block with optional party code associations.';
COMMENT ON TABLE production_block_packing_materials IS 'Stores packing material selections (boxes, polybags, bopp) for each production block.';
COMMENT ON TABLE production_block_party_codes IS 'Junction table for many-to-many relationship between production blocks and party codes.';

COMMENT ON COLUMN production_blocks.id IS 'Unique block identifier (e.g., block-1234567890 or changeover-block-1234567890-1234567890)';
COMMENT ON COLUMN production_blocks.start_day IS 'Day of month when production starts (1-31). Must equal end_day (single-day blocks only).';
COMMENT ON COLUMN production_blocks.end_day IS 'Day of month when production ends (1-31). Must equal start_day (single-day blocks only).';
COMMENT ON COLUMN production_blocks.duration IS 'Duration in days. Always 1 for single-day blocks.';
COMMENT ON COLUMN production_blocks.is_changeover IS 'True if this block is part of a changeover sequence.';
COMMENT ON COLUMN production_blocks.is_changeover_block IS 'True if this is the changeover block (displayed in gray). Created automatically when changeover is configured.';
COMMENT ON COLUMN production_blocks.changeover_mold_id IS 'Reference to the mold that will be used after changeover.';
COMMENT ON COLUMN production_blocks.planning_month IS 'Month (1-12) for which this block is planned.';
COMMENT ON COLUMN production_blocks.planning_year IS 'Year for which this block is planned.';
COMMENT ON COLUMN production_blocks.color IS 'Hex color code for the block. Can be changed dynamically. Party-specific colors are determined by party_color_mapping table.';
COMMENT ON COLUMN production_blocks.is_changeover IS 'True if this block is part of a changeover sequence. Automatically set when changeover is detected.';
COMMENT ON COLUMN production_blocks.is_changeover_block IS 'True if this is the changeover block (displayed in gray). Created automatically when changeover_time and changeover_mold_id are set.';
COMMENT ON COLUMN production_blocks.production_day_start_time IS 'Start time of production day (default 8:00 AM). Production day runs from 8 AM on day N to 8 AM on day N+1.';
COMMENT ON COLUMN production_blocks.changeover_time IS 'Changeover time in minutes from production day start (8 AM). Example: 18 hours = 1080 minutes = changeover at 2 AM next calendar day but still same production day.';
COMMENT ON COLUMN production_blocks.changeover_time_string IS 'Changeover time as HH:MM string format relative to production day start (8 AM). Example: "02:00" means 2 AM next calendar day (18 hours from 8 AM).';
COMMENT ON COLUMN production_blocks.changeover_time_mode IS 'Time format: "minutes" for integer minutes, "time" for HH:MM string format.';
COMMENT ON COLUMN production_blocks.changeover_datetime IS 'Actual changeover timestamp calculated from production day + changeover time. Automatically calculated by trigger. Example: Nov 1 production day + 18 hours = 2 AM Nov 2 (but still Nov 1 production day).';

COMMENT ON COLUMN production_block_product_colors.party_code IS 'Party code/name from party_name_master. Colors available for each party are defined in party_color_mapping table.';
COMMENT ON COLUMN production_block_party_codes.party_code IS 'Party name from party_name_master. Used to determine available colors via party_color_mapping table.';

-- ============================================================================
-- NOTES ON COLOR AND PARTY CODE RELATIONSHIPS
-- ============================================================================
-- 1. Block Color (production_blocks.color):
--    - Can be changed dynamically in the UI
--    - Stored as hex color code (e.g., '#E0F2FE')
--    - Defaults to line color or '#E0F2FE'
--
-- 2. Party Code to Color Mapping:
--    - Handled by existing party_color_mapping table
--    - Maps party_name_master.id to color_label_master.id
--    - Used by UI to filter available colors when party is selected
--    - Accessed via colorLabelAPI.getColorsForParty(partyName)
--
-- 3. Product Colors (production_block_product_colors):
--    - Each block can have multiple product colors with quantities
--    - Each product color can optionally be associated with a party_code
--    - Party code determines which colors are available in the dropdown
--
-- 4. Changeover Functionality (with Production Day Context):
--    - Production Day Concept: Starts at 8 AM on day N, ends at 8 AM on day N+1
--      Example: Nov 1 production day = 8 AM Nov 1 → 8 AM Nov 2
--    - When changeover_time > 0 and changeover_mold_id is set:
--      a) Original block is marked with is_changeover = TRUE and color = '#FFB84D' (amber)
--      b) New changeover block is created on next day (start_day + 1)
--      c) Changeover block has is_changeover_block = TRUE and uses line's normal color
--    - Changeover time is relative to production day start (8 AM):
--      * "02:00" means 2 AM next calendar day (18 hours from 8 AM)
--      * Still part of same production day (Nov 1 production day includes 2 AM Nov 2)
--    - changeover_datetime is automatically calculated by trigger
--    - Changeover blocks are automatically detected and displayed in gray
--
-- 5. Instant Updates on Drag/Drop/Extend:
--    - All updates are immediately persisted to database
--    - Triggers ensure changeover_datetime is recalculated on any update
--    - No batch operations - each drag/drop/extend triggers immediate UPDATE
--    - updated_at timestamp tracks last modification time
-- ============================================================================

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

