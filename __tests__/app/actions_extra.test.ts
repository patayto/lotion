import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateUser, deleteUser, deleteBucket } from '@/app/actions'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => {
    const mockPrismaModel = {
        update: vi.fn(),
        updateMany: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(() => Promise.resolve([])),
        create: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    }
    return {
        prisma: {
            bucket: { ...mockPrismaModel, create: vi.fn(() => Promise.resolve({ id: 'unassigned-id', order: 10 })) },
            user: mockPrismaModel,
            dailyLog: mockPrismaModel,
            assignment: mockPrismaModel,
            taskDefinition: { ...mockPrismaModel, findFirst: vi.fn(() => Promise.resolve({ id: 't-last', order: 5 })) },
            taskProgress: mockPrismaModel,
        }
    }
})

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
    })),
}))

vi.mock('@/lib/fast-auth', () => ({
    getFastSession: vi.fn(() => Promise.resolve({ user: { id: 'test-user', role: 'ADMIN' } }))
}))

describe('Actions Extra Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('updateUser calls prisma update', async () => {
        await updateUser('u1', 'New Name')
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 'u1' },
            data: { name: 'New Name' }
        })
    })

    it('deleteUser calls prisma and cleans up dependencies', async () => {
        await deleteUser('u1')
        expect(prisma.assignment.updateMany).toHaveBeenCalled()
        expect(prisma.taskProgress.updateMany).toHaveBeenCalled()
        expect(prisma.user.delete).toHaveBeenCalledWith({
            where: { id: 'u1' }
        })
    })

    it('deleteBucket hits unassigned bucket creation path', async () => {
        // Mock findFirst for unassigned bucket to return null
        ;(prisma.bucket.findFirst as any)
            .mockResolvedValueOnce(null) // unassignedBucket check
            .mockResolvedValueOnce({ id: 'alt-unassigned', order: 5 }) // lastBucket for order calculcation

        await deleteBucket('b1')
        
        expect(prisma.bucket.create).toHaveBeenCalled()
    })
})
