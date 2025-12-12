-- =====================================================
-- CORRECTIVE ACTION PLAN TABLES
-- =====================================================
-- This migration creates tables for tracking corrective actions
-- taken to address quality issues and non-conformances

-- =====================================================
-- 1. CORRECTIVE ACTION PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS corrective_action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'CAP-2024-001'
    
    -- Issue information
    issue_description TEXT NOT NULL,
    issue_category VARCHAR(100), -- e.g., 'quality', 'safety', 'process', 'equipment'
    issue_severity VARCHAR(20) CHECK (issue_severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    issue_reported_date DATE NOT NULL,
    issue_reported_by VARCHAR(100),
    
    -- Root cause analysis
    root_cause TEXT NOT NULL,
    root_cause_analysis_date DATE,
    root_cause_analyzed_by VARCHAR(100),
    
    -- Action plan details
    corrective_action TEXT NOT NULL, -- Description of the corrective action
    preventive_action TEXT, -- Preventive measures to avoid recurrence
    action_priority VARCHAR(20) CHECK (action_priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    
    -- Assignment and scheduling
    assigned_to VARCHAR(100) NOT NULL,
    assigned_by VARCHAR(100),
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    start_date DATE,
    completion_date DATE,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')) DEFAULT 'pending',
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Verification and effectiveness
    verification_method TEXT, -- How the effectiveness will be verified
    verification_date DATE,
    verified_by VARCHAR(100),
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5), -- 1-5 scale
    effectiveness_notes TEXT,
    
    -- Related entities
    product_code VARCHAR(100),
    batch_number VARCHAR(100),
    machine_id VARCHAR(50),
    line_id VARCHAR(50),
    unit VARCHAR(50) DEFAULT 'Unit 1',
    
    -- Additional information
    notes TEXT,
    attachments JSONB, -- Array of file references/URLs
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Foreign key constraints (if tables exist)
    CONSTRAINT fk_corrective_action_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL,
    CONSTRAINT fk_corrective_action_line FOREIGN KEY (line_id) REFERENCES lines(line_id) ON DELETE SET NULL
);

-- =====================================================
-- 2. CORRECTIVE ACTION HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS corrective_action_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('created', 'assigned', 'started', 'updated', 'completed', 'verified', 'cancelled', 'reopened')),
    action_description TEXT,
    performed_by VARCHAR(100),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status change tracking
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    old_completion_percentage INTEGER,
    new_completion_percentage INTEGER,
    
    -- Additional data
    metadata JSONB,
    
    -- Foreign key constraint
    CONSTRAINT fk_action_history_plan FOREIGN KEY (action_plan_id) REFERENCES corrective_action_plans(id) ON DELETE CASCADE
);

-- =====================================================
-- 3. CORRECTIVE ACTION COMMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS corrective_action_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL,
    
    -- Comment details
    comment_text TEXT NOT NULL,
    commented_by VARCHAR(100) NOT NULL,
    commented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional information
    is_internal BOOLEAN DEFAULT false, -- Internal notes vs. visible comments
    attachments JSONB, -- Array of file references/URLs
    
    -- Foreign key constraint
    CONSTRAINT fk_action_comments_plan FOREIGN KEY (action_plan_id) REFERENCES corrective_action_plans(id) ON DELETE CASCADE
);

-- =====================================================
-- 4. CREATE INDEXES FOR CORRECTIVE ACTION PLANS
-- =====================================================

-- Corrective Action Plans Indexes
CREATE INDEX IF NOT EXISTS idx_corrective_action_plans_action_id ON corrective_action_plans(action_id);
CREATE INDEX IF NOT EXISTS idx_corrective_action_plans_status ON corrective_action_plans(status);
CREATE INDEX IF NOT EXISTS idx_corrective_action_plans_assigned_to ON corrective_action_plans(assigned_to);
CREATE INDEX IF NOT EXISTS idx_corrective_action_plans_due_date ON corrective_action_plans(due_date);
CREATE INDEX IF NOT EXISTS idx_corrective_action_plans_unit ON corrective_action_plans(unit);
CREATE INDEX IF NOT EXISTS idx_corrective_action_plans_product_code ON corrective_action_plans(product_code);
CREATE INDEX IF NOT EXISTS idx_corrective_action_plans_machine_id ON corrective_action_plans(machine_id);
CREATE INDEX IF NOT EXISTS idx_corrective_action_plans_created_at ON corrective_action_plans(created_at);

