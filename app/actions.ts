'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '../auth'
import bcrypt from 'bcryptjs'
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('lotion-actions')

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
    return tracer.startActiveSpan('getDailyState', async (span) => {
        try {
            span.setAttribute('date', date);
            return await _getDailyState(date);
        } finally {
            span.end();
        }
    });
}

async function _getDailyState(date: string) {
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
            taskProgress: {
                include: {
                    completedBy: { select: { id: true, name: true } }
                }
            },
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

    return { dailyLog, buckets, assignments, users, missedTaskIds, currentUserRole: session.user.role, currentUserId: session.user.id }
}

export async function getOrCreateAssignment(bucketId: string, date: string): Promise<string> {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const dailyLog = await ensureDailyLog(date)

    const existing = await prisma.assignment.findUnique({
        where: { dailyLogId_bucketId: { dailyLogId: dailyLog.id, bucketId } }
    })
    if (existing) return existing.id

    const created = await prisma.assignment.create({
        data: { dailyLogId: dailyLog.id, bucketId, userId: null }
    })
    return created.id
}

export async function assignBucket(bucketId: string, userId: string, date: string) {
    return tracer.startActiveSpan('assignBucket', async (span) => {
        try {
            span.setAttribute('bucketId', bucketId);
            span.setAttribute('userId', userId);
            span.setAttribute('date', date);
            return await _assignBucket(bucketId, userId, date);
        } finally {
            span.end();
        }
    });
}

async function _assignBucket(bucketId: string, userId: string, date: string) {
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
    isDone: boolean
) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    // Find assignment to see who it belongs to
    const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId }
    })

    // Determine if the logged-in user is supporting someone else
    const isSupporter = assignment?.userId && session.user.id !== assignment.userId;
    const computedSupporterId = isSupporter ? session.user.id : null;

    // Check if progress entry exists
    const existing = await prisma.taskProgress.findUnique({
        where: {
            assignmentId_taskDefinitionId: {
                assignmentId,
                taskDefinitionId
            }
        }
    })

    let progress
    if (existing) {
        progress = await prisma.taskProgress.update({
            where: { id: existing.id },
            data: {
                status: isDone ? 'DONE' : 'PENDING',
                completedAt: isDone ? new Date() : null,
                supportedByUserId: isDone ? computedSupporterId : null,
                completedByUserId: isDone ? session.user.id : null,
            }
        })
    } else {
        progress = await prisma.taskProgress.create({
            data: {
                assignmentId,
                taskDefinitionId,
                status: isDone ? 'DONE' : 'PENDING',
                completedAt: isDone ? new Date() : null,
                supportedByUserId: isDone ? computedSupporterId : null,
                completedByUserId: isDone ? session.user.id : null,
            }
        })
    }

    await prisma.taskEvent.create({
        data: {
            taskProgressId: progress.id,
            userId: session.user.id,
            action: isDone ? 'COMPLETED' : 'UNCOMPLETED',
        }
    })

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

