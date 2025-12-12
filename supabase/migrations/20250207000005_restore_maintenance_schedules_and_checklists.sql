-- =====================================================
-- RESTORE MAINTENANCE SCHEDULES AND CHECKLISTS
-- =====================================================
-- This migration restores the maintenance_schedules and maintenance_checklists tables
-- These are needed for preventive maintenance scheduling and checklist management
-- Note: These tables do NOT have RLS enabled (as per user requirements)

-- =====================================================
-- 1. MAINTENANCE SCHEDULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
    
    -- Entity references
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50) DEFAULT 'Unit 1',
    
    -- Scheduling details
    frequency_value INTEGER NOT NULL, -- e.g., every 7 days, every 30 days
    frequency_unit VARCHAR(20) NOT NULL CHECK (frequency_unit IN ('days', 'weeks', 'months', 'years')),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Task template
    task_template_id UUID,
    checklist_template JSONB, -- Template checklist for generated tasks
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_maintenance_schedules_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_schedules_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE CASCADE
);

-- =====================================================
-- 2. MAINTENANCE CHECKLISTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    checklist_type VARCHAR(50) NOT NULL CHECK (checklist_type IN ('machine', 'line', 'general')),
    
    -- Entity references
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50) DEFAULT 'Unit 1',
    
    -- Checklist items
    items JSONB NOT NULL, -- Array of checklist items
    estimated_duration_minutes INTEGER,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_maintenance_checklists_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_checklists_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE CASCADE
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_machine_id ON maintenance_schedules(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_line_id ON maintenance_schedules(line_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_unit ON maintenance_schedules(unit);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_active ON maintenance_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_type ON maintenance_schedules(schedule_type);

CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_machine_id ON maintenance_checklists(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_line_id ON maintenance_checklists(line_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_type ON maintenance_checklists(checklist_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_unit ON maintenance_checklists(unit);

-- =====================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Ensure the update function exists
CREATE OR REPLACE FUNCTION update_maintenance_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_maintenance_schedules_updated_at
    BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at_column();

CREATE TRIGGER update_maintenance_checklists_updated_at
    BEFORE UPDATE ON maintenance_checklists
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at_column();

-- =====================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE maintenance_schedules IS 'Defines recurring maintenance schedules for machines and lines. Used for preventive maintenance scheduling.';
COMMENT ON TABLE maintenance_checklists IS 'Templates for maintenance checklists. Can be used in preventive maintenance tasks.';

COMMENT ON COLUMN maintenance_schedules.schedule_type IS 'Type of schedule: daily, weekly, monthly, quarterly, yearly, or custom';
COMMENT ON COLUMN maintenance_schedules.frequency_value IS 'Numeric value for frequency (e.g., 7 for every 7 days)';
COMMENT ON COLUMN maintenance_schedules.frequency_unit IS 'Unit for frequency: days, weeks, months, or years';
COMMENT ON COLUMN maintenance_schedules.checklist_template IS 'JSON template for checklist items to include in generated tasks';
COMMENT ON COLUMN maintenance_schedules.is_active IS 'Whether this schedule is currently active and generating tasks';

COMMENT ON COLUMN maintenance_checklists.checklist_type IS 'Type of checklist: machine, line, or general';
COMMENT ON COLUMN maintenance_checklists.items IS 'JSON array of checklist items with structure: [{id, task, completed, notes}]';
COMMENT ON COLUMN maintenance_checklists.estimated_duration_minutes IS 'Estimated time to complete this checklist in minutes';

