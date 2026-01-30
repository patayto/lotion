import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExportedData {
  users: Array<{
    id: string;
    name: string;
    role: string;
    createdAt: number;
  }>;
  buckets: Array<{
    id: string;
    title: string;
    description: string | null;
    icon: string | null;
    color: string;
    order: number;
  }>;
  taskDefinitions: Array<{
    id: string;
    content: string;
    bucketId: string;
    order: number;
  }>;
  dailyLogs: Array<{
    id: string;
    date: string;
    createdAt: number;
  }>;
  assignments: Array<{
    id: string;
    dailyLogId: string;
    bucketId: string;
    userId: string | null;
  }>;
  taskProgress: Array<{
    id: string;
    assignmentId: string;
    taskDefinitionId: string;
    status: string;
    completedAt: number | null;
    supportedByUserId: string | null;
  }>;
}

const DEFAULT_PASSWORD = 'TempPassword123!';

async function main() {
  console.log('Starting data import...\n');

  // Read exported data
  const dataPath = path.join(__dirname, 'data-export.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data export file not found at: ${dataPath}`);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data: ExportedData = JSON.parse(rawData);

  console.log(`Loaded data from ${dataPath}`);
  console.log(`- Users: ${data.users.length}`);
  console.log(`- Buckets: ${data.buckets.length}`);
  console.log(`- TaskDefinitions: ${data.taskDefinitions.length}`);
  console.log(`- DailyLogs: ${data.dailyLogs.length}`);
  console.log(`- Assignments: ${data.assignments.length}`);
  console.log(`- TaskProgress: ${data.taskProgress.length}`);
  console.log();

  // Hash the default password
  console.log('Hashing default password...');
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  console.log('Password hashed successfully.\n');

  const generatedCredentials: Array<{ name: string; email: string; password: string }> = [];

  try {
    // 1. Import Users
    console.log('Importing users...');
    for (const user of data.users) {
      const email = `${user.name.toLowerCase().replace(/\s+/g, '')}@example.com`;

      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email,
          password: hashedPassword,
          role: user.role,
          createdAt: new Date(user.createdAt),
        },
      });

      generatedCredentials.push({
        name: user.name,
        email,
        password: DEFAULT_PASSWORD,
      });

      console.log(`  ✓ Created user: ${user.name} (${email})`);
    }
    console.log(`Imported ${data.users.length} users.\n`);

    // 2. Import Buckets
    console.log('Importing buckets...');
    for (const bucket of data.buckets) {
      await prisma.bucket.create({
        data: {
          id: bucket.id,
          title: bucket.title,
          description: bucket.description,
          icon: bucket.icon,
          color: bucket.color,
          order: bucket.order,
        },
      });
      console.log(`  ✓ Created bucket: ${bucket.title}`);
    }
    console.log(`Imported ${data.buckets.length} buckets.\n`);

    // 3. Import DailyLogs
    console.log('Importing daily logs...');
    for (const log of data.dailyLogs) {
      await prisma.dailyLog.create({
        data: {
          id: log.id,
          date: log.date,
          createdAt: new Date(log.createdAt),
        },
      });
      console.log(`  ✓ Created daily log: ${log.date}`);
    }
    console.log(`Imported ${data.dailyLogs.length} daily logs.\n`);

    // 4. Import TaskDefinitions
    console.log('Importing task definitions...');
    for (const task of data.taskDefinitions) {
      await prisma.taskDefinition.create({
        data: {
          id: task.id,
          content: task.content,
          bucketId: task.bucketId,
          order: task.order,
        },
      });
      console.log(`  ✓ Created task: ${task.content}`);
    }
    console.log(`Imported ${data.taskDefinitions.length} task definitions.\n`);

    // 5. Import Assignments
    console.log('Importing assignments...');
    for (const assignment of data.assignments) {
      await prisma.assignment.create({
        data: {
          id: assignment.id,
          dailyLogId: assignment.dailyLogId,
          bucketId: assignment.bucketId,
          userId: assignment.userId,
        },
      });
      const userInfo = assignment.userId
        ? data.users.find(u => u.id === assignment.userId)?.name || 'Unknown'
        : 'Unassigned';
      console.log(`  ✓ Created assignment: ${userInfo}`);
    }
    console.log(`Imported ${data.assignments.length} assignments.\n`);

    // 6. Import TaskProgress
    if (data.taskProgress.length > 0) {
      console.log('Importing task progress...');
      for (const progress of data.taskProgress) {
        await prisma.taskProgress.create({
          data: {
            id: progress.id,
            assignmentId: progress.assignmentId,
            taskDefinitionId: progress.taskDefinitionId,
            status: progress.status,
            completedAt: progress.completedAt ? new Date(progress.completedAt) : null,
            supportedByUserId: progress.supportedByUserId,
          },
        });
        console.log(`  ✓ Created task progress: ${progress.status}`);
      }
      console.log(`Imported ${data.taskProgress.length} task progress records.\n`);
    } else {
      console.log('No task progress to import.\n');
    }

    // Print summary
    console.log('='.repeat(80));
    console.log('IMPORT COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log();
    console.log('Generated User Credentials:');
    console.log('-'.repeat(80));
    console.log('All users have been assigned the same temporary password.');
    console.log(`Default Password: ${DEFAULT_PASSWORD}`);
    console.log();
    console.log('User Accounts:');
    for (const cred of generatedCredentials) {
      console.log(`  Name:     ${cred.name}`);
      console.log(`  Email:    ${cred.email}`);
      console.log(`  Password: ${cred.password}`);
      console.log();
    }
    console.log('-'.repeat(80));
    console.log();
    console.log('IMPORTANT: Please share these credentials with users and ask them');
    console.log('           to change their passwords upon first login.');
    console.log();

  } catch (error) {
    console.error('Error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Import script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import script failed:', error);
    process.exit(1);
  });
