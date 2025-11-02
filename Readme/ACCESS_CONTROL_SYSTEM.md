# Access Control System Documentation

## Overview

The Production Scheduler ERP system now implements a comprehensive access control system that provides granular security and user management capabilities. This system ensures that only authorized users can access the system and perform specific actions based on their assigned permissions.

## System Architecture

### 1. Admin (CEO) - Full Control
- Single CEO account with full administrative privileges
- Can manage all users, phone number approvals, and permissions
- Has access to all modules and features

### 2. Pre-Approved Phone Numbers
- Only phone numbers approved by the Admin can register for accounts
- Admin can add/remove approved phone numbers
- Each phone number can have optional notes for tracking

### 3. User Registration Process
- Users must provide a pre-approved phone number during signup
- Email addresses must be from @polypacks.in domain
- Password requirements: minimum 6 characters, uppercase letter, number
- Users start with 'user' role by default

### 4. Role & Permission Assignment
- Admin assigns specific permissions to each user
- Granular control over modules and individual actions
- Four access levels: blocked, read, write, admin

## Database Schema

### Core Tables

#### user_profiles
```sql
- id (UUID, Primary Key)
- full_name (VARCHAR)
- email (VARCHAR, Unique)
- phone_number (VARCHAR, Unique)
- role (ENUM: 'admin', 'user', 'operator')
- department (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### approved_phone_numbers
```sql
- id (UUID, Primary Key)
- phone_number (VARCHAR, Unique)
- approved_by (UUID, Foreign Key to user_profiles)
- approved_at (TIMESTAMP)
- is_active (BOOLEAN)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### permissions
```sql
- id (UUID, Primary Key)
- name (VARCHAR, Unique)
- description (TEXT)
- module (VARCHAR)
- action (VARCHAR)
- resource (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### user_permissions
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to user_profiles)
- permission_id (UUID, Foreign Key to permissions)
- access_level (ENUM: 'read', 'write', 'admin')
- granted_by (UUID, Foreign Key to user_profiles)
- granted_at (TIMESTAMP)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### module_permissions
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to user_profiles)
- module_name (VARCHAR)
- access_level (ENUM: 'blocked', 'read', 'write', 'admin')
- granted_by (UUID, Foreign Key to user_profiles)
- granted_at (TIMESTAMP)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Access Levels

### Module Access Levels
1. **Blocked** - User cannot access the module at all
2. **Read** - User can view data but cannot modify
3. **Write** - User can view and modify data
4. **Admin** - User has full control over the module

### Permission Access Levels
1. **Read** - User can view the resource
2. **Write** - User can view and modify the resource
3. **Admin** - User has full control over the resource

## Available Modules

### 1. Master Data (master-data)
- **Machines** - View, create, edit, delete machine records
- **Molds** - View, create, edit, delete mold records
- **Raw Materials** - View, create, edit, delete raw material records
- **Packing Materials** - View, create, edit, delete packing material records

### 2. Production Schedule (production-schedule)
- **Schedule** - View, create, edit, delete, approve schedule entries

### 3. Operator Panel (operator-panel)
- **Operator** - View operator panel, update production status

### 4. Reports (reports)
- **Reports** - View reports, export reports

### 5. Approvals (approvals)
- **Approvals** - View approval requests, approve/reject requests

### 6. Admin (admin)
- **Users** - View user management, create/edit/delete users, manage permissions

### 7. Profile (profile)
- **Profile** - View own profile, edit own profile

## Available Permissions

### Machine Master Permissions
- `machines.view` - View machine master data
- `machines.create` - Create new machines
- `machines.edit` - Edit machine data
- `machines.delete` - Delete machines

### Mold Master Permissions
- `molds.view` - View mold master data
- `molds.create` - Create new molds
- `molds.edit` - Edit mold data
- `molds.delete` - Delete molds

### Raw Materials Permissions
- `raw_materials.view` - View raw materials data
- `raw_materials.create` - Create new raw materials
- `raw_materials.edit` - Edit raw materials data
- `raw_materials.delete` - Delete raw materials

### Packing Materials Permissions
- `packing_materials.view` - View packing materials data
- `packing_materials.create` - Create new packing materials
- `packing_materials.edit` - Edit packing materials data
- `packing_materials.delete` - Delete packing materials

### Production Schedule Permissions
- `schedule.view` - View production schedule
- `schedule.create` - Create new schedule entries
- `schedule.edit` - Edit schedule entries
- `schedule.delete` - Delete schedule entries
- `schedule.approve` - Approve schedule entries

### Operator Panel Permissions
- `operator.view` - View operator panel
- `operator.update` - Update production status

### Reports Permissions
- `reports.view` - View reports
- `reports.export` - Export reports

### Approvals Permissions
- `approvals.view` - View approval requests
- `approvals.approve` - Approve requests
- `approvals.reject` - Reject requests

### User Management Permissions (Admin Only)
- `users.view` - View user management
- `users.create` - Create new users
- `users.edit` - Edit user data
- `users.delete` - Delete users
- `users.permissions` - Manage user permissions

### Profile Permissions
- `profile.view` - View own profile
- `profile.edit` - Edit own profile

## User Management Interface

### Admin Dashboard Features

#### 1. Users Tab
- View all registered users
- See user details (name, email, phone, role, department)
- Change user roles (user, operator, admin)
- Delete users (except self)
- Access granular permissions for each user

#### 2. Approved Phone Numbers Tab
- Add new approved phone numbers
- View all approved phone numbers
- Add notes for each phone number
- Remove approved phone numbers
- Track approval dates and who approved them

#### 3. User Permissions Tab
- Select a user to manage their permissions
- Module-level access control (blocked, read, write, admin)
- Granular permission management
- Real-time permission updates

## Implementation Details

### Authentication Flow
1. User attempts to register with email and phone number
2. System validates email format and domain (@polypacks.in)
3. System checks if phone number is pre-approved
4. If approved, user account is created with 'user' role
5. User must confirm email before logging in
6. Admin can then assign specific permissions

### Permission Checking
The system uses several functions to check permissions:

```typescript
// Check module access
const { canAccess, accessLevel } = await accessControlUtils.canAccessModule('master-data');

