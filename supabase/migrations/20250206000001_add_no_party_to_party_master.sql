-- ============================================================================
-- ADD "NO PARTY" TO PARTY NAME MASTER
-- Adds "No Party" as a special party option in the database
-- This allows users to explicitly select "No Party" from the dropdown
-- ============================================================================

-- Insert "No Party" if it doesn't already exist
INSERT INTO party_name_master (name, code, description)
VALUES ('No Party', 'NO_PARTY', 'Special option for colors without party assignment')
ON CONFLICT (name) DO NOTHING;

-- Add comment to document this special party
COMMENT ON TABLE party_name_master IS 'Master table for party names. Includes special "No Party" entry for colors without party assignment.';