export async function getTaskHistory(taskDefinitionId: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    return prisma.taskEvent.findMany({
        where: {
            taskProgress: { taskDefinitionId }
        },
        include: {
            user: { select: { id: true, name: true } },
            taskProgress: {
                include: {
                    taskDefinition: { select: { content: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
    })
}

export async function createBucket(title: string): Promise<void> {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const lastBucket = await prisma.bucket.findFirst({ orderBy: { order: 'desc' } })
    await prisma.bucket.create({
        data: { title, order: (lastBucket?.order ?? 0) + 1, color: 'gray' }
    })
    revalidatePath('/')
}

export async function deleteBucket(bucketId: string): Promise<void> {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    // Find or create an "Unassigned" bucket to receive orphaned tasks
    let unassignedBucket = await prisma.bucket.findFirst({
        where: { title: 'Unassigned', id: { not: bucketId } }
    })
    if (!unassignedBucket) {
        const lastBucket = await prisma.bucket.findFirst({
            where: { id: { not: bucketId } },
            orderBy: { order: 'desc' }
        })
        unassignedBucket = await prisma.bucket.create({
            data: { title: 'Unassigned', order: (lastBucket?.order ?? 0) + 1, color: 'gray' }
        })
    }

    // Clean up historical assignment data for this bucket
    const assignments = await prisma.assignment.findMany({
        where: { bucketId },
        select: { id: true }
    })
    if (assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id)
        const progressRecords = await prisma.taskProgress.findMany({
            where: { assignmentId: { in: assignmentIds } },
            select: { id: true }
        })
        if (progressRecords.length > 0) {
            const progressIds = progressRecords.map(p => p.id)
            await prisma.taskEvent.deleteMany({ where: { taskProgressId: { in: progressIds } } })
            await prisma.taskProgress.deleteMany({ where: { id: { in: progressIds } } })
        }
        await prisma.assignment.deleteMany({ where: { bucketId } })
    }

    // Move task definitions to the Unassigned bucket
    const lastTaskInTarget = await prisma.taskDefinition.findFirst({
        where: { bucketId: unassignedBucket.id },
        orderBy: { order: 'desc' }
    })
    const tasksToMove = await prisma.taskDefinition.findMany({
        where: { bucketId },
        orderBy: { order: 'asc' }
    })
    let nextOrder = (lastTaskInTarget?.order ?? 0) + 1
    for (const task of tasksToMove) {
        await prisma.taskDefinition.update({
            where: { id: task.id },
            data: { bucketId: unassignedBucket.id, order: nextOrder++ }
        })
    }

    await prisma.bucket.delete({ where: { id: bucketId } })
    revalidatePath('/')
}

export async function reorderTasks(bucketId: string, taskIds: string[]): Promise<void> {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    await prisma.$transaction(
        taskIds.map((id, index) =>
            prisma.taskDefinition.update({
                where: { id },
                data: { order: index + 1 }
            })
        )
    )
    revalidatePath('/')
}

export async function getDatesWithData(): Promise<string[]> {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')

    const logs = await prisma.dailyLog.findMany({
        where: {
            assignments: {
                some: { userId: { not: null } }
            }
        },
        select: { date: true },
        orderBy: { date: 'asc' },
    })

    return logs.map(l => l.date)
}

type DailyReportData = {
    date: string
    summary: {
        totalBuckets: number
        assignedBuckets: number
        unassignedBuckets: number
        totalTasks: number
        completedTasks: number
        outstandingTasks: number
        completionPercent: number
    }
    assignments: Array<{
        user: { id: string; name: string }
        bucket: { id: string; title: string; icon: string | null; color: string }
        completed: Array<{
            taskId: string
            content: string
            completedAt: Date | null
            completedBy: { id: string; name: string } | null
            supportedBy: { id: string; name: string } | null
        }>
        outstanding: Array<{
            taskId: string
            content: string
        }>
    }>
    unassignedBuckets: Array<{
        id: string
        title: string
        icon: string | null
        color: string
        completed: Array<{
            taskId: string
            content: string
            completedAt: Date | null
            completedBy: { id: string; name: string } | null
            supportedBy: { id: string; name: string } | null
        }>
        outstanding: Array<{
            taskId: string
            content: string
        }>
    }>
}

export async function getDailyReport(date: string): Promise<DailyReportData> {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    if (session.user.role !== 'ADMIN') throw new Error('Forbidden')

    const dailyLog = await prisma.dailyLog.findUnique({
        where: { date },
    })

    const buckets = await prisma.bucket.findMany({
        orderBy: { order: 'asc' },
        include: {
            tasks: { orderBy: { order: 'asc' } },
        },
    })

    const dbAssignments = dailyLog
        ? await prisma.assignment.findMany({
            where: { dailyLogId: dailyLog.id },
            include: {
                user: true,
                bucket: true,
                taskProgress: {
                    include: {
                        completedBy: { select: { id: true, name: true } },
                        supportedBy: { select: { id: true, name: true } },
                    },
                },
            },
        })
        : []

    // Build assignments array (only assigned ones)
    const assignedBucketIds = new Set<string>()
    const assignments: DailyReportData['assignments'] = []

    for (const a of dbAssignments) {
        if (!a.userId || !a.user) continue
        assignedBucketIds.add(a.bucketId)

        const bucket = buckets.find(b => b.id === a.bucketId)
        if (!bucket) continue

        const completed: DailyReportData['assignments'][0]['completed'] = []
        const outstanding: DailyReportData['assignments'][0]['outstanding'] = []

        for (const task of bucket.tasks) {
            const progress = a.taskProgress.find(p => p.taskDefinitionId === task.id)
            if (progress && progress.status === 'DONE') {
                completed.push({
                    taskId: task.id,
                    content: task.content,
                    completedAt: progress.completedAt,
                    completedBy: progress.completedBy ?? null,
                    supportedBy: progress.supportedBy ?? null,
                })
            } else {
                outstanding.push({ taskId: task.id, content: task.content })
            }
        }

        assignments.push({
            user: { id: a.user.id, name: a.user.name },
            bucket: {
                id: a.bucket.id,
                title: a.bucket.title,
                icon: a.bucket.icon,
                color: a.bucket.color,
            },
            completed,
            outstanding,
        })
    }

    // Unassigned buckets
    const unassignedBuckets: DailyReportData['unassignedBuckets'] = buckets
        .filter(b => !assignedBucketIds.has(b.id))
        .map(b => {
            const completed: DailyReportData['unassignedBuckets'][0]['completed'] = []
            const outstanding: DailyReportData['unassignedBuckets'][0]['outstanding'] = []
            
            const assignment = dbAssignments.find(a => a.bucketId === b.id)

            for (const task of b.tasks) {
                const progress = assignment?.taskProgress.find(p => p.taskDefinitionId === task.id)
                if (progress && progress.status === 'DONE') {
                    completed.push({
                        taskId: task.id,
                        content: task.content,
                        completedAt: progress.completedAt,
                        completedBy: progress.completedBy ?? null,
                        supportedBy: progress.supportedBy ?? null,
                    })
                } else {
                    outstanding.push({ taskId: task.id, content: task.content })
                }
            }

            return {
                id: b.id,
                title: b.title,
                icon: b.icon,
                color: b.color,
                completed,
                outstanding,
            }
        })

    // Summary — count all tasks across assigned and unassigned buckets
    const totalBuckets = buckets.length
    const assignedBucketsCount = assignments.length
    const assignedTasksTotal = assignments.reduce((s, a) => s + a.completed.length + a.outstanding.length, 0)
    const unassignedTasksTotal = unassignedBuckets.reduce((s, b) => s + b.completed.length + b.outstanding.length, 0)
    const totalTasks = assignedTasksTotal + unassignedTasksTotal
    const completedTasks = assignments.reduce((s, a) => s + a.completed.length, 0) + unassignedBuckets.reduce((s, b) => s + b.completed.length, 0)
    const outstandingTasks = totalTasks - completedTasks
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0

    return {
        date,
        summary: {
            totalBuckets,
            assignedBuckets: assignedBucketsCount,
            unassignedBuckets: totalBuckets - assignedBucketsCount,
            totalTasks,
            completedTasks,
            outstandingTasks,
            completionPercent,
        },
        assignments,
        unassignedBuckets,
    }
}
