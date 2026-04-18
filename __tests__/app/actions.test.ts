import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
    getDailyState, 
    toggleTask, 
    assignBucket, 
    createBucket, 
    updateBucket, 
    deleteBucket,
    createTaskDefinition,
    updateTaskDefinition,
    deleteTaskDefinition,
    createUser,
    updateUser,
    deleteUser,
    getDailyReport,
    getDatesWithData,
    getTaskHistory,
    getOrCreateAssignment,
    reorderTasks
} from '@/app/actions'
import { prisma } from '@/lib/prisma'
import { getFastSession } from '@/lib/fast-auth'
import { revalidatePath } from 'next/cache'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    bucket: { 
        findMany: vi.fn(), 
        findFirst: vi.fn(), 
        create: vi.fn().mockResolvedValue({ id: 'b1', title: 'Bucket' }),
        update: vi.fn().mockResolvedValue({ id: 'b1', title: 'Bucket' }),
        delete: vi.fn().mockResolvedValue({ id: 'b1' }),
    },
    user: { 
        findMany: vi.fn(), 
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 'u1' }),
        update: vi.fn().mockResolvedValue({ id: 'u1' }),
        delete: vi.fn().mockResolvedValue({ id: 'u1' }),
    },
    dailyLog: { 
        findUnique: vi.fn(), 
        findMany: vi.fn(), 
        upsert: vi.fn().mockResolvedValue({ id: 'log-1' }) 
    },
    assignment: { 
        findMany: vi.fn(), 
        findUnique: vi.fn().mockResolvedValue({ id: 'a1' }),
        create: vi.fn().mockResolvedValue({ id: 'a1' }),
        update: vi.fn().mockResolvedValue({ id: 'a1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    taskDefinition: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 't1' }),
        update: vi.fn().mockResolvedValue({ id: 't1' }),
        delete: vi.fn().mockResolvedValue({ id: 't1' }),
    },
    taskProgress: { 
        findUnique: vi.fn(), 
        findMany: vi.fn(),
        upsert: vi.fn().mockResolvedValue({ id: 'p1' }), 
        create: vi.fn().mockResolvedValue({ id: 'p1' }), 
        update: vi.fn().mockResolvedValue({ id: 'p1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    taskEvent: { 
        create: vi.fn().mockResolvedValue({ id: 'e1' }),
        findMany: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn((cb) => typeof cb === 'function' ? cb(prisma) : Promise.all(cb)),
  },
}))

vi.mock('@/lib/fast-auth', () => ({
  getFastSession: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Trace/otel mock
vi.mock('@opentelemetry/api', () => ({
    trace: {
        getTracer: () => ({
            startActiveSpan: (_name, cb) => cb({ 
                setAttribute: vi.fn(), 
                end: vi.fn() 
            })
        })
    }
}))

describe('Server Actions - Security & Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDailyState', () => {
    it('throws error if unauthorized', async () => {
      ;(getFastSession as any).mockResolvedValue(null)
      
      await expect(getDailyState('2024-01-01')).rejects.toThrow('Unauthorized')
      
      // Ensure NO mutation attempted
      expect(prisma.dailyLog.upsert).not.toHaveBeenCalled()
    })

    it('successfully fetches data and ensures log exists if authorized', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1', role: 'MEMBER' } })
      ;(prisma.bucket.findMany as any).mockResolvedValue([])
      ;(prisma.user.findMany as any).mockResolvedValue([])
      ;(prisma.dailyLog.findUnique as any).mockResolvedValue(null)
      ;(prisma.dailyLog.findMany as any).mockResolvedValue([])
      ;(prisma.assignment.findMany as any).mockResolvedValue([])
      ;(prisma.dailyLog.upsert as any).mockResolvedValue({ id: 'log-1' })

      const result = await getDailyState('2024-01-01')
      
      expect(result).toBeDefined()
      expect(prisma.dailyLog.upsert).toHaveBeenCalled()
    })
  })

  describe('toggleTask', () => {
    it('does NOT write to DB if unauthorized', async () => {
      ;(getFastSession as any).mockResolvedValue(null)
      
      await expect(toggleTask('a1', 't1', true)).rejects.toThrow('Unauthorized')
      
      // Verify no database calls for mutation occurred
      expect(prisma.taskProgress.upsert).not.toHaveBeenCalled()
      expect(prisma.taskEvent.create).not.toHaveBeenCalled()
    })

    it('writes to DB if authorized', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1', name: 'User' } })
      ;(prisma.assignment.findUnique as any).mockResolvedValue({ id: 'a1' })
      ;(prisma.taskProgress.findUnique as any).mockResolvedValue(null)
      
      await toggleTask('a1', 't1', true)
      
      // Since existing was null, it should call create
      expect(prisma.taskProgress.create).toHaveBeenCalled()
      expect(prisma.taskEvent.create).toHaveBeenCalled()
    })
  })

  describe('Bucket Actions', () => {
    it('assignBucket updates existing assignment if found', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      ;(prisma.dailyLog.upsert as any).mockResolvedValue({ id: 'l1' })
      ;(prisma.assignment.findUnique as any).mockResolvedValue({ id: 'a1' })

      await assignBucket('b1', 'u2', '2024-01-01')

      expect(prisma.assignment.update).toHaveBeenCalled()
      expect(revalidatePath).toHaveBeenCalledWith('/')
    })

    it('assignBucket creates new assignment if not found', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      ;(prisma.dailyLog.upsert as any).mockResolvedValue({ id: 'l1' })
      ;(prisma.assignment.findUnique as any).mockResolvedValue(null)

      await assignBucket('b1', 'u2', '2024-01-01')

      expect(prisma.assignment.create).toHaveBeenCalled()
    })

    it('createBucket calculates order and creates bucket', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      ;(prisma.bucket.findFirst as any).mockResolvedValue({ order: 5 })

      await createBucket('New Bucket')

      expect(prisma.bucket.create).toHaveBeenCalledWith({
        data: { title: 'New Bucket', order: 6, color: 'gray' }
      })
    })

    it('deleteBucket moves tasks to Unassigned bucket', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      ;(prisma.bucket.findFirst as any).mockResolvedValue({ id: 'unassigned-id', title: 'Unassigned', order: 1 })
      ;(prisma.assignment.findMany as any).mockResolvedValue([{ id: 'a1' }])
      ;(prisma.taskProgress.findMany as any).mockResolvedValue([{ id: 'p1' }])
      ;(prisma.taskDefinition.findMany as any).mockResolvedValue([{ id: 't1' }])

      await deleteBucket('b1')

      expect(prisma.taskDefinition.update).toHaveBeenCalled()
      expect(prisma.bucket.delete).toHaveBeenCalledWith({ where: { id: 'b1' } })
    })
  })

  describe('Task Definition Actions', () => {
    it('createTaskDefinition calculates order and creates task', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      ;(prisma.taskDefinition.findFirst as any).mockResolvedValue({ order: 10 })

      await createTaskDefinition('b1', 'New Task')

      expect(prisma.taskDefinition.create).toHaveBeenCalledWith({
        data: { bucketId: 'b1', content: 'New Task', order: 11 }
      })
    })

    it('deleteTaskDefinition cleans up progress and deletes task', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })

      await deleteTaskDefinition('t1')

      expect(prisma.taskProgress.deleteMany).toHaveBeenCalled()
      expect(prisma.taskDefinition.delete).toHaveBeenCalledWith({ where: { id: 't1' } })
    })
  })

  describe('User Management Actions', () => {
    it('createUser hashes password and creates user (Admin only)', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } })
      
      await createUser({ name: 'New User', email: 'new@example.com', password: 'password123' })

      expect(prisma.user.create).toHaveBeenCalled()
    })

    it('createUser throws if not Admin', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'user1', role: 'MEMBER' } })
      
      await expect(createUser({ name: 'New User', email: 'new@example.com', password: 'password123' }))
        .rejects.toThrow('Only administrators can create users')
    })

    it('updateUser updates user name', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      await updateUser('u2', 'New Name')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: { name: 'New Name' }
      })
    })

    it('deleteUser unassigns buckets and clears support before deleting', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      await deleteUser('u2')
      expect(prisma.assignment.updateMany).toHaveBeenCalled()
      expect(prisma.taskProgress.updateMany).toHaveBeenCalled()
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u2' } })
    })
  })

  describe('Data Fetching & Reporting', () => {
    it('getDailyState handles yesterday missed tasks', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1', role: 'MEMBER' } })
      ;(prisma.bucket.findMany as any).mockResolvedValue([{ id: 'b1', tasks: [{ id: 't1' }] }])
      ;(prisma.user.findMany as any).mockResolvedValue([])
      ;(prisma.dailyLog.findUnique as any).mockResolvedValue({
          id: 'yesterday-log',
          assignments: [{ 
              bucketId: 'b1', 
              userId: 'u1', 
              taskProgress: [{ taskDefinitionId: 't1', status: 'PENDING' }] 
          }]
      })
      ;(prisma.dailyLog.findMany as any).mockResolvedValue([])
      ;(prisma.assignment.findMany as any).mockResolvedValue([])

      const result = await getDailyState('2024-01-02')
      expect(result.missedTaskIds).toContain('t1')
    })

    it('getDailyReport covers completed tasks and unassigned buckets', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } })
      ;(prisma.dailyLog.findUnique as any).mockResolvedValue({ id: 'l1', date: '2024-01-01' })
      ;(prisma.bucket.findMany as any).mockResolvedValue([
        { id: 'b1', title: 'Assigned Bucket', tasks: [{ id: 't1', content: 'T1' }] },
        { id: 'b2', title: 'Unassigned Bucket', tasks: [{ id: 't2', content: 'T2' }] }
      ])
      ;(prisma.assignment.findMany as any).mockResolvedValue([
        { 
          id: 'a1', 
          bucketId: 'b1', 
          userId: 'u1', 
          user: { id: 'u1', name: 'U1' },
          bucket: { id: 'b1', title: 'Assigned Bucket' },
          taskProgress: [{ taskDefinitionId: 't1', status: 'DONE', completedAt: new Date() }] 
        }
      ])

      const report = await getDailyReport('2024-01-01')

      // Check assigned bucket with completed task
      expect(report.assignments[0].completed).toHaveLength(1)
      expect(report.assignments[0].completed[0].taskId).toBe('t1')

      // Check unassigned bucket
      expect(report.unassignedBuckets).toHaveLength(1)
      expect(report.unassignedBuckets[0].title).toBe('Unassigned Bucket')
      expect(report.unassignedBuckets[0].outstanding).toHaveLength(1)
      
      expect(report.summary.totalTasks).toBe(2)
      expect(report.summary.completedTasks).toBe(1)
    })

    it('getTaskHistory returns events for a task', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      ;(prisma.taskEvent.findMany as any).mockResolvedValue([{ id: 'e1' }])

      const history = await getTaskHistory('t1')
      expect(history).toHaveLength(1)
    })

    it('getOrCreateAssignment handles existing and new', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      ;(prisma.assignment.findUnique as any).mockResolvedValueOnce({ id: 'existing-a1' })
      
      const id1 = await getOrCreateAssignment('b1', '2024-01-01')
      expect(id1).toBe('existing-a1')

      ;(prisma.assignment.findUnique as any).mockResolvedValueOnce(null)
      ;(prisma.assignment.create as any).mockResolvedValue({ id: 'new-a1' })
      
      const id2 = await getOrCreateAssignment('b1', '2024-01-01')
      expect(id2).toBe('new-a1')
    })

    it('reorderTasks updates multiple tasks in transaction', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      
      await reorderTasks('b1', ['t1', 't2'])
      
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('updateBucket updates bucket title', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      await updateBucket('b1', 'New Title')
      expect(prisma.bucket.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
                data: { title: 'New Title' }
      })
    })

    it('updateTaskDefinition updates task content', async () => {
      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      await updateTaskDefinition('t1', 'New Content')
      expect(prisma.taskDefinition.update).toHaveBeenCalledWith({
        where: { id: 't1' },
                data: { content: 'New Content' }
      })
    })

    it('throws error when unauthorized', async () => {
      ;(getFastSession as any).mockResolvedValue(null)
      await expect(updateBucket('b1', 'Title')).rejects.toThrow('Unauthorized')
    })
  })

  describe('Data Fetching & Reporting', () => {
    it('getDatesWithData handles no data and unauthorized', async () => {
      ;(getFastSession as any).mockResolvedValue(null)
      await expect(getDatesWithData()).rejects.toThrow('Unauthorized')

      ;(getFastSession as any).mockResolvedValue({ user: { id: 'u1' } })
      ;(prisma.dailyLog.findMany as any).mockResolvedValue([])
      const result = await getDatesWithData()
      expect(result).toEqual([])
    })
  })
})
