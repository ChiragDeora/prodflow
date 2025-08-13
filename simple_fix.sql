-- Simple fix for missing function
-- Run this in Supabase SQL Editor

-- First, let's check if the function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%approval%';

-- Create a simple version of the function
CREATE OR REPLACE FUNCTION get_pending_approvals_for_admin()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    department TEXT,
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
