-- =====================================================
-- RESEARCH & DEVELOPMENT (R&D) TABLES
-- =====================================================
-- This migration creates tables for tracking R&D projects
-- and new product exploration

-- =====================================================
-- 1. R&D PROJECTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS rnd_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'RND-001'
    
    -- Project information
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,
    project_category VARCHAR(100), -- e.g., 'new_product', 'material_research', 'process_improvement', 'packaging'
    
    -- Project phases
    project_phase VARCHAR(50) NOT NULL CHECK (project_phase IN ('research', 'development', 'testing', 'pilot', 'production_ready', 'on_hold', 'cancelled')) DEFAULT 'research',
    phase_start_date DATE,
    phase_end_date DATE,
    estimated_completion_date DATE,
    actual_completion_date DATE,
    
    -- Project management
    project_manager VARCHAR(100),
    team_members JSONB, -- Array of team member names/IDs
    assigned_unit VARCHAR(50) DEFAULT 'Unit 1',
    
    -- Budget and resources
    budget_allocated DECIMAL(12, 2),
    budget_spent DECIMAL(12, 2),
    budget_currency VARCHAR(10) DEFAULT 'USD',
    
    -- Project status
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')) DEFAULT 'active',
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Objectives and outcomes
    objectives TEXT, -- Project objectives
    expected_outcomes TEXT, -- Expected results/outcomes
    actual_outcomes TEXT, -- Actual results achieved
    success_criteria TEXT, -- Criteria for project success
    
    -- Related entities
    related_products JSONB, -- Array of product codes related to this project
    related_materials JSONB, -- Array of material IDs/codes
    related_machines JSONB, -- Array of machine IDs
    
    -- Documentation and files
    documents JSONB, -- Array of document references/URLs
    attachments JSONB, -- Array of file references/URLs
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- =====================================================
-- 2. R&D PROJECT MILESTONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS rnd_project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    
    -- Milestone information
    milestone_name VARCHAR(255) NOT NULL,
    milestone_description TEXT,
    milestone_type VARCHAR(50), -- e.g., 'design', 'prototype', 'testing', 'approval'
    
    -- Milestone scheduling
    planned_date DATE NOT NULL,
    actual_date DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'cancelled')) DEFAULT 'pending',
    
    -- Milestone details
    deliverables TEXT, -- What needs to be delivered
    acceptance_criteria TEXT, -- Criteria for milestone acceptance
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_milestones_project FOREIGN KEY (project_id) REFERENCES rnd_projects(id) ON DELETE CASCADE
);

-- =====================================================
-- 3. R&D PROJECT ACTIVITIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS rnd_project_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    milestone_id UUID, -- Optional: link to specific milestone
    
    -- Activity information
    activity_name VARCHAR(255) NOT NULL,
    activity_description TEXT,
    activity_type VARCHAR(50), -- e.g., 'experiment', 'test', 'meeting', 'documentation', 'analysis'
    
    -- Activity scheduling
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    duration_hours DECIMAL(10, 2),
    
    -- Activity details
    performed_by VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planned',
    results TEXT, -- Results or findings from the activity
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_activities_project FOREIGN KEY (project_id) REFERENCES rnd_projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_activities_milestone FOREIGN KEY (milestone_id) REFERENCES rnd_project_milestones(id) ON DELETE SET NULL
);

-- =====================================================
-- 4. R&D PROJECT FINDINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS rnd_project_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    activity_id UUID, -- Optional: link to specific activity
    
    -- Finding information
    finding_title VARCHAR(255) NOT NULL,
    finding_description TEXT NOT NULL,
    finding_type VARCHAR(50), -- e.g., 'discovery', 'issue', 'improvement', 'insight'
    finding_category VARCHAR(100), -- e.g., 'material', 'process', 'design', 'cost'
    
    -- Finding details
    impact_level VARCHAR(20) CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    recommendation TEXT, -- Recommended action based on finding
    status VARCHAR(20) CHECK (status IN ('new', 'reviewed', 'implemented', 'rejected')) DEFAULT 'new',
    
    -- Related information
    related_findings JSONB, -- Array of related finding IDs
    attachments JSONB, -- Array of file references/URLs
    notes TEXT,
    
    -- Metadata
    recorded_by VARCHAR(100),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_findings_project FOREIGN KEY (project_id) REFERENCES rnd_projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_findings_activity FOREIGN KEY (activity_id) REFERENCES rnd_project_activities(id) ON DELETE SET NULL
);

