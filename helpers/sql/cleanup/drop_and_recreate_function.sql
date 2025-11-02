-- Drop and recreate function with correct column types
-- Run this in Supabase SQL Editor

-- First, drop the existing function
DROP FUNCTION IF EXISTS get_pending_approvals_for_admin();

-- Create the function with correct column types
CREATE OR REPLACE FUNCTION get_pending_approvals_for_admin()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    phone_number VARCHAR(20),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE,
    auth_user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.full_name,
        up.email,
        up.phone_number,
        up.department,
        up.created_at,
        up.auth_user_id
    FROM user_profiles up
    WHERE up.is_approved = false
    AND up.is_active = true
    AND up.auth_user_id IS NOT NULL
    ORDER BY up.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT * FROM get_pending_approvals_for_admin();
