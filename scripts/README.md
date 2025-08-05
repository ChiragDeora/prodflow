# Database Scripts

This directory contains SQL scripts for database management and setup.

## Scripts

### `setup_fresh_database.sql`
**Purpose**: Complete database reset and setup with comprehensive machine master structure
**What it does**:
- Purges all data from machines, molds, schedule_jobs, and raw_materials tables
- Adds new comprehensive machine fields (category, serial_no, dimensions)
- Creates performance indexes
- Verifies the setup

**Usage**: Run in Supabase SQL Editor to reset database and apply new machine master structure

### `purge_tables.sql`
**Purpose**: Clear all data from master tables
**What it does**:
- Deletes all records from machines, molds, schedule_jobs, and raw_materials
- Verifies tables are empty
- Shows table structure

**Usage**: Run when you want to start fresh with empty tables

### `apply_machine_fields.sql`
**Purpose**: Add comprehensive machine master fields to existing database
**What it does**:
- Adds category, serial_no, and dimensions columns to machines table
- Updates existing data with category mapping
- Creates performance indexes
- Shows sample data structure

**Usage**: Run to upgrade existing database with new machine fields

## When to Use Each Script

1. **First time setup or complete reset**: Use `setup_fresh_database.sql`
2. **Just clear data**: Use `purge_tables.sql`
3. **Upgrade existing database**: Use `apply_machine_fields.sql`

## Running Scripts

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the script content
4. Click Run to execute

## Notes

- All scripts use `IF NOT EXISTS` clauses for safety
- Scripts can be run multiple times without issues
- The comprehensive machine master structure supports:
  - Categories (IM, Robot, Aux, Utility)
  - Smart serial number parsing (CLM/Inj format)
  - Dimensions (LxBxH format)
  - All additional Excel fields 