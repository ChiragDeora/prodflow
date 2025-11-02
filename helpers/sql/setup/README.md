# Setup Scripts

This directory contains SQL scripts for initial database setup and table creation.

## 📋 Files

- **create_*.sql** - Table creation scripts
- **add_*.sql** - Column addition scripts
- **intelligent_mapping_functions.sql** - Database functions for intelligent mapping
- **line_master_*.sql** - Line master table setup and management
- **simplified_user_system.sql** - User system setup scripts

## 🚀 Usage

Run these scripts in order for initial database setup:

```bash
# Connect to database
psql -U postgres -d postgres

# Run setup scripts
\i setup/create_tables.sql
\i setup/add_columns.sql
\i setup/intelligent_mapping_functions.sql
```

## ⚠️ Important Notes

- Run these scripts only for initial setup
- Backup existing data before running
- Some scripts may modify existing tables
