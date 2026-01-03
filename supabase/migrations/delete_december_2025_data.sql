-- ============================================================================
-- DELETE DECEMBER 2025 DATA FROM PRODUCTION PLANNER TABLES
-- ============================================================================
-- This script removes all production blocks for December 2025 (2025-12)
-- Related data in child tables will be automatically deleted due to CASCADE
-- ============================================================================

-- First, check how many blocks will be deleted (for verification)
SELECT COUNT(*) as blocks_to_delete
FROM production_blocks
WHERE planning_year = 2025 AND planning_month = 12;

-- Delete all production blocks for December 2025
-- Related tables (production_block_color_segments, production_block_product_colors,
-- production_block_packing_materials, production_block_party_codes) will be
-- automatically deleted due to ON DELETE CASCADE constraints
DELETE FROM production_blocks
WHERE planning_year = 2025
  AND planning_month = 12;

-- Verify deletion - should return 0
SELECT COUNT(*) as remaining_blocks
FROM production_blocks
WHERE planning_year = 2025 AND planning_month = 12;

