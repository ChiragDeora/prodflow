# Complete Authentication System Setup Guide

## Overview

This guide will help you set up the comprehensive authentication and authorization system with Yogesh Deora as the root admin.

## 🚀 Quick Setup

### Step 1: Run Database Migration

```sql
-- Run this in your Supabase SQL Editor (use the FIXED version)
\i supabase/migrations/20250129000031_comprehensive_auth_system_fixed.sql
```

**Note**: Use the `20250129000031_comprehensive_auth_system_fixed.sql` file which has the corrected trigger placement and ENUM creation.

This will create:
- ✅ User authentication tables
- ✅ Granular permissions system
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Session management
- ✅ RLS policies
- ✅ Yogesh Deora as root admin (protected)

### Step 2: Set Yogesh's Password

```bash
# Generate password hash in Node.js
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YogeshSecurePassword123!', 12).then(hash => console.log('Hash:', hash));"

# Copy the generated hash and update setup-yogesh-password.sql
# Replace the placeholder hash with your generated hash
# Then run in Supabase SQL Editor:
\i setup-yogesh-password.sql
```

### Step 3: Install Dependencies

```bash
npm install bcrypt uuid @types/bcrypt @types/uuid --legacy-peer-deps
```

### Step 4: Start the Application

```bash
npm run dev
```

## 🔐 System Features

### Authentication Features
- ✅ **Signup** - Only @polypacks.in emails allowed
- ✅ **Login** - Username + password with persistent sessions
- ✅ **Password Reset** - Only Yogesh can reset passwords
- ✅ **Account Approval** - All new signups require Yogesh's approval
- ✅ **Session Management** - No forced expiry, logout manually
- ✅ **Account Locking** - After 5 failed login attempts

### Authorization Features
- ✅ **Granular Permissions** - Field-level access control
- ✅ **Action Types** - read, create, update, delete, export, approve, managePermissions
- ✅ **Scope Levels** - global, resource, record, field
- ✅ **Field Modes** - visible, editable, mask
- ✅ **ABAC Support** - Attribute-based conditions (plant, line, org)
- ✅ **Deny Override** - Deny permissions always override allow

### Root Admin (Yogesh Deora)
- ✅ **Protected Account** - Cannot be deleted or deactivated
- ✅ **Special UUID** - `00000000-0000-0000-0000-000000000001`
- ✅ **All Permissions** - Access to every action, resource, record, field
- ✅ **User Management** - Approve/reject signups, reset passwords, deactivate accounts
- ✅ **Audit Override** - All actions logged with `super_admin_override` flag

### Audit & Security
- ✅ **Password Hashing** - bcrypt with 12 rounds
- ✅ **Comprehensive Logging** - All actions logged with user, timestamp, outcome
- ✅ **Session Security** - Secure HTTP-only cookies, IP tracking
- ✅ **RLS Policies** - Row-level security enforced in database
- ✅ **Failed Login Protection** - Account locking and attempt tracking

## 📱 User Interface

### Available Routes
- `/auth/login` - Login page
- `/auth/signup` - Registration page  
- `/auth/change-password` - Password change (required for temp passwords)
- `/admin` - Admin dashboard (root admin only)
- `/unauthorized` - Access denied page

### Admin Dashboard Features
- ✅ **Pending Approvals** - View and approve/reject new signups
- ✅ **User Management** - View all users, their status, login history
- ✅ **Password Resets** - Generate temporary passwords for users
- ✅ **User Statistics** - Total, active, pending, locked accounts
- ✅ **Real-time Updates** - Dynamic status updates

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/change-password` - Change password

### Admin Only
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/{id}/approve` - Approve pending user
- `POST /api/admin/users/{id}/reject` - Reject and delete user
- `POST /api/admin/users/{id}/reset-password` - Reset user password

## 🗃️ Database Schema

### Core Tables
- `auth_users` - User accounts with authentication data
- `auth_sessions` - Active user sessions
- `auth_roles` - System roles (super_admin, admin, manager, operator, viewer)
- `auth_user_roles` - User role assignments
- `auth_permissions` - Granular permission definitions
- `auth_role_permissions` - Role-based permissions
- `auth_user_permissions` - Direct user permissions
- `auth_resources` - System resources (machines, molds, etc.)
- `auth_resource_fields` - Resource field definitions
- `auth_audit_logs` - Comprehensive audit trail
- `auth_password_resets` - Password reset tracking

### Permission System Design
```
Actions: read | create | update | delete | export | approve | managePermissions
Scopes: global → resource → record → field
Field Modes: visible | editable | mask(type)
Conditions: JSON for ABAC (plant, line, department, etc.)
```

## 🛡️ Security Features

### Password Security
- Minimum 6 characters
- bcrypt hashing (12 rounds)
- Temporary password system
- Password change tracking

### Account Security
- Email domain validation (@polypacks.in only)
- Account approval workflow
- Failed login attempt tracking
- Automatic account locking (5 attempts)
- Session timeout handling

### Permission Security
- Deny-always-wins principle
- Field-level access control
- Resource-based restrictions
- Attribute-based conditions
- Comprehensive audit trail

## 🚦 User Lifecycle

1. **Signup** → User creates account (pending status)
2. **Admin Approval** → Yogesh approves user (active status)
3. **Login** → User logs in (persistent session)
4. **Password Reset** → Yogesh can reset any user's password
5. **Account Management** → Yogesh can deactivate/remove accounts

## 🔍 Verification Steps

After setup, verify the system works:

1. **Database Check**
   ```sql
   SELECT * FROM auth_users WHERE email = 'yogesh@polypacks.in';
   ```

2. **Login Test**
   - Go to `/auth/login`
   - Login as Yogesh with the password you set
   - Should redirect to dashboard

3. **Admin Access**
   - Go to `/admin`
   - Should see admin dashboard with user management

4. **Signup Test**
   - Go to `/auth/signup`
   - Create a test account with @polypacks.in email
   - Should show "pending approval" message

5. **Approval Test**
   - In admin dashboard, approve the test user
   - Test user should now be able to login

## 🆘 Troubleshooting

### Common Issues

**1. Migration fails**
- Check if tables already exist
- Drop conflicting tables first
- Ensure proper permissions

**2. Login fails**
- Verify password hash is set correctly
- Check user status is 'active'
- Verify session cookies are working

**3. Admin access denied**
- Ensure is_root_admin = true for Yogesh
- Check RLS policies are applied
- Verify session is valid

**4. Permission errors**
- Check auth functions are created
- Verify RLS policies exist
- Ensure proper role assignments

### Reset Commands

If you need to start over:

```sql
-- Drop all auth tables
DROP SCHEMA IF EXISTS auth CASCADE;

-- Re-run the migration
\i supabase/migrations/20250129000030_comprehensive_auth_system.sql
```

## 📞 Support

For any issues:
1. Check the audit logs: `SELECT * FROM auth_audit_logs ORDER BY created_at DESC;`
2. Verify user status: `SELECT username, status, is_root_admin FROM auth_users;`
3. Check session validity: `SELECT * FROM auth_sessions WHERE is_active = true;`

---

🎉 **Congratulations!** You now have a bulletproof authentication system with Yogesh Deora as the untouchable root admin!
