'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '../auth'
import bcrypt from 'bcryptjs'

// Ensure we have a DailyLog for the specific date
async function ensureDailyLog(date: string) {
    let dailyLog = await prisma.dailyLog.findUnique({
        where: { date },
    })
    if (!dailyLog) {
        dailyLog = await prisma.dailyLog.create({
            data: { date },
        })
    }
    return dailyLog
}

export async function getDailyState(date: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const dailyLog = await ensureDailyLog(date)

    // Get all buckets
    const buckets = await prisma.bucket.findMany({
        orderBy: { order: 'asc' },
        include: {
            tasks: {
                orderBy: { order: 'asc' },
            },
        },
    })

    // Get assignments for this day
    const assignments = await prisma.assignment.findMany({
        where: { dailyLogId: dailyLog.id },
        include: {
            user: true,
            taskProgress: true,
        },
    })

    // Get all users for the assignment dropdown
    const users = await prisma.user.findMany()

    // Find yesterday's missed tasks (simplified logic: check yesterday's log)
    // Calculate "yesterday" from "date"
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    const yesterdayDate = d.toISOString().split('T')[0]

    const yesterdayLog = await prisma.dailyLog.findUnique({
        where: { date: yesterdayDate },
        include: {
            assignments: {
                include: {
                    taskProgress: true
                }
            }
        }
    })

    const missedTaskIds: string[] = []
    if (yesterdayLog && yesterdayLog.assignments.length > 0) {
        // Optimize: Get all bucket tasks in one query instead of N queries
        const assignedBucketIds = yesterdayLog.assignments
            .filter(a => a.userId) // Only assigned buckets
            .map(a => a.bucketId)

        if (assignedBucketIds.length > 0) {
            const allBucketTasks = await prisma.taskDefinition.findMany({
                where: { bucketId: { in: assignedBucketIds } }
            })

            // Build a map for fast lookup
            const tasksByBucket = new Map<string, typeof allBucketTasks>()
            for (const task of allBucketTasks) {
                if (!tasksByBucket.has(task.bucketId)) {
                    tasksByBucket.set(task.bucketId, [])
                }
                tasksByBucket.get(task.bucketId)!.push(task)
            }

            // Check each assignment for incomplete tasks
            for (const assignment of yesterdayLog.assignments) {
                if (!assignment.userId) continue

                const bucketTasks = tasksByBucket.get(assignment.bucketId) || []
                for (const task of bucketTasks) {
                    const progress = assignment.taskProgress.find(p => p.taskDefinitionId === task.id)
                    if (!progress || progress.status !== 'DONE') {
                        missedTaskIds.push(task.id)
                    }
                }
            }
        }
    }

    return { dailyLog, buckets, assignments, users, missedTaskIds, currentUserRole: session.user.role }
}

export async function assignBucket(bucketId: string, userId: string, date: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const dailyLog = await ensureDailyLog(date)

    // Convert empty string to null for unassignment
    const userIdValue = userId === '' ? null : userId

    const existing = await prisma.assignment.findUnique({
        where: {
            dailyLogId_bucketId: {
                dailyLogId: dailyLog.id,
                bucketId,
            }
        }
    })

    if (existing) {
        await prisma.assignment.update({
            where: { id: existing.id },
            data: { userId: userIdValue },
        })
    } else {
        await prisma.assignment.create({
            data: {
                dailyLogId: dailyLog.id,
                bucketId,
                userId: userIdValue,
            },
        })
    }

    revalidatePath('/')
}

export async function toggleTask(
    assignmentId: string,
    taskDefinitionId: string,
    isDone: boolean,
    supporterId?: string
) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    // Check if progress entry exists
    const existing = await prisma.taskProgress.findUnique({
        where: {
            assignmentId_taskDefinitionId: {
                assignmentId,
                taskDefinitionId
            }
        }
    })

    if (existing) {
        await prisma.taskProgress.update({
            where: { id: existing.id },
            data: {
                status: isDone ? 'DONE' : 'PENDING',
                completedAt: isDone ? new Date() : null,
                supportedByUserId: supporterId || null
            }
        })
    } else {
        await prisma.taskProgress.create({
            data: {
                assignmentId,
                taskDefinitionId,
                status: isDone ? 'DONE' : 'PENDING',
                completedAt: isDone ? new Date() : null,
                supportedByUserId: supporterId || null
            }
        })
    }

    revalidatePath('/')
}

// Phase 2: Edit actions
export async function updateBucket(bucketId: string, title: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    await prisma.bucket.update({
        where: { id: bucketId },
        data: { title }
    })
    revalidatePath('/')
}

export async function createTaskDefinition(bucketId: string, content: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    // Get max order
    const lastTask = await prisma.taskDefinition.findFirst({
        where: { bucketId },
        orderBy: { order: 'desc' }
    })
    const order = (lastTask?.order || 0) + 1

    await prisma.taskDefinition.create({
        data: {
            bucketId,
            content,
            order
        }
    })
    revalidatePath('/')
}

export async function updateTaskDefinition(taskId: string, content: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    await prisma.taskDefinition.update({
        where: { id: taskId },
        data: { content }
    })
    revalidatePath('/')
}

export async function deleteTaskDefinition(taskId: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    // Clean up valid progress first
    await prisma.taskProgress.deleteMany({
        where: { taskDefinitionId: taskId }
    })

    await prisma.taskDefinition.delete({
        where: { id: taskId }
    })
    revalidatePath('/')
}

// Phase 3: User Management
export async function createUser(data: { name: string, email: string, password: string, role?: string }) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    // Only admins can create users
    if (session.user.role !== 'ADMIN') {
        throw new Error('Only administrators can create users')
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: data.role || 'MEMBER'
        }
    })
    revalidatePath('/')
}

export async function updateUser(id: string, name: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    await prisma.user.update({
        where: { id },
        data: { name }
    })
    revalidatePath('/')
}

export async function deleteUser(id: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    // Unassign pending assignments
    await prisma.assignment.updateMany({
        where: { userId: id },
        data: { userId: null }
    })

    // Clear supported tasks
    await prisma.taskProgress.updateMany({
        where: { supportedByUserId: id },
        data: { supportedByUserId: null }
    })

    await prisma.user.delete({
        where: { id }
    })
    revalidatePath('/')
}
