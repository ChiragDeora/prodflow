-- Fix Existing Users Auth
-- This script creates proper auth accounts for existing users and links them correctly

-- ===========================================
-- STEP 1: ADD PASSWORD_HASH COLUMN
-- ===========================================

-- Add password_hash column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- ===========================================
-- STEP 2: CHECK CURRENT USER STATE
-- ===========================================

-- Show current users and their auth status
SELECT 
    id,
    full_name,
    email,
    username,
    phone_number,
    role,
    is_approved,
    auth_user_id,
    auth_method,
    created_at
FROM user_profiles 
ORDER BY created_at;

-- ===========================================
-- STEP 3: SET DEFAULT PASSWORDS FOR EXISTING USERS
-- ===========================================

-- Set default passwords for existing users
UPDATE user_profiles 
SET 
    auth_method = 'password',
    is_approved = CASE 
        WHEN role = 'admin' THEN true
        WHEN email_confirmed_at IS NOT NULL THEN true
        ELSE is_approved
    END,
    password_hash = CASE
        WHEN email = 'yogesh@polypacks.in' THEN 'yogesh123'
        WHEN full_name = 'It' THEN 'it123'
        ELSE 'default123'
    END
WHERE auth_method IS NULL OR auth_method = 'pending';

-- ===========================================
-- STEP 4: FIX YOGESH DEORA'S ACCOUNT
-- ===========================================

-- Update Yogesh's profile to ensure it's properly configured
UPDATE user_profiles 
SET 
    username = 'yogeshdeora',
    role = 'admin',
    is_approved = true,
    auth_method = 'password',
    password_hash = 'yogesh123',
    updated_at = NOW()
WHERE email = 'yogesh@polypacks.in';

-- ===========================================
-- STEP 5: FIX IT USER'S ACCOUNT
-- ===========================================

-- Generate a proper auth_user_id for the IT user if missing
UPDATE user_profiles 
SET 
    auth_user_id = gen_random_uuid(),
    auth_method = 'password',
    is_approved = true,
    password_hash = 'it123',
    updated_at = NOW()
WHERE full_name = 'It' AND auth_user_id IS NULL;

-- ===========================================
-- STEP 6: VERIFICATION
-- ===========================================

-- Show updated user state
SELECT 
    id,
    full_name,
    email,
    username,
    phone_number,
    role,
    is_approved,
    auth_user_id,
    auth_method,
    CASE 
        WHEN password_hash IS NOT NULL THEN 'Password Set'
        ELSE 'No Password'
    END as password_status,
    created_at
FROM user_profiles 
ORDER BY created_at;

-- Log the fix
DO $$
BEGIN
    RAISE NOTICE 'Fixed existing user profiles';
    RAISE NOTICE 'Added password_hash column';
    RAISE NOTICE 'Updated auth_method to password for all users';
    RAISE NOTICE 'Set is_approved=true for admin users and users with email_confirmed_at';
    RAISE NOTICE 'Fixed Yogesh Deora username to yogeshdeora';
    RAISE NOTICE 'Generated auth_user_id for IT user';
    RAISE NOTICE 'Set passwords: yogesh123 (Yogesh), it123 (IT), default123 (others)';
    RAISE NOTICE 'IMPORTANT: Change these passwords in production!';
END $$;
