# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a comprehensive Production Scheduler ERP system built with Next.js 15, TypeScript, Supabase, and Tailwind CSS. The system manages manufacturing equipment, molds, raw materials, packing materials, production lines, and scheduling workflows with role-based authentication.

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Docker Development (Recommended)
```bash
# Start development environment with hot reload
cd helpers/docker && ./docker-setup.sh dev

# Start production environment with nginx
cd helpers/docker && ./docker-setup.sh prod

# View development logs
cd helpers/docker && ./docker-setup.sh logs dev

# Stop all containers
cd helpers/docker && ./docker-setup.sh stop

# Check container status
cd helpers/docker && ./docker-setup.sh status

# Clean up all Docker resources (use with caution)
cd helpers/docker && ./docker-setup.sh cleanup
```

### Database Management
```bash
# Run specific SQL script
psql -U postgres -d postgres -f helpers/sql/script_name.sql

# Connect to database locally
docker exec -it production-scheduler-supabase-1 psql -U postgres -d postgres

# Apply database migrations
# Migration files are in supabase/migrations/ - use Supabase CLI or copy/paste into SQL editor
```

### Testing Commands
```bash
# Run single test (create tests in __tests__ or *.test.tsx files)
npm test -- --testNamePattern="test name"

# Note: Test framework not currently configured, would need to add jest/vitest
```

## Architecture Overview

### High-Level Architecture
- **Frontend**: Next.js 15 with App Router, TypeScript, and Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time + Edge Functions)  
- **State Management**: React hooks with local state and Supabase real-time subscriptions
- **Authentication**: Supabase Auth with custom role-based access control
- **File Handling**: Excel import/export with XLSX library
- **Deployment**: Docker containers with nginx reverse proxy

### Key Architectural Components

#### 1. Database Layer (`src/lib/supabase.ts`)
- Centralized Supabase client configuration
- TypeScript interfaces for all database entities (Machine, Mold, ScheduleJob, etc.)
- CRUD API functions for each entity type (machineAPI, moldAPI, scheduleAPI, etc.)
- Custom sorting and filtering logic
- Comprehensive error handling with `handleSupabaseError`

#### 2. Authentication System (`src/components/auth/`)
- `SimpleAuthProvider.tsx` - Custom auth context provider
- `RouteGuard.tsx` - Component-level access control
- `SessionWarning.tsx` - Session timeout management
- Role-based permissions (Admin, Operator, User)

#### 3. Main Application (`src/components/ProductionSchedulerERP.tsx`)
- Central component managing all modules and state
- Module-based navigation system
- Modal management for CRUD operations
- Excel import/export functionality integration

#### 4. Module System (`src/components/modules/`)
- Modular architecture for different ERP functions
- Dynamic module loading with `moduleRegistry.tsx`
- Scalable module registration system

#### 5. Master Data Management
- **Machine Master**: Equipment tracking with categories (IM, Robot, Aux, Utility)
- **Mold Master**: Mold specifications with drawing attachments
- **Raw Materials Master**: Material categories, types, grades, and suppliers
- **Packing Materials Master**: Packaging specifications with CBM calculations
- **Line Master**: Production line configurations with machine assignments

### Database Schema Structure

#### Core Tables
- `machines` - Equipment master data with categories, serial numbers, dimensions
- `molds` - Mold specifications, drawings, cycle times, weights
- `schedule_jobs` - Production scheduling with approval workflows
- `raw_materials` - Material master with technical specifications
- `packing_materials` - Packaging materials with artwork and CBM data
- `lines` - Production line configurations linking machines
- `units` - Factory unit management
- `user_profiles` - User management with role-based access

#### Key Relationships
- Lines → Machines (IM, Robot, Conveyor, Hoist assignments)
- Schedule Jobs → Machines + Molds
- All entities support unit-based filtering for multi-factory operations

### Excel Import/Export System (`src/components/ExcelFileReader.tsx`)
- Template-based import with column mapping
- Data validation and preview before import
- Bulk operations for all master data types
- Support for image attachments (nameplate images, drawings, artwork)

### Docker Architecture (`helpers/docker/`)
- **Development**: Hot-reload Next.js server with local PostgreSQL and Redis
- **Production**: Optimized build with nginx reverse proxy and production database
- **Management**: Single script (`docker-setup.sh`) for all operations

## Common Development Patterns

### Adding New Master Data Entity
1. Define TypeScript interface in `src/lib/supabase.ts`
2. Create CRUD API functions following existing patterns
3. Add database migration in `supabase/migrations/`
4. Create/update React components for UI
5. Add Excel import/export support in `ExcelFileReader.tsx`

### Database Operations Pattern
```typescript
// Always use the centralized API functions
const machines = await machineAPI.getAll();
const newMachine = await machineAPI.create(machineData);
const updatedMachine = await machineAPI.update(machineId, updates);
```

### Error Handling Pattern
```typescript
try {
  const result = await someAPI.operation();
  // handle success
} catch (error) {
  handleSupabaseError(error, 'operation description');
  // handle error state
}
```

### Component State Management
- Use React hooks for local component state
- Leverage Supabase real-time subscriptions for live data
- Maintain loading states for better UX
- Use unit filtering context for multi-factory support

## Development Notes

### Environment Setup
- Requires Supabase project with proper environment variables
- Database needs RLS policies configured for role-based access
- Edge Functions deployed for rate limiting and domain protection

### Key Files for Development
- `src/lib/supabase.ts` - Database operations and types
- `src/components/ProductionSchedulerERP.tsx` - Main application logic
- `helpers/docker/docker-setup.sh` - Docker operations
- `supabase/migrations/` - Database schema changes

### SQL Script Management
- Use `helpers/sql/` directory for database operations
- Follow naming conventions: `create_*.sql`, `fix_*.sql`, `add_*.sql`
- Test scripts in development before production use

### Deployment Considerations
- Docker-based deployment with multi-stage builds
- Nginx reverse proxy configuration
- Environment variable management through Docker
- Database migrations through Supabase CLI

## Security Implementation
- Row-level security (RLS) policies in Supabase
- Role-based authentication with user_profiles table
- Rate limiting through Edge Functions
- Domain protection for authentication endpoints
- Session timeout management with warnings
