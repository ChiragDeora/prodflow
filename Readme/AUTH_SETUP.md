# Authentication Setup Guide

This guide will walk you through setting up the complete authentication system for the Production Scheduler ERP.

## 📋 Prerequisites

1. Supabase project created and configured
2. Environment variables set up in `.env.local`
3. Database migrations applied

## 🔧 Supabase Configuration

### 1. JWT & Session Settings

In your Supabase dashboard:

1. Navigate to **Authentication** → **Settings**
2. Configure the following settings:

```
JWT Expiry: 3600 seconds (1 hour)
Refresh Token Expiry: 604800 seconds (7 days)
```

### 2. Email Configuration

1. Go to **Authentication** → **Settings** → **Email**
2. Enable **Email Confirmation**:
   ```
   ✅ Enable email confirmations
   ✅ Secure email change
   ```

### 3. Provider Settings

1. Navigate to **Authentication** → **Providers**
2. **Disable all OAuth providers** (Google, GitHub, etc.)
3. Ensure only **Email** is enabled:
   ```
   ✅ Email (enabled)
   ❌ Phone (disabled)
   ❌ All OAuth providers (disabled)
   ```

### 4. Email Templates

Customize the email templates in **Authentication** → **Email Templates**:

#### Confirm Signup Template:
```html
<h2>Welcome to Production Scheduler</h2>
<p>Hello,</p>
<p>Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Address</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you did not create an account, please ignore this email.</p>
<p>Best regards,<br>Production Scheduler Team</p>
```

#### Reset Password Template:
```html
<h2>Reset Your Password</h2>
<p>Hello,</p>
<p>You requested a password reset for your Production Scheduler account.</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you did not request this reset, please ignore this email.</p>
<p>Best regards,<br>Production Scheduler Team</p>
```

## 🔐 Database Setup

### 1. Apply Migrations

Run the following migrations in order:

```sql
-- 1. Create user_profiles table
\i supabase/migrations/20250130000000_add_user_profiles.sql

-- 2. Update RLS policies
\i supabase/migrations/20250130000001_update_rls_policies.sql
```

### 2. Create First Admin User

1. Sign up through the application with your admin email
2. In Supabase SQL Editor, run:

```sql
-- Replace 'admin@polypacks.in' with your actual admin email
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@polypacks.in';
```

## 🚀 Edge Functions Setup

### 1. Deploy Edge Functions

```bash
# Install Supabase CLI if not already installed
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy Edge Functions
supabase functions deploy auth-domain-guard
supabase functions deploy login-rate-limiter
```

### 2. Set Environment Variables

In Supabase dashboard → **Edge Functions** → **Settings**:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Configure Webhooks

1. Go to **Database** → **Webhooks**
2. Create a new webhook:
   ```
   Name: Domain Guard
   Table: auth.users
   Events: INSERT
   Type: HTTP Request
   HTTP Request:
     Method: POST
     URL: https://your-project.supabase.co/functions/v1/auth-domain-guard
     Headers: 
       Authorization: Bearer YOUR_ANON_KEY
   ```

## 🔒 Environment Variables

Update your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Custom redirect URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 Testing the Authentication System

### 1. Test Valid Registration

1. Visit `/auth/signup`
2. Try registering with `test@polypacks.in`
3. Should receive confirmation email
4. Click confirmation link
5. Should be able to log in

### 2. Test Invalid Domain

1. Visit `/auth/signup`
2. Try registering with `test@gmail.com`
3. Should be rejected with domain error

### 3. Test Password Requirements

Try registering with various passwords:
- ❌ `password` (too short, no uppercase, no number)
- ❌ `Password` (no number)
- ❌ `password123` (no uppercase)
- ✅ `MyPassword123` (meets all requirements)

### 4. Test Rate Limiting

1. Try logging in with wrong password 6+ times
2. Should get rate limited after 5 attempts

### 5. Test Session Management

1. Log in successfully
2. Wait for session warning (5 minutes before expiry)
3. Test session extension
4. Test auto-logout after 7 days

## 👥 User Roles

### Default Roles:

- **User**: Can view data and manage their own schedules
- **Operator**: Can manage machines, molds, and approve schedules
- **Admin**: Full access, can manage users and delete data

### Changing User Roles:

1. Log in as admin
2. Visit `/admin`
3. Use the role dropdown to change user permissions

## 🔧 Troubleshooting

### Common Issues:

#### "Email not confirmed" error
- Check spam folder for confirmation email
- Verify email template is configured
- Check Supabase logs for email delivery issues

#### "Domain not allowed" error
- Verify Edge Function is deployed
- Check webhook configuration
- Ensure email ends with `@polypacks.in`

#### Session not auto-refreshing
- Verify JWT expiry settings
- Check browser console for errors
- Ensure AuthProvider is wrapping the app

#### RLS policies blocking access
- Verify user_profiles record exists for user
- Check user role is set correctly
- Review RLS policies in Supabase

### Debug Commands:

```sql
-- Check user profiles
SELECT * FROM user_profiles;

-- Check auth users
SELECT id, email, email_confirmed_at FROM auth.users;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🔐 Security Considerations

1. **Environment Variables**: Never expose service role key in client-side code
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Configure CORS properly for your domain
4. **Rate Limiting**: Monitor and adjust rate limits as needed
5. **Email Delivery**: Use a reliable email service for production
6. **Monitoring**: Set up logging and monitoring for auth events

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions Documentation](https://supabase.com/docs/guides/functions)

## ✅ Checklist

- [ ] Supabase JWT settings configured
- [ ] Email confirmation enabled
- [ ] OAuth providers disabled
- [ ] Email templates customized
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Webhooks configured
- [ ] Environment variables set
- [ ] Admin user created
- [ ] Authentication tested
- [ ] Rate limiting tested
- [ ] Session management tested 