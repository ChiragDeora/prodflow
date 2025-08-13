-- Fix missing functions for approval system

-- Create function to get pending approvals for admin dashboard
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

-- Create function to handle manual approval (when yogesh clicks the confirmation link)
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
    
    -- Update the auth.users table to mark email as confirmed
    UPDATE auth.users 
    SET 
        email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Update the user_profiles table
    UPDATE user_profiles 
    SET 
        is_approved = true,
        email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE auth_user_id = user_id;
    
    RAISE NOTICE 'User % approved manually by yogesh@polypacks.in', user_email;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send custom confirmation email to yogesh@polypacks.in
CREATE OR REPLACE FUNCTION send_custom_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
    original_email TEXT;
    full_name TEXT;
    phone_number TEXT;
    department TEXT;
    confirmation_link TEXT;
BEGIN
    -- Only proceed for new user signups
    IF TG_OP = 'INSERT' THEN
        -- Get user data from metadata
        original_email := NEW.raw_user_meta_data->>'original_email';
        full_name := NEW.raw_user_meta_data->>'full_name';
        phone_number := NEW.raw_user_meta_data->>'phone_number';
        department := NEW.raw_user_meta_data->>'department';
        
        -- Generate confirmation link (this would be a real URL in production)
        confirmation_link := 'https://your-domain.com/auth/confirm?token=' || NEW.id;
        
        -- Log the email that would be sent to yogesh@polypacks.in
        RAISE NOTICE 'SENDING CONFIRMATION EMAIL TO yogesh@polypacks.in';
        RAISE NOTICE 'Subject: New User Signup Approval Required';
        RAISE NOTICE 'Body:';
        RAISE NOTICE 'A new user has signed up and requires your approval:';
        RAISE NOTICE 'Name: %', full_name;
        RAISE NOTICE 'Email: %', original_email;
        RAISE NOTICE 'Phone: %', phone_number;
        RAISE NOTICE 'Department: %', department;
        RAISE NOTICE 'Confirmation Link: %', confirmation_link;
        RAISE NOTICE 'Please click the confirmation link to approve this user.';
        
        -- In a real implementation, you would use a service like SendGrid, Mailgun, or Supabase's email service
        -- to send the actual email to yogesh@polypacks.in
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to send custom confirmation email
DROP TRIGGER IF EXISTS custom_confirmation_email_trigger ON auth.users;
CREATE TRIGGER custom_confirmation_email_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION send_custom_confirmation_email();

-- Update the notification function to be more specific
CREATE OR REPLACE FUNCTION notify_admin_of_new_signup()
RETURNS TRIGGER AS $$
DECLARE
    original_email TEXT;
BEGIN
    -- Get the original email from user metadata
    original_email := NEW.raw_user_meta_data->>'original_email';
    
    -- This function will be called when a new user profile is created
    -- In a real implementation, you would send an email to yogesh@polypacks.in
    RAISE NOTICE 'NEW USER SIGNUP NOTIFICATION FOR yogesh@polypacks.in:';
    RAISE NOTICE 'User ID: %', NEW.id;
    RAISE NOTICE 'Name: %', NEW.raw_user_meta_data->>'full_name';
    RAISE NOTICE 'Email: %', original_email;
    RAISE NOTICE 'Phone: %', NEW.raw_user_meta_data->>'phone_number';
    RAISE NOTICE 'Department: %', NEW.raw_user_meta_data->>'department';
    RAISE NOTICE 'Action Required: Click confirmation link to approve user';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
