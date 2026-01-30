# SQLite Data Export Summary

## Export Details
- **Timestamp**: 2026-01-29T17:06:18.290Z
- **Export Version**: 1.0
- **Source Database**: `/Users/filipe/workspace/lotion/prisma/dev.db`
- **Output File**: `/Users/filipe/workspace/lotion/scripts/data-export.json`

## Data Exported

| Table             | Records | Description                                      |
|-------------------|---------|--------------------------------------------------|
| Users             | 8       | Team members (all MEMBER role)                   |
| Buckets           | 7       | Task categories with icons and colors            |
| Task Definitions  | 47      | Task templates within buckets                    |
| Daily Logs        | 2       | Date-specific log entries                        |
| Assignments       | 7       | User assignments to buckets for specific dates   |
| Task Progress     | 0       | Task completion tracking (currently empty)       |

## Sample Data

### Users
- Marilia (MEMBER)
- Oleksandra (MEMBER)
- Valentina (MEMBER)
- Candice (MEMBER)
- Lorna (MEMBER)
- Mica (MEMBER)
- Leslie (MEMBER)
- Sakura (MEMBER)

### Buckets
- Emails 📧 (Headphones icon, blue)
- Fun bucket 🎈 (Megaphone icon)
- Payments 💰 (UserPlus icon)
- Plus 4 more buckets

### Task Definitions
47 tasks distributed across the 7 buckets

### Daily Logs
- 2026-01-28
- 1 more date

### Assignments
7 assignments linking users to buckets for specific dates

## Data Integrity

All records include:
- ✅ Unique IDs preserved
- ✅ Relationships maintained (foreign keys)
- ✅ Timestamps preserved
- ✅ All fields exported (including nullable fields)

## Next Steps

This data is ready to be imported into PostgreSQL in Step 4 of the migration plan.
The export preserves all IDs and relationships, ensuring data integrity during migration.

## File Size
- JSON file: 13KB
- 452 lines (formatted with 2-space indentation)
