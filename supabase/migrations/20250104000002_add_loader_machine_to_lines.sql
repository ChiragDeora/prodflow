-- Add loader_machine_id column to lines table
-- This is an optional field for reference purposes

ALTER TABLE lines 
ADD COLUMN IF NOT EXISTS loader_machine_id VARCHAR(50);

-- Add foreign key constraint to machines table
ALTER TABLE lines 
ADD CONSTRAINT fk_lines_loader_machine 
FOREIGN KEY (loader_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lines_loader_machine ON lines(loader_machine_id);


