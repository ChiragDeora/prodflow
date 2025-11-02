-- Add username column to user_profiles table
-- Run this in Supabase SQL Editor

-- Check if username column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'username'
            AND table_schema = 'public'
        ) THEN 'username column EXISTS'
        ELSE 'username column MISSING'
    END as column_status;

-- Add username column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'username'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN username VARCHAR(50) UNIQUE;
        RAISE NOTICE 'Added username column to user_profiles table';
    ELSE
        RAISE NOTICE 'username column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
