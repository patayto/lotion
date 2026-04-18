import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DailyReportButton } from '@/app/components/DailyReport'
import * as actions from '@/app/actions'

vi.mock('@/app/actions', () => ({
    getDailyReport: vi.fn(),
}))

vi.mock('./Icon', () => ({
    Icon: () => <div data-testid="icon" />
}))

describe('DailyReportButton', () => {
    const mockReport = {
        date: '2024-01-01',
        summary: {
            totalBuckets: 2,
            assignedBuckets: 1,
            totalTasks: 2,
            completedTasks: 1,
            outstandingTasks: 1,
            completionPercent: 50,
        },
        assignments: [
            {
                user: { id: 'u1', name: 'Alice' },
                bucket: { id: 'b1', title: 'Work', icon: 'Briefcase' },
                completed: [{ taskId: 't1', content: 'Task 1', completedAt: new Date().toISOString() }],
                outstanding: [],
            }
        ],
        unassignedBuckets: [
            {
                id: 'b2',
                title: 'Unassigned',
                icon: 'Home',
                completed: [],
                outstanding: [{ taskId: 't2', content: 'Task 2' }],
            }
        ]
    }

    beforeEach(() => {
        vi.clearAllMocks()
        // Mock URL and Blob for CSV download
        global.URL.createObjectURL = vi.fn(() => 'mock-url')
        global.URL.revokeObjectURL = vi.fn()
    })

    it('renders button and opens dialog on click', async () => {
        ;(actions.getDailyReport as any).mockResolvedValue(mockReport)
        
        render(<DailyReportButton date="2024-01-01" />)
        
        const btn = screen.getByRole('button', { name: /Daily Report/i })
        fireEvent.click(btn)
        
        expect(screen.getByText(/Generating report/i)).toBeInTheDocument()
        
        await waitFor(() => {
            expect(screen.getByText('Work')).toBeInTheDocument()
            expect(screen.getByText('Task 1')).toBeInTheDocument()
            expect(screen.getByText('Unassigned')).toBeInTheDocument()
        })
    })

    it('exports CSV on button click', async () => {
        ;(actions.getDailyReport as any).mockResolvedValue(mockReport)
        
        render(<DailyReportButton date="2024-01-01" />)
        fireEvent.click(screen.getByRole('button', { name: /Daily Report/i }))
        
        await waitFor(() => screen.getByText('Export CSV'))
        
        const exportBtn = screen.getByText('Export CSV')
        fireEvent.click(exportBtn)
        
        expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    it('handles error during report generation', async () => {
        ;(actions.getDailyReport as any).mockRejectedValue(new Error('Failed to load'))
        
        render(<DailyReportButton date="2024-01-01" />)
        fireEvent.click(screen.getByRole('button', { name: /Daily Report/i }))
        
        await waitFor(() => {
            expect(screen.getByText(/Error: Failed to load/i)).toBeInTheDocument()
        })
    })

    it('closes dialog on close button click', async () => {
        ;(actions.getDailyReport as any).mockResolvedValue(mockReport)
        render(<DailyReportButton date="2024-01-01" />)
        const btn = screen.getByRole('button', { name: /Daily Report/i })
        fireEvent.click(btn)
        
        // Wait for the report to load and the close button to appear
        const closeBtn = await screen.findByTestId('close-report-button')
        fireEvent.click(closeBtn)
        
        await waitFor(() => {
            expect(screen.queryByText('Work')).not.toBeInTheDocument()
        })
    })
})
