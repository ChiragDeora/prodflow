-- =====================================================
-- MOLD BREAKDOWN MAINTENANCE TABLES
-- =====================================================
-- This migration creates dedicated tables for mold breakdown/emergency maintenance
-- Mold breakdown is for unplanned, urgent repairs and corrective actions on molds

-- =====================================================
-- 1. MOLD BREAKDOWN MAINTENANCE TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS mold_breakdown_maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Breakdown-specific fields
    breakdown_type VARCHAR(50) NOT NULL CHECK (breakdown_type IN ('emergency', 'corrective', 'urgent_repair')),
    failure_reason TEXT,
    
    -- Mold-specific failure fields
    air_valve_pressure_broken BOOLEAN DEFAULT false,
    valve_broken BOOLEAN DEFAULT false,
    hrc_not_working BOOLEAN DEFAULT false,
    heating_element_failed BOOLEAN DEFAULT false,
    cooling_channel_blocked BOOLEAN DEFAULT false,
    ejector_pin_broken BOOLEAN DEFAULT false,
    sprue_bushing_damaged BOOLEAN DEFAULT false,
    cavity_damage BOOLEAN DEFAULT false,
    core_damage BOOLEAN DEFAULT false,
    vent_blocked BOOLEAN DEFAULT false,
    gate_damage BOOLEAN DEFAULT false,
    other_issues TEXT, -- For any other mold-specific issues
    
    downtime_hours DECIMAL(10,2), -- Actual downtime caused by breakdown
    impact_on_production VARCHAR(50), -- 'high', 'medium', 'low', 'critical'
    
    -- Priority and status (breakdown tasks are typically high priority)
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'high',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')) DEFAULT 'pending',
    
    -- Entity references
    mold_id VARCHAR(50) NOT NULL,
    machine_id VARCHAR(50), -- Machine where mold is installed
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
    CONSTRAINT fk_mold_breakdown_tasks_mold FOREIGN KEY (mold_id) REFERENCES molds(mold_id) ON DELETE CASCADE,
    CONSTRAINT fk_mold_breakdown_tasks_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_mold_breakdown_tasks_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 2. MOLD BREAKDOWN MAINTENANCE HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS mold_breakdown_maintenance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    
    -- Entity references
    mold_id VARCHAR(50),
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
    CONSTRAINT fk_mold_breakdown_history_task FOREIGN KEY (task_id) REFERENCES mold_breakdown_maintenance_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_mold_breakdown_history_mold FOREIGN KEY (mold_id) REFERENCES molds(mold_id) ON DELETE SET NULL,
    CONSTRAINT fk_mold_breakdown_history_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_mold_breakdown_history_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 3. CREATE INDEXES FOR MOLD BREAKDOWN MAINTENANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_mold_breakdown_tasks_status ON mold_breakdown_maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_tasks_priority ON mold_breakdown_maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_tasks_due_date ON mold_breakdown_maintenance_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_tasks_mold_id ON mold_breakdown_maintenance_tasks(mold_id);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_tasks_machine_id ON mold_breakdown_maintenance_tasks(machine_id);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_tasks_line_id ON mold_breakdown_maintenance_tasks(line_id);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_tasks_unit ON mold_breakdown_maintenance_tasks(unit);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_tasks_type ON mold_breakdown_maintenance_tasks(breakdown_type);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_tasks_reported_at ON mold_breakdown_maintenance_tasks(reported_at);

CREATE INDEX IF NOT EXISTS idx_mold_breakdown_history_task_id ON mold_breakdown_maintenance_history(task_id);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_history_performed_at ON mold_breakdown_maintenance_history(performed_at);
CREATE INDEX IF NOT EXISTS idx_mold_breakdown_history_mold_id ON mold_breakdown_maintenance_history(mold_id);

-- =====================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Ensure the update function exists (should already exist from previous migrations)
CREATE OR REPLACE FUNCTION update_maintenance_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mold_breakdown_tasks_updated_at
    BEFORE UPDATE ON mold_breakdown_maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at_column();

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS FOR MOLD BREAKDOWN MAINTENANCE
-- =====================================================

-- Function to get mold breakdown tasks by mold
CREATE OR REPLACE FUNCTION get_mold_breakdown_tasks_by_mold(p_mold_id VARCHAR(50))
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    breakdown_type VARCHAR(50),
    priority VARCHAR(20),
    status VARCHAR(20),
    due_date DATE,
    reported_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mbmt.id,
        mbmt.title,
        mbmt.breakdown_type,
        mbmt.priority,
        mbmt.status,
        mbmt.due_date,
        mbmt.reported_at
    FROM mold_breakdown_maintenance_tasks mbmt
    WHERE mbmt.mold_id = p_mold_id
    ORDER BY mbmt.reported_at DESC, mbmt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get overdue mold breakdown tasks
CREATE OR REPLACE FUNCTION get_overdue_mold_breakdown_tasks()
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    mold_id VARCHAR(50),
    priority VARCHAR(20),
    due_date DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mbmt.id,
        mbmt.title,
        mbmt.mold_id,
        mbmt.priority,
        mbmt.due_date,
        CURRENT_DATE - mbmt.due_date as days_overdue
    FROM mold_breakdown_maintenance_tasks mbmt
    WHERE mbmt.due_date < CURRENT_DATE 
    AND mbmt.status IN ('pending', 'in_progress')
    ORDER BY mbmt.due_date ASC, mbmt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE mold_breakdown_maintenance_tasks IS 'Dedicated table for mold breakdown/emergency maintenance tasks. These are unplanned, urgent repairs and corrective actions on molds.';
COMMENT ON TABLE mold_breakdown_maintenance_history IS 'Audit trail of all mold breakdown maintenance actions and status changes';

COMMENT ON COLUMN mold_breakdown_maintenance_tasks.breakdown_type IS 'Type of breakdown: emergency, corrective, or urgent_repair';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.air_valve_pressure_broken IS 'Indicates if air valve pressure system is broken';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.valve_broken IS 'Indicates if any valve is broken';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.hrc_not_working IS 'Indicates if HRC (Heating/Regulating/Cooling) system is not working';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.heating_element_failed IS 'Indicates if heating element has failed';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.cooling_channel_blocked IS 'Indicates if cooling channel is blocked';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.ejector_pin_broken IS 'Indicates if ejector pin is broken';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.sprue_bushing_damaged IS 'Indicates if sprue bushing is damaged';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.cavity_damage IS 'Indicates if cavity has damage';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.core_damage IS 'Indicates if core has damage';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.vent_blocked IS 'Indicates if vent is blocked';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.gate_damage IS 'Indicates if gate has damage';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.other_issues IS 'Text field for any other mold-specific issues not covered by checkboxes';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.downtime_hours IS 'Actual downtime caused by the mold breakdown';
COMMENT ON COLUMN mold_breakdown_maintenance_tasks.impact_on_production IS 'Impact level on production: high, medium, low, or critical';

