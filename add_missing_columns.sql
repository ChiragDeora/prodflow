-- Add missing columns to user_profiles table
-- Run this in Supabase SQL Editor

-- Add is_approved column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Add email_confirmed_at column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Update existing profiles to have is_approved = true if they have email_confirmed_at
UPDATE user_profiles 
SET is_approved = true 
WHERE email_confirmed_at IS NOT NULL 
AND is_approved IS NULL;

-- Set default approval for existing admin users
UPDATE user_profiles 
SET is_approved = true 
WHERE role = 'admin' 
AND is_approved IS NULL;

-- Now create the function
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

-- Create the approval function
CREATE OR REPLACE FUNCTION approve_user_manually(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get the user's email
    SELECT email INTO user_email
    FROM user_profiles
    WHERE auth_user_id = user_id;
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Update the user_profiles table
    UPDATE user_profiles 
    SET 
        is_approved = true,
        email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE auth_user_id = user_id;
    
    RAISE NOTICE 'User % approved manually', user_email;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT * FROM get_pending_approvals_for_admin();
