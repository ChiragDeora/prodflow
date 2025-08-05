# Production Scheduler ERP Setup Guide

## Prerequisites

1. Node.js and npm installed
2. A Supabase account and project

## Setup Instructions

### 1. Install Dependencies
The required packages have already been installed:
- `xlsx` - For Excel file processing
- `file-saver` - For downloading Excel templates
- `@supabase/supabase-js` - Supabase client
- `@types/file-saver` - TypeScript definitions

### 2. Supabase Setup

#### Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and API keys

#### Create Database Tables
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the SQL to create tables and sample data

#### Configure Environment Variables
Create a `.env.local` file in the project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Replace the placeholders with your actual Supabase credentials:
- `your_supabase_project_url`: Found in Project Settings > API
- `your_supabase_anon_key`: Found in Project Settings > API
- `your_supabase_service_role_key`: Found in Project Settings > API (needed for admin operations)

### 3. Database Schema

The application uses three main tables:

#### Machines Table
- `machine_id` (Primary Key)
- `make`, `model`, `capacity_tons`, `type`
- `grinding_available`, `install_date`, `status`
- `zone`, `purchase_date`, `remarks`
- `nameplate_image` (optional)

#### Molds Table
- `mold_id` (Primary Key)
- `mold_name`, `maker`, `cavities`
- `purchase_date`, `compatible_machines` (array)

#### Schedule Jobs Table
- `schedule_id` (Primary Key)
- `date`, `shift`, `machine_id`, `mold_id`
- `start_time`, `end_time`, `color`
- `expected_pieces`, `stacks_per_box`, `pieces_per_stack`
- `created_by`, `is_done`, `approval_status`

### 4. Excel Import Feature

#### Supported Data Types
- **Machines**: Import machine master data
- **Molds**: Import mold master data
- **Schedules**: Import production schedules

#### Excel Template Format
Use the "Download Template" feature in the Excel import modal to get the correct column headers and format.

#### Column Mappings

**Machines Template:**
- Machine ID, Make, Model, Capacity (Tons), Type
- Grinding Available, Install Date, Status, Zone
- Purchase Date, Remarks, Nameplate Image

**Molds Template:**
- Mold ID, Mold Name, Maker, Cavities
- Purchase Date, Compatible Machines (comma-separated)

**Schedules Template:**
- Schedule ID, Date, Shift, Machine ID, Mold ID
- Start Time, End Time, Color, Expected Pieces
- Stacks per Box, Pieces per Stack, Created By
- Is Done, Approval Status

### 5. Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 6. Features

#### Main Modules
1. **Production Scheduler**: Visual timeline for job scheduling
2. **Master Data**: Manage machines and molds
3. **Approvals**: Review and approve completed jobs
4. **Operator Panel**: Mark jobs as complete
5. **Excel Import**: Bulk data import from Excel files

#### Excel Import Process
1. Click "Import Excel" in the sidebar
2. Select data type (machines, molds, or schedules)
3. Download the template for correct format
4. Upload your Excel file
5. Preview and verify data
6. Import to database

### 7. Database Operations

All CRUD operations are handled through the Supabase API:
- Real-time data synchronization
- Automatic timestamp management
- Foreign key constraints
- Row-level security policies

### 8. Troubleshooting

#### Common Issues
1. **Supabase Connection**: Verify environment variables
2. **Import Errors**: Check Excel file format against template
3. **Permission Errors**: Ensure proper RLS policies in Supabase

#### Development Mode
For development, you may need to disable RLS policies or add anonymous access policies in the Supabase SQL editor.

## Support

For issues or questions, check the console logs for detailed error messages. 