// Check specific permission
const { hasPermission } = await accessControlUtils.hasPermission('machines.create');

// Check action on resource
const { canPerform } = await accessControlUtils.canPerformAction('create', 'machines');
```

### Row Level Security (RLS)
All tables have RLS policies that ensure:
- Users can only view their own profile
- Admins can view and manage all profiles
- Users can only view their own permissions
- Admins can manage all permissions
- Only admins can manage approved phone numbers

## Security Features

### 1. Phone Number Validation
- Only pre-approved phone numbers can register
- Phone numbers must be in international format
- Admin can add/remove approved numbers

### 2. Email Domain Restriction
- Only @polypacks.in email addresses allowed
- Prevents unauthorized domain registrations

### 3. Password Requirements
- Minimum 6 characters
- Must contain uppercase letter
- Must contain number
- Secure password handling (not stored in state)

### 4. Session Management
- Secure session handling with timeouts
- Automatic session refresh
- Proper logout functionality

### 5. Role-Based Access Control
- Clear role hierarchy (admin > operator > user)
- Granular permissions for fine control
- Module-level access control

## Usage Examples

### Adding an Approved Phone Number
1. Admin logs into the system
2. Navigates to User Management
3. Clicks on "Approved Phone Numbers" tab
4. Enters phone number (e.g., +919999999999)
5. Adds optional notes
6. Clicks "Add Phone Number"

### Managing User Permissions
1. Admin navigates to User Management
2. Clicks on "Users" tab
3. Finds the user to manage
4. Clicks the permissions icon
5. Switches to "User Permissions" tab
6. Adjusts module access levels
7. Grants/revokes granular permissions

### User Registration Process
1. User visits signup page
2. Enters full name, email (@polypacks.in), phone number
3. System validates phone number approval
4. If approved, account is created
5. User receives confirmation email
6. User confirms email and can log in
7. Admin assigns specific permissions

## Default Admin Account

The system creates a default admin account during migration:
- **Email**: ceo@polypacks.in
- **Phone**: +919999999999
- **Role**: admin
- **Department**: Management
- **Permissions**: Full access to all modules and permissions

## Migration and Setup

### Running the Migration
```bash
# Apply the access control migration
supabase db push
```

### Initial Setup
1. Run the migration to create all tables and default admin
2. Log in with the default admin account
3. Add approved phone numbers for new users
4. Create additional admin accounts if needed
5. Assign permissions to users as they register

## API Functions

### Auth API
- `signUp()` - Register new user with phone validation
- `signIn()` - Authenticate user
- `signOut()` - Logout user
- `resetPassword()` - Request password reset
- `updatePassword()` - Update user password

### User Profile API
- `getProfile()` - Get user profile
- `updateProfile()` - Update user profile
- `getAllProfiles()` - Get all profiles (admin only)
- `updateUserRole()` - Update user role (admin only)

### Approved Phone Numbers API
- `getAll()` - Get all approved phone numbers (admin only)
- `add()` - Add approved phone number (admin only)
- `remove()` - Remove approved phone number (admin only)
- `isApproved()` - Check if phone number is approved

### Permissions API
- `getAll()` - Get all permissions
- `getUserPermissions()` - Get user's permissions
- `grantPermission()` - Grant permission to user (admin only)
- `revokePermission()` - Revoke permission from user (admin only)
- `hasPermission()` - Check if user has specific permission

### Module Permissions API
- `getUserModulePermissions()` - Get user's module permissions
- `setModulePermission()` - Set module permission for user (admin only)
- `getModuleAccess()` - Get user's access level for module

### Access Control Utils
- `canAccessModule()` - Check if user can access module
- `hasPermission()` - Check if user has specific permission
- `canPerformAction()` - Check if user can perform action on resource

## Best Practices

### 1. Security
- Regularly review and update approved phone numbers
- Monitor user permissions and access levels
- Use strong passwords and encourage users to do the same
- Regularly audit user access and permissions

### 2. User Management
- Assign minimal required permissions to users
- Use module-level access control for broad restrictions
- Use granular permissions for fine control
- Document permission assignments for audit purposes

### 3. Phone Number Management
- Keep approved phone numbers list current
- Add notes when approving phone numbers for tracking
- Remove phone numbers when employees leave
- Regularly audit the approved numbers list

### 4. Monitoring
- Monitor failed registration attempts
- Track permission changes
- Log admin actions for audit purposes
- Monitor user access patterns

## Troubleshooting

### Common Issues

#### 1. User Cannot Register
- Check if phone number is approved
- Verify email domain is @polypacks.in
- Ensure password meets requirements

#### 2. User Cannot Access Module
- Check module permissions in User Management
- Verify user role and permissions
- Check if module is blocked for the user

#### 3. Permission Denied Errors
- Verify user has required permissions
- Check both module and granular permissions
- Ensure user is active and not blocked

#### 4. Admin Cannot Manage Users
- Verify admin role is properly assigned
- Check admin permissions in database
- Ensure RLS policies are working correctly

### Debug Steps
1. Check user profile and role
2. Verify module permissions
3. Check granular permissions
4. Review RLS policies
5. Check database logs for errors

## Future Enhancements

### Planned Features
1. **Audit Logging** - Track all permission changes and admin actions
2. **Bulk Operations** - Manage multiple users' permissions at once
3. **Permission Templates** - Pre-defined permission sets for common roles
4. **Temporary Permissions** - Time-limited access grants
5. **Advanced Reporting** - Detailed access and permission reports
6. **API Rate Limiting** - Prevent abuse of authentication endpoints
7. **Two-Factor Authentication** - Additional security layer
8. **Session Management** - Advanced session controls and monitoring

### Integration Possibilities
1. **LDAP/Active Directory** - Enterprise directory integration
2. **SSO** - Single sign-on with external identity providers
3. **Multi-tenancy** - Support for multiple organizations
4. **API Access** - Programmatic access with API keys
5. **Webhook Notifications** - Real-time permission change notifications

## Conclusion

The access control system provides a robust, secure, and flexible foundation for managing user access in the Production Scheduler ERP system. With its granular permissions, phone number approval system, and comprehensive admin interface, it ensures that only authorized users can access the system while providing the flexibility needed for different user roles and responsibilities.

The system is designed to be scalable and can be extended with additional features as the organization grows and requirements evolve. 