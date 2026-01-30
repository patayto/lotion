import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

interface User {
  id: string;
  name: string;
  role: string;
  createdAt: string;
}

interface Bucket {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string;
  order: number;
}

interface TaskDefinition {
  id: string;
  content: string;
  bucketId: string;
  order: number;
}

interface DailyLog {
  id: string;
  date: string;
  createdAt: string;
}

interface Assignment {
  id: string;
  dailyLogId: string;
  bucketId: string;
  userId: string | null;
}

interface TaskProgress {
  id: string;
  assignmentId: string;
  taskDefinitionId: string;
  status: string;
  completedAt: string | null;
  supportedByUserId: string | null;
}

interface ExportData {
  users: User[];
  buckets: Bucket[];
  taskDefinitions: TaskDefinition[];
  dailyLogs: DailyLog[];
  assignments: Assignment[];
  taskProgress: TaskProgress[];
  exportedAt: string;
  version: string;
}

async function exportData() {
  console.log('Starting SQLite data export...\n');

  // Path to SQLite database
  const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

  if (!fs.existsSync(dbPath)) {
    console.error(`Error: SQLite database not found at ${dbPath}`);
    process.exit(1);
  }

  console.log(`Reading database from: ${dbPath}\n`);

  // Open database connection
  const db = new Database(dbPath, { readonly: true });

  try {
    // Export all tables
    const users = db.prepare('SELECT * FROM User').all() as User[];
    const buckets = db.prepare('SELECT * FROM Bucket').all() as Bucket[];
    const taskDefinitions = db.prepare('SELECT * FROM TaskDefinition').all() as TaskDefinition[];
    const dailyLogs = db.prepare('SELECT * FROM DailyLog').all() as DailyLog[];
    const assignments = db.prepare('SELECT * FROM Assignment').all() as Assignment[];
    const taskProgress = db.prepare('SELECT * FROM TaskProgress').all() as TaskProgress[];

    // Create export object
    const exportData: ExportData = {
      users,
      buckets,
      taskDefinitions,
      dailyLogs,
      assignments,
      taskProgress,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    // Write to JSON file
    const outputPath = path.join(__dirname, 'data-export.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

    // Log summary
    console.log('Export completed successfully!\n');
    console.log('Summary:');
    console.log('========================================');
    console.log(`Users:            ${users.length}`);
    console.log(`Buckets:          ${buckets.length}`);
    console.log(`Task Definitions: ${taskDefinitions.length}`);
    console.log(`Daily Logs:       ${dailyLogs.length}`);
    console.log(`Assignments:      ${assignments.length}`);
    console.log(`Task Progress:    ${taskProgress.length}`);
    console.log('========================================');
    console.log(`\nData exported to: ${outputPath}`);
    console.log(`Export timestamp: ${exportData.exportedAt}\n`);

    // Show sample data
    if (users.length > 0) {
      console.log('Sample Users:');
      users.slice(0, 3).forEach(user => {
        console.log(`  - ${user.name} (${user.role})`);
      });
      console.log();
    }

    if (buckets.length > 0) {
      console.log('Sample Buckets:');
      buckets.slice(0, 3).forEach(bucket => {
        console.log(`  - ${bucket.title} (${bucket.icon || 'no icon'})`);
      });
      console.log();
    }

  } catch (error) {
    console.error('Error during export:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the export
exportData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
