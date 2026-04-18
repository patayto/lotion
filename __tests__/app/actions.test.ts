import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDailyState, toggleTask } from '@/app/actions'
import { prisma } from '@/lib/prisma'
import { getFastSession } from '@/lib/fast-auth'
import { revalidatePath } from 'next/cache'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    bucket: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    dailyLog: { 
        findUnique: vi.fn(), 
        findMany: vi.fn(), 
        upsert: vi.fn().mockResolvedValue({ id: 'log-1' }) 
    },
    assignment: { 
        findMany: vi.fn(), 
        findUnique: vi.fn().mockResolvedValue({ id: 'a1' }) 
    },
    taskProgress: { 
        findUnique: vi.fn(), 
        upsert: vi.fn().mockResolvedValue({ id: 'p1' }), 
        create: vi.fn().mockResolvedValue({ id: 'p1' }), 
        update: vi.fn().mockResolvedValue({ id: 'p1' }) 
    },
    taskEvent: { create: vi.fn().mockResolvedValue({ id: 'e1' }) },
    $transaction: vi.fn((cb) => cb(prisma)),
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
})
