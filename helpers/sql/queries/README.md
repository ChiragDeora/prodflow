# Query Scripts

This directory contains utility SQL queries for data inspection and management.

## 📋 Files

- **check_*.sql** - Data verification queries
- **get_*.sql** - Data retrieval queries
- **test_*.sql** - Test queries
- **cross_*.sql** - Cross-reference queries
- **debug_*.sql** - Debugging queries
- **machine_queries*.sql** - Machine-related queries

## 🚀 Usage

Run these queries to inspect and analyze data:

```bash
# Connect to database
psql -U postgres -d postgres

# Run queries
\i queries/check_data.sql
\i queries/get_machine_info.sql
\i queries/test_functionality.sql
```

## 📊 Common Queries

### Data Verification
```sql
-- Check table structure
\i queries/check_machine_table_structure.sql

-- Verify data integrity
\i queries/cross_check_machine_master.sql
```

### Data Retrieval
```sql
-- Get machine information
\i queries/get_machine_headers.sql

-- Get robot machines
\i queries/get_robot_machines.sql
```

## 💡 Tips

- These queries are read-only and safe to run
- Use for debugging and data analysis
- Can be modified for specific needs
