-- Check if maintenance_tasks table exists and create if needed
-- Run this in Supabase SQL Editor

-- Check if maintenance_tasks table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'maintenance_tasks' 
ORDER BY ordinal_position;

-- If the table doesn't exist, create it
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
    notes TEXT
);

-- Enable RLS
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'maintenance_tasks' 
        AND policyname = 'Allow all for authenticated users'
    ) THEN
        CREATE POLICY "Allow all for authenticated users" ON maintenance_tasks
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_priority ON maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_due_date ON maintenance_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_machine_id ON maintenance_tasks(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_line_id ON maintenance_tasks(line_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_unit ON maintenance_tasks(unit);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_type ON maintenance_tasks(task_type);

-- Check if table was created successfully
SELECT 'maintenance_tasks table created successfully' as status;
