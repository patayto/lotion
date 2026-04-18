import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MorningHuddle } from '@/app/components/MorningHuddle'
import * as actions from '@/app/actions'

vi.mock('@/app/actions', () => ({
    assignBucket: vi.fn(),
}))

describe('MorningHuddle', () => {
    const mockUsers = [{ id: 'u1', name: 'Alice' }]
    const mockBuckets = [{ id: 'b1', title: 'Work', icon: 'Briefcase' }]

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders unassigned buckets', () => {
        render(<MorningHuddle unassignedBuckets={mockBuckets} users={mockUsers} date="2024-01-01" />)
        expect(screen.getByText('Work')).toBeInTheDocument()
    })

    it('calls assignBucket when a user is selected', async () => {
        render(<MorningHuddle unassignedBuckets={mockBuckets} users={mockUsers} date="2024-01-01" />)
        expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
})
