-- =====================================================
-- CREATE MAINTENANCE MANAGEMENT TABLES
-- =====================================================
-- This migration creates comprehensive maintenance management system
-- including line-based maintenance functionality

-- =====================================================
-- 1. MAINTENANCE TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('preventive', 'corrective', 'emergency', 'line_maintenance')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')) DEFAULT 'pending',
    
    -- Entity references (can be machine, line, or general)
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50) DEFAULT 'Unit 1',
    
    -- Assignment and scheduling
    assigned_to VARCHAR(100),
    assigned_by VARCHAR(100),
    due_date DATE NOT NULL,
    estimated_duration_hours INTEGER,
    actual_duration_hours INTEGER,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional details
    checklist_items JSONB,
    parts_required JSONB,
    cost_estimate DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    notes TEXT,
    
    -- Foreign key constraints
    CONSTRAINT fk_maintenance_tasks_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_maintenance_tasks_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 2. MAINTENANCE SCHEDULES TABLE
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
    checklist_template JSONB,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_maintenance_schedules_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_schedules_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE CASCADE
);

-- =====================================================
-- 3. MAINTENANCE CHECKLISTS TABLE
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
-- 4. MAINTENANCE HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    
    -- Entity references
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50),
    
    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('created', 'started', 'updated', 'completed', 'cancelled')),
    action_description TEXT,
    performed_by VARCHAR(100),
    
    -- Timing
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional data
    metadata JSONB,
    
    -- Foreign key constraints
    CONSTRAINT fk_maintenance_history_task FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_history_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_maintenance_history_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Maintenance tasks indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_priority ON maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_due_date ON maintenance_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_machine_id ON maintenance_tasks(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_line_id ON maintenance_tasks(line_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_unit ON maintenance_tasks(unit);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_type ON maintenance_tasks(task_type);

-- Maintenance schedules indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_machine_id ON maintenance_schedules(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_line_id ON maintenance_schedules(line_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_unit ON maintenance_schedules(unit);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_active ON maintenance_schedules(is_active);

-- Maintenance checklists indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_machine_id ON maintenance_checklists(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_line_id ON maintenance_checklists(line_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_checklists_type ON maintenance_checklists(checklist_type);

-- Maintenance history indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_history_task_id ON maintenance_history(task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_performed_at ON maintenance_history(performed_at);

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE RLS POLICIES
-- =====================================================

-- Maintenance tasks policies
CREATE POLICY "Allow all for authenticated users" ON maintenance_tasks
    FOR ALL USING (auth.role() = 'authenticated');

-- Maintenance schedules policies
CREATE POLICY "Allow all for authenticated users" ON maintenance_schedules
    FOR ALL USING (auth.role() = 'authenticated');

-- Maintenance checklists policies
CREATE POLICY "Allow all for authenticated users" ON maintenance_checklists
    FOR ALL USING (auth.role() = 'authenticated');

-- Maintenance history policies
CREATE POLICY "Allow all for authenticated users" ON maintenance_history
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 8. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_maintenance_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_maintenance_tasks_updated_at
    BEFORE UPDATE ON maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at_column();

CREATE TRIGGER update_maintenance_schedules_updated_at
    BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at_column();

CREATE TRIGGER update_maintenance_checklists_updated_at
    BEFORE UPDATE ON maintenance_checklists
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at_column();

-- =====================================================
-- 9. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get line maintenance tasks
CREATE OR REPLACE FUNCTION get_line_maintenance_tasks(p_line_id VARCHAR(50))
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    task_type VARCHAR(50),
    priority VARCHAR(20),
    status VARCHAR(20),
    due_date DATE,
    assigned_to VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.id,
        mt.title,
        mt.description,
        mt.task_type,
        mt.priority,
        mt.status,
        mt.due_date,
        mt.assigned_to
    FROM maintenance_tasks mt
    WHERE mt.line_id = p_line_id
    ORDER BY mt.due_date ASC, mt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get machine maintenance tasks
CREATE OR REPLACE FUNCTION get_machine_maintenance_tasks(p_machine_id VARCHAR(50))
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    task_type VARCHAR(50),
    priority VARCHAR(20),
    status VARCHAR(20),
    due_date DATE,
    assigned_to VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.id,
        mt.title,
        mt.description,
        mt.task_type,
        mt.priority,
        mt.status,
        mt.due_date,
        mt.assigned_to
    FROM maintenance_tasks mt
    WHERE mt.machine_id = p_machine_id
    ORDER BY mt.due_date ASC, mt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get overdue maintenance tasks
CREATE OR REPLACE FUNCTION get_overdue_maintenance_tasks()
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    task_type VARCHAR(50),
    priority VARCHAR(20),
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    due_date DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.id,
        mt.title,
        mt.description,
        mt.task_type,
        mt.priority,
        mt.machine_id,
        mt.line_id,
        mt.due_date,
        CURRENT_DATE - mt.due_date as days_overdue
    FROM maintenance_tasks mt
    WHERE mt.due_date < CURRENT_DATE 
    AND mt.status IN ('pending', 'in_progress')
    ORDER BY mt.due_date ASC, mt.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. SAMPLE DATA INSERTION
-- =====================================================

-- Ensure LINE-001 exists in the lines table before referencing it
INSERT INTO lines (line_id, description, status, unit) 
VALUES ('LINE-001', 'Production Line 1', 'Active', 'Unit 1')
ON CONFLICT (line_id) DO NOTHING;

-- Ensure JSW-1 exists in the machines table before referencing it
INSERT INTO machines (machine_id, make, model, size, capacity_tons, type, category, install_date, status, purchase_date, remarks, grinding_available)
VALUES ('JSW-1', 'JSW', 'J300EL', 300, 300, 'Electric', 'IM', CURRENT_DATE, 'Active', CURRENT_DATE, 'Sample machine for maintenance', true)
ON CONFLICT (machine_id) DO NOTHING;

-- Sample maintenance checklists
INSERT INTO maintenance_checklists (name, description, checklist_type, machine_id, items) VALUES
('Daily Machine Maintenance', 'Daily maintenance checklist for injection molding machines', 'machine', 'JSW-1', 
 '[
   {"id": "1", "task": "Check oil levels and top up if necessary", "completed": false},
   {"id": "2", "task": "Inspect belts for wear and tension", "completed": false},
   {"id": "3", "task": "Clean air filters and replace if dirty", "completed": false},
   {"id": "4", "task": "Verify electrical connections and wiring", "completed": false},
   {"id": "5", "task": "Lubricate moving parts and bearings", "completed": false},
   {"id": "6", "task": "Check hydraulic system pressure", "completed": false},
   {"id": "7", "task": "Inspect safety guards and emergency stops", "completed": false},
   {"id": "8", "task": "Test machine operation and calibration", "completed": false}
 ]'::jsonb);

INSERT INTO maintenance_checklists (name, description, checklist_type, line_id, items) VALUES
('Line Maintenance Checklist', 'Comprehensive line maintenance checklist', 'line', 'LINE-001',
 '[
   {"id": "1", "task": "Check all machine connections and synchronization", "completed": false},
   {"id": "2", "task": "Verify robot programming and safety zones", "completed": false},
   {"id": "3", "task": "Inspect conveyor belt condition and alignment", "completed": false},
   {"id": "4", "task": "Check hoist operation and safety mechanisms", "completed": false},
   {"id": "5", "task": "Test emergency stop systems", "completed": false},
   {"id": "6", "task": "Verify communication between all line components", "completed": false},
   {"id": "7", "task": "Check for any unusual vibrations or noises", "completed": false},
   {"id": "8", "task": "Update maintenance log and record findings", "completed": false}
 ]'::jsonb);

-- Sample maintenance schedules
INSERT INTO maintenance_schedules (name, description, schedule_type, machine_id, frequency_value, frequency_unit, start_date) VALUES
('Daily Machine Check', 'Daily maintenance check for JSW-1', 'daily', 'JSW-1', 1, 'days', CURRENT_DATE),
('Monthly Calibration', 'Monthly machine calibration check', 'monthly', 'JSW-1', 30, 'days', CURRENT_DATE);

INSERT INTO maintenance_schedules (name, description, schedule_type, line_id, frequency_value, frequency_unit, start_date) VALUES
('Weekly Line Inspection', 'Weekly comprehensive line inspection', 'weekly', 'LINE-001', 7, 'days', CURRENT_DATE);

-- Sample maintenance tasks
INSERT INTO maintenance_tasks (title, description, task_type, priority, machine_id, line_id, assigned_to, due_date, checklist_items) VALUES
('Daily Maintenance - JSW-1', 'Perform daily maintenance checklist on JSW-1', 'preventive', 'medium', 'JSW-1', NULL, 'John Smith', CURRENT_DATE, 
 '[
   {"id": "1", "task": "Check oil levels", "completed": false},
   {"id": "2", "task": "Inspect belts", "completed": false}
 ]'::jsonb),

('Line Maintenance - LINE-001', 'Comprehensive line maintenance for LINE-001', 'line_maintenance', 'high', NULL, 'LINE-001', 'Mike Johnson', CURRENT_DATE + INTERVAL '3 days', 
 '[
   {"id": "1", "task": "Check all machine connections", "completed": false},
   {"id": "2", "task": "Verify robot programming", "completed": false}
 ]'::jsonb),

('Emergency Repair - Hydraulic System', 'Hydraulic pressure drop detected on LINE-001', 'emergency', 'critical', NULL, 'LINE-001', 'Emergency Team', CURRENT_DATE, 
 '[
   {"id": "1", "task": "Diagnose hydraulic issue", "completed": false},
   {"id": "2", "task": "Replace damaged components", "completed": false}
 ]'::jsonb);

-- =====================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE maintenance_tasks IS 'Stores all maintenance tasks including machine, line, and general maintenance';
COMMENT ON TABLE maintenance_schedules IS 'Defines recurring maintenance schedules for machines and lines';
COMMENT ON TABLE maintenance_checklists IS 'Templates for maintenance checklists';
COMMENT ON TABLE maintenance_history IS 'Audit trail of all maintenance actions performed';

COMMENT ON COLUMN maintenance_tasks.task_type IS 'Type of maintenance: preventive, corrective, emergency, or line_maintenance';
COMMENT ON COLUMN maintenance_tasks.line_id IS 'Reference to production line for line-based maintenance';
COMMENT ON COLUMN maintenance_tasks.checklist_items IS 'JSON array of checklist items for this task';
COMMENT ON COLUMN maintenance_tasks.parts_required IS 'JSON array of parts needed for this maintenance task';
