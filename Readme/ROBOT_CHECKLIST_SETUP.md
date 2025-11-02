# Robot Checklist Setup Guide

## Quick Setup Steps

### 1. Start Docker Desktop
- Open Docker Desktop application on your Mac
- Wait for it to fully start (green status indicator)

### 2. Apply Database Migrations
Run these commands in your terminal:

```bash
# Navigate to your project directory
cd /Users/chiragdeora/Developer/production-scheduler

# Start Supabase services
npx supabase start

# Apply the maintenance table migrations
npx supabase db push
```

### 3. Upload Robot Checklist Data
1. Go to **Maintenance Management** → **Preventive Maintenance** → **Checklists** tab
2. Click **"Upload Excel"** button
3. Use the `robot_checklist_template.xlsx` file or create your own Excel file with the format:
   - Line ID, Machine ID, Checklist Name, Checklist Type, Item ID, Task Description, Frequency, Estimated Duration (min), Priority, Category, Unit

### 4. Test the Functionality
1. After uploading, you should see your production lines in the grid
2. Click on any line to expand and see machines
3. Click **"Execute Checklist"** on any robot to open the checklist executor
4. Complete the maintenance tasks and save progress

## Troubleshooting

### If you see "No Maintenance Checklists Found":
- Make sure Docker Desktop is running
- Run `npx supabase db push` to apply migrations
- Check browser console for any error messages

### If the Excel upload fails:
- Make sure your Excel file has the correct column headers
- Check that Line ID and Machine ID match your existing data
- Verify the file is saved as .xlsx format

### If you can't see the Checklists tab:
- Make sure you're in **Maintenance Management** → **Preventive Maintenance**
- The Checklists tab should be visible in the tab navigation

## Sample Data
Use the `sample_robot_checklist_data.csv` file as a reference for the correct format.

## Features Available
- ✅ Grid view of all production lines
- ✅ Expandable line cards showing machines
- ✅ Robot checklist execution with progress tracking
- ✅ Excel upload for bulk checklist creation
- ✅ Real-time progress tracking
- ✅ Remarks and status management
- ✅ User tracking and timestamps

## Need Help?
If you're still having issues, check:
1. Docker Desktop is running
2. Supabase services are started (`npx supabase status`)
3. Database migrations are applied (`npx supabase db push`)
4. Browser console for any JavaScript errors
