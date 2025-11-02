# Maintenance Setup - Step by Step

## The Issue
The error `relation "maintenance_checklists" does not exist` occurs because the maintenance tables haven't been created yet. We need to apply the migrations in the correct order.

## Solution Steps

### Step 1: Start Docker Desktop
1. Open Docker Desktop application
2. Wait for it to fully start (green status)

### Step 2: Start Supabase Services
```bash
cd /Users/chiragdeora/Developer/production-scheduler
npx supabase start
```

### Step 3: Apply Main Maintenance Tables Migration
```bash
# Apply the main maintenance tables migration first
npx supabase db push --include-all
```

### Step 4: Verify Tables Were Created
```bash
# Check if maintenance tables exist
npx supabase db reset --db-url "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'maintenance_%';"
```

### Step 5: Test the Robot Checklist
1. Go to your application
2. Navigate to **Maintenance Management** → **Preventive Maintenance** → **Checklists**
3. You should now see the maintenance checklist interface

## Alternative: Manual Migration Application

If the above doesn't work, you can apply migrations manually:

### Option 1: Apply Individual Migrations
```bash
# Apply main maintenance tables
npx supabase db push --file supabase/migrations/20250129000035_create_maintenance_tables.sql

# Apply foreign key fixes
npx supabase db push --file supabase/migrations/20250129000036_fix_maintenance_foreign_keys.sql
```

### Option 2: Reset and Reapply All
```bash
# Reset database
npx supabase db reset

# Apply all migrations
npx supabase db push
```

## Expected Result

After successful setup, you should see:

1. **Maintenance tables created:**
   - `maintenance_tasks`
   - `maintenance_schedules` 
   - `maintenance_checklists`
   - `maintenance_history`

2. **Sample data inserted:**
   - Sample maintenance checklists
   - Sample maintenance tasks
   - Sample maintenance schedules

3. **Robot checklist interface working:**
   - Grid view of production lines
   - Expandable line cards
   - Robot checklist execution interface

## Troubleshooting

### If you still get "relation does not exist" error:
1. Check Docker is running: `docker ps`
2. Check Supabase status: `npx supabase status`
3. Verify migrations exist: `ls supabase/migrations/`
4. Try database reset: `npx supabase db reset`

### If the interface still doesn't show:
1. Check browser console for errors
2. Verify you're in the correct tab: Maintenance Management → Preventive Maintenance → Checklists
3. Check if lines and machines data exists in your database

## Next Steps After Setup

1. **Upload Robot Checklist Data:**
   - Use the `robot_checklist_template.xlsx` file
   - Or use the `sample_robot_checklist_data.csv` as reference

2. **Test Checklist Execution:**
   - Click on any production line
   - Click "Execute Checklist" on any robot
   - Complete the maintenance tasks

3. **Customize for Your Needs:**
   - Modify the checklist items
   - Add your own maintenance procedures
   - Set up automated scheduling
