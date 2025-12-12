-- Fix Yogesh Deora's profile information
-- Update department, job title, and other profile details

-- Update Yogesh's profile in the auth_system table
UPDATE auth_system.auth_users 
SET 
    department = 'admin',
    job_title = 'Owner',
    updated_at = NOW()
WHERE email = 'yogesh@polypacks.in' 
   OR id = '00000000-0000-0000-0000-000000000001'
   OR full_name ILIKE '%yogesh%deora%';

-- Also update in public view if it exists as a table
UPDATE public.auth_users 
SET 
    department = 'admin',
    job_title = 'Owner',
    updated_at = NOW()
WHERE email = 'yogesh@polypacks.in' 
   OR id = '00000000-0000-0000-0000-000000000001'
   OR full_name ILIKE '%yogesh%deora%';

-- Verify the update
SELECT 
    id,
    full_name,
    email,
    department,
    job_title,
    is_root_admin,
    created_at,
    updated_at
FROM auth_system.auth_users 
WHERE email = 'yogesh@polypacks.in' 
   OR full_name ILIKE '%yogesh%deora%';
