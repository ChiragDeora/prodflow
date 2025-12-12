-- =====================================================
-- PREVENTIVE MAINTENANCE TABLES
-- =====================================================
-- This migration creates dedicated tables for preventive/scheduled maintenance
-- Preventive maintenance is for planned, scheduled maintenance to prevent breakdowns

-- =====================================================
-- 1. PREVENTIVE MAINTENANCE TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS preventive_maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Preventive-specific fields
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('scheduled', 'routine', 'inspection', 'calibration', 'lubrication', 'cleaning')),
    schedule_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    schedule_id UUID, -- Reference to maintenance schedule if generated from schedule
    next_due_date DATE, -- Next scheduled date for recurring maintenance
    
    -- Priority and status (preventive tasks are typically medium/low priority)
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled', 'skipped')) DEFAULT 'pending',
    
    -- Entity references
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50) DEFAULT 'Unit 1',
    
    -- Assignment and scheduling
    assigned_to VARCHAR(100),
    assigned_by VARCHAR(100),
    due_date DATE NOT NULL,
    scheduled_date DATE, -- Original scheduled date
    estimated_duration_hours INTEGER,
    actual_duration_hours INTEGER,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Preventive-specific details
    checklist_items JSONB, -- Array of checklist items to complete
    checklist_completed BOOLEAN DEFAULT false,
    parts_required JSONB, -- Array of parts that may be needed
    parts_used JSONB, -- Array of parts actually used
    parts_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    inspection_notes TEXT,
    findings TEXT, -- Any issues found during preventive maintenance
    recommendations TEXT, -- Recommendations for future maintenance
    notes TEXT,
    
    -- Recurrence tracking
    is_recurring BOOLEAN DEFAULT false,
    recurrence_interval INTEGER, -- Number of days/weeks/months
    recurrence_unit VARCHAR(20), -- 'days', 'weeks', 'months', 'years'
    last_completed_date DATE,
    completion_count INTEGER DEFAULT 0, -- Number of times this task has been completed
    
    -- Foreign key constraints
    CONSTRAINT fk_preventive_tasks_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_preventive_tasks_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 2. PREVENTIVE MAINTENANCE SCHEDULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS preventive_maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Schedule details
    schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
    frequency_value INTEGER NOT NULL, -- e.g., every 7 days, every 30 days
    frequency_unit VARCHAR(20) NOT NULL CHECK (frequency_unit IN ('days', 'weeks', 'months', 'years')),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Entity references
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50) DEFAULT 'Unit 1',
    
    -- Task template
    task_template JSONB, -- Template for tasks generated from this schedule
    checklist_template JSONB, -- Template checklist for generated tasks
    estimated_duration_hours INTEGER,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_generated_date DATE, -- Last date tasks were generated from this schedule
    
    -- Foreign key constraints
    CONSTRAINT fk_preventive_schedules_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE,
    CONSTRAINT fk_preventive_schedules_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE CASCADE
);

