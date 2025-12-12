# Production Scheduler ERP - Architecture & Operations Guide

> **Version:** 1.0  
> **Last Updated:** December 2024  
> **Tech Stack:** Next.js 15 + Supabase + TypeScript + Tailwind CSS  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Repo Map](#2-repo-map)
3. [Data Flow (End-to-End)](#3-data-flow-end-to-end)
4. [Supabase Setup](#4-supabase-setup)
5. [Auth Model](#5-auth-model)
6. [Database Model by Module](#6-database-model-by-module)
7. [RLS & Security](#7-rls--security)
8. [Operational Playbooks](#8-operational-playbooks)
9. [Known Risks & Hard Rules](#9-known-risks--hard-rules)
10. [Actionable Checklist](#10-actionable-checklist)

---

## 1. System Overview

### Purpose
Polypacks Injection Molding ERP System for managing:
- Production scheduling and planning
- Machine/mold master data
- Store operations (Purchase, Inward, Outward, Sales)
- Quality control and maintenance
- User access control with granular permissions

### Architecture Pattern
```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  Next.js App Router + React 19 + TailwindCSS                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (API Routes)                   │
│  /api/auth/*     - Custom session-based authentication          │
│  /api/admin/*    - User/Permission management (service_role)    │
│  /api/production/* - Production operations (service_role)       │
│  /api/masters/*  - Master data CRUD (service_role)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (PostgreSQL)                       │
│  auth_system schema - Custom auth tables with RLS               │
│  public schema      - Business tables with RLS                  │
│  Edge Functions     - auth-domain-guard, login-rate-limiter     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions
| Decision | Rationale |
|----------|-----------|
| **Custom Auth (not Supabase Auth)** | Business requirement for @polypacks.in email domain enforcement, admin approval workflow, and granular RBAC |
| **Session Tokens (not JWT)** | Better control over session invalidation; stored in `auth_sessions` table |
| **Service Role in API Routes** | Bypasses RLS for admin operations; never exposed to client |
| **auth_system Schema** | Isolates auth tables from business data; clean separation |

---

## 2. Repo Map

```
production-scheduler/
├── src/
│   ├── app/
│   │   ├── api/                    # Next.js API routes (server-side)
│   │   │   ├── auth/               # Login, logout, signup, password
│   │   │   ├── admin/              # User/permission management
│   │   │   ├── production/         # Silo, mould reports
│   │   │   ├── masters/            # Vendors, customers
│   │   │   └── bom/                # BOM operations
│   │   ├── auth/                   # Auth pages (login, signup, etc.)
│   │   ├── admin/                  # Admin dashboard page
│   │   └── layout.tsx              # Root layout with AuthProvider
│   │
│   ├── components/
│   │   ├── auth/                   # AuthProvider, LoginForm, RouteGuard
│   │   ├── modules/                # Feature modules (84 files)
│   │   │   ├── master-data/
│   │   │   ├── store-dispatch/
│   │   │   ├── production/
│   │   │   ├── quality-control/
│   │   │   └── maintenance-management/
│   │   └── ProductionSchedulerERP.tsx  # Main application component
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client + all API functions
│   │   ├── auth-utils.ts           # Server-side auth utilities
│   │   ├── useAccessControl.ts     # Client-side permission hooks
│   │   ├── rate-limit.ts           # Rate limiting for login
│   │   └── security-utils.ts       # Security helpers
│   │
│   └── middleware.ts               # Security headers, CSP
│
├── supabase/
│   ├── migrations/                 # 168 SQL migration files
│   │   ├── 20250129000000_initial_schema.sql
│   │   ├── 20250129000032_auth_system_clean.sql
│   │   ├── 20250129000033_add_rls_security.sql
│   │   ├── 20250210000001_scalable_permission_schema.sql
│   │   └── ...
│   └── functions/                  # Edge Functions
│       ├── auth-domain-guard/
│       └── login-rate-limiter/
│
├── helpers/sql/                    # Operational SQL scripts
├── scripts/                        # Database maintenance scripts
└── Readme/                         # Documentation (multiple guides)
```

### Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Single Supabase client for client-side; all CRUD APIs defined here (5933 lines) |
| `src/lib/auth-utils.ts` | Server-side session verification, permission checks |
| `src/components/auth/AuthProvider.tsx` | React context for auth state; handles login/logout |
| `src/middleware.ts` | Security headers (CSP, X-Frame-Options, HSTS) |
| `src/app/api/auth/login/route.ts` | Login endpoint with rate limiting, password verification |
| `supabase/migrations/20250129000032_auth_system_clean.sql` | Core auth schema definition |

---

## 3. Data Flow (End-to-End)

### 3.1 Authentication Flow

```
┌──────────┐     POST /api/auth/login      ┌──────────────┐
│  Browser │ ────────────────────────────► │ API Route    │
│  (React) │   { username, password }      │              │
└──────────┘                               └──────┬───────┘
                                                  │
                                                  ▼
                    ┌─────────────────────────────────────────┐
                    │ 1. Rate limit check (5 attempts/15 min) │
                    │ 2. Fetch user from auth_users           │
                    │ 3. bcrypt.compare(password, hash)       │
                    │ 4. Create session in auth_sessions      │
                    │ 5. Set httpOnly cookie (session_token)  │
                    └─────────────────────────────────────────┘
                                                  │
                                                  ▼
┌──────────┐     Set-Cookie: session_token    ┌──────────────┐
│  Browser │ ◄──────────────────────────────  │ API Route    │
│          │     { user, session }            │              │
└──────────┘                                  └──────────────┘
```

**Code References:**
- Login API: `src/app/api/auth/login/route.ts` (lines 1-271)
- Session verification: `src/app/api/auth/verify-session/route.ts`
- AuthProvider: `src/components/auth/AuthProvider.tsx` (lines 168-226)

### 3.2 Data Query Flow (Client-Side via Anon Key)

```
┌──────────┐                               ┌──────────────┐
│  React   │   supabase.from('machines')   │  Supabase    │
│Component │ ─────────────────────────────►│  PostgREST   │
└──────────┘   .select('*')                │  (anon key)  │
     │                                     └──────┬───────┘
     │                                            │
     │         RLS Policy Evaluation              │
     │         ┌────────────────────────────────┐ │
     │         │ auth.role() = 'authenticated'  │◄┘
     │         │ OR custom session context      │
     │         └────────────────────────────────┘
     │                                            │
     ▼                                            ▼
┌──────────┐      JSON response               ┌──────────────┐
│  React   │ ◄─────────────────────────────── │  PostgreSQL  │
│Component │      [ {...}, {...} ]            │              │
└──────────┘                                  └──────────────┘
```

**Code Reference:** `src/lib/supabase.ts` (lines 946-1080) - machineAPI example

### 3.3 Data Query Flow (Server-Side via Service Role)

```
┌──────────┐     fetch('/api/production/silos')    ┌──────────────┐
│  Browser │ ─────────────────────────────────────►│ API Route    │
│          │                                       │              │
└──────────┘                                       └──────┬───────┘
                                                          │
                   createClient(URL, SERVICE_ROLE_KEY)    │
                                                          ▼
                                                   ┌──────────────┐
                                                   │  Supabase    │
                                                   │  (bypasses   │
                                                   │   RLS)       │
                                                   └──────────────┘
```

**Code Reference:** `src/app/api/production/silos/route.ts` (lines 1-56)

---

## 4. Supabase Setup

### 4.1 Environment Variables

**Required in `.env.local`:**
```env
# Public (exposed to browser - safe)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-only (NEVER prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.2 Client Creation

**Client-Side (Browser) - `src/lib/supabase.ts:1-16`**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Server-Side (API Routes) - Example pattern:**
```typescript
// src/app/api/production/silos/route.ts:4-7
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Bypasses RLS
);
```

### 4.3 Service Role Key Usage Locations

| File | Purpose |
|------|---------|
| `src/app/api/production/silos/*.ts` | Silo management (4 files) |
| `src/app/api/production/mould-reports/*.ts` | Mould reports (2 files) |
| `src/app/api/masters/vendors/*.ts` | Vendor CRUD (2 files) |
| `src/app/api/masters/customers/*.ts` | Customer CRUD (2 files) |
| `src/app/api/vrf-forms/*.ts` | VRF forms (2 files) |
| `src/app/api/admin/dpr-permissions/route.ts` | DPR permissions |
| `supabase/functions/auth-domain-guard/index.ts` | Edge function |

**⚠️ CRITICAL:** Service role key is ONLY used in:
- Next.js API routes (server-side)
- Supabase Edge Functions

It is NEVER imported in client components or `src/lib/supabase.ts` (client bundle).

---

## 5. Auth Model

### 5.1 Auth Schema (`auth_system` schema)

```sql
-- Core Tables
auth_system.auth_users          -- User accounts
auth_system.auth_sessions       -- Active sessions (session token storage)
auth_system.auth_roles          -- Role definitions
auth_system.auth_user_roles     -- User-role assignments
auth_system.auth_permissions    -- Permission definitions
auth_system.auth_user_permissions -- Direct user permissions
auth_system.auth_role_permissions -- Role-permission mappings
auth_system.auth_resources      -- Module/resource definitions
auth_system.auth_audit_logs     -- Security audit trail
auth_system.auth_password_resets -- Password reset tokens
```

### 5.2 User Table Structure

```sql
-- auth_system.auth_users
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,          -- bcrypt, 12 rounds
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending', -- pending|active|suspended|deactivated
    is_root_admin BOOLEAN DEFAULT FALSE,
    password_reset_required BOOLEAN DEFAULT FALSE,
    temporary_password TEXT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.3 Session Management

**Session Creation (Login):**
```typescript
// src/app/api/auth/login/route.ts:173-190
const sessionToken = require('crypto').randomBytes(32).toString('hex');
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

await supabase.from('auth_sessions').insert({
  user_id: user.id,
  session_token: sessionToken,
  expires_at: expiresAt.toISOString(),
  ip_address: request.headers.get('x-forwarded-for'),
  user_agent: request.headers.get('user-agent'),
  is_active: true
});
```

**Session Cookie:**
```typescript
// src/app/api/auth/login/route.ts:253-259
response.cookies.set('session_token', sessionToken, {
  httpOnly: true,          // Not accessible via JavaScript
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  expires: expiresAt,
  path: '/'
});
```

### 5.4 Permission System

**Permission Format:** `{module}.{resource}.{action}`

Example: `masterData.machineMaster.read`

**9 Modules:**
1. `masterData` - Machine, Mold, Raw Materials, Packing Materials, Line, BOM, Commercial, Others
2. `storePurchase` - Material Indent, Purchase Order, Open Indent, History
3. `storeInward` - Normal GRN, JW Annexure GRN, History
4. `storeOutward` - MIS, Job Work Challan, Delivery Challan, History
5. `storeSales` - Dispatch Memo, Order Book, History
6. `productionPlanner` - Production Planner, Line Scheduling
7. `production` - DPR, Mold Loading, Silo Management, FG Transfer
8. `quality` - Inspections, Standards, Analytics, Weight Report, First Pieces, CAP, R&D
9. `maintenance` - Preventive, Machine Breakdown, Mold Breakdown, History, Readings, Report

**5 Actions:** `read`, `create`, `update`, `delete`, `approve`

**Client-Side Permission Check:**
```typescript
// src/lib/useAccessControl.ts:195-217
const canPerformAction = (action: string, resource: string): boolean => {
  if (!user) return false;
  if (user.isRootAdmin) return true;  // Root admin bypasses all checks
  
  const permissions = user.permissions || {};
  const moduleKey = MODULE_KEY_MAP[resource] || '';
  const resourceKey = RESOURCE_KEY_MAP[resource] || resource;
  const actionKey = ACTION_MAP[action.toLowerCase()] || action.toLowerCase();
  
  const permissionName = `${moduleKey}.${resourceKey}.${actionKey}`;
  return permissions[permissionName] === true;
};
```

---

## 6. Database Model by Module

### 6.1 Master Data Module

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `machines` | Production machines | machine_id (PK), make, model, capacity_tons, category, status, line, unit |
| `molds` | Injection molds | mold_id (PK), mold_name, cavities, cycle_time, compatible_machines[] |
| `raw_materials` | Raw material inventory | id (UUID), category, type, grade, supplier, mfi, density |
| `packing_materials` | Packing materials | id (UUID), category, type, item_code, dimensions, cbm |
| `lines` | Production lines | line_id (PK), im_machine_id, robot_machine_id, status, unit |
| `units` | Factory units | id (UUID), name, location, status |
| `sfg_bom_master` | SFG Bill of Materials | id, sfg_code, item_name, colour, material percentages |
| `fg_bom_master` | FG Bill of Materials | id, item_code, party_name, sfg references |
| `local_bom_master` | Local BOM | id, item_code, pack_size, component references |
| `color_label_master` | Color labels | id, sr_no, color_label |
| `party_name_master` | Party/customer names | id, name, code, gstin |

### 6.2 Store Purchase Module

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `material_indent_slips` | Indent requests | id, ident_no, date, party_name, status |
| `material_indent_slip_items` | Indent line items | id, indent_slip_id (FK), sr_no, item_code, qty |
| `purchase_orders` | POs | id, po_no, party_name, total_amt, po_type |
| `purchase_order_items` | PO line items | id, purchase_order_id (FK), description, qty, rate |
| `vendor_registrations` | Vendor master | id, customer_name, gst_no, bank details |

### 6.3 Store Inward Module

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `store_grn` | Goods Received Notes | id, grn_no, po_no, invoice_no, supplier_name |
| `store_grn_items` | GRN line items | id, grn_id (FK), item_description, grn_qty |
| `jw_annexure_grn` | Job Work GRN | id, jw_no, challan_no, party_name |
| `jw_annexure_grn_items` | JW GRN items | id, jw_annexure_grn_id (FK), item_code, rcd_qty |

### 6.4 Store Outward Module

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `store_mis` | Material Issue Slips | id, issue_no, dept_name, date |
| `store_mis_items` | MIS line items | id, mis_id (FK), description_of_material, issue_qty |
| `store_fgn` | FG Transfer Notes | id, transfer_no, from_dept, to_dept |
| `store_fgn_items` | FGN line items | id, fgn_id (FK), item_name, total_qty |
| `job_work_challans` | JW Challans | id, challan_no, party_name, vehicle_no |
| `delivery_challans` | Delivery Challans | id, dc_no, party_name, vehicle_no |

### 6.5 Store Sales Module

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `dispatch_memos` | Dispatch memos | id, memo_no, party_name, location |
| `dispatch_memo_items` | Memo line items | id, memo_id (FK), item_name, no_box |
| `order_books` | Customer orders | id, po_number, customer_name, status |
| `order_book_items` | Order line items | id, order_book_id (FK), part_code, quantity |

### 6.6 Production Module

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `schedule_jobs` | Production schedules | schedule_id (PK), date, shift, machine_id, mold_id |
| `daily_weight_report` | Weight reports | id, date, line_id, shift, weights |
| `first_pieces_approval_report` | First piece QC | id, date, line_id, mold_id, status |
| `mould_loading_unloading` | Mould changes | id, line_id, mold_id, operation_type |
| `silos` | Silo definitions | id, silo_number, silo_name, capacity_kg |
| `silo_inventory` | Silo stock levels | id, silo_id (FK), material_id, current_quantity |
| `silo_grinding_records` | Grinding records | id, line_id, grinding_qty, date |

### 6.7 Quality Module

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `quality_inspections` | QC inspections | id, inspection_type, status, findings |
| `quality_standards` | Quality parameters | id, parameter_name, min_value, max_value |
| `corrective_action_plans` | CAP records | id, problem_description, root_cause, actions |
| `rnd_records` | R&D trials | id, trial_name, parameters, results |

### 6.8 Maintenance Module

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `breakdown_maintenance_tasks` | Machine breakdowns | id, machine_id, breakdown_type, failure_reason, status |
| `mold_breakdown_maintenance_tasks` | Mold breakdowns | id, mold_id, failure checkboxes, status |
| `preventive_maintenance_tasks` | PM tasks | id, machine_id, maintenance_type, due_date |
| `preventive_maintenance_schedules` | PM schedules | id, schedule_type, frequency_value, machine_id |
| `maintenance_checklists` | Checklists | id, name, checklist_type, items (JSONB) |
| `daily_readings` | Equipment readings | id, machine_id, reading_type, value |

### 6.9 Entity Relationships Diagram (Simplified)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   units     │────►│  machines   │────►│   lines     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                           │                    │
                           │                    ▼
                    ┌──────▼──────┐     ┌─────────────┐
                    │schedule_jobs│◄────│    molds    │
                    └─────────────┘     └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐   ┌───────────────┐  ┌─────────────┐
│daily_weight │   │first_pieces   │  │silo_grinding│
│  _report    │   │_approval      │  │  _records   │
└─────────────┘   └───────────────┘  └─────────────┘
```

---

## 7. RLS & Security

### 7.1 RLS Status by Table Category

**Auth Tables (`auth_system` schema) - Strict RLS:**
```sql
-- All auth tables have RLS enabled
-- Policies based on session context via set_session_context(token)

-- Root admin full access
CREATE POLICY "root_admin_users_access" ON auth_system.auth_users
    FOR ALL USING (auth_system.is_current_user_root_admin() = true);

-- Users can only see/update own profile
CREATE POLICY "users_own_profile_select" ON auth_system.auth_users
    FOR SELECT USING (id = auth_system.current_user_id());
```

**Business Tables (public schema) - Currently Permissive:**
```sql
-- Most business tables use this pattern:
CREATE POLICY "Allow all for authenticated users" ON machines
    FOR ALL USING (auth.role() = 'authenticated');
```

### 7.2 RLS Patterns in Use

| Pattern | Tables | Security Level |
|---------|--------|----------------|
| **Session-Context RLS** | auth_users, auth_sessions, auth_audit_logs | High - Uses `set_session_context(token)` |
| **Admin-Only RLS** | auth_resources, auth_roles, auth_permissions | High - Only root admin |
| **Authenticated-Only** | machines, molds, store_grn, etc. | Medium - Any logged-in user |
| **Service Role Bypass** | All tables via API routes | N/A - Used for admin ops |

### 7.3 Security Headers (`src/middleware.ts`)

```typescript
// Applied to all routes
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-XSS-Protection', '1; mode=block');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

// HTTPS only
response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

// Content Security Policy
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'"
].join('; ');
```

### 7.4 Rate Limiting (`src/lib/rate-limit.ts`)

```typescript
// Login endpoint protection
checkRateLimit(request, {
  maxAttempts: 5,           // 5 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
  blockDurationMs: 60 * 60 * 1000  // 1 hour block after exceeded
});
```

### 7.5 Account Lockout (`src/app/api/auth/login/route.ts:142-149`)

```typescript
// After 5 failed attempts
if (newFailedAttempts >= 5) {
  updates.account_locked_until = new Date(
    Date.now() + 30 * 60 * 1000  // 30 minutes
  ).toISOString();
}
```

---

## 8. Operational Playbooks

### 8.1 Environment Switching (Personal ↔ Company Supabase)

**Current Setup:**
- Environment variables stored in `.env.local` (gitignored)
- No built-in toggle mechanism

**Recommended Approach:**

1. **Create separate env files:**
```bash
# Personal development
.env.local.personal
  NEXT_PUBLIC_SUPABASE_URL=https://personal-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
  SUPABASE_SERVICE_ROLE_KEY=xxx

# Company production
.env.local.company
  NEXT_PUBLIC_SUPABASE_URL=https://company-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=yyy
  SUPABASE_SERVICE_ROLE_KEY=yyy
```

2. **Switch script (`package.json`):**
```json
{
  "scripts": {
    "use:personal": "cp .env.local.personal .env.local && echo 'Switched to PERSONAL'",
    "use:company": "cp .env.local.company .env.local && echo 'Switched to COMPANY'"
  }
}
```

3. **Verification after switch:**
```bash
npm run dev
# Check console for "✅ Connected to: xxx.supabase.co"
```

**⚠️ HARD RULE:** Never commit `.env.local*` files. Add to `.gitignore`:
```gitignore
.env.local
.env.local.*
```

### 8.2 Supabase Project Transfer (Org Transfer)

**When to Use:** Moving project ownership from personal to company org.

**What Changes:**
| Item | Changes? |
|------|----------|
| Project URL | ❌ No - Stays same |
| Anon Key | ❌ No - Stays same |
| Service Role Key | ❌ No - Stays same |
| Database Content | ❌ No - Preserved |
| Billing | ✅ Yes - New org pays |

**Steps:**
1. Go to Supabase Dashboard → Project Settings → General
2. Click "Transfer Project"
3. Select destination organization
4. Confirm transfer

**Post-Transfer Checklist:**
- [ ] Verify app still connects (keys unchanged)
- [ ] Check billing is on correct org
- [ ] Update team access in new org

### 8.3 Manual Migration (pg_dump/psql)

**When to Use:** 
- Cloning to new project (different keys)
- Backup/restore scenarios
- Schema-only migrations

**Step 1: Export Schema + Data**
```bash
# Full backup (schema + data)
pg_dump "postgres://postgres:[PASSWORD]@db.[OLD-PROJECT-REF].supabase.co:5432/postgres" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  > backup_full.sql

# Schema only (for fresh setup)
pg_dump "postgres://postgres:[PASSWORD]@db.[OLD-PROJECT-REF].supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  > backup_schema.sql

# Data only (for incremental sync)
pg_dump "postgres://postgres:[PASSWORD]@db.[OLD-PROJECT-REF].supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  > backup_data.sql
```

**Step 2: Import to New Project**
```bash
# Create new Supabase project first, then:
psql "postgres://postgres:[NEW-PASSWORD]@db.[NEW-PROJECT-REF].supabase.co:5432/postgres" \
  < backup_full.sql
```

**Step 3: Update Environment**
```bash
# Update .env.local with new keys
NEXT_PUBLIC_SUPABASE_URL=https://[NEW-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[NEW-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[NEW-SERVICE-ROLE-KEY]
```

**Step 4: Verify**
```sql
-- Run in new Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema IN ('public', 'auth_system');

-- Check row counts
SELECT 'auth_users' as table_name, COUNT(*) FROM auth_system.auth_users
UNION ALL
SELECT 'machines', COUNT(*) FROM machines
UNION ALL
SELECT 'molds', COUNT(*) FROM molds;
```

**Step 5: Reset Root Admin Password**
```sql
-- Run setup page to set new password, or:
UPDATE auth_system.auth_users 
SET password_hash = '$2a$12$[NEW-BCRYPT-HASH]',
    password_reset_required = true
WHERE is_root_admin = true;
```

### 8.4 Rollback Strategy

**Scenario:** Migration failed, need to restore

1. **Keep source database unchanged during migration**
2. **If import fails:**
   ```bash
   # Just update .env.local back to old project
   NEXT_PUBLIC_SUPABASE_URL=https://[OLD-PROJECT-REF].supabase.co
   ```
3. **If need to restore from backup:**
   ```bash
   # Drop and recreate
   psql [CONNECTION_STRING] -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   psql [CONNECTION_STRING] < backup_full.sql
   ```

---

## 9. Known Risks & Hard Rules

### 9.1 Critical Risks

| Risk | Severity | Description | Mitigation |
|------|----------|-------------|------------|
| **R1: Permissive RLS on Business Tables** | 🔴 HIGH | `auth.role() = 'authenticated'` allows any logged-in user full CRUD | Implement granular RLS using `check_user_permission()` |
| **R2: Service Role Key Exposure** | 🔴 HIGH | If leaked, attacker bypasses all RLS | Ensure NEVER prefixed with `NEXT_PUBLIC_`; audit imports |
| **R3: Session Token in LocalStorage** | 🟡 MEDIUM | Currently uses httpOnly cookie (good), but logout clears localStorage | Session is secure; localStorage is for preferences only |
| **R4: No CSRF Protection** | 🟡 MEDIUM | API routes don't verify CSRF tokens | Add CSRF middleware for state-changing operations |
| **R5: Rate Limit is In-Memory** | 🟡 MEDIUM | `src/lib/rate-limit.ts` uses in-process Map | Add Redis/external store for distributed deployments |

### 9.2 Hard Rules (Non-Negotiable)

1. **NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to client**
   ```typescript
   // ❌ WRONG - Will be bundled to client
   // src/lib/supabase.ts
   const supabase = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
   
   // ✅ CORRECT - Only in API routes
   // src/app/api/*/route.ts
   const supabase = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
   ```

2. **NEVER disable RLS in production**
   ```sql
   -- ❌ WRONG
   ALTER TABLE machines DISABLE ROW LEVEL SECURITY;
   
   -- ✅ CORRECT - Create proper policies instead
   CREATE POLICY "..." ON machines FOR SELECT USING (...);
   ```

3. **ALWAYS verify session in API routes that modify data**
   ```typescript
   // src/app/api/*/route.ts
   import { verifySession } from '@/lib/auth-utils';
   
   export async function POST(request: NextRequest) {
     const session = await verifySession(request);
     if (!session) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }
     // ... proceed
   }
   ```

4. **ALWAYS use parameterized queries**
   ```typescript
   // ❌ WRONG - SQL injection risk
   supabase.from('users').select('*').filter('name', 'eq', userInput);
   
   // ✅ CORRECT - Supabase client handles escaping
   supabase.from('users').select('*').eq('name', userInput);
   ```

5. **NEVER log sensitive data**
   ```typescript
   // ❌ WRONG
   console.log('Login attempt:', { username, password });
   
   // ✅ CORRECT
   console.log('Login attempt:', { username, passwordProvided: !!password });
   ```

---

## 10. Actionable Checklist

### Pre-Production Security Checklist

- [ ] **ENV-01:** Verify `.env.local` is in `.gitignore`
- [ ] **ENV-02:** Confirm `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix
- [ ] **ENV-03:** Update `next.config.ts` CORS origins for production domain
- [ ] **AUTH-01:** Test login rate limiting works (5 attempts → block)
- [ ] **AUTH-02:** Test account lockout works (5 failed → 30 min lock)
- [ ] **AUTH-03:** Verify session expires after 30 days
- [ ] **RLS-01:** Enable stricter RLS on business tables (see R1)
- [ ] **RLS-02:** Remove any `FOR ALL USING (true)` policies
- [ ] **RLS-03:** Verify `set_session_context()` is called before queries that need it
- [ ] **SEC-01:** Run `npm audit` and fix vulnerabilities
- [ ] **SEC-02:** Enable HSTS in production (already in middleware)
- [ ] **SEC-03:** Set secure cookies (already done, verify in production)

### Migration Checklist

- [ ] **MIG-01:** Take pg_dump backup before any migration
- [ ] **MIG-02:** Test migration in staging first
- [ ] **MIG-03:** Verify row counts match after migration
- [ ] **MIG-04:** Test login with root admin after migration
- [ ] **MIG-05:** Reset root admin password via `/setup` page
- [ ] **MIG-06:** Update all environment variables to new project
- [ ] **MIG-07:** Test all modules work (machines, molds, schedules)

### Recommended Immediate Actions (Priority Order)

1. **HIGH:** Implement granular RLS policies on business tables
   - Replace `auth.role() = 'authenticated'` with `check_user_permission()`
   - See `supabase/migrations/20250129000033_add_rls_security.sql` for pattern

2. **HIGH:** Add CSRF protection to state-changing API routes
   - Use `src/lib/csrf.ts` (already exists, needs implementation)

3. **MEDIUM:** Externalize rate limiting to Redis
   - Current in-memory won't work with multiple instances

4. **MEDIUM:** Add audit logging to all sensitive operations
   - Use existing `log_audit_action()` function more widely

5. **LOW:** Create `.env.example` file for documentation
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

---

## Appendix A: SQL Quick Reference

### Check All Tables
```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema IN ('public', 'auth_system')
ORDER BY table_schema, table_name;
```

### Check RLS Status
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname IN ('public', 'auth_system')
ORDER BY schemaname, tablename;
```

### View All Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname IN ('public', 'auth_system')
ORDER BY schemaname, tablename;
```

### Reset Root Admin Password
```sql
-- First, hash the new password with bcrypt (12 rounds) externally
-- Then update:
UPDATE auth_system.auth_users 
SET password_hash = '$2a$12$[BCRYPT_HASH]',
    password_reset_required = false,
    failed_login_attempts = 0,
    account_locked_until = NULL
WHERE is_root_admin = true;
```

### Clear All Sessions (Force Logout)
```sql
UPDATE auth_system.auth_sessions 
SET is_active = false 
WHERE is_active = true;
```

---

## Appendix B: File Cross-Reference

| Operation | Client File | Server File | Database |
|-----------|-------------|-------------|----------|
| Login | `LoginForm.tsx` | `api/auth/login/route.ts` | `auth_sessions` |
| Logout | `AuthProvider.tsx` | `api/auth/logout/route.ts` | `auth_sessions` |
| Fetch Machines | `supabase.ts` (machineAPI) | Direct to Supabase | `machines` |
| Admin: Create User | `AdminDashboard.tsx` | `api/admin/users/route.ts` | `auth_users` |
| Admin: Set Permissions | `FieldLevelPermissionEditor.tsx` | `api/admin/permissions/route.ts` | `auth_user_permissions` |

---

*Document generated from codebase analysis. Review and update as system evolves.*