-- =====================================================
-- 5. CREATE INDEXES FOR R&D TABLES
-- =====================================================

-- R&D Projects Indexes
CREATE INDEX IF NOT EXISTS idx_rnd_projects_project_id ON rnd_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_rnd_projects_status ON rnd_projects(status);
CREATE INDEX IF NOT EXISTS idx_rnd_projects_phase ON rnd_projects(project_phase);
CREATE INDEX IF NOT EXISTS idx_rnd_projects_project_manager ON rnd_projects(project_manager);
CREATE INDEX IF NOT EXISTS idx_rnd_projects_unit ON rnd_projects(assigned_unit);
CREATE INDEX IF NOT EXISTS idx_rnd_projects_created_at ON rnd_projects(created_at);

-- R&D Project Milestones Indexes
CREATE INDEX IF NOT EXISTS idx_rnd_milestones_project_id ON rnd_project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_rnd_milestones_status ON rnd_project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_rnd_milestones_planned_date ON rnd_project_milestones(planned_date);

-- R&D Project Activities Indexes
CREATE INDEX IF NOT EXISTS idx_rnd_activities_project_id ON rnd_project_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_rnd_activities_milestone_id ON rnd_project_activities(milestone_id);
CREATE INDEX IF NOT EXISTS idx_rnd_activities_status ON rnd_project_activities(status);
CREATE INDEX IF NOT EXISTS idx_rnd_activities_performed_by ON rnd_project_activities(performed_by);

-- R&D Project Findings Indexes
CREATE INDEX IF NOT EXISTS idx_rnd_findings_project_id ON rnd_project_findings(project_id);
CREATE INDEX IF NOT EXISTS idx_rnd_findings_activity_id ON rnd_project_findings(activity_id);
CREATE INDEX IF NOT EXISTS idx_rnd_findings_type ON rnd_project_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_rnd_findings_status ON rnd_project_findings(status);

-- =====================================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rnd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for R&D Projects
CREATE TRIGGER trigger_update_rnd_projects_updated_at
    BEFORE UPDATE ON rnd_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_rnd_updated_at();

-- Triggers for R&D Project Milestones
CREATE TRIGGER trigger_update_rnd_milestones_updated_at
    BEFORE UPDATE ON rnd_project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_rnd_updated_at();

-- Triggers for R&D Project Activities
CREATE TRIGGER trigger_update_rnd_activities_updated_at
    BEFORE UPDATE ON rnd_project_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_rnd_updated_at();

-- Triggers for R&D Project Findings
CREATE TRIGGER trigger_update_rnd_findings_updated_at
    BEFORE UPDATE ON rnd_project_findings
    FOR EACH ROW
    EXECUTE FUNCTION update_rnd_updated_at();

-- =====================================================
-- 7. CREATE VIEWS FOR R&D PROJECTS
-- =====================================================

-- View for active R&D projects
CREATE OR REPLACE VIEW vw_active_rnd_projects AS
SELECT 
    id,
    project_id,
    project_name,
    project_description,
    project_phase,
    project_manager,
    assigned_unit,
    status,
    priority,
    progress_percentage,
    estimated_completion_date,
    created_at,
    updated_at
FROM rnd_projects
WHERE status = 'active'
ORDER BY 
    CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    estimated_completion_date ASC;

-- View for R&D projects by phase
CREATE OR REPLACE VIEW vw_rnd_projects_by_phase AS
SELECT 
    project_phase,
    COUNT(*) AS project_count,
    AVG(progress_percentage) AS avg_progress,
    SUM(budget_allocated) AS total_budget_allocated,
    SUM(budget_spent) AS total_budget_spent
FROM rnd_projects
WHERE status = 'active'
GROUP BY project_phase
ORDER BY 
    CASE project_phase
        WHEN 'research' THEN 1
        WHEN 'development' THEN 2
        WHEN 'testing' THEN 3
        WHEN 'pilot' THEN 4
        WHEN 'production_ready' THEN 5
    END;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Comprehensive R&D project tracking with milestones and activities
-- 2. Support for findings and insights from research
-- 3. Budget tracking and resource management
-- 4. Views provided for active projects and phase summaries
-- 5. No RLS policies (consistent with other tables)
-- 6. Foreign key constraints ensure data integrity
-- 7. JSONB fields allow flexible storage of arrays and complex data

