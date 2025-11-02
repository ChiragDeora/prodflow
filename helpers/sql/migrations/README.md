# Migration Scripts

This directory contains SQL scripts for database schema migrations and updates.

## 📋 Files

- **migration_*.sql** - Database migration scripts
- Schema update scripts
- Version-specific migrations

## 🚀 Usage

Run migrations in order to update database schema:

```bash
# Connect to database
psql -U postgres -d postgres

# Run migrations in order
\i migrations/migration_001.sql
\i migrations/migration_002.sql
\i migrations/migration_003.sql
```

## 📊 Migration Order

Always run migrations in the correct order:

1. **Schema Changes** - Table structure modifications
2. **Data Migrations** - Data transformations
3. **Index Updates** - Performance optimizations
4. **Constraint Updates** - Foreign key and constraint changes

## ⚠️ Important Notes

- **Always backup before running migrations**
- Run migrations in development first
- Test data integrity after migrations
- Keep track of migration versions
- Some migrations may be irreversible

## 🔄 Rollback

If you need to rollback a migration:

```bash
# Check migration history
SELECT * FROM migration_log;

# Run rollback script if available
\i migrations/rollback_migration_001.sql
```

## 📝 Best Practices

- Use version numbers in migration filenames
- Document what each migration does
- Test migrations on sample data
- Keep migrations atomic and focused
- Maintain migration history table
