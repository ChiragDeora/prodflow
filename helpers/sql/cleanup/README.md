# Cleanup Scripts

This directory contains SQL scripts for cleaning up data and removing unwanted content.

## 📋 Files

- **drop_*.sql** - Table and data removal scripts
- **delete_*.sql** - Data deletion scripts
- **purge_*.sql** - Data purging scripts
- **clean_*.sql** - Data cleaning scripts
- **remove_*.sql** - Constraint removal scripts

## 🚀 Usage

**⚠️ WARNING: These scripts are destructive! Always backup first.**

```bash
# Connect to database
psql -U postgres -d postgres

# Run cleanup scripts (BE CAREFUL!)
\i cleanup/drop_unwanted_tables.sql
\i cleanup/purge_old_data.sql
```

## ⚠️ Safety Guidelines

1. **Always backup before running cleanup scripts**
2. **Test in development environment first**
3. **Review the script content before execution**
4. **Run with caution - these operations cannot be undone**

## 🔄 Recovery

If you need to recover from a cleanup operation:

```bash
# Restore from backup
psql -U postgres -d postgres < backup_file.sql

# Or run setup scripts again
\i setup/create_tables.sql
```

## 📝 Best Practices

- Document what each cleanup script does
- Keep backups before running any cleanup
- Test cleanup scripts on sample data first
- Consider using transactions for reversible operations
