-- =====================================================
-- FIX MAINTENANCE FOREIGN KEY CONSTRAINTS
-- =====================================================
-- Run this script to fix the foreign key constraint issues

-- First, ensure the referenced records exist
INSERT INTO lines (line_id, description, status, unit) 
VALUES ('LINE-001', 'Production Line 1', 'Active', 'Unit 1')
ON CONFLICT (line_id) DO NOTHING;

INSERT INTO machines (machine_id, make, model, size, capacity_tons, type, category, install_date, status, purchase_date, remarks, grinding_available)
VALUES ('JSW-1', 'JSW', 'J300EL', 300, 300, 'Electric', 'IM', CURRENT_DATE, 'Active', CURRENT_DATE, 'Sample machine for maintenance', true)
ON CONFLICT (machine_id) DO NOTHING;

-- Now clean up any invalid foreign key references
-- Only run these if the tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_checklists') THEN
        DELETE FROM maintenance_checklists WHERE machine_id IS NOT NULL AND machine_id NOT IN (SELECT machine_id FROM machines);
        DELETE FROM maintenance_checklists WHERE line_id IS NOT NULL AND line_id NOT IN (SELECT line_id FROM lines);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_schedules') THEN
        DELETE FROM maintenance_schedules WHERE machine_id IS NOT NULL AND machine_id NOT IN (SELECT machine_id FROM machines);
        DELETE FROM maintenance_schedules WHERE line_id IS NOT NULL AND line_id NOT IN (SELECT line_id FROM lines);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_tasks') THEN
        DELETE FROM maintenance_tasks WHERE machine_id IS NOT NULL AND machine_id NOT IN (SELECT machine_id FROM machines);
        DELETE FROM maintenance_tasks WHERE line_id IS NOT NULL AND line_id NOT IN (SELECT line_id FROM lines);
    END IF;
END $$;

-- Re-insert the sample data with correct foreign keys
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_checklists') THEN
        INSERT INTO maintenance_checklists (name, description, checklist_type, machine_id, items) 
        VALUES ('Daily Machine Maintenance', 'Daily maintenance checklist for injection molding machines', 'machine', 'JSW-1', 
         '[
           {"id": "1", "task": "Check oil levels and top up if necessary", "completed": false},
           {"id": "2", "task": "Inspect belts for wear and tension", "completed": false},
           {"id": "3", "task": "Clean air filters and replace if dirty", "completed": false},
           {"id": "4", "task": "Verify electrical connections and wiring", "completed": false},
           {"id": "5", "task": "Lubricate moving parts and bearings", "completed": false},
           {"id": "6", "task": "Check hydraulic system pressure", "completed": false},
           {"id": "7", "task": "Inspect safety guards and emergency stops", "completed": false},
           {"id": "8", "task": "Test machine operation and calibration", "completed": false}
         ]'::jsonb)
        ON CONFLICT DO NOTHING;

        INSERT INTO maintenance_checklists (name, description, checklist_type, line_id, items) 
        VALUES ('Line Maintenance Checklist', 'Comprehensive line maintenance checklist', 'line', 'LINE-001',
         '[
           {"id": "1", "task": "Check all machine connections and synchronization", "completed": false},
           {"id": "2", "task": "Verify robot programming and safety zones", "completed": false},
           {"id": "3", "task": "Inspect conveyor belt condition and alignment", "completed": false},
           {"id": "4", "task": "Check hoist operation and safety mechanisms", "completed": false},
           {"id": "5", "task": "Test emergency stop systems", "completed": false},
           {"id": "6", "task": "Verify communication between all line components", "completed": false},
           {"id": "7", "task": "Check for any unusual vibrations or noises", "completed": false},
           {"id": "8", "task": "Update maintenance log and record findings", "completed": false}
         ]'::jsonb)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Verify the fix worked
SELECT 'Maintenance foreign key constraints fixed successfully!' as status;