-- Corrective Action History Indexes
CREATE INDEX IF NOT EXISTS idx_corrective_action_history_plan_id ON corrective_action_history(action_plan_id);
CREATE INDEX IF NOT EXISTS idx_corrective_action_history_performed_at ON corrective_action_history(performed_at);
CREATE INDEX IF NOT EXISTS idx_corrective_action_history_action_type ON corrective_action_history(action_type);

-- Corrective Action Comments Indexes
CREATE INDEX IF NOT EXISTS idx_corrective_action_comments_plan_id ON corrective_action_comments(action_plan_id);
CREATE INDEX IF NOT EXISTS idx_corrective_action_comments_commented_at ON corrective_action_comments(commented_at);

-- =====================================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT AND HISTORY
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_corrective_action_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_corrective_action_updated_at
    BEFORE UPDATE ON corrective_action_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_corrective_action_updated_at();

-- Function to automatically create history entry on status/completion change
CREATE OR REPLACE FUNCTION create_corrective_action_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status OR 
       OLD.completion_percentage IS DISTINCT FROM NEW.completion_percentage THEN
        INSERT INTO corrective_action_history (
            action_plan_id,
            action_type,
            action_description,
            performed_by,
            old_status,
            new_status,
            old_completion_percentage,
            new_completion_percentage
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.status = 'completed' THEN 'completed'
                WHEN NEW.status = 'cancelled' THEN 'cancelled'
                WHEN OLD.status = 'pending' AND NEW.status = 'in_progress' THEN 'started'
                ELSE 'updated'
            END,
            CASE 
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 
                    'Status changed from ' || COALESCE(OLD.status, 'N/A') || ' to ' || NEW.status
                WHEN OLD.completion_percentage IS DISTINCT FROM NEW.completion_percentage THEN
                    'Completion percentage changed from ' || COALESCE(OLD.completion_percentage::text, 'N/A') || '% to ' || NEW.completion_percentage || '%'
                ELSE 'Action plan updated'
            END,
            COALESCE(NEW.updated_by, 'system'),
            OLD.status,
            NEW.status,
            OLD.completion_percentage,
            NEW.completion_percentage
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic history creation
CREATE TRIGGER trigger_create_corrective_action_history
    AFTER UPDATE ON corrective_action_plans
    FOR EACH ROW
    EXECUTE FUNCTION create_corrective_action_history();

-- =====================================================
-- 6. CREATE VIEWS FOR CORRECTIVE ACTION PLANS
-- =====================================================

-- View for active corrective action plans
CREATE OR REPLACE VIEW vw_active_corrective_actions AS
SELECT 
    id,
    action_id,
    issue_description,
    root_cause,
    corrective_action,
    assigned_to,
    due_date,
    status,
    completion_percentage,
    unit,
    product_code,
    machine_id,
    created_at,
    updated_at
FROM corrective_action_plans
WHERE status IN ('pending', 'in_progress', 'overdue')
ORDER BY 
    CASE status
        WHEN 'overdue' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'pending' THEN 3
    END,
    due_date ASC;

-- View for overdue corrective actions
CREATE OR REPLACE VIEW vw_overdue_corrective_actions AS
SELECT 
    id,
    action_id,
    issue_description,
    assigned_to,
    due_date,
    status,
    completion_percentage,
    unit,
    CURRENT_DATE - due_date AS days_overdue
FROM corrective_action_plans
WHERE status IN ('pending', 'in_progress')
  AND due_date < CURRENT_DATE
ORDER BY due_date ASC;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Table includes comprehensive tracking of corrective actions
-- 2. Automatic history tracking via triggers
-- 3. Support for comments and attachments
-- 4. Views provided for active and overdue actions
-- 5. No RLS policies (consistent with other tables)
-- 6. Foreign key constraints ensure data integrity

