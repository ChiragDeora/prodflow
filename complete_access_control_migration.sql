-- Complete Access Control System Migration (Simplified)
-- This migration implements the pre-approval system with empty profile creation

-- Add phone_number column to existing user_profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone_number VARCHAR(20);
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add unique constraints if they don't exist
DO $$ 
BEGIN
    -- Add unique constraint on email if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_email_key'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
    END IF;
    
    -- Add unique constraint on phone_number if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_phone_number_key'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_phone_number_key UNIQUE (phone_number);
    END IF;
END $$;

-- Fix foreign key constraint for user_profiles to allow standalone profiles
DO $$ 
BEGIN
    -- Drop existing foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' AND constraint_name = 'user_profiles_id_fkey'
    ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_id_fkey;
    END IF;
END $$;

-- Create approved_phone_numbers table for pre-approval system
CREATE TABLE IF NOT EXISTS approved_phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update Yogesh Deora's profile with phone number and ensure admin role
UPDATE user_profiles 
SET 
    phone_number = '+919830599005',
    role = 'admin',
    is_active = true,
    updated_at = NOW()
WHERE email = 'yogesh@polypacks.in';

-- Add Yogesh's phone number to approved list
INSERT INTO approved_phone_numbers (phone_number, approved_by, notes)
VALUES ('+919830599005', '224632d5-f27c-48d2-b38f-61c40c1acc21', 'Yogesh Deora - Permanent Admin')
ON CONFLICT (phone_number) DO NOTHING;

-- Chirag's phone number removed - let it test through normal flow

-- Enable RLS on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid()::text = id::text OR auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

DROP POLICY IF EXISTS "Yogesh can view all profiles" ON user_profiles;
CREATE POLICY "Yogesh can view all profiles" ON user_profiles
    FOR ALL USING (auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid()::text = id::text OR auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
CREATE POLICY "Users can create their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = id::text OR auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

-- RLS Policies for approved_phone_numbers
DROP POLICY IF EXISTS "Admins can manage approved phone numbers" ON approved_phone_numbers;
CREATE POLICY "Admins can manage approved phone numbers" ON approved_phone_numbers
    FOR ALL USING (auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text);

DROP POLICY IF EXISTS "Allow signup phone validation" ON approved_phone_numbers;
CREATE POLICY "Allow signup phone validation" ON approved_phone_numbers
    FOR SELECT USING (
        auth.role() = 'anon' OR
        auth.uid()::text = '224632d5-f27c-48d2-b38f-61c40c1acc21'::text
    );

-- Function to create empty user profile when phone number is approved
DROP FUNCTION IF EXISTS create_empty_user_profile_for_phone(TEXT, TEXT);
CREATE OR REPLACE FUNCTION create_empty_user_profile_for_phone(
    phone_number TEXT,
    approved_by_name TEXT DEFAULT 'Admin'
) RETURNS JSON AS $$
DECLARE
    new_user_id UUID;
    profile_data JSON;
BEGIN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- Create empty user profile with just phone number
    INSERT INTO user_profiles (
        id, full_name, email, phone_number, role, department, is_active
    ) VALUES (
        new_user_id,
        'Pending User', -- Placeholder name
        'pending@polypacks.in', -- Placeholder email
        phone_number,
        'user',
        'Pending',
        true
    );
    
    -- Return the created profile
    SELECT to_json(up.*) INTO profile_data
    FROM user_profiles up
    WHERE up.id = new_user_id;
    
    RETURN profile_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to connect existing profile during signup
DROP FUNCTION IF EXISTS connect_user_profile_signup(UUID, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION connect_user_profile_signup(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    department TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    profile_data JSON;
BEGIN
    -- Update the existing profile with real user data
    UPDATE user_profiles SET
        id = connect_user_profile_signup.user_id,
        full_name = connect_user_profile_signup.full_name,
        email = connect_user_profile_signup.email,
        department = connect_user_profile_signup.department,
        role = 'user',
        is_active = true,
        updated_at = NOW()
    WHERE phone_number = connect_user_profile_signup.phone_number
    AND full_name = 'Pending User'; -- Only update pending profiles
    
    -- Return the updated profile
    SELECT to_json(up.*) INTO profile_data
    FROM user_profiles up
    WHERE up.phone_number = connect_user_profile_signup.phone_number;
    
    RETURN profile_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate phone number during signup
DROP FUNCTION IF EXISTS validate_signup_phone(TEXT);
CREATE OR REPLACE FUNCTION validate_signup_phone(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM approved_phone_numbers
        WHERE phone_number = validate_signup_phone.phone_number
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create profile for authenticated user who doesn't have one
DROP FUNCTION IF EXISTS create_profile_for_authenticated_user();
CREATE OR REPLACE FUNCTION create_profile_for_authenticated_user() 
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    user_email TEXT;
    profile_data JSON;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get user email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'User email not found';
    END IF;
    
    -- Create a basic profile for the user
    INSERT INTO user_profiles (
        id, full_name, email, phone_number, role, department, is_active
    ) VALUES (
        current_user_id,
        split_part(user_email, '@', 1), -- Use email prefix as name initially
        user_email,
        NULL, -- No phone number initially
        'user',
        NULL,
        true
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        is_active = true,
        updated_at = NOW();
    
    -- Return the created/updated profile
    SELECT to_json(up.*) INTO profile_data
    FROM user_profiles up
    WHERE up.id = current_user_id;
    
    RETURN profile_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_approved_phone_numbers_phone ON approved_phone_numbers(phone_number);

-- Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approved_phone_numbers_updated_at ON approved_phone_numbers;
CREATE TRIGGER update_approved_phone_numbers_updated_at BEFORE UPDATE ON approved_phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 