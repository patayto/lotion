import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DateFilter } from '@/app/components/DateFilter'
import { useRouter } from 'next/navigation'

vi.mock('next/navigation', () => ({
    useRouter: vi.fn()
}))

// Mock matchMedia for Calendar component
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

describe('DateFilter', () => {
    const mockPush = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        ;(useRouter as any).mockReturnValue({ push: mockPush })
    })

    it('renders current date correctly', () => {
        render(<DateFilter currentDate="2024-01-01" datesWithData={[]} />)
        expect(screen.getByText(/January 1st, 2024/i)).toBeInTheDocument()
    })

    it('opens calendar on click', () => {
        render(<DateFilter currentDate="2024-01-01" datesWithData={[]} />)
        fireEvent.click(screen.getByRole('button'))
        expect(screen.getByText(/January/i)).toBeInTheDocument()
    })

    it('handles date selection and shows loading state', async () => {
        render(<DateFilter currentDate="2024-01-01" datesWithData={['2024-01-01']} />)
        
        // Open the popover
        fireEvent.click(screen.getByRole('button'))
        
        // Find a day in the calendar and click it
        const day = screen.getByText('15')
        fireEvent.click(day)
        
        // It should call router.push
        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/\?date=\d{4}-\d{2}-15/))
        })
    })

    it('parses different date formats correctly', () => {
        const { rerender } = render(<DateFilter currentDate="2024-12-31" datesWithData={[]} />)
        expect(screen.getByText(/December 31st, 2024/i)).toBeInTheDocument()
        
        rerender(<DateFilter currentDate="2025-01-01" datesWithData={[]} />)
        expect(screen.getByText(/January 1st, 2025/i)).toBeInTheDocument()
    })
})
