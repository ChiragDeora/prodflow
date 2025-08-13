-- Manual Approval System Migration
-- This migration implements the manual approval system for user signups

-- Add is_approved field to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Add email_confirmed_at field to track email confirmation
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Create function to handle email confirmation and auto-approval
CREATE OR REPLACE FUNCTION handle_email_confirmation()
RETURNS TRIGGER AS $$
DECLARE
    original_email TEXT;
    user_profile_id UUID;
BEGIN
    -- Only proceed if email_confirmed_at was just set (not null)
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        -- Get the original email from user metadata
        original_email := NEW.raw_user_meta_data->>'original_email';
        
        -- Update the corresponding user_profiles row
        UPDATE user_profiles 
        SET 
            is_approved = true,
            email_confirmed_at = NEW.email_confirmed_at,
            email = COALESCE(original_email, NEW.email), -- Use original email if available
            updated_at = NOW()
        WHERE auth_user_id = NEW.id
        RETURNING id INTO user_profile_id;
        
        -- Send notification to yogesh@polypacks.in about the approval
        RAISE NOTICE 'User profile approved for auth user: % with email: %', NEW.id, COALESCE(original_email, NEW.email);
        
        -- In a real implementation, you would send an email to yogesh@polypacks.in here
        -- For now, we'll just log it
        RAISE NOTICE 'Sending approval notification to yogesh@polypacks.in for user: %', COALESCE(original_email, NEW.email);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send approval notification to yogesh@polypacks.in
CREATE OR REPLACE FUNCTION notify_admin_of_new_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- This function will be called when a new user profile is created
    -- In a real implementation, you would send an email to yogesh@polypacks.in
    -- For now, we'll just log the notification
    RAISE NOTICE 'New user signup notification: User % with email % needs approval', NEW.id, NEW.email;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to notify admin of new signups
DROP TRIGGER IF EXISTS new_signup_notification_trigger ON user_profiles;
CREATE TRIGGER new_signup_notification_trigger
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_of_new_signup();

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS email_confirmation_trigger ON auth.users;
CREATE TRIGGER email_confirmation_trigger
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_email_confirmation();

-- Create function to create user profile during signup
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    original_email TEXT;
BEGIN
    -- Get the original email from user metadata
    original_email := NEW.raw_user_meta_data->>'original_email';
    
    -- Insert new user profile with is_approved = false
    INSERT INTO user_profiles (
        id,
        full_name,
        email,
        phone_number,
        department,
        role,
        is_active,
        is_approved,
        auth_user_id,
        auth_method,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
        COALESCE(original_email, NEW.email), -- Use original email if available
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL),
        COALESCE(NEW.raw_user_meta_data->>'department', NULL),
        'user',
        true,
        false, -- Not approved until email is confirmed
        NEW.id,
        'password',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Created user profile for new user: % with email: %', NEW.id, COALESCE(original_email, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table for new signups
DROP TRIGGER IF EXISTS user_signup_trigger ON auth.users;
CREATE TRIGGER user_signup_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_on_signup();

-- Create function to check if user is approved for login
CREATE OR REPLACE FUNCTION check_user_approval_for_login(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_user_approved BOOLEAN;
BEGIN
    -- Check if user profile exists and is approved
    SELECT is_approved INTO is_user_approved
    FROM user_profiles
    WHERE email = user_email;
    
    -- Return true if user is approved, false otherwise
    RETURN COALESCE(is_user_approved, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set default permissions for new users
CREATE OR REPLACE FUNCTION set_default_user_permissions(user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Grant basic read permissions to all modules
    INSERT INTO module_permissions (user_id, module_name, access_level, granted_by)
    VALUES 
        (user_id, 'profile', 'write', user_id),
        (user_id, 'master-data', 'read', user_id),
        (user_id, 'production-schedule', 'read', user_id),
        (user_id, 'operator-panel', 'read', user_id),
        (user_id, 'reports', 'read', user_id)
    ON CONFLICT (user_id, module_name) DO NOTHING;
    
    -- Grant basic permissions
    INSERT INTO user_permissions (user_id, permission_id, access_level, granted_by)
    SELECT 
        user_id,
        p.id,
        'read',
        user_id
    FROM permissions p
    WHERE p.name IN (
        'profile.view',
        'profile.edit',
        'machines.view',
        'molds.view',
        'raw_materials.view',
        'packing_materials.view',
        'schedule.view',
        'operator.view',
        'reports.view'
    )
    ON CONFLICT (user_id, permission_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing create_user_profile_signup function to set is_approved = false
CREATE OR REPLACE FUNCTION create_user_profile_signup(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    department TEXT DEFAULT NULL,
    role TEXT DEFAULT 'user'
)
RETURNS user_profiles AS $$
DECLARE
    new_profile user_profiles;
BEGIN
    INSERT INTO user_profiles (
        id,
        full_name,
        email,
        phone_number,
        department,
        role,
        is_active,
        is_approved, -- Set to false by default
        auth_user_id,
        auth_method,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        full_name,
        email,
        phone_number,
        department,
        role,
        true,
        false, -- Not approved until email is confirmed
        user_id,
        'password',
        NOW(),
        NOW()
    )
    RETURNING * INTO new_profile;
    
    -- Set default permissions
    PERFORM set_default_user_permissions(user_id);
    
    RETURN new_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manual approval functions removed - approval happens automatically after email confirmation

-- Update RLS policies to include approval checks
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (
        auth.uid()::text = auth_user_id::text 
        OR auth.uid()::text = id::text
    );

-- Admin policies for manual approval removed - approval is automatic

-- Create index for better performance on approval queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_approval_status ON user_profiles(is_approved, created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);

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