-- =====================================================
-- 3. PREVENTIVE MAINTENANCE HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS preventive_maintenance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    
    -- Entity references
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50),
    
    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('created', 'scheduled', 'started', 'updated', 'completed', 'cancelled', 'skipped', 'rescheduled')),
    action_description TEXT,
    performed_by VARCHAR(100),
    
    -- Timing
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional data
    metadata JSONB,
    
    -- Foreign key constraints
    CONSTRAINT fk_preventive_history_task FOREIGN KEY (task_id) REFERENCES preventive_maintenance_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_preventive_history_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_preventive_history_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 4. CREATE INDEXES FOR PREVENTIVE MAINTENANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_preventive_tasks_status ON preventive_maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_priority ON preventive_maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_due_date ON preventive_maintenance_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_scheduled_date ON preventive_maintenance_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_next_due_date ON preventive_maintenance_tasks(next_due_date);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_machine_id ON preventive_maintenance_tasks(machine_id);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_line_id ON preventive_maintenance_tasks(line_id);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_unit ON preventive_maintenance_tasks(unit);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_type ON preventive_maintenance_tasks(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_schedule_id ON preventive_maintenance_tasks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_preventive_tasks_recurring ON preventive_maintenance_tasks(is_recurring);

CREATE INDEX IF NOT EXISTS idx_preventive_schedules_machine_id ON preventive_maintenance_schedules(machine_id);
CREATE INDEX IF NOT EXISTS idx_preventive_schedules_line_id ON preventive_maintenance_schedules(line_id);
CREATE INDEX IF NOT EXISTS idx_preventive_schedules_unit ON preventive_maintenance_schedules(unit);
CREATE INDEX IF NOT EXISTS idx_preventive_schedules_active ON preventive_maintenance_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_preventive_schedules_type ON preventive_maintenance_schedules(schedule_type);

CREATE INDEX IF NOT EXISTS idx_preventive_history_task_id ON preventive_maintenance_history(task_id);
CREATE INDEX IF NOT EXISTS idx_preventive_history_performed_at ON preventive_maintenance_history(performed_at);

-- =====================================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_preventive_tasks_updated_at
    BEFORE UPDATE ON preventive_maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at_column();

CREATE TRIGGER update_preventive_schedules_updated_at
    BEFORE UPDATE ON preventive_maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at_column();

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS FOR PREVENTIVE MAINTENANCE
-- =====================================================

-- Function to get preventive tasks by machine
CREATE OR REPLACE FUNCTION get_preventive_tasks_by_machine(p_machine_id VARCHAR(50))
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    maintenance_type VARCHAR(50),
    priority VARCHAR(20),
    status VARCHAR(20),
    due_date DATE,
    scheduled_date DATE,
    assigned_to VARCHAR(100),
    checklist_completed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pmt.id,
        pmt.title,
        pmt.description,
        pmt.maintenance_type,
        pmt.priority,
        pmt.status,
        pmt.due_date,
        pmt.scheduled_date,
        pmt.assigned_to,
        pmt.checklist_completed
    FROM preventive_maintenance_tasks pmt
    WHERE pmt.machine_id = p_machine_id
    ORDER BY pmt.scheduled_date ASC, pmt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get preventive tasks by line
CREATE OR REPLACE FUNCTION get_preventive_tasks_by_line(p_line_id VARCHAR(50))
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    maintenance_type VARCHAR(50),
    priority VARCHAR(20),
    status VARCHAR(20),
    due_date DATE,
    scheduled_date DATE,
    assigned_to VARCHAR(100),
    checklist_completed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pmt.id,
        pmt.title,
        pmt.description,
        pmt.maintenance_type,
        pmt.priority,
        pmt.status,
        pmt.due_date,
        pmt.scheduled_date,
        pmt.assigned_to,
        pmt.checklist_completed
    FROM preventive_maintenance_tasks pmt
    WHERE pmt.line_id = p_line_id
    ORDER BY pmt.scheduled_date ASC, pmt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get overdue preventive tasks
CREATE OR REPLACE FUNCTION get_overdue_preventive_tasks()
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    maintenance_type VARCHAR(50),
    priority VARCHAR(20),
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    due_date DATE,
    scheduled_date DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pmt.id,
        pmt.title,
        pmt.description,
        pmt.maintenance_type,
        pmt.priority,
        pmt.machine_id,
        pmt.line_id,
        pmt.due_date,
        pmt.scheduled_date,
        CURRENT_DATE - pmt.due_date as days_overdue
    FROM preventive_maintenance_tasks pmt
    WHERE pmt.due_date < CURRENT_DATE 
    AND pmt.status IN ('pending', 'in_progress')
    ORDER BY pmt.due_date ASC, pmt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming preventive tasks
CREATE OR REPLACE FUNCTION get_upcoming_preventive_tasks(p_days_ahead INTEGER DEFAULT 7)
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    maintenance_type VARCHAR(50),
    priority VARCHAR(20),
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    due_date DATE,
    scheduled_date DATE,
    days_until_due INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pmt.id,
        pmt.title,
        pmt.maintenance_type,
        pmt.priority,
        pmt.machine_id,
        pmt.line_id,
        pmt.due_date,
        pmt.scheduled_date,
        pmt.due_date - CURRENT_DATE as days_until_due
    FROM preventive_maintenance_tasks pmt
    WHERE pmt.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL
    AND pmt.status IN ('pending', 'in_progress')
    ORDER BY pmt.due_date ASC, pmt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE preventive_maintenance_tasks IS 'Dedicated table for preventive/scheduled maintenance tasks. These are planned, routine maintenance tasks to prevent breakdowns and ensure equipment reliability.';
COMMENT ON TABLE preventive_maintenance_schedules IS 'Defines recurring preventive maintenance schedules that generate tasks automatically';
COMMENT ON TABLE preventive_maintenance_history IS 'Audit trail of all preventive maintenance actions and status changes';

COMMENT ON COLUMN preventive_maintenance_tasks.maintenance_type IS 'Type of preventive maintenance: scheduled, routine, inspection, calibration, lubrication, cleaning';
COMMENT ON COLUMN preventive_maintenance_tasks.schedule_frequency IS 'Frequency of this maintenance: daily, weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN preventive_maintenance_tasks.schedule_id IS 'Reference to the maintenance schedule that generated this task';
COMMENT ON COLUMN preventive_maintenance_tasks.next_due_date IS 'Next scheduled date for recurring preventive maintenance tasks';
COMMENT ON COLUMN preventive_maintenance_tasks.scheduled_date IS 'Original scheduled date for this maintenance task';
COMMENT ON COLUMN preventive_maintenance_tasks.checklist_items IS 'JSON array of checklist items that must be completed for this task';
COMMENT ON COLUMN preventive_maintenance_tasks.checklist_completed IS 'Whether all checklist items have been completed';
COMMENT ON COLUMN preventive_maintenance_tasks.findings IS 'Any issues or observations found during preventive maintenance';
COMMENT ON COLUMN preventive_maintenance_tasks.recommendations IS 'Recommendations for future maintenance or improvements';
COMMENT ON COLUMN preventive_maintenance_tasks.is_recurring IS 'Whether this task repeats on a schedule';
COMMENT ON COLUMN preventive_maintenance_tasks.completion_count IS 'Number of times this recurring task has been completed';

