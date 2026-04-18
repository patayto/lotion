import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DashboardPage from '@/app/page'
import * as actions from '@/app/actions'

vi.mock('next-auth', () => ({
    default: vi.fn(() => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn()
    })),
    AuthError: class AuthError extends Error {
        constructor(public type: string) {
            super(type)
            this.name = 'AuthError'
        }
    }
}))

vi.mock('@/app/actions', () => ({
    getDailyState: vi.fn(),
}))

vi.mock('@/app/components/DashboardClientWrapper', () => ({
    DashboardClientWrapper: ({ children }: any) => <div data-testid="dashboard-wrapper">{children}</div>,
    HeaderUserAction: () => <div data-testid="header-user-action" />
}))

vi.mock('@/app/components/MorningHuddle', () => ({
    MorningHuddle: () => <div data-testid="morning-huddle" />
}))

vi.mock('@/app/components/BucketCard', () => ({
    BucketCard: ({ bucketId }: any) => <div data-testid={`bucket-card-${bucketId}`} />
}))

vi.mock('@/app/components/DateFilter', () => ({
    DateFilter: () => <div data-testid="date-filter" />
}))

vi.mock('@/app/components/DailyReport', () => ({
    DailyReportButton: () => <div data-testid="daily-report-button" />
}))

vi.mock('@/app/components/EditComponents', () => ({
    AddBucketCard: () => <div data-testid="add-bucket-card" />
}))

describe('DashboardPage', () => {
    const mockState = {
        buckets: [{ id: 'b1', title: 'Work', tasks: [] }],
        assignments: [],
        users: [],
        missedTaskIds: [],
        currentUserRole: 'ADMIN',
        currentUserId: 'u1',
        datesWithData: []
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the dashboard with data', async () => {
        ;(actions.getDailyState as any).mockResolvedValue(mockState)
        
        // Since DashboardPage is a server component (async function), 
        // we await it to get the JSX and then render it.
        const page = await DashboardPage({ searchParams: Promise.resolve({}) })
        render(page)
        
        expect(screen.getByText('Lotion')).toBeInTheDocument()
        expect(screen.getByTestId('dashboard-wrapper')).toBeInTheDocument()
        expect(screen.getByTestId('bucket-card-b1')).toBeInTheDocument()
    })

    it('shows history badge for past dates', async () => {
        ;(actions.getDailyState as any).mockResolvedValue(mockState)
        
        const page = await DashboardPage({ searchParams: Promise.resolve({ date: '2024-01-01' }) })
        render(page)
        
        expect(screen.getByText(/History: 2024-01-01/i)).toBeInTheDocument()
    })
})
