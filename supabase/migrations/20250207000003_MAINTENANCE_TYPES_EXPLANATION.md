# Maintenance Types - Breakdown vs Preventive

## Overview

This system uses **separate, dedicated tables** for Breakdown Maintenance and Preventive Maintenance to ensure clear separation and distinct functionality.

## Breakdown Maintenance

**Purpose:** Handle unplanned, urgent repairs and emergency situations

**Tables:**
- `breakdown_maintenance_tasks` - Main table for breakdown tasks
- `breakdown_maintenance_history` - Audit trail for breakdown actions

**Key Characteristics:**
- **Unplanned** - Tasks are created reactively when a breakdown occurs
- **Urgent** - Typically high or critical priority
- **Reactive** - Responds to equipment failures
- **Downtime tracking** - Records actual production downtime
- **Root cause analysis** - Tracks why the breakdown occurred
- **Corrective actions** - Documents what was done to fix it
- **Preventive measures** - Records how to prevent recurrence

**Key Fields:**
- `breakdown_type`: emergency, corrective, urgent_repair
- `failure_reason`: Why the breakdown occurred
- `failure_category`: mechanical, electrical, hydraulic, etc.
- `downtime_hours`: Actual production downtime
- `impact_on_production`: critical, high, medium, low
- `reported_by`: Who reported the breakdown
- `reported_at`: When it was reported
- `root_cause_analysis`: Analysis of root cause
- `corrective_action_taken`: What was done to fix it
- `preventive_measures`: How to prevent recurrence

**Use Cases:**
- Machine suddenly stops working
- Hydraulic system failure
- Electrical fault
- Emergency repairs
- Urgent corrective actions

## Preventive Maintenance

**Purpose:** Planned, scheduled maintenance to prevent breakdowns

**Tables:**
- `preventive_maintenance_tasks` - Main table for preventive tasks
- `preventive_maintenance_schedules` - Recurring schedule definitions
- `preventive_maintenance_history` - Audit trail for preventive actions

**Key Characteristics:**
- **Planned** - Tasks are scheduled in advance
- **Routine** - Regular maintenance activities
- **Proactive** - Prevents problems before they occur
- **Scheduled** - Based on time or usage intervals
- **Checklist-based** - Uses predefined checklists
- **Recurring** - Can repeat on a schedule

**Key Fields:**
- `maintenance_type`: scheduled, routine, inspection, calibration, lubrication, cleaning
- `schedule_frequency`: daily, weekly, monthly, quarterly, yearly
- `schedule_id`: Reference to the schedule that generated this task
- `scheduled_date`: Original scheduled date
- `next_due_date`: Next scheduled date for recurring tasks
- `checklist_items`: JSON array of checklist items
- `checklist_completed`: Whether all items are done
- `findings`: Issues found during maintenance
- `recommendations`: Future maintenance recommendations
- `is_recurring`: Whether task repeats
- `completion_count`: Number of times completed

**Use Cases:**
- Daily machine checks
- Weekly inspections
- Monthly calibrations
- Quarterly safety inspections
- Scheduled lubrication
- Routine cleaning

## Key Differences Summary

| Aspect | Breakdown Maintenance | Preventive Maintenance |
|--------|----------------------|----------------------|
| **Nature** | Reactive (unplanned) | Proactive (planned) |
| **Priority** | Typically High/Critical | Typically Medium/Low |
| **Timing** | Immediate/Urgent | Scheduled in advance |
| **Purpose** | Fix problems | Prevent problems |
| **Downtime** | Tracks actual downtime | Minimal/no downtime |
| **Root Cause** | Analyzes failure cause | Documents findings |
| **Recurrence** | One-time fixes | Can be recurring |
| **Checklist** | Optional | Standard practice |
| **Scheduling** | Ad-hoc | Based on schedules |

## Database Structure

### Breakdown Maintenance Tables
```
breakdown_maintenance_tasks
├── breakdown_type (emergency, corrective, urgent_repair)
├── failure_reason
├── failure_category
├── downtime_hours
├── impact_on_production
├── reported_by / reported_at
├── root_cause_analysis
├── corrective_action_taken
└── preventive_measures

breakdown_maintenance_history
└── Audit trail for breakdown actions
```

### Preventive Maintenance Tables
```
preventive_maintenance_tasks
├── maintenance_type (scheduled, routine, inspection, etc.)
├── schedule_frequency
├── schedule_id
├── scheduled_date
├── next_due_date
├── checklist_items
├── checklist_completed
├── findings
├── recommendations
├── is_recurring
└── completion_count

preventive_maintenance_schedules
├── schedule_type
├── frequency_value / frequency_unit
├── task_template
└── checklist_template

preventive_maintenance_history
└── Audit trail for preventive actions
```

## Migration Files

1. **20250207000001_create_breakdown_maintenance_tables.sql**
   - Creates breakdown maintenance tables
   - Includes breakdown-specific fields and functions

2. **20250207000002_create_preventive_maintenance_tables.sql**
   - Creates preventive maintenance tables
   - Includes preventive-specific fields and functions

3. **20250129000035_create_maintenance_tables.sql** (Original)
   - General maintenance_tasks table (legacy)
   - Can be used for other maintenance types if needed

## Usage Guidelines

- **Use Breakdown Maintenance** when:
  - Equipment fails unexpectedly
  - Emergency repairs are needed
  - Urgent corrective actions required
  - Tracking downtime is important

- **Use Preventive Maintenance** when:
  - Scheduled maintenance is due
  - Routine inspections are needed
  - Following a maintenance schedule
  - Performing planned maintenance activities

## Notes

- Both systems are completely separate with their own tables
- No data mixing between breakdown and preventive maintenance
- Each has its own history tracking
- Both support machine and line-based maintenance
- Both have proper indexing and RLS policies

