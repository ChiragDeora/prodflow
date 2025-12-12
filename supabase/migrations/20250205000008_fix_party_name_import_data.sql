-- ============================================================================
-- FIX PARTY NAME MASTER IMPORT DATA
-- Delete all incorrectly imported party names (where numeric values from Sr. No. 
-- column were imported as names) so they can be re-imported correctly
-- ============================================================================

-- Delete all party names that are just numbers (incorrectly imported)
DELETE FROM party_name_master WHERE name ~ '^\d+$';

-- Verify deletion
SELECT 
  COUNT(*) as remaining_count,
  COUNT(*) FILTER (WHERE name ~ '^\d+$') as incorrect_count,
  COUNT(*) FILTER (WHERE name !~ '^\d+$') as correct_count
FROM party_name_master;

-- Show success message
SELECT 'All incorrectly imported party names have been deleted. Please re-import your Excel file with the corrected import logic.' as status;

