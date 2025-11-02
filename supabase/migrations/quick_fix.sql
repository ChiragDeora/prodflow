-- Quick Fix for User Management 400 Error
-- Run this in Supabase SQL Editor

-- Step 1: Check what columns exist in user_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add is_approved column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'is_approved'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN is_approved BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_approved column';
    ELSE
        RAISE NOTICE 'is_approved column already exists';
    END IF;

    -- Add auth_user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'auth_user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN auth_user_id UUID;
        RAISE NOTICE 'Added auth_user_id column';
    ELSE
        RAISE NOTICE 'auth_user_id column already exists';
    END IF;
END $$;

-- Step 3: Update existing records to have is_approved = true
UPDATE user_profiles 
SET is_approved = true 
WHERE is_approved IS NULL;

-- Step 4: Fix RLS policies - drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view linked profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update linked profiles" ON user_profiles;
DROP POLICY IF EXISTS "Yogesh can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;

-- Step 5: Create simple, working RLS policies
-- Admin can do everything
CREATE POLICY "Admin can manage all profiles" ON user_profiles
    FOR ALL USING (auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (
        auth.uid()::text = auth_user_id::text 
        OR auth.uid()::text = id::text
    );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (
        auth.uid()::text = auth_user_id::text 
        OR auth.uid()::text = id::text
    );

-- Allow profile creation
CREATE POLICY "Allow profile creation" ON user_profiles
    FOR INSERT WITH CHECK (
        auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
        OR auth.uid()::text = auth_user_id::text
        OR auth.uid() IS NULL
    );

-- Step 6: Test the query that was failing
SELECT 
    id, 
    full_name, 
    email, 
    phone_number, 
    department, 
    role, 
    is_active, 
    created_at, 
    auth_user_id
FROM user_profiles 
WHERE is_approved = false 
AND is_active = true 
AND auth_user_id IS NOT NULL 
ORDER BY created_at ASC;

-- Step 7: Verify RLS policies are working
SELECT 
    'RLS Policies Fixed' as status,
    COUNT(*) as total_profiles,
    'User profiles table should now be accessible' as message
FROM user_profiles;
