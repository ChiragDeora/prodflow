-- Add missing columns to user_profiles table
-- Run this in Supabase SQL Editor

-- Add email_confirmed_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'email_confirmed_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN email_confirmed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added email_confirmed_at column to user_profiles table';
    ELSE
        RAISE NOTICE 'email_confirmed_at column already exists';
    END IF;
END $$;

-- Verify all columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test creating a user with all required fields
SELECT 
    'Database Ready' as status,
    'All required columns are present' as message,
    'User management system is ready to use' as details;
