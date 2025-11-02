-- Test Login System
-- This script verifies that the authentication system is ready

-- ===========================================
-- STEP 1: CHECK USER DATA
-- ===========================================

-- Show all users with their login credentials
SELECT 
    full_name,
    email,
    username,
    phone_number,
    role,
    is_approved,
    CASE 
        WHEN password_hash IS NOT NULL THEN 'Password Set'
        ELSE 'No Password'
    END as password_status,
    auth_method,
    created_at
FROM user_profiles 
ORDER BY created_at;

-- ===========================================
-- STEP 2: TEST LOGIN CREDENTIALS
-- ===========================================

-- Test Yogesh Deora login
SELECT 
    'Yogesh Deora Login Test' as test_name,
    full_name,
    username,
    phone_number,
    password_hash,
    is_approved,
    CASE 
        WHEN username = 'yogeshdeora' AND password_hash = 'yogesh123' AND is_approved = true 
        THEN '✅ READY FOR LOGIN'
        ELSE '❌ NOT READY'
    END as login_status
FROM user_profiles 
WHERE email = 'yogesh@polypacks.in';

-- Test IT user login
SELECT 
    'IT User Login Test' as test_name,
    full_name,
    username,
    phone_number,
    password_hash,
    is_approved,
    CASE 
        WHEN password_hash = 'it123' AND is_approved = true 
        THEN '✅ READY FOR LOGIN'
        ELSE '❌ NOT READY'
    END as login_status
FROM user_profiles 
WHERE full_name = 'It';

-- ===========================================
-- STEP 3: LOGIN INSTRUCTIONS
-- ===========================================

-- Display login instructions
SELECT 
    'LOGIN INSTRUCTIONS' as info_type,
    'Username: yogeshdeora OR Phone: +919830599005' as credential_1,
    'Password: yogesh123' as credential_2,
    'Status: Ready for testing' as status;

-- Log the test
DO $$
BEGIN
    RAISE NOTICE '=== LOGIN SYSTEM TEST ===';
    RAISE NOTICE 'Check the results above to verify login credentials';
    RAISE NOTICE 'Yogesh Deora should show "READY FOR LOGIN"';
    RAISE NOTICE 'IT user should show "READY FOR LOGIN"';
    RAISE NOTICE 'If any show "NOT READY", run fix_existing_users_auth.sql again';
END $$;
