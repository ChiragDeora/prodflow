# Fix Scripts

This directory contains SQL scripts for fixing database issues and applying corrections.

## 📋 Files

- **fix_*.sql** - Database fix scripts
- **correct_*.sql** - Data correction scripts
- **replace_*.sql** - Column replacement scripts
- **simple_*.sql** - Simple fix scripts

## 🚀 Usage

Run these scripts to fix specific database issues:

```bash
# Connect to database
psql -U postgres -d postgres

# Run fix scripts
\i fixes/fix_specific_issue.sql
\i fixes/correct_data.sql
```

## ⚠️ Important Notes

- **Always backup before running fix scripts**
- Some fixes may be destructive
- Test in development environment first
- Run fixes in the correct order if multiple fixes are needed
