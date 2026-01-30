import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Clean up existing data (optional, for dev)
  await prisma.taskProgress.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.dailyLog.deleteMany()
  await prisma.taskDefinition.deleteMany()
  await prisma.bucket.deleteMany()
  await prisma.user.deleteMany()

  // 2. Create Buckets
  const buckets = [
    { title: 'Inbound Support', description: 'Handling tickets.', icon: 'Headphones', order: 1, color: 'blue' },
    { title: 'Proactive Outreach', description: 'Reaching out to customers.', icon: 'Megaphone', order: 2, color: 'green' },
    { title: 'Onboarding', description: 'Helping new customers.', icon: 'UserPlus', order: 3, color: 'purple' },
    { title: 'Technical Operations', description: 'Bug replication.', icon: 'Wrench', order: 4, color: 'orange' },
    { title: 'Content & Knowledge', description: 'Updating FAQ.', icon: 'BookOpen', order: 5, color: 'pink' },
    { title: 'Team Sync', description: 'Meetings, huddles.', icon: 'Users', order: 6, color: 'teal' },
    { title: 'Learning & Dev', description: 'Training, courses.', icon: 'GraduationCap', order: 7, color: 'yellow' },
  ]

  for (const b of buckets) {
    const bucket = await prisma.bucket.create({
      data: {
        title: b.title,
        description: b.description,
        icon: b.icon,
        order: b.order,
        color: b.color,
      }
    })

    // Seed some default tasks for each bucket
    await prisma.taskDefinition.createMany({
      data: [
        { content: 'Review and clear inbox', bucketId: bucket.id, order: 1 },
        { content: 'Update ticket statuses', bucketId: bucket.id, order: 2 },
        { content: 'Escalate critical issues', bucketId: bucket.id, order: 3 },
      ]
    })
  }

  // 3. Create Users
  const password = await bcrypt.hash('password123', 10)

  await prisma.user.createMany({
    data: [
      { name: 'Alice', email: 'alice@lotion.so', password, role: 'MEMBER' },
      { name: 'Bob', email: 'bob@lotion.so', password, role: 'MEMBER' },
      { name: 'Charlie', email: 'charlie@lotion.so', password, role: 'MEMBER' },
      { name: 'Diana', email: 'diana@lotion.so', password, role: 'MEMBER' },
    ]
  })

  console.log('Seeding completed.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
