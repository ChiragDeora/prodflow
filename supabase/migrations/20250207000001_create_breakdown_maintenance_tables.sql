-- =====================================================
-- BREAKDOWN MAINTENANCE TABLES
-- =====================================================
-- This migration creates dedicated tables for breakdown/emergency maintenance
-- Breakdown maintenance is for unplanned, urgent repairs and corrective actions

-- =====================================================
-- 1. BREAKDOWN MAINTENANCE TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS breakdown_maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Breakdown-specific fields
    breakdown_type VARCHAR(50) NOT NULL CHECK (breakdown_type IN ('emergency', 'corrective', 'urgent_repair')),
    failure_reason TEXT,
    failure_category VARCHAR(100), -- e.g., 'mechanical', 'electrical', 'hydraulic', 'pneumatic', 'software'
    downtime_hours DECIMAL(10,2), -- Actual downtime caused by breakdown
    impact_on_production VARCHAR(50), -- 'high', 'medium', 'low', 'critical'
    
    -- Priority and status (breakdown tasks are typically high priority)
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'high',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')) DEFAULT 'pending',
    
    -- Entity references
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50) DEFAULT 'Unit 1',
    
    -- Assignment and scheduling
    assigned_to VARCHAR(100),
    assigned_by VARCHAR(100),
    reported_by VARCHAR(100), -- Who reported the breakdown
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE NOT NULL,
    estimated_duration_hours INTEGER,
    actual_duration_hours INTEGER,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Breakdown-specific details
    root_cause_analysis TEXT,
    corrective_action_taken TEXT,
    preventive_measures TEXT, -- What can be done to prevent recurrence
    parts_used JSONB, -- Array of parts replaced/used
    parts_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    notes TEXT,
    
    -- Foreign key constraints
    CONSTRAINT fk_breakdown_tasks_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_breakdown_tasks_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 2. BREAKDOWN MAINTENANCE HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS breakdown_maintenance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    
    -- Entity references
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50),
    
    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('reported', 'assigned', 'started', 'updated', 'completed', 'cancelled', 'escalated')),
    action_description TEXT,
    performed_by VARCHAR(100),
    
    -- Timing
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional data
    metadata JSONB,
    
    -- Foreign key constraints
    CONSTRAINT fk_breakdown_history_task FOREIGN KEY (task_id) REFERENCES breakdown_maintenance_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_breakdown_history_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_breakdown_history_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 3. CREATE INDEXES FOR BREAKDOWN MAINTENANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_breakdown_tasks_status ON breakdown_maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_breakdown_tasks_priority ON breakdown_maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_breakdown_tasks_due_date ON breakdown_maintenance_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_breakdown_tasks_machine_id ON breakdown_maintenance_tasks(machine_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_tasks_line_id ON breakdown_maintenance_tasks(line_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_tasks_unit ON breakdown_maintenance_tasks(unit);
CREATE INDEX IF NOT EXISTS idx_breakdown_tasks_type ON breakdown_maintenance_tasks(breakdown_type);
CREATE INDEX IF NOT EXISTS idx_breakdown_tasks_reported_at ON breakdown_maintenance_tasks(reported_at);
CREATE INDEX IF NOT EXISTS idx_breakdown_tasks_failure_category ON breakdown_maintenance_tasks(failure_category);

CREATE INDEX IF NOT EXISTS idx_breakdown_history_task_id ON breakdown_maintenance_history(task_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_history_performed_at ON breakdown_maintenance_history(performed_at);

-- =====================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_breakdown_tasks_updated_at
    BEFORE UPDATE ON breakdown_maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at_column();

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS FOR BREAKDOWN MAINTENANCE
-- =====================================================

-- Function to get breakdown tasks by machine
CREATE OR REPLACE FUNCTION get_breakdown_tasks_by_machine(p_machine_id VARCHAR(50))
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    breakdown_type VARCHAR(50),
    priority VARCHAR(20),
    status VARCHAR(20),
    due_date DATE,
    assigned_to VARCHAR(100),
    reported_at TIMESTAMP WITH TIME ZONE,
    downtime_hours DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bmt.id,
        bmt.title,
        bmt.description,
        bmt.breakdown_type,
        bmt.priority,
        bmt.status,
        bmt.due_date,
        bmt.assigned_to,
        bmt.reported_at,
        bmt.downtime_hours
    FROM breakdown_maintenance_tasks bmt
    WHERE bmt.machine_id = p_machine_id
    ORDER BY bmt.reported_at DESC, bmt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get breakdown tasks by line
CREATE OR REPLACE FUNCTION get_breakdown_tasks_by_line(p_line_id VARCHAR(50))
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    breakdown_type VARCHAR(50),
    priority VARCHAR(20),
    status VARCHAR(20),
    due_date DATE,
    assigned_to VARCHAR(100),
    reported_at TIMESTAMP WITH TIME ZONE,
    downtime_hours DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bmt.id,
        bmt.title,
        bmt.description,
        bmt.breakdown_type,
        bmt.priority,
        bmt.status,
        bmt.due_date,
        bmt.assigned_to,
        bmt.reported_at,
        bmt.downtime_hours
    FROM breakdown_maintenance_tasks bmt
    WHERE bmt.line_id = p_line_id
    ORDER BY bmt.reported_at DESC, bmt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get active breakdown tasks (pending or in progress)
CREATE OR REPLACE FUNCTION get_active_breakdown_tasks()
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    breakdown_type VARCHAR(50),
    priority VARCHAR(20),
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    assigned_to VARCHAR(100),
    reported_at TIMESTAMP WITH TIME ZONE,
    downtime_hours DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bmt.id,
        bmt.title,
        bmt.breakdown_type,
        bmt.priority,
        bmt.machine_id,
        bmt.line_id,
        bmt.assigned_to,
        bmt.reported_at,
        bmt.downtime_hours
    FROM breakdown_maintenance_tasks bmt
    WHERE bmt.status IN ('pending', 'in_progress')
    ORDER BY bmt.priority DESC, bmt.reported_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE breakdown_maintenance_tasks IS 'Dedicated table for breakdown/emergency maintenance tasks. These are unplanned, urgent repairs that require immediate attention.';
COMMENT ON TABLE breakdown_maintenance_history IS 'Audit trail of all breakdown maintenance actions and status changes';

COMMENT ON COLUMN breakdown_maintenance_tasks.breakdown_type IS 'Type of breakdown: emergency (critical, immediate), corrective (fix existing issue), urgent_repair (needs quick attention)';
COMMENT ON COLUMN breakdown_maintenance_tasks.failure_reason IS 'Detailed description of why the breakdown occurred';
COMMENT ON COLUMN breakdown_maintenance_tasks.failure_category IS 'Category of failure: mechanical, electrical, hydraulic, pneumatic, software, etc.';
COMMENT ON COLUMN breakdown_maintenance_tasks.downtime_hours IS 'Actual production downtime caused by this breakdown';
COMMENT ON COLUMN breakdown_maintenance_tasks.impact_on_production IS 'Impact level: critical (stops production), high (major impact), medium (moderate impact), low (minimal impact)';
COMMENT ON COLUMN breakdown_maintenance_tasks.reported_by IS 'Person who first reported the breakdown';
COMMENT ON COLUMN breakdown_maintenance_tasks.reported_at IS 'Timestamp when breakdown was first reported';
COMMENT ON COLUMN breakdown_maintenance_tasks.root_cause_analysis IS 'Analysis of the root cause of the breakdown';
COMMENT ON COLUMN breakdown_maintenance_tasks.corrective_action_taken IS 'Description of actions taken to fix the breakdown';
COMMENT ON COLUMN breakdown_maintenance_tasks.preventive_measures IS 'Measures to prevent this breakdown from recurring';

