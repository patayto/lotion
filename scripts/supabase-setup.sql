-- Supabase Setup SQL
-- Run this in Supabase Dashboard → SQL Editor → New Query

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- User table
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bucket table
CREATE TABLE "Bucket" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "color" TEXT NOT NULL DEFAULT 'blue',
  "order" INTEGER NOT NULL DEFAULT 0
);

-- TaskDefinition table
CREATE TABLE "TaskDefinition" (
  "id" TEXT PRIMARY KEY,
  "content" TEXT NOT NULL,
  "bucketId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- DailyLog table
CREATE TABLE "DailyLog" (
  "id" TEXT PRIMARY KEY,
  "date" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Assignment table
CREATE TABLE "Assignment" (
  "id" TEXT PRIMARY KEY,
  "dailyLogId" TEXT NOT NULL,
  "bucketId" TEXT NOT NULL,
  "userId" TEXT,
  FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE("dailyLogId", "bucketId")
);

-- TaskProgress table
CREATE TABLE "TaskProgress" (
  "id" TEXT PRIMARY KEY,
  "assignmentId" TEXT NOT NULL,
  "taskDefinitionId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "supportedByUserId" TEXT,
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("taskDefinitionId") REFERENCES "TaskDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("supportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE("assignmentId", "taskDefinitionId")
);

-- Create indexes for better performance
CREATE INDEX "TaskDefinition_bucketId_idx" ON "TaskDefinition"("bucketId");
CREATE INDEX "Assignment_dailyLogId_idx" ON "Assignment"("dailyLogId");
CREATE INDEX "Assignment_bucketId_idx" ON "Assignment"("bucketId");
CREATE INDEX "Assignment_userId_idx" ON "Assignment"("userId");
CREATE INDEX "TaskProgress_assignmentId_idx" ON "TaskProgress"("assignmentId");
CREATE INDEX "TaskProgress_taskDefinitionId_idx" ON "TaskProgress"("taskDefinitionId");

-- ============================================
-- 2. INSERT SEED DATA
-- ============================================

-- Helper function to generate CUID-like IDs
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
BEGIN
  RETURN 'c' || encode(gen_random_bytes(12), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Insert Users with hashed passwords
-- Password for all users: "password123"
-- Hash generated with bcrypt (10 rounds)
INSERT INTO "User" ("id", "name", "email", "password", "role") VALUES
  (generate_cuid(), 'Alice', 'alice@lotion.so', '$2b$10$/CJBL6oaTvh2oA/zuutfsOv9nV4FBwElnOoNjP/bZhakOMYbhr9B2', 'MEMBER'),
  (generate_cuid(), 'Bob', 'bob@lotion.so', '$2b$10$/CJBL6oaTvh2oA/zuutfsOv9nV4FBwElnOoNjP/bZhakOMYbhr9B2', 'MEMBER'),
  (generate_cuid(), 'Charlie', 'charlie@lotion.so', '$2b$10$/CJBL6oaTvh2oA/zuutfsOv9nV4FBwElnOoNjP/bZhakOMYbhr9B2', 'MEMBER'),
  (generate_cuid(), 'Diana', 'diana@lotion.so', '$2b$10$/CJBL6oaTvh2oA/zuutfsOv9nV4FBwElnOoNjP/bZhakOMYbhr9B2', 'MEMBER');

-- Insert Buckets
WITH bucket_data AS (
  INSERT INTO "Bucket" ("id", "title", "description", "icon", "color", "order") VALUES
    (generate_cuid(), 'Inbound Support', 'Handling tickets.', 'Headphones', 'blue', 1),
    (generate_cuid(), 'Proactive Outreach', 'Reaching out to customers.', 'Megaphone', 'green', 2),
    (generate_cuid(), 'Onboarding', 'Helping new customers.', 'UserPlus', 'purple', 3),
    (generate_cuid(), 'Technical Operations', 'Bug replication.', 'Wrench', 'orange', 4),
    (generate_cuid(), 'Content & Knowledge', 'Updating FAQ.', 'BookOpen', 'pink', 5),
    (generate_cuid(), 'Team Sync', 'Meetings, huddles.', 'Users', 'teal', 6),
    (generate_cuid(), 'Learning & Dev', 'Training, courses.', 'GraduationCap', 'yellow', 7)
  RETURNING "id", "title"
)
-- Insert TaskDefinitions for each bucket
INSERT INTO "TaskDefinition" ("id", "content", "bucketId", "order")
SELECT
  generate_cuid(),
  task.content,
  bd."id",
  task.order
FROM bucket_data bd
CROSS JOIN (
  VALUES
    ('Review and clear inbox', 1),
    ('Update ticket statuses', 2),
    ('Escalate critical issues', 3)
) AS task(content, order);

-- Verify data
SELECT 'Users created:' as info, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Buckets created:', COUNT(*) FROM "Bucket"
UNION ALL
SELECT 'Tasks created:', COUNT(*) FROM "TaskDefinition";
